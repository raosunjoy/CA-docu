import { EventEmitter } from 'events'
import type { 
  DashboardMetrics, 
  DashboardAlert, 
  ActivityFeedItem, 
  KPIData,
  UserRole 
} from '../types'

export interface DashboardUpdateEvent {
  type: 'metrics' | 'alert' | 'activity' | 'kpi' | 'widget_data'
  organizationId: string
  userId?: string
  role?: UserRole
  data: any
  timestamp: Date
}

export interface DashboardSubscription {
  userId: string
  organizationId: string
  role: UserRole
  widgets: string[]
  lastUpdate: Date
}

class RealtimeDashboardService extends EventEmitter {
  private subscriptions = new Map<string, DashboardSubscription>()
  private updateQueues = new Map<string, DashboardUpdateEvent[]>()
  private refreshIntervals = new Map<string, NodeJS.Timeout>()
  private dataCache = new Map<string, { data: any; timestamp: Date; ttl: number }>()

  constructor() {
    super()
    this.setMaxListeners(1000) // Support many concurrent dashboard connections
  }

  // Subscribe to dashboard updates
  subscribe(
    userId: string, 
    organizationId: string, 
    role: UserRole, 
    widgets: string[] = []
  ): string {
    const subscriptionId = `${userId}-${organizationId}-${Date.now()}`
    
    const subscription: DashboardSubscription = {
      userId,
      organizationId,
      role,
      widgets,
      lastUpdate: new Date()
    }

    this.subscriptions.set(subscriptionId, subscription)
    this.updateQueues.set(subscriptionId, [])

    // Set up periodic refresh for this subscription
    this.setupPeriodicRefresh(subscriptionId, subscription)

    console.log(`Dashboard subscription created: ${subscriptionId}`)
    return subscriptionId
  }

