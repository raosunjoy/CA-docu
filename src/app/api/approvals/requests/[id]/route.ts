// Approval Request API endpoints - Process decisions

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, ApprovalDecision } from '@/types'
import { ApprovalService } from '@/lib/approval-service'
import prisma from '@/lib/prisma'

// Decision schema
const decisionSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  comments: z.string().optional(),
  delegateToId: z.string().optional()
}).refine(
  (data) => {
    if (data.decision === ApprovalDecision.DELEGATE && !data.delegateToId) {
      return false
    }
    return true
  },
  {
    message: "delegateToId is required when decision is DELEGATE",
    path: ["delegateToId"]
  }
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { id: requestId } = await params

    // Get approval request
    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: {
        id: requestId,
        organizationId: user.orgId
      },
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
            priority: true,
            description: true
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            steps: true
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
      }
    })

    if (!approvalRequest) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Approval request not found'
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: approvalRequest,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get approval request error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching approval request'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { id: requestId } = await params
    const body = await request.json()
    const validatedData = decisionSchema.parse(body)

    // Verify user has permission to approve this request
    const approvalRequest = await prisma.approvalRequest.findFirst({
      where: {
        id: requestId,
        organizationId: user.orgId,
        approverId: user.sub
      }
    })

    if (!approvalRequest) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to approve this request'
          }
        },
        { status: 403 }
      )
    }

    // Validate delegate user if delegating
    if (validatedData.decision === ApprovalDecision.DELEGATE && validatedData.delegateToId) {
      const delegateUser = await prisma.user.findFirst({
        where: {
          id: validatedData.delegateToId,
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
    }

    // Process the decision
    const result = await ApprovalService.processApprovalDecision(
      requestId,
      validatedData,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: {
        processed: result.success,
        nextStep: result.nextStep,
        workflowComplete: result.workflowComplete
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
            message: 'Invalid request data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    console.error('Process approval decision error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing approval decision'
        }
      },
      { status: 500 }
    )
  }
}