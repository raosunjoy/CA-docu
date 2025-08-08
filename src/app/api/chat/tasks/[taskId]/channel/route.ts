// Task Channel API
// Handles creation and management of task-specific chat channels

import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '../../../../../../lib/chat-service'
import { authenticateRequest } from '../../../../../../lib/auth'
import type { APIResponse } from '../../../../../../types'

// GET /api/chat/tasks/[taskId]/channel - Get or create task channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
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

    const { taskId } = await params

    // Verify user has access to the task
    const { prisma } = await import('../../../../../../lib/prisma')
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        organizationId: true,
        title: true,
        assignedTo: true,
        createdBy: true
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

    // Check if user has access to task (assigned, creator, or admin)
    const hasAccess = task.assignedTo === user.id || 
                     task.createdBy === user.id || 
                     user.role === 'ADMIN' || 
                     user.role === 'PARTNER' ||
                     user.role === 'MANAGER'

    if (!hasAccess) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this task'
        }
      }, { status: 403 })
    }

    const channel = await chatService.getOrCreateTaskChannel(
      taskId,
      user.organizationId,
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
    console.error('Error getting task channel:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get task channel'
      }
    }, { status: 500 })
  }
}