// Approval Delegates API endpoints - Manage delegation

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import { ApprovalService } from '@/lib/approval-service'
import prisma from '@/lib/prisma'

// Delegate creation schema
const createDelegateSchema = z.object({
  delegateId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in']),
    value: z.any()
  })).optional()
}).refine(
  (data) => {
    if (data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      return false
    }
    return true
  },
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
)

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  delegatorId: z.string().optional(),
  delegateId: z.string().optional(),
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

    if (validatedQuery.delegatorId) {
      where.delegatorId = validatedQuery.delegatorId
    }

    if (validatedQuery.delegateId) {
      where.delegateId = validatedQuery.delegateId
    }

    if (validatedQuery.isActive !== undefined) {
      where.isActive = validatedQuery.isActive
    }

    // Get delegates with pagination
    const [delegates, total] = await Promise.all([
      prisma.approvalDelegate.findMany({
        where,
        include: {
          delegator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          delegate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit
      }),
      prisma.approvalDelegate.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        delegates,
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

    console.error('Get delegates error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching delegates'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = createDelegateSchema.parse(body)

    // Validate delegate user exists
    const delegateUser = await prisma.user.findFirst({
      where: {
        id: validatedData.delegateId,
        organizationId: user.orgId,
        isActive: true
      }
    })

    if (!delegateUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Delegate user not found'
          }
        },
        { status: 404 }
      )
    }

    // Check for overlapping delegations
    const startDate = new Date(validatedData.startDate)
    const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null

    const overlappingDelegation = await prisma.approvalDelegate.findFirst({
      where: {
        organizationId: user.orgId,
        delegatorId: user.sub,
        isActive: true,
        startDate: { lte: endDate || new Date('2099-12-31') },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } }
        ]
      }
    })

    if (overlappingDelegation) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'You already have an active delegation for this time period'
          }
        },
        { status: 409 }
      )
    }

    // Create delegate
    const delegate = await ApprovalService.createDelegate(
      user.orgId,
      user.sub,
      {
        delegateId: validatedData.delegateId,
        startDate,
        endDate,
        conditions: validatedData.conditions
      }
    )

    return NextResponse.json({
      success: true,
      data: delegate,
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

    console.error('Create delegate error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating delegate'
        }
      },
      { status: 500 }
    )
  }
}