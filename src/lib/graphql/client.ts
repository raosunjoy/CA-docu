import { gql } from 'graphql-tag'

// GraphQL client configuration
export class GraphQLClient {
  private endpoint: string
  private headers: Record<string, string>

  constructor(endpoint: string = '/api/graphql', headers: Record<string, string> = {}) {
    this.endpoint = endpoint
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        query,
        variables
      })
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`)
    }

    return result.data
  }

  async mutate<T = any>(mutation: string, variables?: Record<string, any>): Promise<T> {
    return this.query<T>(mutation, variables)
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`
  }

  // Remove authentication token
  clearAuthToken() {
    delete this.headers['Authorization']
  }
}

// Create a default client instance
export const graphqlClient = new GraphQLClient()

// Common GraphQL queries and mutations
export const ANALYTICS_QUERIES = {
  GET_ANALYTICS: gql`
    query GetAnalytics($input: AnalyticsInput!) {
      analytics(input: $input) {
        period
        startDate
        endDate
        data {
          date
          value
          label
          metadata
        }
        trend
        trendPercentage
        comparison {
          period
          value
          change
        }
      }
    }
  `,

  GET_KPIS: gql`
    query GetKPIs($input: KPIInput!) {
      kpis(input: $input) {
        id
        name
        value
        target
        unit
        format
        trend
        trendPercentage
        status
        description
        lastUpdated
      }
    }
  `,

  GET_METRICS: gql`
    query GetMetrics($input: MetricsInput!) {
      metrics(input: $input) {
        id
        name
        value
        dimensions
        timestamp
        metadata
      }
    }
  `,

  GET_PERFORMANCE_ANALYTICS: gql`
    query GetPerformanceAnalytics($input: PerformanceAnalyticsInput!) {
      performanceAnalytics(input: $input) {
        period
        startDate
        endDate
        data {
          date
          value
          label
          metadata
        }
        trend
        trendPercentage
        comparison {
          period
          value
          change
        }
        summary {
          totalTasks
          completedTasks
          averageCompletionTime
          productivityScore
        }
      }
    }
  `,

  GET_PRODUCTIVITY_METRICS: gql`
    query GetProductivityMetrics($input: ProductivityMetricsInput!) {
      productivityMetrics(input: $input) {
        userId
        date
        totalHours
        billableHours
        tasksCompleted
        focusScore
        efficiencyScore
        utilizationRate
      }
    }
  `,

  GET_TIME_TRACKING_ANALYTICS: gql`
    query GetTimeTrackingAnalytics($input: TimeTrackingAnalyticsInput!) {
      timeTrackingAnalytics(input: $input) {
        totalHours
        billableHours
        nonBillableHours
        utilizationRate
        averageHoursPerDay
        productivityScore
        timeDistribution {
          category
          hours
          percentage
        }
        dailyBreakdown {
          date
          totalHours
          billableHours
          productivity
        }
      }
    }
  `,

  GET_COMPLIANCE_METRICS: gql`
    query GetComplianceMetrics($input: ComplianceMetricsInput!) {
      complianceMetrics(input: $input) {
        complianceScore
        riskLevel
        pendingCompliance
        complianceDeadlines
        riskFactors {
          category
          score
          level
          description
        }
      }
    }
  `,

  GET_CLIENT_ENGAGEMENT_ANALYTICS: gql`
    query GetClientEngagementAnalytics($input: ClientEngagementAnalyticsInput!) {
      clientEngagementAnalytics(input: $input) {
        totalClients
        activeEngagements
        completedEngagements
        averageEngagementDuration
        clientSatisfactionScore
        engagementTypes {
          type
          count
          averageDuration
          completionRate
        }
        monthlyEngagements {
          month
          newEngagements
          completedEngagements
          revenue
        }
      }
    }
  `,

  GET_DASHBOARD: gql`
    query GetDashboard($id: ID!) {
      dashboard(id: $id) {
        id
        name
        description
        role
        isDefault
        widgets {
          id
          type
          title
          position {
            x
            y
            w
            h
          }
          config
          refreshInterval
          isVisible
        }
        createdBy
        createdAt
        updatedAt
      }
    }
  `,

  GET_DASHBOARDS: gql`
    query GetDashboards($filter: DashboardFilter) {
      dashboards(filter: $filter) {
        id
        name
        description
        role
        isDefault
        widgets {
          id
          type
          title
          position {
            x
            y
            w
            h
          }
          config
          refreshInterval
          isVisible
        }
        createdBy
        createdAt
        updatedAt
      }
    }
  `
}

