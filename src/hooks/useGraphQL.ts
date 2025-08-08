import { useState, useEffect, useCallback } from 'react'
import { graphqlClient, analyticsService, dashboardService } from '../lib/graphql/client'

// Generic GraphQL hook
export function useGraphQL<T = any>(
  query: string,
  variables?: Record<string, any>,
  options?: {
    skip?: boolean
    pollInterval?: number
    onError?: (error: Error) => void
    onCompleted?: (data: T) => void
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const executeQuery = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.query<T>(query, variables)
      setData(result)
      options?.onCompleted?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('GraphQL query failed')
      setError(error)
      options?.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, [query, variables, options])

  useEffect(() => {
    executeQuery()
  }, [executeQuery])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(executeQuery, options.pollInterval)
    return () => clearInterval(interval)
  }, [executeQuery, options?.pollInterval])

  const refetch = useCallback(() => {
    return executeQuery()
  }, [executeQuery])

  return {
    data,
    loading,
    error,
    refetch
  }
}

// Analytics-specific hooks
export function useAnalytics(params: {
  organizationId: string
  userId?: string
  role?: string
  metric: string
  period: string
  startDate?: Date
  endDate?: Date
  filters?: any
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getAnalytics(params)
      setData(result.analytics)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch analytics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchAnalytics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchAnalytics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics
  }
}

export function useKPIs(params: {
  organizationId: string
  userId?: string
  role?: string
  kpiTypes?: string[]
  dateRange?: { startDate: Date; endDate: Date }
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchKPIs = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getKPIs(params)
      setData(result.kpis || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch KPIs')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchKPIs()
  }, [fetchKPIs])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchKPIs, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchKPIs, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchKPIs
  }
}

export function useMetrics(params: {
  organizationId: string
  userId?: string
  metricTypes: string[]
  dimensions?: string[]
  filters?: any
  groupBy?: string[]
  orderBy?: { field: string; direction: string }
  limit?: number
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetrics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getMetrics(params)
      setData(result.metrics || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch metrics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchMetrics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchMetrics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchMetrics
  }
}

export function usePerformanceAnalytics(params: {
  organizationId: string
  userId?: string
  role?: string
  period: string
  startDate?: Date
  endDate?: Date
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchPerformanceAnalytics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getPerformanceAnalytics(params)
      setData(result.performanceAnalytics)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch performance analytics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchPerformanceAnalytics()
  }, [fetchPerformanceAnalytics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchPerformanceAnalytics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchPerformanceAnalytics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchPerformanceAnalytics
  }
}

export function useProductivityMetrics(params: {
  organizationId: string
  userId?: string
  startDate?: Date
  endDate?: Date
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchProductivityMetrics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getProductivityMetrics(params)
      setData(result.productivityMetrics || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch productivity metrics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchProductivityMetrics()
  }, [fetchProductivityMetrics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchProductivityMetrics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchProductivityMetrics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchProductivityMetrics
  }
}

export function useTimeTrackingAnalytics(params: {
  organizationId: string
  userId?: string
  startDate?: Date
  endDate?: Date
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchTimeTrackingAnalytics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getTimeTrackingAnalytics(params)
      setData(result.timeTrackingAnalytics)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch time tracking analytics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchTimeTrackingAnalytics()
  }, [fetchTimeTrackingAnalytics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchTimeTrackingAnalytics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchTimeTrackingAnalytics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchTimeTrackingAnalytics
  }
}

export function useComplianceMetrics(params: {
  organizationId: string
  role?: string
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchComplianceMetrics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getComplianceMetrics(params)
      setData(result.complianceMetrics)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch compliance metrics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchComplianceMetrics()
  }, [fetchComplianceMetrics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchComplianceMetrics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchComplianceMetrics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchComplianceMetrics
  }
}

export function useClientEngagementAnalytics(params: {
  organizationId: string
  clientId?: string
}, options?: { skip?: boolean; pollInterval?: number }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchClientEngagementAnalytics = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await analyticsService.getClientEngagementAnalytics(params)
      setData(result.clientEngagementAnalytics)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch client engagement analytics')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [params, options?.skip])

  useEffect(() => {
    fetchClientEngagementAnalytics()
  }, [fetchClientEngagementAnalytics])

  // Polling
  useEffect(() => {
    if (!options?.pollInterval) return

    const interval = setInterval(fetchClientEngagementAnalytics, options.pollInterval)
    return () => clearInterval(interval)
  }, [fetchClientEngagementAnalytics, options?.pollInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchClientEngagementAnalytics
  }
}

// Dashboard hooks
export function useDashboard(id: string, options?: { skip?: boolean }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await dashboardService.getDashboard(id)
      setData(result.dashboard)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dashboard')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [id, options?.skip])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    data,
    loading,
    error,
    refetch: fetchDashboard
  }
}

export function useDashboards(filter?: {
  role?: string
  isDefault?: boolean
  createdBy?: string
}, options?: { skip?: boolean }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(!options?.skip)
  const [error, setError] = useState<Error | null>(null)

  const fetchDashboards = useCallback(async () => {
    if (options?.skip) return

    try {
      setLoading(true)
      setError(null)
      const result = await dashboardService.getDashboards(filter)
      setData(result.dashboards || [])
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dashboards')
      setError(error)
    } finally {
      setLoading(false)
    }
  }, [filter, options?.skip])

  useEffect(() => {
    fetchDashboards()
  }, [fetchDashboards])

  return {
    data,
    loading,
    error,
    refetch: fetchDashboards
  }
}

// Mutation hooks
export function useGraphQLMutation<T = any>(mutation: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(async (variables?: Record<string, any>): Promise<T | null> => {
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.mutate<T>(mutation, variables)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('GraphQL mutation failed')
      setError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [mutation])

  return {
    mutate,
    loading,
    error
  }
}