import { AnalyticsEngine } from '../analytics-engine'
import { prisma } from '../prisma'
import type { 
  UserRole, 
  DashboardWidgetType,
  AnalyticsData,
  KPIData,
  ProductivityMetricData
} from '../../types'

// Custom scalar resolvers
const dateScalar = {
  serialize: (date: Date) => date.toISOString(),
  parseValue: (value: string) => new Date(value),
  parseLiteral: (ast: any) => new Date(ast.value)
}

const jsonScalar = {
  serialize: (value: any) => value,
  parseValue: (value: any) => value,
  parseLiteral: (ast: any) => JSON.parse(ast.value)
}

export const resolvers = {
  // Scalar resolvers
  Date: dateScalar,
  JSON: jsonScalar,

  Query: {
    // Analytics resolver
    analytics: async (_: any, { input }: { input: AnalyticsInput }) => {
      const { organizationId, userId, role, metric, period, startDate, endDate } = input

      switch (metric) {
        case 'performance':
          return await AnalyticsEngine.getPerformanceAnalytics(
            organizationId,
            userId,
            role as UserRole,
            period as 'day' | 'week' | 'month' | 'quarter' | 'year',
            startDate,
            endDate
          )

        case 'productivity':
          const productivityMetrics = await AnalyticsEngine.calculateProductivityMetrics(
            organizationId,
            userId,
            startDate,
            endDate
          )
          return {
            period,
            startDate: startDate || new Date(),
            endDate: endDate || new Date(),
            data: productivityMetrics.map(metric => ({
              date: metric.date.toISOString().split('T')[0],
              value: metric.efficiencyScore || 0,
              label: 'Efficiency Score',
              metadata: {
                totalHours: metric.totalHours,
                billableHours: metric.billableHours,
                tasksCompleted: metric.tasksCompleted
              }
            })),
            trend: 'STABLE',
            trendPercentage: 0
          }

        case 'time-tracking':
          const timeAnalytics = await AnalyticsEngine.getTimeTrackingAnalytics(
            organizationId,
            userId,
            startDate,
            endDate
          )
          return {
            period,
            startDate: startDate || new Date(),
            endDate: endDate || new Date(),
            data: timeAnalytics.dailyBreakdown.map(day => ({
              date: day.date,
              value: day.totalHours,
              label: 'Hours Logged',
              metadata: {
                billableHours: day.billableHours,
                productivity: day.productivity
              }
            })),
            trend: 'STABLE',
            trendPercentage: 0
          }

        case 'compliance':
          const complianceMetrics = await AnalyticsEngine.getComplianceMetrics(organizationId, role as UserRole)
          return {
            period,
            startDate: startDate || new Date(),
            endDate: endDate || new Date(),
            data: [{
              date: new Date().toISOString().split('T')[0],
              value: complianceMetrics.complianceScore,
              label: 'Compliance Score',
              metadata: {
                riskLevel: complianceMetrics.riskLevel,
                pendingCompliance: complianceMetrics.pendingCompliance,
                riskFactors: complianceMetrics.riskFactors
              }
            }],
            trend: 'STABLE',
            trendPercentage: 0
          }

        case 'client-engagement':
          const clientAnalytics = await AnalyticsEngine.getClientEngagementAnalytics(organizationId)
          return {
            period,
            startDate: startDate || new Date(),
            endDate: endDate || new Date(),
            data: clientAnalytics.monthlyEngagements.map(month => ({
              date: month.month,
              value: month.newEngagements,
              label: 'New Engagements',
              metadata: {
                completedEngagements: month.completedEngagements,
                revenue: month.revenue
              }
            })),
            trend: 'UP',
            trendPercentage: 8.5
          }

        default:
          throw new Error(`Unknown metric type: ${metric}`)
      }
    },

    // KPIs resolver
    kpis: async (_: any, { input }: { input: KPIInput }) => {
      const { organizationId, userId, role, kpiTypes } = input
      const kpiTypesToFetch = kpiTypes || [
        'task-completion-rate',
        'team-utilization',
        'client-satisfaction',
        'revenue-growth',
        'compliance-score'
      ]

      const kpis = await Promise.all(
        kpiTypesToFetch.map(async (kpiType) => {
          const kpi = await AnalyticsEngine.calculateKPI(
            organizationId,
            kpiType,
            userId,
            role as UserRole
          )
          return kpi
        })
      )

      return kpis.filter(kpi => kpi !== null)
    },

    // Metrics resolver
    metrics: async (_: any, { input }: { input: MetricsInput }) => {
      const { organizationId, userId, metricTypes, dimensions, filters, groupBy, orderBy, limit } = input

      // This is a simplified implementation
      // In a real scenario, you'd have a more sophisticated metrics engine
      const metrics = []

      for (const metricType of metricTypes) {
        switch (metricType) {
          case 'task-count':
            const taskCount = await prisma.task.count({
              where: {
                organizationId,
                ...(userId && { assignedTo: userId }),
                ...(filters && filters.status && { status: { in: filters.status } })
              }
            })
            metrics.push({
              id: `task-count-${Date.now()}`,
              name: 'Task Count',
              value: taskCount,
              dimensions: dimensions ? Object.fromEntries(dimensions.map(d => [d, 'all'])) : {},
              timestamp: new Date(),
              metadata: { type: 'count', category: 'tasks' }
            })
            break

          case 'completion-rate':
            const [totalTasks, completedTasks] = await Promise.all([
              prisma.task.count({ where: { organizationId, ...(userId && { assignedTo: userId }) } }),
              prisma.task.count({ where: { organizationId, ...(userId && { assignedTo: userId }), status: 'COMPLETED' } })
            ])
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
            metrics.push({
              id: `completion-rate-${Date.now()}`,
              name: 'Completion Rate',
              value: completionRate,
              dimensions: dimensions ? Object.fromEntries(dimensions.map(d => [d, 'all'])) : {},
              timestamp: new Date(),
              metadata: { type: 'percentage', category: 'performance' }
            })
            break

          default:
            // Handle other metric types
            break
        }
      }

      // Apply ordering and limiting
      let sortedMetrics = metrics
      if (orderBy) {
        sortedMetrics = metrics.sort((a, b) => {
          const aValue = orderBy.field === 'value' ? a.value : a.timestamp.getTime()
          const bValue = orderBy.field === 'value' ? b.value : b.timestamp.getTime()
          return orderBy.direction === 'ASC' ? aValue - bValue : bValue - aValue
        })
      }

      if (limit) {
        sortedMetrics = sortedMetrics.slice(0, limit)
      }

      return sortedMetrics
    },

    // Dashboard resolvers
    dashboard: async (_: any, { id }: { id: string }) => {
      const dashboard = await prisma.dashboardLayout.findUnique({
        where: { id },
        include: {
          widgets: true
        }
      })

      if (!dashboard) {
        throw new Error('Dashboard not found')
      }

      return {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        role: dashboard.role,
        isDefault: dashboard.isDefault,
        widgets: dashboard.widgets.map(widget => ({
          id: widget.id,
          type: widget.type as DashboardWidgetType,
          title: widget.title,
          position: widget.position,
          config: widget.config,
          refreshInterval: widget.refreshInterval,
          isVisible: widget.isVisible,
          minSize: widget.minSize,
          maxSize: widget.maxSize
        })),
        createdBy: dashboard.createdBy,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
      }
    },

    dashboards: async (_: any, { filter }: { filter?: DashboardFilter }) => {
      const where: any = {}
      
      if (filter?.role) {
        where.role = filter.role
      }
      if (filter?.isDefault !== undefined) {
        where.isDefault = filter.isDefault
      }
      if (filter?.createdBy) {
        where.createdBy = filter.createdBy
      }

      const dashboards = await prisma.dashboardLayout.findMany({
        where,
        include: {
          widgets: true
        }
      })

      return dashboards.map(dashboard => ({
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        role: dashboard.role,
        isDefault: dashboard.isDefault,
        widgets: dashboard.widgets.map(widget => ({
          id: widget.id,
          type: widget.type as DashboardWidgetType,
          title: widget.title,
          position: widget.position,
          config: widget.config,
          refreshInterval: widget.refreshInterval,
          isVisible: widget.isVisible,
          minSize: widget.minSize,
          maxSize: widget.maxSize
        })),
        createdBy: dashboard.createdBy,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
      }))
    },

    // Performance Analytics resolver
    performanceAnalytics: async (_: any, { input }: { input: PerformanceAnalyticsInput }) => {
      const analytics = await AnalyticsEngine.getPerformanceAnalytics(
        input.organizationId,
        input.userId,
        input.role as UserRole,
        input.period as 'day' | 'week' | 'month' | 'quarter' | 'year',
        input.startDate,
        input.endDate
      )

      // Add summary data
      const summary = {
        totalTasks: 150, // Mock data - would be calculated from actual data
        completedTasks: 120,
        averageCompletionTime: 2.5,
        productivityScore: 85.2
      }

      return {
        ...analytics,
        summary
      }
    },

    // Productivity Metrics resolver
    productivityMetrics: async (_: any, { input }: { input: ProductivityMetricsInput }) => {
      return await AnalyticsEngine.calculateProductivityMetrics(
        input.organizationId,
        input.userId,
        input.startDate,
        input.endDate
      )
    },

    // Time Tracking Analytics resolver
    timeTrackingAnalytics: async (_: any, { input }: { input: TimeTrackingAnalyticsInput }) => {
      return await AnalyticsEngine.getTimeTrackingAnalytics(
        input.organizationId,
        input.userId,
        input.startDate,
        input.endDate
      )
    },

    // Compliance Metrics resolver
    complianceMetrics: async (_: any, { input }: { input: ComplianceMetricsInput }) => {
      return await AnalyticsEngine.getComplianceMetrics(
        input.organizationId,
        input.role as UserRole
      )
    },

    // Client Engagement Analytics resolver
    clientEngagementAnalytics: async (_: any, { input }: { input: ClientEngagementAnalyticsInput }) => {
      return await AnalyticsEngine.getClientEngagementAnalytics(
        input.organizationId,
        input.clientId
      )
    }
  },

  Mutation: {
    // Dashboard mutations
    createDashboard: async (_: any, { input }: { input: CreateDashboardInput }) => {
      const dashboard = await prisma.dashboardLayout.create({
        data: {
          name: input.name,
          description: input.description,
          role: input.role,
          isDefault: input.isDefault || false,
          createdBy: 'system', // Would be from auth context
          widgets: {
            create: input.widgets.map(widget => ({
              type: widget.type,
              title: widget.title,
              position: widget.position,
              config: widget.config,
              refreshInterval: widget.refreshInterval,
              isVisible: true
            }))
          }
        },
        include: {
          widgets: true
        }
      })

      return {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        role: dashboard.role,
        isDefault: dashboard.isDefault,
        widgets: dashboard.widgets.map(widget => ({
          id: widget.id,
          type: widget.type as DashboardWidgetType,
          title: widget.title,
          position: widget.position,
          config: widget.config,
          refreshInterval: widget.refreshInterval,
          isVisible: widget.isVisible,
          minSize: widget.minSize,
          maxSize: widget.maxSize
        })),
        createdBy: dashboard.createdBy,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
      }
    },

    updateDashboard: async (_: any, { id, input }: { id: string; input: UpdateDashboardInput }) => {
      const dashboard = await prisma.dashboardLayout.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.isDefault !== undefined && { isDefault: input.isDefault })
        },
        include: {
          widgets: true
        }
      })

      return {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        role: dashboard.role,
        isDefault: dashboard.isDefault,
        widgets: dashboard.widgets.map(widget => ({
          id: widget.id,
          type: widget.type as DashboardWidgetType,
          title: widget.title,
          position: widget.position,
          config: widget.config,
          refreshInterval: widget.refreshInterval,
          isVisible: widget.isVisible,
          minSize: widget.minSize,
          maxSize: widget.maxSize
        })),
        createdBy: dashboard.createdBy,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
      }
    },

    deleteDashboard: async (_: any, { id }: { id: string }) => {
      await prisma.dashboardLayout.delete({
        where: { id }
      })
      return true
    },

    // Widget mutations
    addWidget: async (_: any, { dashboardId, input }: { dashboardId: string; input: AddWidgetInput }) => {
      const widget = await prisma.dashboardWidget.create({
        data: {
          dashboardId,
          type: input.type,
          title: input.title,
          position: input.position,
          config: input.config,
          refreshInterval: input.refreshInterval,
          isVisible: true
        }
      })

      return {
        id: widget.id,
        type: widget.type as DashboardWidgetType,
        title: widget.title,
        position: widget.position,
        config: widget.config,
        refreshInterval: widget.refreshInterval,
        isVisible: widget.isVisible,
        minSize: widget.minSize,
        maxSize: widget.maxSize
      }
    },

    updateWidget: async (_: any, { id, input }: { id: string; input: UpdateWidgetInput }) => {
      const widget = await prisma.dashboardWidget.update({
        where: { id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.position && { position: input.position }),
          ...(input.config !== undefined && { config: input.config }),
          ...(input.refreshInterval !== undefined && { refreshInterval: input.refreshInterval }),
          ...(input.isVisible !== undefined && { isVisible: input.isVisible })
        }
      })

      return {
        id: widget.id,
        type: widget.type as DashboardWidgetType,
        title: widget.title,
        position: widget.position,
        config: widget.config,
        refreshInterval: widget.refreshInterval,
        isVisible: widget.isVisible,
        minSize: widget.minSize,
        maxSize: widget.maxSize
      }
    },

    removeWidget: async (_: any, { id }: { id: string }) => {
      await prisma.dashboardWidget.delete({
        where: { id }
      })
      return true
    }
  }
}

