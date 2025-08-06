// Time Tracking Hook
// Custom hook for managing time tracking functionality

import { useState, useEffect, useCallback } from 'react'
import { 
  TimeEntryStatus, 
  TimeEntryType,
  TimeEntryData,
  TimeTrackingFilters,
  TimeTrackingSummary
} from '@/types'

interface TimeEntry {
  id: string
  taskId?: string
  description?: string
  startTime: string
  endTime?: string
  duration?: number
  status: TimeEntryStatus
  type: TimeEntryType
  isBillable: boolean
  hourlyRate?: number
  totalAmount?: number
  tags: string[]
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  task?: {
    id: string
    title: string
    status: string
  }
}

interface UseTimeTrackingOptions {
  userId?: string
  taskId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useTimeTracking(options: UseTimeTrackingOptions = {}) {
  const { userId, taskId, autoRefresh = false, refreshInterval = 30000 } = options

  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [summary, setSummary] = useState<TimeTrackingSummary | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current running entry
  const fetchCurrentEntry = useCallback(async () => {
    try {
      const response = await fetch('/api/time-tracking/current')
      const data = await response.json()

      if (data.success && data.data) {
        setCurrentEntry(data.data)
        setIsRunning(data.data.status === TimeEntryStatus.RUNNING)
        
        if (data.data.status === TimeEntryStatus.RUNNING) {
          const startTime = new Date(data.data.startTime).getTime()
          const now = Date.now()
          setElapsedTime(Math.floor((now - startTime) / 1000))
        }
      } else {
        setCurrentEntry(null)
        setIsRunning(false)
        setElapsedTime(0)
      }
    } catch (err) {
      console.error('Failed to fetch current entry:', err)
    }
  }, [])

  // Fetch time entries
  const fetchEntries = useCallback(async (filters: TimeTrackingFilters = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (taskId) params.append('taskId', taskId)
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString())
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString())
      if (filters.status) params.append('status', filters.status.join(','))
      if (filters.type) params.append('type', filters.type.join(','))
      if (filters.isBillable !== undefined) params.append('isBillable', filters.isBillable.toString())

      const response = await fetch(`/api/time-tracking/entries?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setEntries(data.data.entries)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch entries')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }, [userId, taskId])

  // Fetch time tracking summary
  const fetchSummary = useCallback(async (filters: TimeTrackingFilters) => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (taskId) params.append('taskId', taskId)
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString())
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString())

      const response = await fetch(`/api/time-tracking/summary?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setSummary(data.data)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch summary')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary')
    }
  }, [userId, taskId])

  // Start time entry
  const startTimer = useCallback(async (entryData: TimeEntryData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/time-tracking/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entryData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to start timer')
      }

      setCurrentEntry(data.data)
      setIsRunning(true)
      setElapsedTime(0)
      
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start timer'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Stop time entry
  const stopTimer = useCallback(async (entryId?: string) => {
    try {
      setLoading(true)
      setError(null)

      const id = entryId || currentEntry?.id
      if (!id) {
        throw new Error('No time entry to stop')
      }

      const response = await fetch(`/api/time-tracking/entries/${id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to stop timer')
      }

      setCurrentEntry(null)
      setIsRunning(false)
      setElapsedTime(0)
      
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop timer'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [currentEntry])

  // Update time entry
  const updateEntry = useCallback(async (entryId: string, updateData: any) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/time-tracking/entries/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to update entry')
      }

      // Update the entry in the list
      setEntries(entries.map(entry => 
        entry.id === entryId ? data.data : entry
      ))
      
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update entry'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [entries])

  // Delete time entry
  const deleteEntry = useCallback(async (entryId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/time-tracking/entries/${entryId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete entry')
      }

      setEntries(entries.filter(entry => entry.id !== entryId))
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete entry'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [entries])

  // Format time helper
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Get total hours for entries
  const getTotalHours = useCallback(() => {
    return entries.reduce((total, entry) => {
      return total + ((entry.duration || 0) / 60)
    }, 0)
  }, [entries])

  // Get billable hours
  const getBillableHours = useCallback(() => {
    return entries
      .filter(entry => entry.isBillable)
      .reduce((total, entry) => {
        return total + ((entry.duration || 0) / 60)
      }, 0)
  }, [entries])

  // Get total amount
  const getTotalAmount = useCallback(() => {
    return entries.reduce((total, entry) => {
      return total + (entry.totalAmount ? parseFloat(entry.totalAmount.toString()) : 0)
    }, 0)
  }, [entries])

  // Update elapsed time for running entry
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && currentEntry) {
      interval = setInterval(() => {
        const startTime = new Date(currentEntry.startTime).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, currentEntry])

  // Initial fetch
  useEffect(() => {
    fetchCurrentEntry()
  }, [fetchCurrentEntry])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchCurrentEntry()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchCurrentEntry])

  return {
    // State
    currentEntry,
    entries,
    summary,
    isRunning,
    elapsedTime,
    loading,
    error,

    // Actions
    startTimer,
    stopTimer,
    updateEntry,
    deleteEntry,
    fetchCurrentEntry,
    fetchEntries,
    fetchSummary,

    // Computed values
    formatTime,
    getTotalHours,
    getBillableHours,
    getTotalAmount,

    // Clear error
    clearError: () => setError(null)
  }
}