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

function getInitialFormData(initialData?: Partial<TaskFormData>): TaskFormData {
  const formData: TaskFormData = {
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assignedTo: '',
    dueDate: '',
    estimatedHours: null
  }

  if (initialData) {
    if (initialData.title) formData.title = initialData.title
    if (initialData.description) formData.description = initialData.description
    if (initialData.status) formData.status = initialData.status
    if (initialData.priority) formData.priority = initialData.priority
    if (initialData.assignedTo) formData.assignedTo = initialData.assignedTo
    if (initialData.dueDate) formData.dueDate = initialData.dueDate
    if (initialData.estimatedHours !== undefined) formData.estimatedHours = initialData.estimatedHours
  }

  return formData
}

const validateTitle = (title: string): string => {
  if (!title.trim()) return 'Title is required'
  if (title.length > 200) return 'Title must be less than 200 characters'
  return ''
}

const validateDescription = (description: string): string => {
  if (description.length > 2000) return 'Description must be less than 2000 characters'
  return ''
}

const validateEstimatedHours = (hours: number | null): string => {
  if (hours !== null && hours < 0) return 'Estimated hours must be positive'
  return ''
}

const validateDueDate = (dueDateStr: string): string => {
  if (!dueDateStr) return ''
  
  const dueDate = new Date(dueDateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  if (dueDate < today) return 'Due date cannot be in the past'
  return ''
}

const getInputValue = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  return e.target.type === 'number' 
    ? (e.target.value === '' ? null : Number(e.target.value))
    : e.target.value
}

const clearFieldError = (field: string, errors: Record<string, string>, setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>) => {
  if (errors[field]) {
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }))
  }
}

const FormHeader = ({ isEdit }: { isEdit: boolean }) => (
  <div className="mb-6">
    <h2 className="text-xl font-semibold text-gray-900">
      {isEdit ? 'Edit Task' : 'Create New Task'}
    </h2>
  </div>
)

const ErrorAlert = ({ error }: { error: string }) => (
  <Alert variant="error" className="mb-6">
    {error}
  </Alert>
)

const DescriptionField = ({ value, onChange, error }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
}) => (
  <div>
    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
      Description
    </label>
    <textarea
      id="description"
      value={value}
      onChange={onChange}
      placeholder="Enter task description (optional)"
      maxLength={2000}
      rows={4}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    {error && (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    )}
  </div>
)

const StatusSelect = ({ value, onChange }: { 
  value: TaskStatus; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void 
}) => (
  <div>
    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
      Status
    </label>
    <select
      id="status"
      value={value}
      onChange={onChange}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value={TaskStatus.TODO}>To Do</option>
      <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
      <option value={TaskStatus.IN_REVIEW}>In Review</option>
      <option value={TaskStatus.COMPLETED}>Completed</option>
      <option value={TaskStatus.CANCELLED}>Cancelled</option>
    </select>
  </div>
)

const PrioritySelect = ({ value, onChange }: { 
  value: TaskPriority; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void 
}) => (
  <div>
    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
      Priority
    </label>
    <select
      id="priority"
      value={value}
      onChange={onChange}
      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value={TaskPriority.LOW}>Low</option>
      <option value={TaskPriority.MEDIUM}>Medium</option>
      <option value={TaskPriority.HIGH}>High</option>
      <option value={TaskPriority.URGENT}>Urgent</option>
    </select>
  </div>
)

const AssigneeSelect = ({ value, onChange, users }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  users: User[];
}) => (
  <div>
    <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
      Assign To
    </label>
    <select
      id="assignedTo"
      value={value}
      onChange={onChange}
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
)

const FormActions = ({ onCancel, loading, submitLabel }: {
  onCancel?: () => void;
  loading: boolean;
  submitLabel: string;
}) => (
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
)

// Hook for form state management
function useTaskForm(initialData?: Partial<TaskFormData>, onSubmit?: (data: TaskFormData) => Promise<void>) {
  const [formData, setFormData] = useState<TaskFormData>(getInitialFormData(initialData))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string>('')

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {
      title: validateTitle(formData.title),
      description: validateDescription(formData.description),
      estimatedHours: validateEstimatedHours(formData.estimatedHours),
      dueDate: validateDueDate(formData.dueDate)
    }

    // Remove empty error messages
    Object.keys(newErrors).forEach(key => {
      if (!newErrors[key]) delete newErrors[key]
    })

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
      await onSubmit?.(formData)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleInputChange = (field: keyof TaskFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = getInputValue(e)

    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    clearFieldError(field, errors, setErrors)
  }

  return {
    formData,
    errors,
    submitError,
    handleSubmit,
    handleInputChange
  }
}

// Form fields component
const TaskFormFields = ({ formData, errors, handleInputChange, users }: {
  formData: TaskFormData
  errors: Record<string, string>
  handleInputChange: (field: keyof TaskFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  users: Array<{ id: string; firstName: string; lastName: string; email: string }>
}) => (
  <>
    <Input
      label="Title *"
      value={formData.title}
      onChange={handleInputChange('title')}
      error={errors.title}
      placeholder="Enter task title"
      maxLength={200}
      required
    />

    <DescriptionField 
      value={formData.description} 
      onChange={handleInputChange('description')} 
      error={errors.description}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <StatusSelect value={formData.status} onChange={handleInputChange('status')} />
      <PrioritySelect value={formData.priority} onChange={handleInputChange('priority')} />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AssigneeSelect 
        value={formData.assignedTo} 
        onChange={handleInputChange('assignedTo')} 
        users={users}
      />
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
  </>
)

// Main TaskForm component
export function TaskForm({ initialData, users = [], onSubmit, onCancel, loading = false, submitLabel = 'Create Task' }: TaskFormProps) {
  const { formData, errors, submitError, handleSubmit, handleInputChange } = useTaskForm(initialData, onSubmit)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <FormHeader isEdit={!!initialData} />
      {submitError && <ErrorAlert error={submitError} />}
      <form onSubmit={handleSubmit} className="space-y-6">
        <TaskFormFields 
          formData={formData} 
          errors={errors} 
          handleInputChange={handleInputChange} 
          users={users} 
        />
        <FormActions {...(onCancel ? { onCancel } : {})} loading={loading} submitLabel={submitLabel} />
      </form>
    </Card>
  )
}