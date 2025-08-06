// Time Entries API endpoints - List and Create time entries

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TimeEntryType } from '@/types'
import { TimeTrackingService, TimeEntryResult } from '@/lib/time-tracking-service'

// Time entry creation schema
const createTimeEntrySchema = z.object({
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().datetime().optional(),
  type: z.nativeEnum(TimeEntryType).default(TimeEntryType.WORK),
  isBillable: z.boolean().default(true),
  hourlyRate: z.number().min(0).optional(),
  tags: z.array(z.string()).default([])
})

// Query parameters schema
const querySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  userId: z.string().optional(),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  isBillable: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.string().optional()
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

    const filters = {
      userId: validatedQuery.userId,
      taskId: validatedQuery.taskId,
      projectId: validatedQuery.projectId,
      clientId: validatedQuery.clientId,
      status: validatedQuery.status ? [validatedQuery.status as any] : undefined,
      type: validatedQuery.type ? [validatedQuery.type as any] : undefined,
      isBillable: validatedQuery.isBillable,
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
      tags: validatedQuery.tags ? validatedQuery.tags.split(',') : undefined
    }

    const result = await TimeTrackingService.getTimeEntries(
      user.orgId,
      filters,
      validatedQuery.page,
      validatedQuery.limit
    )

    return NextResponse.json({
      success: true,
      data: {
        entries: result.entries,
        pagination: {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / validatedQuery.limit)
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

    console.error('Get time entries error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching time entries'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<TimeEntryResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = createTimeEntrySchema.parse(body)

    const entryData = {
      taskId: validatedData.taskId,
      projectId: validatedData.projectId,
      clientId: validatedData.clientId,
      description: validatedData.description,
      startTime: validatedData.startTime ? new Date(validatedData.startTime) : new Date(),
      type: validatedData.type,
      isBillable: validatedData.isBillable,
      hourlyRate: validatedData.hourlyRate,
      tags: validatedData.tags
    }

    const timeEntry = await TimeTrackingService.startTimeEntry(
      user.orgId,
      user.sub,
      entryData
    )

    return NextResponse.json({
      success: true,
      data: timeEntry,
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

    console.error('Create time entry error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating time entry'
        }
      },
      { status: 500 }
    )
  }
}