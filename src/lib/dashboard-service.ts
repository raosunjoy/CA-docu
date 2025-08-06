import { prisma } from './prisma'
import type { 
  DashboardLayout, 
  DashboardWidgetConfig, 
  DashboardTemplate,
  DashboardMetrics,
  AnalyticsData,
  KPIData,
  ActivityFeedItem,
  DashboardAlert,
  DashboardFilter,
  UserRole
} from '../types'

export class DashboardService {
  // Dashboard Layout Management
  static async getDashboardLayout(userId: string, role: UserRole): Promise<DashboardLayout | null> {
    try {
      // First try to get user's custom dashboard
      const userDashboard = await prisma.dashboardLayout.findFirst({
        where: {
          userId,
          isActive: true
        },
        include: {
          widgets: true
        }
      })

      if (userDashboard) {
        return this.formatDashboardLayout(userDashboard)
      }

      // Fall back to role-based default dashboard
      const defaultDashboard = await prisma.dashboardLayout.findFirst({
        where: {
          role,
          isDefault: true,
          isActive: true
        },
        include: {
          widgets: true
        }
      })

      return defaultDashboard ? this.formatDashboardLayout(defaultDashboard) : null
    } catch (error) {
      console.error('Error getting dashboard layout:', error)
      throw new Error('Failed to get dashboard layout')
    }
  }

