import { NextRequest, NextResponse } from 'next/server'
import { unifiedMonitoring } from '@/lib/unified/monitoring'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const resolved = url.searchParams.get('resolved') === 'true'

    const alerts = unifiedMonitoring.getAlerts(resolved)

    return NextResponse.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        service: alert.service,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved
      }))
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch alerts'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, action } = body

    if (action === 'resolve' && alertId) {
      const resolved = unifiedMonitoring.resolveAlert(alertId)
      return NextResponse.json({ success: resolved })
    }

    return NextResponse.json({
      error: 'Invalid action or missing alertId'
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to update alert'
    }, { status: 500 })
  }
}