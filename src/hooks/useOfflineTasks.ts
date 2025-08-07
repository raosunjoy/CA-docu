// Offline Tasks Hook - Enhanced version of useTasks with offline capabilities
import { useState, useCallback, useEffect } from 'react'
import { Task, TaskStatus, TaskPriority, CreateTaskData, UpdateTaskData, TaskFilters } from '@/types'
import { offlineTaskService } from '@/lib/offline-task-service'
import { useTasks } from './useTasks'

interface OfflineTasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  pendingOperations: number
  conflicts: number
  lastSyncAt?: Date
}

interface OfflineTasksActions {
  // Core CRUD operations
  fetchTasks: (filters?: TaskFilters) => Promise<void>
  createTask: (taskData: CreateTaskData) => Promise<Task>
  updateTask: (taskId: string, updates: UpdateTaskData) => Promise<Task>
  deleteTask: (taskId: string) => Promise<void>
  getTask: (taskId: string) => Promise<Task | null>
  
  // Status operations
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<Task>
  completeTask: (taskId: string, actualHours?: number) => Promise<Task>
  
  // Assignment operations
  assignTask: (taskId: string, assigneeId: string) => Promise<Task>
  unassignTask: (taskId: string) => Promise<Task>
  
  // Search and filtering
  searchTasks: (query: string) => Promise<Task[]>
  getTasksByStatus: (status: TaskStatus) => Promise<Task[]>
  getTasksByAssignee: (assigneeId: string) => Promise<Task[]>
  getOverdueTasks: () => Promise<Task[]>
  
  // Offline-specific operations
  syncTasks: () => Promise<void>
  resolveConflict: (taskId: string, resolution: 'local' | 'remote' | 'merge') => Promise<Task>
  getPendingOperations: () => Promise<any[]>
  getConflictedTasks: () => Promise<Task[]>
  
  // Utility operations
  clearError: () => void
  refreshOfflineStats: () => Promise<void>
}

