// Time Budgets Component
// Manages time budgets and alerts

'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

interface TimeBudget {
  id: string
  name: string
  description?: string
  taskId?: string
  projectId?: string
  clientId?: string
  userId?: string
  budgetHours: number
  usedHours: number
  startDate: string
  endDate: string
  alertThreshold?: number
  isActive: boolean
  createdBy: string
  createdAt: string
  task?: {
    id: string
    title: string
    status: string
  }
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  creator: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface TimeBudgetsProps {
  taskId?: string
  userId?: string
  onBudgetCreated?: (budget: TimeBudget) => void
  className?: string
}

export function TimeBudgets({ 
  taskId,
  userId,
  onBudgetCreated,
  className = '' 
}: TimeBudgetsProps) {
  const [budgets, setBudgets] = useState<TimeBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [budgetName, setBudgetName] = useState('')
  const [budgetDescription, setBudgetDescription] = useState('')
  const [budgetHours, setBudgetHours] = useState<number>(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [alertThreshold, setAlertThreshold] = useState<number>(0.8)
  const [budgetUserId, setBudgetUserId] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])

  useEffect(() => {
    fetchBudgets()
    fetchAvailableUsers()
  }, [taskId, userId])

  const fetchBudgets = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (taskId) params.append('taskId', taskId)
      if (userId) params.append('userId', userId)

      const response = await fetch(`/api/time-tracking/budgets?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setBudgets(data.data.budgets)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch budgets')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch budgets')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      
      if (data.success) {
        setAvailableUsers(data.data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const createBudget = async () => {
    try {
      setIsCreating(true)
      setError(null)

      const budgetData = {
        name: budgetName,
        description: budgetDescription || undefined,
        taskId,
        userId: budgetUserId || undefined,
        budgetHours,
        startDate,
        endDate,
        alertThreshold
      }

      const response = await fetch('/api/time-tracking/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(budgetData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create budget')
      }

      setBudgets([data.data, ...budgets])
      setShowCreateForm(false)
      resetForm()
      onBudgetCreated?.(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget')
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setBudgetName('')
    setBudgetDescription('')
    setBudgetHours(0)
    setStartDate('')
    setEndDate('')
    setAlertThreshold(0.8)
    setBudgetUserId('')
  }

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const getUsagePercentage = (budget: TimeBudget) => {
    return budget.budgetHours > 0 ? (budget.usedHours / budget.budgetHours) * 100 : 0
  }

  const getUsageColor = (budget: TimeBudget) => {
    const percentage = getUsagePercentage(budget)
    const threshold = (budget.alertThreshold || 0.8) * 100

    if (percentage >= 100) return 'text-red-600 bg-red-100'
    if (percentage >= threshold) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getProgressBarColor = (budget: TimeBudget) => {
    const percentage = getUsagePercentage(budget)
    const threshold = (budget.alertThreshold || 0.8) * 100

    if (percentage >= 100) return 'bg-red-600'
    if (percentage >= threshold) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  const isOverBudget = (budget: TimeBudget) => {
    return budget.usedHours > budget.budgetHours
  }

  const isNearThreshold = (budget: TimeBudget) => {
    const percentage = getUsagePercentage(budget)
    const threshold = (budget.alertThreshold || 0.8) * 100
    return percentage >= threshold && percentage < 100
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
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
          Time Budgets
        </h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="sm"
        >
          Create Budget
        </Button>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {showCreateForm ? (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-gray-900">Create New Budget</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Name
              </label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter budget name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Hours
              </label>
              <input
                type="number"
                value={budgetHours}
                onChange={(e) => setBudgetHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0.1"
                step="0.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={budgetDescription}
              onChange={(e) => setBudgetDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter budget description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={startDate}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Threshold (%)
              </label>
              <input
                type="number"
                value={alertThreshold * 100}
                onChange={(e) => setAlertThreshold((parseFloat(e.target.value) || 80) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="80"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to User (Optional)
              </label>
              <select
                value={budgetUserId}
                onChange={(e) => setBudgetUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All users</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => {
                setShowCreateForm(false)
                resetForm()
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={createBudget}
              variant="primary"
              disabled={isCreating || !budgetName.trim() || !budgetHours || !startDate || !endDate}
            >
              {isCreating ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {budgets.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                No time budgets found
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
              >
                Create First Budget
              </Button>
            </div>
          ) : (
            budgets.map((budget) => (
              <div
                key={budget.id}
                className={`border rounded-lg p-4 ${
                  isOverBudget(budget) 
                    ? 'border-red-200 bg-red-50' 
                    : isNearThreshold(budget)
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {budget.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(budget)}`}>
                        {getUsagePercentage(budget).toFixed(1)}% used
                      </span>
                      {!budget.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                          Inactive
                        </span>
                      )}
                    </div>

                    {budget.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {budget.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                      </span>
                      {budget.task && (
                        <span>Task: {budget.task.title}</span>
                      )}
                      {budget.user && (
                        <span>User: {budget.user.firstName} {budget.user.lastName}</span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatHours(budget.usedHours)} / {formatHours(budget.budgetHours)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatHours(budget.budgetHours - budget.usedHours)} remaining
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(budget)}`}
                      style={{ width: `${Math.min(getUsagePercentage(budget), 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Alerts */}
                {isOverBudget(budget) && (
                  <Alert type="error" className="text-sm">
                    Budget exceeded by {formatHours(budget.usedHours - budget.budgetHours)}
                  </Alert>
                )}

                {isNearThreshold(budget) && !isOverBudget(budget) && (
                  <Alert type="warning" className="text-sm">
                    Budget is {getUsagePercentage(budget).toFixed(1)}% used. Alert threshold: {((budget.alertThreshold || 0.8) * 100).toFixed(0)}%
                  </Alert>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}