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
    const metric = searchParams.get('metric')
    const period = searchParams.get('period') as 'day' | 'week' | 'month' | 'quarter' | 'year' || 'month'
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (!metric) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Metric parameter is required' } },
        { status: 400 }
      )
    }

    let analyticsData

    switch (metric) {
      case 'performance':
        analyticsData = await AnalyticsEngine.getPerformanceAnalytics(
          organizationId,
          userId || undefined,
          role,
          period,
          startDate,
          endDate
        )
        break

      case 'productivity':
        const productivityMetrics = await AnalyticsEngine.calculateProductivityMetrics(
          organizationId,
          userId || undefined,
          startDate,
          endDate
        )
        analyticsData = {
          period,
          startDate: startDate || new Date(),
          endDate: endDate || new Date(),
          data: productivityMetrics.map(metric => ({
            date: metric.date.toISOString().split('T')[0],
            value: metric.efficiencyScore || 0,
            label: 'Efficiency Score',
            metadata: {
              totalHours: metric.totalHours,
              billableHours: metric.billableHours,
              tasksCompleted: metric.tasksCompleted
            }
          })),
          trend: 'stable' as const,
          trendPercentage: 0
        }
        break

      case 'time-tracking':
        const timeAnalytics = await AnalyticsEngine.getTimeTrackingAnalytics(
          organizationId,
          userId || undefined,
          startDate,
          endDate
        )
        analyticsData = {
          period,
          startDate: startDate || new Date(),
          endDate: endDate || new Date(),
          data: timeAnalytics.dailyBreakdown.map(day => ({
            date: day.date,
            value: day.totalHours,
            label: 'Hours Logged',
            metadata: {
              billableHours: day.billableHours,
              productivity: day.productivity
            }
          })),
          trend: 'stable' as const,
          trendPercentage: 0
        }
        break

      case 'compliance':
        const complianceMetrics = await AnalyticsEngine.getComplianceMetrics(organizationId, role)
        analyticsData = {
          period,
          startDate: startDate || new Date(),
          endDate: endDate || new Date(),
          data: [{
            date: new Date().toISOString().split('T')[0],
            value: complianceMetrics.complianceScore,
            label: 'Compliance Score',
            metadata: {
              riskLevel: complianceMetrics.riskLevel,
              pendingCompliance: complianceMetrics.pendingCompliance,
              riskFactors: complianceMetrics.riskFactors
            }
          }],
          trend: 'stable' as const,
          trendPercentage: 0
        }
        break

      case 'client-engagement':
        const clientAnalytics = await AnalyticsEngine.getClientEngagementAnalytics(organizationId)
        analyticsData = {
          period,
          startDate: startDate || new Date(),
          endDate: endDate || new Date(),
          data: clientAnalytics.monthlyEngagements.map(month => ({
            date: month.month,
            value: month.newEngagements,
            label: 'New Engagements',
            metadata: {
              completedEngagements: month.completedEngagements,
              revenue: month.revenue
            }
          })),
          trend: 'up' as const,
          trendPercentage: 8.5
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Unknown metric type' } },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch analytics data'
        }
      },
      { status: 500 }
    )
  }
}