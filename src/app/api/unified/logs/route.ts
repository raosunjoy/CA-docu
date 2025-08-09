import { NextRequest, NextResponse } from 'next/server'
import { unifiedMonitoring } from '@/lib/unified/monitoring'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const service = url.searchParams.get('service')
    const level = url.searchParams.get('level') as 'info' | 'warn' | 'error' | 'debug' | null
    const startTime = url.searchParams.get('startTime')
    const endTime = url.searchParams.get('endTime')
    const limit = url.searchParams.get('limit')

    let timeRange: { start: Date; end: Date } | undefined
    if (startTime && endTime) {
      timeRange = {
        start: new Date(startTime),
        end: new Date(endTime)
      }
    }

    const filters: Parameters<typeof unifiedMonitoring.getLogs>[0] = {}
    if (service) filters.service = service
    if (level) filters.level = level
    if (timeRange) filters.timeRange = timeRange

    const logs = unifiedMonitoring.getLogs(filters)
    const limitedLogs = limit ? logs.slice(0, parseInt(limit)) : logs

    return NextResponse.json({
      logs: limitedLogs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        service: log.service,
        message: log.message,
        metadata: log.metadata
      }))
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch logs'
    }, { status: 500 })
  }
}