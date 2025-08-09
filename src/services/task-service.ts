import { PrismaClient, TaskStatus, TaskPriority, ApprovalStatus } from '@prisma/client'
import type { 
  Task, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  TaskSearchRequest, 
  TaskSearchResponse,
  BulkTaskOperation,
  BulkTaskResult,
  TaskAnalytics,
  WorkflowStage,
  WorkflowHistoryEntry,
  TaskType,
  TaskCategory,
  RegulatoryRequirement
} from '@/types/task'

const prisma = new PrismaClient()

// CA-specific workflow stages mapping
const WORKFLOW_STAGE_MAPPING: Record<WorkflowStage, TaskStatus> = {
  'INTAKE': 'TODO',
  'ASSIGNMENT': 'TODO', 
  'PREPARATION': 'IN_PROGRESS',
  'REVIEW': 'IN_REVIEW',
  'CLIENT_APPROVAL': 'IN_REVIEW',
  'FILING': 'IN_PROGRESS',
  'COMPLETION': 'COMPLETED',
  'ARCHIVAL': 'COMPLETED'
}

// CA compliance priority mapping
const COMPLIANCE_PRIORITY_MAPPING: Record<string, TaskPriority> = {
  'GST': 'HIGH',
  'INCOME_TAX': 'HIGH', 
  'CORPORATE_TAX': 'HIGH',
  'AUDIT': 'URGENT',
  'SEBI': 'URGENT',
  'RBI': 'URGENT'
}

