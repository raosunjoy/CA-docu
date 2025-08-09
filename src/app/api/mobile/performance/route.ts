import { NextRequest, NextResponse } from 'next/server'
import { mobilePerformanceMonitor } from '@/lib/mobile-performance-monitor'
import { withMobileOptimization } from '@/lib/mobile-api-optimizer'

// Mobile performance dashboard endpoint
async function getPerformanceData(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get('timeRange') || '24h'
  const endpoint = searchParams.get('endpoint')
  const mobileOnly = searchParams.get('mobileOnly') === 'true'

  // Calculate time range
  const hours = timeRange === '1h' ? 1 : 
                timeRange === '6h' ? 6 : 
                timeRange === '24h' ? 24 : 
                timeRange === '7d' ? 168 : 24

  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)
  const endTime = new Date()

  // Get performance statistics
  let stats
  if (mobileOnly) {
    stats = mobilePerformanceMonitor.getMobilePerformance({ start: startTime, end: endTime })
  } else if (endpoint) {
    stats = mobilePerformanceMonitor.getEndpointPerformance(endpoint, { start: startTime, end: endTime })
  } else {
    stats = mobilePerformanceMonitor.getPerformanceStats({ start: startTime, end: endTime })
  }

  // Get performance trends
  const trends = mobilePerformanceMonitor.getPerformanceTrends(hours)

  // Get alerts
  const alerts = mobilePerformanceMonitor.getUnresolvedAlerts()

  // Get top slow endpoints
  const topSlowEndpoints = getTopSlowEndpoints(hours)

  // Mobile-optimized performance data
  const performanceData = {
    overview: {
      averageResponseTime: Math.round(stats.averageResponseTime),
      p95ResponseTime: Math.round(stats.p95ResponseTime),
      cacheHitRate: Math.round(stats.cacheHitRate * 100),
      errorRate: Math.round(stats.errorRate * 100 * 100) / 100, // 2 decimal places
      throughput: Math.round(stats.throughput * 100) / 100,
      totalRequests: stats.totalRequests,
      mobileRequests: stats.mobileRequests,
      compressionRatio: Math.round(stats.compressionRatio * 100)
    },

    trends: {
      responseTime: trends.responseTime.map(point => ({
        time: point.timestamp.toISOString(),
        value: Math.round(point.value)
      })),
      throughput: trends.throughput.map(point => ({
        time: point.timestamp.toISOString(),
        value: Math.round(point.value * 100) / 100
      })),
      errorRate: trends.errorRate.map(point => ({
        time: point.timestamp.toISOString(),
        value: Math.round(point.value * 100 * 100) / 100
      })),
      cacheHitRate: trends.cacheHitRate.map(point => ({
        time: point.timestamp.toISOString(),
        value: Math.round(point.value * 100)
      }))
    },

    alerts: alerts.slice(0, 10).map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      endpoint: alert.endpoint,
      timestamp: alert.timestamp.toISOString(),
      value: alert.value,
      threshold: alert.threshold
    })),

    topSlowEndpoints: topSlowEndpoints.slice(0, 5),

    recommendations: generatePerformanceRecommendations(stats, alerts),

    // Mobile-specific metadata
    timeRange,
    mobileOptimized: true,
    lastUpdated: new Date().toISOString(),
    dataPoints: trends.responseTime.length
  }

  return performanceData
}

// Get top slow endpoints
function getTopSlowEndpoints(hours: number) {
  // Mock data for top slow endpoints
  return [
    {
      endpoint: '/api/documents/search',
      averageResponseTime: 1250,
      requestCount: 45,
      errorRate: 2.2,
      improvement: 'Add search indexing'
    },
    {
      endpoint: '/api/dashboard/analytics',
      averageResponseTime: 980,
      requestCount: 120,
      errorRate: 0.8,
      improvement: 'Implement caching'
    },
    {
      endpoint: '/api/tasks/bulk',
      averageResponseTime: 850,
      requestCount: 32,
      errorRate: 1.5,
      improvement: 'Optimize database queries'
    },
    {
      endpoint: '/api/emails/sync',
      averageResponseTime: 720,
      requestCount: 28,
      errorRate: 3.1,
      improvement: 'Reduce sync batch size'
    },
    {
      endpoint: '/api/reports/generate',
      averageResponseTime: 650,
      requestCount: 15,
      errorRate: 0.0,
      improvement: 'Background processing'
    }
  ]
}

