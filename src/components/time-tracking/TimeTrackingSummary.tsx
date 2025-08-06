// Time Tracking Summary Component
// Displays time tracking analytics and summary

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

interface TimeTrackingSummary {
  totalHours: number
  billableHours: number
  nonBillableHours: number
  totalAmount: number
  entriesCount: number
  averageHoursPerDay: number
  productivityScore: number
}

interface TimeTrackingSummaryProps {
  userId?: string
  taskId?: string
  startDate: Date
  endDate: Date
  className?: string
}

export function TimeTrackingSummary({ 
  userId,
  taskId,
  startDate,
  endDate,
  className = '' 
}: TimeTrackingSummaryProps) {
  const [summary, setSummary] = useState<TimeTrackingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSummary()
  }, [userId, taskId, startDate, endDate])

  const fetchSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      if (userId) params.append('userId', userId)
      if (taskId) params.append('taskId', taskId)

      const response = await fetch(`/api/time-tracking/summary?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setSummary(data.data)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch summary')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch summary')
    } finally {
      setLoading(false)
    }
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <Alert type="error">
          {error}
        </Alert>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          No data available
        </div>
      </Card>
    )
  }

  const billablePercentage = summary.totalHours > 0 
    ? (summary.billableHours / summary.totalHours) * 100 
    : 0

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Time Tracking Summary
        </h3>
        <div className="text-sm text-gray-500">
          {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatHours(summary.totalHours)}
          </div>
          <div className="text-sm text-gray-500">
            Total Hours
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {formatHours(summary.billableHours)}
          </div>
          <div className="text-sm text-gray-500">
            Billable Hours
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.totalAmount)}
          </div>
          <div className="text-sm text-gray-500">
            Total Amount
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {summary.entriesCount}
          </div>
          <div className="text-sm text-gray-500">
            Time Entries
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {formatHours(summary.averageHoursPerDay)}
          </div>
          <div className="text-sm text-gray-500">
            Avg Hours/Day
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {formatPercentage(billablePercentage)}
          </div>
          <div className="text-sm text-gray-500">
            Billable Ratio
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">
            {formatPercentage(summary.productivityScore)}
          </div>
          <div className="text-sm text-gray-500">
            Productivity Score
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="mt-6 space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Billable vs Non-billable</span>
            <span>{formatPercentage(billablePercentage)} billable</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${billablePercentage}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Productivity Score</span>
            <span>{formatPercentage(summary.productivityScore)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                summary.productivityScore >= 80 
                  ? 'bg-green-600' 
                  : summary.productivityScore >= 60 
                  ? 'bg-yellow-600' 
                  : 'bg-red-600'
              }`}
              style={{ width: `${summary.productivityScore}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">
          Hours Breakdown
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Billable Hours:</span>
            <span className="font-medium text-green-600">
              {formatHours(summary.billableHours)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Non-billable Hours:</span>
            <span className="font-medium text-gray-600">
              {formatHours(summary.nonBillableHours)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-medium border-t pt-2">
            <span className="text-gray-900">Total Hours:</span>
            <span className="text-gray-900">
              {formatHours(summary.totalHours)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}