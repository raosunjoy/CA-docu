// Task Suggestion Service
// Provides intelligent task suggestions based on patterns and user behavior

import prisma from '@/lib/prisma'
import { TaskSuggestionData, SmartTaskSuggestion } from '@/types'
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns'

export class TaskSuggestionService {
  /**
   * Generate smart task suggestions for a user
   */
  static async generateSuggestions(
    userId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<SmartTaskSuggestion[]> {
    const suggestions: SmartTaskSuggestion[] = []

    // Get recurring task suggestions
    const recurringsuggestions = await this.getRecurringTaskSuggestions(userId, organizationId)
    suggestions.push(...recurringSuggestions)

    // Get similar task suggestions
    const similarSuggestions = await this.getSimilarTaskSuggestions(userId, organizationId)
    suggestions.push(...similarSuggestions)

    // Get workload-based suggestions
    const workloadSuggestions = await this.getWorkloadBasedSuggestions(userId, organizationId)
    suggestions.push(...workloadSuggestions)

    // Get deadline-based suggestions
    const deadlineSuggestions = await this.getDeadlineBasedSuggestions(userId, organizationId)
    suggestions.push(...deadlineSuggestions)

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  /**
   * Get suggestions based on recurring patterns
   */
  private static async getRecurringTaskSuggestions(
    userId: string,
    organizationId: string
  ): Promise<SmartTaskSuggestion[]> {
    const suggestions: SmartTaskSuggestion[] = []
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)

    // Find tasks that user has completed multiple times
    const completedTasks = await prisma.task.findMany({
      where: {
        organizationId,
        assignedTo: userId,
        status: 'COMPLETED',
        completedAt: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    // Group by similar titles (fuzzy matching)
    const taskGroups = this.groupSimilarTasks(completedTasks)

    for (const [pattern, tasks] of taskGroups.entries()) {
      if (tasks.length >= 2) { // At least 2 occurrences
        const avgInterval = this.calculateAverageInterval(tasks)
        const lastTask = tasks[0] // Most recent
        const expectedNextDate = addDays(lastTask.completedAt!, avgInterval)

        // Check if we're within the expected timeframe
        const daysDiff = Math.abs((expectedNextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff <= 2) { // Within 2 days of expected date
          const confidence = Math.min(0.9, 0.5 + (tasks.length * 0.1))
          
          suggestions.push({
            id: `recurring-${pattern}`,
            type: 'recurring',
            title: this.generateRecurringTitle(pattern),
            description: `Based on your pattern of completing similar tasks every ${avgInterval} days`,
            confidence,
            suggestedData: {
              title: this.generateRecurringTitle(pattern),
              description: lastTask.description,
              priority: this.getMostCommonPriority(tasks),
              estimatedHours: this.getAverageEstimatedHours(tasks),
              dueDate: expectedNextDate,
            },
            reasoning: [
              `You've completed ${tasks.length} similar tasks`,
              `Average interval: ${avgInterval} days`,
              `Expected next occurrence: ${expectedNextDate.toDateString()}`,
            ],
            expiresAt: addDays(now, 7),
            status: 'pending',
          })
        }
      }
    }

    return suggestions
  }

  /**
   * Get suggestions based on similar completed tasks
   */
  private static async getSimilarTaskSuggestions(
    userId: string,
    organizationId: string
  ): Promise<SmartTaskSuggestion[]> {
    const suggestions: SmartTaskSuggestion[] = []
    const now = new Date()
    const sevenDaysAgo = subDays(now, 7)

    // Get recently completed tasks by other users
    const recentTasks = await prisma.task.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        assignedTo: { not: userId },
        completedAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 50,
    })

    // Get user's role and recent tasks for comparison
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    const userRecentTasks = await prisma.task.findMany({
      where: {
        organizationId,
        assignedTo: userId,
        createdAt: {
          gte: subDays(now, 30),
        },
      },
      select: {
        title: true,
        description: true,
      },
    })

    for (const task of recentTasks) {
      // Check if user has similar role
      const roleMatch = task.assignedUser?.role === user?.role
      
      // Check if task is similar to user's recent tasks
      const similarityScore = this.calculateTaskSimilarity(task, userRecentTasks)
      
      // Check if user hasn't done this exact task recently
      const hasRecentSimilar = userRecentTasks.some(userTask => 
        this.calculateStringSimilarity(userTask.title, task.title) > 0.8
      )

      if (roleMatch && similarityScore > 0.3 && !hasRecentSimilar) {
        const confidence = Math.min(0.8, 0.3 + (similarityScore * 0.3) + (roleMatch ? 0.2 : 0))
        
        suggestions.push({
          id: `similar-${task.id}`,
          type: 'similar',
          title: `Consider: ${task.title}`,
          description: `Similar to tasks completed by colleagues in your role`,
          confidence,
          suggestedData: {
            title: task.title,
            description: task.description,
            priority: task.priority,
            estimatedHours: task.estimatedHours,
          },
          reasoning: [
            `Completed by ${task.assignedUser?.firstName} ${task.assignedUser?.lastName}`,
            `Similar role: ${task.assignedUser?.role}`,
            `Similarity score: ${Math.round(similarityScore * 100)}%`,
          ],
          expiresAt: addDays(now, 5),
          status: 'pending',
        })
      }
    }

    return suggestions.slice(0, 3) // Limit similar suggestions
  }

  /**
   * Get suggestions based on workload optimization
   */
  private static async getWorkloadBasedSuggestions(
    userId: string,
    organizationId: string
  ): Promise<SmartTaskSuggestion[]> {
    const suggestions: SmartTaskSuggestion[] = []
    const now = new Date()

    // Get user's current workload
    const activeTasks = await prisma.task.count({
      where: {
        organizationId,
        assignedTo: userId,
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
      },
    })

    // Get recent workload metrics
    const recentMetrics = await prisma.workloadMetric.findFirst({
      where: {
        organizationId,
        userId,
        date: {
          gte: subDays(now, 7),
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // If user has low workload, suggest taking on more tasks
    if (activeTasks < 3 || (recentMetrics && recentMetrics.utilizationRate < 0.7)) {
      // Find unassigned tasks that match user's skills
      const unassignedTasks = await prisma.task.findMany({
        where: {
          organizationId,
          assignedTo: null,
          status: 'TODO',
          createdAt: {
            gte: subDays(now, 7),
          },
        },
        orderBy: {
          priority: 'desc',
        },
        take: 5,
      })

      for (const task of unassignedTasks) {
        const confidence = 0.6 + (activeTasks < 2 ? 0.2 : 0)
        
        suggestions.push({
          id: `workload-${task.id}`,
          type: 'workload',
          title: `Take on: ${task.title}`,
          description: 'You have capacity to take on additional work',
          confidence,
          suggestedData: {
            taskId: task.id,
            action: 'assign_to_self',
          },
          reasoning: [
            `Current active tasks: ${activeTasks}`,
            recentMetrics ? `Utilization rate: ${Math.round(recentMetrics.utilizationRate * 100)}%` : 'Low current workload',
            `Task priority: ${task.priority}`,
          ],
          expiresAt: addDays(now, 3),
          status: 'pending',
        })
      }
    }

    return suggestions
  }

  /**
   * Get suggestions based on upcoming deadlines
   */
  private static async getDeadlineBasedSuggestions(
    userId: string,
    organizationId: string
  ): Promise<SmartTaskSuggestion[]> {
    const suggestions: SmartTaskSuggestion[] = []
    const now = new Date()
    const nextWeek = addDays(now, 7)

    // Find tasks with upcoming deadlines that might need preparation
    const upcomingTasks = await prisma.task.findMany({
      where: {
        organizationId,
        assignedTo: userId,
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
        dueDate: {
          gte: now,
          lte: nextWeek,
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    })

    for (const task of upcomingTasks) {
      const daysUntilDue = Math.ceil((task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Suggest preparation tasks for complex tasks
      if (task.estimatedHours && task.estimatedHours > 4 && daysUntilDue <= 3) {
        const confidence = 0.7 + (daysUntilDue <= 1 ? 0.2 : 0)
        
        suggestions.push({
          id: `deadline-prep-${task.id}`,
          type: 'deadline',
          title: `Prepare for: ${task.title}`,
          description: `Create preparation tasks for upcoming deadline`,
          confidence,
          suggestedData: {
            title: `Preparation for ${task.title}`,
            description: `Gather resources and plan approach for ${task.title}`,
            priority: 'HIGH',
            parentTaskId: task.id,
            estimatedHours: 1,
            dueDate: addDays(now, Math.max(1, daysUntilDue - 1)),
          },
          reasoning: [
            `Main task due in ${daysUntilDue} days`,
            `Estimated ${task.estimatedHours} hours of work`,
            'Complex task may benefit from preparation',
          ],
          expiresAt: task.dueDate!,
          status: 'pending',
        })
      }

      // Suggest breaking down large tasks
      if (task.estimatedHours && task.estimatedHours > 8 && daysUntilDue > 1) {
        const confidence = 0.6
        
        suggestions.push({
          id: `deadline-breakdown-${task.id}`,
          type: 'deadline',
          title: `Break down: ${task.title}`,
          description: `Consider breaking this large task into smaller subtasks`,
          confidence,
          suggestedData: {
            action: 'break_down_task',
            taskId: task.id,
            suggestedSubtasks: Math.ceil(task.estimatedHours / 4),
          },
          reasoning: [
            `Large task: ${task.estimatedHours} estimated hours`,
            `Due in ${daysUntilDue} days`,
            'Breaking down can improve progress tracking',
          ],
          expiresAt: addDays(task.dueDate!, -1),
          status: 'pending',
        })
      }
    }

    return suggestions
  }

  /**
   * Create a task suggestion
   */
  static async createSuggestion(
    organizationId: string,
    data: TaskSuggestionData
  ) {
    return prisma.taskSuggestion.create({
      data: {
        organizationId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        confidence: data.confidence,
        suggestedData: data.suggestedData,
        reasoning: data.reasoning,
        expiresAt: data.expiresAt,
      },
    })
  }

  /**
   * Get suggestions for a user
   */
  static async getSuggestions(
    userId: string,
    organizationId: string,
    filters: {
      type?: string
      status?: string
      minConfidence?: number
    } = {}
  ) {
    const where: any = {
      organizationId,
      userId,
      expiresAt: {
        gt: new Date(),
      },
    }

    if (filters.type) {
      where.type = filters.type
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.minConfidence) {
      where.confidence = {
        gte: filters.minConfidence,
      }
    }

    return prisma.taskSuggestion.findMany({
      where,
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  }

  /**
   * Respond to a suggestion
   */
  static async respondToSuggestion(
    id: string,
    userId: string,
    organizationId: string,
    status: 'accepted' | 'rejected'
  ) {
    const suggestion = await prisma.taskSuggestion.findFirst({
      where: {
        id,
        userId,
        organizationId,
      },
    })

    if (!suggestion) {
      throw new Error('Suggestion not found')
    }

    const updatedSuggestion = await prisma.taskSuggestion.update({
      where: { id },
      data: {
        status,
        respondedAt: new Date(),
      },
    })

    // If accepted, create the suggested task
    if (status === 'accepted' && suggestion.suggestedData) {
      const suggestedData = suggestion.suggestedData as any
      
      if (suggestedData.title) {
        const taskData = {
          title: suggestedData.title,
          description: suggestedData.description,
          status: suggestedData.status || 'TODO',
          priority: suggestedData.priority || 'MEDIUM',
          assignedTo: userId,
          createdBy: userId,
          organizationId,
          parentTaskId: suggestedData.parentTaskId,
          dueDate: suggestedData.dueDate ? new Date(suggestedData.dueDate) : undefined,
          estimatedHours: suggestedData.estimatedHours,
          metadata: {
            ...suggestedData.metadata,
            fromSuggestion: true,
            suggestionId: id,
            suggestionType: suggestion.type,
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
          },
        })

        return { suggestion: updatedSuggestion, createdTask: task }
      }
    }

    return { suggestion: updatedSuggestion }
  }

  /**
   * Clean up expired suggestions
   */
  static async cleanupExpiredSuggestions() {
    const now = new Date()
    
    const result = await prisma.taskSuggestion.updateMany({
      where: {
        status: 'pending',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'expired',
      },
    })

    return result.count
  }

  // Helper methods

  private static groupSimilarTasks(tasks: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()
    
    for (const task of tasks) {
      const pattern = this.extractTaskPattern(task.title)
      
      if (!groups.has(pattern)) {
        groups.set(pattern, [])
      }
      
      groups.get(pattern)!.push(task)
    }
    
    return groups
  }

  private static extractTaskPattern(title: string): string {
    // Remove numbers, dates, and common variations
    return title
      .replace(/\d+/g, 'X')
      .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, 'MONTH')
      .replace(/\b\d{4}\b/g, 'YEAR')
      .toLowerCase()
      .trim()
  }

  private static calculateAverageInterval(tasks: any[]): number {
    if (tasks.length < 2) return 7 // Default to weekly

    const intervals = []
    for (let i = 1; i < tasks.length; i++) {
      const diff = Math.abs(
        (tasks[i - 1].completedAt.getTime() - tasks[i].completedAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      intervals.push(diff)
    }

    return Math.round(intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length)
  }

  private static getMostCommonPriority(tasks: any[]): string {
    const priorities = tasks.map(task => task.priority)
    const counts = priorities.reduce((acc, priority) => {
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b)
  }

  private static getAverageEstimatedHours(tasks: any[]): number | null {
    const hoursArray = tasks
      .filter(task => task.estimatedHours)
      .map(task => task.estimatedHours)

    if (hoursArray.length === 0) return null

    return Math.round(hoursArray.reduce((sum, hours) => sum + hours, 0) / hoursArray.length)
  }

  private static generateRecurringTitle(pattern: string): string {
    return pattern
      .replace(/X/g, '#')
      .replace(/MONTH/g, 'Monthly')
      .replace(/YEAR/g, 'Annual')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  private static calculateTaskSimilarity(task: any, userTasks: any[]): number {
    if (userTasks.length === 0) return 0

    const taskText = `${task.title} ${task.description || ''}`.toLowerCase()
    
    let maxSimilarity = 0
    for (const userTask of userTasks) {
      const userText = `${userTask.title} ${userTask.description || ''}`.toLowerCase()
      const similarity = this.calculateStringSimilarity(taskText, userText)
      maxSimilarity = Math.max(maxSimilarity, similarity)
    }

    return maxSimilarity
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(str1.split(/\s+/))
    const words2 = new Set(str2.split(/\s+/))
    
    const intersection = new Set([...words1].filter(word => words2.has(word)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }
}