// Generate performance recommendations
function generatePerformanceRecommendations(stats: any, alerts: any[]) {
  const recommendations = []

  // Response time recommendations
  if (stats.averageResponseTime > 1000) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'Optimize Response Times',
      description: 'Average response time is above 1 second. Consider implementing caching and database optimization.',
      impact: 'High',
      effort: 'Medium'
    })
  }

  // Cache hit rate recommendations
  if (stats.cacheHitRate < 0.7) {
    recommendations.push({
      type: 'caching',
      priority: 'medium',
      title: 'Improve Cache Strategy',
      description: 'Cache hit rate is below 70%. Review caching policies and increase cache TTL for stable data.',
      impact: 'Medium',
      effort: 'Low'
    })
  }

  // Error rate recommendations
  if (stats.errorRate > 0.02) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      title: 'Reduce Error Rate',
      description: 'Error rate is above 2%. Investigate and fix common error patterns.',
      impact: 'High',
      effort: 'High'
    })
  }

  // Compression recommendations
  if (stats.compressionRatio < 0.5) {
    recommendations.push({
      type: 'optimization',
      priority: 'low',
      title: 'Enable Response Compression',
      description: 'Only 50% of responses are compressed. Enable compression for all text-based responses.',
      impact: 'Medium',
      effort: 'Low'
    })
  }

  // Mobile-specific recommendations
  if (stats.mobileRequests > stats.totalRequests * 0.6) {
    recommendations.push({
      type: 'mobile',
      priority: 'medium',
      title: 'Mobile-First Optimization',
      description: 'High mobile traffic detected. Implement mobile-specific optimizations and smaller payloads.',
      impact: 'High',
      effort: 'Medium'
    })
  }

  return recommendations.slice(0, 5) // Return top 5 recommendations
}

// Performance configuration endpoint
async function updatePerformanceConfig(request: NextRequest) {
  try {
    const config = await request.json()
    
    // Validate configuration
    const validKeys = ['responseTime', 'errorRate', 'cacheHitRate', 'payloadSize']
    const validConfig: any = {}
    
    for (const key of validKeys) {
      if (config[key] && typeof config[key] === 'number' && config[key] > 0) {
        validConfig[key] = config[key]
      }
    }

    if (Object.keys(validConfig).length === 0) {
      return NextResponse.json(
        { error: 'No valid configuration provided' },
        { status: 400 }
      )
    }

    // Update thresholds
    mobilePerformanceMonitor.updateThresholds(validConfig)

    return {
      success: true,
      message: 'Performance configuration updated',
      updatedConfig: validConfig,
      currentThresholds: mobilePerformanceMonitor.getThresholds()
    }

  } catch (error) {
    console.error('Performance config update error:', error)
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

// Resolve performance alert
async function resolveAlert(request: NextRequest) {
  try {
    const { alertId } = await request.json()
    
    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      )
    }

    const resolved = mobilePerformanceMonitor.resolveAlert(alertId)
    
    if (!resolved) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    return {
      success: true,
      message: 'Alert resolved successfully',
      alertId
    }

  } catch (error) {
    console.error('Alert resolution error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    )
  }
}

// Export performance data
async function exportPerformanceData(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    
    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use json or csv' },
        { status: 400 }
      )
    }

    const data = mobilePerformanceMonitor.exportMetrics(format as 'json' | 'csv')
    
    const response = new NextResponse(data)
    response.headers.set('Content-Type', format === 'csv' ? 'text/csv' : 'application/json')
    response.headers.set('Content-Disposition', `attachment; filename="performance-data.${format}"`)
    
    return response

  } catch (error) {
    console.error('Performance export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}

// Export mobile-optimized handlers
export const GET = withMobileOptimization(getPerformanceData)
export const POST = withMobileOptimization(updatePerformanceConfig)
export const PUT = withMobileOptimization(resolveAlert)
export const DELETE = withMobileOptimization(exportPerformanceData)