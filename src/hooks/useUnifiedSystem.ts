import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { unifiedClient, UnifiedSystemStatus } from '@/lib/frontend/unified-client'

export interface UseUnifiedSystemOptions {
  enableRealTimeUpdates?: boolean
  updateInterval?: number
  autoInitialize?: boolean
}

export const useUnifiedSystem = (options: UseUnifiedSystemOptions = {}) => {
  const {
    enableRealTimeUpdates = true,
    updateInterval = 30000,
    autoInitialize = true
  } = options

  const { user } = useAuth()
  const [systemStatus, setSystemStatus] = useState<UnifiedSystemStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize system for current user
  const initialize = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      await unifiedClient.initializeForUser({
        id: user.id,
        role: user.role as any,
        token: user.token || 'demo-token'
      })

      const status = await unifiedClient.getSystemStatus()
      setSystemStatus(status)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize unified system')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Refresh system status
  const refreshStatus = useCallback(async () => {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const status = await unifiedClient.getSystemStatus()
      setSystemStatus(status)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh system status')
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Auto-initialize when user changes
  useEffect(() => {
    if (autoInitialize && user && !systemStatus) {
      initialize()
    }
  }, [user, autoInitialize, systemStatus, initialize])

  // Set up real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !user) return

    const unsubscribe = unifiedClient.subscribeToSystemStatus((status) => {
      setSystemStatus(status)
      setLastUpdated(new Date())
      setError(null)
    })

    unsubscribeRef.current = unsubscribe

    return () => {
      unsubscribe()
      unsubscribeRef.current = null
    }
  }, [enableRealTimeUpdates, user])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  return {
    systemStatus,
    loading,
    error,
    lastUpdated,
    initialize,
    refreshStatus,
    
    // System health checks
    isSystemHealthy: systemStatus?.status === 'operational',
    serviceCount: systemStatus?.serviceOrchestrator.totalServices || 0,
    healthyServiceCount: systemStatus?.monitoring.healthyServices || 0,
    activeAlerts: systemStatus?.monitoring.activeAlerts || 0,
    
    // Service status breakdown
    aiServicesCount: systemStatus?.serviceOrchestrator.aiServices || 0,
    analyticsServicesCount: systemStatus?.serviceOrchestrator.analyticsServices || 0,
    hybridServicesCount: systemStatus?.serviceOrchestrator.hybridServices || 0,
    
    // Performance metrics
    avgResponseTime: systemStatus?.monitoring.avgResponseTime || 0,
    errorRate: systemStatus?.monitoring.errorRate || 0,
    totalRequests: systemStatus?.monitoring.totalRequests || 0,
    
    // Implementation status
    implementationStatus: systemStatus?.implementation || {}
  }
}

// Hook for AI services
export const useAIServices = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processDocument = useCallback(async (data: {
    content: string
    type: string
    metadata?: Record<string, unknown>
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.processDocument(data)
      if (!response.success) {
        throw new Error(response.error || 'Document processing failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Document processing failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const generateTaskIntelligence = useCallback(async (data: {
    context: string
    requirements: string[]
    priority?: string
    metadata?: Record<string, unknown>
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.generateTaskIntelligence(data)
      if (!response.success) {
        throw new Error(response.error || 'Task intelligence generation failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Task intelligence generation failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const chatWithAI = useCallback(async (data: {
    message: string
    context?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.chatWithAI(data)
      if (!response.success) {
        throw new Error(response.error || 'AI chat failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI chat failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    processDocument,
    generateTaskIntelligence,
    chatWithAI,
    loading,
    error
  }
}

// Hook for analytics services
export const useAnalyticsServices = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPerformanceAnalytics = useCallback(async (filters?: {
    dateRange?: { start: string; end: string }
    team?: string
    metric?: string
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.getPerformanceAnalytics(filters)
      if (!response.success) {
        throw new Error(response.error || 'Performance analytics failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Performance analytics failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const getClientAnalytics = useCallback(async (filters?: {
    clientId?: string
    dateRange?: { start: string; end: string }
    analysisType?: string
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.getClientAnalytics(filters)
      if (!response.success) {
        throw new Error(response.error || 'Client analytics failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Client analytics failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const getFinancialAnalytics = useCallback(async (filters?: {
    dateRange?: { start: string; end: string }
    analysisType?: string
    clientId?: string
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.getFinancialAnalytics(filters)
      if (!response.success) {
        throw new Error(response.error || 'Financial analytics failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Financial analytics failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  const getComplianceAnalytics = useCallback(async (filters?: {
    dateRange?: { start: string; end: string }
    complianceType?: string
    riskLevel?: string
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.getComplianceAnalytics(filters)
      if (!response.success) {
        throw new Error(response.error || 'Compliance analytics failed')
      }
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Compliance analytics failed'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    getPerformanceAnalytics,
    getClientAnalytics,
    getFinancialAnalytics,
    getComplianceAnalytics,
    loading,
    error
  }
}

// Hook for monitoring and metrics
export const useSystemMonitoring = () => {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Record<string, unknown[]>>({})
  const [alerts, setAlerts] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subscribeToMetric = useCallback((metricName: string) => {
    if (!user) return () => {}

    return unifiedClient.subscribeToMetrics(metricName, (metricData) => {
      setMetrics(prev => ({
        ...prev,
        [metricName]: metricData
      }))
    })
  }, [user])

  const getAlerts = useCallback(async (resolved = false) => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.getAlerts(resolved)
      setAlerts(response.alerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts')
    } finally {
      setLoading(false)
    }
  }, [user])

  const getLogs = useCallback(async (filters?: {
    service?: string
    level?: 'info' | 'warn' | 'error' | 'debug'
    timeRange?: { start: string; end: string }
    limit?: number
  }) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      const response = await unifiedClient.getLogs(filters)
      return response.logs
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    metrics,
    alerts,
    loading,
    error,
    subscribeToMetric,
    getAlerts,
    getLogs
  }
}