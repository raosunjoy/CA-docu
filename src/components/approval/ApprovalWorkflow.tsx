// Approval Workflow Component
// Displays and manages approval workflows for tasks

'use client'

import React, { useState, useEffect } from 'react'
import { 
  ApprovalStatus, 
  ApprovalStep, 
  UserRole,
  ApprovalWorkflowData 
} from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

interface ApprovalWorkflowProps {
  taskId: string
  onWorkflowCreated?: (workflow: any) => void
  className?: string
}

interface WorkflowStep extends ApprovalStep {
  id?: string
  status?: 'pending' | 'active' | 'completed' | 'rejected'
}

export function ApprovalWorkflow({ 
  taskId, 
  onWorkflowCreated,
  className = '' 
}: ApprovalWorkflowProps) {
  const [workflow, setWorkflow] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state for creating workflow
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      stepNumber: 0,
      name: 'Initial Review',
      approverRoles: [UserRole.MANAGER],
      isParallel: false
    }
  ])

  useEffect(() => {
    fetchWorkflow()
  }, [taskId])

  const fetchWorkflow = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/approvals?taskId=${taskId}`)
      const data = await response.json()
      
      if (data.success && data.data.workflows.length > 0) {
        setWorkflow(data.data.workflows[0])
      }
    } catch (err) {
      setError('Failed to fetch workflow')
    } finally {
      setLoading(false)
    }
  }

  const createWorkflow = async () => {
    try {
      setIsCreating(true)
      setError(null)

      const workflowData: ApprovalWorkflowData = {
        name: workflowName,
        description: workflowDescription,
        taskId,
        steps: steps.map((step, index) => ({
          ...step,
          stepNumber: index
        }))
      }

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

      setWorkflow(data.data)
      setShowCreateForm(false)
      onWorkflowCreated?.(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow')
    } finally {
      setIsCreating(false)
    }
  }

  const addStep = () => {
    const newStep: WorkflowStep = {
      stepNumber: steps.length,
      name: `Step ${steps.length + 1}`,
      approverRoles: [UserRole.MANAGER],
      isParallel: false
    }
    setSteps([...steps, newStep])
  }

  const updateStep = (index: number, updates: Partial<WorkflowStep>) => {
    const updatedSteps = steps.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    )
    setSteps(updatedSteps)
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const getStepStatus = (stepNumber: number): 'pending' | 'active' | 'completed' | 'rejected' => {
    if (!workflow) return 'pending'
    
    const currentStep = workflow.task?.currentApprovalStep || 0
    
    if (stepNumber < currentStep) return 'completed'
    if (stepNumber === currentStep) return 'active'
    return 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Approval Workflow
        </h3>
        {!workflow && (
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="primary"
            size="sm"
          >
            Create Workflow
          </Button>
        )}
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {workflow ? (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h4 className="font-medium text-gray-900">{workflow.name}</h4>
            {workflow.description && (
              <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
            )}
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                workflow.task?.approvalStatus === ApprovalStatus.APPROVED 
                  ? 'text-green-600 bg-green-100'
                  : workflow.task?.approvalStatus === ApprovalStatus.REJECTED
                  ? 'text-red-600 bg-red-100'
                  : 'text-yellow-600 bg-yellow-100'
              }`}>
                {workflow.task?.approvalStatus || 'Pending'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="font-medium text-gray-900">Approval Steps</h5>
            {(workflow.steps as ApprovalStep[]).map((step, index) => {
              const status = getStepStatus(step.stepNumber)
              return (
                <div
                  key={index}
                  className={`flex items-center p-3 rounded-lg border ${
                    status === 'active' ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStatusColor(status)}`}>
                    {index + 1}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{step.name}</div>
                    {step.description && (
                      <div className="text-sm text-gray-600">{step.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Approvers: {step.approverRoles.join(', ')}
                      {step.isParallel && ' (Parallel)'}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {status}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : showCreateForm ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workflow Name
              </label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter workflow name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter workflow description"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-gray-900">Approval Steps</h5>
              <Button onClick={addStep} variant="outline" size="sm">
                Add Step
              </Button>
            </div>

            {steps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h6 className="font-medium text-gray-900">Step {index + 1}</h6>
                  {steps.length > 1 && (
                    <Button
                      onClick={() => removeStep(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Step Name
                    </label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(index, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Approver Roles
                    </label>
                    <select
                      multiple
                      value={step.approverRoles}
                      onChange={(e) => {
                        const selectedRoles = Array.from(e.target.selectedOptions, option => option.value as UserRole)
                        updateStep(index, { approverRoles: selectedRoles })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={step.isParallel || false}
                      onChange={(e) => updateStep(index, { isParallel: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Parallel approval (all approvers must approve)</span>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowCreateForm(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={createWorkflow}
              variant="primary"
              disabled={isCreating || !workflowName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Workflow'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            No approval workflow configured for this task
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            variant="primary"
          >
            Create Workflow
          </Button>
        </div>
      )}
    </Card>
  )
}