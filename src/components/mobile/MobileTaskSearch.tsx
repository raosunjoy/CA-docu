/**
 * Mobile Task Search Component
 * Advanced search and filtering for mobile devices
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { 
  Search, 
  Filter, 
  X, 
  Calendar, 
  User, 
  Flag, 
  Tag,
  SortAsc,
  SortDesc,
  Clock,
  CheckCircle
} from 'lucide-react'

interface MobileTaskSearchProps {
  tasks: Task[]
  onFilteredTasks: (tasks: Task[]) => void
  isOpen: boolean
  onClose: () => void
}

interface SearchFilters {
  query: string
  status: TaskStatus[]
  priority: TaskPriority[]
  assignee: string[]
  tags: string[]
  dateRange: {
    start?: Date
    end?: Date
  }
  sortBy: 'title' | 'dueDate' | 'priority' | 'createdAt'
  sortOrder: 'asc' | 'desc'
}

export function MobileTaskSearch({
  tasks,
  onFilteredTasks,
  isOpen,
  onClose
}: MobileTaskSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    status: [],
    priority: [],
    assignee: [],
    tags: [],
    dateRange: {},
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  
  const [activeSection, setActiveSection] = useState<'search' | 'filters' | 'sort'>('search')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('task-recent-searches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Apply filters and search
  useEffect(() => {
    let filtered = [...tasks]

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status))
    }

    // Priority filter
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority))
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false
        const dueDate = new Date(task.dueDate)
        
        if (filters.dateRange.start && dueDate < filters.dateRange.start) {
          return false
        }
        if (filters.dateRange.end && dueDate > filters.dateRange.end) {
          return false
        }
        return true
      })
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(task =>
        task.tags?.some(tag => filters.tags.includes(tag))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
          break
        case 'priority':
          const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    onFilteredTasks(filtered)
  }, [filters, tasks, onFilteredTasks])

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, query }))
    
    // Add to recent searches if not empty and not already present
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updated = [query.trim(), ...recentSearches.slice(0, 4)]
      setRecentSearches(updated)
      localStorage.setItem('task-recent-searches', JSON.stringify(updated))
    }
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      status: [],
      priority: [],
      assignee: [],
      tags: [],
      dateRange: {},
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  const toggleArrayFilter = <T,>(
    filterKey: keyof SearchFilters,
    value: T
  ) => {
    setFilters(prev => {
      const currentArray = prev[filterKey] as T[]
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value]
      
      return { ...prev, [filterKey]: newArray }
    })
  }

  // Get unique values for filters
  const uniqueTags = Array.from(new Set(tasks.flatMap(task => task.tags || [])))
  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignedTo).filter(Boolean)))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-900">Search Tasks</h1>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'filters', label: 'Filters', icon: Filter },
            { id: 'sort', label: 'Sort', icon: SortAsc }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeSection === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSection === 'search' && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={filters.query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search tasks, descriptions, tags..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                autoFocus
              />
              {filters.query && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !filters.query && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className="w-full flex items-center gap-3 p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Filters */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Filters</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, status: ['TODO'] }))}
                  className="p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="font-medium text-gray-900">To Do</div>
                  <div className="text-sm text-gray-600">Pending tasks</div>
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, status: ['IN_PROGRESS'] }))}
                  className="p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="font-medium text-gray-900">In Progress</div>
                  <div className="text-sm text-gray-600">Active tasks</div>
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, priority: ['URGENT', 'HIGH'] }))}
                  className="p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="font-medium text-gray-900">High Priority</div>
                  <div className="text-sm text-gray-600">Urgent & high</div>
                </button>
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { 
                      start: new Date(), 
                      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
                    } 
                  }))}
                  className="p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="font-medium text-gray-900">Due This Week</div>
                  <div className="text-sm text-gray-600">Next 7 days</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'filters' && (
          <div className="space-y-6">
            {/* Status Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
                  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
                  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
                  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' }
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => toggleArrayFilter('status', value as TaskStatus)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      filters.status.includes(value as TaskStatus)
                        ? `${color} border-current`
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Priority</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
                  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
                  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
                  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800' }
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => toggleArrayFilter('priority', value as TaskPriority)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      filters.priority.includes(value as TaskPriority)
                        ? `${color} border-current`
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Flag className="h-4 w-4 mx-auto mb-1" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Due Date Range</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        start: e.target.value ? new Date(e.target.value) : undefined
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        end: e.target.value ? new Date(e.target.value) : undefined
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            {uniqueTags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleArrayFilter('tags', tag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        filters.tags.includes(tag)
                          ? 'bg-blue-100 text-blue-800 border-2 border-blue-200'
                          : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'sort' && (
          <div className="space-y-6">
            {/* Sort By */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sort By</h3>
              <div className="space-y-2">
                {[
                  { value: 'createdAt', label: 'Created Date', icon: Calendar },
                  { value: 'dueDate', label: 'Due Date', icon: Clock },
                  { value: 'priority', label: 'Priority', icon: Flag },
                  { value: 'title', label: 'Title', icon: CheckCircle }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFilters(prev => ({ ...prev, sortBy: value as any }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                      filters.sortBy === value
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sort Order</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    filters.sortOrder === 'asc'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <SortAsc className="h-4 w-4" />
                  <span className="font-medium">Ascending</span>
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    filters.sortOrder === 'desc'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <SortDesc className="h-4 w-4" />
                  <span className="font-medium">Descending</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={onClose}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  )
}