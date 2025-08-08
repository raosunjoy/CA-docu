// Chat Content Sharing API
// Handles sharing tasks and documents in chat channels

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest } from '../../../../../../lib/auth'
import { chatService } from '../../../../../../lib/chat-service'
import type { APIResponse } from '../../../../../../types'

// Validation schemas
const shareContentSchema = z.object({
  type: z.enum(['task', 'document']),
  contentId: z.string().min(1),
  message: z.string().optional()
})

// POST /api/chat/channels/[id]/share - Share content in channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const channelId = id
    const body = await request.json()
    const validationResult = shareContentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid share data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

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

    const { type, contentId, message } = validationResult.data
    const { prisma } = await import('../../../../../../lib/prisma')

    let contentData: any = null
    let shareMessage = message || ''

    // Fetch content details and verify access
    if (type === 'task') {
      const task = await prisma.task.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          organizationId: true,
          assignedTo: true,
          createdBy: true,
          assignedUser: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          createdByUser: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })

      if (!task) {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        }, { status: 404 })
      }

      if (task.organizationId !== user.organizationId) {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this task'
          }
        }, { status: 403 })
      }

      contentData = task
      if (!shareMessage) {
        shareMessage = `Shared task: ${task.title}`
      }

    } else if (type === 'document') {
      const document = await prisma.document.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          fileSize: true,
          organizationId: true,
          uploadedBy: true,
          uploader: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          createdAt: true
        }
      })

      if (!document) {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found'
          }
        }, { status: 404 })
      }

      if (document.organizationId !== user.organizationId) {
        return NextResponse.json<APIResponse>({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this document'
          }
        }, { status: 403 })
      }

      contentData = document
      if (!shareMessage) {
        shareMessage = `Shared document: ${document.name}`
      }
    }

    // Create message with reference
    const chatMessage = await prisma.chatMessage.create({
      data: {
        channelId,
        userId: user.id,
        content: shareMessage,
        messageType: type === 'task' ? 'TASK_REFERENCE' : 'EMAIL_REFERENCE', // Using EMAIL_REFERENCE for documents temporarily
        metadata: {
          referenceType: type,
          referenceId: contentId,
          referenceData: contentData
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Broadcast message to channel via WebSocket
    const { getWebSocketServer } = await import('../../../../../../lib/websocket-server')
    const wsServer = getWebSocketServer()
    
    if (wsServer) {
      wsServer.broadcastToChannel(channelId, 'new_message', chatMessage)
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        message: chatMessage,
        sharedContent: contentData
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error sharing content:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to share content'
      }
    }, { status: 500 })
  }
}