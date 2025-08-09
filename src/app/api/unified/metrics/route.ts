import { NextRequest, NextResponse } from 'next/server'
import { unifiedMonitoring } from '@/lib/unified/monitoring'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const metric = url.searchParams.get('metric')
    const startTime = url.searchParams.get('startTime')
    const endTime = url.searchParams.get('endTime')
    
    let timeRange: { start: Date; end: Date } | undefined
    if (startTime && endTime) {
      timeRange = {
        start: new Date(startTime),
        end: new Date(endTime)
      }
    }

    // Get tags from query parameters
    const tags: Record<string, string> = {}
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith('tag_')) {
        tags[key.replace('tag_', '')] = value
      }
    }

    if (metric) {
      const metrics = unifiedMonitoring.getMetrics(metric, timeRange)
      return NextResponse.json({
        metrics: metrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          value: m.value,
          tags: m.tags
        }))
      })
    }

    // If no specific metric requested, return overview
    const overview = unifiedMonitoring.getSystemOverview()
    return NextResponse.json({ overview })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch metrics'
    }, { status: 500 })
  }
}