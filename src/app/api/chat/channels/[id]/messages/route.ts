// Channel Messages API
// Handles message retrieval and management for channels

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatService } from '../../../../../../lib/chat-service'
import { authenticateRequest } from '../../../../../../lib/auth'
import type { APIResponse, MessageType } from '../../../../../../types'

// Validation schemas
const messageFiltersSchema = z.object({
  userId: z.string().optional(),
  messageType: z.array(z.enum(['TEXT', 'FILE', 'TASK_REFERENCE', 'EMAIL_REFERENCE'])).optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
})

// GET /api/chat/channels/[id]/messages - Get channel messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const channelId = params.id

    // Verify user has access to channel
    const isMember = await chatService.isChannelMember(channelId, user.id)
    if (!isMember) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this channel'
        }
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filtersResult = messageFiltersSchema.safeParse({
      userId: searchParams.get('userId') || undefined,
      messageType: searchParams.get('messageType')?.split(',') as MessageType[],
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
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

    const filters = filtersResult.data
    const result = await chatService.getChannelMessages({
      channelId,
      userId: filters.userId,
      messageType: filters.messageType,
      search: filters.search,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      limit: filters.limit,
      offset: filters.offset
    })

    return NextResponse.json<APIResponse>({
      success: true,
      data: result.messages,
      meta: {
        pagination: {
          page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
          limit: filters.limit || 50,
          total: result.total,
          hasMore: result.hasMore
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching channel messages:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch channel messages'
      }
    }, { status: 500 })
  }
}