// Approval Templates API endpoints - List and Create templates

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, UserRole } from '@/types'
import { ApprovalService } from '@/lib/approval-service'
import prisma from '@/lib/prisma'

// Template creation schema
const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in']),
    value: z.any()
  })),
  steps: z.array(z.object({
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
  })).min(1),
  isDefault: z.boolean().default(false)
})

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  category: z.string().optional(),
  isDefault: z.string().transform(val => val === 'true').optional(),
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

    if (validatedQuery.category) {
      where.category = validatedQuery.category
    }

    if (validatedQuery.isDefault !== undefined) {
      where.isDefault = validatedQuery.isDefault
    }

    if (validatedQuery.isActive !== undefined) {
      where.isActive = validatedQuery.isActive
    }

    // Get templates with pagination
    const [templates, total] = await Promise.all([
      prisma.approvalTemplate.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit
      }),
      prisma.approvalTemplate.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        templates,
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

    console.error('Get templates error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching templates'
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
    const validatedData = createTemplateSchema.parse(body)

    // Check if setting as default and user has permission (only admins/partners)
    if (validatedData.isDefault && !['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only admins and partners can create default templates'
          }
        },
        { status: 403 }
      )
    }

    // If setting as default, unset other defaults in same category
    if (validatedData.isDefault) {
      await prisma.approvalTemplate.updateMany({
        where: {
          organizationId: user.orgId,
          category: validatedData.category || null,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Create template
    const template = await ApprovalService.createTemplate(
      user.orgId,
      validatedData,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: template,
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

    console.error('Create template error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating template'
        }
      },
      { status: 500 }
    )
  }
}