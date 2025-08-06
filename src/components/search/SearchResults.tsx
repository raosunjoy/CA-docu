'use client'

import React, { useState, useCallback } from 'react'
import { 
  DocumentIcon, 
  TaskIcon, 
  EnvelopeIcon, 
  ChatBubbleLeftIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import type { ElasticSearchResponse, SearchResult } from '@/lib/elasticsearch-service'

interface SearchResultsProps {
  results: ElasticSearchResponse
  query: string
  onResultSelect?: (result: SearchResult) => void
  onLoadMore?: (page: number) => void
}

const CONTENT_TYPE_ICONS = {
  task: TaskIcon,
  document: DocumentIcon,
  email: EnvelopeIcon,
  chat_channel: ChatBubbleLeftIcon,
  chat_message: ChatBubbleLeftIcon
}

const CONTENT_TYPE_LABELS = {
  task: 'Task',
  document: 'Document',
  email: 'Email',
  chat_channel: 'Channel',
  chat_message: 'Message'
}

const CONTENT_TYPE_COLORS = {
  task: 'bg-blue-100 text-blue-800',
  document: 'bg-green-100 text-green-800',
  email: 'bg-purple-100 text-purple-800',
  chat_channel: 'bg-orange-100 text-orange-800',
  chat_message: 'bg-orange-100 text-orange-800'
}

interface SearchResultItemProps {
  result: SearchResult
  query: string
  onSelect?: (result: SearchResult) => void
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  query,
  onSelect
}) => {
  const IconComponent = CONTENT_TYPE_ICONS[result.type as keyof typeof CONTENT_TYPE_ICONS]
  const typeLabel = CONTENT_TYPE_LABELS[result.type as keyof typeof CONTENT_TYPE_LABELS]
  const typeColor = CONTENT_TYPE_COLORS[result.type as keyof typeof CONTENT_TYPE_COLORS]

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(result)
    }
  }, [result, onSelect])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getHighlightedContent = (field: string) => {
    if (result.highlights && result.highlights[field]) {
      return result.highlights[field].join(' ... ')
    }
    return field === 'title' ? result.title : result.content
  }

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div
      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <IconComponent className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor}`}>
            {typeLabel}
          </span>
          <span className="text-xs text-gray-500">
            Score: {result.score.toFixed(2)}
          </span>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-400" />
      </div>

      {/* Title */}
      <h3 
        className="text-lg font-medium text-gray-900 mb-2 leading-tight"
        dangerouslySetInnerHTML={{ 
          __html: getHighlightedContent('title') || 'Untitled'
        }}
      />

      {/* Content Preview */}
      {result.content && (
        <div 
          className="text-sm text-gray-600 mb-3 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: truncateContent(getHighlightedContent('content'))
          }}
        />
      )}

      {/* Tags */}
      {result.tags && result.tags.length > 0 && (
        <div className="flex items-center space-x-1 mb-3">
          <TagIcon className="w-4 h-4 text-gray-400" />
          <div className="flex flex-wrap gap-1">
            {result.tags.slice(0, 5).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
              >
                {tag}
              </span>
            ))}
            {result.tags.length > 5 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md">
                +{result.tags.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <ClockIcon className="w-3 h-3" />
            <span>Created {formatDate(result.createdAt)}</span>
          </div>
          {result.metadata?.assignedTo && (
            <div className="flex items-center space-x-1">
              <UserIcon className="w-3 h-3" />
              <span>Assigned to {result.metadata.assignedTo}</span>
            </div>
          )}
          {result.metadata?.status && (
            <span className="px-2 py-1 bg-gray-100 rounded-md">
              {result.metadata.status}
            </span>
          )}
          {result.metadata?.priority && (
            <span className={`px-2 py-1 rounded-md ${
              result.metadata.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
              result.metadata.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
              result.metadata.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {result.metadata.priority}
            </span>
          )}
        </div>
        
        {result.updatedAt !== result.createdAt && (
          <span>Updated {formatDate(result.updatedAt)}</span>
        )}
      </div>
    </div>
  )
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  onResultSelect,
  onLoadMore
}) => {
  const [currentPage, setCurrentPage] = useState(results.page)

  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    if (onLoadMore) {
      onLoadMore(nextPage)
    }
  }, [currentPage, onLoadMore])

  const formatSearchTime = (took: number) => {
    return took < 1000 ? `${took}ms` : `${(took / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Search Results
          </h2>
          <p className="text-sm text-gray-600">
            {results.total.toLocaleString()} results for "{query}" 
            <span className="ml-2 text-gray-400">
              ({formatSearchTime(results.took)})
            </span>
          </p>
        </div>
      </div>

      {/* Facets */}
      {results.facets && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Filter by:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(results.facets).map(([facetName, facetValues]) => (
              <div key={facetName}>
                <h4 className="text-xs font-medium text-gray-700 mb-2 capitalize">
                  {facetName.replace('_', ' ')}
                </h4>
                <div className="space-y-1">
                  {facetValues.slice(0, 5).map((facet) => (
                    <button
                      key={facet.value}
                      className="block text-xs text-blue-600 hover:text-blue-800"
                    >
                      {facet.value} ({facet.count})
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.results.map((result) => (
          <SearchResultItem
            key={`${result.type}_${result.id}`}
            result={result}
            query={query}
            onSelect={onResultSelect}
          />
        ))}
      </div>

      {/* Load More */}
      {results.results.length < results.total && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Load More Results
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Showing {results.results.length} of {results.total.toLocaleString()} results
          </p>
        </div>
      )}
    </div>
  )
}

export default SearchResults