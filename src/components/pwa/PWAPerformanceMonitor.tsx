/**
 * PWA Performance Monitor Component
 * Displays performance metrics and cache management
 */

'use client'

import React, { useEffect, useState } from 'react'
import { usePWAPerformance, usePWAOffline } from '@/hooks/usePWA'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { 
  Activity, 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  TrendingUp,
  Clock,
  HardDrive
} from 'lucide-react'

interface PWAPerformanceMonitorProps {
  className?: string
  showDetails?: boolean
}

export function PWAPerformanceMonitor({
  className = '',
  showDetails = true
}: PWAPerformanceMonitorProps) {
  const { metrics, loading, getMetrics, clearCaches } = usePWAPerformance()
  const { isOnline, syncStatus } = usePWAOffline()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    getMetrics().then(() => setLastUpdated(new Date()))
  }, [getMetrics])

  const handleRefresh = async () => {
    await getMetrics()
    setLastUpdated(new Date())
  }

  const handleClearCaches = async () => {
    try {
      await clearCaches()
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to clear caches:', error)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Connection Status</h3>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-700">Offline</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                isOnline ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <p className="text-xs text-gray-600">Network</p>
            </div>
            
            <div className="text-center">
              <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                syncStatus === 'idle' ? 'bg-green-500' :
                syncStatus === 'syncing' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <p className="text-xs text-gray-600">Sync</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      {showDetails && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Performance Metrics</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  loading={loading}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearCaches}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Cache
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Cache Hits"
                    value={metrics.cacheHits}
                    color="green"
                  />
                  <MetricCard
                    icon={<Activity className="h-4 w-4" />}
                    label="Cache Misses"
                    value={metrics.cacheMisses}
                    color="orange"
                  />
                  <MetricCard
                    icon={<Wifi className="h-4 w-4" />}
                    label="Network Requests"
                    value={metrics.networkRequests}
                    color="blue"
                  />
                  <MetricCard
                    icon={<WifiOff className="h-4 w-4" />}
                    label="Offline Requests"
                    value={metrics.offlineRequests}
                    color="purple"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <CacheHitRatio metrics={metrics} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No metrics available
              </p>
            )}

            {lastUpdated && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-4">
                <Clock className="h-3 w-3" />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cache Storage Info */}
      <CacheStorageInfo />
    </div>
  )
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: number
  color: 'green' | 'orange' | 'blue' | 'purple'
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100'
  }

  return (
    <div className="text-center">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-lg font-semibold text-gray-900">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  )
}

/**
 * Cache Hit Ratio Component
 */
function CacheHitRatio({ metrics }: { metrics: any }) {
  const totalRequests = metrics.cacheHits + metrics.cacheMisses
  const hitRatio = totalRequests > 0 ? (metrics.cacheHits / totalRequests) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Cache Hit Ratio</span>
        <span className="text-sm text-gray-600">{hitRatio.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            hitRatio >= 80 ? 'bg-green-500' :
            hitRatio >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${hitRatio}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {hitRatio >= 80 ? 'Excellent' :
         hitRatio >= 60 ? 'Good' : 'Needs Improvement'}
      </p>
    </div>
  )
}

/**
 * Cache Storage Info Component
 */
function CacheStorageInfo() {
  const [storageInfo, setStorageInfo] = useState<{
    usage: number
    quota: number
  } | null>(null)

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        setStorageInfo({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        })
      })
    }
  }, [])

  if (!storageInfo) {
    return null
  }

  const usagePercent = storageInfo.quota > 0 
    ? (storageInfo.usage / storageInfo.quota) * 100 
    : 0

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Storage Usage</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Used</span>
            <span className="font-medium">{formatBytes(storageInfo.usage)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Available</span>
            <span className="font-medium">{formatBytes(storageInfo.quota)}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                usagePercent >= 90 ? 'bg-red-500' :
                usagePercent >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          
          <p className="text-xs text-gray-500">
            {usagePercent.toFixed(1)}% used
          </p>
        </div>
      </div>
    </Card>
  )
}

/**
 * PWA Performance Badge - Simple performance indicator
 */
export function PWAPerformanceBadge({ className = '' }: { className?: string }) {
  const { isOnline, syncStatus } = usePWAOffline()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        isOnline ? 'bg-green-500' : 'bg-red-500'
      }`} />
      
      {syncStatus === 'syncing' && (
        <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
      )}
      
      <span className="text-xs text-gray-600">
        {isOnline ? 'Online' : 'Offline'}
        {syncStatus === 'syncing' && ' • Syncing'}
      </span>
    </div>
  )
}