'use client'

import React, { useState, useEffect } from 'react'
import { 
  Template, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Search,
  Filter,
  Eye,
  Share,
  BarChart3
} from 'lucide-react'
import { type EmailTemplate, type EmailTemplateData } from '../../types'

interface EmailTemplatesProps {
  onSelectTemplate?: (template: EmailTemplate) => void
  onCreateTemplate?: () => void
  className?: string
}

interface TemplateFormProps {
  template?: EmailTemplate
  onSave: (templateData: EmailTemplateData) => Promise<void>
  onCancel: () => void
}

const TemplateForm: React.FC<TemplateFormProps> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState<EmailTemplateData>({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || '',
    subject: template?.subject || '',
    bodyHtml: template?.bodyHtml || '',
    bodyText: template?.bodyText || '',
    variables: template?.variables || [],
    isShared: template?.isShared || false
  })

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.subject.trim()) {
      alert('Name and subject are required')
      return
    }

    try {
      setSaving(true)
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const addVariable = () => {
    const newVariable = {
      name: '',
      label: '',
      type: 'text' as const,
      required: false
    }
    setFormData(prev => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable]
    }))
  }

  const updateVariable = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.map((variable, i) => 
        i === index ? { ...variable, [field]: value } : variable
      ) || []
    }))
  }

  const removeVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.filter((_, i) => i !== index) || []
    }))
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter template name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select category</option>
              <option value="client_communication">Client Communication</option>
              <option value="internal">Internal</option>
              <option value="compliance">Compliance</option>
              <option value="billing">Billing</option>
              <option value="follow_up">Follow Up</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Brief description of the template"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject *
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Email subject line"
            required
          />
        </div>

        {/* Email body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Body *
          </label>
          <textarea
            value={formData.bodyHtml}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              bodyHtml: e.target.value,
              bodyText: e.target.value.replace(/<[^>]*>/g, '') // Simple HTML strip
            }))}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Email content (HTML supported)"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Use variables like {{clientName}} or {{dueDate}} for dynamic content
          </p>
        </div>

        {/* Variables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Template Variables
            </label>
            <button
              type="button"
              onClick={addVariable}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus size={14} className="mr-1" />
              Add Variable
            </button>
          </div>

          {formData.variables && formData.variables.length > 0 && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-md">
              {formData.variables.map((variable, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateVariable(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="variableName"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Label</label>
                    <input
                      type="text"
                      value={variable.label}
                      onChange={(e) => updateVariable(index, 'label', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Display Label"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Type</label>
                    <select
                      value={variable.type}
                      onChange={(e) => updateVariable(index, 'type', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={variable.required}
                      onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                      className="mr-1"
                    />
                    <label className="text-xs text-gray-600">Required</label>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => removeVariable(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isShared}
              onChange={(e) => setFormData(prev => ({ ...prev, isShared: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Share with team</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{saving ? 'Saving...' : 'Save Template'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export const EmailTemplates: React.FC<EmailTemplatesProps> = ({
  onSelectTemplate,
  onCreateTemplate,
  className = ''
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>()

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/emails/templates')
      if (response.ok) {
        const templatesData = await response.json()
        setTemplates(templatesData)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async (templateData: EmailTemplateData) => {
    try {
      const url = editingTemplate 
        ? `/api/emails/templates/${editingTemplate.id}`
        : '/api/emails/templates'
      
      const method = editingTemplate ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })

      if (response.ok) {
        await loadTemplates()
        setShowForm(false)
        setEditingTemplate(undefined)
      } else {
        throw new Error('Failed to save template')
      }
    } catch (error) {
      console.error('Save template error:', error)
      throw error
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    try {
      const response = await fetch(`/api/emails/templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadTemplates()
      } else {
        throw new Error('Failed to delete template')
      }
    } catch (error) {
      console.error('Delete template error:', error)
      alert('Failed to delete template. Please try again.')
    }
  }

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    const duplicateData: EmailTemplateData = {
      name: `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      variables: template.variables,
      isShared: false
    }

    try {
      await handleSaveTemplate(duplicateData)
    } catch (error) {
      console.error('Duplicate template error:', error)
      alert('Failed to duplicate template. Please try again.')
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))]

  if (showForm) {
    return (
      <TemplateForm
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setShowForm(false)
          setEditingTemplate(undefined)
        }}
      />
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Template className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold">Email Templates</h3>
        </div>
        <button
          onClick={() => {
            if (onCreateTemplate) {
              onCreateTemplate()
            } else {
              setShowForm(true)
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>New Template</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search size={16} className="absolute left-2 top-3 text-gray-400" />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates list */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Template size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No templates found</p>
            {searchQuery || selectedCategory ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('')
                }}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Create your first template
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {template.name}
                    </h4>
                    {template.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded mt-1">
                        {template.category.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    {template.isShared && (
                      <Share size={14} className="text-green-600" title="Shared template" />
                    )}
                    <span className="text-xs text-gray-500">
                      {template.usageCount || 0} uses
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {template.subject}
                  </p>
                  {template.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {onSelectTemplate && (
                      <button
                        onClick={() => onSelectTemplate(template)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Use
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setEditingTemplate(template)
                        setShowForm(true)
                      }}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleDuplicateTemplate(template)}
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}