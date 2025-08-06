'use client'

import { useState, useCallback } from 'react'
import { Button, Input, Card } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'

interface TaskTemplate {
  id: string
  name: string
  description: string
  category: 'audit' | 'tax' | 'compliance' | 'general'
  tasks: TemplateTask[]
  isPublic: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface TemplateTask {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  estimatedHours?: number
  dependencies: string[]
  assigneeRole?: string
  dueOffsetDays?: number
}

interface WorkflowRule {
  id: string
  name: string
  trigger: 'status_change' | 'due_date' | 'assignment' | 'creation'
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  isActive: boolean
}

interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
  value: string
}

interface WorkflowAction {
  type: 'assign' | 'notify' | 'create_task' | 'update_status' | 'set_priority'
  parameters: Record<string, unknown>
}

interface TaskTemplatesProps {
  templates: TaskTemplate[]
  workflows: WorkflowRule[]
  onCreateTemplate: (template: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateTemplate: (id: string, template: Partial<TaskTemplate>) => void
  onDeleteTemplate: (id: string) => void
  onCreateWorkflow: (workflow: Omit<WorkflowRule, 'id'>) => void
  onUpdateWorkflow: (id: string, workflow: Partial<WorkflowRule>) => void
  onDeleteWorkflow: (id: string) => void
  onInstantiateTemplate: (templateId: string, parameters: Record<string, unknown>) => void
}

const CA_TEMPLATES: Partial<TaskTemplate>[] = [
  {
    name: 'Annual Audit Process',
    description: 'Complete annual audit workflow for clients',
    category: 'audit',
    tasks: [
      {
        id: '1',
        title: 'Planning and Risk Assessment',
        description: 'Conduct initial planning and risk assessment',
        priority: TaskPriority.HIGH,
        estimatedHours: 8,
        dependencies: [],
        assigneeRole: 'MANAGER',
        dueOffsetDays: 0
      },
      {
        id: '2',
        title: 'Internal Controls Testing',
        description: 'Test and evaluate internal controls',
        priority: TaskPriority.HIGH,
        estimatedHours: 16,
        dependencies: ['1'],
        assigneeRole: 'ASSOCIATE',
        dueOffsetDays: 7
      },
      {
        id: '3',
        title: 'Substantive Testing',
        description: 'Perform substantive audit procedures',
        priority: TaskPriority.HIGH,
        estimatedHours: 24,
        dependencies: ['2'],
        assigneeRole: 'ASSOCIATE',
        dueOffsetDays: 14
      },
      {
        id: '4',
        title: 'Audit Report Preparation',
        description: 'Prepare and review audit report',
        priority: TaskPriority.URGENT,
        estimatedHours: 12,
        dependencies: ['3'],
        assigneeRole: 'PARTNER',
        dueOffsetDays: 28
      }
    ]
  },
  {
    name: 'Tax Filing Process',
    description: 'Standard tax return preparation and filing',
    category: 'tax',
    tasks: [
      {
        id: '1',
        title: 'Gather Tax Documents',
        description: 'Collect all necessary tax documents from client',
        priority: TaskPriority.MEDIUM,
        estimatedHours: 2,
        dependencies: [],
        assigneeRole: 'ASSOCIATE',
        dueOffsetDays: 0
      },
      {
        id: '2',
        title: 'Prepare Tax Return',
        description: 'Prepare tax return based on collected documents',
        priority: TaskPriority.HIGH,
        estimatedHours: 6,
        dependencies: ['1'],
        assigneeRole: 'ASSOCIATE',
        dueOffsetDays: 3
      },
      {
        id: '3',
        title: 'Review Tax Return',
        description: 'Review prepared tax return for accuracy',
        priority: TaskPriority.HIGH,
        estimatedHours: 2,
        dependencies: ['2'],
        assigneeRole: 'MANAGER',
        dueOffsetDays: 5
      },
      {
        id: '4',
        title: 'File Tax Return',
        description: 'Submit tax return to authorities',
        priority: TaskPriority.URGENT,
        estimatedHours: 1,
        dependencies: ['3'],
        assigneeRole: 'MANAGER',
        dueOffsetDays: 7
      }
    ]
  },
  {
    name: 'Compliance Review',
    description: 'Quarterly compliance review process',
    category: 'compliance',
    tasks: [
      {
        id: '1',
        title: 'Regulatory Updates Review',
        description: 'Review latest regulatory changes and updates',
        priority: TaskPriority.MEDIUM,
        estimatedHours: 4,
        dependencies: [],
        assigneeRole: 'MANAGER',
        dueOffsetDays: 0
      },
      {
        id: '2',
        title: 'Compliance Gap Analysis',
        description: 'Identify compliance gaps and issues',
        priority: TaskPriority.HIGH,
        estimatedHours: 8,
        dependencies: ['1'],
        assigneeRole: 'ASSOCIATE',
        dueOffsetDays: 7
      },
      {
        id: '3',
        title: 'Remediation Plan',
        description: 'Develop plan to address compliance gaps',
        priority: TaskPriority.HIGH,
        estimatedHours: 6,
        dependencies: ['2'],
        assigneeRole: 'MANAGER',
        dueOffsetDays: 14
      },
      {
        id: '4',
        title: 'Implementation Tracking',
        description: 'Track implementation of remediation measures',
        priority: TaskPriority.MEDIUM,
        estimatedHours: 4,
        dependencies: ['3'],
        assigneeRole: 'ASSOCIATE',
        dueOffsetDays: 30
      }
    ]
  }
]

export function TaskTemplates({
  templates,
  workflows,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onCreateWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow,
  onInstantiateTemplate
}: TaskTemplatesProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'workflows'>('templates')
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showWorkflowForm, setShowWorkflowForm] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRule | null>(null)

