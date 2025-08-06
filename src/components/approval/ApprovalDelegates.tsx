// Approval Delegates Component
// Manages approval delegation settings

'use client'

import React, { useState, useEffect } from 'react'
import { ApprovalDelegateData } from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

interface ApprovalDelegate {
  id: string
  delegatorId: string
  delegateId: string
  startDate: string
  endDate?: string
  conditions?: any[]
  isActive: boolean
  createdAt: string
  delegator: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  delegate: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

interface ApprovalDelegatesProps {
  userId?: string
  className?: string
}

export function ApprovalDelegates({ 
  userId,
  className = '' 
}: ApprovalDelegatesProps) {
  const [delegates, setDelegates] = useState<ApprovalDelegate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])

  // Form state
  const [delegateId, setDelegateId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hasEndDate, setHasEndDate] = useState(false)

  useEffect(() => {
    fetchDelegates()
    fetchAvailableUsers()
  }, [userId])

  const fetchDelegates = async () => {
    try {
      setLoading(true)
      let url = '/api/approvals/delegates?'
      
      if (userId) {
        url += `delegatorId=${userId}`
      }

      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setDelegates(data.data.delegates)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch delegates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delegates')
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

  const createDelegate = async () => {
    try {
      setIsCreating(true)
      setError(null)

      const delegateData: ApprovalDelegateData = {
        delegateId,
        startDate: new Date(startDate),
        endDate: hasEndDate && endDate ? new Date(endDate) : undefined
      }

      const response = await fetch('/api/approvals/delegates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(delegateData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create delegate')
      }

      await fetchDelegates()
      setShowCreateForm(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delegate')
    } finally {
      setIsCreating(false)
    }
  }

  const deactivateDelegate = async (delegateId: string) => {
    try {
      const response = await fetch(`/api/approvals/delegates/${delegateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: false })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to deactivate delegate')
      }

      await fetchDelegates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate delegate')
    }
  }

  const resetForm = () => {
    setDelegateId('')
    setStartDate('')
    setEndDate('')
    setHasEndDate(false)
  }

  const isExpired = (delegate: ApprovalDelegate) => {
    if (!delegate.endDate) return false
    return new Date(delegate.endDate) < new Date()
  }

  const isActive = (delegate: ApprovalDelegate) => {
    if (!delegate.isActive) return false
    
    const now = new Date()
    const start = new Date(delegate.startDate)
    const end = delegate.endDate ? new Date(delegate.endDate) : null
    
    return start <= now && (!end || end >= now)
  }

  const getStatusColor = (delegate: ApprovalDelegate) => {
    if (!delegate.isActive) return 'text-gray-600 bg-gray-100'
    if (isExpired(delegate)) return 'text-red-600 bg-red-100'
    if (isActive(delegate)) return 'text-green-600 bg-green-100'
    return 'text-yellow-600 bg-yellow-100'
  }

  const getStatusText = (delegate: ApprovalDelegate) => {
    if (!delegate.isActive) return 'Inactive'
    if (isExpired(delegate)) return 'Expired'
    if (isActive(delegate)) return 'Active'
    return 'Scheduled'
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
          Approval Delegates
        </h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="sm"
        >
          Add Delegate
        </Button>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {showCreateForm ? (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-gray-900">Create New Delegate</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delegate To
              </label>
              <select
                value={delegateId}
                onChange={(e) => setDelegateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => setHasEndDate(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Set end date</span>
            </label>
            
            {hasEndDate && (
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={startDate}
              />
            )}
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
              onClick={createDelegate}
              variant="primary"
              disabled={isCreating || !delegateId || !startDate}
            >
              {isCreating ? 'Creating...' : 'Create Delegate'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {delegates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                No approval delegates configured
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
              >
                Add First Delegate
              </Button>
            </div>
          ) : (
            delegates.map((delegate) => (
              <div
                key={delegate.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {delegate.delegate.firstName} {delegate.delegate.lastName}
                      </h4>
                      <span className="text-sm text-gray-600">
                        ({delegate.delegate.role})
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(delegate)}`}>
                        {getStatusText(delegate)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      Email: {delegate.delegate.email}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>
                        Start: {new Date(delegate.startDate).toLocaleDateString()}
                      </span>
                      {delegate.endDate && (
                        <span>
                          End: {new Date(delegate.endDate).toLocaleDateString()}
                        </span>
                      )}
                      <span>
                        Created: {new Date(delegate.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {delegate.isActive && isActive(delegate) && (
                    <div className="ml-4">
                      <Button
                        onClick={() => deactivateDelegate(delegate.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Deactivate
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}