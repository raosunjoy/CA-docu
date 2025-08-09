'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'maintenance'
  responseTime: number
  uptime: number
  lastCheck: Date
  endpoint?: string
  dependencies: string[]
}

interface SystemStatusOverviewProps {
  refreshInterval?: number
  onServiceClick?: (service: ServiceStatus) => void
  className?: string
}

export const SystemStatusOverview: React.FC<SystemStatusOverviewProps> = ({
  refreshInterval = 30000,
  onServiceClick,
  className = ''
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchServiceStatus = async () => {
    try {
      setError(null)
      
      // In a real implementation, this would fetch from actual monitoring endpoints
      // For now, we'll simulate service status data
      const mockServices: ServiceStatus[] = [
        {
          name: 'API Gateway',
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 100 + 50),
          uptime: 99.9,
          lastCheck: new Date(),
          endpoint: '/api/health',
          dependencies: ['Database', 'Redis Cache']
        },
        {
          name: 'Database',
          status: Math.random() > 0.05 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 50 + 10),
          uptime: 99.95,
          lastCheck: new Date(),
          endpoint: 'postgresql://localhost:5432',
          dependencies: []
        },
        {
          name: 'Redis Cache',
          status: Math.random() > 0.08 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 20 + 5),
          uptime: 99.8,
          lastCheck: new Date(),
          endpoint: 'redis://localhost:6379',
          dependencies: []
        },
        {
          name: 'Email Service',
          status: Math.random() > 0.15 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 200 + 100),
          uptime: 99.5,
          lastCheck: new Date(),
          endpoint: 'smtp://mail.zetra.com',
          dependencies: ['API Gateway']
        },
        {
          name: 'File Storage',
          status: Math.random() > 0.12 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 150 + 75),
          uptime: 99.7,
          lastCheck: new Date(),
          endpoint: 's3://zetra-storage',
          dependencies: []
        },
        {
          name: 'Search Engine',
          status: Math.random() > 0.2 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 300 + 100),
          uptime: 99.2,
          lastCheck: new Date(),
          endpoint: 'elasticsearch://localhost:9200',
          dependencies: ['Database']
        },
        {
          name: 'WebSocket Server',
          status: Math.random() > 0.1 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 50 + 25),
          uptime: 99.6,
          lastCheck: new Date(),
          endpoint: 'ws://localhost:3001',
          dependencies: ['API Gateway', 'Redis Cache']
        },
        {
          name: 'Background Jobs',
          status: Math.random() > 0.15 ? 'healthy' : 'degraded',
          responseTime: Math.round(Math.random() * 100 + 50),
          uptime: 99.3,
          lastCheck: new Date(),
          endpoint: 'queue://localhost:6379',
          dependencies: ['Redis Cache', 'Database']
        }
      ]
      
      setServices(mockServices)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServiceStatus()
    
    const interval = setInterval(fetchServiceStatus, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval])

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'maintenance':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'degraded':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'maintenance':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getOverallStatus = () => {
    const downServices = services.filter(s => s.status === 'down').length
    const degradedServices = services.filter(s => s.status === 'degraded').length
    
    if (downServices > 0) return 'critical'
    if (degradedServices > 0) return 'warning'
    return 'healthy'
  }

  const getOverallStatusText = () => {
    const overallStatus = getOverallStatus()
    const totalServices = services.length
    const healthyServices = services.filter(s => s.status === 'healthy').length
    
    switch (overallStatus) {
      case 'critical':
        return `${services.filter(s => s.status === 'down').length} service(s) down`
      case 'warning':
        return `${services.filter(s => s.status === 'degraded').length} service(s) degraded`
      case 'healthy':
        return `All ${totalServices} services operational`
      default:
        return 'Status unknown'
    }
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Failed to load service status</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Status Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium',
                getOverallStatus() === 'healthy' ? 'text-green-600 bg-green-50 border-green-200' :
                getOverallStatus() === 'warning' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                'text-red-600 bg-red-50 border-red-200'
              )}>
                {getOverallStatus() === 'healthy' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : getOverallStatus() === 'warning' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{getOverallStatusText()}</span>
              </div>
              
              <div className="text-sm text-gray-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchServiceStatus}
              disabled={loading}
              className={cn(loading && 'animate-spin')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => (
          <Card
            key={service.name}
            className={cn(
              'cursor-pointer transition-all duration-200 hover:shadow-md',
              service.status === 'down' && 'border-red-200',
              service.status === 'degraded' && 'border-yellow-200'
            )}
            onClick={() => onServiceClick?.(service)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full',
                    getStatusColor(service.status)
                  )}>
                    {getStatusIcon(service.status)}
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm">{service.name}</h4>
                </div>
                
                <Badge 
                  variant={
                    service.status === 'healthy' ? 'success' :
                    service.status === 'degraded' ? 'warning' :
                    service.status === 'down' ? 'destructive' : 'secondary'
                  }
                  size="sm"
                >
                  {service.status}
                </Badge>
              </div>
              
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Response Time:</span>
                  <span className={cn(
                    'font-medium',
                    service.responseTime > 200 ? 'text-red-600' :
                    service.responseTime > 100 ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {service.responseTime}ms
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Uptime:</span>
                  <span className={cn(
                    'font-medium',
                    service.uptime >= 99.9 ? 'text-green-600' :
                    service.uptime >= 99.5 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {service.uptime}%
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Last Check:</span>
                  <span>{service.lastCheck.toLocaleTimeString()}</span>
                </div>
              </div>
              
              {service.dependencies.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-gray-500 mb-1">Dependencies:</div>
                  <div className="flex flex-wrap gap-1">
                    {service.dependencies.map((dep) => (
                      <Badge key={dep} variant="outline" size="sm" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default SystemStatusOverview