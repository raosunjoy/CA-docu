// Zetra Platform - Mobile Performance Monitoring Service
// Real-time performance tracking and optimization for mobile APIs

export interface PerformanceMetric {
  id: string
  endpoint: string
  method: string
  responseTime: number
  dataSize: number
  cacheHit: boolean
  compressed: boolean
  userAgent: string
  networkType?: string
  timestamp: Date
  userId?: string
  errorCount: number
  successCount: number
}

export interface PerformanceStats {
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  cacheHitRate: number
  compressionRatio: number
  errorRate: number
  throughput: number
  totalRequests: number
  mobileRequests: number
  desktopRequests: number
}

export interface PerformanceAlert {
  id: string
  type: 'slow_response' | 'high_error_rate' | 'cache_miss' | 'large_payload'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  endpoint: string
  value: number
  threshold: number
  timestamp: Date
  resolved: boolean
}

export class MobilePerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private alerts: PerformanceAlert[] = []
  private thresholds = {
    responseTime: 1000, // 1 second
    errorRate: 0.05, // 5%
    cacheHitRate: 0.7, // 70%
    payloadSize: 100 * 1024 // 100KB
  }

  constructor() {
    this.startPerformanceCollection()
    this.startAlertMonitoring()
  }

  // Record performance metric
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    this.metrics.push(performanceMetric)

    // Keep only last 10,000 metrics to prevent memory issues
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000)
    }

    // Check for performance issues
    this.checkPerformanceThresholds(performanceMetric)
  }

  // Get performance statistics
  getPerformanceStats(timeRange?: { start: Date; end: Date }): PerformanceStats {
    let relevantMetrics = this.metrics

    if (timeRange) {
      relevantMetrics = this.metrics.filter(metric =>
        metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      )
    }

    if (relevantMetrics.length === 0) {
      return this.getEmptyStats()
    }

    const responseTimes = relevantMetrics.map(m => m.responseTime).sort((a, b) => a - b)
    const totalRequests = relevantMetrics.length
    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length
    const compressed = relevantMetrics.filter(m => m.compressed).length
    const errors = relevantMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    const successes = relevantMetrics.reduce((sum, m) => sum + m.successCount, 0)
    const mobileRequests = relevantMetrics.filter(m => this.isMobileUserAgent(m.userAgent)).length

    return {
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      compressionRatio: totalRequests > 0 ? compressed / totalRequests : 0,
      errorRate: (errors + successes) > 0 ? errors / (errors + successes) : 0,
      throughput: this.calculateThroughput(relevantMetrics),
      totalRequests,
      mobileRequests,
      desktopRequests: totalRequests - mobileRequests
    }
  }

  // Get endpoint-specific performance
  getEndpointPerformance(endpoint: string, timeRange?: { start: Date; end: Date }): PerformanceStats {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint)
    return this.getPerformanceStats(timeRange)
  }

  // Get mobile-specific performance
  getMobilePerformance(timeRange?: { start: Date; end: Date }): PerformanceStats {
    const mobileMetrics = this.metrics.filter(m => this.isMobileUserAgent(m.userAgent))
    
    let relevantMetrics = mobileMetrics
    if (timeRange) {
      relevantMetrics = mobileMetrics.filter(metric =>
        metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      )
    }

    if (relevantMetrics.length === 0) {
      return this.getEmptyStats()
    }

    const responseTimes = relevantMetrics.map(m => m.responseTime).sort((a, b) => a - b)
    const totalRequests = relevantMetrics.length
    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length
    const compressed = relevantMetrics.filter(m => m.compressed).length
    const errors = relevantMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    const successes = relevantMetrics.reduce((sum, m) => sum + m.successCount, 0)

    return {
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
      compressionRatio: totalRequests > 0 ? compressed / totalRequests : 0,
      errorRate: (errors + successes) > 0 ? errors / (errors + successes) : 0,
      throughput: this.calculateThroughput(relevantMetrics),
      totalRequests,
      mobileRequests: totalRequests,
      desktopRequests: 0
    }
  }

  // Get performance alerts
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    let alerts = this.alerts
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity)
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  // Get unresolved alerts
  getUnresolvedAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  // Get performance trends
  getPerformanceTrends(hours: number = 24): {
    responseTime: Array<{ timestamp: Date; value: number }>
    throughput: Array<{ timestamp: Date; value: number }>
    errorRate: Array<{ timestamp: Date; value: number }>
    cacheHitRate: Array<{ timestamp: Date; value: number }>
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff)
    
    // Group metrics by hour
    const hourlyGroups = new Map<string, PerformanceMetric[]>()
    
    recentMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp)
      hour.setMinutes(0, 0, 0)
      const key = hour.toISOString()
      
      if (!hourlyGroups.has(key)) {
        hourlyGroups.set(key, [])
      }
      hourlyGroups.get(key)!.push(metric)
    })

    const responseTime: Array<{ timestamp: Date; value: number }> = []
    const throughput: Array<{ timestamp: Date; value: number }> = []
    const errorRate: Array<{ timestamp: Date; value: number }> = []
    const cacheHitRate: Array<{ timestamp: Date; value: number }> = []

    for (const [hourStr, metrics] of hourlyGroups.entries()) {
      const timestamp = new Date(hourStr)
      const responseTimes = metrics.map(m => m.responseTime)
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      
      const errors = metrics.reduce((sum, m) => sum + m.errorCount, 0)
      const successes = metrics.reduce((sum, m) => sum + m.successCount, 0)
      const totalRequests = errors + successes
      
      const cacheHits = metrics.filter(m => m.cacheHit).length

      responseTime.push({ timestamp, value: avgResponseTime })
      throughput.push({ timestamp, value: metrics.length })
      errorRate.push({ timestamp, value: totalRequests > 0 ? errors / totalRequests : 0 })
      cacheHitRate.push({ timestamp, value: metrics.length > 0 ? cacheHits / metrics.length : 0 })
    }

    return { responseTime, throughput, errorRate, cacheHitRate }
  }

  // Private methods
  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    // Check response time
    if (metric.responseTime > this.thresholds.responseTime) {
      this.createAlert({
        type: 'slow_response',
        severity: metric.responseTime > this.thresholds.responseTime * 2 ? 'high' : 'medium',
        message: `Slow response time detected: ${metric.responseTime}ms`,
        endpoint: metric.endpoint,
        value: metric.responseTime,
        threshold: this.thresholds.responseTime
      })
    }

    // Check payload size
    if (metric.dataSize > this.thresholds.payloadSize) {
      this.createAlert({
        type: 'large_payload',
        severity: metric.dataSize > this.thresholds.payloadSize * 2 ? 'high' : 'medium',
        message: `Large payload detected: ${this.formatBytes(metric.dataSize)}`,
        endpoint: metric.endpoint,
        value: metric.dataSize,
        threshold: this.thresholds.payloadSize
      })
    }

    // Check cache miss for frequently accessed endpoints
    if (!metric.cacheHit && this.isFrequentlyAccessedEndpoint(metric.endpoint)) {
      this.createAlert({
        type: 'cache_miss',
        severity: 'low',
        message: `Cache miss on frequently accessed endpoint`,
        endpoint: metric.endpoint,
        value: 0,
        threshold: 1
      })
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: PerformanceAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    }

    this.alerts.push(alert)

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000)
    }

    console.warn(`Performance Alert: ${alert.message} (${alert.endpoint})`)
  }

  private calculateThroughput(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0

    const timeSpan = Math.max(
      metrics[metrics.length - 1].timestamp.getTime() - metrics[0].timestamp.getTime(),
      1000 // Minimum 1 second
    )

    return (metrics.length / timeSpan) * 1000 // Requests per second
  }

  private isMobileUserAgent(userAgent: string): boolean {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    return mobileRegex.test(userAgent)
  }

  private isFrequentlyAccessedEndpoint(endpoint: string): boolean {
    const recentMetrics = this.metrics.filter(m => 
      m.endpoint === endpoint && 
      m.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    )
    return recentMetrics.length > 10 // More than 10 requests in the last hour
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  private getEmptyStats(): PerformanceStats {
    return {
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      compressionRatio: 0,
      errorRate: 0,
      throughput: 0,
      totalRequests: 0,
      mobileRequests: 0,
      desktopRequests: 0
    }
  }

  private startPerformanceCollection(): void {
    // Collect performance metrics every minute
    setInterval(() => {
      const stats = this.getPerformanceStats()
      
      // Log performance summary
      console.log('Performance Summary:', {
        avgResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
        cacheHitRate: `${(stats.cacheHitRate * 100).toFixed(1)}%`,
        errorRate: `${(stats.errorRate * 100).toFixed(2)}%`,
        throughput: `${stats.throughput.toFixed(2)} req/s`,
        totalRequests: stats.totalRequests,
        mobileRequests: stats.mobileRequests
      })
    }, 60000)
  }

  private startAlertMonitoring(): void {
    // Check for performance issues every 30 seconds
    setInterval(() => {
      const recentMetrics = this.metrics.filter(m => 
        m.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      )

      if (recentMetrics.length === 0) return

      const stats = this.getPerformanceStats({
        start: new Date(Date.now() - 5 * 60 * 1000),
        end: new Date()
      })

      // Check error rate threshold
      if (stats.errorRate > this.thresholds.errorRate) {
        this.createAlert({
          type: 'high_error_rate',
          severity: stats.errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'high',
          message: `High error rate detected: ${(stats.errorRate * 100).toFixed(2)}%`,
          endpoint: 'system-wide',
          value: stats.errorRate,
          threshold: this.thresholds.errorRate
        })
      }

      // Check cache hit rate threshold
      if (stats.cacheHitRate < this.thresholds.cacheHitRate) {
        this.createAlert({
          type: 'cache_miss',
          severity: 'medium',
          message: `Low cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`,
          endpoint: 'system-wide',
          value: stats.cacheHitRate,
          threshold: this.thresholds.cacheHitRate
        })
      }
    }, 30000)
  }

  // Configuration methods
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  getThresholds(): typeof this.thresholds {
    return { ...this.thresholds }
  }

  // Export methods for analysis
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'endpoint', 'method', 'responseTime', 'dataSize', 'cacheHit', 'compressed', 'userAgent']
      const rows = this.metrics.map(m => [
        m.timestamp.toISOString(),
        m.endpoint,
        m.method,
        m.responseTime.toString(),
        m.dataSize.toString(),
        m.cacheHit.toString(),
        m.compressed.toString(),
        m.userAgent
      ])
      
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(this.metrics, null, 2)
  }

  // Clear old data
  clearOldData(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    const initialLength = this.metrics.length
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff)
    
    return initialLength - this.metrics.length
  }
}

