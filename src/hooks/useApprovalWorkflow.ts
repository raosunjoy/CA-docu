// Approval Workflow Hook
// Custom hook for managing approval workflows

import { useState, useEffect, useCallback } from 'react'
import { 
  ApprovalStatus, 
  ApprovalDecision,
  ApprovalWorkflowData,
  ApprovalDecisionData 
} from '@/types'

interface ApprovalWorkflow {
  id: string
  name: string
  description?: string
  steps: any[]
  isActive: boolean
  taskId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

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
}

interface UseApprovalWorkflowOptions {
  taskId?: string
  userId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useApprovalWorkflow(options: UseApprovalWorkflowOptions = {}) {
  const { taskId, userId, autoRefresh = false, refreshInterval = 30000 } = options

  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([])
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    if (!taskId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/approvals?taskId=${taskId}`)
      const data = await response.json()

      if (data.success) {
        setWorkflows(data.data.workflows)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch workflows')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflows')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // Fetch pending requests for user
  const fetchPendingRequests = useCallback(async () => {
    if (!userId) return

    try {
      const response = await fetch('/api/approvals/requests?assignedToMe=true')
      const data = await response.json()

      if (data.success) {
        setPendingRequests(data.data.requests)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch pending requests')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pending requests')
    }
  }, [userId])

  // Create workflow
  const createWorkflow = useCallback(async (workflowData: ApprovalWorkflowData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create workflow')
      }

      // Refresh workflows
      await fetchWorkflows()
      
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workflow'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchWorkflows])

  // Process approval decision
  const processDecision = useCallback(async (requestId: string, decision: ApprovalDecisionData) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/approvals/requests/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(decision)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to process decision')
      }

      // Refresh pending requests
      await fetchPendingRequests()
      
      return data.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process decision'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [fetchPendingRequests])

  // Get workflow for task
  const getWorkflowForTask = useCallback((taskId: string) => {
    return workflows.find(workflow => workflow.taskId === taskId)
  }, [workflows])

  // Get pending requests count
  const getPendingRequestsCount = useCallback(() => {
    return pendingRequests.filter(request => request.status === ApprovalStatus.PENDING).length
  }, [pendingRequests])

  // Get overdue requests
  const getOverdueRequests = useCallback(() => {
    const now = new Date()
    return pendingRequests.filter(request => 
      request.status === ApprovalStatus.PENDING && 
      request.expiresAt && 
      new Date(request.expiresAt) < now
    )
  }, [pendingRequests])

  // Check if user can approve request
  const canApproveRequest = useCallback((request: ApprovalRequest, currentUserId: string) => {
    return request.approverId === currentUserId && request.status === ApprovalStatus.PENDING
  }, [])

  // Get workflow status
  const getWorkflowStatus = useCallback((workflow: ApprovalWorkflow) => {
    // This would need to be enhanced based on the actual workflow state
    return workflow.isActive ? 'active' : 'inactive'
  }, [])

  // Initial fetch
  useEffect(() => {
    if (taskId) {
      fetchWorkflows()
    }
    if (userId) {
      fetchPendingRequests()
    }
  }, [taskId, userId, fetchWorkflows, fetchPendingRequests])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (taskId) fetchWorkflows()
      if (userId) fetchPendingRequests()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, taskId, userId, fetchWorkflows, fetchPendingRequests])

  return {
    // State
    workflows,
    pendingRequests,
    loading,
    error,

    // Actions
    createWorkflow,
    processDecision,
    fetchWorkflows,
    fetchPendingRequests,

    // Computed values
    getWorkflowForTask,
    getPendingRequestsCount,
    getOverdueRequests,
    canApproveRequest,
    getWorkflowStatus,

    // Clear error
    clearError: () => setError(null)
  }
}