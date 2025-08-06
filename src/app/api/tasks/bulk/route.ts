// Bulk task operations API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TaskStatus, TaskPriority } from '@/types'
import prisma from '@/lib/prisma'

// Bulk operation schema
const bulkOperationSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
  operation: z.enum(['move', 'assign', 'priority', 'delete']),
  value: z.string().optional()
})

interface BulkOperationResult {
  success: number
  failed: number
  errors: string[]
}

async function validateTaskOwnership(taskIds: string[], organizationId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      organizationId
    },
    select: { id: true }
  })

  const foundIds = tasks.map(task => task.id)
  const missingIds = taskIds.filter(id => !foundIds.includes(id))
  
  return { foundIds, missingIds }
}

async function performBulkMove(taskIds: string[], status: TaskStatus, organizationId: string) {
  const { foundIds, missingIds } = await validateTaskOwnership(taskIds, organizationId)
  
  if (foundIds.length === 0) {
    return { success: 0, failed: taskIds.length, errors: ['No valid tasks found'] }
  }

  try {
    await prisma.task.updateMany({
      where: {
        id: { in: foundIds },
        organizationId
      },
      data: { status }
    })

    return {
      success: foundIds.length,
      failed: missingIds.length,
      errors: missingIds.length > 0 ? [`${missingIds.length} tasks not found`] : []
    }
  } catch (error) {
    return {
      success: 0,
      failed: taskIds.length,
      errors: ['Failed to update task status']
    }
  }
}

async function performBulkPriority(taskIds: string[], priority: TaskPriority, organizationId: string) {
  const { foundIds, missingIds } = await validateTaskOwnership(taskIds, organizationId)
  
  if (foundIds.length === 0) {
    return { success: 0, failed: taskIds.length, errors: ['No valid tasks found'] }
  }

  try {
    await prisma.task.updateMany({
      where: {
        id: { in: foundIds },
        organizationId
      },
      data: { priority }
    })

    return {
      success: foundIds.length,
      failed: missingIds.length,
      errors: missingIds.length > 0 ? [`${missingIds.length} tasks not found`] : []
    }
  } catch (error) {
    return {
      success: 0,
      failed: taskIds.length,
      errors: ['Failed to update task priority']
    }
  }
}

async function performBulkAssign(taskIds: string[], assignedTo: string | null, organizationId: string) {
  const { foundIds, missingIds } = await validateTaskOwnership(taskIds, organizationId)
  
  if (foundIds.length === 0) {
    return { success: 0, failed: taskIds.length, errors: ['No valid tasks found'] }
  }

  // Validate assignee if provided
  if (assignedTo) {
    const user = await prisma.user.findFirst({
      where: {
        id: assignedTo,
        organizationId,
        isActive: true
      }
    })

    if (!user) {
      return {
        success: 0,
        failed: taskIds.length,
        errors: ['Assigned user not found in organization']
      }
    }
  }

  try {
    await prisma.task.updateMany({
      where: {
        id: { in: foundIds },
        organizationId
      },
      data: { assignedTo }
    })

    return {
      success: foundIds.length,
      failed: missingIds.length,
      errors: missingIds.length > 0 ? [`${missingIds.length} tasks not found`] : []
    }
  } catch (error) {
    return {
      success: 0,
      failed: taskIds.length,
      errors: ['Failed to update task assignment']
    }
  }
}

async function performBulkDelete(taskIds: string[], organizationId: string) {
  const { foundIds, missingIds } = await validateTaskOwnership(taskIds, organizationId)
  
  if (foundIds.length === 0) {
    return { success: 0, failed: taskIds.length, errors: ['No valid tasks found'] }
  }

  try {
    // Delete in transaction to handle related records
    await prisma.$transaction(async (tx) => {
      // Delete task comments
      await tx.taskComment.deleteMany({
        where: { taskId: { in: foundIds } }
      })

      // Delete task attachments
      await tx.taskAttachment.deleteMany({
        where: { taskId: { in: foundIds } }
      })

      // Delete taggings
      await tx.tagging.deleteMany({
        where: {
          taggableType: 'task',
          taggableId: { in: foundIds }
        }
      })

      // Delete tasks
      await tx.task.deleteMany({
        where: {
          id: { in: foundIds },
          organizationId
        }
      })
    })

    return {
      success: foundIds.length,
      failed: missingIds.length,
      errors: missingIds.length > 0 ? [`${missingIds.length} tasks not found`] : []
    }
  } catch (error) {
    return {
      success: 0,
      failed: taskIds.length,
      errors: ['Failed to delete tasks']
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<BulkOperationResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<BulkOperationResult>>
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = bulkOperationSchema.parse(body)

    let result: BulkOperationResult

    switch (validatedData.operation) {
      case 'move':
        if (!validatedData.value || !Object.values(TaskStatus).includes(validatedData.value as TaskStatus)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Valid status value is required for move operation'
              }
            },
            { status: 400 }
          )
        }
        result = await performBulkMove(validatedData.taskIds, validatedData.value as TaskStatus, user.orgId)
        break

      case 'priority':
        if (!validatedData.value || !Object.values(TaskPriority).includes(validatedData.value as TaskPriority)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Valid priority value is required for priority operation'
              }
            },
            { status: 400 }
          )
        }
        result = await performBulkPriority(validatedData.taskIds, validatedData.value as TaskPriority, user.orgId)
        break

      case 'assign':
        result = await performBulkAssign(validatedData.taskIds, validatedData.value || null, user.orgId)
        break

      case 'delete':
        result = await performBulkDelete(validatedData.taskIds, user.orgId)
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid operation type'
            }
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    // eslint-disable-next-line no-console
    console.error('Bulk operation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while performing bulk operation'
        }
      },
      { status: 500 }
    )
  }
}