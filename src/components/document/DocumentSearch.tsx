'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  XMarkIcon,
  DocumentIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { DocumentType, DocumentStatus } from '@/types'

interface Document {
  id: string
  name: string
  originalName?: string
  type: DocumentType
  status: DocumentStatus
  fileSize: number
  uploadedAt: string
  uploader: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  folder?: {
    id: string
    name: string
    path: string
  }
  _count: {
    annotations: number
    comments: number
    shares: number
  }
}

interface SearchFilters {
  type?: DocumentType
  status?: DocumentStatus
  folderId?: string
  uploadedBy?: string
  dateFrom?: string
  dateTo?: string
  tags?: string[]
}

interface SearchStats {
  totalResults: number
  searchTime: number
  facets: {
    types: Array<{ type: DocumentType; _count: { type: number } }>
    uploaders: Array<{ uploadedBy: string; _count: { uploadedBy: number } }>
  }
}

interface DocumentSearchProps {
  onDocumentSelect?: (document: Document) => void
  onDocumentsSelect?: (documents: Document[]) => void
  enableMultiSelect?: boolean
  enableFilters?: boolean
  enableSorting?: boolean
  initialQuery?: string
  initialFilters?: SearchFilters
  className?: string
}

interface SearchState {
  query: string
  filters: SearchFilters
  sortBy: 'relevance' | 'name' | 'uploadedAt' | 'fileSize'
  sortOrder: 'asc' | 'desc'
  page: number
  limit: number
}

