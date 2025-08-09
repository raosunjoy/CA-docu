'use client'

import React from 'react'
import { useUnifiedSystem } from '@/hooks/useUnifiedSystem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const StatusIndicator: React.FC<{ 
  status: 'operational' | 'degraded' | 'error'
  size?: 'sm' | 'md' 
}> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  
  const colorClasses = {
    operational: 'bg-green-400',
    degraded: 'bg-yellow-400',
    error: 'bg-red-400'
  }

  return (
    <div className={`${sizeClasses} rounded-full ${colorClasses[status]} animate-pulse`} />
  )
}

const ServiceCard: React.FC<{
  title: string
  count: number
  healthyCount: number
  type: 'ai' | 'analytics' | 'hybrid'
}> = ({ title, count, healthyCount, type }) => {
  const typeColors = {
    ai: 'bg-purple-100 text-purple-600',
    analytics: 'bg-blue-100 text-blue-600',
    hybrid: 'bg-green-100 text-green-600'
  }

  const healthPercentage = count > 0 ? Math.round((healthyCount / count) * 100) : 100

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[type]}`}>
          <span className="text-xs font-semibold">{count}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{healthyCount}/{count} healthy</p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={healthPercentage === 100 ? 'success' : healthPercentage >= 80 ? 'warning' : 'error'}>
          {healthPercentage}%
        </Badge>
      </div>
    </div>
  )
}

const MetricCard: React.FC<{
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  status?: 'good' | 'warning' | 'error'
}> = ({ title, value, unit, trend, status = 'good' }) => {
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  }

  const trendIcons = {
    up: '↗',
    down: '↙',
    stable: '→'
  }

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${statusColors[status]}`}>
        {value}{unit}
      </div>
      <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
        <span>{title}</span>
        {trend && (
          <span className={`text-xs ${statusColors[status]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
    </div>
  )
}

export const UnifiedSystemStatus: React.FC = () => {
  const {
    systemStatus,
    loading,
    error,
    lastUpdated,
    refreshStatus,
    isSystemHealthy,
    serviceCount,
    healthyServiceCount,
    activeAlerts,
    aiServicesCount,
    analyticsServicesCount,
    hybridServicesCount,
    avgResponseTime,
    errorRate,
    totalRequests,
    implementationStatus
  } = useUnifiedSystem()

  if (loading && !systemStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 mt-2">Loading unified system status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">System Status Error</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={refreshStatus} size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StatusIndicator status={isSystemHealthy ? 'operational' : 'degraded'} size="md" />
              <span>Unified AI-Analytics Platform</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isSystemHealthy ? 'success' : 'warning'}>
                {systemStatus?.status || 'Unknown'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={refreshStatus} disabled={loading}>
                {loading ? <LoadingSpinner size="sm" /> : '↻'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Response Time"
              value={Math.round(avgResponseTime)}
              unit="ms"
              status={avgResponseTime < 1000 ? 'good' : avgResponseTime < 3000 ? 'warning' : 'error'}
              trend={avgResponseTime < 1000 ? 'down' : 'up'}
            />
            <MetricCard
              title="Error Rate"
              value={(errorRate * 100).toFixed(1)}
              unit="%"
              status={errorRate < 0.01 ? 'good' : errorRate < 0.05 ? 'warning' : 'error'}
              trend={errorRate < 0.01 ? 'down' : 'up'}
            />
            <MetricCard
              title="Total Requests"
              value={totalRequests.toLocaleString()}
              status="good"
              trend="up"
            />
            <MetricCard
              title="Active Alerts"
              value={activeAlerts}
              status={activeAlerts === 0 ? 'good' : activeAlerts < 5 ? 'warning' : 'error'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Service Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ServiceCard
              title="AI Services"
              count={aiServicesCount}
              healthyCount={aiServicesCount} // Assuming all are healthy for demo
              type="ai"
            />
            <ServiceCard
              title="Analytics Services"
              count={analyticsServicesCount}
              healthyCount={analyticsServicesCount}
              type="analytics"
            />
            <ServiceCard
              title="Hybrid Services"
              count={hybridServicesCount}
              healthyCount={hybridServicesCount}
              type="hybrid"
            />
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Total: {serviceCount} services
              </span>
              <span className="text-green-600 font-medium">
                {healthyServiceCount}/{serviceCount} healthy
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(implementationStatus).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  {key.replace(/_/g, ' ').replace(/^\d+\.\d+\s/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <Badge variant={
                  status === 'completed' ? 'success' :
                  status === 'in_progress' ? 'warning' :
                  'secondary'
                }>
                  {status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Layer Status */}
      {systemStatus?.dataLayer && (
        <Card>
          <CardHeader>
            <CardTitle>Data Layer Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {systemStatus.dataLayer.tiers.map((tier) => (
                <div key={tier} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xs font-bold text-white uppercase">{tier[0]}</span>
                  </div>
                  <p className="text-sm font-medium capitalize">{tier}</p>
                  <StatusIndicator status="operational" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Version:</span>
              <span className="ml-2 font-medium">{systemStatus?.version}</span>
            </div>
            <div>
              <span className="text-gray-600">Phase:</span>
              <span className="ml-2 font-medium">{systemStatus?.phase}</span>
            </div>
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <span className="ml-2 font-medium">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Security:</span>
              <Badge variant="success" size="sm" className="ml-2">Enabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}