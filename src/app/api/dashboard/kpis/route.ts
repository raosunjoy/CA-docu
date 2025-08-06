import { NextRequest, NextResponse } from 'next/server'
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
    const userId = searchParams.get('userId')
    const role = (searchParams.get('role') as UserRole) || user.role
    const kpiIds = searchParams.get('kpis')?.split(',') || []

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Default KPIs based on role if none specified
    const defaultKPIs = {
      PARTNER: ['task-completion-rate', 'team-utilization', 'client-satisfaction', 'revenue-growth', 'compliance-score'],
      MANAGER: ['task-completion-rate', 'team-utilization', 'productivity-score', 'compliance-score'],
      ASSOCIATE: ['task-completion-rate', 'productivity-score', 'time-utilization'],
      INTERN: ['task-completion-rate', 'learning-progress', 'skill-development'],
      ADMIN: ['task-completion-rate', 'team-utilization', 'client-satisfaction', 'revenue-growth', 'compliance-score']
    }

    const targetKPIs = kpiIds.length > 0 ? kpiIds : defaultKPIs[role] || defaultKPIs.ASSOCIATE

    const kpiPromises = targetKPIs.map(kpiId => 
      AnalyticsEngine.calculateKPI(organizationId, kpiId, userId || undefined, role)
    )

    const kpiResults = await Promise.all(kpiPromises)
    const validKPIs = kpiResults.filter(kpi => kpi !== null)

    return NextResponse.json({
      success: true,
      data: validKPIs,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        role,
        kpisRequested: targetKPIs.length,
        kpisReturned: validKPIs.length
      }
    })
  } catch (error) {
    console.error('KPIs API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch KPI data'
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
    const { organizationId, kpiId, customConfig } = body

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (!kpiId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'KPI ID is required' } },
        { status: 400 }
      )
    }

    // Calculate specific KPI with custom configuration
    const kpi = await AnalyticsEngine.calculateKPI(
      organizationId,
      kpiId,
      customConfig?.userId,
      customConfig?.role || user.role
    )

    if (!kpi) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'KPI not found or could not be calculated' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: kpi,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('KPI calculation API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to calculate KPI'
        }
      },
      { status: 500 }
    )
  }
}