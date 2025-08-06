import { NextRequest, NextResponse } from 'next/server'
import { DashboardService } from '../../../../lib/dashboard-service'
import { AnalyticsEngine } from '../../../../lib/analytics-engine'
import { auth } from '../../../../lib/auth'
import type { UserRole } from '../../../../types'

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || user.organizationId
    const userId = searchParams.get('userId') || user.id
    const role = (searchParams.get('role') as UserRole) || user.role
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    const filters = {
      dateRange: startDate && endDate ? [startDate, endDate] as [Date, Date] : undefined,
      userId: role !== 'PARTNER' && role !== 'ADMIN' ? userId : undefined
    }

    const metrics = await DashboardService.getDashboardMetrics(
      organizationId,
      userId,
      role,
      filters
    )

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Dashboard metrics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard metrics'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { organizationId, filters, recalculate } = body

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (recalculate) {
      // Trigger metrics recalculation
      const productivityMetrics = await AnalyticsEngine.calculateProductivityMetrics(
        organizationId,
        filters?.userId,
        filters?.startDate ? new Date(filters.startDate) : undefined,
        filters?.endDate ? new Date(filters.endDate) : undefined
      )

      return NextResponse.json({
        success: true,
        data: { recalculated: true, metrics: productivityMetrics },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid request' } },
      { status: 400 }
    )
  } catch (error) {
    console.error('Dashboard metrics POST API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process metrics request'
        }
      },
      { status: 500 }
    )
  }
}