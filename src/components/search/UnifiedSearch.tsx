'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon,
  ClockIcon,
  DocumentIcon,
  TaskIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import { SearchSuggestions } from './SearchSuggestions'
import type { ElasticSearchResponse, SearchFilters as SearchFiltersType } from '@/lib/elasticsearch-service'

interface UnifiedSearchProps {
  placeholder?: string
  autoFocus?: boolean
  showFilters?: boolean
  defaultFilters?: Partial<SearchFiltersType>
  onResultSelect?: (result: any) => void
  className?: string
}

const CONTENT_TYPE_ICONS = {
  task: TaskIcon,
  document: DocumentIcon,
  email: EnvelopeIcon,
  chat_channel: ChatBubbleLeftIcon,
  chat_message: ChatBubbleLeftIcon
}

const CONTENT_TYPE_LABELS = {
  task: 'Tasks',
  document: 'Documents',
  email: 'Emails',
  chat_channel: 'Channels',
  chat_message: 'Messages'
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  placeholder = 'Search across all content...',
  autoFocus = false,
  showFilters = true,
  defaultFilters = {},
  onResultSelect,
  className = ''
}) => {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<ElasticSearchResponse | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [filters, setFilters] = useState<Partial<SearchFiltersType>>(defaultFilters)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout>()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zetra-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load recent searches:', error)
      }
    }
  }, [])

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string, searchFilters: Partial<SearchFiltersType> = {}) => {
    if (!searchQuery.trim()) {
      setResults(null)
      return
    }

    setIsSearching(true)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: '1',
        limit: '20',
        highlight: 'true',
        facets: 'true'
      })

      // Add filters to params
      if (searchFilters.types?.length) {
        params.append('types', searchFilters.types.join(','))
      }
      if (searchFilters.tags?.length) {
        params.append('tags', searchFilters.tags.join(','))
      }
      if (searchFilters.status?.length) {
        params.append('status', searchFilters.status.join(','))
      }
      if (searchFilters.priority?.length) {
        params.append('priority', searchFilters.priority.join(','))
      }
      if (searchFilters.createdBy?.length) {
        params.append('createdBy', searchFilters.createdBy.join(','))
      }
      if (searchFilters.assignedTo?.length) {
        params.append('assignedTo', searchFilters.assignedTo.join(','))
      }
      if (searchFilters.dateRange) {
        params.append('startDate', searchFilters.dateRange.start.toISOString())
        params.append('endDate', searchFilters.dateRange.end.toISOString())
      }

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.data)
        
        // Save to recent searches
        const newRecentSearches = [
          searchQuery,
          ...recentSearches.filter(s => s !== searchQuery)
        ].slice(0, 10)
        
        setRecentSearches(newRecentSearches)
        localStorage.setItem('zetra-recent-searches', JSON.stringify(newRecentSearches))
      } else {
        console.error('Search failed:', data.error)
        setResults(null)
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [recentSearches])

  // Load suggestions
  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=5`)
      const data = await response.json()

      if (data.success) {
        setSuggestions(data.data.suggestions)
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }, [])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    // Clear existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current)
    }

    if (value.trim()) {
      // Show suggestions immediately
      setShowSuggestions(true)
      
      // Load suggestions after short delay
      suggestionsTimeoutRef.current = setTimeout(() => {
        loadSuggestions(value)
      }, 200)

      // Perform search after longer delay
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value, filters)
      }, 500)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
      setResults(null)
    }
  }, [filters, performSearch, loadSuggestions])

  // Handle search submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      performSearch(query, filters)
    }
  }, [query, filters, performSearch])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    performSearch(suggestion, filters)
  }, [filters, performSearch])

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: Partial<SearchFiltersType>) => {
    setFilters(newFilters)
    if (query.trim()) {
      performSearch(query, newFilters)
    }
  }, [query, performSearch])

  // Handle clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setResults(null)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasActiveFilters = Object.values(filters).some(value => 
    Array.isArray(value) ? value.length > 0 : value !== undefined
  )

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim() && suggestions.length > 0) {
                setShowSuggestions(true)
              }
            }}
            placeholder={placeholder}
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
          
          {/* Action Buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
            
            {showFilters && (
              <button
                type="button"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`p-2 rounded-md transition-colors ${
                  hasActiveFilters || showFiltersPanel
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <FunnelIcon className="w-4 h-4" />
              </button>
            )}
            
            {isSearching && (
              <div className="p-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && (query.trim() || recentSearches.length > 0) && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
            <SearchSuggestions
              query={query}
              suggestions={suggestions}
              recentSearches={recentSearches}
              onSelect={handleSuggestionSelect}
            />
          </div>
        )}
      </form>

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <SearchFilters
            filters={filters}
            onChange={handleFiltersChange}
            onClose={() => setShowFiltersPanel(false)}
          />
        </div>
      )}

      {/* Search Results */}
      {results && (
        <div className="mt-6">
          <SearchResults
            results={results}
            query={query}
            onResultSelect={onResultSelect}
            onLoadMore={(page) => {
              // Implement pagination
              console.log('Load more:', page)
            }}
          />
        </div>
      )}

      {/* No Results */}
      {results && results.results.length === 0 && (
        <div className="mt-6 text-center py-12">
          <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search terms or filters
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({})
                if (query.trim()) {
                  performSearch(query, {})
                }
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default UnifiedSearch