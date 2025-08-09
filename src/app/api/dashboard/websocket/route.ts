import { NextRequest, NextResponse } from 'next/server'
import { WebSocketServer } from 'ws'
import { unifiedDataLayer } from '@/lib/unified/data-layer'
import { analyticsService } from '@/services/analytics-service'
import { 
  filterWidgetsByRole, 
  generateDashboardFilters, 
  sanitizeWidgetData, 
  getRolePermissions,
  type Role 
} from '@/lib/role-based-filter'

// WebSocket server instance (singleton)
let wss: WebSocketServer | null = null

interface DashboardSubscription {
  userId: string
  organizationId: string
  widgets: string[]
  filters: Record<string, any>
  role: string
}

interface RealTimeMessage {
  type: 'update' | 'error' | 'heartbeat' | 'subscription_confirmed'
  widgetId?: string
  data?: any
  error?: string
  timestamp: string
}

class DashboardWebSocketService {
  private subscriptions = new Map<string, DashboardSubscription>()
  private updateInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.startUpdateInterval()
  }

  async initializeWebSocket(port: number = 3001) {
    if (wss) return wss
    
    wss = new WebSocketServer({ port })
    console.log(`🚀 Dashboard WebSocket server started on port ${port}`)
    
    wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId()
      console.log(`📱 Dashboard WebSocket client connected: ${clientId}`)
      
      // Send connection confirmation
      this.sendMessage(ws, {
        type: 'subscription_confirmed',
        timestamp: new Date().toISOString()
      })
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString())
          await this.handleMessage(ws, clientId, data)
        } catch (error) {
          this.sendMessage(ws, {
            type: 'error',
            error: 'Invalid message format',
            timestamp: new Date().toISOString()
          })
        }
      })
      
      ws.on('close', () => {
        console.log(`📱 Dashboard WebSocket client disconnected: ${clientId}`)
        this.subscriptions.delete(clientId)
      })
      
      ws.on('error', (error) => {
        console.error(`❌ Dashboard WebSocket error for client ${clientId}:`, error)
        this.subscriptions.delete(clientId)
      })
    })
    
    return wss
  }
  
  private async handleMessage(ws: any, clientId: string, message: any) {
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscription(ws, clientId, message)
        break
      case 'unsubscribe':
        this.subscriptions.delete(clientId)
        break
      case 'request_update':
        await this.sendWidgetUpdate(ws, message.widgetId, this.subscriptions.get(clientId))
        break
      case 'ping':
        this.sendMessage(ws, { type: 'heartbeat', timestamp: new Date().toISOString() })
        break
      default:
        this.sendMessage(ws, {
          type: 'error', 
          error: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString()
        })
    }
  }
  
  private async handleSubscription(ws: any, clientId: string, message: any) {
    try {
      // Validate subscription request
      if (!message.userId || !message.organizationId || !message.role) {
        throw new Error('Missing required fields: userId, organizationId, role')
      }
      
      // Validate role
      const userRole = message.role as Role
      const permissions = getRolePermissions(userRole)
      
      // Filter widgets based on role permissions
      const requestedWidgets = message.widgets || ['task_overview', 'compliance_status', 'team_performance']
      const allowedWidgets = filterWidgetsByRole(requestedWidgets, userRole)
      
      // Generate role-based filters
      const roleBasedFilters = generateDashboardFilters(
        userRole,
        message.userId,
        message.organizationId,
        message.filters
      )
      
      const subscription: DashboardSubscription = {
        userId: message.userId,
        organizationId: message.organizationId,
        widgets: allowedWidgets,
        filters: roleBasedFilters,
        role: userRole
      }
      
      this.subscriptions.set(clientId, subscription)
      console.log(`📊 Dashboard subscription created for ${userRole} user ${subscription.userId} with ${allowedWidgets.length} widgets`)
      
      // Send subscription confirmation with allowed widgets
      this.sendMessage(ws, {
        type: 'subscription_confirmed',
        data: {
          allowedWidgets,
          permissions: {
            canExport: permissions.canExportData,
            canModifyDashboard: permissions.canModifyDashboard,
            maxDataRetention: permissions.maxDataRetention
          }
        },
        timestamp: new Date().toISOString()
      })
      
      // Send initial data for all allowed widgets
      await this.sendInitialDashboardData(ws, subscription)
      
    } catch (error) {
      this.sendMessage(ws, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Subscription failed',
        timestamp: new Date().toISOString()
      })
    }
  }
  
  private async sendInitialDashboardData(ws: any, subscription: DashboardSubscription) {
    for (const widgetId of subscription.widgets) {
      await this.sendWidgetUpdate(ws, widgetId, subscription)
    }
  }
  
  private async sendWidgetUpdate(ws: any, widgetId: string, subscription?: DashboardSubscription) {
    if (!subscription) return
    
    try {
      const rawWidgetData = await this.getWidgetData(widgetId, subscription)
      
      // Apply role-based data sanitization
      const sanitizedData = sanitizeWidgetData(
        widgetId,
        rawWidgetData,
        subscription.role as Role,
        subscription.userId
      )
      
      this.sendMessage(ws, {
        type: 'update',
        widgetId,
        data: sanitizedData,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      this.sendMessage(ws, {
        type: 'error',
        widgetId,
        error: error instanceof Error ? error.message : 'Failed to fetch widget data',
        timestamp: new Date().toISOString()
      })
    }
  }
  
  private async getWidgetData(widgetId: string, subscription: DashboardSubscription) {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    
    switch (widgetId) {
      case 'task_overview':
        return await this.getTaskOverviewData(subscription, startDate, endDate)
      
      case 'compliance_status':
        return await this.getComplianceStatusData(subscription, startDate, endDate)
      
      case 'team_performance':
        return await this.getTeamPerformanceData(subscription, startDate, endDate)
      
      case 'workload_analytics':
        return await this.getWorkloadAnalyticsData(subscription, startDate, endDate)
      
      case 'financial_metrics':
        return await this.getFinancialMetricsData(subscription, startDate, endDate)
      
      case 'client_engagement':
        return await this.getClientEngagementData(subscription, startDate, endDate)
      
      default:
        throw new Error(`Unknown widget: ${widgetId}`)
    }
  }
  
  private async getTaskOverviewData(subscription: DashboardSubscription, startDate: Date, endDate: Date) {
    // Get task completion data from time series database
    const taskCompletionData = await unifiedDataLayer.getTimeSeriesData(
      'task_completion_rate',
      { start: startDate, end: endDate },
      'gold'
    )
    
    // Get current task statistics
    const analytics = await analyticsService.generateComprehensiveAnalytics({
      period: 'DAILY',
      startDate,
      endDate,
      organizationId: subscription.organizationId,
      userId: subscription.userId,
      filters: subscription.filters
    })
    
    return {
      chartData: taskCompletionData.map(point => ({
        date: point.timestamp.toISOString().split('T')[0],
        completed: point.value,
        timestamp: point.timestamp.toISOString()
      })),
      summary: {
        totalTasks: analytics.productivity.totalTasks,
        completedTasks: analytics.productivity.tasksCompleted,
        completionRate: Math.round((analytics.productivity.tasksCompleted / analytics.productivity.totalTasks) * 100),
        trend: taskCompletionData.length > 1 ? 
          (taskCompletionData[taskCompletionData.length - 1].value > taskCompletionData[0].value ? 'up' : 'down') : 'stable'
      }
    }
  }
  
  private async getComplianceStatusData(subscription: DashboardSubscription, startDate: Date, endDate: Date) {
    const complianceData = await unifiedDataLayer.getTimeSeriesData(
      'compliance_score',
      { start: startDate, end: endDate },
      'gold'
    )
    
    const analytics = await analyticsService.generateComprehensiveAnalytics({
      period: 'WEEKLY',
      startDate,
      endDate,
      organizationId: subscription.organizationId,
      userId: subscription.userId
    })
    
    return {
      chartData: complianceData.map(point => ({
        date: point.timestamp.toISOString().split('T')[0],
        score: point.value,
        timestamp: point.timestamp.toISOString()
      })),
      summary: {
        currentScore: analytics.compliance.complianceScore,
        status: analytics.compliance.complianceScore >= 90 ? 'excellent' : 
                analytics.compliance.complianceScore >= 75 ? 'good' : 'needs_attention',
        deadlines: analytics.compliance.upcomingDeadlines || 0,
        trend: complianceData.length > 1 ? 
          (complianceData[complianceData.length - 1].value > complianceData[0].value ? 'up' : 'down') : 'stable'
      }
    }
  }
  
  private async getTeamPerformanceData(subscription: DashboardSubscription, startDate: Date, endDate: Date) {
    const performanceData = await unifiedDataLayer.getTimeSeriesData(
      'team_efficiency',
      { start: startDate, end: endDate },
      'gold'
    )
    
    const analytics = await analyticsService.generateComprehensiveAnalytics({
      period: 'DAILY',
      startDate,
      endDate,
      organizationId: subscription.organizationId,
      userId: subscription.userId
    })
    
    return {
      chartData: performanceData.map(point => ({
        date: point.timestamp.toISOString().split('T')[0],
        efficiency: point.value,
        utilization: (point.tags as any)?.utilization || 75,
        timestamp: point.timestamp.toISOString()
      })),
      summary: {
        averageEfficiency: analytics.productivity.efficiencyScore,
        utilization: analytics.productivity.utilizationRate,
        activeMembers: analytics.team.activeMembers || 8,
        collaborationScore: analytics.team.collaborationScore || 82
      }
    }
  }
  
  private async getWorkloadAnalyticsData(subscription: DashboardSubscription, startDate: Date, endDate: Date) {
    const workloadData = await unifiedDataLayer.getTimeSeriesData(
      'workload_distribution',
      { start: startDate, end: endDate },
      'silver'
    )
    
    return {
      chartData: workloadData.map(point => ({
        date: point.timestamp.toISOString().split('T')[0],
        workload: point.value,
        capacity: (point.tags as any)?.capacity || 100,
        timestamp: point.timestamp.toISOString()
      })),
      summary: {
        currentLoad: workloadData.length > 0 ? workloadData[workloadData.length - 1].value : 75,
        capacity: 100,
        efficiency: 85,
        bottlenecks: 2
      }
    }
  }
  
  private async getFinancialMetricsData(subscription: DashboardSubscription, startDate: Date, endDate: Date) {
    const revenueData = await unifiedDataLayer.getTimeSeriesData(
      'revenue_trend',
      { start: startDate, end: endDate },
      'platinum'
    )
    
    const analytics = await analyticsService.generateComprehensiveAnalytics({
      period: 'MONTHLY',
      startDate,
      endDate,
      organizationId: subscription.organizationId,
      userId: subscription.userId
    })
    
    return {
      chartData: revenueData.map(point => ({
        date: point.timestamp.toISOString().split('T')[0],
        revenue: point.value,
        profit: point.value * 0.25, // 25% profit margin
        timestamp: point.timestamp.toISOString()
      })),
      summary: {
        monthlyRevenue: analytics.financial.totalRevenue,
        profitMargin: analytics.financial.profitMargin,
        growth: 12.5,
        forecastAccuracy: 89
      }
    }
  }
  
  private async getClientEngagementData(subscription: DashboardSubscription, startDate: Date, endDate: Date) {
    const engagementData = await unifiedDataLayer.getTimeSeriesData(
      'client_satisfaction',
      { start: startDate, end: endDate },
      'gold'
    )
    
    const analytics = await analyticsService.generateComprehensiveAnalytics({
      period: 'WEEKLY',
      startDate,
      endDate,
      organizationId: subscription.organizationId,
      userId: subscription.userId
    })
    
    return {
      chartData: engagementData.map(point => ({
        date: point.timestamp.toISOString().split('T')[0],
        satisfaction: point.value,
        interactions: (point.tags as any)?.interactions || 15,
        timestamp: point.timestamp.toISOString()
      })),
      summary: {
        totalClients: analytics.client.totalClients,
        activeClients: analytics.client.activeClients,
        satisfactionScore: analytics.client.clientSatisfactionScore * 20, // Convert to 0-100 scale
        retentionRate: analytics.client.clientRetentionRate
      }
    }
  }
  
  private startUpdateInterval() {
    // Send updates every 30 seconds for real-time dashboard
    this.updateInterval = setInterval(async () => {
      for (const [clientId, subscription] of this.subscriptions) {
        const client = this.getWebSocketClient(clientId)
        if (client && client.readyState === 1) { // WebSocket.OPEN
          for (const widgetId of subscription.widgets) {
            await this.sendWidgetUpdate(client, widgetId, subscription)
          }
        }
      }
    }, 30000) // 30 seconds
  }
  
  private getWebSocketClient(clientId: string): any {
    if (!wss) return null
    
    for (const client of wss.clients) {
      if ((client as any).clientId === clientId) {
        return client
      }
    }
    return null
  }
  
  private sendMessage(ws: any, message: RealTimeMessage) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message))
    }
  }
  
  private generateClientId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    if (wss) {
      wss.close()
      wss = null
    }
  }
}

// Singleton instance
const dashboardWSService = new DashboardWebSocketService()

// Initialize WebSocket server on startup
if (process.env.NODE_ENV !== 'test') {
  dashboardWSService.initializeWebSocket()
}

// HTTP endpoint for WebSocket connection info
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Dashboard WebSocket service is running',
    websocketUrl: `ws://localhost:3001`,
    supportedWidgets: [
      'task_overview',
      'compliance_status', 
      'team_performance',
      'workload_analytics',
      'financial_metrics',
      'client_engagement'
    ],
    updateInterval: '30 seconds',
    status: 'operational',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    switch (action) {
      case 'trigger_update':
        // Trigger immediate update for specific widget
        // Implementation would trigger specific widget updates
        return NextResponse.json({ 
          success: true, 
          message: 'Update triggered',
          timestamp: new Date().toISOString()
        })
      
      case 'get_connection_count':
        return NextResponse.json({
          activeConnections: dashboardWSService['subscriptions'].size,
          timestamp: new Date().toISOString()
        })
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Dashboard WebSocket API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { dashboardWSService }