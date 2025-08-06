import { prisma } from './prisma'
import type { 
  AnalyticsData, 
  KPIData, 
  UserRole,
  ProductivityMetricData,
  WorkloadMetricData
} from '../types'

export class AnalyticsEngine {
  // Productivity Metrics Calculation
  static async calculateProductivityMetrics(
    organizationId: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProductivityMetricData[]> {
    try {
      const whereClause = {
        organizationId,
        ...(userId && { userId }),
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate
          }
        })
      }

      // Get existing productivity metrics
      const existingMetrics = await prisma.productivityMetric.findMany({
        where: whereClause,
        orderBy: { date: 'desc' }
      })

      // If we have recent metrics, return them
      if (existingMetrics.length > 0) {
        return existingMetrics.map(metric => ({
          userId: metric.userId,
          date: metric.date,
          totalHours: metric.totalHours,
          billableHours: metric.billableHours,
          tasksCompleted: metric.tasksCompleted,
          focusScore: metric.focusScore || undefined,
          efficiencyScore: metric.efficiencyScore || undefined,
          utilizationRate: metric.utilizationRate || undefined
        }))
      }

      // Calculate new metrics if none exist
      return await this.generateProductivityMetrics(organizationId, userId, startDate, endDate)
    } catch (error) {
      console.error('Error calculating productivity metrics:', error)
      throw new Error('Failed to calculate productivity metrics')
    }
  }

  // Performance Analytics with Trend Analysis
  static async getPerformanceAnalytics(
    organizationId: string,
    userId?: string,
    role?: UserRole,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsData> {
    try {
      const dateRange = this.getDateRange(period, startDate, endDate)
      const previousPeriodRange = this.getPreviousPeriodRange(period, dateRange.start, dateRange.end)

      // Get current period data
      const currentData = await this.getPerformanceDataForPeriod(
        organizationId,
        userId,
        role,
        dateRange.start,
        dateRange.end,
        period
      )

      // Get previous period data for comparison
      const previousData = await this.getPerformanceDataForPeriod(
        organizationId,
        userId,
        role,
        previousPeriodRange.start,
        previousPeriodRange.end,
        period
      )

      // Calculate trend
      const currentAvg = currentData.reduce((sum, item) => sum + item.value, 0) / currentData.length || 0
      const previousAvg = previousData.reduce((sum, item) => sum + item.value, 0) / previousData.length || 0
      const trendPercentage = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0

      return {
        period,
        startDate: dateRange.start,
        endDate: dateRange.end,
        data: currentData,
        trend: trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable',
        trendPercentage: Math.abs(trendPercentage),
        comparison: {
          period: this.getPreviousPeriodLabel(period),
          value: previousAvg,
          change: trendPercentage
        }
      }
    } catch (error) {
      console.error('Error getting performance analytics:', error)
      throw new Error('Failed to get performance analytics')
    }
  }

  // Compliance Monitoring and Risk Assessment
  static async getComplianceMetrics(
    organizationId: string,
    role?: UserRole
  ): Promise<{
    complianceScore: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    pendingCompliance: number
    complianceDeadlines: number
    riskFactors: Array<{
      category: string
      score: number
      level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      description: string
    }>
  }> {
    try {
      // Get compliance-related tasks
      const complianceTasks = await prisma.task.findMany({
        where: {
          organizationId,
          OR: [
            { title: { contains: 'compliance', mode: 'insensitive' } },
            { title: { contains: 'audit', mode: 'insensitive' } },
            { title: { contains: 'filing', mode: 'insensitive' } },
            { title: { contains: 'GST', mode: 'insensitive' } },
            { title: { contains: 'tax', mode: 'insensitive' } }
          ]
        },
        include: {
          tags: true
        }
      })

      const totalCompliance = complianceTasks.length
      const completedCompliance = complianceTasks.filter(task => task.status === 'COMPLETED').length
      const pendingCompliance = complianceTasks.filter(task => 
        task.status !== 'COMPLETED' && task.status !== 'CANCELLED'
      ).length

      const overdueCompliance = complianceTasks.filter(task => 
        task.dueDate && 
        task.dueDate < new Date() && 
        task.status !== 'COMPLETED'
      ).length

      const upcomingDeadlines = complianceTasks.filter(task => 
        task.dueDate && 
        task.dueDate > new Date() && 
        task.dueDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      ).length

      // Calculate compliance score
      const complianceScore = totalCompliance > 0 
        ? Math.round((completedCompliance / totalCompliance) * 100)
        : 100

      // Assess risk factors
      const riskFactors = [
        {
          category: 'Overdue Compliance',
          score: overdueCompliance > 0 ? Math.max(100 - (overdueCompliance * 20), 0) : 100,
          level: overdueCompliance > 3 ? 'CRITICAL' as const : 
                 overdueCompliance > 1 ? 'HIGH' as const : 
                 overdueCompliance > 0 ? 'MEDIUM' as const : 'LOW' as const,
          description: `${overdueCompliance} overdue compliance tasks`
        },
        {
          category: 'Upcoming Deadlines',
          score: upcomingDeadlines > 5 ? 60 : upcomingDeadlines > 2 ? 80 : 100,
          level: upcomingDeadlines > 5 ? 'HIGH' as const : 
                 upcomingDeadlines > 2 ? 'MEDIUM' as const : 'LOW' as const,
          description: `${upcomingDeadlines} deadlines in next 30 days`
        },
        {
          category: 'Completion Rate',
          score: complianceScore,
          level: complianceScore < 70 ? 'HIGH' as const : 
                 complianceScore < 85 ? 'MEDIUM' as const : 'LOW' as const,
          description: `${complianceScore}% compliance completion rate`
        }
      ]

      // Calculate overall risk level
      const avgRiskScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0) / riskFactors.length
      const riskLevel = avgRiskScore < 60 ? 'CRITICAL' :
                       avgRiskScore < 75 ? 'HIGH' :
                       avgRiskScore < 90 ? 'MEDIUM' : 'LOW'

      return {
        complianceScore,
        riskLevel,
        pendingCompliance,
        complianceDeadlines: upcomingDeadlines,
        riskFactors
      }
    } catch (error) {
      console.error('Error getting compliance metrics:', error)
      throw new Error('Failed to get compliance metrics')
    }
  }

  // Time Tracking Analytics and Billable Hours Reporting
  static async getTimeTrackingAnalytics(
    organizationId: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalHours: number
    billableHours: number
    nonBillableHours: number
    utilizationRate: number
    averageHoursPerDay: number
    productivityScore: number
    timeDistribution: Array<{
      category: string
      hours: number
      percentage: number
    }>
    dailyBreakdown: Array<{
      date: string
      totalHours: number
      billableHours: number
      productivity: number
    }>
  }> {
    try {
      const dateFilter = startDate && endDate ? {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      } : {}

      const timeEntries = await prisma.timeEntry.findMany({
        where: {
          organizationId,
          ...(userId && { userId }),
          ...dateFilter
        },
        include: {
          task: {
            select: {
              title: true,
              priority: true
            }
          }
        }
      })

      const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      const billableSeconds = timeEntries
        .filter(entry => entry.isBillable)
        .reduce((sum, entry) => sum + (entry.duration || 0), 0)

      const totalHours = totalSeconds / 3600
      const billableHours = billableSeconds / 3600
      const nonBillableHours = totalHours - billableHours

      const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0

      // Calculate daily breakdown
      const dailyMap = new Map<string, { total: number; billable: number; entries: number }>()
      
      timeEntries.forEach(entry => {
        const date = entry.startTime.toISOString().split('T')[0]
        const existing = dailyMap.get(date) || { total: 0, billable: 0, entries: 0 }
        
        existing.total += entry.duration || 0
        if (entry.isBillable) {
          existing.billable += entry.duration || 0
        }
        existing.entries += 1
        
        dailyMap.set(date, existing)
      })

      const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalHours: data.total / 3600,
        billableHours: data.billable / 3600,
        productivity: data.total > 0 ? (data.billable / data.total) * 100 : 0
      }))

      const averageHoursPerDay = dailyBreakdown.length > 0 
        ? dailyBreakdown.reduce((sum, day) => sum + day.totalHours, 0) / dailyBreakdown.length
        : 0

      // Calculate time distribution by type
      const typeMap = new Map<string, number>()
      timeEntries.forEach(entry => {
        const type = entry.type || 'WORK'
        typeMap.set(type, (typeMap.get(type) || 0) + (entry.duration || 0))
      })

      const timeDistribution = Array.from(typeMap.entries()).map(([category, seconds]) => ({
        category,
        hours: seconds / 3600,
        percentage: totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0
      }))

      // Calculate productivity score based on various factors
      const productivityScore = Math.min(100, Math.round(
        (utilizationRate * 0.4) + // 40% weight on utilization
        (Math.min(averageHoursPerDay / 8, 1) * 100 * 0.3) + // 30% weight on daily hours
        (timeEntries.length > 0 ? 100 : 0) * 0.3 // 30% weight on activity
      ))

      return {
        totalHours,
        billableHours,
        nonBillableHours,
        utilizationRate,
        averageHoursPerDay,
        productivityScore,
        timeDistribution,
        dailyBreakdown
      }
    } catch (error) {
      console.error('Error getting time tracking analytics:', error)
      throw new Error('Failed to get time tracking analytics')
    }
  }

  // Client Engagement Analytics and Satisfaction Metrics
  static async getClientEngagementAnalytics(
    organizationId: string,
    clientId?: string
  ): Promise<{
    totalClients: number
    activeEngagements: number
    completedEngagements: number
    averageEngagementDuration: number
    clientSatisfactionScore: number
    engagementTypes: Array<{
      type: string
      count: number
      averageDuration: number
      completionRate: number
    }>
    monthlyEngagements: Array<{
      month: string
      newEngagements: number
      completedEngagements: number
      revenue: number
    }>
  }> {
    try {
      // For now, we'll use tasks as proxy for engagements
      // In a real implementation, you'd have a separate engagements table
      const engagementTasks = await prisma.task.findMany({
        where: {
          organizationId,
          ...(clientId && { 
            metadata: {
              path: ['clientId'],
              equals: clientId
            }
          })
        },
        include: {
          timeEntries: true
        }
      })

      const totalEngagements = engagementTasks.length
      const activeEngagements = engagementTasks.filter(task => 
        task.status === 'IN_PROGRESS' || task.status === 'IN_REVIEW'
      ).length
      const completedEngagements = engagementTasks.filter(task => 
        task.status === 'COMPLETED'
      ).length

      // Calculate average engagement duration
      const completedWithDuration = engagementTasks.filter(task => 
        task.status === 'COMPLETED' && task.completedAt
      )
      
      const averageEngagementDuration = completedWithDuration.length > 0
        ? completedWithDuration.reduce((sum, task) => {
            const duration = task.completedAt!.getTime() - task.createdAt.getTime()
            return sum + (duration / (1000 * 60 * 60 * 24)) // Convert to days
          }, 0) / completedWithDuration.length
        : 0

      // Mock client satisfaction score (in real implementation, this would come from surveys)
      const clientSatisfactionScore = 4.2

      // Group by engagement type (based on task titles/categories)
      const typeMap = new Map<string, { count: number; completed: number; totalDuration: number }>()
      
      engagementTasks.forEach(task => {
        const type = this.categorizeEngagementType(task.title)
        const existing = typeMap.get(type) || { count: 0, completed: 0, totalDuration: 0 }
        
        existing.count += 1
        if (task.status === 'COMPLETED') {
          existing.completed += 1
          if (task.completedAt) {
            existing.totalDuration += task.completedAt.getTime() - task.createdAt.getTime()
          }
        }
        
        typeMap.set(type, existing)
      })

      const engagementTypes = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        averageDuration: data.completed > 0 
          ? (data.totalDuration / data.completed) / (1000 * 60 * 60 * 24) // Days
          : 0,
        completionRate: data.count > 0 ? (data.completed / data.count) * 100 : 0
      }))

      // Generate monthly engagement data (mock data for now)
      const monthlyEngagements = this.generateMonthlyEngagementData(engagementTasks)

      return {
        totalClients: 1, // Mock value
        activeEngagements,
        completedEngagements,
        averageEngagementDuration,
        clientSatisfactionScore,
        engagementTypes,
        monthlyEngagements
      }
    } catch (error) {
      console.error('Error getting client engagement analytics:', error)
      throw new Error('Failed to get client engagement analytics')
    }
  }

  // KPI Calculation
  static async calculateKPI(
    organizationId: string,
    kpiType: string,
    userId?: string,
    role?: UserRole
  ): Promise<KPIData | null> {
    try {
      switch (kpiType) {
        case 'task-completion-rate':
          return await this.calculateTaskCompletionRateKPI(organizationId, userId)
        
        case 'team-utilization':
          return await this.calculateTeamUtilizationKPI(organizationId, userId, role)
        
        case 'client-satisfaction':
          return await this.calculateClientSatisfactionKPI(organizationId)
        
        case 'revenue-growth':
          return await this.calculateRevenueGrowthKPI(organizationId)
        
        case 'compliance-score':
          return await this.calculateComplianceScoreKPI(organizationId)
        
        default:
          return null
      }
    } catch (error) {
      console.error(`Error calculating KPI ${kpiType}:`, error)
      return null
    }
  }

  // Private helper methods
  private static async generateProductivityMetrics(
    organizationId: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProductivityMetricData[]> {
    // This would calculate and store new productivity metrics
    // For now, return mock data
    return []
  }

  private static getDateRange(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate?: Date,
    endDate?: Date
  ): { start: Date; end: Date } {
    if (startDate && endDate) {
      return { start: startDate, end: endDate }
    }

    const now = new Date()
    const start = new Date(now)
    const end = new Date(now)

    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'week':
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(start.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        start.setMonth(quarter * 3, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(quarter * 3 + 3, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
        break
    }

    return { start, end }
  }

  private static getPreviousPeriodRange(
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    currentStart: Date,
    currentEnd: Date
  ): { start: Date; end: Date } {
    const duration = currentEnd.getTime() - currentStart.getTime()
    const start = new Date(currentStart.getTime() - duration)
    const end = new Date(currentEnd.getTime() - duration)
    return { start, end }
  }

  private static getPreviousPeriodLabel(period: string): string {
    switch (period) {
      case 'day': return 'Yesterday'
      case 'week': return 'Last Week'
      case 'month': return 'Last Month'
      case 'quarter': return 'Last Quarter'
      case 'year': return 'Last Year'
      default: return 'Previous Period'
    }
  }

  private static async getPerformanceDataForPeriod(
    organizationId: string,
    userId?: string,
    role?: UserRole,
    startDate?: Date,
    endDate?: Date,
    period?: string
  ): Promise<Array<{ date: string; value: number; label?: string; metadata?: Record<string, any> }>> {
    // This would generate actual performance data based on the period
    // For now, return mock data
    return []
  }

  private static categorizeEngagementType(title: string): string {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('audit')) return 'Audit'
    if (lowerTitle.includes('tax')) return 'Tax Services'
    if (lowerTitle.includes('gst')) return 'GST Services'
    if (lowerTitle.includes('compliance')) return 'Compliance'
    if (lowerTitle.includes('consultation')) return 'Consultation'
    return 'Other'
  }

  private static generateMonthlyEngagementData(tasks: any[]): Array<{
    month: string
    newEngagements: number
    completedEngagements: number
    revenue: number
  }> {
    // Generate mock monthly data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
    return months.map(month => ({
      month,
      newEngagements: Math.floor(Math.random() * 10) + 5,
      completedEngagements: Math.floor(Math.random() * 8) + 3,
      revenue: Math.floor(Math.random() * 100000) + 50000
    }))
  }

  private static async calculateTaskCompletionRateKPI(
    organizationId: string,
    userId?: string
  ): Promise<KPIData> {
    const whereClause = {
      organizationId,
      ...(userId && { assignedTo: userId })
    }

    const [totalTasks, completedTasks] = await Promise.all([
      prisma.task.count({ where: whereClause }),
      prisma.task.count({ where: { ...whereClause, status: 'COMPLETED' } })
    ])

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    return {
      id: 'task-completion-rate',
      name: 'Task Completion Rate',
      value: completionRate,
      target: 85,
      unit: '%',
      format: 'percentage',
      trend: 'up', // Would calculate based on historical data
      trendPercentage: 5.2,
      status: completionRate >= 85 ? 'good' : completionRate >= 70 ? 'warning' : 'critical',
      description: 'Percentage of tasks completed successfully',
      lastUpdated: new Date()
    }
  }

  private static async calculateTeamUtilizationKPI(
    organizationId: string,
    userId?: string,
    role?: UserRole
  ): Promise<KPIData> {
    // Mock implementation
    return {
      id: 'team-utilization',
      name: 'Team Utilization',
      value: 78,
      target: 80,
      unit: '%',
      format: 'percentage',
      trend: 'stable',
      trendPercentage: 1.2,
      status: 'warning',
      description: 'Team resource utilization rate',
      lastUpdated: new Date()
    }
  }

  private static async calculateClientSatisfactionKPI(organizationId: string): Promise<KPIData> {
    // Mock implementation
    return {
      id: 'client-satisfaction',
      name: 'Client Satisfaction',
      value: 4.2,
      target: 4.5,
      unit: '/5',
      format: 'number',
      trend: 'up',
      trendPercentage: 8.5,
      status: 'good',
      description: 'Average client satisfaction rating',
      lastUpdated: new Date()
    }
  }

  private static async calculateRevenueGrowthKPI(organizationId: string): Promise<KPIData> {
    // Mock implementation
    return {
      id: 'revenue-growth',
      name: 'Revenue Growth',
      value: 12.5,
      target: 15,
      unit: '%',
      format: 'percentage',
      trend: 'up',
      trendPercentage: 12.5,
      status: 'good',
      description: 'Monthly revenue growth rate',
      lastUpdated: new Date()
    }
  }

  private static async calculateComplianceScoreKPI(organizationId: string): Promise<KPIData> {
    const complianceMetrics = await this.getComplianceMetrics(organizationId)
    
    return {
      id: 'compliance-score',
      name: 'Compliance Score',
      value: complianceMetrics.complianceScore,
      target: 95,
      unit: '%',
      format: 'percentage',
      trend: 'stable',
      trendPercentage: 2.1,
      status: complianceMetrics.complianceScore >= 95 ? 'good' : 
              complianceMetrics.complianceScore >= 80 ? 'warning' : 'critical',
      description: 'Overall compliance completion rate',
      lastUpdated: new Date()
    }
  }
}