// Time Budgets API endpoints - List and Create budgets

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import { TimeTrackingService, TimeBudgetResult } from '@/lib/time-tracking-service'
import prisma from '@/lib/prisma'

// Time budget creation schema
const createTimeBudgetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  userId: z.string().optional(),
  budgetHours: z.number().min(0.1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  alertThreshold: z.number().min(0).max(1).optional()
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
)

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  userId: z.string().optional(),
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

    if (validatedQuery.taskId) where.taskId = validatedQuery.taskId
    if (validatedQuery.projectId) where.projectId = validatedQuery.projectId
    if (validatedQuery.clientId) where.clientId = validatedQuery.clientId
    if (validatedQuery.userId) where.userId = validatedQuery.userId
    if (validatedQuery.isActive !== undefined) where.isActive = validatedQuery.isActive

    // Get budgets with pagination
    const [budgets, total] = await Promise.all([
      prisma.timeBudget.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
      prisma.timeBudget.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        budgets,
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

    console.error('Get time budgets error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching time budgets'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<TimeBudgetResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = createTimeBudgetSchema.parse(body)

    // Validate task exists if taskId is provided
    if (validatedData.taskId) {
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
    }

    // Validate user exists if userId is provided
    if (validatedData.userId) {
      const budgetUser = await prisma.user.findFirst({
        where: {
          id: validatedData.userId,
          organizationId: user.orgId,
          isActive: true
        }
      })

      if (!budgetUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'User not found'
            }
          },
          { status: 404 }
        )
      }
    }

    const budgetData = {
      name: validatedData.name,
      description: validatedData.description,
      taskId: validatedData.taskId,
      projectId: validatedData.projectId,
      clientId: validatedData.clientId,
      userId: validatedData.userId,
      budgetHours: validatedData.budgetHours,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      alertThreshold: validatedData.alertThreshold
    }

    const budget = await TimeTrackingService.createTimeBudget(
      user.orgId,
      budgetData,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: budget,
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

    console.error('Create time budget error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating time budget'
        }
      },
      { status: 500 }
    )
  }
}