import { NextRequest, NextResponse } from 'next/server'
import { withMobileOptimization, mobileAPIOptimizer } from '@/lib/mobile-api-optimizer'
import { AnalyticsEngine } from '@/lib/analytics-engine'

// Mobile-optimized dashboard data endpoint
async function getDashboardData(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'demo-user'
  const role = searchParams.get('role') || 'associate'
  const organizationId = searchParams.get('organizationId') || 'demo-org'

  // Get essential dashboard data with mobile optimizations
  const [
    kpiData,
    performanceData,
    complianceData,
    recentTasks,
    notifications
  ] = await Promise.all([
    // KPI data - compressed for mobile
    Promise.all([
      AnalyticsEngine.calculateKPI(organizationId, 'task-completion-rate', userId, role as any),
      AnalyticsEngine.calculateKPI(organizationId, 'team-utilization', userId, role as any),
      AnalyticsEngine.calculateKPI(organizationId, 'client-satisfaction', userId, role as any)
    ]),
    
    // Performance analytics - last 7 days only for mobile
    AnalyticsEngine.getPerformanceAnalytics(
      organizationId,
      userId,
      role as any,
      'week'
    ),
    
    // Compliance metrics - essential only
    AnalyticsEngine.getComplianceMetrics(organizationId, role as any),
    
    // Recent tasks - limited to 10 for mobile
    getMobileOptimizedTasks(userId, 10),
    
    // Notifications - limited to 5 for mobile
    getMobileOptimizedNotifications(userId, 5)
  ])

  // Structure data for mobile consumption
  const mobileData = {
    kpis: kpiData.filter(kpi => kpi !== null).map(kpi => ({
      id: kpi!.id,
      name: kpi!.name,
      value: kpi!.value,
      target: kpi!.target,
      status: kpi!.status,
      trend: kpi!.trend,
      unit: kpi!.unit
    })),
    
    performance: {
      period: performanceData.period,
      trend: performanceData.trend,
      trendPercentage: performanceData.trendPercentage,
      // Simplified data points for mobile charts
      data: performanceData.data.slice(-7) // Last 7 data points only
    },
    
    compliance: {
      score: complianceData.complianceScore,
      riskLevel: complianceData.riskLevel,
      pending: complianceData.pendingCompliance,
      deadlines: complianceData.complianceDeadlines
    },
    
    recentActivity: {
      tasks: recentTasks,
      notifications: notifications
    },
    
    // Mobile-specific metadata
    mobileOptimized: true,
    lastUpdated: new Date().toISOString(),
    cacheTimeout: 180000 // 3 minutes
  }

  return mobileData
}

// Mobile-optimized tasks
async function getMobileOptimizedTasks(userId: string, limit: number) {
  // Mock mobile-optimized task data
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    id: `task_${i + 1}`,
    title: `Mobile Task ${i + 1}`,
    status: ['TODO', 'IN_PROGRESS', 'COMPLETED'][i % 3],
    priority: ['low', 'medium', 'high'][i % 3],
    dueDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    assignee: 'Current User',
    progress: Math.floor(Math.random() * 100),
    // Minimal data for mobile
    mobileView: true
  }))
}

// Mobile-optimized notifications
async function getMobileOptimizedNotifications(userId: string, limit: number) {
  // Mock mobile-optimized notification data
  return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
    id: `notif_${i + 1}`,
    title: `Mobile Notification ${i + 1}`,
    message: `This is a mobile-optimized notification message ${i + 1}`,
    type: ['info', 'warning', 'success'][i % 3],
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    read: i > 0,
    // Minimal data for mobile
    mobileView: true
  }))
}

// Export the mobile-optimized handler
export const GET = withMobileOptimization(getDashboardData)