// Time Tracker Component
// Main time tracking interface with start/stop timer

'use client'

import React, { useState, useEffect } from 'react'
import { TimeEntryType, TimeEntryStatus } from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

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
  tags: string[]
  task?: {
    id: string
    title: string
    status: string
  }
}

interface TimeTrackerProps {
  taskId?: string
  onTimeEntryCreated?: (entry: TimeEntry) => void
  onTimeEntryStopped?: (entry: TimeEntry) => void
  className?: string
}

export function TimeTracker({ 
  taskId, 
  onTimeEntryCreated,
  onTimeEntryStopped,
  className = '' 
}: TimeTrackerProps) {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [description, setDescription] = useState('')
  const [entryType, setEntryType] = useState<TimeEntryType>(TimeEntryType.WORK)
  const [isBillable, setIsBillable] = useState(true)
  const [hourlyRate, setHourlyRate] = useState<number | undefined>()
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch current running entry on mount
  useEffect(() => {
    fetchCurrentEntry()
  }, [])

  // Update elapsed time every second when running
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

  const fetchCurrentEntry = async () => {
    try {
      const response = await fetch('/api/time-tracking/current')
      const data = await response.json()

      if (data.success && data.data) {
        setCurrentEntry(data.data)
        setIsRunning(data.data.status === TimeEntryStatus.RUNNING)
        setDescription(data.data.description || '')
        setEntryType(data.data.type)
        setIsBillable(data.data.isBillable)
        setHourlyRate(data.data.hourlyRate ? parseFloat(data.data.hourlyRate) : undefined)
        setTags(data.data.tags || [])

        if (data.data.status === TimeEntryStatus.RUNNING) {
          const startTime = new Date(data.data.startTime).getTime()
          const now = Date.now()
          setElapsedTime(Math.floor((now - startTime) / 1000))
        }
      }
    } catch (err) {
      console.error('Failed to fetch current entry:', err)
    }
  }

  const startTimer = async () => {
    try {
      setLoading(true)
      setError(null)

      const entryData = {
        taskId,
        description: description.trim() || undefined,
        type: entryType,
        isBillable,
        hourlyRate,
        tags
      }

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
      onTimeEntryCreated?.(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer')
    } finally {
      setLoading(false)
    }
  }

  const stopTimer = async () => {
    if (!currentEntry) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/time-tracking/entries/${currentEntry.id}/stop`, {
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
      setDescription('')
      setTags([])
      onTimeEntryStopped?.(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer')
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Time Tracker
        </h3>
        {currentEntry?.task && (
          <div className="text-sm text-gray-600">
            Task: {currentEntry.task.title}
          </div>
        )}
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-mono font-bold ${isRunning ? 'text-green-600' : 'text-gray-400'}`}>
          {formatTime(elapsedTime)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {isRunning ? 'Running' : 'Stopped'}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {!isRunning ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What are you working on?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as TimeEntryType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(TimeEntryType).map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (Optional)
                </label>
                <input
                  type="number"
                  value={hourlyRate || ''}
                  onChange={(e) => setHourlyRate(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Billable time</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add tag"
                />
                <Button
                  onClick={addTag}
                  variant="outline"
                  className="rounded-l-none"
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <Button
              onClick={startTimer}
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Starting...' : 'Start Timer'}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="font-medium text-green-800">
                {currentEntry?.description || 'No description'}
              </div>
              <div className="text-sm text-green-600 mt-1">
                {currentEntry?.type} • {currentEntry?.isBillable ? 'Billable' : 'Non-billable'}
              </div>
              {currentEntry?.tags && currentEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentEntry.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={stopTimer}
              variant="outline"
              size="lg"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              disabled={loading}
            >
              {loading ? 'Stopping...' : 'Stop Timer'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}