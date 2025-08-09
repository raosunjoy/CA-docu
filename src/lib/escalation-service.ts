// Task Escalation Service
// Handles escalation rules and automatic escalation of overdue tasks

import prisma from '@/lib/prisma'
import { EscalationRuleData, EscalationCondition, EscalationLevel } from '@/types'
import { addHours, addDays, isBefore, isAfter } from 'date-fns'

export class EscalationService {
  /**
   * Create a new escalation rule
   */
  static async createEscalationRule(
    organizationId: string,
    createdBy: string,
    data: EscalationRuleData
  ) {
    const rule = await prisma.escalationRule.create({
      data: {
        organizationId,
        createdBy,
        name: data.name,
        description: data.description,
        conditions: data.conditions,
        levels: data.levels,
        priority: data.priority || 0,
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
   * Update an escalation rule
   */
  static async updateEscalationRule(
    id: string,
    organizationId: string,
    data: Partial<EscalationRuleData>
  ) {
    const rule = await prisma.escalationRule.findFirst({
      where: { id, organizationId },
    })

    if (!rule) {
      throw new Error('Escalation rule not found')
    }

    return prisma.escalationRule.update({
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
   * Check and process task escalations
   */
  static async processEscalations() {
    const now = new Date()
    
    // Get all active escalation rules
    const rules = await prisma.escalationRule.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        priority: 'desc',
      },
    })

    const escalationResults = []

    for (const rule of rules) {
      try {
        const result = await this.processRuleEscalations(rule, now)
        escalationResults.push({ ruleId: rule.id, ...result })
      } catch (error) {
        console.error(`Error processing escalation rule ${rule.id}:`, error)
        escalationResults.push({
          ruleId: rule.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return escalationResults
  }

  /**
   * Process escalations for a specific rule
   */
  private static async processRuleEscalations(rule: any, now: Date) {
    // Find tasks that match the rule conditions
    const candidateTasks = await this.findCandidateTasks(rule, now)
    
    const escalatedTasks = []
    const skippedTasks = []

    for (const task of candidateTasks) {
      try {
        // Check if task matches all conditions
        if (this.evaluateEscalationConditions(rule.conditions, task, now)) {
          // Determine the appropriate escalation level
          const nextLevel = this.determineEscalationLevel(rule, task, now)
          
          if (nextLevel !== null) {
            const result = await this.escalateTask(task, rule, nextLevel, now)
            escalatedTasks.push({ taskId: task.id, level: nextLevel, result })
          } else {
            skippedTasks.push({ taskId: task.id, reason: 'no_applicable_level' })
          }
        } else {
          skippedTasks.push({ taskId: task.id, reason: 'conditions_not_met' })
        }
      } catch (error) {
        console.error(`Error escalating task ${task.id}:`, error)
        skippedTasks.push({
          taskId: task.id,
          reason: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return {
      escalatedCount: escalatedTasks.length,
      skippedCount: skippedTasks.length,
      escalatedTasks,
      skippedTasks,
    }
  }

  /**
   * Find tasks that could potentially be escalated
   */
  private static async findCandidateTasks(rule: any, now: Date) {
    // Get tasks that are not completed and have due dates
    const tasks = await prisma.task.findMany({
      where: {
        organizationId: rule.organizationId,
        status: {
          in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'],
        },
        dueDate: {
          not: null,
        },
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        escalationLogs: {
          orderBy: {
            executedAt: 'desc',
          },
          take: 1,
        },
      },
    })

    return tasks
  }

  /**
   * Evaluate escalation conditions for a task
   */
  private static evaluateEscalationConditions(
    conditions: EscalationCondition[],
    task: any,
    now: Date
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true
    }

    for (const condition of conditions) {
      if (!this.evaluateEscalationCondition(condition, task, now)) {
        return false
      }
    }

    return true
  }

  /**
   * Evaluate a single escalation condition
   */
  private static evaluateEscalationCondition(
    condition: EscalationCondition,
    task: any,
    now: Date
  ): boolean {
    const { field, operator, value, unit } = condition

    let fieldValue: any
    const compareValue: any = value

    switch (field) {
      case 'overdue_hours':
        if (!task.dueDate) return false
        fieldValue = Math.max(0, (now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60))
        break
      
      case 'overdue_days':
        if (!task.dueDate) return false
        fieldValue = Math.max(0, (now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        break
      
      case 'priority':
        fieldValue = task.priority
        break
      
      case 'status':
        fieldValue = task.status
        break
      
      case 'assignee_role':
        fieldValue = task.assignedUser?.role
        break
      
      case 'estimated_hours':
        fieldValue = task.estimatedHours || 0
        break
      
      case 'escalation_level':
        fieldValue = task.escalationLevel || 0
        break
      
      case 'time_since_last_escalation':
        if (task.escalationLogs.length === 0) {
          fieldValue = Infinity // Never escalated
        } else {
          const lastEscalation = task.escalationLogs[0]
          const hoursSince = (now.getTime() - lastEscalation.executedAt.getTime()) / (1000 * 60 * 60)
          fieldValue = unit === 'days' ? hoursSince / 24 : hoursSince
        }
        break
      
      default:
        return false
    }

    switch (operator) {
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue)
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(compareValue)
      case 'less_than':
        return Number(fieldValue) < Number(compareValue)
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(compareValue)
      case 'equals':
        return fieldValue === compareValue
      case 'not_equals':
        return fieldValue !== compareValue
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue)
      default:
        return false
    }
  }

  /**
   * Determine the appropriate escalation level for a task
   */
  private static determineEscalationLevel(rule: any, task: any, now: Date): number | null {
    const levels = rule.levels as EscalationLevel[]
    const currentLevel = task.escalationLevel || 0
    const lastEscalation = task.escalationLogs[0]

    // Find the next applicable level
    for (const level of levels.sort((a, b) => a.level - b.level)) {
      if (level.level > currentLevel) {
        // Check if enough time has passed since last escalation
        if (lastEscalation) {
          const hoursSinceLastEscalation = (now.getTime() - lastEscalation.executedAt.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastEscalation < level.triggerAfter) {
            continue // Not enough time has passed
          }
        } else {
          // First escalation - check if enough time has passed since due date
          if (task.dueDate) {
            const hoursOverdue = (now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60)
            if (hoursOverdue < level.triggerAfter) {
              continue
            }
          }
        }

        return level.level
      }
    }

    return null // No applicable level found
  }

  /**
   * Escalate a task to a specific level
   */
  private static async escalateTask(task: any, rule: any, level: number, now: Date) {
    const escalationLevel = (rule.levels as EscalationLevel[]).find(l => l.level === level)
    
    if (!escalationLevel) {
      throw new Error(`Escalation level ${level} not found in rule`)
    }

    const actionResults = []

    // Execute escalation actions
    for (const action of escalationLevel.actions) {
      try {
        const result = await this.executeEscalationAction(task, action, rule.organizationId)
        actionResults.push({ action: action.type, result })
      } catch (error) {
        console.error(`Error executing escalation action ${action.type}:`, error)
        actionResults.push({
          action: action.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update task escalation level
    await prisma.task.update({
      where: { id: task.id },
      data: {
        escalationLevel: level,
        lastEscalatedAt: now,
        updatedAt: now,
      },
    })

    // Log the escalation
    const escalationLog = await prisma.escalationLog.create({
      data: {
        taskId: task.id,
        ruleId: rule.id,
        level,
        action: escalationLevel.name,
        actionData: {
          actions: escalationLevel.actions,
          results: actionResults,
        },
        executedAt: now,
      },
    })

    return {
      escalationLog,
      actionResults,
      newLevel: level,
    }
  }

  /**
   * Execute an escalation action
   */
  private static async executeEscalationAction(task: any, action: any, organizationId: string) {
    const { type, config } = action

    switch (type) {
      case 'notify':
        return this.executeNotifyAction(task, config)
      
      case 'reassign':
        return this.executeReassignAction(task, config, organizationId)
      
      case 'escalate_priority':
        return this.executeEscalatePriorityAction(task, config)
      
      case 'add_comment':
        return this.executeAddCommentAction(task, config)
      
      case 'delegate':
        return this.executeDelegateAction(task, config)
      
      default:
        throw new Error(`Unknown escalation action type: ${type}`)
    }
  }

  /**
   * Execute notify action
   */
  private static async executeNotifyAction(task: any, config: any) {
    const recipients = []

    // Determine recipients
    if (config.notifyAssignee && task.assignedTo) {
      recipients.push(task.assignedTo)
    }

    if (config.notifyCreator && task.createdBy) {
      recipients.push(task.createdBy)
    }

    if (config.notifyManagers) {
      // Find managers in the organization
      const managers = await prisma.user.findMany({
        where: {
          organizationId: task.organizationId,
          role: {
            in: ['MANAGER', 'PARTNER'],
          },
          isActive: true,
        },
        select: { id: true },
      })
      
      recipients.push(...managers.map(m => m.id))
    }

    if (config.specificUsers) {
      recipients.push(...config.specificUsers)
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)]

    // Create notification (this would integrate with your notification system)
    const notification = {
      type: 'task_escalation',
      recipients: uniqueRecipients,
      subject: config.subject || `Task Escalated: ${task.title}`,
      message: config.message || `Task "${task.title}" has been escalated due to being overdue.`,
      taskId: task.id,
      escalationLevel: task.escalationLevel + 1,
    }

    // TODO: Integrate with actual notification service
    console.log('Escalation notification:', notification)

    return { success: true, recipients: uniqueRecipients, notification }
  }

  /**
   * Execute reassign action
   */
  private static async executeReassignAction(task: any, config: any, organizationId: string) {
    let newAssigneeId = config.assigneeId

    // If no specific assignee, find a suitable one
    if (!newAssigneeId && config.assignmentStrategy) {
      switch (config.assignmentStrategy) {
        case 'manager':
          const manager = await prisma.user.findFirst({
            where: {
              organizationId,
              role: {
                in: ['MANAGER', 'PARTNER'],
              },
              isActive: true,
            },
          })
          newAssigneeId = manager?.id
          break
        
        case 'least_busy':
          // Find user with least active tasks
          const users = await prisma.user.findMany({
            where: {
              organizationId,
              isActive: true,
              id: { not: task.assignedTo }, // Don't reassign to same person
            },
            include: {
              assignedTasks: {
                where: {
                  status: {
                    in: ['TODO', 'IN_PROGRESS'],
                  },
                },
              },
            },
          })
          
          const leastBusyUser = users.reduce((min, user) => 
            user.assignedTasks.length < min.assignedTasks.length ? user : min
          )
          
          newAssigneeId = leastBusyUser?.id
          break
      }
    }

    if (!newAssigneeId) {
      throw new Error('No suitable assignee found for reassignment')
    }

    // Update task assignment
    await prisma.task.update({
      where: { id: task.id },
      data: {
        assignedTo: newAssigneeId,
        isAutoAssigned: true,
        autoAssignmentReason: `Escalated and reassigned: ${config.reason || 'Task overdue'}`,
        updatedAt: new Date(),
      },
    })

    // Add comment about reassignment
    await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId: newAssigneeId,
        content: `Task automatically reassigned due to escalation. Previous assignee: ${task.assignedUser?.firstName} ${task.assignedUser?.lastName}`,
      },
    })

    return { success: true, newAssigneeId, previousAssigneeId: task.assignedTo }
  }

  /**
   * Execute escalate priority action
   */
  private static async executeEscalatePriorityAction(task: any, config: any) {
    const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const currentIndex = priorityOrder.indexOf(task.priority)
    
    let newPriority = config.newPriority
    
    if (!newPriority && config.increaseBy) {
      const newIndex = Math.min(priorityOrder.length - 1, currentIndex + config.increaseBy)
      newPriority = priorityOrder[newIndex]
    }

    if (!newPriority) {
      newPriority = 'HIGH' // Default escalation
    }

    await prisma.task.update({
      where: { id: task.id },
      data: {
        priority: newPriority,
        updatedAt: new Date(),
      },
    })

    return { success: true, oldPriority: task.priority, newPriority }
  }

  /**
   * Execute add comment action
   */
  private static async executeAddCommentAction(task: any, config: any) {
    const comment = await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId: config.userId || task.createdBy,
        content: config.content || `Task escalated due to being overdue. Please prioritize completion.`,
      },
    })

    return { success: true, commentId: comment.id }
  }

  /**
   * Execute delegate action
   */
  private static async executeDelegateAction(task: any, config: any) {
    // This would integrate with the approval delegation system
    // For now, we'll just return a placeholder
    
    return { success: true, delegatedTo: config.delegateToId }
  }

  /**
   * Get escalation rules for an organization
   */
  static async getEscalationRules(
    organizationId: string,
    filters: {
      isActive?: boolean
    } = {}
  ) {
    const where: any = { organizationId }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive
    }

    return prisma.escalationRule.findMany({
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
            logs: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })
  }

  /**
   * Get escalation logs for a task
   */
  static async getTaskEscalationLogs(taskId: string, organizationId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
    })

    if (!task) {
      throw new Error('Task not found')
    }

    return prisma.escalationLog.findMany({
      where: { taskId },
      include: {
        rule: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        executedAt: 'desc',
      },
    })
  }

  /**
   * Delete an escalation rule
   */
  static async deleteEscalationRule(id: string, organizationId: string) {
    const rule = await prisma.escalationRule.findFirst({
      where: { id, organizationId },
    })

    if (!rule) {
      throw new Error('Escalation rule not found')
    }

    // Soft delete by marking as inactive
    return prisma.escalationRule.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Get escalation statistics for an organization
   */
  static async getEscalationStatistics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ) {
    const where: any = {
      task: {
        organizationId,
      },
    }

    if (dateRange) {
      where.executedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      }
    }

    const [totalEscalations, escalationsByLevel, escalationsByRule] = await Promise.all([
      // Total escalations
      prisma.escalationLog.count({ where }),
      
      // Escalations by level
      prisma.escalationLog.groupBy({
        by: ['level'],
        where,
        _count: {
          id: true,
        },
        orderBy: {
          level: 'asc',
        },
      }),
      
      // Escalations by rule
      prisma.escalationLog.groupBy({
        by: ['ruleId'],
        where,
        _count: {
          id: true,
        },
        include: {
          rule: {
            select: {
              name: true,
            },
          },
        },
      }),
    ])

    return {
      totalEscalations,
      escalationsByLevel,
      escalationsByRule,
    }
  }
}