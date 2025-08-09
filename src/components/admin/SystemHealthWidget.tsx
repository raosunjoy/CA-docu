'use client'

import React from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { useSystemHealth, SystemAlert } from '@/hooks/useSystemHealth'
import { cn } from '@/lib/utils'

interface SystemHealthWidgetProps {
  refreshInterval?: number
  showDetails?: boolean
  alertThreshold?: {
    cpu: number
    memory: number
    responseTime: number
  }
  onAlertClick?: (alert: SystemAlert) => void
  className?: string
}

export const SystemHealthWidget: React.FC<SystemHealthWidgetProps> = ({
  refreshInterval = 30000,
  showDetails = true,
  alertThreshold = {
    cpu: 80,
    memory: 80,
    responseTime: 200
  },
  onAlertClick,
  className = ''
}) => {
  const { healthData, loading, error, refresh } = useSystemHealth(refreshInterval)

  const getStatusColor = (status: typeof healthData.status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: typeof healthData.status) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getMetricColor = (value: number, threshold: number) => {
    if (value >= threshold * 1.2) return 'text-red-600'
    if (value >= threshold) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getSeverityBadgeVariant = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'warning'
      case 'medium':
        return 'secondary'
      default:
        return 'default'
    }
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Failed to load system health data</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
              getStatusColor(healthData.status)
            )}>
              {getStatusIcon(healthData.status)}
              <span className="capitalize">{healthData.status}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refresh}
              disabled={loading}
              className={cn(loading && 'animate-spin')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={cn('text-2xl font-bold', getMetricColor(healthData.metrics.cpu, alertThreshold.cpu))}>
              {healthData.metrics.cpu}%
            </div>
            <div className="text-sm text-gray-600">CPU Usage</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={cn('text-2xl font-bold', getMetricColor(healthData.metrics.memory, alertThreshold.memory))}>
              {healthData.metrics.memory}%
            </div>
            <div className="text-sm text-gray-600">Memory</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className={cn('text-2xl font-bold', getMetricColor(healthData.metrics.responseTime, alertThreshold.responseTime))}>
              {healthData.metrics.responseTime}ms
            </div>
            <div className="text-sm text-gray-600">Response Time</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {healthData.metrics.activeUsers}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {healthData.metrics.errorRate}%
            </div>
            <div className="text-sm text-gray-600">Error Rate</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {formatUptime(healthData.metrics.uptime)}
            </div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
        </div>

        {/* Alerts Section */}
        {healthData.alerts.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Active Alerts</h4>
              <Badge variant="secondary">{healthData.alerts.length}</Badge>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {healthData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    'hover:bg-gray-50',
                    alert.severity === 'critical' && 'border-red-200 bg-red-50',
                    alert.severity === 'high' && 'border-orange-200 bg-orange-50',
                    alert.severity === 'medium' && 'border-yellow-200 bg-yellow-50',
                    alert.severity === 'low' && 'border-blue-200 bg-blue-50'
                  )}
                  onClick={() => onAlertClick?.(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityBadgeVariant(alert.severity)} size="sm">
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">{alert.component}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                      {alert.actionRequired && (
                        <p className="text-xs text-gray-500">{alert.actionRequired}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 ml-2">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {showDetails && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Last updated: {healthData.lastUpdated.toLocaleTimeString()}</span>
              <span>Refresh every {refreshInterval / 1000}s</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SystemHealthWidget