export class TaskService {
  /**
   * Create a new task with CA-specific workflow logic
   */
  async createTask(
    request: CreateTaskRequest,
    organizationId: string,
    createdBy: string
  ): Promise<Task> {
    try {
      // Auto-assign priority based on regulatory requirement
      let priority = request.priority
      if (request.regulatoryRequirement) {
        const compliancePriority = COMPLIANCE_PRIORITY_MAPPING[request.regulatoryRequirement.type]
        if (compliancePriority && this.isPriorityHigher(compliancePriority, priority)) {
          priority = compliancePriority
        }
      }

      // Calculate estimated hours if not provided
      const estimatedHours = request.estimatedHours || await this.estimateTaskHours(
        request.type,
        request.category,
        request.regulatoryRequirement
      )

      // Create workflow history entry
      const workflowHistory: WorkflowHistoryEntry = {
        id: `wf_${Date.now()}`,
        previousStage: 'INTAKE',
        newStage: 'ASSIGNMENT',
        previousStatus: 'TODO',
        newStatus: 'TODO',
        changedBy: createdBy,
        changedAt: new Date(),
        comment: 'Task created',
        autoTransition: false
      }

      // Prepare task metadata with CA-specific fields
      const metadata = {
        type: request.type,
        category: request.category,
        regulatoryRequirement: request.regulatoryRequirement,
        auditTrailRequired: request.auditTrailRequired || false,
        approvalRequired: request.approvalRequired || false,
        workflowStage: 'ASSIGNMENT',
        workflowHistory: [workflowHistory],
        tags: request.tags || [],
        customFields: request.customFields || {},
        isRecurring: request.isRecurring || false,
        recurrencePattern: request.recurrencePattern,
        collaborators: request.collaborators || [],
        dependencies: request.dependencies || [],
        emailId: request.emailId,
        sourceSystem: request.sourceSystem || 'MANUAL',
        completionPercentage: 0,
        timeEntries: [],
        documents: [],
        comments: [],
        milestones: []
      }

      // Create task in database
      const createdTask = await prisma.task.create({
        data: {
          organizationId,
          title: request.title,
          description: request.description,
          priority,
          assignedTo: request.assigneeId,
          createdBy,
          dueDate: request.dueDate,
          estimatedHours,
          requiresApproval: request.approvalRequired || false,
          approvalStatus: request.approvalRequired ? 'PENDING' : null,
          isRecurring: request.isRecurring || false,
          metadata: metadata as any
        },
        include: {
          assignedUser: true,
          createdByUser: true,
          organization: true,
          comments: {
            include: {
              user: true
            }
          },
          attachments: true
        }
      })

      // Create approval workflow if required
      if (request.approvalRequired && request.approver) {
        await this.createApprovalWorkflow(createdTask.id, request.approver, organizationId)
      }

      // Create recurring task template if needed
      if (request.isRecurring && request.recurrencePattern) {
        await this.createRecurringTaskTemplate(createdTask, request.recurrencePattern, organizationId)
      }

      // Log audit trail
      await this.createAuditLog(
        'TASK_CREATED',
        createdTask.id,
        createdBy,
        organizationId,
        { taskTitle: request.title, assigneeId: request.assigneeId }
      )

      return this.mapDatabaseTaskToTask(createdTask)
      
    } catch (error) {
      console.error('Error creating task:', error)
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update task with workflow transition logic
   */
  async updateTask(
    taskId: string,
    request: UpdateTaskRequest,
    updatedBy: string,
    organizationId: string
  ): Promise<Task> {
    try {
      // Get current task
      const currentTask = await prisma.task.findUnique({
        where: { id: taskId, organizationId },
        include: {
          assignedUser: true,
          createdByUser: true,
          comments: { include: { user: true } },
          attachments: true
        }
      })

      if (!currentTask) {
        throw new Error('Task not found')
      }

      const currentMetadata = currentTask.metadata as any
      const previousStatus = currentTask.status
      const previousStage = currentMetadata.workflowStage || 'ASSIGNMENT'

      // Handle status transitions with workflow logic
      let newStatus = request.status || previousStatus
      let newStage = previousStage

      if (request.status && request.status !== previousStatus) {
        const transitionResult = await this.processWorkflowTransition(
          currentTask,
          request.status,
          updatedBy
        )
        newStatus = transitionResult.status
        newStage = transitionResult.stage
      }

      // Update completion percentage based on status
      let completionPercentage = request.completionPercentage ?? currentMetadata.completionPercentage ?? 0
      if (newStatus === 'COMPLETED') {
        completionPercentage = 100
      } else if (newStatus === 'IN_PROGRESS' && completionPercentage === 0) {
        completionPercentage = 10 // Auto-set to 10% when starting
      }

      // Create workflow history entry if status changed
      let workflowHistory = [...(currentMetadata.workflowHistory || [])]
      if (newStatus !== previousStatus) {
        const historyEntry: WorkflowHistoryEntry = {
          id: `wf_${Date.now()}`,
          previousStage: previousStage as WorkflowStage,
          newStage: newStage as WorkflowStage,
          previousStatus: previousStatus as any,
          newStatus: newStatus as any,
          changedBy: updatedBy,
          changedAt: new Date(),
          comment: `Status changed from ${previousStatus} to ${newStatus}`,
          autoTransition: false
        }
        workflowHistory.push(historyEntry)
      }

      // Update metadata
      const updatedMetadata = {
        ...currentMetadata,
        workflowStage: newStage,
        workflowHistory,
        completionPercentage,
        ...request.customFields && { customFields: { ...currentMetadata.customFields, ...request.customFields } },
        ...request.tags && { tags: request.tags },
        ...request.collaborators && { collaborators: request.collaborators },
        ...request.dependencies && { dependencies: request.dependencies }
      }

      // Update task in database
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...request.title && { title: request.title },
          ...request.description && { description: request.description },
          status: newStatus,
          ...request.priority && { priority: request.priority },
          ...request.assigneeId && { assignedTo: request.assigneeId },
          ...request.dueDate !== undefined && { dueDate: request.dueDate },
          ...request.estimatedHours && { estimatedHours: request.estimatedHours },
          metadata: updatedMetadata,
          ...(newStatus === 'COMPLETED' && !currentTask.completedAt) && { completedAt: new Date() }
        },
        include: {
          assignedUser: true,
          createdByUser: true,
          organization: true,
          comments: { include: { user: true } },
          attachments: true
        }
      })

      // Handle approval workflow
      if (newStatus === 'IN_REVIEW' && currentTask.requiresApproval) {
        await this.triggerApprovalProcess(taskId, organizationId)
      }

      // Create next recurring task instance if completed
      if (newStatus === 'COMPLETED' && currentTask.isRecurring) {
        await this.createNextRecurringInstance(currentTask)
      }

      // Log audit trail
      await this.createAuditLog(
        'TASK_UPDATED',
        taskId,
        updatedBy,
        organizationId,
        { 
          changes: request,
          previousStatus,
          newStatus,
          previousStage,
          newStage
        }
      )

      return this.mapDatabaseTaskToTask(updatedTask)
      
    } catch (error) {
      console.error('Error updating task:', error)
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search tasks with advanced filtering and CA-specific queries
   */
  async searchTasks(
    request: TaskSearchRequest,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<TaskSearchResponse> {
    try {
      const { 
        filters = {}, 
        sortBy = 'createdAt', 
        sortOrder = 'DESC', 
        page = 1, 
        limit = 20,
        includeCompleted = false,
        includeArchived = false 
      } = request

      // Build where clause with role-based filtering
      const whereClause: any = {
        organizationId,
        isDeleted: false
      }

      // Apply role-based data filtering
      if (userRole === 'INTERN' || userRole === 'ASSOCIATE') {
        whereClause.OR = [
          { assignedTo: userId },
          { createdBy: userId },
          { metadata: { path: ['collaborators'], array_contains: userId } }
        ]
      }

      // Apply filters
      if (filters.status?.length) {
        whereClause.status = { in: filters.status }
      } else if (!includeCompleted) {
        whereClause.status = { not: 'COMPLETED' }
      }

      if (filters.priority?.length) {
        whereClause.priority = { in: filters.priority }
      }

      if (filters.assigneeId?.length) {
        whereClause.assignedTo = { in: filters.assigneeId }
      }

      if (filters.createdBy?.length) {
        whereClause.createdBy = { in: filters.createdBy }
      }

      if (filters.dueDateFrom || filters.dueDateTo) {
        whereClause.dueDate = {}
        if (filters.dueDateFrom) {
          whereClause.dueDate.gte = filters.dueDateFrom
        }
        if (filters.dueDateTo) {
          whereClause.dueDate.lte = filters.dueDateTo
        }
      }

      if (filters.createdFrom || filters.createdTo) {
        whereClause.createdAt = {}
        if (filters.createdFrom) {
          whereClause.createdAt.gte = filters.createdFrom
        }
        if (filters.createdTo) {
          whereClause.createdAt.lte = filters.createdTo
        }
      }

      if (filters.overdue) {
        whereClause.dueDate = { lt: new Date() }
        whereClause.status = { not: 'COMPLETED' }
      }

      if (filters.hasDeadline !== undefined) {
        if (filters.hasDeadline) {
          whereClause.dueDate = { not: null }
        } else {
          whereClause.dueDate = null
        }
      }

      if (filters.isRecurring !== undefined) {
        whereClause.isRecurring = filters.isRecurring
      }

      if (filters.approvalRequired !== undefined) {
        whereClause.requiresApproval = filters.approvalRequired
      }

      // CA-specific filters using metadata
      if (filters.type?.length) {
        whereClause.metadata = {
          path: ['type'],
          in: filters.type
        }
      }

      if (filters.category?.length) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['category'],
          in: filters.category
        }
      }

      if (filters.workflowStage?.length) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['workflowStage'],
          in: filters.workflowStage
        }
      }

