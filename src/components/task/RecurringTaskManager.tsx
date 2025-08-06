'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { Alert } from '@/components/common/Alert'
import { RecurringTaskData, RecurringTaskUpdateData } from '@/types'

interface RecurringTask {
  id: string
  title: string
  description?: string
  priority: string
  pattern: string
  interval: number
  isActive: boolean
  isPaused: boolean
  nextDue?: Date
  totalGenerated: number
  assignedUser?: {
    id: string
    firstName: string
    lastName: string
  }
}

interface RecurringTaskManagerProps {
  organizationId: string
  userId: string
  onTaskCreated?: (task: RecurringTask) => void
}

export function RecurringTaskManager({ 
  organizationId, 
  userId, 
  onTaskCreated 
}: RecurringTaskManagerProps) {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<RecurringTaskData>>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    pattern: 'WEEKLY',
    interval: 1,
    daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    startDate: new Date(),
    endType: 'NEVER',
  })

  useEffect(() => {
    fetchRecurringTasks()
  }, [organizationId])

  const fetchRecurringTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/tasks/recurring?organizationId=${organizationId}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch recurring tasks')
      }

      const result = await response.json()
      if (result.success) {
        setRecurringTasks(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to fetch recurring tasks')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(
        `/api/tasks/recurring?organizationId=${organizationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            assignedTo: userId,
            startDate: formData.startDate?.toISOString(),
            endDate: formData.endDate?.toISOString(),
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create recurring task')
      }

      const result = await response.json()
      if (result.success) {
        setRecurringTasks(prev => [...prev, result.data])
        setShowCreateForm(false)
        resetForm()
        onTaskCreated?.(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to create recurring task')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleUpdateTask = async (taskId: string, updates: RecurringTaskUpdateData) => {
    try {
      const response = await fetch(
        `/api/tasks/recurring/${taskId}?organizationId=${organizationId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update recurring task')
      }

      const result = await response.json()
      if (result.success) {
        setRecurringTasks(prev =>
          prev.map(task => task.id === taskId ? result.data : task)
        )
        setEditingTask(null)
      } else {
        throw new Error(result.error?.message || 'Failed to update recurring task')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleToggleTask = async (taskId: string, isPaused: boolean) => {
    try {
      const response = await fetch(
        `/api/tasks/recurring/${taskId}/toggle?organizationId=${organizationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isPaused }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to toggle recurring task')
      }

      const result = await response.json()
      if (result.success) {
        setRecurringTasks(prev =>
          prev.map(task => task.id === taskId ? result.data : task)
        )
      } else {
        throw new Error(result.error?.message || 'Failed to toggle recurring task')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this recurring task?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/tasks/recurring/${taskId}?organizationId=${organizationId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to delete recurring task')
      }

      const result = await response.json()
      if (result.success) {
        setRecurringTasks(prev => prev.filter(task => task.id !== taskId))
      } else {
        throw new Error(result.error?.message || 'Failed to delete recurring task')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      pattern: 'WEEKLY',
      interval: 1,
      daysOfWeek: [1, 2, 3, 4, 5],
      startDate: new Date(),
      endType: 'NEVER',
    })
  }

  const formatNextDue = (date?: Date) => {
    if (!date) return 'Not scheduled'
    return new Date(date).toLocaleDateString()
  }

  const getPatternDescription = (task: RecurringTask) => {
    const { pattern, interval, daysOfWeek } = task
    
    switch (pattern) {
      case 'DAILY':
        return interval === 1 ? 'Daily' : `Every ${interval} days`
      case 'WEEKLY':
        if (daysOfWeek && daysOfWeek.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const days = daysOfWeek.map(d => dayNames[d]).join(', ')
          return `Weekly on ${days}`
        }
        return interval === 1 ? 'Weekly' : `Every ${interval} weeks`
      case 'MONTHLY':
        return interval === 1 ? 'Monthly' : `Every ${interval} months`
      case 'QUARTERLY':
        return 'Quarterly'
      case 'YEARLY':
        return 'Yearly'
      default:
        return pattern
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading recurring tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Recurring Tasks</h2>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Create Recurring Task
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create Recurring Task</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority || 'MEDIUM'}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern
                </label>
                <select
                  value={formData.pattern || 'WEEKLY'}
                  onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.interval || 1}
                  onChange={(e) => setFormData(prev => ({ ...prev, interval: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={formData.startDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formData.pattern === 'WEEKLY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week
                </label>
                <div className="flex space-x-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <label key={day} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.daysOfWeek?.includes(index) || false}
                        onChange={(e) => {
                          const days = formData.daysOfWeek || []
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, daysOfWeek: [...days, index] }))
                          } else {
                            setFormData(prev => ({ ...prev, daysOfWeek: days.filter(d => d !== index) }))
                          }
                        }}
                        className="mr-1"
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Create Task
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {recurringTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              No recurring tasks found. Create your first recurring task to get started.
            </div>
          </Card>
        ) : (
          recurringTasks.map((task) => (
            <Card key={task.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.isPaused ? 'bg-gray-100 text-gray-800' :
                      task.isActive ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {task.isPaused ? 'Paused' : task.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Pattern:</span>
                      <div className="text-gray-600">{getPatternDescription(task)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Next Due:</span>
                      <div className="text-gray-600">{formatNextDue(task.nextDue)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Generated:</span>
                      <div className="text-gray-600">{task.totalGenerated} tasks</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Assigned:</span>
                      <div className="text-gray-600">
                        {task.assignedUser 
                          ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
                          : 'Unassigned'
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleTask(task.id, !task.isPaused)}
                  >
                    {task.isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingTask(task)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}