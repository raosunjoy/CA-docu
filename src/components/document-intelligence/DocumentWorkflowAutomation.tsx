'use client';

import React, { useState } from 'react';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { 
  Workflow, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  ArrowRight, 
  FileText, 
  Mail, 
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface DocumentAnalysis {
  id: string;
  name: string;
  aiInsights: {
    riskLevel: 'low' | 'medium' | 'high';
    complianceScore: number;
  };
}

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'document_upload' | 'risk_level' | 'compliance_score' | 'keyword_match';
    condition: string;
    value: any;
  };
  actions: Array<{
    type: 'email_notification' | 'move_to_folder' | 'assign_reviewer' | 'create_task' | 'flag_document';
    config: any;
  }>;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: string;
}

interface DocumentWorkflowAutomationProps {
  documents: DocumentAnalysis[];
  onWorkflowUpdate: () => void;
}

export const DocumentWorkflowAutomation: React.FC<DocumentWorkflowAutomationProps> = ({
  documents,
  onWorkflowUpdate
}) => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>(mockWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Partial<WorkflowRule>>({
    name: '',
    description: '',
    trigger: {
      type: 'document_upload',
      condition: 'always',
      value: null
    },
    actions: [],
    isActive: true
  });

  const triggerTypes = [
    { value: 'document_upload', label: 'Document Upload', description: 'Triggers when a new document is uploaded' },
    { value: 'risk_level', label: 'Risk Level', description: 'Triggers based on AI-detected risk level' },
    { value: 'compliance_score', label: 'Compliance Score', description: 'Triggers based on compliance score threshold' },
    { value: 'keyword_match', label: 'Keyword Match', description: 'Triggers when specific keywords are found' }
  ];

  const actionTypes = [
    { value: 'email_notification', label: 'Send Email', icon: Mail },
    { value: 'move_to_folder', label: 'Move to Folder', icon: FileText },
    { value: 'assign_reviewer', label: 'Assign Reviewer', icon: CheckCircle },
    { value: 'create_task', label: 'Create Task', icon: Clock },
    { value: 'flag_document', label: 'Flag Document', icon: AlertTriangle }
  ];

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(workflow => 
      workflow.id === workflowId 
        ? { ...workflow, isActive: !workflow.isActive }
        : workflow
    ));
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(workflow => workflow.id !== workflowId));
    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(null);
    }
  };

  const addAction = () => {
    if (!newWorkflow.actions) {
      setNewWorkflow(prev => ({ ...prev, actions: [] }));
    }
    
    setNewWorkflow(prev => ({
      ...prev,
      actions: [
        ...(prev.actions || []),
        {
          type: 'email_notification',
          config: { recipient: '', subject: '', message: '' }
        }
      ]
    }));
  };

  const updateAction = (index: number, field: string, value: any) => {
    setNewWorkflow(prev => ({
      ...prev,
      actions: prev.actions?.map((action, i) => 
        i === index 
          ? { ...action, [field]: value }
          : action
      ) || []
    }));
  };

  const removeAction = (index: number) => {
    setNewWorkflow(prev => ({
      ...prev,
      actions: prev.actions?.filter((_, i) => i !== index) || []
    }));
  };

  const saveWorkflow = () => {
    if (!newWorkflow.name || !newWorkflow.trigger) return;

    const workflow: WorkflowRule = {
      id: Date.now().toString(),
      name: newWorkflow.name,
      description: newWorkflow.description || '',
      trigger: newWorkflow.trigger,
      actions: newWorkflow.actions || [],
      isActive: newWorkflow.isActive || true,
      executionCount: 0
    };

    setWorkflows(prev => [...prev, workflow]);
    setIsCreating(false);
    setNewWorkflow({
      name: '',
      description: '',
      trigger: {
        type: 'document_upload',
        condition: 'always',
        value: null
      },
      actions: [],
      isActive: true
    });
    onWorkflowUpdate();
  };

  const getStatusColor = (isActive: boolean) => isActive ? 'green' : 'gray';
  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'document_upload': return FileText;
      case 'risk_level': return AlertTriangle;
      case 'compliance_score': return CheckCircle;
      case 'keyword_match': return FileText;
      default: return Workflow;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Workflow className="w-5 h-5 text-blue-600" />
            <span>Document Workflow Automation</span>
          </h2>
          <p className="text-gray-600 mt-1">Automate document processing with AI-powered rules</p>
        </div>
        
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Workflow List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {workflows.map((workflow) => {
            const TriggerIcon = getTriggerIcon(workflow.trigger.type);
            
            return (
              <Card 
                key={workflow.id} 
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedWorkflow?.id === workflow.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${workflow.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <TriggerIcon className={`w-4 h-4 ${workflow.isActive ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900">{workflow.name}</h3>
                        <Badge variant={getStatusColor(workflow.isActive) as any} size="sm">
                          {workflow.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Trigger: {triggerTypes.find(t => t.value === workflow.trigger.type)?.label}</span>
                        <span>Actions: {workflow.actions.length}</span>
                        <span>Executed: {workflow.executionCount} times</span>
                      </div>
                      
                      {workflow.lastExecuted && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last run: {new Date(workflow.lastExecuted).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWorkflow(workflow.id);
                      }}
                      className={`p-1 rounded ${
                        workflow.isActive 
                          ? 'text-green-600 hover:text-green-800' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWorkflow(workflow.id);
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Workflow Details/Creator */}
        <div className="lg:col-span-1">
          {isCreating ? (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Workflow</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workflow Name
                  </label>
                  <Input
                    value={newWorkflow.name || ''}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter workflow name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newWorkflow.description || ''}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this workflow does"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trigger
                  </label>
                  <select
                    value={newWorkflow.trigger?.type || 'document_upload'}
                    onChange={(e) => setNewWorkflow(prev => ({
                      ...prev,
                      trigger: {
                        ...prev.trigger!,
                        type: e.target.value as any
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {triggerTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Actions
                    </label>
                    <button
                      onClick={addAction}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Action
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {newWorkflow.actions?.map((action, index) => {
                      const ActionIcon = actionTypes.find(t => t.value === action.type)?.icon || Mail;
                      
                      return (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <ActionIcon className="w-4 h-4 text-gray-600" />
                          <select
                            value={action.type}
                            onChange={(e) => updateAction(index, 'type', e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            {actionTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeAction(index)}
                            className="text-red-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={saveWorkflow}
                    disabled={!newWorkflow.name}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save Workflow
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          ) : selectedWorkflow ? (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Details</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Trigger</h4>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      {React.createElement(getTriggerIcon(selectedWorkflow.trigger.type), {
                        className: "w-4 h-4 text-blue-600"
                      })}
                      <span className="text-sm font-medium text-blue-900">
                        {triggerTypes.find(t => t.value === selectedWorkflow.trigger.type)?.label}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      {triggerTypes.find(t => t.value === selectedWorkflow.trigger.type)?.description}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Actions</h4>
                  <div className="space-y-2">
                    {selectedWorkflow.actions.map((action, index) => {
                      const ActionIcon = actionTypes.find(t => t.value === action.type)?.icon || Mail;
                      
                      return (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <ActionIcon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-900">
                            {actionTypes.find(t => t.value === action.type)?.label}
                          </span>
                          {index < selectedWorkflow.actions.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Statistics</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedWorkflow.executionCount}
                      </p>
                      <p className="text-xs text-gray-600">Executions</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedWorkflow.isActive ? 'Active' : 'Inactive'}
                      </p>
                      <p className="text-xs text-gray-600">Status</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Workflow</h3>
              <p className="text-gray-600">
                Choose a workflow from the list to view details and manage settings
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Mock workflows for development
const mockWorkflows: WorkflowRule[] = [
  {
    id: '1',
    name: 'High Risk Document Alert',
    description: 'Automatically flag and notify when high-risk documents are detected',
    trigger: {
      type: 'risk_level',
      condition: 'equals',
      value: 'high'
    },
    actions: [
      {
        type: 'email_notification',
        config: { recipient: 'compliance@company.com', subject: 'High Risk Document Detected' }
      },
      {
        type: 'flag_document',
        config: { flag: 'high-risk', color: 'red' }
      }
    ],
    isActive: true,
    executionCount: 23,
    lastExecuted: '2024-01-15T14:30:00Z'
  },
  {
    id: '2',
    name: 'Compliance Review Required',
    description: 'Create review tasks for documents with low compliance scores',
    trigger: {
      type: 'compliance_score',
      condition: 'less_than',
      value: 70
    },
    actions: [
      {
        type: 'create_task',
        config: { assignee: 'compliance-team', priority: 'high' }
      },
      {
        type: 'move_to_folder',
        config: { folder: 'compliance-review' }
      }
    ],
    isActive: true,
    executionCount: 12,
    lastExecuted: '2024-01-14T09:15:00Z'
  },
  {
    id: '3',
    name: 'Contract Processing',
    description: 'Automatically process and categorize contract documents',
    trigger: {
      type: 'keyword_match',
      condition: 'contains',
      value: ['contract', 'agreement', 'terms']
    },
    actions: [
      {
        type: 'move_to_folder',
        config: { folder: 'contracts' }
      },
      {
        type: 'assign_reviewer',
        config: { reviewer: 'legal-team' }
      }
    ],
    isActive: false,
    executionCount: 45,
    lastExecuted: '2024-01-10T16:45:00Z'
  }
];