      if (filters.tags?.length) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['tags'],
          array_contains: filters.tags
        }
      }

      // Text search
      if (filters.search) {
        whereClause.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      }

      // Get total count
      const totalCount = await prisma.task.count({ where: whereClause })

      // Get tasks with pagination
      const tasks = await prisma.task.findMany({
        where: whereClause,
        include: {
          assignedUser: true,
          createdByUser: true,
          organization: true,
          comments: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 3 // Latest 3 comments for preview
          },
          attachments: true
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() as any },
        skip: (page - 1) * limit,
        take: limit
      })

      // Get aggregations for dashboard insights
      const aggregations = await this.getTaskAggregations(whereClause, organizationId)

      const mappedTasks = tasks.map(task => this.mapDatabaseTaskToTask(task))
      
      return {
        tasks: mappedTasks,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
        aggregations
      }
      
    } catch (error) {
      console.error('Error searching tasks:', error)
      throw new Error(`Failed to search tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Bulk task operations with CA compliance checks
   */
  async bulkOperation(
    operation: BulkTaskOperation,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<BulkTaskResult> {
    const result: BulkTaskResult = {
      successful: [],
      failed: [],
      summary: {
        total: operation.taskIds.length,
        successful: 0,
        failed: 0
      }
    }

    try {
      for (const taskId of operation.taskIds) {
        try {
          // Check permissions for each task
          const canOperate = await this.canOperateOnTask(taskId, userId, userRole, organizationId)
          if (!canOperate) {
            result.failed.push({
              taskId,
              error: 'Insufficient permissions'
            })
            continue
          }

          // Execute operation based on type
          switch (operation.operation) {
            case 'UPDATE_STATUS':
              await this.updateTask(
                taskId,
                { status: operation.parameters.status },
                userId,
                organizationId
              )
              break

            case 'ASSIGN':
              await this.updateTask(
                taskId,
                { assigneeId: operation.parameters.assigneeId },
                userId,
                organizationId
              )
              break

            case 'ADD_TAGS':
              await this.addTagsToTask(taskId, operation.parameters.tags, organizationId)
              break

            case 'REMOVE_TAGS':
              await this.removeTagsFromTask(taskId, operation.parameters.tags, organizationId)
              break

            case 'DELETE':
              await this.deleteTask(taskId, userId, organizationId)
              break

            case 'ARCHIVE':
              await this.archiveTask(taskId, userId, organizationId)
              break

            default:
              throw new Error(`Unknown operation: ${operation.operation}`)
          }

          result.successful.push(taskId)
          
        } catch (error) {
          result.failed.push({
            taskId,
            error: error instanceof Error ? error.message : 'Operation failed'
          })
        }
      }

      result.summary.successful = result.successful.length
      result.summary.failed = result.failed.length

      // Log bulk operation
      await this.createAuditLog(
        'BULK_TASK_OPERATION',
        `bulk_${operation.operation.toLowerCase()}`,
        userId,
        organizationId,
        {
          operation: operation.operation,
          taskIds: operation.taskIds,
          parameters: operation.parameters,
          summary: result.summary
        }
      )

      return result
      
    } catch (error) {
      console.error('Error in bulk operation:', error)
      throw new Error(`Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get task analytics for dashboard
   */
  async getTaskAnalytics(
    organizationId: string,
    userId: string,
    userRole: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<TaskAnalytics> {
    try {
      const whereClause: any = {
        organizationId,
        isDeleted: false
      }

      // Apply role-based filtering
      if (userRole === 'INTERN' || userRole === 'ASSOCIATE') {
        whereClause.OR = [
          { assignedTo: userId },
          { createdBy: userId }
        ]
      }

      // Apply date range if provided
      if (dateRange) {
        whereClause.createdAt = {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      }

      // Get basic counts
      const [
        totalTasks,
        completedTasks,
        overdueTasks,
        upcomingDeadlines
      ] = await Promise.all([
        prisma.task.count({ where: whereClause }),
        prisma.task.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        prisma.task.count({ 
          where: { 
            ...whereClause, 
            dueDate: { lt: new Date() },
            status: { not: 'COMPLETED' }
          }
        }),
        prisma.task.count({
          where: {
            ...whereClause,
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
            },
            status: { not: 'COMPLETED' }
          }
        })
      ])

      // Get distribution data
      const [statusDistribution, priorityDistribution, typeDistribution] = await Promise.all([
        this.getStatusDistribution(whereClause),
        this.getPriorityDistribution(whereClause),
        this.getTypeDistribution(whereClause)
      ])

      // Get workload by assignee
      const workloadByAssignee = await this.getWorkloadByAssignee(whereClause)

      // Get productivity trends
      const productivityTrends = await this.getProductivityTrends(whereClause, dateRange)

      // Calculate completion rate and average completion time
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      const averageCompletionTime = await this.getAverageCompletionTime(whereClause)

      return {
        totalTasks,
        completedTasks,
        overdueTasks,
        upcomingDeadlines,
        averageCompletionTime,
        completionRate,
        statusDistribution,
        priorityDistribution,
        typeDistribution,
        workloadByAssignee,
        productivityTrends
      }
      
    } catch (error) {
      console.error('Error getting task analytics:', error)
      throw new Error(`Failed to get task analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods

  private isPriorityHigher(priority1: TaskPriority, priority2: TaskPriority): boolean {
    const priorityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'URGENT': 4 }
    return priorityOrder[priority1] > priorityOrder[priority2]
  }

  private async estimateTaskHours(
    type: TaskType,
    category: TaskCategory,
    regulatoryRequirement?: RegulatoryRequirement
  ): Promise<number> {
    // Base estimates by type
    const baseHours: Record<TaskType, number> = {
      'COMPLIANCE': 8,
      'AUDIT': 24,
      'TAX_FILING': 6,
      'CONSULTATION': 2,
      'REVIEW': 4,
      'RESEARCH': 6,
      'CLIENT_MEETING': 1,
      'DOCUMENTATION': 3,
      'FOLLOW_UP': 1,
      'ADMINISTRATIVE': 2
    }

    let hours = baseHours[type] || 4

    // Adjust based on regulatory requirement
    if (regulatoryRequirement) {
      if (regulatoryRequirement.type === 'AUDIT') hours *= 2
      if (regulatoryRequirement.frequency === 'ANNUALLY') hours *= 1.5
    }

    return hours
  }

  private async processWorkflowTransition(
    currentTask: any,
    newStatus: TaskStatus,
    updatedBy: string
  ): Promise<{ status: TaskStatus; stage: WorkflowStage }> {
    const metadata = currentTask.metadata as any
    const currentStage = metadata.workflowStage || 'ASSIGNMENT'
    
    // Define workflow transitions based on CA business logic
    const workflowTransitions: Record<TaskStatus, WorkflowStage> = {
      'TODO': 'ASSIGNMENT',
      'IN_PROGRESS': 'PREPARATION',
      'IN_REVIEW': 'REVIEW',
      'COMPLETED': 'COMPLETION'
    }

    const newStage = workflowTransitions[newStatus] || currentStage

    // Check if transition is allowed
    const isValidTransition = await this.isValidWorkflowTransition(
      currentStage,
      newStage,
      currentTask.requiresApproval
    )

    if (!isValidTransition) {
      throw new Error(`Invalid workflow transition from ${currentStage} to ${newStage}`)
    }

    return {
      status: newStatus,
      stage: newStage
    }
  }

  private async isValidWorkflowTransition(
    currentStage: WorkflowStage,
    newStage: WorkflowStage,
    requiresApproval: boolean
  ): Promise<boolean> {
    // Define valid transitions based on CA workflows
    const validTransitions: Record<WorkflowStage, WorkflowStage[]> = {
      'INTAKE': ['ASSIGNMENT'],
      'ASSIGNMENT': ['PREPARATION'],
      'PREPARATION': ['REVIEW', 'CLIENT_APPROVAL'],
      'REVIEW': ['PREPARATION', 'CLIENT_APPROVAL', 'FILING'],
      'CLIENT_APPROVAL': ['REVIEW', 'FILING'],
      'FILING': ['COMPLETION'],
      'COMPLETION': ['ARCHIVAL'],
      'ARCHIVAL': []
    }

    const allowedStages = validTransitions[currentStage] || []
    return allowedStages.includes(newStage)
  }

  private mapDatabaseTaskToTask(dbTask: any): Task {
    const metadata = dbTask.metadata as any || {}
    
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description,
      status: dbTask.status,
      priority: dbTask.priority,
      type: metadata.type || 'ADMINISTRATIVE',
      category: metadata.category || 'OTHER',
      assigneeId: dbTask.assignedTo,
      assignee: dbTask.assignedUser,
      createdBy: dbTask.createdBy,
      creator: dbTask.createdByUser,
      organizationId: dbTask.organizationId,
      clientId: metadata.clientId,
      clientName: metadata.clientName,
      complianceDeadline: metadata.complianceDeadline ? new Date(metadata.complianceDeadline) : undefined,
      regulatoryRequirement: metadata.regulatoryRequirement,
      auditTrailRequired: metadata.auditTrailRequired || false,
      approvalRequired: metadata.approvalRequired || false,
      approver: metadata.approver,
      approvedAt: metadata.approvedAt ? new Date(metadata.approvedAt) : undefined,
      workflowStage: metadata.workflowStage || 'ASSIGNMENT',
      workflowHistory: metadata.workflowHistory || [],
      dependencies: metadata.dependencies || [],
      blockedBy: metadata.blockedBy || [],
      estimatedHours: dbTask.estimatedHours,
      actualHours: dbTask.actualHours,
      timeEntries: metadata.timeEntries || [],
      documents: metadata.documents || [],
      tags: metadata.tags || [],
      customFields: metadata.customFields || {},
      dueDate: dbTask.dueDate,
      startDate: metadata.startDate ? new Date(metadata.startDate) : undefined,
      completedAt: dbTask.completedAt,
      createdAt: dbTask.createdAt,
      updatedAt: dbTask.updatedAt,
      isRecurring: dbTask.isRecurring,
      recurrencePattern: metadata.recurrencePattern,
      parentTaskId: dbTask.parentTaskId,
      collaborators: metadata.collaborators || [],
      comments: (dbTask.comments || []).map((comment: any) => ({
        id: comment.id,
        taskId: comment.taskId,
        userId: comment.userId,
        user: comment.user,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        parentCommentId: comment.parentCommentId,
        mentions: comment.mentions || []
      })),
      completionPercentage: metadata.completionPercentage || 0,
      milestones: metadata.milestones || [],
      emailId: metadata.emailId,
      sourceSystem: metadata.sourceSystem
    }
  }

  private async createApprovalWorkflow(taskId: string, approverId: string, organizationId: string): Promise<void> {
    // Implementation for approval workflow creation
    // This would integrate with the existing approval system
  }

  private async createRecurringTaskTemplate(task: any, pattern: any, organizationId: string): Promise<void> {
    // Implementation for recurring task template creation
  }

  private async createAuditLog(action: string, entityId: string, userId: string, organizationId: string, details: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: 'TASK',
        entityId,
        details: details as any,
        ipAddress: '', // Would be passed from request
        userAgent: '', // Would be passed from request
        timestamp: new Date()
      }
    })
  }

  private async getTaskAggregations(whereClause: any, organizationId: string) {
    // Implementation for task aggregations
    return {
      statusCounts: {} as any,
      priorityCounts: {} as any,
      typeCounts: {} as any,
      overdueTasks: 0,
      upcomingDeadlines: 0
    }
  }

  private async canOperateOnTask(taskId: string, userId: string, userRole: string, organizationId: string): Promise<boolean> {
    const task = await prisma.task.findUnique({
      where: { id: taskId, organizationId }
    })

    if (!task) return false

    // Role-based permissions
    if (userRole === 'PARTNER' || userRole === 'MANAGER') return true
    if (userRole === 'ADMIN') return true
    
    // Users can operate on their own tasks or assigned tasks
    return task.createdBy === userId || task.assignedTo === userId
  }

  private async addTagsToTask(taskId: string, tags: string[], organizationId: string): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: taskId, organizationId } })
    if (!task) throw new Error('Task not found')

    const metadata = task.metadata as any || {}
    const currentTags = metadata.tags || []
    const newTags = [...new Set([...currentTags, ...tags])]

    await prisma.task.update({
      where: { id: taskId },
      data: {
        metadata: { ...metadata, tags: newTags }
      }
    })
  }

  private async removeTagsFromTask(taskId: string, tags: string[], organizationId: string): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: taskId, organizationId } })
    if (!task) throw new Error('Task not found')

    const metadata = task.metadata as any || {}
    const currentTags = metadata.tags || []
    const newTags = currentTags.filter((tag: string) => !tags.includes(tag))

    await prisma.task.update({
      where: { id: taskId },
      data: {
        metadata: { ...metadata, tags: newTags }
      }
    })
  }

  private async deleteTask(taskId: string, userId: string, organizationId: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId, organizationId },
      data: { isDeleted: true }
    })
  }

  private async archiveTask(taskId: string, userId: string, organizationId: string): Promise<void> {
    const task = await prisma.task.findUnique({ where: { id: taskId, organizationId } })
    if (!task) throw new Error('Task not found')

    const metadata = task.metadata as any || {}
    await prisma.task.update({
      where: { id: taskId },
      data: {
        metadata: { ...metadata, archived: true, archivedAt: new Date(), archivedBy: userId }
      }
    })
  }

  private async getStatusDistribution(whereClause: any) {
    const statuses = await prisma.task.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    })

    return statuses.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<TaskStatus, number>)
  }

  private async getPriorityDistribution(whereClause: any) {
    const priorities = await prisma.task.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: true
    })

    return priorities.reduce((acc, item) => {
      acc[item.priority] = item._count
      return acc
    }, {} as Record<TaskPriority, number>)
  }

  private async getTypeDistribution(whereClause: any) {
    // This would need to be implemented based on metadata querying
    return {} as Record<TaskType, number>
  }

  private async getWorkloadByAssignee(whereClause: any) {
    const workload = await prisma.task.groupBy({
      by: ['assignedTo'],
      where: { ...whereClause, assignedTo: { not: null } },
      _count: true
    })

    // Would need to join with user data to get names
    return workload.map(item => ({
      assigneeId: item.assignedTo!,
      assigneeName: '', // Would be populated from user lookup
      totalTasks: item._count,
      completedTasks: 0, // Would be calculated
      overdueTasks: 0, // Would be calculated  
      averageHours: 0 // Would be calculated
    }))
  }

  private async getProductivityTrends(whereClause: any, dateRange?: any) {
    // Implementation for productivity trends calculation
    return []
  }

  private async getAverageCompletionTime(whereClause: any): Promise<number> {
    const completedTasks = await prisma.task.findMany({
      where: { ...whereClause, status: 'COMPLETED', completedAt: { not: null } },
      select: { createdAt: true, completedAt: true }
    })

    if (completedTasks.length === 0) return 0

    const totalTime = completedTasks.reduce((sum, task) => {
      if (task.completedAt) {
        return sum + (task.completedAt.getTime() - task.createdAt.getTime())
      }
      return sum
    }, 0)

    return Math.round(totalTime / completedTasks.length / (1000 * 60 * 60)) // Convert to hours
  }

  private async triggerApprovalProcess(taskId: string, organizationId: string): Promise<void> {
    // Implementation for approval process triggering
  }

  private async createNextRecurringInstance(task: any): Promise<void> {
    // Implementation for creating next recurring task instance
  }
}

export const taskService = new TaskService()