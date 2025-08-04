import { useState, useCallback } from 'react'
import { TaskStatus, TaskPriority } from '@/types'

// API utility functions
const buildTasksParams = (
  filters?: TaskFilters,
  sort?: TaskSortOptions,
  page = 1,
  limit = 20
): URLSearchParams => {
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

  return params
}

const makeApiRequest = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    credentials: 'include',
    ...options
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'API request failed')
  }

  return data
}

// State management utilities
const createInitialState = (): TasksState => ({
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

const updateTaskInList = (tasks: Task[], taskId: string, updatedTask: Task): Task[] => {
  return tasks.map(task => task.id === taskId ? updatedTask : task)
}

const removeTaskFromList = (tasks: Task[], taskId: string): Task[] => {
  return tasks.filter(task => task.id !== taskId)
}

const addTaskToList = (tasks: Task[], newTask: Task): Task[] => {
  return [newTask, ...tasks]
}

// Task operations
const createTaskOperation = async (
  taskData: CreateTaskData,
  setState: React.Dispatch<React.SetStateAction<TasksState>>
): Promise<Task> => {
  const data = await makeApiRequest('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  })

  setState(prev => ({
    ...prev,
    tasks: addTaskToList(prev.tasks, data.data),
    pagination: {
      ...prev.pagination,
      total: prev.pagination.total + 1
    }
  }))

  return data.data
}

const updateTaskOperation = async (
  taskId: string,
  updates: UpdateTaskData,
  setState: React.Dispatch<React.SetStateAction<TasksState>>
): Promise<Task> => {
  const data = await makeApiRequest(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  })

  setState(prev => ({
    ...prev,
    tasks: updateTaskInList(prev.tasks, taskId, data.data)
  }))

  return data.data
}

const deleteTaskOperation = async (
  taskId: string,
  setState: React.Dispatch<React.SetStateAction<TasksState>>
): Promise<void> => {
  await makeApiRequest(`/api/tasks/${taskId}`, {
    method: 'DELETE'
  })

  setState(prev => ({
    ...prev,
    tasks: removeTaskFromList(prev.tasks, taskId),
    pagination: {
      ...prev.pagination,
      total: prev.pagination.total - 1
    }
  }))
}

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
  metadata: Record<string, unknown>
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
  metadata?: Record<string, unknown>
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
  const [state, setState] = useState<TasksState>(createInitialState)

  const fetchTasks = useCallback(async (
    filters?: TaskFilters,
    sort?: TaskSortOptions,
    page = 1,
    limit = 20
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = buildTasksParams(filters, sort, page, limit)
      const data = await makeApiRequest(`/api/tasks?${params.toString()}`)

      setState(prev => ({
        ...prev,
        tasks: data.data.tasks,
        pagination: data.data.pagination,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }))
    }
  }, [])

  const createTask = (taskData: CreateTaskData): Promise<Task> => {
    return createTaskOperation(taskData, setState)
  }

  const updateTask = (taskId: string, updates: UpdateTaskData): Promise<Task> => {
    return updateTaskOperation(taskId, updates, setState)
  }

  const deleteTask = (taskId: string): Promise<void> => {
    return deleteTaskOperation(taskId, setState)
  }

  const getTask = async (taskId: string): Promise<Task> => {
    const data = await makeApiRequest(`/api/tasks/${taskId}`)
    return data.data
  }

  const lockTask = async (taskId: string): Promise<void> => {
    await makeApiRequest(`/api/tasks/${taskId}/lock`, {
      method: 'POST'
    })
  }

  const unlockTask = async (taskId: string): Promise<void> => {
    await makeApiRequest(`/api/tasks/${taskId}/lock`, {
      method: 'DELETE'
    })
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