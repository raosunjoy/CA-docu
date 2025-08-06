// Individual Chat Channel API
// Handles operations on specific channels

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatService } from '../../../../../lib/chat-service'
import { authenticateRequest } from '../../../../../lib/auth'
import type { APIResponse } from '../../../../../types'

// Validation schemas
const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/chat/channels/[id] - Get channel details
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

    const channel = await chatService.getChannelById(channelId)
    if (!channel) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Channel not found'
        }
      }, { status: 404 })
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: channel,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching channel:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch channel'
      }
    }, { status: 500 })
  }
}

// PUT /api/chat/channels/[id] - Update channel
export async function PUT(
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
    const body = await request.json()
    const validationResult = updateChannelSchema.safeParse(body)

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

    const channel = await chatService.updateChannel(
      channelId,
      validationResult.data,
      user.id
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
    console.error('Error updating channel:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Channel not found') {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Channel not found'
          }
        }, { status: 404 })
      }
      
      if (error.message === 'Permission denied') {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Permission denied'
          }
        }, { status: 403 })
      }
    }

    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update channel'
      }
    }, { status: 500 })
  }
}

// DELETE /api/chat/channels/[id] - Delete channel
export async function DELETE(
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

    await chatService.deleteChannel(channelId, user.id)

    return NextResponse.json<APIResponse>({
      success: true,
      data: { deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error deleting channel:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Channel not found') {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Channel not found'
          }
        }, { status: 404 })
      }
      
      if (error.message === 'Permission denied') {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Permission denied'
          }
        }, { status: 403 })
      }
    }

    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete channel'
      }
    }, { status: 500 })
  }
}