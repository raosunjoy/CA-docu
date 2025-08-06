'use client'

import React from 'react'
import { MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline'

interface SearchSuggestionsProps {
  query: string
  suggestions: string[]
  recentSearches: string[]
  onSelect: (suggestion: string) => void
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  suggestions,
  recentSearches,
  onSelect
}) => {
  const filteredRecentSearches = recentSearches.filter(search => 
    search.toLowerCase().includes(query.toLowerCase()) && search !== query
  )

  const hasContent = suggestions.length > 0 || filteredRecentSearches.length > 0

  if (!hasContent) {
    return (
      <div className="p-4 text-center text-gray-500">
        <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Start typing to see suggestions</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* Auto-complete Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
            Suggestions
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-sm"
            >
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1">
                {suggestion.split(new RegExp(`(${query})`, 'gi')).map((part, i) => (
                  <span
                    key={i}
                    className={part.toLowerCase() === query.toLowerCase() ? 'font-semibold text-blue-600' : ''}
                  >
                    {part}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Recent Searches */}
      {filteredRecentSearches.length > 0 && (
        <div>
          {suggestions.length > 0 && (
            <div className="border-t border-gray-100" />
          )}
          <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
            Recent Searches
          </div>
          {filteredRecentSearches.slice(0, 5).map((search, index) => (
            <button
              key={index}
              onClick={() => onSelect(search)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 text-sm"
            >
              <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="flex-1">
                {search.split(new RegExp(`(${query})`, 'gi')).map((part, i) => (
                  <span
                    key={i}
                    className={part.toLowerCase() === query.toLowerCase() ? 'font-semibold text-blue-600' : ''}
                  >
                    {part}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchSuggestions