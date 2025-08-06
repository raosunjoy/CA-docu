'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaskStatus, TaskPriority } from '@/types'

interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  limit?: number
}

interface BoardSettings {
  columns: KanbanColumn[]
  enableBulkActions: boolean
  enableFilters: boolean
  enableSearch: boolean
  autoRefresh: boolean
  refreshInterval: number
}

interface KanbanFilters {
  search: string
  priority: TaskPriority | null
  assignedTo: string | null
  dueDate: 'overdue' | 'today' | 'week' | null
}

interface BulkAction {
  type: 'move' | 'assign' | 'priority' | 'delete'
  value?: string | TaskStatus | TaskPriority
}

const DEFAULT_SETTINGS: BoardSettings = {
  columns: [
    { id: TaskStatus.TODO, title: 'To Do', color: 'gray' },
    { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'blue' },
    { id: TaskStatus.IN_REVIEW, title: 'In Review', color: 'yellow' },
    { id: TaskStatus.COMPLETED, title: 'Completed', color: 'green' },
    { id: TaskStatus.CANCELLED, title: 'Cancelled', color: 'red' }
  ],
  enableBulkActions: true,
  enableFilters: true,
  enableSearch: true,
  autoRefresh: false,
  refreshInterval: 30
}

const STORAGE_KEY = 'kanban-board-settings'

export function useKanbanBoard() {
  const [settings, setSettings] = useState<BoardSettings>(DEFAULT_SETTINGS)
  const [filters, setFilters] = useState<KanbanFilters>({
    search: '',
    priority: null,
    assignedTo: null,
    dueDate: null
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } catch (error) {
      console.warn('Failed to load board settings:', error)
    }
  }, [])

  // Save settings to localStorage when they change
  const updateSettings = useCallback((newSettings: BoardSettings) => {
    setSettings(newSettings)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    } catch (error) {
      console.warn('Failed to save board settings:', error)
    }
  }, [])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<KanbanFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      priority: null,
      assignedTo: null,
      dueDate: null
    })
  }, [])

  // Reset settings to default
  const resetSettings = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS)
  }, [updateSettings])

  return {
    settings,
    filters,
    updateSettings,
    updateFilters,
    clearFilters,
    resetSettings
  }
}