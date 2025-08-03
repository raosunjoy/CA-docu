// Tasks API endpoints - List and Create

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TaskStatus, TaskPriority, InputJsonValue } from '@/types'
import { TaskFilters } from '@/lib/task-utils'
import { 
  getTasksPaginated, 
  validateTaskAssignee, 
  validateParentTask, 
  createTaskWithIncludes,
  TaskData 
} from '@/lib/task-service'

// Task creation schema
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assignedTo: z.string().optional(),
  parentTaskId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
})

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  createdBy: z.string().optional(),
  parentTaskId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

interface TaskListResponse {
  tasks: TaskData[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

async function handleTasksGet(request: NextRequest, user: { orgId: string }) {
  const { searchParams } = new URL(request.url)
  const queryParams = Object.fromEntries(searchParams.entries())
  const validatedQuery = querySchema.parse(queryParams)

  const filters: TaskFilters = {
    search: validatedQuery.search || null,
    assignedTo: validatedQuery.assignedTo || null,
    createdBy: validatedQuery.createdBy || null,
    parentTaskId: validatedQuery.parentTaskId || null
  }

  if (validatedQuery.status) {
    filters.status = validatedQuery.status as TaskStatus
  }

  if (validatedQuery.priority) {
    filters.priority = validatedQuery.priority as TaskPriority
  }

  const sortOptions = {
    field: validatedQuery.sortBy,
    direction: validatedQuery.sortOrder
  } as const

  return getTasksPaginated(
    user.orgId,
    filters,
    sortOptions,
    validatedQuery.page,
    validatedQuery.limit
  )
}

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<TaskListResponse>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<TaskListResponse>>
    }

    const { user } = authResult
    const result = await handleTasksGet(request, user)

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
            message: 'Invalid query parameters',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    // eslint-disable-next-line no-console
    console.error('Get tasks error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching tasks'
        }
      },
      { status: 500 }
    )
  }
}


interface TaskValidationData {
  assignedTo?: string | null
  parentTaskId?: string | null
}

async function validateTaskCreation(validatedData: TaskValidationData, organizationId: string) {
  if (validatedData.assignedTo) {
    const assignedUser = await validateTaskAssignee(validatedData.assignedTo, organizationId)
    if (!assignedUser) {
      return { error: { code: 'NOT_FOUND', message: 'Assigned user not found in organization' } }
    }
  }

  if (validatedData.parentTaskId) {
    const parentTask = await validateParentTask(validatedData.parentTaskId, organizationId)
    if (!parentTask) {
      return { error: { code: 'NOT_FOUND', message: 'Parent task not found' } }
    }
  }

  return { valid: true }
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<TaskData>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<TaskData>>
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    const taskData = {
      organizationId: user.orgId,
      title: validatedData.title,
      description: validatedData.description || null,
      status: validatedData.status,
      priority: validatedData.priority,
      assignedTo: validatedData.assignedTo || null,
      createdBy: user.sub,
      parentTaskId: validatedData.parentTaskId || null,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
      estimatedHours: validatedData.estimatedHours || null,
      metadata: validatedData.metadata as InputJsonValue
    }

    const validation = await validateTaskCreation(taskData, user.orgId)
    if (validation.error) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 404 }
      )
    }

    const task = await createTaskWithIncludes(taskData)

    return NextResponse.json({
      success: true,
      data: task as TaskData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })
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
    console.error('Create task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating task'
        }
      },
      { status: 500 }
    )
  }
}