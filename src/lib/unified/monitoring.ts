interface MetricData {
  timestamp: Date
  value: number
  tags: Record<string, string>
}

interface LogEntry {
  timestamp: Date
  level: 'info' | 'warn' | 'error' | 'debug'
  service: string
  message: string
  metadata?: Record<string, unknown>
  requestId?: string
}

interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: Date
  responseTime?: number
  error?: string
  checks: Array<{
    name: string
    status: 'pass' | 'fail' | 'warn'
    details?: string
  }>
}

export class UnifiedMonitoringSystem {
  private metrics: Map<string, MetricData[]> = new Map()
  private logs: LogEntry[] = []
  private healthChecks: Map<string, HealthCheck> = new Map()
  private alerts: Array<{ 
    id: string
    service: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: Date
    resolved: boolean
  }> = []

  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const metrics = this.metrics.get(name)!
    metrics.push({
      timestamp: new Date(),
      value,
      tags
    })
    
    // Keep only last 1000 data points per metric
    if (metrics.length > 1000) {
      metrics.shift()
    }
    
    // Check for alert conditions
    this.checkMetricAlerts(name, value, tags)
  }

  log(level: LogEntry['level'], service: string, message: string, metadata?: Record<string, unknown>, requestId?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      service,
      message,
      metadata,
      requestId
    }
    
    this.logs.push(entry)
    
    // Keep only last 10000 log entries
    if (this.logs.length > 10000) {
      this.logs.shift()
    }
    
    // Console output for development
    const logMessage = `[${entry.timestamp.toISOString()}] ${level.toUpperCase()} ${service}: ${message}`
    
    switch (level) {
      case 'error':
        console.error(logMessage, metadata)
        break
      case 'warn':
        console.warn(logMessage, metadata)
        break
      case 'debug':
        console.debug(logMessage, metadata)
        break
      default:
        console.log(logMessage, metadata)
    }
  }

  recordHealthCheck(service: string, healthCheck: Omit<HealthCheck, 'service' | 'timestamp'>): void {
    const check: HealthCheck = {
      service,
      timestamp: new Date(),
      ...healthCheck
    }
    
    this.healthChecks.set(service, check)
    
    // Create alert if service becomes unhealthy
    if (healthCheck.status !== 'healthy') {
      this.createAlert({
        service,
        severity: healthCheck.status === 'unhealthy' ? 'high' : 'medium',
        message: `Service ${service} is ${healthCheck.status}: ${healthCheck.error || 'No details'}`
      })
    }
  }

  getMetrics(name: string, timeRange?: { start: Date; end: Date }): MetricData[] {
    const metrics = this.metrics.get(name) || []
    
    if (!timeRange) {
      return metrics
    }
    
    return metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    )
  }

  getAggregatedMetrics(name: string, aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count', timeRange?: { start: Date; end: Date }): number {
    const metrics = this.getMetrics(name, timeRange)
    
    if (metrics.length === 0) return 0
    
    const values = metrics.map(m => m.value)
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0)
      case 'min':
        return Math.min(...values)
      case 'max':
        return Math.max(...values)
      case 'count':
        return values.length
      default:
        return 0
    }
  }

  getLogs(filters?: {
    service?: string
    level?: LogEntry['level']
    requestId?: string
    timeRange?: { start: Date; end: Date }
  }): LogEntry[] {
    let filteredLogs = this.logs
    
    if (filters?.service) {
      filteredLogs = filteredLogs.filter(log => log.service === filters.service)
    }
    
    if (filters?.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level)
    }
    
    if (filters?.requestId) {
      filteredLogs = filteredLogs.filter(log => log.requestId === filters.requestId)
    }
    
    if (filters?.timeRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filters.timeRange!.start && 
        log.timestamp <= filters.timeRange!.end
      )
    }
    
    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getHealthStatus(service?: string): HealthCheck | Map<string, HealthCheck> {
    if (service) {
      return this.healthChecks.get(service)!
    }
    return this.healthChecks
  }

  private createAlert(alert: {
    service: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
  }): void {
    const alertEntry = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alert
    }
    
    this.alerts.push(alertEntry)
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift()
    }
    
    this.log('warn', 'monitoring', `Alert created: ${alert.message}`, {
      severity: alert.severity,
      alertId: alertEntry.id
    })
  }

  private checkMetricAlerts(name: string, value: number, tags: Record<string, string>): void {
    const service = tags.service || 'unknown'
    
    // Response time alerts
    if (name === 'response_time_ms') {
      if (value > 5000) {
        this.createAlert({
          service,
          severity: 'high',
          message: `High response time: ${value}ms`
        })
      } else if (value > 2000) {
        this.createAlert({
          service,
          severity: 'medium',
          message: `Elevated response time: ${value}ms`
        })
      }
    }
    
    // Error rate alerts
    if (name === 'error_rate') {
      if (value > 0.1) { // 10% error rate
        this.createAlert({
          service,
          severity: 'critical',
          message: `High error rate: ${(value * 100).toFixed(1)}%`
        })
      } else if (value > 0.05) { // 5% error rate
        this.createAlert({
          service,
          severity: 'high',
          message: `Elevated error rate: ${(value * 100).toFixed(1)}%`
        })
      }
    }
    
    // Request queue alerts
    if (name === 'queue_length') {
      if (value > 100) {
        this.createAlert({
          service,
          severity: 'high',
          message: `Large request queue: ${value} requests`
        })
      }
    }
  }

  getAlerts(resolved = false): typeof this.alerts {
    return this.alerts.filter(alert => alert.resolved === resolved)
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.log('info', 'monitoring', `Alert resolved: ${alert.message}`, { alertId })
      return true
    }
    return false
  }

  getSystemOverview(): {
    totalServices: number
    healthyServices: number
    activeAlerts: number
    totalRequests: number
    avgResponseTime: number
    errorRate: number
  } {
    const totalServices = this.healthChecks.size
    const healthyServices = Array.from(this.healthChecks.values())
      .filter(check => check.status === 'healthy').length
    const activeAlerts = this.getAlerts(false).length
    
    const responseTimeMetrics = this.getMetrics('response_time_ms')
    const totalRequests = responseTimeMetrics.length
    const avgResponseTime = totalRequests > 0 
      ? this.getAggregatedMetrics('response_time_ms', 'avg')
      : 0
    
    const errorMetrics = this.getMetrics('error_rate')
    const errorRate = errorMetrics.length > 0 
      ? this.getAggregatedMetrics('error_rate', 'avg')
      : 0
    
    return {
      totalServices,
      healthyServices,
      activeAlerts,
      totalRequests,
      avgResponseTime,
      errorRate
    }
  }

  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      let output = ''
      
      for (const [name, metrics] of this.metrics.entries()) {
        const latestMetric = metrics[metrics.length - 1]
        if (latestMetric) {
          const tags = Object.entries(latestMetric.tags)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',')
          
          output += `# TYPE ${name} gauge\n`
          output += `${name}{${tags}} ${latestMetric.value}\n`
        }
      }
      
      return output
    }
    
    return JSON.stringify({
      metrics: Object.fromEntries(this.metrics),
      healthChecks: Object.fromEntries(this.healthChecks),
      alerts: this.alerts,
      overview: this.getSystemOverview()
    }, null, 2)
  }
}

export const unifiedMonitoring = new UnifiedMonitoringSystem()