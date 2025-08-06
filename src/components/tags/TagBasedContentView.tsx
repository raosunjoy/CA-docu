'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  DocumentIcon, 
  TaskIcon, 
  EnvelopeIcon, 
  ChatBubbleLeftIcon,
  FolderIcon,
  ClockIcon,
  UserIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import type { TagWithChildren } from '@/lib/tag-service'

interface TagBasedContentViewProps {
  selectedTags: TagWithChildren[]
  layout: 'grid' | 'list' | 'kanban'
  organizationId: string
}

interface ContentItem {
  id: string
  type: 'task' | 'document' | 'email' | 'chat_channel'
  title: string
  description?: string
  status?: string
  priority?: string
  assignedTo?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
  tags: string[]
  metadata: Record<string, any>
}

const CONTENT_TYPE_ICONS = {
  task: TaskIcon,
  document: DocumentIcon,
  email: EnvelopeIcon,
  chat_channel: ChatBubbleLeftIcon
}

const CONTENT_TYPE_COLORS = {
  task: 'bg-blue-100 text-blue-800 border-blue-200',
  document: 'bg-green-100 text-green-800 border-green-200',
  email: 'bg-purple-100 text-purple-800 border-purple-200',
  chat_channel: 'bg-orange-100 text-orange-800 border-orange-200'
}

const STATUS_COLORS = {
  TODO: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
}

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
}

interface ContentItemCardProps {
  item: ContentItem
  layout: 'grid' | 'list' | 'kanban'
  onView: (item: ContentItem) => void
  onEdit: (item: ContentItem) => void
}

const ContentItemCard: React.FC<ContentItemCardProps> = ({
  item,
  layout,
  onView,
  onEdit
}) => {
  const IconComponent = CONTENT_TYPE_ICONS[item.type]
  const typeColor = CONTENT_TYPE_COLORS[item.type]
  const statusColor = item.status ? STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] : ''
  const priorityColor = item.priority ? PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS] : ''

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date))
  }

  const cardClasses = {
    grid: 'p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all',
    list: 'p-4 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors',
    kanban: 'p-3 bg-white border border-gray-200 rounded-md shadow-sm hover:shadow-md transition-all mb-3'
  }

  return (
    <div className={cardClasses[layout]}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <IconComponent className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${typeColor}`}>
            {item.type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onView(item)}
            className="p-1 text-gray-400 hover:text-blue-600 rounded"
            title="View"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-gray-400 hover:text-blue-600 rounded"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {item.title}
      </h3>

      {/* Description */}
      {item.description && layout !== 'kanban' && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {item.description}
        </p>
      )}

      {/* Status and Priority */}
      <div className="flex items-center space-x-2 mb-3">
        {item.status && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor}`}>
            {item.status.replace('_', ' ')}
          </span>
        )}
        {item.priority && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColor}`}>
            {item.priority}
          </span>
        )}
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, layout === 'kanban' ? 2 : 4).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > (layout === 'kanban' ? 2 : 4) && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
              +{item.tags.length - (layout === 'kanban' ? 2 : 4)}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-3 h-3" />
          <span>{formatDate(item.createdAt)}</span>
        </div>
        {item.assignedTo && (
          <div className="flex items-center space-x-1">
            <UserIcon className="w-3 h-3" />
            <span>{item.assignedTo}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export const TagBasedContentView: React.FC<TagBasedContentViewProps> = ({
  selectedTags,
  layout,
  organizationId
}) => {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'type' | 'status' | 'priority' | 'assignedTo'>('type')

  // Load content based on selected tags
  const loadContent = useCallback(async () => {
    if (selectedTags.length === 0) {
      setContent([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // This would make API calls to get content for each tag
      // For now, we'll simulate with mock data
      const mockContent: ContentItem[] = [
        {
          id: '1',
          type: 'task',
          title: 'Complete audit documentation',
          description: 'Finalize all audit documentation for Q4 review',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          assignedTo: 'John Doe',
          createdBy: 'Jane Smith',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          tags: selectedTags.map(t => t.name),
          metadata: {}
        },
        {
          id: '2',
          type: 'document',
          title: 'Financial Statements Q4.pdf',
          description: 'Quarterly financial statements',
          assignedTo: 'Alice Johnson',
          createdBy: 'Bob Wilson',
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-18'),
          tags: selectedTags.map(t => t.name),
          metadata: {}
        },
        {
          id: '3',
          type: 'email',
          title: 'Client meeting follow-up',
          description: 'Follow-up email regarding audit findings',
          createdBy: 'Sarah Davis',
          createdAt: new Date('2024-01-12'),
          updatedAt: new Date('2024-01-12'),
          tags: selectedTags.map(t => t.name),
          metadata: {}
        }
      ]

      setContent(mockContent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [selectedTags])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleViewItem = useCallback((item: ContentItem) => {
    console.log('View item:', item)
    // Navigate to item detail view
  }, [])

  const handleEditItem = useCallback((item: ContentItem) => {
    console.log('Edit item:', item)
    // Open item edit modal/page
  }, [])

  // Group content for kanban view
  const groupedContent = useCallback(() => {
    if (layout !== 'kanban') return { 'All Content': content }

    const groups: Record<string, ContentItem[]> = {}

    content.forEach(item => {
      let groupKey = 'Other'
      
      switch (groupBy) {
        case 'type':
          groupKey = item.type.replace('_', ' ').toUpperCase()
          break
        case 'status':
          groupKey = item.status || 'No Status'
          break
        case 'priority':
          groupKey = item.priority || 'No Priority'
          break
        case 'assignedTo':
          groupKey = item.assignedTo || 'Unassigned'
          break
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
    })

    return groups
  }, [content, layout, groupBy])

  if (selectedTags.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FolderIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tags selected
          </h3>
          <p className="text-gray-600">
            Select one or more tags from the sidebar to view related content
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={loadContent}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const groups = groupedContent()

  return (
    <div className="flex-1 overflow-hidden">
      {/* Content Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Content ({content.length} items)
            </h3>
            <p className="text-sm text-gray-600">
              Showing content tagged with: {selectedTags.map(t => t.name).join(', ')}
            </p>
          </div>

          {layout === 'kanban' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="type">Type</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
                <option value="assignedTo">Assigned To</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {content.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No content found
            </h3>
            <p className="text-gray-600">
              No content is tagged with the selected tags
            </p>
          </div>
        ) : (
          <>
            {/* Grid Layout */}
            {layout === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {content.map(item => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    layout={layout}
                    onView={handleViewItem}
                    onEdit={handleEditItem}
                  />
                ))}
              </div>
            )}

            {/* List Layout */}
            {layout === 'list' && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {content.map(item => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    layout={layout}
                    onView={handleViewItem}
                    onEdit={handleEditItem}
                  />
                ))}
              </div>
            )}

            {/* Kanban Layout */}
            {layout === 'kanban' && (
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {Object.entries(groups).map(([groupName, items]) => (
                  <div key={groupName} className="flex-shrink-0 w-80">
                    <div className="bg-gray-100 rounded-lg p-3 mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">
                        {groupName}
                      </h4>
                      <span className="text-sm text-gray-600">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {items.map(item => (
                        <ContentItemCard
                          key={item.id}
                          item={item}
                          layout={layout}
                          onView={handleViewItem}
                          onEdit={handleEditItem}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TagBasedContentView