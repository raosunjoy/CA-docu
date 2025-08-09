import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { taskService } from '@/services/task-service'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import type { Task, UpdateTaskRequest } from '@/types/task'

// Schema for status update
const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'REVIEW', 'AWAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'CANCELLED', 'ON_HOLD']),
  comment: z.string().optional(),
  completionPercentage: z.number().min(0).max(100).optional()
})

interface RouteParams {
  params: { id: string }
}

// PUT /api/tasks/[id]/status - Update task status with workflow validation
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<APIResponse<Task>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<Task>>
    }

    const { user } = authResult
    const taskId = params.id
    
    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
          }
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateStatusSchema.parse(body)
    
    // Map the CA-specific status to the existing TaskStatus enum
    const statusMapping: Record<string, string> = {
      'DRAFT': 'TODO',
      'OPEN': 'TODO',
      'IN_PROGRESS': 'IN_PROGRESS',
      'REVIEW': 'IN_REVIEW',
      'AWAITING_APPROVAL': 'IN_REVIEW',
      'APPROVED': 'IN_REVIEW',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED',
      'ON_HOLD': 'TODO'
    }

    const mappedStatus = statusMapping[validatedData.status] as any
    
    const updateRequest: UpdateTaskRequest = {
      status: mappedStatus,
      completionPercentage: validatedData.completionPercentage,
      customFields: validatedData.comment ? { statusComment: validatedData.comment } : undefined
    }
    
    // Update task with workflow logic
    const updatedTask = await taskService.updateTask(
      taskId,
      updateRequest,
      user.sub,
      user.orgId
    )
    
    return NextResponse.json({
      success: true,
      data: updatedTask,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        statusChange: {
          previous: 'UNKNOWN', // Would be fetched from current task
          new: validatedData.status,
          changedBy: user.sub,
          comment: validatedData.comment
        }
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status update data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }
    
    console.error('Task status update error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update task status'
        }
      },
      { status: 500 }
    )
  }
}