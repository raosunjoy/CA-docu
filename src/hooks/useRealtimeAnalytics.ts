import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'

interface AnalyticsData {
  workload: any[]
  performance: any[]
  compliance: any[]
  tasks: any[]
  timestamp: string
}

interface UseRealtimeAnalyticsProps {
  organizationId: string
  userId: string
  dateRange: {
    startDate: string
    endDate: string
  }
  refreshInterval?: number
}

export const useRealtimeAnalytics = ({
  organizationId,
  userId,
  dateRange,
  refreshInterval = 30000 // 30 seconds default
}: UseRealtimeAnalyticsProps) => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    sendMessage, 
    lastMessage 
  } = useWebSocket(`/api/dashboard/realtime?organizationId=${organizationId}&userId=${userId}`)

  // Fetch initial analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Parallel fetch all analytics endpoints
      const [workloadRes, performanceRes, complianceRes, tasksRes] = await Promise.all([
        fetch(`/api/dashboard/analytics?organizationId=${organizationId}&userId=${userId}&metric=workload&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        fetch(`/api/dashboard/analytics?organizationId=${organizationId}&userId=${userId}&metric=performance&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        fetch(`/api/dashboard/analytics?organizationId=${organizationId}&userId=${userId}&metric=compliance&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        fetch(`/api/dashboard/analytics?organizationId=${organizationId}&userId=${userId}&metric=tasks&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      ])

      // Check for API errors
      if (!workloadRes.ok || !performanceRes.ok || !complianceRes.ok || !tasksRes.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const [workloadData, performanceData, complianceData, tasksData] = await Promise.all([
        workloadRes.json(),
        performanceRes.json(),
        complianceRes.json(),
        tasksRes.json()
      ])

      // Combine all analytics data
      const combinedData: AnalyticsData = {
        workload: workloadData.success ? workloadData.data : [],
        performance: performanceData.success ? performanceData.data : [],
        compliance: complianceData.success ? complianceData.data : [],
        tasks: tasksData.success ? tasksData.data : [],
        timestamp: new Date().toISOString()
      }

      setData(combinedData)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data')
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [organizationId, userId, dateRange.startDate, dateRange.endDate])

  // Handle real-time WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage)
        
        if (update.type === 'analytics_update') {
          setData(prevData => {
            if (!prevData) return null
            
            return {
              ...prevData,
              [update.metric]: update.data,
              timestamp: update.timestamp
            }
          })
          setLastUpdated(new Date())
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err)
      }
    }
  }, [lastMessage])

  // Subscribe to real-time updates when connected
  useEffect(() => {
    if (isConnected) {
      sendMessage(JSON.stringify({
        type: 'subscribe_analytics',
        organizationId,
        userId,
        dateRange
      }))
    }
  }, [isConnected, organizationId, userId, dateRange, sendMessage])

  // Periodic refresh fallback
  useEffect(() => {
    fetchAnalyticsData()
    
    const interval = setInterval(fetchAnalyticsData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchAnalyticsData, refreshInterval])

  // Refresh on date range change
  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange.startDate, dateRange.endDate])

  const refresh = useCallback(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  const exportData = useCallback(async (format: 'csv' | 'json' | 'excel' = 'json') => {
    if (!data) return

    try {
      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          format,
          organizationId,
          userId,
          dateRange
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${format}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      throw err
    }
  }, [data, organizationId, userId, dateRange])

  return {
    data,
    loading,
    error,
    lastUpdated,
    isConnected,
    refresh,
    exportData
  }
}