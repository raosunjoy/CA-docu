// Approval API endpoints - List and Create workflows

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, ApprovalStep, UserRole } from '@/types'
import { ApprovalService, ApprovalWorkflowResult } from '@/lib/approval-service'
import prisma from '@/lib/prisma'

// Approval step schema
const approvalStepSchema = z.object({
  stepNumber: z.number().min(0),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  approverRoles: z.array(z.nativeEnum(UserRole)),
  approverIds: z.array(z.string()).optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in']),
    value: z.any()
  })).optional(),
  isParallel: z.boolean().default(false),
  requiredApprovals: z.number().min(1).optional(),
  autoApprove: z.boolean().default(false),
  timeoutHours: z.number().min(1).optional()
})

// Workflow creation schema
const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  taskId: z.string().min(1),
  steps: z.array(approvalStepSchema).min(1)
})

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  taskId: z.string().optional(),
  isActive: z.string().transform(val => val === 'true').optional()
})

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = querySchema.parse(queryParams)

    // Build where clause
    const where: any = {
      organizationId: user.orgId
    }

    if (validatedQuery.taskId) {
      where.taskId = validatedQuery.taskId
    }

    if (validatedQuery.isActive !== undefined) {
      where.isActive = validatedQuery.isActive
    }

    // Get workflows with pagination
    const [workflows, total] = await Promise.all([
      prisma.approvalWorkflow.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true
            }
          },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit
      }),
      prisma.approvalWorkflow.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        workflows,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total,
          totalPages: Math.ceil(total / validatedQuery.limit)
        }
      },
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

    console.error('Get workflows error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching workflows'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<ApprovalWorkflowResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = createWorkflowSchema.parse(body)

    // Validate task exists and user has permission
    const task = await prisma.task.findFirst({
      where: {
        id: validatedData.taskId,
        organizationId: user.orgId
      }
    })

    if (!task) {
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

    // Check if task already has an active workflow
    const existingWorkflow = await prisma.approvalWorkflow.findFirst({
      where: {
        taskId: validatedData.taskId,
        isActive: true
      }
    })

    if (existingWorkflow) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Task already has an active approval workflow'
          }
        },
        { status: 409 }
      )
    }

    // Create workflow
    const workflow = await ApprovalService.createWorkflow(
      user.orgId,
      validatedData,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: workflow,
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

    console.error('Create workflow error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating workflow'
        }
      },
      { status: 500 }
    )
  }
}