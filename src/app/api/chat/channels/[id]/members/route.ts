// Channel Members API
// Handles channel membership operations

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatService } from '../../../../../../lib/chat-service'
import { authenticateRequest } from '../../../../../../lib/auth'
import type { APIResponse } from '../../../../../../types'

// Validation schemas
const addMemberSchema = z.object({
  userId: z.string().min(1)
})

const removeMemberSchema = z.object({
  userId: z.string().min(1)
})

// GET /api/chat/channels/[id]/members - Get channel members
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

    const members = await chatService.getChannelMembers(channelId)

    return NextResponse.json<APIResponse>({
      success: true,
      data: members,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching channel members:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch channel members'
      }
    }, { status: 500 })
  }
}

// POST /api/chat/channels/[id]/members - Add member to channel
export async function POST(
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
    const validationResult = addMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid member data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    const { userId } = validationResult.data

    // Verify current user has access to channel
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

    // Verify user to add is in same organization
    const { prisma } = await import('../../../../../../lib/prisma')
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        organizationId: true, 
        isActive: true,
        firstName: true,
        lastName: true
      }
    })

    if (!userToAdd || !userToAdd.isActive || userToAdd.organizationId !== user.organizationId) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'User not found or not in your organization'
        }
      }, { status: 400 })
    }

    await chatService.addChannelMember(channelId, userId)

    return NextResponse.json<APIResponse>({
      success: true,
      data: { 
        added: true,
        user: {
          id: userToAdd.id,
          name: `${userToAdd.firstName} ${userToAdd.lastName}`
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error adding channel member:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add channel member'
      }
    }, { status: 500 })
  }
}

// DELETE /api/chat/channels/[id]/members - Remove member from channel
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
    const body = await request.json()
    const validationResult = removeMemberSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid member data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    const { userId } = validationResult.data

    // Verify current user has access to channel
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

    // Users can remove themselves, or channel creator can remove others
    if (userId !== user.id) {
      const channel = await chatService.getChannelById(channelId)
      if (!channel || channel.createdBy !== user.id) {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Permission denied to remove this member'
          }
        }, { status: 403 })
      }
    }

    await chatService.removeChannelMember(channelId, userId)

    return NextResponse.json<APIResponse>({
      success: true,
      data: { removed: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error removing channel member:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove channel member'
      }
    }, { status: 500 })
  }
}