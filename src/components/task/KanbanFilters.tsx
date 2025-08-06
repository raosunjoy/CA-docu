'use client'

import { useMemo } from 'react'
import { Input } from '@/components/common'
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
}

interface KanbanFilters {
  search: string
  priority: TaskPriority | null
  assignedTo: string | null
  dueDate: 'overdue' | 'today' | 'week' | null
}

interface KanbanFiltersProps {
  filters: KanbanFilters
  onFiltersChange: (filters: Partial<KanbanFilters>) => void
  enableSearch: boolean
  tasks: Task[]
}

export function KanbanFilters({
  filters,
  onFiltersChange,
  enableSearch,
  tasks
}: KanbanFiltersProps) {
  // Get unique assignees from tasks
  const assignees = useMemo(() => {
    const uniqueAssignees = new Map<string, { name: string; email: string }>()
    
    tasks.forEach(task => {
      if (task.assignedUser) {
        const key = task.assignedUser.email
        if (!uniqueAssignees.has(key)) {
          uniqueAssignees.set(key, {
            name: `${task.assignedUser.firstName} ${task.assignedUser.lastName}`,
            email: task.assignedUser.email
          })
        }
      }
    })
    
    return Array.from(uniqueAssignees.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [tasks])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ search: e.target.value })
  }

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const priority = e.target.value === '' ? null : e.target.value as TaskPriority
    onFiltersChange({ priority })
  }

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const assignedTo = e.target.value === '' ? null : e.target.value
    onFiltersChange({ assignedTo })
  }

  const handleDueDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dueDate = e.target.value === '' ? null : e.target.value as 'overdue' | 'today' | 'week'
    onFiltersChange({ dueDate })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priority: null,
      assignedTo: null,
      dueDate: null
    })
  }

  const hasActiveFilters = filters.search || filters.priority || filters.assignedTo || filters.dueDate

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        {enableSearch && (
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
        )}

        {/* Priority Filter */}
        <div className="min-w-40">
          <select
            value={filters.priority || ''}
            onChange={handlePriorityChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Priorities</option>
            <option value={TaskPriority.LOW}>Low</option>
            <option value={TaskPriority.MEDIUM}>Medium</option>
            <option value={TaskPriority.HIGH}>High</option>
            <option value={TaskPriority.URGENT}>Urgent</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div className="min-w-48">
          <select
            value={filters.assignedTo || ''}
            onChange={handleAssigneeChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Assignees</option>
            {assignees.map(assignee => (
              <option key={assignee.email} value={assignee.email}>
                {assignee.name}
              </option>
            ))}
          </select>
        </div>

        {/* Due Date Filter */}
        <div className="min-w-40">
          <select
            value={filters.dueDate || ''}
            onChange={handleDueDateChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Due Dates</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due Today</option>
            <option value="week">Due This Week</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: "{filters.search}"
              <button
                onClick={() => onFiltersChange({ search: '' })}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.priority && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Priority: {filters.priority}
              <button
                onClick={() => onFiltersChange({ priority: null })}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.assignedTo && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Assignee: {assignees.find(a => a.email === filters.assignedTo)?.name || filters.assignedTo}
              <button
                onClick={() => onFiltersChange({ assignedTo: null })}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
          
          {filters.dueDate && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              Due: {filters.dueDate === 'overdue' ? 'Overdue' : filters.dueDate === 'today' ? 'Today' : 'This Week'}
              <button
                onClick={() => onFiltersChange({ dueDate: null })}
                className="ml-1 text-orange-600 hover:text-orange-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}