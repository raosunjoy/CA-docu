// Time Entries List Component
// Displays and manages time entries with filtering

'use client'

import React, { useState, useEffect } from 'react'
import { TimeEntryStatus, TimeEntryType } from '@/types'
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

interface TimeEntriesListProps {
  userId?: string
  taskId?: string
  startDate?: Date
  endDate?: Date
  onEntryUpdated?: (entry: TimeEntry) => void
  className?: string
}

export function TimeEntriesList({ 
  userId,
  taskId,
  startDate,
  endDate,
  onEntryUpdated,
  className = '' 
}: TimeEntriesListProps) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editType, setEditType] = useState<TimeEntryType>(TimeEntryType.WORK)
  const [editIsBillable, setEditIsBillable] = useState(true)
  const [editHourlyRate, setEditHourlyRate] = useState<number | undefined>()

  // Filters
  const [statusFilter, setStatusFilter] = useState<TimeEntryStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<TimeEntryType | 'all'>('all')
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non-billable'>('all')

  useEffect(() => {
    fetchEntries()
  }, [userId, taskId, startDate, endDate, statusFilter, typeFilter, billableFilter])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (taskId) params.append('taskId', taskId)
      if (startDate) params.append('startDate', startDate.toISOString())
      if (endDate) params.append('endDate', endDate.toISOString())
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (billableFilter === 'billable') params.append('isBillable', 'true')
      if (billableFilter === 'non-billable') params.append('isBillable', 'false')

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
  }

  const startEdit = (entry: TimeEntry) => {
    setEditingEntry(entry.id)
    setEditDescription(entry.description || '')
    setEditType(entry.type)
    setEditIsBillable(entry.isBillable)
    setEditHourlyRate(entry.hourlyRate ? parseFloat(entry.hourlyRate.toString()) : undefined)
  }

  const cancelEdit = () => {
    setEditingEntry(null)
    setEditDescription('')
    setEditType(TimeEntryType.WORK)
    setEditIsBillable(true)
    setEditHourlyRate(undefined)
  }

  const saveEdit = async (entryId: string) => {
    try {
      const updateData = {
        description: editDescription.trim() || undefined,
        type: editType,
        isBillable: editIsBillable,
        hourlyRate: editHourlyRate
      }

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

      setEditingEntry(null)
      onEntryUpdated?.(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry')
    }
  }

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return
    }

    try {
      const response = await fetch(`/api/time-tracking/entries/${entryId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to delete entry')
      }

      setEntries(entries.filter(entry => entry.id !== entryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry')
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0:00'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}:${mins.toString().padStart(2, '0')}`
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00'
    return `$${amount.toFixed(2)}`
  }

  const getStatusColor = (status: TimeEntryStatus) => {
    switch (status) {
      case TimeEntryStatus.RUNNING:
        return 'text-green-600 bg-green-100'
      case TimeEntryStatus.STOPPED:
        return 'text-blue-600 bg-blue-100'
      case TimeEntryStatus.SUBMITTED:
        return 'text-yellow-600 bg-yellow-100'
      case TimeEntryStatus.APPROVED:
        return 'text-green-600 bg-green-100'
      case TimeEntryStatus.REJECTED:
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Time Entries
        </h3>
        <Button
          onClick={fetchEntries}
          variant="outline"
          size="sm"
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {Object.values(TimeEntryStatus).map(status => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {Object.values(TimeEntryType).map(type => (
              <option key={type} value={type}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Billable
          </label>
          <select
            value={billableFilter}
            onChange={(e) => setBillableFilter(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="billable">Billable Only</option>
            <option value="non-billable">Non-billable Only</option>
          </select>
        </div>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500">
            No time entries found
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              {editingEntry === entry.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as TimeEntryType)}
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
                        Hourly Rate
                      </label>
                      <input
                        type="number"
                        value={editHourlyRate || ''}
                        onChange={(e) => setEditHourlyRate(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editIsBillable}
                          onChange={(e) => setEditIsBillable(e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Billable</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => saveEdit(entry.id)}
                      variant="primary"
                      size="sm"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {entry.description || 'No description'}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {entry.status.replace('_', ' ')}
                      </span>
                      {entry.isBillable && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100">
                          Billable
                        </span>
                      )}
                    </div>

                    {entry.task && (
                      <div className="text-sm text-gray-600 mb-2">
                        Task: {entry.task.title}
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        {new Date(entry.startTime).toLocaleDateString()} {new Date(entry.startTime).toLocaleTimeString()}
                      </span>
                      {entry.endTime && (
                        <span>
                          - {new Date(entry.endTime).toLocaleTimeString()}
                        </span>
                      )}
                      <span>
                        Duration: {formatDuration(entry.duration)}
                      </span>
                      <span>
                        Type: {entry.type.toLowerCase()}
                      </span>
                      {entry.totalAmount && (
                        <span>
                          Amount: {formatCurrency(entry.totalAmount)}
                        </span>
                      )}
                    </div>

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex space-x-2">
                    <Button
                      onClick={() => startEdit(entry)}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => deleteEntry(entry.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}