'use client'

import { useState, useEffect, useCallback } from 'react'
import { KanbanBoard } from '@/components/task/KanbanBoard'
import { BoardCustomization } from '@/components/task/BoardCustomization'
import { TaskForm } from '@/components/task/TaskForm'
import { Button } from '@/components/common'
import { useKanbanBoard } from '@/hooks/useKanbanBoard'
import { TaskStatus, TaskPriority } from '@/types'

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  assignedUser?: {
    firstName: string
    lastName: string
    email: string
  }
  createdByUser: {
    firstName: string
    lastName: string
  }
  _count?: {
    childTasks: number
    comments: number
    attachments: number
  }
}

interface BulkAction {
  type: 'move' | 'assign' | 'priority' | 'delete'
  value?: string | TaskStatus | TaskPriority
}

export default function KanbanBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCustomization, setShowCustomization] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([])

  const { settings, filters, updateSettings, updateFilters } = useKanbanBoard()

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch users for assignment
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    fetchTasks()
    fetchUsers()
  }, [fetchTasks, fetchUsers])

  // Auto-refresh functionality
  useEffect(() => {
    if (!settings.autoRefresh) return

    const interval = setInterval(fetchTasks, settings.refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [settings.autoRefresh, settings.refreshInterval, fetchTasks])

  // Handle task status change
  const handleTaskStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status } : task
        ))
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }, [])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (taskIds: string[], action: BulkAction) => {
    try {
      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskIds,
          operation: action.type,
          value: action.value
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.data.failed > 0) {
          console.warn(`Bulk operation partially failed: ${data.data.errors.join(', ')}`)
        }

        // Refresh tasks to get updated data
        fetchTasks()
      } else {
        console.error('Bulk operation failed')
      }
    } catch (error) {
      console.error('Failed to perform bulk action:', error)
    }
  }, [fetchTasks])

  // Handle task creation
  const handleCreateTask = useCallback(async (taskData: any) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => [...prev, data.data])
        setShowTaskForm(false)
      }
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }, [])

  // Handle task update
  const handleUpdateTask = useCallback(async (taskData: any) => {
    if (!selectedTask) return

    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => prev.map(task => 
          task.id === selectedTask.id ? data.data : task
        ))
        setSelectedTask(null)
        setShowTaskForm(false)
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }, [selectedTask])

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    setShowTaskForm(true)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
          <p className="text-gray-600">Manage tasks with drag-and-drop Kanban board</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowCustomization(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Customize
          </Button>
          
          <Button
            onClick={() => {
              setSelectedTask(null)
              setShowTaskForm(true)
            }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 p-6">
        <KanbanBoard
          tasks={tasks}
          loading={loading}
          onTaskClick={handleTaskClick}
          onTaskStatusChange={handleTaskStatusChange}
          onBulkAction={handleBulkAction}
          onCreateTask={() => {
            setSelectedTask(null)
            setShowTaskForm(true)
          }}
          onFiltersChange={updateFilters}
          customColumns={settings.columns}
          enableBulkActions={settings.enableBulkActions}
          enableFilters={settings.enableFilters}
          enableSearch={settings.enableSearch}
        />
      </div>

      {/* Board Customization Modal */}
      {showCustomization && (
        <BoardCustomization
          settings={settings}
          onSettingsChange={updateSettings}
          onClose={() => setShowCustomization(false)}
        />
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowTaskForm(false)
                    setSelectedTask(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <TaskForm
                initialData={selectedTask ? {
                  title: selectedTask.title,
                  description: selectedTask.description || '',
                  status: selectedTask.status,
                  priority: selectedTask.priority,
                  assignedTo: selectedTask.assignedUser?.email || '',
                  dueDate: selectedTask.dueDate || '',
                  estimatedHours: null
                } : undefined}
                users={users}
                onSubmit={selectedTask ? handleUpdateTask : handleCreateTask}
                onCancel={() => {
                  setShowTaskForm(false)
                  setSelectedTask(null)
                }}
                submitLabel={selectedTask ? 'Update Task' : 'Create Task'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}