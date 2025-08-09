/**
 * Mobile Task Form Component
 * Touch-optimized task creation and editing form
 */

'use client'

import React, { useState, useRef } from 'react'
import { Task, TaskPriority, TaskStatus } from '@/types'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { 
  X, 
  Calendar, 
  User, 
  Flag, 
  Tag, 
  Clock,
  Paperclip,
  Mic,
  Camera,
  Plus
} from 'lucide-react'

interface MobileTaskFormProps {
  task?: Partial<Task>
  onSave: (task: Partial<Task>) => void
  onCancel: () => void
  isOpen: boolean
}

export function MobileTaskForm({
  task,
  onSave,
  onCancel,
  isOpen
}: MobileTaskFormProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: undefined,
    tags: [],
    ...task
  })
  
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'attachments'>('basic')
  const [isRecording, setIsRecording] = useState(false)
  const [newTag, setNewTag] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title?.trim()) return
    
    onSave(formData)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setFormData(prev => ({
        ...prev,
        description: `${prev.description || ''  } ${  transcript}`
      }))
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.onerror = () => {
      setIsRecording(false)
      alert('Speech recognition error')
    }

    recognition.start()
  }

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    // Handle file attachments
    console.log('Files selected:', files)
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {task?.id ? 'Edit Task' : 'New Task'}
          </h1>
          <Button
            type="submit"
            form="task-form"
            size="sm"
            disabled={!formData.title?.trim()}
          >
            Save
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-4 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'basic', label: 'Basic', icon: Flag },
            { id: 'details', label: 'Details', icon: Calendar },
            { id: 'attachments', label: 'Files', icon: Paperclip }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto">
        <form id="task-form" onSubmit={handleSubmit} className="p-4 space-y-6">
          {activeTab === 'basic' && (
            <>
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  className="text-lg"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`p-2 rounded-lg border ${
                        isRecording 
                          ? 'bg-red-100 border-red-300 text-red-600' 
                          : 'bg-gray-50 border-gray-300 text-gray-600'
                      }`}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add more details..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' },
                    { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                    { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
                    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' }
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: value as TaskPriority }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        formData.priority === value
                          ? color
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Flag className="h-4 w-4 mx-auto mb-1" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'TODO', label: 'To Do' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'IN_REVIEW', label: 'In Review' },
                    { value: 'COMPLETED', label: 'Completed' }
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: value as TaskStatus }))}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                        formData.status === value
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={formData.dueDate ? new Date(formData.dueDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      dueDate: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add tag..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Estimated Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Hours
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedHours || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="0.0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'attachments' && (
            <>
              <div className="text-center py-8">
                <div className="mb-4">
                  <Paperclip className="h-12 w-12 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Add Attachments
                </h3>
                <p className="text-gray-600 mb-6">
                  Attach files, photos, or documents to this task
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCameraCapture}
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-sm">Camera</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 h-20"
                  >
                    <Paperclip className="h-6 w-6" />
                    <span className="text-sm">Files</span>
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </>
          )}
        </form>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-form"
            disabled={!formData.title?.trim()}
            className="flex-1"
          >
            {task?.id ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}