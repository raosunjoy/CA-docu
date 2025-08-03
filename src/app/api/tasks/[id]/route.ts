// Individual Task API endpoints - Get, Update, Delete

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TaskStatus, TaskPriority } from '@/types'
import { isValidStatusTransition } from '@/lib/task-utils'

// Reusable Prisma select configurations
const userSelectConfig = {
  id: true,
  firstName: true,
  lastName: true,
  email: true
}

const userSelectWithRole = {
  ...userSelectConfig,
  role: true
}

const taskSelectConfig = {
  id: true,
  title: true,
  status: true
}

const childTaskSelectConfig = {
  ...taskSelectConfig,
  priority: true,
  assignedTo: true,
  dueDate: true
}

// Task include configuration for detailed queries
const getTaskIncludeConfig = () => ({
  assignedUser: { select: userSelectWithRole },
  createdByUser: { select: userSelectWithRole },
  lockedByUser: { select: userSelectConfig },
  parentTask: { select: taskSelectConfig },
  childTasks: {
    select: childTaskSelectConfig,
    orderBy: { createdAt: 'asc' as const }
  },
  comments: {
    include: { user: { select: userSelectConfig } },
    orderBy: { createdAt: 'desc' as const }
  },
  attachments: {
    include: { user: { select: userSelectConfig } },
    orderBy: { createdAt: 'desc' as const }
  }
})

// Helper function to get task with full relations
async function getTaskWithRelations(taskId: string, organizationId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, organizationId },
    include: getTaskIncludeConfig()
  })
}

// Helper function to create not found response
function createNotFoundResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Task not found'
      }
    },
    { status: 404 }
  )
}

// Helper function to create success response
function createSuccessResponse(data: any) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    }
  })
}

// Helper function to check if task is locked by another user
async function checkTaskLock(task: any, currentUserId: string) {
  if (!task.lockedBy || task.lockedBy === currentUserId) {
    return null
  }

  const lockUser = await prisma.user.findUnique({
    where: { id: task.lockedBy },
    select: { firstName: true, lastName: true }
  })

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'CONFLICT',
        message: `Task is locked by ${lockUser?.firstName} ${lockUser?.lastName}`
      }
    },
    { status: 409 }
  )
}

