'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { TagTree } from './TagTree'
import { TagForm } from './TagForm'
import { TagAnalytics } from './TagAnalytics'
import type { TagWithChildren } from '@/lib/tag-service'

interface TagManagerProps {
  organizationId: string
  className?: string
}

interface TagFilters {
  search: string
  createdBy?: string
  showUsageCount: boolean
  includeChildren: boolean
}

export const TagManager: React.FC<TagManagerProps> = ({
  organizationId,
  className = ''
}) => {
  const [tags, setTags] = useState<TagWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTag, setEditingTag] = useState<TagWithChildren | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsTagId, setAnalyticsTagId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TagFilters>({
    search: '',
    showUsageCount: true,
    includeChildren: true
  })

  // Load tags
  const loadTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        includeChildren: filters.includeChildren.toString(),
        includeUsage: filters.showUsageCount.toString()
      })

      if (filters.search) {
        params.append('search', filters.search)
      }

      if (filters.createdBy) {
        params.append('createdBy', filters.createdBy)
      }

      const response = await fetch(`/api/tags?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load tags')
      }

      setTags(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  // Handle tag creation
  const handleCreateTag = useCallback(async (data: {
    name: string
    parentId?: string
    color?: string
    description?: string
  }) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create tag')
      }

      await loadTags()
      setShowCreateForm(false)
    } catch (err) {
      throw err
    }
  }, [loadTags])

  // Handle tag update
  const handleUpdateTag = useCallback(async (
    id: string,
    data: {
      name?: string
      parentId?: string | null
      color?: string
      description?: string
    }
  ) => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update tag')
      }

      await loadTags()
      setEditingTag(null)
    } catch (err) {
      throw err
    }
  }, [loadTags])

  // Handle tag deletion
  const handleDeleteTag = useCallback(async (tag: TagWithChildren) => {
    if (!confirm(`Are you sure you want to delete "${tag.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/tags/${tag.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete tag')
      }

      await loadTags()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tag')
    }
  }, [loadTags])

  // Handle tag selection
  const handleTagSelect = useCallback((tagId: string, selected: boolean) => {
    setSelectedTagIds(prev =>
      selected
        ? [...prev, tagId]
        : prev.filter(id => id !== tagId)
    )
  }, [])

  // Handle expand/collapse
  const handleToggleExpand = useCallback((tagId: string) => {
    setExpandedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }, [])

  // Handle analytics view
  const handleViewAnalytics = useCallback((tag: TagWithChildren) => {
    setAnalyticsTagId(tag.id)
    setShowAnalytics(true)
  }, [])

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={loadTags}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tag Management</h2>
          <p className="text-gray-600">Organize and manage your hierarchical tags</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Tag
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tags..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showUsageCount}
                onChange={(e) => setFilters(prev => ({ ...prev, showUsageCount: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show usage count</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.includeChildren}
                onChange={(e) => setFilters(prev => ({ ...prev, includeChildren: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Include children</span>
            </label>
          </div>
        </div>
      </div>

      {/* Selected Tags Actions */}
      {selectedTagIds.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedTagIds.length} tag{selectedTagIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const tag = tags.find(t => t.id === selectedTagIds[0])
                  if (tag) handleViewAnalytics(tag)
                }}
                disabled={selectedTagIds.length !== 1}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Analytics
              </button>
              <button
                onClick={() => setSelectedTagIds([])}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Tree */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4">
          <TagTree
            tags={tags}
            selectedTagIds={selectedTagIds}
            onTagSelect={handleTagSelect}
            onTagCreate={(parentId) => {
              setShowCreateForm(true)
              // You could set a default parent here if needed
            }}
            onTagEdit={setEditingTag}
            onTagDelete={handleDeleteTag}
            showActions={true}
            showUsageCount={filters.showUsageCount}
            expandedTagIds={expandedTagIds}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      </div>

      {/* Create Tag Form Modal */}
      {showCreateForm && (
        <TagForm
          availableTags={tags}
          onSubmit={handleCreateTag}
          onCancel={() => setShowCreateForm(false)}
          title="Create New Tag"
        />
      )}

      {/* Edit Tag Form Modal */}
      {editingTag && (
        <TagForm
          tag={editingTag}
          availableTags={tags}
          onSubmit={(data) => handleUpdateTag(editingTag.id, data)}
          onCancel={() => setEditingTag(null)}
          title="Edit Tag"
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && analyticsTagId && (
        <TagAnalytics
          tagId={analyticsTagId}
          onClose={() => {
            setShowAnalytics(false)
            setAnalyticsTagId(null)
          }}
        />
      )}
    </div>
  )
}

export default TagManager