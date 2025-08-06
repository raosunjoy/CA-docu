// Approval Templates Component
// Manages approval workflow templates

'use client'

import React, { useState, useEffect } from 'react'
import { 
  UserRole,
  ApprovalStep,
  ApprovalTemplateData 
} from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'

interface ApprovalTemplate {
  id: string
  name: string
  description?: string
  category?: string
  conditions: any[]
  steps: ApprovalStep[]
  isDefault: boolean
  isActive: boolean
  createdAt: string
  creator: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface ApprovalTemplatesProps {
  onTemplateSelect?: (template: ApprovalTemplate) => void
  className?: string
}

export function ApprovalTemplates({ 
  onTemplateSelect,
  className = '' 
}: ApprovalTemplatesProps) {
  const [templates, setTemplates] = useState<ApprovalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateCategory, setTemplateCategory] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [steps, setSteps] = useState<ApprovalStep[]>([
    {
      stepNumber: 0,
      name: 'Initial Review',
      approverRoles: [UserRole.MANAGER],
      isParallel: false
    }
  ])

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/approvals/templates')
      const data = await response.json()
      
      if (data.success) {
        setTemplates(data.data.templates)
      } else {
        throw new Error(data.error?.message || 'Failed to fetch templates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async () => {
    try {
      setIsCreating(true)
      setError(null)

      const templateData: ApprovalTemplateData = {
        name: templateName,
        description: templateDescription || undefined,
        category: templateCategory || undefined,
        conditions: [], // For now, empty conditions
        steps: steps.map((step, index) => ({
          ...step,
          stepNumber: index
        })),
        isDefault
      }

      const response = await fetch('/api/approvals/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to create template')
      }

      await fetchTemplates()
      setShowCreateForm(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setTemplateName('')
    setTemplateDescription('')
    setTemplateCategory('')
    setIsDefault(false)
    setSteps([
      {
        stepNumber: 0,
        name: 'Initial Review',
        approverRoles: [UserRole.MANAGER],
        isParallel: false
      }
    ])
  }

  const addStep = () => {
    const newStep: ApprovalStep = {
      stepNumber: steps.length,
      name: `Step ${steps.length + 1}`,
      approverRoles: [UserRole.MANAGER],
      isParallel: false
    }
    setSteps([...steps, newStep])
  }

  const updateStep = (index: number, updates: Partial<ApprovalStep>) => {
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

  const categories = [
    'audit',
    'tax',
    'compliance',
    'financial-review',
    'client-onboarding',
    'document-review'
  ]

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
          Approval Templates
        </h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          size="sm"
        >
          Create Template
        </Button>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {showCreateForm ? (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-gray-900">Create New Template</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category...</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter template description"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Set as default template for this category</span>
            </label>
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
                    <span className="text-sm text-gray-700">Parallel approval</span>
                  </label>
                </div>
              </div>
            ))}
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
              onClick={createTemplate}
              variant="primary"
              disabled={isCreating || !templateName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                No approval templates found
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                variant="primary"
              >
                Create First Template
              </Button>
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {template.name}
                      </h4>
                      {template.isDefault && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                          Default
                        </span>
                      )}
                      {template.category && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                          {template.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-2">
                        {template.description}
                      </p>
                    )}

                    <div className="text-sm text-gray-500 mb-2">
                      {template.steps.length} step{template.steps.length !== 1 ? 's' : ''} - 
                      Created by {template.creator.firstName} {template.creator.lastName}
                    </div>

                    <div className="text-xs text-gray-400">
                      Created: {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {onTemplateSelect && (
                    <div className="ml-4">
                      <Button
                        onClick={() => onTemplateSelect(template)}
                        variant="outline"
                        size="sm"
                      >
                        Use Template
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Approval Steps:
                  </div>
                  <div className="space-y-1">
                    {template.steps.map((step, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {index + 1}. {step.name} ({step.approverRoles.join(', ')})
                        {step.isParallel && ' - Parallel'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  )
}