// Input type interfaces for TypeScript
interface AnalyticsInput {
  organizationId: string
  userId?: string
  role?: UserRole
  metric: string
  period: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
  startDate?: Date
  endDate?: Date
  filters?: any
}

interface KPIInput {
  organizationId: string
  userId?: string
  role?: UserRole
  kpiTypes?: string[]
  dateRange?: {
    startDate: Date
    endDate: Date
  }
}

interface MetricsInput {
  organizationId: string
  userId?: string
  metricTypes: string[]
  dimensions?: string[]
  filters?: any
  groupBy?: string[]
  orderBy?: {
    field: string
    direction: 'ASC' | 'DESC'
  }
  limit?: number
}

interface PerformanceAnalyticsInput {
  organizationId: string
  userId?: string
  role?: UserRole
  period: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
  startDate?: Date
  endDate?: Date
}

interface ProductivityMetricsInput {
  organizationId: string
  userId?: string
  startDate?: Date
  endDate?: Date
}

interface TimeTrackingAnalyticsInput {
  organizationId: string
  userId?: string
  startDate?: Date
  endDate?: Date
}

interface ComplianceMetricsInput {
  organizationId: string
  role?: UserRole
}

interface ClientEngagementAnalyticsInput {
  organizationId: string
  clientId?: string
}

interface DashboardFilter {
  role?: UserRole
  isDefault?: boolean
  createdBy?: string
}

interface CreateDashboardInput {
  name: string
  description?: string
  role?: UserRole
  isDefault?: boolean
  widgets: CreateWidgetInput[]
}

interface UpdateDashboardInput {
  name?: string
  description?: string
  isDefault?: boolean
}

interface AddWidgetInput {
  type: DashboardWidgetType
  title: string
  position: {
    x: number
    y: number
    w: number
    h: number
  }
  config?: any
  refreshInterval?: number
}

interface UpdateWidgetInput {
  title?: string
  position?: {
    x: number
    y: number
    w: number
    h: number
  }
  config?: any
  refreshInterval?: number
  isVisible?: boolean
}

interface CreateWidgetInput {
  type: DashboardWidgetType
  title: string
  position: {
    x: number
    y: number
    w: number
    h: number
  }
  config?: any
  refreshInterval?: number
}