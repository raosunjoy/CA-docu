'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  TagIcon, 
  ViewColumnsIcon, 
  ListBulletIcon,
  ChartBarIcon,
  FunnelIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { TagTree } from './TagTree'
import { TagSelector } from './TagSelector'
import { TagBasedContentView } from './TagBasedContentView'
import { TagBasedReports } from './TagBasedReports'
import { useTags } from '@/hooks/useTags'
import type { TagWithChildren } from '@/lib/tag-service'

interface TagBasedDashboardProps {
  organizationId: string
  className?: string
}

type ViewMode = 'content' | 'reports' | 'management'
type ContentLayout = 'grid' | 'list' | 'kanban'

export const TagBasedDashboard: React.FC<TagBasedDashboardProps> = ({
  organizationId,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('content')
  const [contentLayout, setContentLayout] = useState<ContentLayout>('grid')
  const [selectedTags, setSelectedTags] = useState<TagWithChildren[]>([])
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([])

  const {
    tags,
    loading: tagsLoading,
    error: tagsError,
    loadTags,
    createTag,
    updateTag,
    deleteTag
  } = useTags({
    organizationId,
    includeChildren: true,
    includeUsage: true
  })

  // Handle tag selection from tree
  const handleTagSelect = useCallback((tagId: string, selected: boolean) => {
    const tag = tags.find(t => t.id === tagId)
    if (!tag) return

    if (selected) {
      if (!selectedTags.find(t => t.id === tagId)) {
        setSelectedTags(prev => [...prev, tag])
      }
    } else {
      setSelectedTags(prev => prev.filter(t => t.id !== tagId))
    }
  }, [tags, selectedTags])

  // Handle tag expansion
  const handleToggleExpand = useCallback((tagId: string) => {
    setExpandedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }, [])

  // Handle tag creation
  const handleCreateTag = useCallback(async (parentId?: string) => {
    try {
      await createTag({
        name: 'New Tag',
        parentId,
        color: '#6B7280'
      })
    } catch (error) {
      console.error('Failed to create tag:', error)
    }
  }, [createTag])

  // Handle tag editing
  const handleEditTag = useCallback(async (tag: TagWithChildren) => {
    // This would open a tag edit modal
    console.log('Edit tag:', tag)
  }, [])

  // Handle tag deletion
  const handleDeleteTag = useCallback(async (tag: TagWithChildren) => {
    if (confirm(`Are you sure you want to delete "${tag.name}"?`)) {
      try {
        await deleteTag(tag.id)
        // Remove from selected tags if it was selected
        setSelectedTags(prev => prev.filter(t => t.id !== tag.id))
      } catch (error) {
        console.error('Failed to delete tag:', error)
      }
    }
  }, [deleteTag])

  const selectedTagIds = selectedTags.map(t => t.id)

  if (tagsLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (tagsError) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-red-600 mb-4">{tagsError}</div>
        <button
          onClick={() => loadTags()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`h-full flex ${className}`}>
      {/* Sidebar - Tag Tree */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <TagIcon className="w-5 h-5 mr-2" />
              Tags
            </h2>
            <button
              onClick={() => handleCreateTag()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              title="Create new tag"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Tag Selector */}
          <div className="mb-4">
            <TagSelector
              selectedTags={selectedTags}
              availableTags={tags}
              onTagsChange={setSelectedTags}
              placeholder="Select tags to filter content..."
              allowCreate={true}
              onCreateTag={(name, parentId) => createTag({ name, parentId })}
              className="w-full"
            />
          </div>

          {/* Selected Tags Summary */}
          {selectedTags.length > 0 && (
            <div className="text-sm text-gray-600">
              Filtering by {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Tag Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          <TagTree
            tags={tags}
            selectedTagIds={selectedTagIds}
            onTagSelect={handleTagSelect}
            onTagCreate={handleCreateTag}
            onTagEdit={handleEditTag}
            onTagDelete={handleDeleteTag}
            showActions={true}
            showUsageCount={true}
            expandedTagIds={expandedTagIds}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tag-Based Organization
              </h1>
              <p className="text-gray-600">
                {selectedTags.length > 0 
                  ? `Content filtered by: ${selectedTags.map(t => t.name).join(', ')}`
                  : 'Select tags to filter and organize content'
                }
              </p>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-4">
              {/* View Mode Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('content')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'content'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => setViewMode('reports')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'reports'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Reports
                </button>
                <button
                  onClick={() => setViewMode('management')}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'management'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Management
                </button>
              </div>

              {/* Layout Selector (for content view) */}
              {viewMode === 'content' && (
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setContentLayout('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      contentLayout === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Grid view"
                  >
                    <ViewColumnsIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setContentLayout('list')}
                    className={`p-2 rounded-md transition-colors ${
                      contentLayout === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="List view"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setContentLayout('kanban')}
                    className={`p-2 rounded-md transition-colors ${
                      contentLayout === 'kanban'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Kanban view"
                  >
                    <FunnelIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'content' && (
            <TagBasedContentView
              selectedTags={selectedTags}
              layout={contentLayout}
              organizationId={organizationId}
            />
          )}

          {viewMode === 'reports' && (
            <TagBasedReports
              selectedTags={selectedTags}
              organizationId={organizationId}
            />
          )}

          {viewMode === 'management' && (
            <div className="p-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Tag Management
                </h3>
                <p className="text-gray-600">
                  Advanced tag management features will be implemented here, including:
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li>• Bulk tag operations</li>
                  <li>• Tag templates and policies</li>
                  <li>• Tag validation rules</li>
                  <li>• Tag usage analytics</li>
                  <li>• Tag cleanup and optimization</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TagBasedDashboard