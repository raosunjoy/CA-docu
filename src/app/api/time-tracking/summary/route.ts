// Time Tracking Summary API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TimeTrackingSummary } from '@/types'
import { TimeTrackingService } from '@/lib/time-tracking-service'

// Query parameters schema
const querySchema = z.object({
  userId: z.string().optional(),
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  tags: z.string().optional()
})

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<TimeTrackingSummary>>> {
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
      startDate: new Date(validatedQuery.startDate),
      endDate: new Date(validatedQuery.endDate),
      tags: validatedQuery.tags ? validatedQuery.tags.split(',') : undefined
    }

    const summary = await TimeTrackingService.getTimeTrackingSummary(
      user.orgId,
      filters
    )

    return NextResponse.json({
      success: true,
      data: summary,
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

    console.error('Get time tracking summary error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching time tracking summary'
        }
      },
      { status: 500 }
    )
  }
}