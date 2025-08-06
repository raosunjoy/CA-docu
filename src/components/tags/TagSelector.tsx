'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TagIcon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { TagTree } from './TagTree'
import type { TagWithChildren, TagSuggestion } from '@/lib/tag-service'

interface TagSelectorProps {
  selectedTags: TagWithChildren[]
  availableTags: TagWithChildren[]
  suggestions?: TagSuggestion[]
  onTagsChange: (tags: TagWithChildren[]) => void
  onLoadSuggestions?: (content: string) => void
  placeholder?: string
  maxTags?: number
  allowCreate?: boolean
  onCreateTag?: (name: string, parentId?: string) => void
  className?: string
  disabled?: boolean
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  availableTags,
  suggestions = [],
  onTagsChange,
  onLoadSuggestions,
  placeholder = 'Search and select tags...',
  maxTags,
  allowCreate = false,
  onCreateTag,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTags, setFilteredTags] = useState<TagWithChildren[]>(availableTags)
  const [expandedTagIds, setExpandedTagIds] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter tags based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags(availableTags)
      setShowSuggestions(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = availableTags.filter(tag =>
      tag.name.toLowerCase().includes(query) ||
      tag.description?.toLowerCase().includes(query)
    )

    setFilteredTags(filtered)
    setShowSuggestions(suggestions.length > 0)

    // Load suggestions if callback provided
    if (onLoadSuggestions && query.length > 2) {
      onLoadSuggestions(searchQuery)
    }
  }, [searchQuery, availableTags, suggestions.length, onLoadSuggestions])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTagSelect = useCallback((tagId: string, selected: boolean) => {
    const tag = availableTags.find(t => t.id === tagId)
    if (!tag) return

    if (selected) {
      // Check max tags limit
      if (maxTags && selectedTags.length >= maxTags) {
        return
      }

      // Add tag if not already selected
      if (!selectedTags.find(t => t.id === tagId)) {
        onTagsChange([...selectedTags, tag])
      }
    } else {
      // Remove tag
      onTagsChange(selectedTags.filter(t => t.id !== tagId))
    }
  }, [availableTags, selectedTags, maxTags, onTagsChange])

  const handleSuggestionSelect = useCallback((suggestion: TagSuggestion) => {
    handleTagSelect(suggestion.tag.id, true)
    setSearchQuery('')
    setShowSuggestions(false)
  }, [handleTagSelect])

  const handleRemoveTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(t => t.id !== tagId))
  }, [selectedTags, onTagsChange])

  const handleCreateTag = useCallback(() => {
    if (allowCreate && onCreateTag && searchQuery.trim()) {
      onCreateTag(searchQuery.trim())
      setSearchQuery('')
    }
  }, [allowCreate, onCreateTag, searchQuery])

  const handleToggleExpand = useCallback((tagId: string) => {
    setExpandedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }, [])

  const selectedTagIds = selectedTags.map(t => t.id)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
            >
              {tag.color && (
                <div
                  className="w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: tag.color }}
                />
              )}
              <span>{tag.name}</span>
              {!disabled && (
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  className="ml-1.5 text-blue-600 hover:text-blue-800"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div
          className={`
            flex items-center w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-text'}
            ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'hover:border-gray-400'}
          `}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true)
              inputRef.current?.focus()
            }
          }}
        >
          <TagIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 outline-none bg-transparent text-sm"
          />
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="border-b border-gray-200">
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50">
                    Suggestions
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag.id}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        {suggestion.tag.color && (
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: suggestion.tag.color }}
                          />
                        )}
                        <span className="text-sm">{suggestion.tag.name}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="mr-1">{Math.round(suggestion.confidence * 100)}%</span>
                        <span className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                          {suggestion.source}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Create New Tag Option */}
              {allowCreate && searchQuery.trim() && !filteredTags.some(t => 
                t.name.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <div className="border-b border-gray-200">
                  <button
                    onClick={handleCreateTag}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center text-blue-600"
                  >
                    <TagIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm">Create "{searchQuery}"</span>
                  </button>
                </div>
              )}

              {/* Tag Tree */}
              {filteredTags.length > 0 ? (
                <div className="p-2">
                  <TagTree
                    tags={filteredTags}
                    selectedTagIds={selectedTagIds}
                    onTagSelect={handleTagSelect}
                    expandedTagIds={expandedTagIds}
                    onToggleExpand={handleToggleExpand}
                    showUsageCount={true}
                  />
                </div>
              ) : searchQuery.trim() ? (
                <div className="px-3 py-8 text-center text-gray-500">
                  <TagIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No tags found matching "{searchQuery}"</p>
                  {allowCreate && (
                    <button
                      onClick={handleCreateTag}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Create "{searchQuery}"
                    </button>
                  )}
                </div>
              ) : (
                <div className="px-3 py-8 text-center text-gray-500">
                  <TagIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Start typing to search tags</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Max Tags Warning */}
      {maxTags && selectedTags.length >= maxTags && (
        <p className="mt-1 text-xs text-amber-600">
          Maximum {maxTags} tags allowed
        </p>
      )}
    </div>
  )
}

export default TagSelector