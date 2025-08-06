// Chat Channels API
// Handles CRUD operations for chat channels

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatService } from '../../../../lib/chat-service'
import { authenticateRequest } from '../../../../lib/auth'
import type { APIResponse, ChannelType } from '../../../../types'

// Validation schemas
const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['DIRECT', 'GROUP', 'TASK', 'CLIENT']),
  memberIds: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

const channelFiltersSchema = z.object({
  type: z.array(z.enum(['DIRECT', 'GROUP', 'TASK', 'CLIENT'])).optional(),
  search: z.string().optional(),
  includeArchived: z.boolean().optional()
})

// GET /api/chat/channels - Get user's channels
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filtersResult = channelFiltersSchema.safeParse({
      type: searchParams.get('type')?.split(',') as ChannelType[],
      search: searchParams.get('search') || undefined,
      includeArchived: searchParams.get('includeArchived') === 'true'
    })

    if (!filtersResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid filters',
          details: filtersResult.error.errors
        }
      }, { status: 400 })
    }

    const channels = await chatService.getUserChannels(
      user.id,
      user.organizationId,
      filtersResult.data
    )

    return NextResponse.json<APIResponse>({
      success: true,
      data: channels,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch channels'
      }
    }, { status: 500 })
  }
}

// POST /api/chat/channels - Create new channel
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createChannelSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid channel data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    const { name, type, memberIds, metadata } = validationResult.data

    // Validate member IDs belong to same organization
    if (memberIds && memberIds.length > 0) {
      const { prisma } = await import('../../../../lib/prisma')
      const members = await prisma.user.findMany({
        where: {
          id: { in: memberIds },
          organizationId: user.organizationId,
          isActive: true
        },
        select: { id: true }
      })

      if (members.length !== memberIds.length) {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some member IDs are invalid or not in your organization'
          }
        }, { status: 400 })
      }
    }

    const channel = await chatService.createChannel({
      name,
      type,
      organizationId: user.organizationId,
      createdBy: user.id,
      memberIds,
      metadata
    })

    return NextResponse.json<APIResponse>({
      success: true,
      data: channel,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating channel:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create channel'
      }
    }, { status: 500 })
  }
}