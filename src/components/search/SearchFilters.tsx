'use client'

import React, { useState, useCallback } from 'react'
import { XMarkIcon, CalendarIcon, UserIcon, TagIcon } from '@heroicons/react/24/outline'
import { TagSelector } from '../tags/TagSelector'
import type { SearchFilters as SearchFiltersType } from '@/lib/elasticsearch-service'
import type { TagWithChildren } from '@/lib/tag-service'

interface SearchFiltersProps {
  filters: Partial<SearchFiltersType>
  onChange: (filters: Partial<SearchFiltersType>) => void
  onClose: () => void
}

const CONTENT_TYPES = [
  { value: 'task', label: 'Tasks' },
  { value: 'document', label: 'Documents' },
  { value: 'email', label: 'Emails' },
  { value: 'chat_channel', label: 'Channels' },
  { value: 'chat_message', label: 'Messages' }
]

const TASK_STATUSES = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
]

const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' }
]

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  onClose
}) => {
  const [selectedTags, setSelectedTags] = useState<TagWithChildren[]>([])
  const [availableTags, setAvailableTags] = useState<TagWithChildren[]>([])

  const handleFilterChange = useCallback((key: keyof SearchFiltersType, value: any) => {
    onChange({
      ...filters,
      [key]: value
    })
  }, [filters, onChange])

  const handleArrayFilterToggle = useCallback((key: keyof SearchFiltersType, value: string) => {
    const currentArray = (filters[key] as string[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    handleFilterChange(key, newArray.length > 0 ? newArray : undefined)
  }, [filters, handleFilterChange])

  const handleDateRangeChange = useCallback((field: 'start' | 'end', date: string) => {
    const currentRange = filters.dateRange || { start: new Date(), end: new Date() }
    const newRange = {
      ...currentRange,
      [field]: new Date(date)
    }
    
    handleFilterChange('dateRange', newRange)
  }, [filters.dateRange, handleFilterChange])

  const clearAllFilters = useCallback(() => {
    onChange({})
    setSelectedTags([])
  }, [onChange])

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== undefined
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Search Filters</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Content Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Types
          </label>
          <div className="space-y-2">
            {CONTENT_TYPES.map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.types || []).includes(type.value)}
                  onChange={() => handleArrayFilterToggle('types', type.value)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2">
            {TASK_STATUSES.map((status) => (
              <label key={status.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.status || []).includes(status.value)}
                  onChange={() => handleArrayFilterToggle('status', status.value)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{status.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <div className="space-y-2">
            {TASK_PRIORITIES.map((priority) => (
              <label key={priority.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.priority || []).includes(priority.value)}
                  onChange={() => handleArrayFilterToggle('priority', priority.value)}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{priority.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <TagSelector
          selectedTags={selectedTags}
          availableTags={availableTags}
          onTagsChange={(tags) => {
            setSelectedTags(tags)
            handleFilterChange('tags', tags.map(tag => tag.id))
          }}
          placeholder="Filter by tags..."
          className="w-full"
        />
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CalendarIcon className="w-4 h-4 inline mr-1" />
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.dateRange?.start ? 
                filters.dateRange.start.toISOString().split('T')[0] : ''
              }
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.dateRange?.end ? 
                filters.dateRange.end.toISOString().split('T')[0] : ''
              }
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserIcon className="w-4 h-4 inline mr-1" />
            Created By
          </label>
          <input
            type="text"
            placeholder="Enter user names or IDs..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => {
              const value = e.target.value
              handleFilterChange('createdBy', value ? value.split(',').map(s => s.trim()) : undefined)
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <UserIcon className="w-4 h-4 inline mr-1" />
            Assigned To
          </label>
          <input
            type="text"
            placeholder="Enter user names or IDs..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => {
              const value = e.target.value
              handleFilterChange('assignedTo', value ? value.split(',').map(s => s.trim()) : undefined)
            }}
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Active Filters ({Object.values(filters).filter(v => 
                Array.isArray(v) ? v.length > 0 : v !== undefined
              ).length})
            </span>
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchFilters