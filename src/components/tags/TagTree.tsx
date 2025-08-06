'use client'

import React, { useState, useCallback } from 'react'
import { ChevronRightIcon, ChevronDownIcon, TagIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { TagWithChildren } from '@/lib/tag-service'

interface TagTreeProps {
  tags: TagWithChildren[]
  selectedTagIds?: string[]
  onTagSelect?: (tagId: string, selected: boolean) => void
  onTagCreate?: (parentId?: string) => void
  onTagEdit?: (tag: TagWithChildren) => void
  onTagDelete?: (tag: TagWithChildren) => void
  showActions?: boolean
  showUsageCount?: boolean
  expandedTagIds?: string[]
  onToggleExpand?: (tagId: string) => void
  className?: string
}

interface TagNodeProps {
  tag: TagWithChildren
  level: number
  selectedTagIds?: string[]
  onTagSelect?: (tagId: string, selected: boolean) => void
  onTagCreate?: (parentId?: string) => void
  onTagEdit?: (tag: TagWithChildren) => void
  onTagDelete?: (tag: TagWithChildren) => void
  showActions?: boolean
  showUsageCount?: boolean
  isExpanded: boolean
  onToggleExpand: (tagId: string) => void
}

const TagNode: React.FC<TagNodeProps> = ({
  tag,
  level,
  selectedTagIds = [],
  onTagSelect,
  onTagCreate,
  onTagEdit,
  onTagDelete,
  showActions = false,
  showUsageCount = false,
  isExpanded,
  onToggleExpand
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const hasChildren = tag.children && tag.children.length > 0
  const isSelected = selectedTagIds.includes(tag.id)
  const usageCount = tag._count?.taggings || 0

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren) {
      onToggleExpand(tag.id)
    }
  }, [hasChildren, onToggleExpand, tag.id])

  const handleTagClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onTagSelect) {
      onTagSelect(tag.id, !isSelected)
    }
  }, [onTagSelect, tag.id, isSelected])

  const handleCreateChild = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onTagCreate) {
      onTagCreate(tag.id)
    }
  }, [onTagCreate, tag.id])

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onTagEdit) {
      onTagEdit(tag)
    }
  }, [onTagEdit, tag])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onTagDelete) {
      onTagDelete(tag)
    }
  }, [onTagDelete, tag])

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}
          ${level > 0 ? 'ml-' + (level * 4) : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleTagClick}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={handleToggleExpand}
          className={`
            flex-shrink-0 w-4 h-4 mr-1 flex items-center justify-center
            ${hasChildren ? 'text-gray-500 hover:text-gray-700' : 'invisible'}
          `}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDownIcon className="w-3 h-3" />
            ) : (
              <ChevronRightIcon className="w-3 h-3" />
            )
          )}
        </button>

        {/* Tag Icon */}
        <TagIcon className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />

        {/* Tag Color Indicator */}
        {tag.color && (
          <div
            className="w-3 h-3 rounded-full mr-2 flex-shrink-0 border border-gray-300"
            style={{ backgroundColor: tag.color }}
          />
        )}

        {/* Tag Name */}
        <span className="flex-1 text-sm font-medium truncate">
          {tag.name}
        </span>

        {/* Usage Count */}
        {showUsageCount && usageCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
            {usageCount}
          </span>
        )}

        {/* Actions */}
        {showActions && isHovered && (
          <div className="ml-2 flex items-center space-x-1">
            <button
              onClick={handleCreateChild}
              className="p-1 text-gray-400 hover:text-green-600 rounded"
              title="Add child tag"
            >
              <PlusIcon className="w-3 h-3" />
            </button>
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="Edit tag"
            >
              <PencilIcon className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete tag"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {tag.children.map((child) => (
            <TagNode
              key={child.id}
              tag={child}
              level={level + 1}
              selectedTagIds={selectedTagIds}
              onTagSelect={onTagSelect}
              onTagCreate={onTagCreate}
              onTagEdit={onTagEdit}
              onTagDelete={onTagDelete}
              showActions={showActions}
              showUsageCount={showUsageCount}
              isExpanded={false} // Child expansion would need to be managed separately
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const TagTree: React.FC<TagTreeProps> = ({
  tags,
  selectedTagIds = [],
  onTagSelect,
  onTagCreate,
  onTagEdit,
  onTagDelete,
  showActions = false,
  showUsageCount = false,
  expandedTagIds = [],
  onToggleExpand,
  className = ''
}) => {
  const [internalExpandedIds, setInternalExpandedIds] = useState<string[]>([])

  const handleToggleExpand = useCallback((tagId: string) => {
    if (onToggleExpand) {
      onToggleExpand(tagId)
    } else {
      setInternalExpandedIds(prev => 
        prev.includes(tagId)
          ? prev.filter(id => id !== tagId)
          : [...prev, tagId]
      )
    }
  }, [onToggleExpand])

  const effectiveExpandedIds = onToggleExpand ? expandedTagIds : internalExpandedIds

  if (tags.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <TagIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm">No tags found</p>
        {onTagCreate && (
          <button
            onClick={() => onTagCreate()}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Create your first tag
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {tags.map((tag) => (
        <TagNode
          key={tag.id}
          tag={tag}
          level={0}
          selectedTagIds={selectedTagIds}
          onTagSelect={onTagSelect}
          onTagCreate={onTagCreate}
          onTagEdit={onTagEdit}
          onTagDelete={onTagDelete}
          showActions={showActions}
          showUsageCount={showUsageCount}
          isExpanded={effectiveExpandedIds.includes(tag.id)}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  )
}

export default TagTree