  static async saveDashboardLayout(
    userId: string, 
    organizationId: string,
    layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DashboardLayout> {
    try {
      const result = await prisma.dashboardLayout.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId
          }
        },
        update: {
          name: layout.name,
          description: layout.description,
          widgets: {
            deleteMany: {},
            create: layout.widgets.map(widget => ({
              type: widget.type,
              title: widget.title,
              position: widget.position,
              config: widget.config,
              permissions: widget.permissions,
              refreshInterval: widget.refreshInterval,
              isVisible: widget.isVisible,
              minSize: widget.minSize,
              maxSize: widget.maxSize
            }))
          }
        },
        create: {
          userId,
          organizationId,
          name: layout.name,
          description: layout.description,
          role: layout.role,
          isDefault: layout.isDefault,
          widgets: {
            create: layout.widgets.map(widget => ({
              type: widget.type,
              title: widget.title,
              position: widget.position,
              config: widget.config,
              permissions: widget.permissions,
              refreshInterval: widget.refreshInterval,
              isVisible: widget.isVisible,
              minSize: widget.minSize,
              maxSize: widget.maxSize
            }))
          }
        },
        include: {
          widgets: true
        }
      })

      return this.formatDashboardLayout(result)
    } catch (error) {
      console.error('Error saving dashboard layout:', error)
      throw new Error('Failed to save dashboard layout')
    }
  }

  // Dashboard Templates
  static async getDashboardTemplates(role?: UserRole): Promise<DashboardTemplate[]> {
    try {
      const templates = await prisma.dashboardTemplate.findMany({
        where: role ? { role } : undefined,
        include: {
          widgets: true
        },
        orderBy: [
          { isSystemTemplate: 'desc' },
          { name: 'asc' }
        ]
      })

      return templates.map(this.formatDashboardTemplate)
    } catch (error) {
      console.error('Error getting dashboard templates:', error)
      throw new Error('Failed to get dashboard templates')
    }
  }

  static async createDashboardFromTemplate(
    userId: string,
    organizationId: string,
    templateId: string,
    customizations?: Partial<DashboardLayout>
  ): Promise<DashboardLayout> {
    try {
      const template = await prisma.dashboardTemplate.findUnique({
        where: { id: templateId },
        include: { widgets: true }
      })

      if (!template) {
        throw new Error('Dashboard template not found')
      }

      const layoutData: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'> = {
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        role: template.role,
        isDefault: false,
        widgets: template.widgets.map(widget => ({
          id: crypto.randomUUID(),
          type: widget.type,
          title: widget.title,
          position: widget.position,
          config: widget.config,
          permissions: widget.permissions,
          refreshInterval: widget.refreshInterval,
          isVisible: widget.isVisible,
          minSize: widget.minSize,
          maxSize: widget.maxSize
        })),
        createdBy: userId
      }

      return await this.saveDashboardLayout(userId, organizationId, layoutData)
    } catch (error) {
      console.error('Error creating dashboard from template:', error)
      throw new Error('Failed to create dashboard from template')
    }
  }

  static async getDefaultLayoutForRole(role: UserRole): Promise<DashboardLayout> {
    // Return a default layout based on role
    const defaultWidgets = this.getDefaultWidgetsForRole(role)
    
    return {
      id: 'default',
      name: `${role} Dashboard`,
      description: `Default dashboard for ${role.toLowerCase()} role`,
      role,
      isDefault: true,
      widgets: defaultWidgets,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static async deleteDashboardLayout(layoutId: string, userId: string): Promise<void> {
    try {
      await prisma.dashboardLayout.delete({
        where: {
          id: layoutId,
          userId // Ensure user can only delete their own layouts
        }
      })
    } catch (error) {
      console.error('Error deleting dashboard layout:', error)
      throw new Error('Failed to delete dashboard layout')
    }
  }

  private static getDefaultWidgetsForRole(role: UserRole): DashboardWidgetConfig[] {
    const baseWidgets: DashboardWidgetConfig[] = [
      {
        id: 'task-overview',
        type: 'task-overview',
        title: 'Task Overview',
        position: { x: 0, y: 0, w: 2, h: 2 },
        config: {},
        permissions: [role],
        isVisible: true
      },
      {
        id: 'notifications',
        type: 'notifications',
        title: 'Notifications',
        position: { x: 2, y: 0, w: 1, h: 2 },
        config: {},
        permissions: [role],
        isVisible: true
      }
    ]

    switch (role) {
      case 'PARTNER':
        return [
          ...baseWidgets,
          {
            id: 'compliance-status',
            type: 'compliance-status',
            title: 'Compliance Status',
            position: { x: 0, y: 2, w: 3, h: 2 },
            config: {},
            permissions: [role],
            isVisible: true
          },
          {
            id: 'team-performance',
            type: 'team-performance',
            title: 'Team Performance',
            position: { x: 3, y: 0, w: 2, h: 3 },
            config: {},
            permissions: [role],
            isVisible: true
          }
        ]

      case 'MANAGER':
        return [
          ...baseWidgets,
          {
            id: 'workload-analytics',
            type: 'workload-analytics',
            title: 'Team Workload',
            position: { x: 0, y: 2, w: 2, h: 2 },
            config: {},
            permissions: [role],
            isVisible: true
          },
          {
            id: 'deadlines',
            type: 'deadlines',
            title: 'Upcoming Deadlines',
            position: { x: 2, y: 2, w: 2, h: 2 },
            config: {},
            permissions: [role],
            isVisible: true
          }
        ]

      case 'ASSOCIATE':
        return [
          ...baseWidgets,
          {
            id: 'time-tracking',
            type: 'time-tracking',
            title: 'Time Tracking',
            position: { x: 0, y: 2, w: 1, h: 2 },
            config: {},
            permissions: [role],
            isVisible: true
          },
          {
            id: 'deadlines',
            type: 'deadlines',
            title: 'My Deadlines',
            position: { x: 1, y: 2, w: 2, h: 2 },
            config: {},
            permissions: [role],
            isVisible: true
          }
        ]

      case 'INTERN':
        return [
          ...baseWidgets,
          {
            id: 'learning-progress',
            type: 'learning-progress',
            title: 'Learning Progress',
            position: { x: 0, y: 2, w: 2, h: 2 },
            config: {},
            permissions: [role],
            isVisible: true
          }
        ]

      default:
        return baseWidgets
    }
  }

  // Dashboard Metrics
  static async getDashboardMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ): Promise<DashboardMetrics> {
    try {
      const [
        taskMetrics,
        teamMetrics,
        complianceMetrics,
        timeMetrics,
        documentMetrics,
        emailMetrics,
        clientMetrics
      ] = await Promise.all([
        this.getTaskMetrics(organizationId, userId, role, filters),
        this.getTeamMetrics(organizationId, userId, role, filters),
        this.getComplianceMetrics(organizationId, userId, role, filters),
        this.getTimeTrackingMetrics(organizationId, userId, role, filters),
        this.getDocumentMetrics(organizationId, userId, role, filters),
        this.getEmailMetrics(organizationId, userId, role, filters),
        this.getClientMetrics(organizationId, userId, role, filters)
      ])

      return {
        ...taskMetrics,
        ...teamMetrics,
        ...complianceMetrics,
        ...timeMetrics,
        ...documentMetrics,
        ...emailMetrics,
        ...clientMetrics
      }
    } catch (error) {
      console.error('Error getting dashboard metrics:', error)
      throw new Error('Failed to get dashboard metrics')
    }
  }

  // Analytics Data
  static async getAnalyticsData(
    organizationId: string,
    userId: string,
    role: UserRole,
    metric: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    try {
      // Implementation depends on the specific metric
      switch (metric) {
        case 'task-completion':
          return await this.getTaskCompletionAnalytics(organizationId, userId, role, period, startDate, endDate)
        case 'productivity':
          return await this.getProductivityAnalytics(organizationId, userId, role, period, startDate, endDate)
        case 'team-performance':
          return await this.getTeamPerformanceAnalytics(organizationId, userId, role, period, startDate, endDate)
        default:
          throw new Error(`Unknown analytics metric: ${metric}`)
      }
    } catch (error) {
      console.error('Error getting analytics data:', error)
      throw new Error('Failed to get analytics data')
    }
  }

  // KPI Data
  static async getKPIData(
    organizationId: string,
    userId: string,
    role: UserRole,
    kpiIds: string[]
  ): Promise<KPIData[]> {
    try {
      const kpis: KPIData[] = []

      for (const kpiId of kpiIds) {
        const kpi = await this.calculateKPI(organizationId, userId, role, kpiId)
        if (kpi) {
          kpis.push(kpi)
        }
      }

      return kpis
    } catch (error) {
      console.error('Error getting KPI data:', error)
      throw new Error('Failed to get KPI data')
    }
  }

  // Activity Feed
  static async getActivityFeed(
    organizationId: string,
    userId: string,
    role: UserRole,
    limit: number = 20,
    offset: number = 0
  ): Promise<ActivityFeedItem[]> {
    try {
      const activities = await prisma.auditLog.findMany({
        where: {
          organizationId,
          ...(role !== 'PARTNER' && role !== 'ADMIN' ? { userId } : {})
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })

      return activities.map(activity => ({
        id: activity.id,
        type: this.mapActivityType(activity.action),
        title: this.generateActivityTitle(activity),
        description: activity.details as string,
        userId: activity.userId,
        userName: `${activity.user.firstName} ${activity.user.lastName}`,
        resourceId: activity.resourceId,
        resourceType: activity.resourceType,
        timestamp: activity.createdAt,
        metadata: activity.metadata as Record<string, any>
      }))
    } catch (error) {
      console.error('Error getting activity feed:', error)
      throw new Error('Failed to get activity feed')
    }
  }

  // Dashboard Alerts
  static async getDashboardAlerts(
    organizationId: string,
    userId: string,
    role: UserRole
  ): Promise<DashboardAlert[]> {
    try {
      const alerts: DashboardAlert[] = []

      // Check for overdue tasks
      const overdueTasks = await prisma.task.count({
        where: {
          organizationId,
          ...(role !== 'PARTNER' && role !== 'ADMIN' ? { assignedTo: userId } : {}),
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
      })

      if (overdueTasks > 0) {
        alerts.push({
          id: 'overdue-tasks',
          type: 'warning',
          title: 'Overdue Tasks',
          message: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`,
          priority: 'high',
          isRead: false,
          actionUrl: '/tasks?filter=overdue',
          actionLabel: 'View Tasks',
          createdAt: new Date()
        })
      }

      // Check for pending approvals
      if (role === 'PARTNER' || role === 'MANAGER') {
        const pendingApprovals = await prisma.approvalRequest.count({
          where: {
            organizationId,
            approverId: userId,
            status: 'PENDING'
          }
        })

        if (pendingApprovals > 0) {
          alerts.push({
            id: 'pending-approvals',
            type: 'info',
            title: 'Pending Approvals',
            message: `You have ${pendingApprovals} approval${pendingApprovals > 1 ? 's' : ''} waiting`,
            priority: 'medium',
            isRead: false,
            actionUrl: '/approvals',
            actionLabel: 'Review',
            createdAt: new Date()
          })
        }
      }

      return alerts
    } catch (error) {
      console.error('Error getting dashboard alerts:', error)
      throw new Error('Failed to get dashboard alerts')
    }
  }

  // Private helper methods
  private static formatDashboardLayout(layout: any): DashboardLayout {
    return {
      id: layout.id,
      name: layout.name,
      description: layout.description,
      role: layout.role,
      isDefault: layout.isDefault,
      widgets: layout.widgets.map((widget: any) => ({
        id: widget.id,
        type: widget.type,
        title: widget.title,
        position: widget.position,
        config: widget.config,
        permissions: widget.permissions,
        refreshInterval: widget.refreshInterval,
        isVisible: widget.isVisible,
        minSize: widget.minSize,
        maxSize: widget.maxSize
      })),
      createdBy: layout.createdBy,
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt
    }
  }

  private static formatDashboardTemplate(template: any): DashboardTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      role: template.role,
      widgets: template.widgets.map((widget: any) => ({
        type: widget.type,
        title: widget.title,
        position: widget.position,
        config: widget.config,
        permissions: widget.permissions,
        refreshInterval: widget.refreshInterval,
        isVisible: widget.isVisible,
        minSize: widget.minSize,
        maxSize: widget.maxSize
      })),
      isSystemTemplate: template.isSystemTemplate,
      previewImage: template.previewImage
    }
  }

  private static async getTaskMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    const whereClause = {
      organizationId,
      ...(role !== 'PARTNER' && role !== 'ADMIN' ? { assignedTo: userId } : {}),
      ...(filters?.dateRange && {
        createdAt: {
          gte: filters.dateRange[0],
          lte: filters.dateRange[1]
        }
      })
    }

    const [totalTasks, completedTasks, overdueTasks, tasksInProgress] = await Promise.all([
      prisma.task.count({ where: whereClause }),
      prisma.task.count({ where: { ...whereClause, status: 'COMPLETED' } }),
      prisma.task.count({ 
        where: { 
          ...whereClause, 
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        } 
      }),
      prisma.task.count({ where: { ...whereClause, status: 'IN_PROGRESS' } })
    ])

    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Calculate average task time
    const completedTasksWithTime = await prisma.task.findMany({
      where: {
        ...whereClause,
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    })

    const averageTaskTime = completedTasksWithTime.length > 0
      ? completedTasksWithTime.reduce((acc, task) => {
          const timeDiff = task.completedAt!.getTime() - task.createdAt.getTime()
          return acc + (timeDiff / (1000 * 60 * 60)) // Convert to hours
        }, 0) / completedTasksWithTime.length
      : 0

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      tasksInProgress,
      taskCompletionRate,
      averageTaskTime
    }
  }

  private static async getTeamMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    if (role === 'ASSOCIATE' || role === 'INTERN') {
      return {
        teamSize: 0,
        activeMembers: 0,
        teamUtilization: 0,
        teamProductivity: 0
      }
    }

    const teamMembers = await prisma.user.count({
      where: { organizationId, isActive: true }
    })

    const activeMembers = await prisma.user.count({
      where: {
        organizationId,
        isActive: true,
        lastLoginAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    })

    return {
      teamSize: teamMembers,
      activeMembers,
      teamUtilization: teamMembers > 0 ? (activeMembers / teamMembers) * 100 : 0,
      teamProductivity: 85 // Placeholder - would calculate based on actual metrics
    }
  }

  private static async getComplianceMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    // Placeholder implementation - would integrate with actual compliance system
    return {
      complianceScore: 92,
      pendingCompliance: 3,
      complianceDeadlines: 5,
      riskLevel: 'LOW' as const
    }
  }

  private static async getTimeTrackingMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    const whereClause = {
      organizationId,
      ...(role !== 'PARTNER' && role !== 'ADMIN' ? { userId } : {}),
      ...(filters?.dateRange && {
        startTime: {
          gte: filters.dateRange[0],
          lte: filters.dateRange[1]
        }
      })
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      select: {
        duration: true,
        isBillable: true
      }
    })

    const totalHours = timeEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0) / 3600 // Convert seconds to hours
    const billableHours = timeEntries
      .filter(entry => entry.isBillable)
      .reduce((acc, entry) => acc + (entry.duration || 0), 0) / 3600

    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0

    return {
      totalHours,
      billableHours,
      utilizationRate,
      averageHoursPerTask: 0 // Would calculate based on task completion data
    }
  }

  private static async getDocumentMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    const whereClause = {
      organizationId,
      ...(role !== 'PARTNER' && role !== 'ADMIN' ? { uploadedBy: userId } : {}),
      ...(filters?.dateRange && {
        uploadedAt: {
          gte: filters.dateRange[0],
          lte: filters.dateRange[1]
        }
      })
    }

    const [totalDocuments, documentsUploaded, documentsShared, storageUsed] = await Promise.all([
      prisma.document.count({ where: whereClause }),
      prisma.document.count({ 
        where: { 
          ...whereClause,
          uploadedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        } 
      }),
      prisma.documentShare.count({ where: { organizationId } }),
      prisma.document.aggregate({
        where: whereClause,
        _sum: { fileSize: true }
      }).then(result => result._sum.fileSize || 0)
    ])

    return {
      totalDocuments,
      documentsUploaded,
      documentsShared,
      storageUsed
    }
  }

  private static async getEmailMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    // Placeholder implementation - would integrate with email system
    return {
      totalEmails: 0,
      unreadEmails: 0,
      emailsConverted: 0,
      responseTime: 0
    }
  }

  private static async getClientMetrics(
    organizationId: string,
    userId: string,
    role: UserRole,
    filters?: DashboardFilter
  ) {
    // Placeholder implementation - would integrate with client management system
    return {
      activeClients: 0,
      clientSatisfaction: 0,
      engagementProgress: 0,
      pendingRequests: 0
    }
  }

  private static async getTaskCompletionAnalytics(
    organizationId: string,
    userId: string,
    role: UserRole,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    // Implementation would generate time-series data for task completion
    return {
      period: period as any,
      startDate,
      endDate,
      data: [],
      trend: 'stable',
      trendPercentage: 0
    }
  }

  private static async getProductivityAnalytics(
    organizationId: string,
    userId: string,
    role: UserRole,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    // Implementation would generate productivity analytics
    return {
      period: period as any,
      startDate,
      endDate,
      data: [],
      trend: 'stable',
      trendPercentage: 0
    }
  }

  private static async getTeamPerformanceAnalytics(
    organizationId: string,
    userId: string,
    role: UserRole,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsData> {
    // Implementation would generate team performance analytics
    return {
      period: period as any,
      startDate,
      endDate,
      data: [],
      trend: 'stable',
      trendPercentage: 0
    }
  }

  private static async calculateKPI(
    organizationId: string,
    userId: string,
    role: UserRole,
    kpiId: string
  ): Promise<KPIData | null> {
    // Implementation would calculate specific KPIs based on kpiId
    return null
  }

  private static mapActivityType(action: string): ActivityFeedItem['type'] {
    if (action.includes('TASK')) return 'task'
    if (action.includes('DOCUMENT')) return 'document'
    if (action.includes('EMAIL')) return 'email'
    if (action.includes('APPROVAL')) return 'approval'
    if (action.includes('COMMENT')) return 'comment'
    return 'system'
  }

  private static generateActivityTitle(activity: any): string {
    const action = activity.action.toLowerCase().replace('_', ' ')
    return `${action.charAt(0).toUpperCase()}${action.slice(1)}`
  }
}