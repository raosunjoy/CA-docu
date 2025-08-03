import { useState, useCallback } from 'react'
import { TaskStatus, TaskPriority } from '@/types'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo?: string
  createdBy: string
  parentTaskId?: string
  dueDate?: string
  completedAt?: string
  estimatedHours?: number
  actualHours?: number
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  assignedUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  createdByUser: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  parentTask?: {
    id: string
    title: string
  }
  _count?: {
    childTasks: number
    comments: number
    attachments: number
  }
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  createdBy?: string
  search?: string
}

export interface TaskSortOptions {
  field: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title'
  direction: 'asc' | 'desc'
}

export interface CreateTaskData {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  parentTaskId?: string
  dueDate?: string
  estimatedHours?: number
  metadata?: Record<string, any>
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  actualHours?: number
}

export interface TasksState {
  tasks: Task[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function useTasks() {
  const [state, setState] = useState<TasksState>({
    tasks: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  })

  const fetchTasks = useCallback(async (
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    page = 1,
    limit = 20
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams()
      
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      
      if (sort) {
        params.set('sortBy', sort.field)
        params.set('sortOrder', sort.direction)
      }

      if (filters) {
        if (filters.status) params.set('status', filters.status)
        if (filters.priority) params.set('priority', filters.priority)
        if (filters.assignedTo) params.set('assignedTo', filters.assignedTo)
        if (filters.createdBy) params.set('createdBy', filters.createdBy)
        if (filters.search) params.set('search', filters.search)
      }

      const response = await fetch(`/api/tasks?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          tasks: data.data.tasks,
          pagination: data.data.pagination,
          loading: false
        }))
      } else {
        throw new Error(data.error?.message || 'Failed to fetch tasks')
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }))
    }
  }, [])

  const createTask = async (taskData: CreateTaskData): Promise<Task> => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(taskData)
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to create task')
    }

    // Add the new task to the current state
    setState(prev => ({
      ...prev,
      tasks: [data.data, ...prev.tasks],
      pagination: {
        ...prev.pagination,
        total: prev.pagination.total + 1
      }
    }))

    return data.data
  }

  const updateTask = async (taskId: string, updates: UpdateTaskData): Promise<Task> => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(updates)
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to update task')
    }

    // Update the task in the current state
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task => 
        task.id === taskId ? data.data : task
      )
    }))

    return data.data
  }

  const deleteTask = async (taskId: string): Promise<void> => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to delete task')
    }

    // Remove the task from the current state
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(task => task.id !== taskId),
      pagination: {
        ...prev.pagination,
        total: prev.pagination.total - 1
      }
    }))
  }

  const getTask = async (taskId: string): Promise<Task> => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to fetch task')
    }

    return data.data
  }

  const lockTask = async (taskId: string): Promise<void> => {
    const response = await fetch(`/api/tasks/${taskId}/lock`, {
      method: 'POST',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to lock task')
    }
  }

  const unlockTask = async (taskId: string): Promise<void> => {
    const response = await fetch(`/api/tasks/${taskId}/lock`, {
      method: 'DELETE',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to unlock task')
    }
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  return {
    ...state,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTask,
    lockTask,
    unlockTask,
    clearError
  }
}