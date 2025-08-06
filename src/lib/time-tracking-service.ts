// Time Tracking Service
// Handles time entry logging, reporting, and productivity analytics

import prisma from '@/lib/prisma'
import { 
  TimeEntryStatus, 
  TimeEntryType,
  TimeEntryData,
  TimeEntryUpdateData,
  TimeBudgetData,
  TimeReportData,
  ProductivityMetricData,
  TimeTrackingFilters,
  TimeTrackingSummary
} from '@/types'

export interface TimeEntryResult {
  id: string
  organizationId: string
  userId: string
  taskId?: string
  projectId?: string
  clientId?: string
  description?: string
  startTime: Date
  endTime?: Date
  duration?: number
  status: TimeEntryStatus
  type: TimeEntryType
  isBillable: boolean
  hourlyRate?: number
  totalAmount?: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  task?: {
    id: string
    title: string
    status: string
  }
}

export interface TimeBudgetResult {
  id: string
  organizationId: string
  name: string
  description?: string
  taskId?: string
  projectId?: string
  clientId?: string
  userId?: string
  budgetHours: number
  usedHours: number
  startDate: Date
  endDate: Date
  alertThreshold?: number
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export class TimeTrackingService {
  // Start a new time entry
  static async startTimeEntry(
    organizationId: string,
    userId: string,
    entryData: TimeEntryData
  ): Promise<TimeEntryResult> {
    // Stop any running time entries for the user
    await this.stopRunningEntries(organizationId, userId)

    const timeEntry = await prisma.timeEntry.create({
      data: {
        organizationId,
        userId,
        taskId: entryData.taskId,
        projectId: entryData.projectId,
        clientId: entryData.clientId,
        description: entryData.description,
        startTime: entryData.startTime,
        type: entryData.type,
        isBillable: entryData.isBillable ?? true,
        hourlyRate: entryData.hourlyRate ? entryData.hourlyRate.toString() : null,
        tags: entryData.tags || [],
        status: TimeEntryStatus.RUNNING
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    return timeEntry as TimeEntryResult
  }

  // Stop a running time entry
  static async stopTimeEntry(
    entryId: string,
    endTime: Date,
    userId: string
  ): Promise<TimeEntryResult> {
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: entryId,
        userId,
        status: TimeEntryStatus.RUNNING
      }
    })

    if (!timeEntry) {
      throw new Error('Time entry not found or not running')
    }

    const duration = Math.round((endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60))
    const totalAmount = timeEntry.hourlyRate && timeEntry.isBillable 
      ? (parseFloat(timeEntry.hourlyRate.toString()) * (duration / 60))
      : null

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        endTime,
        duration,
        totalAmount: totalAmount ? totalAmount.toString() : null,
        status: TimeEntryStatus.STOPPED
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    return updatedEntry as TimeEntryResult
  }

  // Update a time entry
  static async updateTimeEntry(
    entryId: string,
    updateData: TimeEntryUpdateData,
    userId: string
  ): Promise<TimeEntryResult> {
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: entryId,
        userId
      }
    })

    if (!timeEntry) {
      throw new Error('Time entry not found')
    }

    // Calculate new duration and total if endTime is updated
    let duration = timeEntry.duration
    let totalAmount = timeEntry.totalAmount

    if (updateData.endTime && timeEntry.startTime) {
      duration = Math.round((updateData.endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60))
      
      const hourlyRate = updateData.hourlyRate ?? (timeEntry.hourlyRate ? parseFloat(timeEntry.hourlyRate.toString()) : null)
      const isBillable = updateData.isBillable ?? timeEntry.isBillable
      
      if (hourlyRate && isBillable) {
        totalAmount = hourlyRate * (duration / 60)
      }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        description: updateData.description,
        endTime: updateData.endTime,
        duration,
        type: updateData.type,
        isBillable: updateData.isBillable,
        hourlyRate: updateData.hourlyRate ? updateData.hourlyRate.toString() : undefined,
        totalAmount: totalAmount ? totalAmount.toString() : undefined,
        tags: updateData.tags
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    return updatedEntry as TimeEntryResult
  }

  // Get time entries with filters
  static async getTimeEntries(
    organizationId: string,
    filters: TimeTrackingFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: TimeEntryResult[], total: number }> {
    const where: any = {
      organizationId
    }

    if (filters.userId) where.userId = filters.userId
    if (filters.taskId) where.taskId = filters.taskId
    if (filters.projectId) where.projectId = filters.projectId
    if (filters.clientId) where.clientId = filters.clientId
    if (filters.status) where.status = { in: filters.status }
    if (filters.type) where.type = { in: filters.type }
    if (filters.isBillable !== undefined) where.isBillable = filters.isBillable
    if (filters.startDate || filters.endDate) {
      where.startTime = {}
      if (filters.startDate) where.startTime.gte = filters.startDate
      if (filters.endDate) where.startTime.lte = filters.endDate
    }
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags }
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.timeEntry.count({ where })
    ])

    return { entries: entries as TimeEntryResult[], total }
  }

  // Get running time entry for user
  static async getRunningTimeEntry(
    organizationId: string,
    userId: string
  ): Promise<TimeEntryResult | null> {
    const entry = await prisma.timeEntry.findFirst({
      where: {
        organizationId,
        userId,
        status: TimeEntryStatus.RUNNING
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    return entry as TimeEntryResult | null
  }

  // Stop all running entries for a user
  static async stopRunningEntries(
    organizationId: string,
    userId: string
  ): Promise<void> {
    const runningEntries = await prisma.timeEntry.findMany({
      where: {
        organizationId,
        userId,
        status: TimeEntryStatus.RUNNING
      }
    })

    const now = new Date()
    
    for (const entry of runningEntries) {
      const duration = Math.round((now.getTime() - entry.startTime.getTime()) / (1000 * 60))
      const totalAmount = entry.hourlyRate && entry.isBillable 
        ? (parseFloat(entry.hourlyRate.toString()) * (duration / 60))
        : null

      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          endTime: now,
          duration,
          totalAmount: totalAmount ? totalAmount.toString() : null,
          status: TimeEntryStatus.STOPPED
        }
      })
    }
  }

  // Get time tracking summary
  static async getTimeTrackingSummary(
    organizationId: string,
    filters: TimeTrackingFilters
  ): Promise<TimeTrackingSummary> {
    const where: any = {
      organizationId,
      status: { not: TimeEntryStatus.RUNNING }
    }

    if (filters.userId) where.userId = filters.userId
    if (filters.taskId) where.taskId = filters.taskId
    if (filters.startDate || filters.endDate) {
      where.startTime = {}
      if (filters.startDate) where.startTime.gte = filters.startDate
      if (filters.endDate) where.startTime.lte = filters.endDate
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      select: {
        duration: true,
        isBillable: true,
        totalAmount: true
      }
    })

    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const billableMinutes = entries
      .filter(entry => entry.isBillable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0)
    
    const totalHours = totalMinutes / 60
    const billableHours = billableMinutes / 60
    const nonBillableHours = totalHours - billableHours
    
    const totalAmount = entries.reduce((sum, entry) => {
      return sum + (entry.totalAmount ? parseFloat(entry.totalAmount.toString()) : 0)
    }, 0)

    const entriesCount = entries.length
    
    // Calculate average hours per day
    const daysDiff = filters.startDate && filters.endDate 
      ? Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 1
    const averageHoursPerDay = totalHours / daysDiff

    // Simple productivity score based on billable ratio
    const productivityScore = totalHours > 0 ? (billableHours / totalHours) * 100 : 0

    return {
      totalHours,
      billableHours,
      nonBillableHours,
      totalAmount,
      entriesCount,
      averageHoursPerDay,
      productivityScore
    }
  }

  // Create time budget
  static async createTimeBudget(
    organizationId: string,
    budgetData: TimeBudgetData,
    createdBy: string
  ): Promise<TimeBudgetResult> {
    const budget = await prisma.timeBudget.create({
      data: {
        organizationId,
        name: budgetData.name,
        description: budgetData.description,
        taskId: budgetData.taskId,
        projectId: budgetData.projectId,
        clientId: budgetData.clientId,
        userId: budgetData.userId,
        budgetHours: budgetData.budgetHours.toString(),
        startDate: budgetData.startDate,
        endDate: budgetData.endDate,
        alertThreshold: budgetData.alertThreshold?.toString(),
        createdBy
      }
    })

    return budget as TimeBudgetResult
  }

  // Update time budget usage
  static async updateTimeBudgetUsage(budgetId: string): Promise<void> {
    const budget = await prisma.timeBudget.findUnique({
      where: { id: budgetId }
    })

    if (!budget) return

    const where: any = {
      organizationId: budget.organizationId,
      startTime: {
        gte: budget.startDate,
        lte: budget.endDate
      },
      status: { not: TimeEntryStatus.RUNNING }
    }

    if (budget.taskId) where.taskId = budget.taskId
    if (budget.userId) where.userId = budget.userId

    const entries = await prisma.timeEntry.findMany({
      where,
      select: { duration: true }
    })

    const usedMinutes = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const usedHours = usedMinutes / 60

    await prisma.timeBudget.update({
      where: { id: budgetId },
      data: { usedHours: usedHours.toString() }
    })
  }

  // Generate productivity metrics
  static async generateProductivityMetrics(
    organizationId: string,
    userId: string,
    date: Date
  ): Promise<ProductivityMetricData> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const entries = await prisma.timeEntry.findMany({
      where: {
        organizationId,
        userId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: TimeEntryStatus.RUNNING }
      },
      include: {
        task: true
      }
    })

    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const billableMinutes = entries
      .filter(entry => entry.isBillable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0)

    const totalHours = totalMinutes / 60
    const billableHours = billableMinutes / 60

    // Count completed tasks
    const tasksCompleted = entries
      .filter(entry => entry.task?.status === 'COMPLETED')
      .length

    // Calculate focus score (fewer, longer entries = better focus)
    const focusScore = entries.length > 0 
      ? Math.min(1, (totalMinutes / entries.length) / 120) // 2 hours = perfect focus
      : 0

    // Calculate efficiency score (billable ratio)
    const efficiencyScore = totalHours > 0 ? billableHours / totalHours : 0

    // Calculate utilization rate (assuming 8-hour workday)
    const utilizationRate = Math.min(1, totalHours / 8)

    const metrics: ProductivityMetricData = {
      userId,
      date,
      totalHours,
      billableHours,
      tasksCompleted,
      focusScore,
      efficiencyScore,
      utilizationRate
    }

    // Save metrics to database
    await prisma.productivityMetric.upsert({
      where: {
        organizationId_userId_date: {
          organizationId,
          userId,
          date
        }
      },
      update: {
        totalHours: totalHours.toString(),
        billableHours: billableHours.toString(),
        tasksCompleted,
        focusScore: focusScore.toString(),
        efficiencyScore: efficiencyScore.toString(),
        utilizationRate: utilizationRate.toString(),
        calculatedAt: new Date()
      },
      create: {
        organizationId,
        userId,
        date,
        totalHours: totalHours.toString(),
        billableHours: billableHours.toString(),
        tasksCompleted,
        focusScore: focusScore.toString(),
        efficiencyScore: efficiencyScore.toString(),
        utilizationRate: utilizationRate.toString()
      }
    })

    return metrics
  }

  // Generate time report
  static async generateTimeReport(
    organizationId: string,
    reportData: TimeReportData,
    generatedBy: string
  ): Promise<any> {
    const filters: TimeTrackingFilters = {
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      ...reportData.filters
    }

    let data: any = {}

    switch (reportData.reportType) {
      case 'timesheet':
        data = await this.generateTimesheetReport(organizationId, filters)
        break
      case 'productivity':
        data = await this.generateProductivityReport(organizationId, filters)
        break
      case 'billing':
        data = await this.generateBillingReport(organizationId, filters)
        break
      case 'project':
        data = await this.generateProjectReport(organizationId, filters)
        break
    }

    const report = await prisma.timeReport.create({
      data: {
        organizationId,
        name: reportData.name,
        description: reportData.description,
        reportType: reportData.reportType,
        filters: reportData.filters as any,
        generatedBy,
        startDate: reportData.startDate,
        endDate: reportData.endDate,
        data: data as any,
        isScheduled: reportData.isScheduled || false,
        scheduleConfig: reportData.scheduleConfig as any
      }
    })

    return report
  }

  // Generate timesheet report
  private static async generateTimesheetReport(
    organizationId: string,
    filters: TimeTrackingFilters
  ): Promise<any> {
    const { entries } = await this.getTimeEntries(organizationId, filters, 1, 1000)
    const summary = await this.getTimeTrackingSummary(organizationId, filters)

    return {
      summary,
      entries: entries.map(entry => ({
        id: entry.id,
        user: entry.user,
        task: entry.task,
        description: entry.description,
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        type: entry.type,
        isBillable: entry.isBillable,
        hourlyRate: entry.hourlyRate,
        totalAmount: entry.totalAmount,
        tags: entry.tags
      }))
    }
  }

  // Generate productivity report
  private static async generateProductivityReport(
    organizationId: string,
    filters: TimeTrackingFilters
  ): Promise<any> {
    const metrics = await prisma.productivityMetric.findMany({
      where: {
        organizationId,
        userId: filters.userId,
        date: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    return {
      metrics: metrics.map(metric => ({
        date: metric.date,
        user: metric.user,
        totalHours: parseFloat(metric.totalHours.toString()),
        billableHours: parseFloat(metric.billableHours.toString()),
        tasksCompleted: metric.tasksCompleted,
        focusScore: metric.focusScore ? parseFloat(metric.focusScore.toString()) : null,
        efficiencyScore: metric.efficiencyScore ? parseFloat(metric.efficiencyScore.toString()) : null,
        utilizationRate: metric.utilizationRate ? parseFloat(metric.utilizationRate.toString()) : null
      }))
    }
  }

  // Generate billing report
  private static async generateBillingReport(
    organizationId: string,
    filters: TimeTrackingFilters
  ): Promise<any> {
    const billableFilters = { ...filters, isBillable: true }
    const { entries } = await this.getTimeEntries(organizationId, billableFilters, 1, 1000)
    const summary = await this.getTimeTrackingSummary(organizationId, billableFilters)

    return {
      summary,
      billableEntries: entries.filter(entry => entry.isBillable),
      totalBillableAmount: summary.totalAmount
    }
  }

  // Generate project report
  private static async generateProjectReport(
    organizationId: string,
    filters: TimeTrackingFilters
  ): Promise<any> {
    const { entries } = await this.getTimeEntries(organizationId, filters, 1, 1000)
    
    // Group by project/task
    const projectSummary = entries.reduce((acc, entry) => {
      const key = entry.taskId || 'unassigned'
      if (!acc[key]) {
        acc[key] = {
          task: entry.task,
          totalHours: 0,
          billableHours: 0,
          totalAmount: 0,
          entries: []
        }
      }
      
      acc[key].totalHours += (entry.duration || 0) / 60
      if (entry.isBillable) {
        acc[key].billableHours += (entry.duration || 0) / 60
        acc[key].totalAmount += entry.totalAmount ? parseFloat(entry.totalAmount.toString()) : 0
      }
      acc[key].entries.push(entry)
      
      return acc
    }, {} as any)

    return { projectSummary }
  }
}