  const handleInstantiateTemplate = useCallback((template: TaskTemplate) => {
    // Show parameter form for template instantiation
    const parameters = {
      clientName: prompt('Enter client name:') || '',
      startDate: new Date().toISOString().split('T')[0],
      projectName: prompt('Enter project name:') || template.name
    }
    
    if (parameters.clientName && parameters.projectName) {
      onInstantiateTemplate(template.id, parameters)
    }
  }, [onInstantiateTemplate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Task Templates & Workflows</h2>
          <p className="text-gray-600">Manage reusable task templates and automation workflows</p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowTemplateForm(true)}
          >
            New Template
          </Button>
          <Button
            onClick={() => setShowWorkflowForm(true)}
          >
            New Workflow
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'workflows'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Workflows ({workflows.length})
          </button>
        </nav>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Pre-built CA Templates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">CA-Specific Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CA_TEMPLATES.map((template, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.category === 'audit' ? 'bg-blue-100 text-blue-800' :
                        template.category === 'tax' ? 'bg-green-100 text-green-800' :
                        template.category === 'compliance' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">{template.description}</p>
                    
                    <div className="text-xs text-gray-500">
                      {template.tasks?.length} tasks
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const fullTemplate = {
                            ...template,
                            id: `template-${index}`,
                            isPublic: true,
                            createdBy: 'system',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          } as TaskTemplate
                          handleInstantiateTemplate(fullTemplate)
                        }}
                      >
                        Use Template
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const fullTemplate = {
                            ...template,
                            id: `template-${index}`,
                            isPublic: true,
                            createdBy: 'system',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          } as TaskTemplate
                          setSelectedTemplate(fullTemplate)
                          setShowTemplateForm(true)
                        }}
                      >
                        Customize
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Templates */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Templates</h3>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No custom templates created yet.</p>
                <Button
                  className="mt-4"
                  onClick={() => setShowTemplateForm(true)}
                >
                  Create Your First Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setSelectedTemplate(template)
                              setShowTemplateForm(true)
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onDeleteTemplate(template.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600">{template.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{template.tasks.length} tasks</span>
                        <span>{template.isPublic ? 'Public' : 'Private'}</span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleInstantiateTemplate(template)}
                        className="w-full"
                      >
                        Use Template
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No automation workflows created yet.</p>
              <Button
                className="mt-4"
                onClick={() => setShowWorkflowForm(true)}
              >
                Create Your First Workflow
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          workflow.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {workflow.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Trigger:</span> {workflow.trigger.replace('_', ' ')}
                        <span className="ml-4 font-medium">Conditions:</span> {workflow.conditions.length}
                        <span className="ml-4 font-medium">Actions:</span> {workflow.actions.length}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedWorkflow(workflow)
                          setShowWorkflowForm(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateWorkflow(workflow.id, { isActive: !workflow.isActive })}
                      >
                        {workflow.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onDeleteWorkflow(workflow.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <TemplateFormModal
          template={selectedTemplate}
          onSave={(template) => {
            if (selectedTemplate) {
              onUpdateTemplate(selectedTemplate.id, template)
            } else {
              onCreateTemplate(template)
            }
            setShowTemplateForm(false)
            setSelectedTemplate(null)
          }}
          onCancel={() => {
            setShowTemplateForm(false)
            setSelectedTemplate(null)
          }}
        />
      )}

      {/* Workflow Form Modal */}
      {showWorkflowForm && (
        <WorkflowFormModal
          workflow={selectedWorkflow}
          onSave={(workflow) => {
            if (selectedWorkflow) {
              onUpdateWorkflow(selectedWorkflow.id, workflow)
            } else {
              onCreateWorkflow(workflow)
            }
            setShowWorkflowForm(false)
            setSelectedWorkflow(null)
          }}
          onCancel={() => {
            setShowWorkflowForm(false)
            setSelectedWorkflow(null)
          }}
        />
      )}
    </div>
  )
}

