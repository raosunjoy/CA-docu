import { NextRequest, NextResponse } from 'next/server'
import { realtimeDashboardService } from '../../../../lib/realtime-dashboard-service'
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
    const widgets = searchParams.get('widgets')?.split(',') || []
    const subscriptionId = searchParams.get('subscriptionId')

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (subscriptionId) {
      // Get pending updates for existing subscription
      const pendingUpdates = realtimeDashboardService.getPendingUpdates(subscriptionId)
      
      return NextResponse.json({
        success: true,
        data: {
          subscriptionId,
          updates: pendingUpdates,
          hasUpdates: pendingUpdates.length > 0
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    } else {
      // Create new subscription
      const newSubscriptionId = realtimeDashboardService.subscribe(
        user.id,
        organizationId,
        user.role,
        widgets
      )

      // Get initial aggregated data
      const initialData = await realtimeDashboardService.aggregateDataForDashboard(
        organizationId,
        user.id,
        user.role,
        widgets
      )

      return NextResponse.json({
        success: true,
        data: {
          subscriptionId: newSubscriptionId,
          initialData,
          widgets
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }
  } catch (error) {
    console.error('Realtime dashboard API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to handle realtime dashboard request'
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
    const { action, subscriptionId, widgets, organizationId } = body

    // Validate organization access
    const targetOrgId = organizationId || user.organizationId
    if (targetOrgId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    switch (action) {
      case 'update_widgets':
        if (!subscriptionId || !widgets) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'subscriptionId and widgets are required' } },
            { status: 400 }
          )
        }
        
        realtimeDashboardService.updateWidgets(subscriptionId, widgets)
        
        return NextResponse.json({
          success: true,
          data: { subscriptionId, widgets },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'trigger_refresh':
        if (!subscriptionId) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'subscriptionId is required' } },
            { status: 400 }
          )
        }

        // Trigger immediate refresh for the subscription
        await realtimeDashboardService.triggerMetricsUpdate(
          targetOrgId,
          user.id,
          user.role
        )

        return NextResponse.json({
          success: true,
          data: { refreshTriggered: true },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'trigger_kpi_update':
        const { kpiId } = body
        if (!kpiId) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'kpiId is required' } },
            { status: 400 }
          )
        }

        await realtimeDashboardService.triggerKPIUpdate(
          targetOrgId,
          kpiId,
          user.id,
          user.role
        )

        return NextResponse.json({
          success: true,
          data: { kpiId, updateTriggered: true },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'send_alert':
        // Only managers and above can send alerts
        if (!['MANAGER', 'PARTNER', 'ADMIN'].includes(user.role)) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
            { status: 403 }
          )
        }

        const { alert, targetUsers } = body
        if (!alert) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'alert is required' } },
            { status: 400 }
          )
        }

        realtimeDashboardService.triggerAlert(targetOrgId, alert, targetUsers)

        return NextResponse.json({
          success: true,
          data: { alertSent: true },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'get_mobile_data':
        const mobileData = await realtimeDashboardService.getMobileOptimizedData(
          targetOrgId,
          user.id,
          user.role
        )

        return NextResponse.json({
          success: true,
          data: mobileData,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
            optimized: 'mobile'
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Unknown action' } },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Realtime dashboard POST API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process realtime dashboard request'
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'subscriptionId is required' } },
        { status: 400 }
      )
    }

    realtimeDashboardService.unsubscribe(subscriptionId)

    return NextResponse.json({
      success: true,
      data: { subscriptionId, unsubscribed: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Realtime dashboard DELETE API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to unsubscribe from realtime dashboard'
        }
      },
      { status: 500 }
    )
  }
}