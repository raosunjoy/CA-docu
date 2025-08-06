'use client'

import { useState, useCallback, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Button, Input } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface CalendarTaskFormProps {
  initialDate?: Date
  initialTask?: {
    id?: string
    title: string
    description?: string
    status: TaskStatus
    priority: TaskPriority
    assignedTo?: string
    startDate?: string
    dueDate?: string
    estimatedHours?: number
  }
  users: User[]
  onSubmit: (taskData: any) => Promise<void>
  onCancel: () => void
  onDelete?: (taskId: string) => Promise<void>
  submitLabel?: string
  isEditing?: boolean
}

interface RecurrenceOptions {
  enabled: boolean
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek?: number[]
  endType: 'never' | 'after' | 'on'
  endAfter?: number
  endOn?: string
}

export function CalendarTaskForm({
  initialDate,
  initialTask,
  users,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = 'Create Task',
  isEditing = false
}: CalendarTaskFormProps) {
  const [formData, setFormData] = useState({
    title: initialTask?.title || '',
    description: initialTask?.description || '',
    status: initialTask?.status || TaskStatus.TODO,
    priority: initialTask?.priority || TaskPriority.MEDIUM,
    assignedTo: initialTask?.assignedTo || '',
    startDate: initialTask?.startDate || (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''),
    startTime: initialTask?.startDate ? format(parseISO(initialTask.startDate), 'HH:mm') : '09:00',
    dueDate: initialTask?.dueDate || (initialDate ? format(initialDate, 'yyyy-MM-dd') : ''),
    dueTime: initialTask?.dueDate ? format(parseISO(initialTask.dueDate), 'HH:mm') : '17:00',
    estimatedHours: initialTask?.estimatedHours || 1,
    isAllDay: false,
    location: '',
    attendees: [] as string[],
    reminders: [15] as number[], // minutes before
    visibility: 'private' as 'private' | 'public',
    category: '',
    tags: [] as string[]
  })

  const [recurrence, setRecurrence] = useState<RecurrenceOptions>({
    enabled: false,
    pattern: 'weekly',
    interval: 1,
    daysOfWeek: [],
    endType: 'never',
    endAfter: 10,
    endOn: ''
  })

  const [calendarSync, setCalendarSync] = useState({
    enabled: false,
    calendarId: '',
    createEvent: true,
    syncBidirectional: true
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required'
    }

    if (formData.startDate && formData.dueDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`)
      
      if (startDateTime >= dueDateTime) {
        newErrors.dueDate = 'Due date must be after start date'
      }
    }

    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Estimated hours must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      const startDateTime = formData.isAllDay 
        ? formData.startDate
        : `${formData.startDate}T${formData.startTime}:00`
      
      const dueDateTime = formData.isAllDay
        ? formData.dueDate
        : `${formData.dueDate}T${formData.dueTime}:00`

      const taskData = {
        ...formData,
        startDate: startDateTime,
        dueDate: dueDateTime,
        metadata: {
          calendar: {
            isAllDay: formData.isAllDay,
            location: formData.location,
            attendees: formData.attendees,
            reminders: formData.reminders,
            visibility: formData.visibility,
            category: formData.category,
            tags: formData.tags,
            sync: calendarSync
          },
          recurrence: recurrence.enabled ? recurrence : undefined
        }
      }

      await onSubmit(taskData)
    } catch (error) {
      console.error('Failed to submit task:', error)
    } finally {
      setLoading(false)
    }
  }, [formData, recurrence, calendarSync, validateForm, onSubmit])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!initialTask?.id || !onDelete) return

    if (confirm('Are you sure you want to delete this task?')) {
      setLoading(true)
      try {
        await onDelete(initialTask.id)
      } catch (error) {
        console.error('Failed to delete task:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [initialTask?.id, onDelete])

  // Auto-calculate due date based on estimated hours
  useEffect(() => {
    if (formData.startDate && formData.estimatedHours && !isEditing) {
      const startDate = new Date(formData.startDate)
      const workingHoursPerDay = 8
      const daysNeeded = Math.ceil(formData.estimatedHours / workingHoursPerDay)
      
      const dueDate = new Date(startDate)
      dueDate.setDate(dueDate.getDate() + daysNeeded - 1)
      
      setFormData(prev => ({
        ...prev,
        dueDate: format(dueDate, 'yyyy-MM-dd')
      }))
    }
  }, [formData.startDate, formData.estimatedHours, isEditing])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Task Details</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter task title"
            error={errors.title}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter task description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.IN_REVIEW}>In Review</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
              <option value={TaskStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <select
            value={formData.assignedTo}
            onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.email}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timing */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Timing</h3>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isAllDay"
            checked={formData.isAllDay}
            onChange={(e) => setFormData(prev => ({ ...prev, isAllDay: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="isAllDay" className="text-sm text-gray-700">
            All day task
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <Input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
              error={errors.startDate}
            />
          </div>

          {!formData.isAllDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date *
            </label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              error={errors.dueDate}
            />
          </div>

          {!formData.isAllDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Time
              </label>
              <Input
                type="time"
                value={formData.dueTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Hours
          </label>
          <Input
            type="number"
            value={formData.estimatedHours}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 0 }))}
            min="0.5"
            step="0.5"
            error={errors.estimatedHours}
          />
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Calendar Integration</h3>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="calendarSync"
            checked={calendarSync.enabled}
            onChange={(e) => setCalendarSync(prev => ({ ...prev, enabled: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="calendarSync" className="text-sm text-gray-700">
            Sync with external calendar
          </label>
        </div>

        {calendarSync.enabled && (
          <div className="ml-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Meeting location or address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visibility
              </label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as 'private' | 'public' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Recurrence */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Recurrence</h3>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="recurrence"
            checked={recurrence.enabled}
            onChange={(e) => setRecurrence(prev => ({ ...prev, enabled: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="recurrence" className="text-sm text-gray-700">
            Repeat this task
          </label>
        </div>

        {recurrence.enabled && (
          <div className="ml-6 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repeat
                </label>
                <select
                  value={recurrence.pattern}
                  onChange={(e) => setRecurrence(prev => ({ ...prev, pattern: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Every
                </label>
                <Input
                  type="number"
                  value={recurrence.interval}
                  onChange={(e) => setRecurrence(prev => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ends
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="endType"
                    value="never"
                    checked={recurrence.endType === 'never'}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endType: 'never' }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Never</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="endType"
                    value="after"
                    checked={recurrence.endType === 'after'}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endType: 'after' }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 mr-2">After</span>
                  <Input
                    type="number"
                    value={recurrence.endAfter || ''}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endAfter: parseInt(e.target.value) || undefined }))}
                    min="1"
                    className="w-20"
                    disabled={recurrence.endType !== 'after'}
                  />
                  <span className="text-sm text-gray-700 ml-2">occurrences</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="endType"
                    value="on"
                    checked={recurrence.endType === 'on'}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endType: 'on' }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 mr-2">On</span>
                  <Input
                    type="date"
                    value={recurrence.endOn || ''}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endOn: e.target.value }))}
                    disabled={recurrence.endType !== 'on'}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <div>
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
              disabled={loading}
              className="text-red-600 hover:text-red-700"
            >
              Delete Task
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}