// Template Form Modal Component
function TemplateFormModal({
  template,
  onSave,
  onCancel
}: {
  template: TaskTemplate | null
  onSave: (template: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'general' as const,
    isPublic: template?.isPublic || false,
    tasks: template?.tasks || []
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Template Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="audit">Audit</option>
                  <option value="tax">Tax</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter template description"
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Make this template public</span>
            </label>

            {/* Task list would go here - simplified for now */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tasks ({formData.tasks.length})</h3>
              <p className="text-sm text-gray-600">Task management interface would be implemented here</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 mt-8 border-t border-gray-200">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={() => onSave({
                name: formData.name,
                description: formData.description,
                category: formData.category,
                tasks: formData.tasks,
                isPublic: formData.isPublic,
                createdBy: 'current-user' // Would be actual user ID
              })}
              disabled={!formData.name.trim()}
            >
              {template ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Workflow Form Modal Component
function WorkflowFormModal({
  workflow,
  onSave,
  onCancel
}: {
  workflow: WorkflowRule | null
  onSave: (workflow: Omit<WorkflowRule, 'id'>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: workflow?.name || '',
    trigger: workflow?.trigger || 'status_change' as const,
    conditions: workflow?.conditions || [],
    actions: workflow?.actions || [],
    isActive: workflow?.isActive || true
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {workflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <Input
              label="Workflow Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter workflow name"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select
                value={formData.trigger}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger: e.target.value as any }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="status_change">Status Change</option>
                <option value="due_date">Due Date</option>
                <option value="assignment">Assignment</option>
                <option value="creation">Task Creation</option>
              </select>
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>

            {/* Conditions and Actions would be more complex forms */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Conditions & Actions</h3>
              <p className="text-sm text-gray-600">Advanced workflow builder interface would be implemented here</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 mt-8 border-t border-gray-200">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={() => onSave(formData)}
              disabled={!formData.name.trim()}
            >
              {workflow ? 'Update Workflow' : 'Create Workflow'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}