export function useOfflineTasks(): OfflineTasksState & OfflineTasksActions {
  const [state, setState] = useState<OfflineTasksState>({
    tasks: [],
    loading: false,
    error: null,
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    pendingOperations: 0,
    conflicts: 0
  })

  // Use online tasks hook for when we're connected
  const onlineTasks = useTasks()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
      // Auto-sync when coming back online
      syncTasks()
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load offline stats on mount
  useEffect(() => {
    refreshOfflineStats()
  }, [])

  const refreshOfflineStats = useCallback(async () => {
    try {
      const stats = await offlineTaskService.getOfflineStats()
      const pendingOps = await offlineTaskService.getPendingSyncOperations()
      const conflictedTasks = await offlineTaskService.getConflictedTasks()

      setState(prev => ({
        ...prev,
        pendingOperations: pendingOps.length,
        conflicts: conflictedTasks.length
      }))
    } catch (error) {
      console.error('Failed to refresh offline stats:', error)
    }
  }, [])

  const fetchTasks = useCallback(async (filters?: TaskFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let tasks: Task[]

      if (state.isOnline) {
        // Try to fetch from server first
        try {
          await onlineTasks.fetchTasks(filters)
          tasks = onlineTasks.tasks
          
          // Cache tasks offline
          for (const task of tasks) {
            await offlineTaskService.updateTask(task.id, task)
          }
        } catch (error) {
          // Fallback to offline data
          tasks = await offlineTaskService.getTasks(filters)
        }
      } else {
        // Load from offline storage
        tasks = await offlineTaskService.getTasks(filters)
      }

      setState(prev => ({
        ...prev,
        tasks,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tasks'
      }))
    }
  }, [state.isOnline, onlineTasks])

  const createTask = useCallback(async (taskData: CreateTaskData): Promise<Task> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      let task: Task

      if (state.isOnline) {
        // Try online creation first
        try {
          task = await onlineTasks.createTask(taskData)
          // Cache the created task offline
          await offlineTaskService.updateTask(task.id, task)
        } catch (error) {
          // Fallback to offline creation
          task = await offlineTaskService.createTask(taskData)
        }
      } else {
        // Create offline
        task = await offlineTaskService.createTask(taskData)
      }

      setState(prev => ({
        ...prev,
        tasks: [task, ...prev.tasks]
      }))

      await refreshOfflineStats()
      return task
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, onlineTasks, refreshOfflineStats])

  const updateTask = useCallback(async (taskId: string, updates: UpdateTaskData): Promise<Task> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      let task: Task

      if (state.isOnline) {
        // Try online update first
        try {
          task = await onlineTasks.updateTask(taskId, updates)
          // Update offline cache
          await offlineTaskService.updateTask(taskId, task)
        } catch (error) {
          // Fallback to offline update
          task = await offlineTaskService.updateTask(taskId, updates)
        }
      } else {
        // Update offline
        task = await offlineTaskService.updateTask(taskId, updates)
      }

      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? task : t)
      }))

      await refreshOfflineStats()
      return task
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, onlineTasks, refreshOfflineStats])

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      if (state.isOnline) {
        // Try online deletion first
        try {
          await onlineTasks.deleteTask(taskId)
          // Mark as deleted offline
          await offlineTaskService.deleteTask(taskId)
        } catch (error) {
          // Fallback to offline deletion
          await offlineTaskService.deleteTask(taskId)
        }
      } else {
        // Delete offline
        await offlineTaskService.deleteTask(taskId)
      }

      setState(prev => ({
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      }))

      await refreshOfflineStats()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, onlineTasks, refreshOfflineStats])

  const getTask = useCallback(async (taskId: string): Promise<Task | null> => {
    try {
      if (state.isOnline) {
        // Try online first
        try {
          return await onlineTasks.getTask(taskId)
        } catch (error) {
          // Fallback to offline
          return await offlineTaskService.getTask(taskId)
        }
      } else {
        // Get from offline storage
        return await offlineTaskService.getTask(taskId)
      }
    } catch (error) {
      console.error('Failed to get task:', error)
      return null
    }
  }, [state.isOnline, onlineTasks])

  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus): Promise<Task> => {
    return updateTask(taskId, { status })
  }, [updateTask])

  const completeTask = useCallback(async (taskId: string, actualHours?: number): Promise<Task> => {
    return offlineTaskService.completeTask(taskId, actualHours)
  }, [])

  const assignTask = useCallback(async (taskId: string, assigneeId: string): Promise<Task> => {
    return updateTask(taskId, { assignedTo: assigneeId })
  }, [updateTask])

  const unassignTask = useCallback(async (taskId: string): Promise<Task> => {
    return updateTask(taskId, { assignedTo: null })
  }, [updateTask])

  const searchTasks = useCallback(async (query: string): Promise<Task[]> => {
    try {
      if (state.isOnline) {
        // Search online first, then cache results
        // For now, use offline search
        return await offlineTaskService.searchTasks(query)
      } else {
        return await offlineTaskService.searchTasks(query)
      }
    } catch (error) {
      console.error('Failed to search tasks:', error)
      return []
    }
  }, [state.isOnline])

  const getTasksByStatus = useCallback(async (status: TaskStatus): Promise<Task[]> => {
    return offlineTaskService.getTasksByStatus(status)
  }, [])

  const getTasksByAssignee = useCallback(async (assigneeId: string): Promise<Task[]> => {
    return offlineTaskService.getTasksByAssignee(assigneeId)
  }, [])

  const getOverdueTasks = useCallback(async (): Promise<Task[]> => {
    return offlineTaskService.getOverdueTasks()
  }, [])

  const syncTasks = useCallback(async (): Promise<void> => {
    if (!state.isOnline) {
      throw new Error('Cannot sync while offline')
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing' }))

    try {
      // Get pending operations
      const pendingOps = await offlineTaskService.getPendingSyncOperations()
      
      // Process each operation
      for (const op of pendingOps) {
        try {
          switch (op.type) {
            case 'create':
              await onlineTasks.createTask(op.data)
              break
            case 'update':
              await onlineTasks.updateTask(op.resourceId, op.data)
              break
            case 'delete':
              await onlineTasks.deleteTask(op.resourceId)
              break
          }
          
          // Mark operation as completed
          // This would need implementation in the sync queue management
        } catch (error) {
          console.error(`Failed to sync operation ${op.id}:`, error)
          // Handle conflict or retry logic
        }
      }

      setState(prev => ({ 
        ...prev, 
        syncStatus: 'idle',
        lastSyncAt: new Date()
      }))

      await refreshOfflineStats()
    } catch (error) {
      setState(prev => ({ ...prev, syncStatus: 'error' }))
      throw error
    }
  }, [state.isOnline, onlineTasks, refreshOfflineStats])

  const resolveConflict = useCallback(async (
    taskId: string, 
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<Task> => {
    const resolvedTask = await offlineTaskService.resolveTaskConflict(taskId, resolution)
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? resolvedTask : t)
    }))

    await refreshOfflineStats()
    return resolvedTask
  }, [refreshOfflineStats])

  const getPendingOperations = useCallback(async () => {
    return offlineTaskService.getPendingSyncOperations()
  }, [])

  const getConflictedTasks = useCallback(async () => {
    return offlineTaskService.getConflictedTasks()
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTask,
    updateTaskStatus,
    completeTask,
    assignTask,
    unassignTask,
    searchTasks,
    getTasksByStatus,
    getTasksByAssignee,
    getOverdueTasks,
    syncTasks,
    resolveConflict,
    getPendingOperations,
    getConflictedTasks,
    clearError,
    refreshOfflineStats
  }
}