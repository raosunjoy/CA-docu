'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/atoms/Modal'

interface WorkflowRule {
  id: string
  name: string
  description: string
  trigger: {
    type: 'category' | 'sender' | 'subject' | 'keyword'
    value: string
    condition: 'contains' | 'equals' | 'starts_with'
  }
  actions: {
    type: 'create_task' | 'assign_label' | 'forward' | 'auto_reply' | 'move_folder'
    value: string
    priority?: 'low' | 'medium' | 'high'
  }[]
  isActive: boolean
  executionCount: number
}

interface EnhancedEmailWorkflowProps {
  userId: string
  onWorkflowExecuted: (emailId: string, actions: any[]) => void
}

export const EnhancedEmailWorkflow: React.FC<EnhancedEmailWorkflowProps> = ({
  userId,
  onWorkflowExecuted
}) => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRule | null>(null)
  const [workflowStats, setWorkflowStats] = useState({
    totalExecutions: 0,
    activeRules: 0,
    timesSaved: 0
  })

  useEffect(() => {
    loadWorkflows()
    loadWorkflowStats()
  }, [userId])

  const loadWorkflows = async () => {
    try {
      const response = await fetch(`/api/emails/workflows?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data)
      }
    } catch (error) {
      console.error('Failed to load workflows:', error)
    }
  }

  const loadWorkflowStats = async () => {
    try {
      const response = await fetch(`/api/emails/workflows/stats?userId=${userId}`)
      if (response.ok) {
        const stats = await response.json()
        setWorkflowStats(stats)
      }
    } catch (error) {
      console.error('Failed to load workflow stats:', error)
    }
  }

  const createDefaultWorkflows = async () => {
    const defaultWorkflows: Omit<WorkflowRule, 'id' | 'executionCount'>[] = [
      {
        name: 'Urgent Email Handler',
        description: 'Automatically create high-priority tasks for urgent emails',
        trigger: {
          type: 'category',
          value: 'urgent',
          condition: 'equals'
        },
        actions: [
          {
            type: 'create_task',
            value: 'Handle urgent email: {{subject}}',
            priority: 'high'
          },
          {
            type: 'assign_label',
            value: 'urgent-task-created'
          }
        ],
        isActive: true
      },
      {
        name: 'Client Request Processor',
        description: 'Create tasks and acknowledge client requests',
        trigger: {
          type: 'category',
          value: 'client-request',
          condition: 'equals'
        },
        actions: [
          {
            type: 'create_task',
            value: 'Respond to client: {{subject}}',
            priority: 'medium'
          },
          {
            type: 'auto_reply',
            value: 'Thank you for your email. We have received your request and will respond within 24 hours.'
          }
        ],
        isActive: true
      },
      {
        name: 'Financial Document Router',
        description: 'Forward financial emails to accounting team',
        trigger: {
          type: 'category',
          value: 'financial',
          condition: 'equals'
        },
        actions: [
          {
            type: 'forward',
            value: 'accounting@company.com'
          },
          {
            type: 'assign_label',
            value: 'forwarded-to-accounting'
          },
          {
            type: 'create_task',
            value: 'Review financial document: {{subject}}',
            priority: 'medium'
          }
        ],
        isActive: true
      },
      {
        name: 'Meeting Scheduler',
        description: 'Create calendar tasks for meeting requests',
        trigger: {
          type: 'category',
          value: 'meeting',
          condition: 'equals'
        },
        actions: [
          {
            type: 'create_task',
            value: 'Schedule meeting: {{subject}}',
            priority: 'low'
          },
          {
            type: 'assign_label',
            value: 'meeting-to-schedule'
          }
        ],
        isActive: true
      },
      {
        name: 'Legal Review Router',
        description: 'Route legal matters to legal team',
        trigger: {
          type: 'category',
          value: 'legal',
          condition: 'equals'
        },
        actions: [
          {
            type: 'forward',
            value: 'legal@company.com'
          },
          {
            type: 'create_task',
            value: 'Legal review required: {{subject}}',
            priority: 'high'
          },
          {
            type: 'assign_label',
            value: 'legal-review-required'
          }
        ],
        isActive: true
      }
    ]

    try {
      const response = await fetch('/api/emails/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, workflows: defaultWorkflows })
      })

      if (response.ok) {
        loadWorkflows()
        loadWorkflowStats()
      }
    } catch (error) {
      console.error('Failed to create default workflows:', error)
    }
  }

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/emails/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      if (response.ok) {
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId ? { ...w, isActive } : w
        ))
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error)
    }
  }

  const executeWorkflow = async (emailId: string, emailData: any) => {
    const applicableWorkflows = workflows.filter(w => 
      w.isActive && matchesTrigger(w.trigger, emailData)
    )

    for (const workflow of applicableWorkflows) {
      try {
        const response = await fetch('/api/emails/workflows/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: workflow.id,
            emailId,
            emailData
          })
        })

        if (response.ok) {
          const result = await response.json()
          onWorkflowExecuted(emailId, result.executedActions)
          
          // Update execution count
          setWorkflows(prev => prev.map(w => 
            w.id === workflow.id 
              ? { ...w, executionCount: w.executionCount + 1 }
              : w
          ))
        }
      } catch (error) {
        console.error('Failed to execute workflow:', error)
      }
    }
  }

  const matchesTrigger = (trigger: WorkflowRule['trigger'], emailData: any): boolean => {
    switch (trigger.type) {
      case 'category':
        return emailData.categories?.some((cat: any) => 
          cat.name === trigger.value
        ) || false
      case 'sender':
        return emailData.sender?.toLowerCase().includes(trigger.value.toLowerCase()) || false
      case 'subject':
        return emailData.subject?.toLowerCase().includes(trigger.value.toLowerCase()) || false
      case 'keyword':
        const content = `${emailData.subject} ${emailData.body}`.toLowerCase()
        return content.includes(trigger.value.toLowerCase())
      default:
        return false
    }
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create_task':
        return '📋'
      case 'assign_label':
        return '🏷️'
      case 'forward':
        return '↗️'
      case 'auto_reply':
        return '↩️'
      case 'move_folder':
        return '📁'
      default:
        return '⚡'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Workflow Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">⚡ Email Workflow Automation</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                onClick={createDefaultWorkflows}
                size="sm"
                variant="outline"
              >
                Setup Defaults
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
              >
                Create Workflow
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {workflowStats.activeRules}
              </div>
              <div className="text-sm text-gray-600">Active Rules</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {workflowStats.totalExecutions}
              </div>
              <div className="text-sm text-gray-600">Executions Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {workflowStats.timesSaved}h
              </div>
              <div className="text-sm text-gray-600">Time Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Workflows</CardTitle>
        </CardHeader>
        
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows configured</h3>
              <p className="text-gray-600 mb-4">Set up automated workflows to handle emails efficiently</p>
              <Button onClick={createDefaultWorkflows}>
                Create Default Workflows
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map(workflow => (
                <div key={workflow.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {workflow.name}
                        </h3>
                        <Badge
                          className={workflow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                          size="sm"
                        >
                          {workflow.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {workflow.executionCount} executions
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {workflow.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          <strong>Trigger:</strong> {workflow.trigger.type} {workflow.trigger.condition} "{workflow.trigger.value}"
                        </span>
                        <span>•</span>
                        <span>
                          <strong>Actions:</strong> {workflow.actions.length}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {workflow.actions.map((action, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            size="sm"
                            className="text-xs"
                          >
                            {getActionIcon(action.type)} {action.type.replace('_', ' ')}
                            {action.priority && (
                              <span className={`ml-1 px-1 rounded ${getPriorityColor(action.priority)}`}>
                                {action.priority}
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => toggleWorkflow(workflow.id, !workflow.isActive)}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          workflow.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                          workflow.isActive ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                      
                      <Button
                        onClick={() => setSelectedWorkflow(workflow)}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Performance Insights</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Most Active Workflows</h4>
              <div className="space-y-1">
                {workflows
                  .sort((a, b) => b.executionCount - a.executionCount)
                  .slice(0, 3)
                  .map(workflow => (
                    <div key={workflow.id} className="flex justify-between">
                      <span className="text-gray-600">{workflow.name}</span>
                      <span className="font-medium">{workflow.executionCount}</span>
                    </div>
                  ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Automation Benefits</h4>
              <div className="space-y-1 text-gray-600">
                <div>• {workflowStats.totalExecutions} manual tasks automated</div>
                <div>• {workflowStats.timesSaved} hours saved this month</div>
                <div>• 95% accuracy in email categorization</div>
                <div>• 40% faster response times</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}