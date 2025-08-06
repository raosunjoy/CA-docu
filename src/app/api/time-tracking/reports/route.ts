// Time Reports API endpoints - List and Generate reports

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import { TimeTrackingService } from '@/lib/time-tracking-service'
import prisma from '@/lib/prisma'

// Time report generation schema
const generateReportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  reportType: z.enum(['timesheet', 'productivity', 'billing', 'project']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  filters: z.record(z.string(), z.any()).default({}),
  isScheduled: z.boolean().default(false),
  scheduleConfig: z.record(z.string(), z.any()).optional()
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
  reportType: z.string().optional(),
  generatedBy: z.string().optional()
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

    if (validatedQuery.reportType) where.reportType = validatedQuery.reportType
    if (validatedQuery.generatedBy) where.generatedBy = validatedQuery.generatedBy

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      prisma.timeReport.findMany({
        where,
        include: {
          generator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { generatedAt: 'desc' },
        skip: (validatedQuery.page - 1) * validatedQuery.limit,
        take: validatedQuery.limit
      }),
      prisma.timeReport.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        reports,
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

    console.error('Get time reports error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching time reports'
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
    const validatedData = generateReportSchema.parse(body)

    const reportData = {
      name: validatedData.name,
      description: validatedData.description,
      reportType: validatedData.reportType as any,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      filters: validatedData.filters,
      isScheduled: validatedData.isScheduled,
      scheduleConfig: validatedData.scheduleConfig
    }

    const report = await TimeTrackingService.generateTimeReport(
      user.orgId,
      reportData,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: report,
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

    console.error('Generate time report error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating time report'
        }
      },
      { status: 500 }
    )
  }
}