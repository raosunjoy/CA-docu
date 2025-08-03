'use client'

import { useState } from 'react'
import { Button, Input, Card, Alert } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'

interface TaskFormData {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  dueDate: string
  estimatedHours: number | null
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface TaskFormProps {
  initialData?: Partial<TaskFormData>
  users?: User[]
  onSubmit: (data: TaskFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
  submitLabel?: string
}

export function TaskForm({
  initialData,
  users = [],
  onSubmit,
  onCancel,
  loading = false,
  submitLabel = 'Create Task'
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || TaskStatus.TODO,
    priority: initialData?.priority || TaskPriority.MEDIUM,
    assignedTo: initialData?.assignedTo || '',
    dueDate: initialData?.dueDate || '',
    estimatedHours: initialData?.estimatedHours || null
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string>('')

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }

    if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters'
    }

    if (formData.estimatedHours !== null && formData.estimatedHours < 0) {
      newErrors.estimatedHours = 'Estimated hours must be positive'
    }

    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleInputChange = (field: keyof TaskFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'number' 
      ? (e.target.value === '' ? null : Number(e.target.value))
      : e.target.value

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {initialData ? 'Edit Task' : 'Create New Task'}
        </h2>
      </div>

      {submitError && (
        <Alert variant="error" className="mb-6">
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Title *"
          value={formData.title}
          onChange={handleInputChange('title')}
          error={errors.title}
          placeholder="Enter task title"
          maxLength={200}
          required
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={handleInputChange('description')}
            placeholder="Enter task description (optional)"
            maxLength={2000}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={handleInputChange('status')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.IN_REVIEW}>In Review</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
              <option value={TaskStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={handleInputChange('priority')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
              Assign To
            </label>
            <select
              id="assignedTo"
              value={formData.assignedTo}
              onChange={handleInputChange('assignedTo')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Due Date"
            type="datetime-local"
            value={formData.dueDate}
            onChange={handleInputChange('dueDate')}
            error={errors.dueDate}
          />
        </div>

        <Input
          label="Estimated Hours"
          type="number"
          value={formData.estimatedHours?.toString() || ''}
          onChange={handleInputChange('estimatedHours')}
          error={errors.estimatedHours}
          placeholder="0"
          min="0"
          step="0.5"
        />

        <div className="flex justify-end space-x-3 pt-6 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Card>
  )
}