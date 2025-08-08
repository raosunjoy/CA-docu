'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'

interface TaskFiltersProps {
  filters: {
    status: string
    priority: string
    assignee: string
    tags: string[]
  }
  onFiltersChange: (filters: any) => void
}

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
]

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

const assigneeOptions = [
  { value: '', label: 'All Assignees' },
  { value: 'John', label: 'John Doe' },
  { value: 'Jane', label: 'Jane Smith' },
  { value: 'Mike', label: 'Mike Johnson' },
  { value: 'Sarah', label: 'Sarah Wilson' },
]

const availableTags = ['GST', 'Filing', 'Q3', 'Audit', 'Planning', 'TDS', 'Return', 'Financial', 'Review']

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    
    handleFilterChange('tags', newTags)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      status: '',
      priority: '',
      assignee: '',
      tags: [],
    })
  }

  const hasActiveFilters = filters.status || filters.priority || filters.assignee || filters.tags.length > 0

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          leftIcon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          }
        >
          Filters
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
          >
            Clear All
          </Button>
        )}

        {/* Active Filter Count */}
        {hasActiveFilters && (
          <Badge variant="primary" size="sm">
            {[filters.status, filters.priority, filters.assignee].filter(Boolean).length + filters.tags.length} active
          </Badge>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignee
              </label>
              <select
                value={filters.assignee}
                onChange={(e) => handleFilterChange('assignee', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              >
                {assigneeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}