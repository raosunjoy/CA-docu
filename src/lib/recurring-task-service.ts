// Recurring Task Service
// Handles creation, management, and generation of recurring tasks

import prisma from '@/lib/prisma'
import { RecurringTaskData, RecurringTaskUpdateData, TaskCreationData } from '@/types'
import { RecurrencePattern, RecurrenceEndType, TaskPriority } from '@prisma/client'
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, startOfDay } from 'date-fns'

export class RecurringTaskService {
  /**
   * Create a new recurring task
   */
  static async createRecurringTask(
    organizationId: string,
    data: RecurringTaskData
  ) {
    const nextDue = this.calculateNextDueDate(data.startDate, data)
    
    const recurringTask = await prisma.recurringTask.create({
      data: {
        organizationId,
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        assignedTo: data.assignedTo,
        createdBy: data.assignedTo || '', // This should come from auth context
        pattern: data.pattern,
        interval: data.interval || 1,
        daysOfWeek: data.daysOfWeek || [],
        dayOfMonth: data.dayOfMonth,
        monthsOfYear: data.monthsOfYear || [],
        customCron: data.customCron,
        startDate: data.startDate,
        endType: data.endType || 'NEVER',
        endDate: data.endDate,
        maxOccurrences: data.maxOccurrences,
        estimatedHours: data.estimatedHours,
        requiresApproval: data.requiresApproval || false,
        templateData: data.templateData || {},
        nextDue,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return recurringTask
  }

  /**
   * Update a recurring task
   */
  static async updateRecurringTask(
    id: string,
    organizationId: string,
    data: RecurringTaskUpdateData
  ) {
    const existing = await prisma.recurringTask.findFirst({
      where: { id, organizationId },
    })

    if (!existing) {
      throw new Error('Recurring task not found')
    }

    // Recalculate next due date if pattern changed
    let nextDue = existing.nextDue
    if (
      data.pattern ||
      data.interval ||
      data.daysOfWeek ||
      data.dayOfMonth ||
      data.monthsOfYear ||
      data.customCron
    ) {
      const updatedData = { ...existing, ...data }
      nextDue = this.calculateNextDueDate(existing.startDate, updatedData)
    }

    const recurringTask = await prisma.recurringTask.update({
      where: { id },
      data: {
        ...data,
        nextDue,
        updatedAt: new Date(),
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return recurringTask
  }

  /**
   * Generate due tasks from recurring tasks
   */
  static async generateDueTasks() {
    const now = new Date()
    
    const dueRecurringTasks = await prisma.recurringTask.findMany({
      where: {
        isActive: true,
        isPaused: false,
        nextDue: {
          lte: now,
        },
      },
      include: {
        assignedUser: true,
        createdByUser: true,
      },
    })

    const generatedTasks = []

    for (const recurringTask of dueRecurringTasks) {
      try {
        // Check if we should stop generating (end conditions)
        if (this.shouldStopGenerating(recurringTask)) {
          await prisma.recurringTask.update({
            where: { id: recurringTask.id },
            data: { isActive: false },
          })
          continue
        }

        // Generate the task
        const taskData: TaskCreationData = {
          title: `${recurringTask.title} (#${recurringTask.totalGenerated + 1})`,
          description: recurringTask.description,
          status: 'TODO',
          priority: recurringTask.priority,
          assignedTo: recurringTask.assignedTo,
          createdBy: recurringTask.createdBy,
          organizationId: recurringTask.organizationId,
          dueDate: recurringTask.nextDue,
          estimatedHours: recurringTask.estimatedHours,
          isRecurring: true,
          recurringTaskId: recurringTask.id,
          instanceNumber: recurringTask.totalGenerated + 1,
          requiresApproval: recurringTask.requiresApproval,
          metadata: {
            ...recurringTask.templateData,
            recurringTaskId: recurringTask.id,
            instanceNumber: recurringTask.totalGenerated + 1,
          },
        }

        const task = await prisma.task.create({
          data: taskData,
          include: {
            assignedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })

        generatedTasks.push(task)

        // Calculate next due date
        const nextDue = this.calculateNextDueDate(recurringTask.nextDue!, recurringTask)

        // Update recurring task
        await prisma.recurringTask.update({
          where: { id: recurringTask.id },
          data: {
            lastGenerated: now,
            nextDue,
            totalGenerated: recurringTask.totalGenerated + 1,
          },
        })
      } catch (error) {
        console.error(`Error generating task for recurring task ${recurringTask.id}:`, error)
      }
    }

    return generatedTasks
  }

  /**
   * Calculate the next due date based on recurrence pattern
   */
  private static calculateNextDueDate(
    fromDate: Date,
    recurringTask: Partial<RecurringTaskData> & { pattern: RecurrencePattern }
  ): Date {
    const { pattern, interval = 1, daysOfWeek, dayOfMonth, monthsOfYear, customCron } = recurringTask
    
    let nextDate = new Date(fromDate)

    switch (pattern) {
      case 'DAILY':
        nextDate = addDays(fromDate, interval)
        break

      case 'WEEKLY':
        if (daysOfWeek && daysOfWeek.length > 0) {
          // Find next occurrence of specified days
          nextDate = this.getNextWeeklyOccurrence(fromDate, daysOfWeek, interval)
        } else {
          nextDate = addWeeks(fromDate, interval)
        }
        break

      case 'MONTHLY':
        if (dayOfMonth) {
          nextDate = addMonths(fromDate, interval)
          nextDate.setDate(dayOfMonth)
        } else {
          nextDate = addMonths(fromDate, interval)
        }
        break

      case 'QUARTERLY':
        nextDate = addMonths(fromDate, 3 * interval)
        break

      case 'YEARLY':
        if (monthsOfYear && monthsOfYear.length > 0) {
          nextDate = this.getNextYearlyOccurrence(fromDate, monthsOfYear, dayOfMonth, interval)
        } else {
          nextDate = addYears(fromDate, interval)
        }
        break

      case 'CUSTOM':
        if (customCron) {
          // For now, we'll implement basic cron parsing
          // In production, use a proper cron library like node-cron
          nextDate = this.parseCustomCron(fromDate, customCron)
        }
        break

      default:
        nextDate = addDays(fromDate, 1)
    }

    return startOfDay(nextDate)
  }

  /**
   * Get next weekly occurrence based on days of week
   */
  private static getNextWeeklyOccurrence(
    fromDate: Date,
    daysOfWeek: number[],
    interval: number
  ): Date {
    const currentDay = fromDate.getDay()
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b)
    
    // Find next day in current week
    const nextDayInWeek = sortedDays.find(day => day > currentDay)
    
    if (nextDayInWeek !== undefined) {
      const daysToAdd = nextDayInWeek - currentDay
      return addDays(fromDate, daysToAdd)
    } else {
      // Move to next week and use first day
      const daysToNextWeek = 7 - currentDay + sortedDays[0]
      const weeksToAdd = interval - 1
      return addDays(fromDate, daysToNextWeek + (weeksToAdd * 7))
    }
  }

  /**
   * Get next yearly occurrence based on months
   */
  private static getNextYearlyOccurrence(
    fromDate: Date,
    monthsOfYear: number[],
    dayOfMonth?: number,
    interval: number = 1
  ): Date {
    const currentMonth = fromDate.getMonth() + 1
    const currentYear = fromDate.getFullYear()
    const day = dayOfMonth || fromDate.getDate()
    
    const sortedMonths = [...monthsOfYear].sort((a, b) => a - b)
    
    // Find next month in current year
    const nextMonthInYear = sortedMonths.find(month => month > currentMonth)
    
    if (nextMonthInYear !== undefined) {
      return new Date(currentYear, nextMonthInYear - 1, day)
    } else {
      // Move to next year and use first month
      return new Date(currentYear + interval, sortedMonths[0] - 1, day)
    }
  }

  /**
   * Basic custom cron parsing (simplified)
   */
  private static parseCustomCron(fromDate: Date, cronExpression: string): Date {
    // This is a simplified implementation
    // In production, use a proper cron library
    
    // For now, just add one day as fallback
    return addDays(fromDate, 1)
  }

  /**
   * Check if we should stop generating tasks
   */
  private static shouldStopGenerating(recurringTask: any): boolean {
    const now = new Date()

    if (recurringTask.endType === 'ON_DATE' && recurringTask.endDate) {
      return isAfter(now, recurringTask.endDate)
    }

    if (recurringTask.endType === 'AFTER_OCCURRENCES' && recurringTask.maxOccurrences) {
      return recurringTask.totalGenerated >= recurringTask.maxOccurrences
    }

    return false
  }

  /**
   * Get recurring tasks for an organization
   */
  static async getRecurringTasks(
    organizationId: string,
    filters: {
      isActive?: boolean
      assignedTo?: string
      pattern?: RecurrencePattern
    } = {}
  ) {
    const where: any = { organizationId }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters.assignedTo) {
      where.assignedTo = filters.assignedTo
    }

    if (filters.pattern) {
      where.pattern = filters.pattern
    }

    return prisma.recurringTask.findMany({
      where,
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            generatedTasks: true,
          },
        },
      },
      orderBy: {
        nextDue: 'asc',
      },
    })
  }

  /**
   * Delete a recurring task
   */
  static async deleteRecurringTask(id: string, organizationId: string) {
    const recurringTask = await prisma.recurringTask.findFirst({
      where: { id, organizationId },
    })

    if (!recurringTask) {
      throw new Error('Recurring task not found')
    }

    // Soft delete by marking as inactive
    return prisma.recurringTask.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Pause/Resume a recurring task
   */
  static async toggleRecurringTask(id: string, organizationId: string, isPaused: boolean) {
    const recurringTask = await prisma.recurringTask.findFirst({
      where: { id, organizationId },
    })

    if (!recurringTask) {
      throw new Error('Recurring task not found')
    }

    return prisma.recurringTask.update({
      where: { id },
      data: {
        isPaused,
        updatedAt: new Date(),
      },
    })
  }
}