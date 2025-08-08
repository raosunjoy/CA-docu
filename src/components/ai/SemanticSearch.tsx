'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface SearchResult {
  document: {
    id: string
    content: string
    metadata: {
      type: string
      category: string
      tags: string[]
      source: string
      authority?: string
      status: string
    }
  }
  similarity: number
  relevantSections?: string[]
  explanation?: string
}

interface SearchResponse {
  results: SearchResult[]
  query: string
  processingTime: number
  totalFound: number
  suggestions?: string[]
}

interface SearchFilters {
  type?: string
  authority?: string
  category?: string
  tags?: string[]
}

export function SemanticSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<SearchFilters>({})
  const [searchType, setSearchType] = useState<'general' | 'regulations' | 'procedures'>('general')

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const searchPayload = {
        query: query.trim(),
        filters: {
          ...(selectedFilters.type && { types: [selectedFilters.type] }),
          ...(selectedFilters.authority && { authorities: [selectedFilters.authority] }),
          ...(selectedFilters.category && { categories: [selectedFilters.category] }),
          ...(selectedFilters.tags && selectedFilters.tags.length > 0 && { tags: selectedFilters.tags }),
          organizationId: 'knowledge-base',
          status: ['ACTIVE']
        },
        limit: 8,
        threshold: 0.6
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload)
      })

      const data = await response.json()
      
      if (data.success) {
        setResults(data.data)
      } else {
        console.error('Search failed:', data.error)
      }
    } catch (error) {
      console.error('Search error:', error)
    }
    setLoading(false)
  }

  const handleSpecializedSearch = async (type: 'regulations' | 'procedures') => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        type,
        ...(selectedFilters.authority && { authority: selectedFilters.authority }),
        ...(selectedFilters.category && { category: selectedFilters.category })
      })

      const response = await fetch(`/api/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setResults(data.data)
        setSearchType(type)
      }
    } catch (error) {
      console.error('Specialized search error:', error)
    }
    setLoading(false)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'REGULATION': return '📋'
      case 'CASE_LAW': return '⚖️'
      case 'PROCEDURE': return '📋'
      case 'TEMPLATE': return '📄'
      case 'KNOWLEDGE_BASE': return '📚'
      default: return '📄'
    }
  }

  const getAuthorityBadge = (authority?: string) => {
    const colors = {
      'ICAI': 'bg-blue-100 text-blue-800',
      'CBDT': 'bg-green-100 text-green-800',
      'CBIC': 'bg-purple-100 text-purple-800',
      'MCA': 'bg-orange-100 text-orange-800'
    }
    
    return authority ? colors[authority as keyof typeof colors] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔍 AI-Powered Semantic Search
        </h1>
        <p className="text-gray-600">
          Search through CA regulations, procedures, and knowledge base using natural language
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex space-x-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask anything about CA regulations, GST compliance, Income Tax, Companies Act..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button 
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6"
            >
              {loading ? '⏳' : '🔍'} Search
            </Button>
          </div>

          {/* Filter Options */}
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedFilters.type || ''}
              onChange={(e) => setSelectedFilters({...selectedFilters, type: e.target.value || undefined})}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Types</option>
              <option value="REGULATION">Regulations</option>
              <option value="PROCEDURE">Procedures</option>
              <option value="CASE_LAW">Case Law</option>
              <option value="TEMPLATE">Templates</option>
            </select>

            <select
              value={selectedFilters.authority || ''}
              onChange={(e) => setSelectedFilters({...selectedFilters, authority: e.target.value || undefined})}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Authorities</option>
              <option value="ICAI">ICAI</option>
              <option value="CBDT">CBDT</option>
              <option value="CBIC">CBIC</option>
              <option value="MCA">MCA</option>
            </select>

            <select
              value={selectedFilters.category || ''}
              onChange={(e) => setSelectedFilters({...selectedFilters, category: e.target.value || undefined})}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Categories</option>
              <option value="Income Tax">Income Tax</option>
              <option value="GST">GST</option>
              <option value="Companies Act">Companies Act</option>
              <option value="Professional Standards">Professional Standards</option>
            </select>
          </div>

          {/* Specialized Search Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSpecializedSearch('regulations')}
              disabled={loading || !query.trim()}
            >
              📋 Search Regulations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSpecializedSearch('procedures')}
              disabled={loading || !query.trim()}
            >
              📋 Search Procedures
            </Button>
          </div>
        </div>

        {/* Sample Queries */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-2">Try these sample queries:</p>
          <div className="flex flex-wrap gap-2">
            {[
              "TDS on interest payments",
              "GST return filing deadlines",
              "Companies Act annual filing",
              "ICAI code of ethics",
              "Income tax penalties"
            ].map((sample, index) => (
              <button
                key={index}
                onClick={() => setQuery(sample)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Searching knowledge base...</p>
        </div>
      )}

      {/* Search Results */}
      {results && !loading && (
        <div className="space-y-4">
          {/* Results Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-blue-900">
                  Found {results.totalFound} results in {results.processingTime}ms
                </h3>
                <p className="text-blue-800 text-sm">Query: "{results.query}"</p>
              </div>
              <div className="text-right text-sm text-blue-600">
                Search Type: {searchType}
              </div>
            </div>
          </div>

          {/* Results List */}
          {results.results.map((result, index) => (
            <div key={result.document.id} className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTypeIcon(result.document.metadata.type)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {result.document.metadata.category}
                    </h3>
                    <p className="text-sm text-gray-600">{result.document.metadata.source}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${getAuthorityBadge(result.document.metadata.authority)}`}>
                    {result.document.metadata.authority || 'General'}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {(result.similarity * 100).toFixed(1)}% match
                  </span>
                </div>
              </div>

              {/* Relevant Sections */}
              {result.relevantSections && result.relevantSections.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">📍 Relevant Sections:</h4>
                  <div className="space-y-2">
                    {result.relevantSections.map((section, idx) => (
                      <div key={idx} className="bg-yellow-50 border-l-3 border-yellow-400 p-3">
                        <p className="text-sm text-gray-800">{section}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Preview */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">📄 Content Preview:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border-l-3 border-gray-300">
                  {result.document.content.substring(0, 300)}...
                </p>
              </div>

              {/* Tags and Metadata */}
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-1">
                  {result.document.metadata.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {result.explanation}
                </div>
              </div>
            </div>
          ))}

          {/* Search Suggestions */}
          {results.suggestions && results.suggestions.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h4 className="font-semibold text-gray-900 mb-3">💡 Related Suggestions:</h4>
              <div className="flex flex-wrap gap-2">
                {results.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(suggestion.replace('Search for "', '').replace('"', ''))
                      handleSearch()
                    }}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.totalFound === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No results found for your query.</p>
              <p className="text-sm text-gray-500">Try using different keywords or removing filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}