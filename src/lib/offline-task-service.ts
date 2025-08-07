// Offline Task Management Service
import { offlineStorage, OfflineStorageService } from './offline-storage'
import { Task, TaskStatus, TaskPriority, CreateTaskData, UpdateTaskData, TaskFilters } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface OfflineTask extends Task {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<Task>
  conflictData?: Task
  isDeleted?: boolean
  cachedAt: Date
}

interface OfflineTaskComment {
  id: string
  taskId: string
  content: string
  createdBy: string
  createdAt: Date
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  isDeleted?: boolean
}

interface OfflineTaskAttachment {
  id: string
  taskId: string
  filename: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  isDeleted?: boolean
}

export class OfflineTaskService {
  private storage: OfflineStorageService

  constructor() {
    this.storage = offlineStorage
  }

  // Task CRUD Operations
  async createTask(taskData: CreateTaskData): Promise<Task> {
    await this.storage.initialize()

    const now = new Date()
    const taskId = uuidv4()
    const userId = this.getCurrentUserId()

    const task: OfflineTask = {
      id: taskId,
      title: taskData.title,
      description: taskData.description || null,
      status: taskData.status || 'TODO',
      priority: taskData.priority || 'MEDIUM',
      assignedTo: taskData.assignedTo || null,
      createdBy: userId,
      organizationId: this.getCurrentOrganizationId(),
      parentTaskId: taskData.parentTaskId || null,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      estimatedHours: taskData.estimatedHours || null,
      actualHours: null,
      metadata: taskData.metadata || {},
      createdAt: now,
      updatedAt: now,
      // Offline-specific fields
      syncStatus: 'pending',
      cachedAt: now,
      isDeleted: false
    }

    await this.storage.store('tasks', task)
    await this.queueSyncOperation('create', 'task', taskId, task)

    return task
  }

  async updateTask(taskId: string, updates: UpdateTaskData): Promise<Task> {
    await this.storage.initialize()

    const existingTask = await this.storage.get('tasks', taskId)
    if (!existingTask) {
      throw new Error('Task not found')
    }

    const now = new Date()
    const updatedTask: OfflineTask = {
      ...existingTask,
      ...updates,
      updatedAt: now,
      syncStatus: existingTask.syncStatus === 'synced' ? 'pending' : existingTask.syncStatus,
      localChanges: {
        ...existingTask.localChanges,
        ...updates,
        updatedAt: now
      }
    }

    await this.storage.store('tasks', updatedTask)
    await this.queueSyncOperation('update', 'task', taskId, updates)

    return updatedTask
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.storage.initialize()

    const existingTask = await this.storage.get('tasks', taskId)
    if (!existingTask) {
      throw new Error('Task not found')
    }

    const now = new Date()
    const deletedTask: OfflineTask = {
      ...existingTask,
      isDeleted: true,
      updatedAt: now,
      syncStatus: 'pending'
    }

    await this.storage.store('tasks', deletedTask)
    await this.queueSyncOperation('delete', 'task', taskId, { isDeleted: true })
  }

  async getTask(taskId: string): Promise<Task | null> {
    await this.storage.initialize()

    const task = await this.storage.get('tasks', taskId)
    if (!task || task.isDeleted) {
      return null
    }

    return task
  }

  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    await this.storage.initialize()

