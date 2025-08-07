import { NextRequest, NextResponse } from 'next/server'
import { MetricsCollector } from '@/app/api/metrics/route'

// Constants for metrics collection
const MAX_REQUESTS_HISTORY = 10000
const ACTIVE_REQUEST_WINDOW_MS = 5000
const ONE_MINUTE_MS = 60000
const FIVE_MINUTES_MS = 300000
const SLOW_REQUEST_THRESHOLD_MS = 2000
const MILLISECONDS_TO_SECONDS = 1000

interface RequestMetrics {
  method: string
  path: string
  statusCode: number
  duration: number
  timestamp: number
}

class RequestMetricsCollector {
  private static instance: RequestMetricsCollector
  private requests: RequestMetrics[] = []
  private metricsCollector: MetricsCollector

  constructor() {
    this.metricsCollector = MetricsCollector.getInstance()
  }

  static getInstance(): RequestMetricsCollector {
    if (!RequestMetricsCollector.instance) {
      RequestMetricsCollector.instance = new RequestMetricsCollector()
    }
    return RequestMetricsCollector.instance
  }

  recordRequest(metrics: RequestMetrics) {
    this.requests.push(metrics)

    // Keep only last MAX_REQUESTS_HISTORY requests
    if (this.requests.length > MAX_REQUESTS_HISTORY) {
      this.requests.shift()
    }

    // Update Prometheus metrics
    const metricName = `http_requests_total{method="${metrics.method}",status="${metrics.statusCode}"}`
    this.metricsCollector.incrementCounter(metricName)

    // Record response time histogram
    this.metricsCollector.recordHistogram(
      'http_request_duration_seconds',
      metrics.duration / MILLISECONDS_TO_SECONDS
    )

    // Update active requests gauge (approximate)
    const activeRequests = this.getActiveRequestsCount()
    this.metricsCollector.setGauge('http_requests_active', activeRequests)
  }

  private getActiveRequestsCount(): number {
    const now = Date.now()
    const activeWindowStart = now - ACTIVE_REQUEST_WINDOW_MS
    return this.requests.filter(req => req.timestamp > activeWindowStart).length
  }

  getMetrics() {
    const now = Date.now()
    const oneMinuteAgo = now - ONE_MINUTE_MS
    const fiveMinutesAgo = now - FIVE_MINUTES_MS

    const recentRequests = this.requests.filter(req => req.timestamp > oneMinuteAgo)
    const last5MinRequests = this.requests.filter(req => req.timestamp > fiveMinutesAgo)

    const HTTP_CLIENT_ERROR = 400
    const errorRequests = recentRequests.filter(req => req.statusCode >= HTTP_CLIENT_ERROR)
    const slowRequests = recentRequests.filter(req => req.duration > SLOW_REQUEST_THRESHOLD_MS)

    return {
      totalRequests: this.requests.length,
      requestsLastMinute: recentRequests.length,
      requestsLast5Minutes: last5MinRequests.length,
      errorRate: recentRequests.length > 0 ? errorRequests.length / recentRequests.length : 0,
      averageResponseTime:
        recentRequests.length > 0
          ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length
          : 0,
      slowRequestsCount: slowRequests.length,
      statusCodes: this.getStatusCodeDistribution(recentRequests),
      topEndpoints: this.getTopEndpoints(last5MinRequests),
    }
  }

  private getStatusCodeDistribution(requests: RequestMetrics[]) {
    const distribution: Record<string, number> = {}
    requests.forEach(req => {
      const statusGroup = `${Math.floor(req.statusCode / 100)}xx`
      distribution[statusGroup] = (distribution[statusGroup] || 0) + 1
    })
    return distribution
  }

  private getTopEndpoints(requests: RequestMetrics[]) {
    const endpointCounts: Record<string, number> = {}
    requests.forEach(req => {
      const key = `${req.method} ${req.path}`
      endpointCounts[key] = (endpointCounts[key] || 0) + 1
    })

    return Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }))
  }
}

export function createMetricsMiddleware() {
  const collector = RequestMetricsCollector.getInstance()

  return async function metricsMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now()
    const method = request.method
    const path = new URL(request.url).pathname

    // Skip metrics collection for the metrics endpoint itself
    if (path === '/api/metrics') {
      return next()
    }

    try {
      const response = await next()
      const duration = Date.now() - startTime

      collector.recordRequest({
        method,
        path,
        statusCode: response.status,
        duration,
        timestamp: startTime,
      })

      // Add response time header
      response.headers.set('X-Response-Time', `${duration}ms`)

      return response
    } catch (error) {
      const duration = Date.now() - startTime

      collector.recordRequest({
        method,
        path,
        statusCode: 500,
        duration,
        timestamp: startTime,
      })

      throw error
    }
  }
}

export { RequestMetricsCollector }
