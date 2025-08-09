import { NextRequest, NextResponse } from 'next/server'
import { taskService } from '@/services/task-service'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import type { TaskAnalytics } from '@/types/task'

// GET /api/tasks/analytics - Get task analytics for dashboard
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<TaskAnalytics>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<TaskAnalytics>>
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    
    // Parse date range parameters
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    
    let dateRange: { startDate: Date; endDate: Date } | undefined
    if (startDateParam && endDateParam) {
      dateRange = {
        startDate: new Date(startDateParam),
        endDate: new Date(endDateParam)
      }
      
      // Validate date range
      if (isNaN(dateRange.startDate.getTime()) || isNaN(dateRange.endDate.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_DATE_RANGE',
              message: 'Invalid date format in date range parameters'
            }
          },
          { status: 400 }
        )
      }
      
      if (dateRange.startDate >= dateRange.endDate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_DATE_RANGE',
              message: 'Start date must be before end date'
            }
          },
          { status: 400 }
        )
      }
    }
    
    // Get analytics based on user role and permissions
    const analytics = await taskService.getTaskAnalytics(
      user.orgId,
      user.sub,
      user.role || 'ASSOCIATE',
      dateRange
    )
    
    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        dateRange: dateRange ? {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        } : null
      }
    })
    
  } catch (error) {
    console.error('Task analytics error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get task analytics'
        }
      },
      { status: 500 }
    )
  }
}