// Export singleton instance
export const mobilePerformanceMonitor = new MobilePerformanceMonitor()

// Performance monitoring middleware
export function withPerformanceMonitoring(handler: Function) {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    const endpoint = new URL(request.url).pathname
    const method = request.method
    const userAgent = request.headers.get('user-agent') || ''
    
    try {
      const response = await handler(request)
      const responseTime = Date.now() - startTime
      
      // Extract response size
      let dataSize = 0
      if (response instanceof Response) {
        const contentLength = response.headers.get('content-length')
        if (contentLength) {
          dataSize = parseInt(contentLength)
        }
      }

      // Record successful metric
      mobilePerformanceMonitor.recordMetric({
        endpoint,
        method,
        responseTime,
        dataSize,
        cacheHit: response.headers?.get('X-Cache-Hit') === 'true',
        compressed: response.headers?.get('X-Compressed') === 'true',
        userAgent,
        errorCount: 0,
        successCount: 1
      })

      return response

    } catch (error) {
      const responseTime = Date.now() - startTime
      
      // Record error metric
      mobilePerformanceMonitor.recordMetric({
        endpoint,
        method,
        responseTime,
        dataSize: 0,
        cacheHit: false,
        compressed: false,
        userAgent,
        errorCount: 1,
        successCount: 0
      })

      throw error
    }
  }
}