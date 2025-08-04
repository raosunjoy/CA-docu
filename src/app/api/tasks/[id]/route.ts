// Individual Task API endpoints - Get, Update, Delete

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TaskStatus, TaskPriority, JWTPayload, Task } from '@/types'
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
function createSuccessResponse<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID()
    }
  })
}


// Helper function to validate task deletion
async function validateTaskDeletion(taskId: string, organizationId: string, currentUserId: string) {
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, organizationId },
    include: { childTasks: { select: { id: true } } }
  })

  if (!existingTask) {
    return { error: createNotFoundResponse() }
  }

  if (existingTask.childTasks.length > 0) {
    return {
      error: NextResponse.json(
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
  }

  if (existingTask.lockedBy && existingTask.lockedBy !== currentUserId) {
    const lockUser = await prisma.user.findUnique({
      where: { id: existingTask.lockedBy },
      select: { firstName: true, lastName: true }
    })

    return {
      error: NextResponse.json(
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
  }

  return { task: existingTask }
}

// Helper function to perform task deletion and audit logging
async function performTaskDeletion(taskId: string, task: { title: string; status: string; priority: string; assignedTo: string | null }, user: { orgId: string; sub: string }, request: NextRequest) {
  await prisma.task.delete({ where: { id: taskId } })

  await prisma.auditLog.create({
    data: {
      organizationId: user.orgId,
      userId: user.sub,
      action: 'delete',
      resourceType: 'task',
      resourceId: taskId,
      oldValues: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo
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
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse<Task>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<Task>>
    }

    const { user } = authResult
    const { id: taskId } = await context.params

    const task = await getTaskWithRelations(taskId, user.orgId)
    
    if (!task) {
      return createNotFoundResponse()
    }

    return createSuccessResponse(task)
  } catch {
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

// Helper function to validate task lock
async function validateTaskLock(
  task: Task,
  userId: string
): Promise<NextResponse<APIResponse<Task>> | null> {
  if (task.lockedBy && task.lockedBy !== userId) {
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
  return null
}

// Helper function to validate status transition
function validateStatusTransition(
  currentStatus: TaskStatus,
  newStatus: TaskStatus
): NextResponse<APIResponse<Task>> | null {
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
async function validateAssignedUser(
  assignedUserId: string,
  organizationId: string
): Promise<NextResponse<APIResponse<Task>> | null> {
  const assignedUser = await prisma.user.findFirst({
    where: {
      id: assignedUserId,
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

// Helper function to handle status-related updates
function buildStatusUpdate(
  status: TaskStatus,
  existingTask: Task
): Record<string, unknown> {
  const statusUpdate: Record<string, unknown> = { status }
  
  if (status === TaskStatus.COMPLETED) {
    statusUpdate.completedAt = new Date()
  } else if (existingTask.completedAt) {
    statusUpdate.completedAt = null
  }
  
  return statusUpdate
}

// Helper function to build update data
function buildUpdateData(
  validatedData: z.infer<typeof updateTaskSchema>,
  existingTask: Task
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}
  
  // Simple field assignments
  const simpleFields = ['title', 'description', 'priority', 'assignedTo', 'estimatedHours', 'actualHours', 'metadata'] as const
  simpleFields.forEach(field => {
    if (validatedData[field] !== undefined) {
      updateData[field] = validatedData[field]
    }
  })
  
  // Handle status with completion logic
  if (validatedData.status !== undefined) {
    Object.assign(updateData, buildStatusUpdate(validatedData.status, existingTask))
  }
  
  // Handle dueDate conversion
  if (validatedData.dueDate !== undefined) {
    updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
  }

  return updateData
}

// Helper function to update task in database
async function updateTaskInDatabase(taskId: string, updateData: Record<string, unknown>) {
  return prisma.task.update({
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
}

// Helper function to create audit log
async function createAuditLog(
  user: JWTPayload,
  taskId: string,
  existingTask: Task,
  updatedTask: Task,
  request: NextRequest
): Promise<void> {
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
}

// Helper function to perform all validations
async function performTaskValidations(
  existingTask: Task,
  validatedData: z.infer<typeof updateTaskSchema>,
  user: JWTPayload
): Promise<NextResponse<APIResponse<Task>> | null> {
  const lockValidation = await validateTaskLock(existingTask, user.sub)
  if (lockValidation) return lockValidation

  if (validatedData.status && validatedData.status !== existingTask.status) {
    const statusValidation = validateStatusTransition(existingTask.status, validatedData.status)
    if (statusValidation) return statusValidation
  }

  if (validatedData.assignedTo) {
    const userValidation = await validateAssignedUser(validatedData.assignedTo, user.orgId)
    if (userValidation) return userValidation
  }

  return null
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse<Task>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<Task>>
    }

    const { user } = authResult
    const { id: taskId } = await context.params
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, organizationId: user.orgId }
    })

    if (!existingTask) {
      return createNotFoundResponse()
    }

    const validationResult = await performTaskValidations(existingTask, validatedData, user)
    if (validationResult) return validationResult

    const updateData = buildUpdateData(validatedData, existingTask)
    const updatedTask = await updateTaskInDatabase(taskId, updateData)
    await createAuditLog(user, taskId, existingTask, updatedTask, request)

    return createSuccessResponse(updatedTask)
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
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse<{ message: string }>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<{ message: string }>>
    }

    const { user } = authResult
    const { id: taskId } = await context.params

    const validation = await validateTaskDeletion(taskId, user.orgId, user.sub)
    if (validation.error) {
      return validation.error
    }

    await performTaskDeletion(taskId, validation.task, user, request)

    return NextResponse.json({
      success: true,
      data: { message: 'Task deleted successfully' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch {
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