interface SearchResults {
  documents: Document[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: SearchStats
  loading: boolean
  error: string | null
}

export function DocumentSearch({
  onDocumentSelect,
  onDocumentsSelect,
  enableMultiSelect = false,
  enableFilters = true,
  enableSorting = true,
  initialQuery = '',
  initialFilters = {},
  className = ''
}: DocumentSearchProps) {
  const [searchState, setSearchState] = useState<SearchState>({
    query: initialQuery,
    filters: initialFilters,
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  })

  const [results, setResults] = useState<SearchResults>({
    documents: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    stats: { totalResults: 0, searchTime: 0, facets: { types: [], uploaders: [] } },
    loading: false,
    error: null
  })

  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced search function
  const performSearch = useCallback(async (searchParams: SearchState) => {
    if (!searchParams.query.trim()) {
      setResults(prev => ({
        ...prev,
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        stats: { totalResults: 0, searchTime: 0, facets: { types: [], uploaders: [] } }
      }))
      return
    }

    setResults(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        query: searchParams.query,
        page: searchParams.page.toString(),
        limit: searchParams.limit.toString(),
        sortBy: searchParams.sortBy,
        sortOrder: searchParams.sortOrder
      })

      // Add filters to params
      if (searchParams.filters.type) {
        params.set('type', searchParams.filters.type)
      }
      if (searchParams.filters.status) {
        params.set('status', searchParams.filters.status)
      }
      if (searchParams.filters.folderId) {
        params.set('folderId', searchParams.filters.folderId)
      }
      if (searchParams.filters.uploadedBy) {
        params.set('uploadedBy', searchParams.filters.uploadedBy)
      }
      if (searchParams.filters.dateFrom) {
        params.set('dateFrom', searchParams.filters.dateFrom)
      }
      if (searchParams.filters.dateTo) {
        params.set('dateTo', searchParams.filters.dateTo)
      }
      if (searchParams.filters.tags && searchParams.filters.tags.length > 0) {
        params.set('tags', searchParams.filters.tags.join(','))
      }

      const response = await fetch(`/api/documents/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setResults(prev => ({
          ...prev,
          documents: data.data.documents,
          pagination: data.data.pagination,
          stats: data.data.stats,
          loading: false
        }))
      } else {
        setResults(prev => ({
          ...prev,
          loading: false,
          error: data.error?.message || 'Search failed'
        }))
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }))
    }
  }, [])

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const params = new URLSearchParams({
        query,
        suggestions: 'true'
      })

      const response = await fetch(`/api/documents/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setSuggestions(data.data.suggestions)
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error)
    }
  }, [])

  // Handle search input change
  const handleQueryChange = useCallback((query: string) => {
    setSearchState(prev => ({ ...prev, query, page: 1 }))
    getSuggestions(query)
    setShowSuggestions(true)
  }, [getSuggestions])

  // Handle search submission
  const handleSearch = useCallback(() => {
    setShowSuggestions(false)
    performSearch(searchState)
  }, [searchState, performSearch])

  // Handle filter changes
  const handleFilterChange = useCallback((filterKey: keyof SearchFilters, value: any) => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, [filterKey]: value },
      page: 1
    }))
  }, [])

  // Handle sorting changes
  const handleSortChange = useCallback((sortBy: SearchState['sortBy'], sortOrder: SearchState['sortOrder']) => {
    setSearchState(prev => ({ ...prev, sortBy, sortOrder, page: 1 }))
  }, [])

  // Handle document selection
  const handleDocumentClick = useCallback((document: Document, event: React.MouseEvent) => {
    if (enableMultiSelect && (event.ctrlKey || event.metaKey)) {
      setSelectedDocuments(prev => {
        const newSet = new Set(prev)
        if (newSet.has(document.id)) {
          newSet.delete(document.id)
        } else {
          newSet.add(document.id)
        }
        
        if (onDocumentsSelect) {
          const selectedDocs = results.documents.filter(d => newSet.has(d.id))
          onDocumentsSelect(selectedDocs)
        }
        
        return newSet
      })
    } else {
      if (onDocumentSelect) {
        onDocumentSelect(document)
      }
    }
  }, [enableMultiSelect, onDocumentSelect, onDocumentsSelect, results.documents])

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setSearchState(prev => ({ ...prev, page }))
  }, [])

  // Auto-search when state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchState.query.trim()) {
        performSearch(searchState)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchState, performSearch])

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // Format date
  const formatDate = useCallback((dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      filters: {},
      page: 1
    }))
  }, [])

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(searchState.filters).filter(value => 
      value !== undefined && value !== null && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }, [searchState.filters])

  return (
    <div className={`document-search ${className}`}>
      {/* Search Header */}
      <div className="mb-6">
        <div className="relative">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchState.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false)
                }
              }}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              className="pl-10 pr-20"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {enableFilters && (
                <Button
                  size="sm"
                  variant={showFilters ? 'primary' : 'outline'}
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <FunnelIcon className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              )}
              <Button size="sm" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => {
                    handleQueryChange(suggestion)
                    handleSearch()
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {enableFilters && showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Filters</h3>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowFilters(false)}>
                <XMarkIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Document Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <select
                value={searchState.filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value={DocumentType.PDF}>PDF</option>
                <option value={DocumentType.WORD}>Word</option>
                <option value={DocumentType.EXCEL}>Excel</option>
                <option value={DocumentType.IMAGE}>Image</option>
                <option value={DocumentType.OTHER}>Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={searchState.filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value={DocumentStatus.DRAFT}>Draft</option>
                <option value={DocumentStatus.ACTIVE}>Active</option>
                <option value={DocumentStatus.ARCHIVED}>Archived</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Date From
              </label>
              <Input
                type="date"
                value={searchState.filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Date To
              </label>
              <Input
                type="date"
                value={searchState.filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Results Header */}
      {results.stats.totalResults > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              {results.stats.totalResults} results found
              {results.stats.searchTime > 0 && (
                <span className="ml-2">({results.stats.searchTime}ms)</span>
              )}
            </p>
            
            {enableMultiSelect && selectedDocuments.size > 0 && (
              <p className="text-sm text-blue-600">
                {selectedDocuments.size} documents selected
              </p>
            )}
          </div>

          {enableSorting && (
            <div className="flex items-center space-x-2">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
              <select
                value={`${searchState.sortBy}-${searchState.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [SearchState['sortBy'], SearchState['sortOrder']]
                  handleSortChange(sortBy, sortOrder)
                }}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="relevance-desc">Most Relevant</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="uploadedAt-desc">Newest First</option>
                <option value="uploadedAt-asc">Oldest First</option>
                <option value="fileSize-desc">Largest First</option>
                <option value="fileSize-asc">Smallest First</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {results.loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Searching documents...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {results.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-600">{results.error}</p>
        </div>
      )}

      {/* Search Results */}
      {!results.loading && !results.error && results.documents.length > 0 && (
        <div className="space-y-3">
          {results.documents.map(document => (
            <div
              key={document.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedDocuments.has(document.id)
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={(e) => handleDocumentClick(document, e)}
            >
              <div className="flex items-start space-x-3">
                <DocumentIcon className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {document.name}
                      </h4>
                      {document.originalName && document.originalName !== document.name && (
                        <p className="text-sm text-gray-500 truncate">
                          Original: {document.originalName}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 ml-4">
                      <span>{formatFileSize(document.fileSize)}</span>
                      <span className="capitalize">{document.type.toLowerCase()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <UserIcon className="w-4 h-4" />
                      <span>{document.uploader.firstName} {document.uploader.lastName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(document.uploadedAt)}</span>
                    </div>

                    {document.folder && (
                      <div className="flex items-center space-x-1">
                        <TagIcon className="w-4 h-4" />
                        <span>{document.folder.path}</span>
                      </div>
                    )}
                  </div>

                  {(document._count.annotations > 0 || document._count.comments > 0 || document._count.shares > 0) && (
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                      {document._count.annotations > 0 && (
                        <span>{document._count.annotations} annotations</span>
                      )}
                      {document._count.comments > 0 && (
                        <span>{document._count.comments} comments</span>
                      )}
                      {document._count.shares > 0 && (
                        <span>{document._count.shares} shares</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!results.loading && !results.error && searchState.query && results.documents.length === 0 && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search terms or filters
          </p>
          {activeFiltersCount > 0 && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {results.pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-600">
            Showing {((results.pagination.page - 1) * results.pagination.limit) + 1} to{' '}
            {Math.min(results.pagination.page * results.pagination.limit, results.pagination.total)} of{' '}
            {results.pagination.total} results
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(results.pagination.page - 1)}
              disabled={results.pagination.page <= 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, results.pagination.pages) }, (_, i) => {
                const page = i + 1
                return (
                  <Button
                    key={page}
                    size="sm"
                    variant={page === results.pagination.page ? 'primary' : 'outline'}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(results.pagination.page + 1)}
              disabled={results.pagination.page >= results.pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}