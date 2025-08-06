// Approval Requests API endpoints - List pending approvals

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, ApprovalStatus } from '@/types'
import { ApprovalService, ApprovalRequestResult } from '@/lib/approval-service'
import prisma from '@/lib/prisma'

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  status: z.nativeEnum(ApprovalStatus).optional(),
  taskId: z.string().optional(),
  workflowId: z.string().optional(),
  assignedToMe: z.string().transform(val => val === 'true').optional()
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

    // If assignedToMe is true, get pending approvals for current user
    if (validatedQuery.assignedToMe) {
      const pendingApprovals = await ApprovalService.getPendingApprovalsForUser(
        user.sub,
        user.orgId
      )

      return NextResponse.json({
        success: true,
        data: {
          requests: pendingApprovals,
          pagination: {
            page: 1,
            limit: pendingApprovals.length,
            total: pendingApprovals.length,
            totalPages: 1
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    // Build where clause for general requests
    const where: any = {
      organizationId: user.orgId
    }

    if (validatedQuery.status) {
      where.status = validatedQuery.status
    }

    if (validatedQuery.taskId) {
      where.taskId = validatedQuery.taskId
    }

    if (validatedQuery.workflowId) {
      where.workflowId = validatedQuery.workflowId
    }

    // Get approval requests with pagination
    const [requests, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true
            }
          },
          workflow: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          delegatedFromUser: {
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
      prisma.approvalRequest.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        requests,
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

    console.error('Get approval requests error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching approval requests'
        }
      },
      { status: 500 }
    )
  }
}