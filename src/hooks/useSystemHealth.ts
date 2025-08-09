'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SystemMetrics {
  cpu: number
  memory: number
  responseTime: number
  errorRate: number
  activeUsers: number
  uptime: number
}

export interface SystemAlert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  component: string
  timestamp: Date
  acknowledged: boolean
  actionRequired?: string
}

export interface SystemHealthData {
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  metrics: SystemMetrics
  alerts: SystemAlert[]
  lastUpdated: Date
  ready: boolean
}

export function useSystemHealth(refreshInterval: number = 30000) {
  const [healthData, setHealthData] = useState<SystemHealthData>({
    status: 'unknown',
    metrics: {
      cpu: 0,
      memory: 0,
      responseTime: 0,
      errorRate: 0,
      activeUsers: 0,
      uptime: 0
    },
    alerts: [],
    lastUpdated: new Date(),
    ready: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealthData = useCallback(async () => {
    try {
      setError(null)
      
      // Fetch readiness check
      const readinessResponse = await fetch('/api/health/ready')
      const readinessData = await readinessResponse.json()
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/metrics')
      const metricsText = await metricsResponse.text()
      
      // Parse Prometheus metrics
      const metrics = parsePrometheusMetrics(metricsText)
      
      // Calculate derived metrics
      const memoryUsage = metrics.nodejs_memory_usage_bytes_heapUsed || 0
      const memoryTotal = metrics.nodejs_memory_usage_bytes_heapTotal || 1
      const memoryPercent = Math.round((memoryUsage / memoryTotal) * 100)
      
      const uptime = metrics.nodejs_process_uptime_seconds || 0
      const activeUsers = metrics.zetra_active_sessions_total || 0
      
      // Simulate CPU and response time (in real implementation, these would come from actual monitoring)
      const cpu = Math.round(Math.random() * 30 + 20) // 20-50%
      const responseTime = Math.round(Math.random() * 100 + 50) // 50-150ms
      const errorRate = Math.round(Math.random() * 2) // 0-2%
      
      // Generate alerts based on metrics
      const alerts: SystemAlert[] = []
      
      if (memoryPercent > 80) {
        alerts.push({
          id: 'memory-high',
          severity: memoryPercent > 90 ? 'critical' : 'high',
          message: `Memory usage is ${memoryPercent}%`,
          component: 'System Memory',
          timestamp: new Date(),
          acknowledged: false,
          actionRequired: 'Consider scaling up or optimizing memory usage'
        })
      }
      
      if (cpu > 80) {
        alerts.push({
          id: 'cpu-high',
          severity: cpu > 90 ? 'critical' : 'high',
          message: `CPU usage is ${cpu}%`,
          component: 'System CPU',
          timestamp: new Date(),
          acknowledged: false,
          actionRequired: 'Check for resource-intensive processes'
        })
      }
      
      if (responseTime > 200) {
        alerts.push({
          id: 'response-slow',
          severity: responseTime > 500 ? 'high' : 'medium',
          message: `Average response time is ${responseTime}ms`,
          component: 'API Performance',
          timestamp: new Date(),
          acknowledged: false,
          actionRequired: 'Investigate slow queries or optimize endpoints'
        })
      }
      
      if (!readinessData.ready) {
        alerts.push({
          id: 'system-not-ready',
          severity: 'critical',
          message: 'System readiness check failed',
          component: 'System Health',
          timestamp: new Date(),
          acknowledged: false,
          actionRequired: 'Check database connectivity and configuration'
        })
      }
      
      // Determine overall status
      let status: SystemHealthData['status'] = 'healthy'
      if (alerts.some(a => a.severity === 'critical')) {
        status = 'critical'
      } else if (alerts.some(a => a.severity === 'high')) {
        status = 'warning'
      } else if (alerts.some(a => a.severity === 'medium')) {
        status = 'warning'
      }
      
      setHealthData({
        status,
        metrics: {
          cpu,
          memory: memoryPercent,
          responseTime,
          errorRate,
          activeUsers,
          uptime
        },
        alerts,
        lastUpdated: new Date(),
        ready: readinessData.ready
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
      setHealthData(prev => ({
        ...prev,
        status: 'unknown',
        lastUpdated: new Date()
      }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealthData()
    
    const interval = setInterval(fetchHealthData, refreshInterval)
    
    return () => clearInterval(interval)
  }, [fetchHealthData, refreshInterval])

  return {
    healthData,
    loading,
    error,
    refresh: fetchHealthData
  }
}

// Helper function to parse Prometheus metrics
function parsePrometheusMetrics(metricsText: string): Record<string, number> {
  const metrics: Record<string, number> = {}
  
  const lines = metricsText.split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue
    
    const parts = line.split(' ')
    if (parts.length >= 2) {
      const metricName = parts[0]
      const value = parseFloat(parts[1])
      if (!isNaN(value)) {
        metrics[metricName] = value
      }
    }
  }
  
  return metrics
}