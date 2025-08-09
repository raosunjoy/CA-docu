import { useState, useEffect, useCallback } from 'react'

interface MLInsightsOptions {
  clientId?: string
  analysisType?: 'all' | 'compliance' | 'revenue' | 'risk'
  period?: '3m' | '6m' | '12m'
  autoRefresh?: boolean
  refreshInterval?: number
}

interface MLInsightsData {
  insights: any
  performance: {
    dataPoints: number
    confidenceScore: number
    recommendations: string[]
  }
  metadata: {
    organizationId: string
    userId: string
    analysisType: string
    period: string
    generatedAt: string
  }
}

interface UseMLInsightsReturn {
  data: MLInsightsData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

export const useMLInsights = (options: MLInsightsOptions = {}): UseMLInsightsReturn => {
  const {
    clientId,
    analysisType = 'all',
    period = '6m',
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options

  const [data, setData] = useState<MLInsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        analysisType,
        period,
        includeRecommendations: 'true'
      })

      if (clientId) {
        params.append('clientId', clientId)
      }

      const response = await fetch(`/api/analytics/ml-insights?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch insights')
      }

      setData(result.data)
      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('ML Insights fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [clientId, analysisType, period])

  const refresh = useCallback(async () => {
    await fetchInsights()
  }, [fetchInsights])

  // Initial fetch
  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return

    const interval = setInterval(() => {
      fetchInsights()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchInsights])

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated
  }
}

// Specialized hooks for specific analysis types
export const useCompliancePredictions = (clientId?: string) => {
  return useMLInsights({
    clientId,
    analysisType: 'compliance',
    autoRefresh: true,
    refreshInterval: 600000 // 10 minutes
  })
}

export const useRevenueForecast = (period: '3m' | '6m' | '12m' = '12m') => {
  return useMLInsights({
    analysisType: 'revenue',
    period,
    autoRefresh: true,
    refreshInterval: 900000 // 15 minutes
  })
}

export const useClientRiskAssessment = (clientId: string) => {
  return useMLInsights({
    clientId,
    analysisType: 'risk',
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  })
}

// Cache management utilities
class MLInsightsCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  static set(key: string, data: any, ttl: number = 300000) { // 5 minutes default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  static get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  static clear() {
    this.cache.clear()
  }
  
  static size() {
    return this.cache.size
  }
}

export { MLInsightsCache }