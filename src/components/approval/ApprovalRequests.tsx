// Approval Requests Component
// Displays and manages pending approval requests

'use client'

import React, { useState, useEffect } from 'react'
import { 
  ApprovalStatus, 
  ApprovalDecision,
  ApprovalDecisionData 
} from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

interface ApprovalRequest {
  id: string
  workflowId: string
  taskId: string
  stepNumber: number
  approverId: string
  delegatedFrom?: string
  status: ApprovalStatus
  decision?: ApprovalDecision
  comments?: string
  decidedAt?: string
  expiresAt?: string
  createdAt: string
  approver: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  task: {
    id: string
    title: string
    status: string
    priority: string
  }
  workflow?: {
    id: string
    name: string
    description?: string
  }
  delegatedFromUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface ApprovalRequestsProps {
  userId?: string
  taskId?: string
  showMyRequests?: boolean
  className?: string
}

export function ApprovalRequests({ 
  userId,
  taskId,
  showMyRequests = false,
  className = '' 
}: ApprovalRequestsProps) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [decision, setDecision] = useState<ApprovalDecision>(ApprovalDecision.APPROVE)
  const [comments, setComments] = useState('')
  const [delegateToId, setDelegateToId] = useState('')
  const [availableUsers, setAvailableUsers] = useState<any[]>([])

  useEffect(() => {
    fetchRequests()
    if (showMyRequests) {
      fetchAvailableUsers()
    }
  }, [userId, taskId, showMyRequests])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      let url = '/api/approvals/requests?'
      
      if (showMyRequests) {
        url += 'assignedToMe=true'
      } else {
        if (taskId) url += `taskId=${taskId}&`
        if (userId) url += `approverId=${userId}&`
      }

      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.data.requests)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch requests')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
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

  const handleDecision = async (request: ApprovalRequest) => {
    setSelectedRequest(request)
    setShowDecisionModal(true)
    setDecision(ApprovalDecision.APPROVE)
    setComments('')
    setDelegateToId('')
  }

  const submitDecision = async () => {
    if (!selectedRequest) return

    try {
      setProcessingRequest(selectedRequest.id)
      setError(null)

      const decisionData: ApprovalDecisionData = {
        decision,
        comments: comments.trim() || undefined,
        delegateToId: decision === ApprovalDecision.DELEGATE ? delegateToId : undefined
      }

      const response = await fetch(`/api/approvals/requests/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(decisionData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to process decision')
      }

      // Refresh requests
      await fetchRequests()
      setShowDecisionModal(false)
      setSelectedRequest(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process decision')
    } finally {
      setProcessingRequest(null)
    }
  }

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'text-green-600 bg-green-100'
      case ApprovalStatus.REJECTED:
        return 'text-red-600 bg-red-100'
      case ApprovalStatus.DELEGATED:
        return 'text-purple-600 bg-purple-100'
      case ApprovalStatus.CANCELLED:
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-yellow-600 bg-yellow-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-red-600 bg-red-100'
      case 'high':
        return 'text-orange-600 bg-orange-100'
      case 'medium':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
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
    <>
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {showMyRequests ? 'My Pending Approvals' : 'Approval Requests'}
          </h3>
          <Button
            onClick={fetchRequests}
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

        {requests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">
              {showMyRequests ? 'No pending approvals' : 'No approval requests found'}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className={`border rounded-lg p-4 ${
                  isExpired(request.expiresAt) ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {request.task.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.task.priority)}`}>
                        {request.task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>

                    {request.workflow && (
                      <div className="text-sm text-gray-600 mb-2">
                        Workflow: {request.workflow.name}
                        {request.workflow.description && (
                          <span className="text-gray-500"> - {request.workflow.description}</span>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-gray-600 mb-2">
                      Step {request.stepNumber + 1} - Assigned to: {request.approver.firstName} {request.approver.lastName}
                      {request.delegatedFromUser && (
                        <span className="text-purple-600">
                          {' '}(Delegated from {request.delegatedFromUser.firstName} {request.delegatedFromUser.lastName})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Created: {new Date(request.createdAt).toLocaleDateString()}</span>
                      {request.expiresAt && (
                        <span className={isExpired(request.expiresAt) ? 'text-red-600 font-medium' : ''}>
                          {isExpired(request.expiresAt) ? 'Expired' : 'Expires'}: {new Date(request.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {request.comments && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <strong>Comments:</strong> {request.comments}
                      </div>
                    )}
                  </div>

                  {request.status === ApprovalStatus.PENDING && showMyRequests && (
                    <div className="ml-4">
                      <Button
                        onClick={() => handleDecision(request)}
                        variant="primary"
                        size="sm"
                        disabled={processingRequest === request.id}
                      >
                        {processingRequest === request.id ? 'Processing...' : 'Review'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Decision Modal */}
      {showDecisionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Approval Decision
            </h3>

            <div className="mb-4">
              <div className="font-medium text-gray-900 mb-1">
                {selectedRequest.task.title}
              </div>
              <div className="text-sm text-gray-600">
                {selectedRequest.workflow?.name} - Step {selectedRequest.stepNumber + 1}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision
                </label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as ApprovalDecision)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ApprovalDecision.APPROVE}>Approve</option>
                  <option value={ApprovalDecision.REJECT}>Reject</option>
                  <option value={ApprovalDecision.REQUEST_CHANGES}>Request Changes</option>
                  <option value={ApprovalDecision.DELEGATE}>Delegate</option>
                </select>
              </div>

              {decision === ApprovalDecision.DELEGATE && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delegate To
                  </label>
                  <select
                    value={delegateToId}
                    onChange={(e) => setDelegateToId(e.target.value)}
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
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (Optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add your comments..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => {
                  setShowDecisionModal(false)
                  setSelectedRequest(null)
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={submitDecision}
                variant="primary"
                disabled={
                  processingRequest === selectedRequest.id ||
                  (decision === ApprovalDecision.DELEGATE && !delegateToId)
                }
              >
                {processingRequest === selectedRequest.id ? 'Processing...' : 'Submit Decision'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}