    const allTasks = await this.storage.getAll('tasks', (task) => {
      if (task.isDeleted) return false

      // Apply filters
      if (filters?.status && task.status !== filters.status) return false
      if (filters?.priority && task.priority !== filters.priority) return false
      if (filters?.assignedTo && task.assignedTo !== filters.assignedTo) return false
      if (filters?.createdBy && task.createdBy !== filters.createdBy) return false
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        const titleMatch = task.title.toLowerCase().includes(searchLower)
        const descMatch = task.description?.toLowerCase().includes(searchLower)
        if (!titleMatch && !descMatch) return false
      }

      return true
    })

    return allTasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.getTasks({ status })
  }

  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return this.getTasks({ assignedTo: assigneeId })
  }

  async getOverdueTasks(): Promise<Task[]> {
    await this.storage.initialize()

    const now = new Date()
    const allTasks = await this.storage.getAll('tasks', (task) => {
      return !task.isDeleted && 
             task.dueDate && 
             new Date(task.dueDate) < now && 
             task.status !== 'COMPLETED'
    })

    return allTasks.sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0
      return aDate - bDate
    })
  }

  // Task Status Updates
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const updates: UpdateTaskData = { status }
    
    if (status === 'COMPLETED') {
      updates.actualHours = updates.actualHours || 0
    }

    return this.updateTask(taskId, updates)
  }

  async completeTask(taskId: string, actualHours?: number): Promise<Task> {
    const updates: UpdateTaskData = {
      status: 'COMPLETED',
      actualHours: actualHours
    }

    return this.updateTask(taskId, updates)
  }

  // Task Assignment
  async assignTask(taskId: string, assigneeId: string): Promise<Task> {
    return this.updateTask(taskId, { assignedTo: assigneeId })
  }

  async unassignTask(taskId: string): Promise<Task> {
    return this.updateTask(taskId, { assignedTo: null })
  }

  // Task Comments (offline)
  async addTaskComment(taskId: string, content: string): Promise<OfflineTaskComment> {
    await this.storage.initialize()

    const commentId = uuidv4()
    const now = new Date()
    const userId = this.getCurrentUserId()

    const comment: OfflineTaskComment = {
      id: commentId,
      taskId,
      content,
      createdBy: userId,
      createdAt: now,
      syncStatus: 'pending',
      isDeleted: false
    }

    // Store comment in a separate collection (would need to add to schema)
    await this.queueSyncOperation('create', 'task_comment', commentId, comment)

    return comment
  }

  // Task Attachments (offline)
  async addTaskAttachment(
    taskId: string, 
    file: File
  ): Promise<OfflineTaskAttachment> {
    await this.storage.initialize()

    const attachmentId = uuidv4()
    const now = new Date()
    const userId = this.getCurrentUserId()

    // Store file locally (in IndexedDB or File System Access API)
    const localFilePath = await this.storeFileLocally(file, attachmentId)

    const attachment: OfflineTaskAttachment = {
      id: attachmentId,
      taskId,
      filename: file.name,
      filePath: localFilePath,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: userId,
      uploadedAt: now,
      syncStatus: 'pending',
      isDeleted: false
    }

    await this.queueSyncOperation('create', 'task_attachment', attachmentId, attachment)

    return attachment
  }

  // Search functionality
  async searchTasks(query: string): Promise<Task[]> {
    await this.storage.initialize()

    const searchLower = query.toLowerCase()
    const allTasks = await this.storage.getAll('tasks', (task) => {
      if (task.isDeleted) return false

      const titleMatch = task.title.toLowerCase().includes(searchLower)
      const descMatch = task.description?.toLowerCase().includes(searchLower)
      const metadataMatch = JSON.stringify(task.metadata).toLowerCase().includes(searchLower)

      return titleMatch || descMatch || metadataMatch
    })

    return allTasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  // Workflow execution (offline)
  async executeWorkflowStep(taskId: string, stepData: any): Promise<void> {
    await this.storage.initialize()

    const task = await this.storage.get('tasks', taskId)
    if (!task) {
      throw new Error('Task not found')
    }

    // Update task with workflow step data
    const workflowMetadata = {
      ...task.metadata,
      workflow: {
        ...((task.metadata as any)?.workflow || {}),
        currentStep: stepData.stepNumber,
        stepHistory: [
          ...((task.metadata as any)?.workflow?.stepHistory || []),
          {
            step: stepData.stepNumber,
            completedAt: new Date(),
            data: stepData
          }
        ]
      }
    }

    await this.updateTask(taskId, { metadata: workflowMetadata })
  }

  // Sync queue management
  private async queueSyncOperation(
    type: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    data: any
  ): Promise<void> {
    const operation = {
      id: uuidv4(),
      type,
      resourceType,
      resourceId,
      data,
      priority: this.getSyncPriority(type, resourceType),
      status: 'pending' as const,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    }

    await this.storage.store('sync_queue', operation)
  }

  private getSyncPriority(type: string, resourceType: string): number {
    // Higher priority for critical operations
    if (type === 'delete') return 1
    if (type === 'create') return 2
    if (type === 'update') return 3
    return 4
  }

  // File storage utilities
  private async storeFileLocally(file: File, fileId: string): Promise<string> {
    // Store file in IndexedDB as blob
    const fileData = await file.arrayBuffer()
    const blob = new Blob([fileData], { type: file.type })
    
    // In a real implementation, you might use File System Access API
    // For now, we'll store the file data in IndexedDB
    const filePath = `offline_files/${fileId}_${file.name}`
    
    // Store file data (this would need additional IndexedDB store)
    localStorage.setItem(`file_${fileId}`, JSON.stringify({
      name: file.name,
      type: file.type,
      size: file.size,
      data: Array.from(new Uint8Array(fileData))
    }))

    return filePath
  }

  // Utility methods
  private getCurrentUserId(): string {
    return localStorage.getItem('current_user_id') || 'offline_user'
  }

  private getCurrentOrganizationId(): string {
    return localStorage.getItem('current_organization_id') || 'offline_org'
  }

  // Sync status management
  async getPendingSyncOperations(): Promise<any[]> {
    await this.storage.initialize()
    return this.storage.getAll('sync_queue', (op) => op.status === 'pending')
  }

  async getConflictedTasks(): Promise<OfflineTask[]> {
    await this.storage.initialize()
    return this.storage.getAll('tasks', (task) => task.syncStatus === 'conflict')
  }

  async resolveTaskConflict(
    taskId: string, 
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<Task> {
    await this.storage.initialize()

    const task = await this.storage.get('tasks', taskId)
    if (!task || task.syncStatus !== 'conflict') {
      throw new Error('No conflict found for this task')
    }

    let resolvedTask: OfflineTask

    switch (resolution) {
      case 'local':
        resolvedTask = {
          ...task,
          syncStatus: 'pending'
        }
        break
      
      case 'remote':
        resolvedTask = {
          ...task.conflictData!,
          syncStatus: 'synced',
          cachedAt: new Date()
        } as OfflineTask
        break
      
      case 'merge':
        resolvedTask = {
          ...task.conflictData!,
          ...task.localChanges,
          syncStatus: 'pending',
          cachedAt: new Date()
        } as OfflineTask
        break
    }

    delete resolvedTask.conflictData
    delete resolvedTask.localChanges

    await this.storage.store('tasks', resolvedTask)
    
    if (resolution !== 'remote') {
      await this.queueSyncOperation('update', 'task', taskId, resolvedTask)
    }

    return resolvedTask
  }

  // Statistics and monitoring
  async getOfflineStats(): Promise<{
    totalTasks: number
    pendingSync: number
    conflicts: number
    completedOffline: number
    createdOffline: number
  }> {
    await this.storage.initialize()

    const allTasks = await this.storage.getAll('tasks')
    
    return {
      totalTasks: allTasks.filter(t => !t.isDeleted).length,
      pendingSync: allTasks.filter(t => t.syncStatus === 'pending').length,
      conflicts: allTasks.filter(t => t.syncStatus === 'conflict').length,
      completedOffline: allTasks.filter(t => 
        t.status === 'COMPLETED' && t.syncStatus === 'pending'
      ).length,
      createdOffline: allTasks.filter(t => 
        t.syncStatus === 'pending' && !t.lastSyncAt
      ).length
    }
  }
}

// Singleton instance
export const offlineTaskService = new OfflineTaskService()