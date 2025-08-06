'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarView, TimelineView, ResourceCalendar, CalendarTaskForm } from '@/components/task'
import { Button } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  startDate?: string
  estimatedHours?: number
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

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

type ViewMode = 'calendar' | 'timeline' | 'resource'

export default function TaskCalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskFormDate, setTaskFormDate] = useState<Date | null>(null)

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

  // Fetch users
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

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task)
    setTaskFormDate(null)
    setShowTaskForm(true)
  }, [])

  // Handle date click (for creating new tasks)
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  // Handle task creation from calendar
  const handleTaskCreate = useCallback((date: Date) => {
    setSelectedTask(null)
    setTaskFormDate(date)
    setShowTaskForm(true)
  }, [])

  // Handle task form submission
  const handleTaskSubmit = useCallback(async (taskData: any) => {
    try {
      const url = selectedTask ? `/api/tasks/${selectedTask.id}` : '/api/tasks'
      const method = selectedTask ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        const data = await response.json()
        
        if (selectedTask) {
          // Update existing task
          setTasks(prev => prev.map(task => 
            task.id === selectedTask.id ? data.data : task
          ))
        } else {
          // Add new task
          setTasks(prev => [...prev, data.data])
        }
        
        setShowTaskForm(false)
        setSelectedTask(null)
        setTaskFormDate(null)
      }
    } catch (error) {
      console.error('Failed to submit task:', error)
    }
  }, [selectedTask])

  // Handle task deletion
  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId))
        setShowTaskForm(false)
        setSelectedTask(null)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }, [])

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

  // Handle task update from timeline/calendar drag
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => prev.map(task => 
          task.id === taskId ? data.data : task
        ))
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }, [])

  // Handle meeting scheduling from resource calendar
  const handleScheduleMeeting = useCallback(async (userIds: string[], startTime: Date, endTime: Date) => {
    try {
      // Create a meeting task
      const meetingData = {
        title: 'Team Meeting',
        description: 'Scheduled team meeting',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        startDate: startTime.toISOString(),
        dueDate: endTime.toISOString(),
        estimatedHours: Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)),
        assignedTo: userIds[0], // Assign to first user
        metadata: {
          meeting: {
            attendees: userIds,
            type: 'team_meeting'
          }
        }
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => [...prev, data.data])
      }
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Calendar</h1>
          <p className="text-gray-600">Manage tasks with calendar and timeline views</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setViewMode('resource')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'resource'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Resource
            </button>
          </div>
          
          <Button
            onClick={() => {
              setSelectedTask(null)
              setTaskFormDate(new Date())
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'calendar' && (
          <CalendarView
            tasks={tasks}
            loading={loading}
            onTaskClick={handleTaskClick}
            onDateClick={handleDateClick}
            onTaskCreate={handleTaskCreate}
            onTaskStatusChange={handleTaskStatusChange}
            selectedDate={selectedDate}
          />
        )}

        {viewMode === 'timeline' && (
          <TimelineView
            tasks={tasks}
            loading={loading}
            onTaskClick={handleTaskClick}
            onTaskUpdate={handleTaskUpdate}
            selectedDate={selectedDate}
            viewMode="month"
          />
        )}

        {viewMode === 'resource' && (
          <ResourceCalendar
            users={users}
            selectedDate={selectedDate}
            onScheduleMeeting={handleScheduleMeeting}
            onTaskSchedule={(taskId, userId, startTime, endTime) => {
              handleTaskUpdate(taskId, {
                assignedTo: userId,
                startDate: startTime.toISOString(),
                dueDate: endTime.toISOString()
              })
            }}
          />
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <button
                  onClick={() => {
                    setShowTaskForm(false)
                    setSelectedTask(null)
                    setTaskFormDate(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <CalendarTaskForm
                initialDate={taskFormDate || undefined}
                initialTask={selectedTask ? {
                  id: selectedTask.id,
                  title: selectedTask.title,
                  description: selectedTask.description,
                  status: selectedTask.status,
                  priority: selectedTask.priority,
                  assignedTo: selectedTask.assignedUser?.email,
                  startDate: selectedTask.startDate,
                  dueDate: selectedTask.dueDate,
                  estimatedHours: selectedTask.estimatedHours
                } : undefined}
                users={users}
                onSubmit={handleTaskSubmit}
                onCancel={() => {
                  setShowTaskForm(false)
                  setSelectedTask(null)
                  setTaskFormDate(null)
                }}
                onDelete={selectedTask ? handleTaskDelete : undefined}
                submitLabel={selectedTask ? 'Update Task' : 'Create Task'}
                isEditing={!!selectedTask}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}