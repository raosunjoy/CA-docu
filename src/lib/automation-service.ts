// Task Automation Service
// Handles automation rules, triggers, and execution

import prisma from '@/lib/prisma'
import { 
  AutomationRuleData, 
  AutomationTriggerData, 
  AutomationCondition, 
  AutomationAction,
  TaskAssignmentSuggestion 
} from '@/types'
import { TriggerType, ActionType, TaskStatus, TaskPriority } from '@prisma/client'
import { addHours, addDays, isBefore, isAfter } from 'date-fns'

export class AutomationService {
  /**
   * Create a new automation rule
   */
  static async createAutomationRule(
    organizationId: string,
    createdBy: string,
    data: AutomationRuleData
  ) {
    const rule = await prisma.automationRule.create({
      data: {
        organizationId,
        createdBy,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        conditions: data.conditions,
        actions: data.actions,
        priority: data.priority || 0,
        cooldownMinutes: data.cooldownMinutes,
        maxExecutions: data.maxExecutions,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return rule
  }

  /**
   * Update an automation rule
   */
  static async updateAutomationRule(
    id: string,
    organizationId: string,
    data: Partial<AutomationRuleData>
  ) {
    const rule = await prisma.automationRule.findFirst({
      where: { id, organizationId },
    })

    if (!rule) {
      throw new Error('Automation rule not found')
    }

    return prisma.automationRule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Create an automation trigger
   */
  static async createTrigger(data: AutomationTriggerData) {
    return prisma.automationTrigger.create({
      data: {
        ruleId: data.ruleId,
        taskId: data.taskId,
        triggerData: data.triggerData,
        scheduledFor: data.scheduledFor,
      },
    })
  }

  /**
   * Process pending automation triggers
   */
  static async processPendingTriggers() {
    const now = new Date()
    
    const pendingTriggers = await prisma.automationTrigger.findMany({
      where: {
        isProcessed: false,
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: now } },
        ],
      },
      include: {
        rule: {
          include: {
            organization: true,
          },
        },
        task: {
          include: {
            assignedUser: true,
            createdByUser: true,
          },
        },
      },
      orderBy: [
        { rule: { priority: 'desc' } },
        { createdAt: 'asc' },
      ],
    })

    const results = []

    for (const trigger of pendingTriggers) {
      try {
        const result = await this.executeTrigger(trigger)
        results.push(result)

        // Mark trigger as processed
        await prisma.automationTrigger.update({
          where: { id: trigger.id },
          data: {
            isProcessed: true,
            processedAt: now,
          },
        })
      } catch (error) {
        console.error(`Error processing trigger ${trigger.id}:`, error)
        
        // Log execution error
        await prisma.automationExecution.create({
          data: {
            ruleId: trigger.ruleId,
            triggerId: trigger.id,
            taskId: trigger.taskId,
            status: 'error',
            actionsExecuted: [],
            results: {},
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            executedAt: now,
          },
        })
      }
    }

    return results
  }

  /**
   * Execute a specific trigger
   */
  private static async executeTrigger(trigger: any) {
    const { rule, task } = trigger
    const startTime = Date.now()

    // Check cooldown
    if (rule.cooldownMinutes && rule.lastExecuted) {
      const cooldownEnd = addHours(rule.lastExecuted, rule.cooldownMinutes / 60)
      if (isBefore(new Date(), cooldownEnd)) {
        return { skipped: true, reason: 'cooldown' }
      }
    }

    // Check daily execution limit
    if (rule.maxExecutions) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todayExecutions = await prisma.automationExecution.count({
        where: {
          ruleId: rule.id,
          executedAt: { gte: today },
          status: 'success',
        },
      })

      if (todayExecutions >= rule.maxExecutions) {
        return { skipped: true, reason: 'daily_limit' }
      }
    }

    // Evaluate conditions
    const conditionsMatch = await this.evaluateConditions(rule.conditions, task, trigger.triggerData)
    
    if (!conditionsMatch) {
      return { skipped: true, reason: 'conditions_not_met' }
    }

    // Execute actions
    const actionResults = []
    const executedActions = []

    for (const action of rule.actions) {
      try {
        const result = await this.executeAction(action, task, trigger.triggerData, rule.organizationId)
        actionResults.push(result)
        executedActions.push(action)
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error)
        actionResults.push({ error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    const executionTime = Date.now() - startTime
    const hasErrors = actionResults.some(result => result.error)
    const status = hasErrors ? 'partial' : 'success'

    // Log execution
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId: rule.id,
        triggerId: trigger.id,
        taskId: trigger.taskId,
        status,
        actionsExecuted: executedActions,
        results: actionResults,
        executionTime,
        executedAt: new Date(),
      },
    })

    // Update rule statistics
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        executionCount: { increment: 1 },
        successCount: status === 'success' ? { increment: 1 } : undefined,
        errorCount: hasErrors ? { increment: 1 } : undefined,
        lastExecuted: new Date(),
      },
    })

    return { execution, actionResults }
  }

  /**
   * Evaluate automation conditions
   */
  private static async evaluateConditions(
    conditions: AutomationCondition[],
    task: any,
    triggerData: any
  ): Promise<boolean> {
    if (!conditions || conditions.length === 0) {
      return true
    }

    let result = true
    let currentLogicalOperator = 'AND'

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, task, triggerData)
      
      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult
      } else {
        result = result || conditionResult
      }

      currentLogicalOperator = condition.logicalOperator || 'AND'
    }

    return result
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: AutomationCondition,
    task: any,
    triggerData: any
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, task, triggerData)
    const { operator, value } = condition

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater_than':
        return Number(fieldValue) > Number(value)
      case 'less_than':
        return Number(fieldValue) < Number(value)
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue)
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined
      default:
        return false
    }
  }

  /**
   * Get field value from task or trigger data
   */
  private static getFieldValue(field: string, task: any, triggerData: any): any {
    // Check trigger data first
    if (triggerData && triggerData[field] !== undefined) {
      return triggerData[field]
    }

    // Check task fields
    if (task && task[field] !== undefined) {
      return task[field]
    }

    // Handle nested fields (e.g., 'assignedUser.role')
    if (field.includes('.')) {
      const parts = field.split('.')
      let value = task
      
      for (const part of parts) {
        if (value && value[part] !== undefined) {
          value = value[part]
        } else {
          return null
        }
      }
      
      return value
    }

    return null
  }

  /**
   * Execute an automation action
   */
  private static async executeAction(
    action: AutomationAction,
    task: any,
    triggerData: any,
    organizationId: string
  ) {
    const { type, config } = action

    switch (type) {
      case 'ASSIGN_TASK':
        return this.executeAssignTaskAction(task, config, organizationId)
      
      case 'ESCALATE_TASK':
        return this.executeEscalateTaskAction(task, config)
      
      case 'CREATE_TASK':
        return this.executeCreateTaskAction(config, organizationId, task)
      
      case 'SEND_NOTIFICATION':
        return this.executeSendNotificationAction(task, config)
      
      case 'UPDATE_PRIORITY':
        return this.executeUpdatePriorityAction(task, config)
      
      case 'ADD_COMMENT':
        return this.executeAddCommentAction(task, config)
      
      case 'DELEGATE_APPROVAL':
        return this.executeDelegateApprovalAction(task, config)
      
      default:
        throw new Error(`Unknown action type: ${type}`)
    }
  }

  /**
   * Execute assign task action
   */
  private static async executeAssignTaskAction(task: any, config: any, organizationId: string) {
    let assigneeId = config.assigneeId

    // If no specific assignee, use smart assignment
    if (!assigneeId && config.useSmartAssignment) {
      const suggestions = await this.getSmartAssignmentSuggestions(task, organizationId)
      if (suggestions.length > 0) {
        assigneeId = suggestions[0].userId
      }
    }

    if (!assigneeId) {
      throw new Error('No assignee specified and smart assignment failed')
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        assignedTo: assigneeId,
        isAutoAssigned: true,
        autoAssignmentReason: config.reason || 'Automated assignment',
        updatedAt: new Date(),
      },
    })

    return { success: true, assigneeId, reason: config.reason }
  }

  /**
   * Execute escalate task action
   */
  private static async executeEscalateTaskAction(task: any, config: any) {
    const newLevel = task.escalationLevel + 1

    await prisma.task.update({
      where: { id: task.id },
      data: {
        escalationLevel: newLevel,
        lastEscalatedAt: new Date(),
        priority: config.newPriority || task.priority,
        updatedAt: new Date(),
      },
    })

    return { success: true, newLevel, newPriority: config.newPriority }
  }

  /**
   * Execute create task action
   */
  private static async executeCreateTaskAction(config: any, organizationId: string, parentTask?: any) {
    const taskData = {
      title: config.title || 'Automated Task',
      description: config.description,
      status: config.status || 'TODO',
      priority: config.priority || 'MEDIUM',
      assignedTo: config.assignedTo,
      createdBy: config.createdBy || parentTask?.createdBy,
      organizationId,
      parentTaskId: config.linkToParent ? parentTask?.id : undefined,
      dueDate: config.dueDate ? new Date(config.dueDate) : undefined,
      estimatedHours: config.estimatedHours,
      metadata: {
        ...config.metadata,
        automationGenerated: true,
        parentTaskId: parentTask?.id,
      },
    }

    const newTask = await prisma.task.create({
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

    return { success: true, taskId: newTask.id, task: newTask }
  }

  /**
   * Execute send notification action
   */
  private static async executeSendNotificationAction(task: any, config: any) {
    // This would integrate with your notification system
    // For now, we'll just log the notification
    
    const notification = {
      type: config.type || 'task_notification',
      recipients: config.recipients || [task.assignedTo],
      subject: config.subject || `Task Update: ${task.title}`,
      message: config.message || `Task ${task.title} requires attention`,
      taskId: task.id,
    }

    // TODO: Integrate with actual notification service
    console.log('Notification sent:', notification)

    return { success: true, notification }
  }

  /**
   * Execute update priority action
   */
  private static async executeUpdatePriorityAction(task: any, config: any) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        priority: config.newPriority,
        updatedAt: new Date(),
      },
    })

    return { success: true, oldPriority: task.priority, newPriority: config.newPriority }
  }

  /**
   * Execute add comment action
   */
  private static async executeAddCommentAction(task: any, config: any) {
    const comment = await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId: config.userId || task.createdBy,
        content: config.content || 'Automated comment',
      },
    })

    return { success: true, commentId: comment.id }
  }

  /**
   * Execute delegate approval action
   */
  private static async executeDelegateApprovalAction(task: any, config: any) {
    // This would integrate with the approval system
    // For now, we'll just return a placeholder
    
    return { success: true, delegatedTo: config.delegateToId }
  }

  /**
   * Get smart assignment suggestions based on workload and skills
   */
  static async getSmartAssignmentSuggestions(
    task: any,
    organizationId: string,
    limit: number = 5
  ): Promise<TaskAssignmentSuggestion[]> {
    // Get users in the organization
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        assignedTasks: {
          where: {
            status: {
              in: ['TODO', 'IN_PROGRESS'],
            },
          },
        },
        workloadMetrics: {
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: {
            date: 'desc',
          },
          take: 1,
        },
      },
    })

    const suggestions: TaskAssignmentSuggestion[] = []

    for (const user of users) {
      const workloadScore = this.calculateWorkloadScore(user)
      const skillMatch = this.calculateSkillMatch(user, task)
      const availabilityScore = this.calculateAvailabilityScore(user)
      
      const confidence = (workloadScore * 0.4 + skillMatch * 0.4 + availabilityScore * 0.2)
      
      const reasoning = []
      if (workloadScore > 0.7) reasoning.push('Low current workload')
      if (skillMatch > 0.7) reasoning.push('Strong skill match')
      if (availabilityScore > 0.7) reasoning.push('High availability')

      suggestions.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        confidence,
        reasoning,
        workloadScore,
        skillMatch,
        availabilityScore,
      })
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  /**
   * Calculate workload score (higher = less busy)
   */
  private static calculateWorkloadScore(user: any): number {
    const activeTasks = user.assignedTasks.length
    const recentMetrics = user.workloadMetrics[0]
    
    if (recentMetrics) {
      return Math.max(0, 1 - recentMetrics.utilizationRate)
    }
    
    // Fallback based on active tasks
    return Math.max(0, 1 - (activeTasks / 10))
  }

  /**
   * Calculate skill match score
   */
  private static calculateSkillMatch(user: any, task: any): number {
    // This is a simplified implementation
    // In practice, you'd analyze task content, tags, and user specializations
    
    const recentMetrics = user.workloadMetrics[0]
    if (recentMetrics && recentMetrics.specializations) {
      // Check if task tags match user specializations
      const taskTags = task.metadata?.tags || []
      const userSpecializations = recentMetrics.specializations
      
      const matches = taskTags.filter((tag: string) => 
        userSpecializations.some((spec: string) => 
          spec.toLowerCase().includes(tag.toLowerCase())
        )
      )
      
      return matches.length / Math.max(taskTags.length, 1)
    }
    
    return 0.5 // Default neutral score
  }

  /**
   * Calculate availability score
   */
  private static calculateAvailabilityScore(user: any): number {
    const recentMetrics = user.workloadMetrics[0]
    
    if (recentMetrics) {
      return Math.min(1, recentMetrics.availableHours / 8) // Assuming 8-hour workday
    }
    
    return 0.5 // Default neutral score
  }

  /**
   * Check for deadline-based triggers
   */
  static async checkDeadlineTriggers() {
    const now = new Date()
    const tomorrow = addDays(now, 1)
    const nextWeek = addDays(now, 7)

    // Find tasks approaching deadlines
    const approachingTasks = await prisma.task.findMany({
      where: {
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
        dueDate: {
          gte: now,
          lte: nextWeek,
        },
      },
      include: {
        assignedUser: true,
        createdByUser: true,
      },
    })

    // Find overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: {
          in: ['TODO', 'IN_PROGRESS'],
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        assignedUser: true,
        createdByUser: true,
      },
    })

    const triggers = []

    // Create triggers for approaching deadlines
    for (const task of approachingTasks) {
      const hoursUntilDue = (task.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      const rules = await prisma.automationRule.findMany({
        where: {
          organizationId: task.organizationId,
          triggerType: 'DEADLINE_APPROACHING',
          isActive: true,
        },
      })

      for (const rule of rules) {
        const triggerHours = rule.triggerConfig.hours || 24
        
        if (hoursUntilDue <= triggerHours) {
          triggers.push({
            ruleId: rule.id,
            taskId: task.id,
            triggerData: {
              hoursUntilDue,
              dueDate: task.dueDate,
            },
          })
        }
      }
    }

    // Create triggers for overdue tasks
    for (const task of overdueTasks) {
      const hoursOverdue = (now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60)
      
      const rules = await prisma.automationRule.findMany({
        where: {
          organizationId: task.organizationId,
          triggerType: 'TASK_OVERDUE',
          isActive: true,
        },
      })

      for (const rule of rules) {
        triggers.push({
          ruleId: rule.id,
          taskId: task.id,
          triggerData: {
            hoursOverdue,
            dueDate: task.dueDate,
          },
        })
      }
    }

    // Create the triggers
    for (const triggerData of triggers) {
      await this.createTrigger(triggerData)
    }

    return triggers.length
  }

  /**
   * Get automation rules for an organization
   */
  static async getAutomationRules(
    organizationId: string,
    filters: {
      isActive?: boolean
      triggerType?: TriggerType
    } = {}
  ) {
    const where: any = { organizationId }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    if (filters.triggerType) {
      where.triggerType = filters.triggerType
    }

    return prisma.automationRule.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  }
}