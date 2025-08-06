'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { TagWithChildren } from '@/lib/tag-service'

interface TagFormProps {
  tag?: TagWithChildren
  availableTags: TagWithChildren[]
  onSubmit: (data: {
    name: string
    parentId?: string
    color?: string
    description?: string
  }) => Promise<void>
  onCancel: () => void
  title: string
}

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#6B7280', '#374151', '#1F2937'
]

export const TagForm: React.FC<TagFormProps> = ({
  tag,
  availableTags,
  onSubmit,
  onCancel,
  title
}) => {
  const [formData, setFormData] = useState({
    name: tag?.name || '',
    parentId: tag?.parentId || '',
    color: tag?.color || '',
    description: tag?.description || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Build parent options (exclude self and descendants to prevent cycles)
  const getParentOptions = () => {
    if (!tag) return availableTags

    const excludeIds = new Set([tag.id])
    
    // Add all descendants to exclude list
    const addDescendants = (tagToCheck: TagWithChildren) => {
      if (tagToCheck.children) {
        tagToCheck.children.forEach(child => {
          excludeIds.add(child.id)
          addDescendants(child)
        })
      }
    }
    
    addDescendants(tag)

    return availableTags.filter(t => !excludeIds.has(t.id))
  }

  const parentOptions = getParentOptions()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tag name must be 100 characters or less'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    if (formData.color && !/^#[0-9A-F]{6}$/i.test(formData.color)) {
      newErrors.color = 'Color must be a valid hex color code'
    }

    // Check for duplicate names at the same level
    const siblings = parentOptions.filter(t => 
      t.parentId === (formData.parentId || null) && 
      t.id !== tag?.id
    )
    
    if (siblings.some(sibling => 
      sibling.name.toLowerCase() === formData.name.toLowerCase()
    )) {
      newErrors.name = 'A tag with this name already exists at this level'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        name: formData.name.trim(),
        parentId: formData.parentId || undefined,
        color: formData.color || undefined,
        description: formData.description.trim() || undefined
      })
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to save tag'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({ ...prev, color }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter tag name"
              maxLength={100}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Parent Tag */}
          <div>
            <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 mb-1">
              Parent Tag
            </label>
            <select
              id="parentId"
              value={formData.parentId}
              onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">No parent (root level)</option>
              {parentOptions.map((parentTag) => (
                <option key={parentTag.id} value={parentTag.id}>
                  {parentTag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="space-y-3">
              {/* Color Input */}
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.color || '#6B7280'}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  placeholder="#6B7280"
                  className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.color ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>

              {/* Preset Colors */}
              <div className="grid grid-cols-10 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      formData.color === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            {errors.color && (
              <p className="mt-1 text-sm text-red-600">{errors.color}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Optional description for this tag"
              maxLength={500}
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description}</p>
              ) : (
                <div />
              )}
              <p className="text-sm text-gray-500">
                {formData.description.length}/500
              </p>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : tag ? 'Update Tag' : 'Create Tag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TagForm