  // Unsubscribe from dashboard updates
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId)
    this.updateQueues.delete(subscriptionId)
    
    // Clear refresh interval
    const interval = this.refreshIntervals.get(subscriptionId)
    if (interval) {
      clearInterval(interval)
      this.refreshIntervals.delete(subscriptionId)
    }

    console.log(`Dashboard subscription removed: ${subscriptionId}`)
  }

  // Update widget configuration for a subscription
  updateWidgets(subscriptionId: string, widgets: string[]): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.widgets = widgets
      subscription.lastUpdate = new Date()
      this.subscriptions.set(subscriptionId, subscription)
    }
  }

  // Broadcast update to all relevant subscribers
  broadcastUpdate(event: DashboardUpdateEvent): void {
    const relevantSubscriptions = this.getRelevantSubscriptions(event)
    
    relevantSubscriptions.forEach(([subscriptionId, subscription]) => {
      const queue = this.updateQueues.get(subscriptionId) || []
      queue.push(event)
      this.updateQueues.set(subscriptionId, queue)

      // Emit to specific subscription
      this.emit(`update:${subscriptionId}`, event)
    })

    // Also emit globally for any listeners
    this.emit('dashboard:update', event)
  }

  // Get pending updates for a subscription
  getPendingUpdates(subscriptionId: string): DashboardUpdateEvent[] {
    const updates = this.updateQueues.get(subscriptionId) || []
    this.updateQueues.set(subscriptionId, []) // Clear queue after retrieval
    return updates
  }

  // Trigger metrics update
  async triggerMetricsUpdate(
    organizationId: string, 
    userId?: string, 
    role?: UserRole
  ): Promise<void> {
    try {
      // This would typically fetch fresh metrics from the database
      const metrics = await this.fetchFreshMetrics(organizationId, userId, role)
      
      this.broadcastUpdate({
        type: 'metrics',
        organizationId,
        userId,
        role,
        data: metrics,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error triggering metrics update:', error)
    }
  }

  // Trigger KPI update
  async triggerKPIUpdate(
    organizationId: string,
    kpiId: string,
    userId?: string,
    role?: UserRole
  ): Promise<void> {
    try {
      const kpi = await this.fetchFreshKPI(organizationId, kpiId, userId, role)
      
      this.broadcastUpdate({
        type: 'kpi',
        organizationId,
        userId,
        role,
        data: { kpiId, kpi },
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error triggering KPI update:', error)
    }
  }

  // Trigger alert
  triggerAlert(
    organizationId: string,
    alert: DashboardAlert,
    targetUsers?: string[]
  ): void {
    this.broadcastUpdate({
      type: 'alert',
      organizationId,
      data: { alert, targetUsers },
      timestamp: new Date()
    })
  }

  // Trigger activity update
  triggerActivityUpdate(
    organizationId: string,
    activity: ActivityFeedItem
  ): void {
    this.broadcastUpdate({
      type: 'activity',
      organizationId,
      data: activity,
      timestamp: new Date()
    })
  }

  // Trigger widget-specific data update
  triggerWidgetUpdate(
    organizationId: string,
    widgetId: string,
    widgetType: string,
    data: any,
    targetUsers?: string[]
  ): void {
    this.broadcastUpdate({
      type: 'widget_data',
      organizationId,
      data: { widgetId, widgetType, data, targetUsers },
      timestamp: new Date()
    })
  }

  // Cache management
  setCachedData(key: string, data: any, ttlSeconds: number = 300): void {
    this.dataCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlSeconds * 1000
    })
  }

  getCachedData(key: string): any | null {
    const cached = this.dataCache.get(key)
    if (!cached) return null

    const now = new Date().getTime()
    const cacheTime = cached.timestamp.getTime()
    
    if (now - cacheTime > cached.ttl) {
      this.dataCache.delete(key)
      return null
    }

    return cached.data
  }

  // Efficient data aggregation for dashboards
  async aggregateDataForDashboard(
    organizationId: string,
    userId: string,
    role: UserRole,
    widgets: string[]
  ): Promise<Record<string, any>> {
    const cacheKey = `dashboard:${organizationId}:${userId}:${role}:${widgets.join(',')}`
    const cached = this.getCachedData(cacheKey)
    
    if (cached) {
      return cached
    }

    const aggregatedData: Record<string, any> = {}

    // Aggregate data for each widget type
    for (const widgetType of widgets) {
      try {
        aggregatedData[widgetType] = await this.getWidgetData(
          widgetType,
          organizationId,
          userId,
          role
        )
      } catch (error) {
        console.error(`Error aggregating data for widget ${widgetType}:`, error)
        aggregatedData[widgetType] = null
      }
    }

    // Cache the aggregated data
    this.setCachedData(cacheKey, aggregatedData, 60) // Cache for 1 minute

    return aggregatedData
  }

  // Dashboard refresh strategies
  setupPeriodicRefresh(subscriptionId: string, subscription: DashboardSubscription): void {
    // Different refresh intervals based on role and widget types
    const refreshInterval = this.getRefreshInterval(subscription.role, subscription.widgets)
    
    const interval = setInterval(async () => {
      try {
        await this.refreshSubscriptionData(subscriptionId, subscription)
      } catch (error) {
        console.error(`Error refreshing subscription ${subscriptionId}:`, error)
      }
    }, refreshInterval)

    this.refreshIntervals.set(subscriptionId, interval)
  }

  private getRefreshInterval(role: UserRole, widgets: string[]): number {
    // Partners and managers get more frequent updates
    if (role === 'PARTNER' || role === 'MANAGER') {
      return 30000 // 30 seconds
    }

    // Check if any widgets require real-time updates
    const realtimeWidgets = ['notifications', 'activity-feed', 'alerts']
    const hasRealtimeWidget = widgets.some(widget => realtimeWidgets.includes(widget))
    
    if (hasRealtimeWidget) {
      return 15000 // 15 seconds
    }

    // Default refresh interval
    return 60000 // 1 minute
  }

  private async refreshSubscriptionData(
    subscriptionId: string, 
    subscription: DashboardSubscription
  ): Promise<void> {
    const aggregatedData = await this.aggregateDataForDashboard(
      subscription.organizationId,
      subscription.userId,
      subscription.role,
      subscription.widgets
    )

    this.broadcastUpdate({
      type: 'widget_data',
      organizationId: subscription.organizationId,
      userId: subscription.userId,
      role: subscription.role,
      data: { subscriptionId, aggregatedData },
      timestamp: new Date()
    })
  }

  private getRelevantSubscriptions(
    event: DashboardUpdateEvent
  ): Array<[string, DashboardSubscription]> {
    const relevant: Array<[string, DashboardSubscription]> = []

    this.subscriptions.forEach((subscription, subscriptionId) => {
      // Check organization match
      if (subscription.organizationId !== event.organizationId) {
        return
      }

      // Check user-specific events
      if (event.userId && subscription.userId !== event.userId) {
        // Skip unless it's a role-based event that applies to this user's role
        if (!event.role || subscription.role !== event.role) {
          return
        }
      }

      // Check role-based filtering
      if (event.role && subscription.role !== event.role) {
        // Allow higher-level roles to see lower-level events
        const roleHierarchy = ['INTERN', 'ASSOCIATE', 'MANAGER', 'PARTNER', 'ADMIN']
        const eventRoleIndex = roleHierarchy.indexOf(event.role)
        const subRoleIndex = roleHierarchy.indexOf(subscription.role)
        
        if (subRoleIndex <= eventRoleIndex) {
          return
        }
      }

      relevant.push([subscriptionId, subscription])
    })

    return relevant
  }

  private async fetchFreshMetrics(
    organizationId: string,
    userId?: string,
    role?: UserRole
  ): Promise<DashboardMetrics> {
    // This would integrate with the DashboardService
    // For now, return mock data
    return {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      tasksInProgress: 0,
      taskCompletionRate: 0,
      averageTaskTime: 0,
      teamSize: 0,
      activeMembers: 0,
      teamUtilization: 0,
      teamProductivity: 0,
      complianceScore: 0,
      pendingCompliance: 0,
      complianceDeadlines: 0,
      riskLevel: 'LOW',
      totalHours: 0,
      billableHours: 0,
      utilizationRate: 0,
      averageHoursPerTask: 0,
      totalDocuments: 0,
      documentsUploaded: 0,
      documentsShared: 0,
      storageUsed: 0,
      totalEmails: 0,
      unreadEmails: 0,
      emailsConverted: 0,
      responseTime: 0,
      activeClients: 0,
      clientSatisfaction: 0,
      engagementProgress: 0,
      pendingRequests: 0
    }
  }

  private async fetchFreshKPI(
    organizationId: string,
    kpiId: string,
    userId?: string,
    role?: UserRole
  ): Promise<KPIData | null> {
    // This would integrate with the AnalyticsEngine
    // For now, return mock data
    return null
  }

  private async getWidgetData(
    widgetType: string,
    organizationId: string,
    userId: string,
    role: UserRole
  ): Promise<any> {
    // This would fetch specific data for each widget type
    // Implementation would depend on the widget requirements
    switch (widgetType) {
      case 'task-overview':
        return await this.getTaskOverviewData(organizationId, userId, role)
      case 'notifications':
        return await this.getNotificationsData(organizationId, userId)
      case 'activity-feed':
        return await this.getActivityFeedData(organizationId, userId, role)
      default:
        return null
    }
  }

  private async getTaskOverviewData(
    organizationId: string,
    userId: string,
    role: UserRole
  ): Promise<any> {
    // Mock implementation
    return {
      totalTasks: 25,
      completedTasks: 18,
      overdueTasks: 2,
      tasksInProgress: 5
    }
  }

  private async getNotificationsData(
    organizationId: string,
    userId: string
  ): Promise<any> {
    // Mock implementation
    return {
      unreadCount: 3,
      notifications: []
    }
  }

  private async getActivityFeedData(
    organizationId: string,
    userId: string,
    role: UserRole
  ): Promise<any> {
    // Mock implementation
    return {
      activities: [],
      hasMore: false
    }
  }

  // Dashboard alert system for critical metrics
  checkCriticalMetrics(metrics: DashboardMetrics, organizationId: string): void {
    const alerts: DashboardAlert[] = []

    // Check for overdue tasks
    if (metrics.overdueTasks > 5) {
      alerts.push({
        id: `overdue-tasks-${Date.now()}`,
        type: 'error',
        title: 'High Number of Overdue Tasks',
        message: `${metrics.overdueTasks} tasks are overdue and require immediate attention`,
        priority: 'critical',
        isRead: false,
        actionUrl: '/tasks?filter=overdue',
        actionLabel: 'View Overdue Tasks',
        createdAt: new Date()
      })
    }

    // Check compliance score
    if (metrics.complianceScore < 70) {
      alerts.push({
        id: `compliance-low-${Date.now()}`,
        type: 'warning',
        title: 'Low Compliance Score',
        message: `Compliance score is ${metrics.complianceScore}%. Immediate action required.`,
        priority: 'high',
        isRead: false,
        actionUrl: '/compliance',
        actionLabel: 'Review Compliance',
        createdAt: new Date()
      })
    }

    // Check team utilization
    if (metrics.teamUtilization > 95) {
      alerts.push({
        id: `utilization-high-${Date.now()}`,
        type: 'warning',
        title: 'High Team Utilization',
        message: `Team utilization is ${metrics.teamUtilization}%. Consider workload rebalancing.`,
        priority: 'medium',
        isRead: false,
        actionUrl: '/team/workload',
        actionLabel: 'Manage Workload',
        createdAt: new Date()
      })
    }

    // Broadcast alerts
    alerts.forEach(alert => {
      this.triggerAlert(organizationId, alert)
    })
  }

  // Mobile optimization - lighter data payloads
  getMobileOptimizedData(
    organizationId: string,
    userId: string,
    role: UserRole
  ): Promise<any> {
    // Return essential data only for mobile dashboards
    return this.aggregateDataForDashboard(
      organizationId,
      userId,
      role,
      ['task-overview', 'notifications', 'deadlines'] // Essential widgets only
    )
  }

  // Cleanup method
  cleanup(): void {
    // Clear all intervals
    this.refreshIntervals.forEach(interval => clearInterval(interval))
    this.refreshIntervals.clear()

    // Clear all subscriptions
    this.subscriptions.clear()
    this.updateQueues.clear()
    this.dataCache.clear()

    // Remove all listeners
    this.removeAllListeners()
  }
}

// Export singleton instance
export const realtimeDashboardService = new RealtimeDashboardService()
export default realtimeDashboardService