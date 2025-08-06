// Direct Messages API
// Handles direct message channel creation and management

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatService } from '../../../../lib/chat-service'
import { authenticateRequest } from '../../../../lib/auth'
import type { APIResponse } from '../../../../types'

// Validation schemas
const createDirectChannelSchema = z.object({
  userId: z.string().min(1)
})

// POST /api/chat/direct - Create or get direct message channel
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
    const validationResult = createDirectChannelSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    const { userId } = validationResult.data

    // Prevent creating direct channel with self
    if (userId === user.id) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cannot create direct channel with yourself'
        }
      }, { status: 400 })
    }

    // Verify target user exists and is in same organization
    const { prisma } = await import('../../../../lib/prisma')
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        organizationId: true, 
        isActive: true,
        firstName: true,
        lastName: true
      }
    })

    if (!targetUser || !targetUser.isActive || targetUser.organizationId !== user.organizationId) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User not found or not in your organization'
        }
      }, { status: 400 })
    }

    const channel = await chatService.getOrCreateDirectChannel(
      user.id,
      userId,
      user.organizationId
    )

    return NextResponse.json<APIResponse>({
      success: true,
      data: channel,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error creating direct channel:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create direct channel'
      }
    }, { status: 500 })
  }
}