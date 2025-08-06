// Chat Search Component
// Provides search functionality across chat messages

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatMessageWithUser } from '../../lib/websocket-server'
import type { MessageType } from '../../types'

interface ChatSearchProps {
  onClose: () => void
  onMessageSelect: (message: ChatMessageWithUser) => void
  className?: string
}

interface SearchFilters {
  channelIds?: string[]
  userId?: string
  messageType?: MessageType[]
  startDate?: Date
  endDate?: Date
}

export function ChatSearch({ onClose, onMessageSelect, className = '' }: ChatSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatMessageWithUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        performSearch()
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, filters])

  const performSearch = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        query: query.trim(),
        limit: '50'
      })

      if (filters.channelIds && filters.channelIds.length > 0) {
        params.append('channelIds', filters.channelIds.join(','))
      }

      if (filters.userId) {
        params.append('userId', filters.userId)
      }

      if (filters.messageType && filters.messageType.length > 0) {
        params.append('messageType', filters.messageType.join(','))
      }

      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString())
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString())
      }

      const response = await fetch(`/api/chat/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const result = await response.json()
      if (result.success) {
        setResults(result.data)
      } else {
        throw new Error(result.error?.message || 'Search failed')
      }

    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Messages</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title="Filters"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707L9 19.414a1 1 0 01-.707.293H8a1 1 0 01-1-1v-6.586a1 1 0 00-.293-.707L.293 7.707A1 1 0 010 7V4z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg 
              className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              {/* Message Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Type
                </label>
                <select
                  value={filters.messageType?.[0] || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    messageType: e.target.value ? [e.target.value as MessageType] : undefined
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="TEXT">Text Messages</option>
                  <option value="FILE">Files</option>
                  <option value="TASK_REFERENCE">Task References</option>
                  <option value="EMAIL_REFERENCE">Document References</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  onChange={(e) => {
                    const value = e.target.value
                    const now = new Date()
                    let startDate: Date | undefined
                    
                    if (value === 'today') {
                      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    } else if (value === 'week') {
                      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    } else if (value === 'month') {
                      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                    }
                    
                    setFilters(prev => ({
                      ...prev,
                      startDate,
                      endDate: value ? now : undefined
                    }))
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                </select>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4">
              <button
                onClick={() => setFilters({})}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && query.trim() && results.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500">No messages found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search terms or filters</p>
            </div>
          )}

          {!loading && !error && !query.trim() && (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500">Start typing to search messages</p>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="divide-y divide-gray-200">
              {results.map(message => (
                <button
                  key={message.id}
                  onClick={() => onMessageSelect(message)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    {/* User Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {message.user.firstName[0]}{message.user.lastName[0]}
                      </span>
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.user.firstName} {message.user.lastName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </span>
                        {message.messageType !== 'TEXT' && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {message.messageType.toLowerCase().replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {highlightText(message.content, query)}
                      </p>
                    </div>

                    {/* Go to message icon */}
                    <div className="flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {results.length > 0 && `${results.length} result${results.length === 1 ? '' : 's'} found`}
            </span>
            <span>
              Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}