export const ANALYTICS_MUTATIONS = {
  CREATE_DASHBOARD: gql`
    mutation CreateDashboard($input: CreateDashboardInput!) {
      createDashboard(input: $input) {
        id
        name
        description
        role
        isDefault
        widgets {
          id
          type
          title
          position {
            x
            y
            w
            h
          }
          config
          refreshInterval
          isVisible
        }
        createdBy
        createdAt
        updatedAt
      }
    }
  `,

  UPDATE_DASHBOARD: gql`
    mutation UpdateDashboard($id: ID!, $input: UpdateDashboardInput!) {
      updateDashboard(id: $id, input: $input) {
        id
        name
        description
        role
        isDefault
        widgets {
          id
          type
          title
          position {
            x
            y
            w
            h
          }
          config
          refreshInterval
          isVisible
        }
        createdBy
        createdAt
        updatedAt
      }
    }
  `,

  DELETE_DASHBOARD: gql`
    mutation DeleteDashboard($id: ID!) {
      deleteDashboard(id: $id)
    }
  `,

  ADD_WIDGET: gql`
    mutation AddWidget($dashboardId: ID!, $input: AddWidgetInput!) {
      addWidget(dashboardId: $dashboardId, input: $input) {
        id
        type
        title
        position {
          x
          y
          w
          h
        }
        config
        refreshInterval
        isVisible
      }
    }
  `,

  UPDATE_WIDGET: gql`
    mutation UpdateWidget($id: ID!, $input: UpdateWidgetInput!) {
      updateWidget(id: $id, input: $input) {
        id
        type
        title
        position {
          x
          y
          w
          h
        }
        config
        refreshInterval
        isVisible
      }
    }
  `,

  REMOVE_WIDGET: gql`
    mutation RemoveWidget($id: ID!) {
      removeWidget(id: $id)
    }
  `
}

// Utility functions for common operations
export const analyticsService = {
  // Get analytics data
  async getAnalytics(params: {
    organizationId: string
    userId?: string
    role?: string
    metric: string
    period: string
    startDate?: Date
    endDate?: Date
    filters?: any
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_ANALYTICS, {
      input: params
    })
  },

  // Get KPIs
  async getKPIs(params: {
    organizationId: string
    userId?: string
    role?: string
    kpiTypes?: string[]
    dateRange?: { startDate: Date; endDate: Date }
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_KPIS, {
      input: params
    })
  },

  // Get metrics
  async getMetrics(params: {
    organizationId: string
    userId?: string
    metricTypes: string[]
    dimensions?: string[]
    filters?: any
    groupBy?: string[]
    orderBy?: { field: string; direction: string }
    limit?: number
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_METRICS, {
      input: params
    })
  },

  // Get performance analytics
  async getPerformanceAnalytics(params: {
    organizationId: string
    userId?: string
    role?: string
    period: string
    startDate?: Date
    endDate?: Date
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_PERFORMANCE_ANALYTICS, {
      input: params
    })
  },

  // Get productivity metrics
  async getProductivityMetrics(params: {
    organizationId: string
    userId?: string
    startDate?: Date
    endDate?: Date
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_PRODUCTIVITY_METRICS, {
      input: params
    })
  },

  // Get time tracking analytics
  async getTimeTrackingAnalytics(params: {
    organizationId: string
    userId?: string
    startDate?: Date
    endDate?: Date
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_TIME_TRACKING_ANALYTICS, {
      input: params
    })
  },

  // Get compliance metrics
  async getComplianceMetrics(params: {
    organizationId: string
    role?: string
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_COMPLIANCE_METRICS, {
      input: params
    })
  },

  // Get client engagement analytics
  async getClientEngagementAnalytics(params: {
    organizationId: string
    clientId?: string
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_CLIENT_ENGAGEMENT_ANALYTICS, {
      input: params
    })
  }
}

// Dashboard service
export const dashboardService = {
  // Get dashboard by ID
  async getDashboard(id: string) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_DASHBOARD, { id })
  },

  // Get dashboards with filter
  async getDashboards(filter?: {
    role?: string
    isDefault?: boolean
    createdBy?: string
  }) {
    return graphqlClient.query(ANALYTICS_QUERIES.GET_DASHBOARDS, { filter })
  },

  // Create dashboard
  async createDashboard(input: {
    name: string
    description?: string
    role?: string
    isDefault?: boolean
    widgets: Array<{
      type: string
      title: string
      position: { x: number; y: number; w: number; h: number }
      config?: any
      refreshInterval?: number
    }>
  }) {
    return graphqlClient.mutate(ANALYTICS_MUTATIONS.CREATE_DASHBOARD, { input })
  },

  // Update dashboard
  async updateDashboard(id: string, input: {
    name?: string
    description?: string
    isDefault?: boolean
  }) {
    return graphqlClient.mutate(ANALYTICS_MUTATIONS.UPDATE_DASHBOARD, { id, input })
  },

  // Delete dashboard
  async deleteDashboard(id: string) {
    return graphqlClient.mutate(ANALYTICS_MUTATIONS.DELETE_DASHBOARD, { id })
  },

  // Add widget to dashboard
  async addWidget(dashboardId: string, input: {
    type: string
    title: string
    position: { x: number; y: number; w: number; h: number }
    config?: any
    refreshInterval?: number
  }) {
    return graphqlClient.mutate(ANALYTICS_MUTATIONS.ADD_WIDGET, { dashboardId, input })
  },

  // Update widget
  async updateWidget(id: string, input: {
    title?: string
    position?: { x: number; y: number; w: number; h: number }
    config?: any
    refreshInterval?: number
    isVisible?: boolean
  }) {
    return graphqlClient.mutate(ANALYTICS_MUTATIONS.UPDATE_WIDGET, { id, input })
  },

  // Remove widget
  async removeWidget(id: string) {
    return graphqlClient.mutate(ANALYTICS_MUTATIONS.REMOVE_WIDGET, { id })
  }
}