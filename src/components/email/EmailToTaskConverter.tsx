'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  Calendar, 
  User, 
  Tag, 
  Paperclip,
  AlertCircle,
  Sparkles,
  X,
  Plus
} from 'lucide-react'
import { 
  type Email, 
  type EmailToTaskData, 
  type TaskPriority,
  type User as UserType
} from '../../types'

interface EmailToTaskConverterProps {
  email: Email & {
    account: { email: string; displayName?: string }
    attachments: any[]
  }
  onConvert: (taskData: EmailToTaskData) => Promise<void>
  onCancel: () => void
  className?: string
}

interface TaskSuggestion {
  title: string
  description: string
  priority: TaskPriority
  tags: string[]
  confidence: number
  reasoning: string[]
}

export const EmailToTaskConverter: React.FC<EmailToTaskConverterProps> = ({
  email,
  onConvert,
  onCancel,
  className = ''
}) => {
  const [taskData, setTaskData] = useState<EmailToTaskData>({
    emailId: email.id,
    title: email.subject || 'Task from email',
    description: '',
    priority: 'MEDIUM',
    assignedTo: '',
    dueDate: undefined,
    tags: [],
    includeAttachments: email.attachments.length > 0
  })
  
  const [users, setUsers] = useState<UserType[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<TaskSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    loadUsers()
    loadTags()
    generateSuggestions()
  }, [email])

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const usersData = await response.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const loadTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const tagsData = await response.json()
        setAvailableTags(tagsData.map((tag: any) => tag.name))
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const generateSuggestions = async () => {
    try {
      setLoadingSuggestions(true)
      const response = await fetch('/api/emails/ai/task-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          body: email.bodyText || email.bodyHtml,
          fromAddress: email.fromAddress,
          attachments: email.attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType
          }))
        })
      })
      
      if (response.ok) {
        const suggestion = await response.json()
        setSuggestions(suggestion)
        
        // Auto-apply high confidence suggestions
        if (suggestion.confidence > 0.8) {
          setTaskData(prev => ({
            ...prev,
            title: suggestion.title,
            description: suggestion.description,
            priority: suggestion.priority,
            tags: suggestion.tags
          }))
        }
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!taskData.title.trim()) {
      alert('Task title is required')
      return
    }

    try {
      setLoading(true)
      await onConvert(taskData)
    } catch (error) {
      console.error('Failed to convert email to task:', error)
      alert('Failed to create task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const applySuggestion = () => {
    if (!suggestions) return
    
    setTaskData(prev => ({
      ...prev,
      title: suggestions.title,
      description: suggestions.description,
      priority: suggestions.priority,
      tags: suggestions.tags
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !taskData.tags.includes(newTag.trim())) {
      setTaskData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTaskData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const extractEmailContent = () => {
    const content = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || ''
    const preview = content.substring(0, 500)
    
    return `Email from: ${email.fromAddress}
Subject: ${email.subject}
Received: ${new Date(email.receivedAt).toLocaleString()}

${preview}${content.length > 500 ? '...' : ''}

---
Original email ID: ${email.id}`
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <CheckSquare className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold">Convert Email to Task</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        {/* Email preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-medium text-gray-900">
                {email.subject || '(No subject)'}
              </h4>
              <p className="text-sm text-gray-600">
                From: {email.fromAddress}
              </p>
            </div>
            {email.attachments.length > 0 && (
              <div className="flex items-center text-sm text-gray-500">
                <Paperclip size={14} className="mr-1" />
                {email.attachments.length} attachment{email.attachments.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-700 line-clamp-3">
            {email.bodyText?.substring(0, 200) || 'No content preview available'}
            {(email.bodyText?.length || 0) > 200 && '...'}
          </p>
        </div>

        {/* AI Suggestions */}
        {loadingSuggestions && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="text-blue-600 animate-pulse" size={16} />
              <span className="text-sm text-blue-800">Generating AI suggestions...</span>
            </div>
          </div>
        )}

        {suggestions && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="text-blue-600" size={16} />
                <span className="text-sm font-medium text-blue-800">
                  AI Suggestion (Confidence: {Math.round(suggestions.confidence * 100)}%)
                </span>
              </div>
              <button
                onClick={applySuggestion}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Title:</span> {suggestions.title}
              </div>
              <div>
                <span className="font-medium">Priority:</span> {suggestions.priority}
              </div>
              {suggestions.tags.length > 0 && (
                <div>
                  <span className="font-medium">Tags:</span> {suggestions.tags.join(', ')}
                </div>
              )}
              {suggestions.reasoning.length > 0 && (
                <div>
                  <span className="font-medium">Reasoning:</span>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {suggestions.reasoning.map((reason, index) => (
                      <li key={index} className="text-xs text-gray-600">{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={taskData.title}
              onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={taskData.description}
              onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task description or click to auto-fill from email"
            />
            <button
              type="button"
              onClick={() => setTaskData(prev => ({ ...prev, description: extractEmailContent() }))}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Auto-fill from email content
            </button>
          </div>

          {/* Priority and Assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={taskData.priority}
                onChange={(e) => setTaskData(prev => ({ 
                  ...prev, 
                  priority: e.target.value as TaskPriority 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to
              </label>
              <select
                value={taskData.assignedTo}
                onChange={(e) => setTaskData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              value={taskData.dueDate ? new Date(taskData.dueDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => setTaskData(prev => ({ 
                ...prev, 
                dueDate: e.target.value ? new Date(e.target.value) : undefined 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {taskData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Plus size={16} />
              </button>
            </div>
            {availableTags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Suggested tags:</p>
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!taskData.tags.includes(tag)) {
                          setTaskData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                        }
                      }}
                      className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                      disabled={taskData.tags.includes(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Include attachments */}
          {email.attachments.length > 0 && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeAttachments"
                checked={taskData.includeAttachments}
                onChange={(e) => setTaskData(prev => ({ 
                  ...prev, 
                  includeAttachments: e.target.checked 
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeAttachments" className="text-sm text-gray-700">
                Include email attachments in task ({email.attachments.length} file{email.attachments.length !== 1 ? 's' : ''})
              </label>
            </div>
          )}

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
              disabled={loading || !taskData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Creating...' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}