// Dashboard API Client - Integrates with Claude's backend APIs
// Provides type-safe interfaces and consistent error handling

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}

interface AnalyticsParams {
  organizationId: string
  userId?: string
  metric: 'workload' | 'performance' | 'compliance' | 'tasks' | 'client-engagement'
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
}

interface KPIParams {
  organizationId: string
  userId?: string
  kpis?: string[]
  role?: string
}

interface MetricsParams {
  organizationId: string
  userId?: string
  startDate?: string
  endDate?: string
}

class DashboardApiClient {
  private baseUrl: string
  private defaultHeaders: HeadersInit

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { ...this.defaultHeaders, ...options.headers },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: data.error?.message || `Request failed with status ${response.status}`
          }
        }
      }

      return data
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed'
        }
      }
    }
  }

  // Analytics API methods
  async getAnalytics(params: AnalyticsParams) {
    const searchParams = new URLSearchParams({
      organizationId: params.organizationId,
      metric: params.metric,
      ...(params.userId && { userId: params.userId }),
      ...(params.period && { period: params.period }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
    })

    return this.request(`/dashboard/analytics?${searchParams}`)
  }

  // KPI API methods
  async getKPIs(params: KPIParams) {
    const searchParams = new URLSearchParams({
      organizationId: params.organizationId,
      ...(params.userId && { userId: params.userId }),
      ...(params.role && { role: params.role }),
      ...(params.kpis && { kpis: params.kpis.join(',') }),
    })

    return this.request(`/dashboard/kpis?${searchParams}`)
  }

  async calculateKPI(params: KPIParams & { kpiId: string; customConfig?: any }) {
    return this.request(`/dashboard/kpis`, {
      method: 'POST',
      body: JSON.stringify({
        organizationId: params.organizationId,
        kpiId: params.kpiId,
        customConfig: params.customConfig
      })
    })
  }

  // Metrics API methods
  async getMetrics(params: MetricsParams) {
    const searchParams = new URLSearchParams({
      organizationId: params.organizationId,
      ...(params.userId && { userId: params.userId }),
      ...(params.startDate && { startDate: params.startDate }),
      ...(params.endDate && { endDate: params.endDate }),
    })

    return this.request(`/dashboard/metrics?${searchParams}`)
  }

  async recalculateMetrics(params: MetricsParams & { filters?: any }) {
    return this.request(`/dashboard/metrics`, {
      method: 'POST',
      body: JSON.stringify({
        organizationId: params.organizationId,
        filters: params.filters,
        recalculate: true
      })
    })
  }

  // Export functionality
  async exportDashboardData(params: {
    organizationId: string
    userId?: string
    format: 'csv' | 'json' | 'excel'
    data: any
    dateRange: { startDate: string; endDate: string }
  }) {
    const response = await fetch(`${this.baseUrl}/dashboard/export`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`)
    }

    return response.blob()
  }

  // Real-time updates
  createWebSocketConnection(params: {
    organizationId: string
    userId: string
  }) {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/dashboard/realtime`
    const searchParams = new URLSearchParams(params)
    
    return new WebSocket(`${wsUrl}?${searchParams}`)
  }
}

// Singleton instance
export const dashboardApi = new DashboardApiClient()

// Type exports for components
export type { ApiResponse, AnalyticsParams, KPIParams, MetricsParams }

// Error handling utilities
export const handleApiError = (error: ApiResponse<any>['error']) => {
  if (!error) return 'Unknown error occurred'
  
  switch (error.code) {
    case 'UNAUTHORIZED':
      return 'Please log in to access this data'
    case 'FORBIDDEN':
      return 'You do not have permission to access this data'
    case 'NOT_FOUND':
      return 'The requested data was not found'
    case 'NETWORK_ERROR':
      return 'Network connection error. Please check your internet connection.'
    case 'INTERNAL_ERROR':
      return 'Server error. Please try again later.'
    default:
      return error.message || 'An error occurred while fetching data'
  }
}

// Data transformation utilities
export const transformAnalyticsData = (apiData: any, metric: string) => {
  switch (metric) {
    case 'workload':
      return {
        totalWorkload: apiData.totalTasks || 0,
        averageUtilization: apiData.avgUtilization || 0,
        peakHours: apiData.hourlyBreakdown || [],
        workloadByDepartment: apiData.departmentBreakdown || [],
        workloadDistribution: apiData.typeDistribution || [],
        weeklyTrend: apiData.weeklyTrend || [],
        overloadedResources: apiData.overloadedResources || []
      }
    case 'performance':
      return {
        overallProductivity: apiData.avgProductivity || 0,
        utilizationRate: apiData.avgUtilization || 0,
        teamMembers: apiData.teamBreakdown || [],
        productivityTrend: apiData.trend || [],
        departmentPerformance: apiData.departmentStats || []
      }
    case 'compliance':
      return {
        overallScore: apiData.complianceScore || 0,
        monthlyTrend: apiData.trend || [],
        complianceByType: apiData.typeBreakdown || [],
        upcomingDeadlines: apiData.upcomingDeadlines || [],
        riskLevel: apiData.riskLevel || 'LOW'
      }
    case 'tasks':
      return {
        tasksByStatus: apiData.statusBreakdown || [],
        tasksByPriority: apiData.priorityBreakdown || [],
        completionRate: apiData.completionRate || 0,
        totalTasks: apiData.totalTasks || 0,
        overdueTasks: apiData.overdueTasks || 0,
        upcomingDeadlines: apiData.upcomingDeadlines || 0
      }
    default:
      return apiData
  }
}