// Helper function to validate status transition
function validateStatusTransition(currentStatus: any, newStatus: any) {
  if (!newStatus || newStatus === currentStatus) {
    return null
  }

  if (!isValidStatusTransition(currentStatus, newStatus)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status transition from ${currentStatus} to ${newStatus}`
        }
      },
      { status: 400 }
    )
  }

  return null
}

// Helper function to validate assigned user
async function validateAssignedUser(assignedTo: string, organizationId: string) {
  if (!assignedTo) {
    return null
  }

  const assignedUser = await prisma.user.findFirst({
    where: {
      id: assignedTo,
      organizationId,
      isActive: true
    }
  })

  if (!assignedUser) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Assigned user not found in organization'
        }
      },
      { status: 404 }
    )
  }

  return null
}

// Helper function to build update data from validated input
function buildUpdateData(validatedData: any, existingTask: any) {
  const updateData: any = {}
  
  if (validatedData.title !== undefined) updateData.title = validatedData.title
  if (validatedData.description !== undefined) updateData.description = validatedData.description
  if (validatedData.status !== undefined) {
    updateData.status = validatedData.status
    if (validatedData.status === TaskStatus.COMPLETED) {
      updateData.completedAt = new Date()
    } else if (existingTask.completedAt) {
      updateData.completedAt = null
    }
  }
  if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
  if (validatedData.assignedTo !== undefined) updateData.assignedTo = validatedData.assignedTo
  if (validatedData.dueDate !== undefined) {
    updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
  }
  if (validatedData.estimatedHours !== undefined) updateData.estimatedHours = validatedData.estimatedHours
  if (validatedData.actualHours !== undefined) updateData.actualHours = validatedData.actualHours
  if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata

  return updateData
}

// Helper function to create audit log for task update
async function createTaskUpdateAuditLog(
  request: NextRequest,
  user: any,
  taskId: string,
  existingTask: any,
  updatedTask: any
) {
  return prisma.auditLog.create({
    data: {
      organizationId: user.orgId,
      userId: user.sub,
      action: 'update',
      resourceType: 'task',
      resourceId: taskId,
      oldValues: {
        title: existingTask.title,
        status: existingTask.status,
        priority: existingTask.priority,
        assignedTo: existingTask.assignedTo
      },
      newValues: {
        title: updatedTask.title,
        status: updatedTask.status,
        priority: updatedTask.priority,
        assignedTo: updatedTask.assignedTo
      },
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null
    }
  })
}

// Task update schema
const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  actualHours: z.number().min(0).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})


// GET /api/tasks/[id] - Get single task
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<any>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    const taskId = context.params.id

    const task = await getTaskWithRelations(taskId, user.orgId)
    
    if (!task) {
      return createNotFoundResponse()
    }

    return createSuccessResponse(task)
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching task'
        }
      },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<any>>> {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    const taskId = context.params.id

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Get existing task
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: user.orgId
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        },
        { status: 404 }
      )
    }

    // Check if task is locked by another user
    if (existingTask.lockedBy && existingTask.lockedBy !== user.sub) {
      const lockUser = await prisma.user.findUnique({
        where: { id: existingTask.lockedBy },
        select: { firstName: true, lastName: true }
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Task is locked by ${lockUser?.firstName} ${lockUser?.lastName}`
          }
        },
        { status: 409 }
      )
    }

    // Validate status transition if status is being updated
    if (validatedData.status && validatedData.status !== existingTask.status) {
      if (!isValidStatusTransition(existingTask.status, validatedData.status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid status transition from ${existingTask.status} to ${validatedData.status}`
            }
          },
          { status: 400 }
        )
      }
    }

    // Check if assignedTo user exists and belongs to same organization
    if (validatedData.assignedTo) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: validatedData.assignedTo,
          organizationId: user.orgId,
          isActive: true
        }
      })

      if (!assignedUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Assigned user not found in organization'
            }
          },
          { status: 404 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
      // Set completion timestamp if task is being completed
      if (validatedData.status === TaskStatus.COMPLETED) {
        updateData.completedAt = new Date()
      } else if (existingTask.completedAt) {
        updateData.completedAt = null
      }
    }
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.assignedTo !== undefined) updateData.assignedTo = validatedData.assignedTo
    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }
    if (validatedData.estimatedHours !== undefined) updateData.estimatedHours = validatedData.estimatedHours
    if (validatedData.actualHours !== undefined) updateData.actualHours = validatedData.actualHours
    if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        parentTask: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    // Log task update for audit
    await prisma.auditLog.create({
      data: {
        organizationId: user.orgId,
        userId: user.sub,
        action: 'update',
        resourceType: 'task',
        resourceId: taskId,
        oldValues: {
          title: existingTask.title,
          status: existingTask.status,
          priority: existingTask.priority,
          assignedTo: existingTask.assignedTo
        },
        newValues: {
          title: updatedTask.title,
          status: updatedTask.status,
          priority: updatedTask.priority,
          assignedTo: updatedTask.assignedTo
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedTask,
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
    console.error('Update task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating task'
        }
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<{ message: string }>>> {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<{ message: string }>>
    }

    const { user } = authResult
    const taskId = context.params.id

    // Get existing task with child tasks
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: user.orgId
      },
      include: {
        childTasks: {
          select: { id: true }
        }
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        },
        { status: 404 }
      )
    }

    // Check if task has child tasks
    if (existingTask.childTasks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Cannot delete task with subtasks. Delete subtasks first.'
          }
        },
        { status: 409 }
      )
    }

    // Check if task is locked by another user
    if (existingTask.lockedBy && existingTask.lockedBy !== user.sub) {
      const lockUser = await prisma.user.findUnique({
        where: { id: existingTask.lockedBy },
        select: { firstName: true, lastName: true }
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `Task is locked by ${lockUser?.firstName} ${lockUser?.lastName}`
          }
        },
        { status: 409 }
      )
    }

    // Delete task (this will cascade delete comments and attachments)
    await prisma.task.delete({
      where: { id: taskId }
    })

    // Log task deletion for audit
    await prisma.auditLog.create({
      data: {
        organizationId: user.orgId,
        userId: user.sub,
        action: 'delete',
        resourceType: 'task',
        resourceId: taskId,
        oldValues: {
          title: existingTask.title,
          status: existingTask.status,
          priority: existingTask.priority,
          assignedTo: existingTask.assignedTo
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Task deleted successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Delete task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting task'
        }
      },
      { status: 500 }
    )
  }
}