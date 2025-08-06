'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TagWithChildren, TagSuggestion } from '@/lib/tag-service'

interface UseTagsOptions {
  organizationId?: string
  includeChildren?: boolean
  includeUsage?: boolean
  autoLoad?: boolean
}

interface UseTagsReturn {
  tags: TagWithChildren[]
  loading: boolean
  error: string | null
  loadTags: (filters?: {
    search?: string
    parentId?: string
    createdBy?: string
  }) => Promise<void>
  createTag: (data: {
    name: string
    parentId?: string
    color?: string
    description?: string
  }) => Promise<TagWithChildren>
  updateTag: (id: string, data: {
    name?: string
    parentId?: string | null
    color?: string
    description?: string
  }) => Promise<TagWithChildren>
  deleteTag: (id: string) => Promise<void>
  getTagPath: (tagId: string) => Promise<TagWithChildren[]>
  getTagDescendants: (tagId: string) => Promise<TagWithChildren[]>
}

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
  const {
    includeChildren = true,
    includeUsage = false,
    autoLoad = true
  } = options

  const [tags, setTags] = useState<TagWithChildren[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTags = useCallback(async (filters?: {
    search?: string
    parentId?: string
    createdBy?: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        includeChildren: includeChildren.toString(),
        includeUsage: includeUsage.toString()
      })

      if (filters?.search) {
        params.append('search', filters.search)
      }

      if (filters?.parentId) {
        params.append('parentId', filters.parentId)
      }

      if (filters?.createdBy) {
        params.append('createdBy', filters.createdBy)
      }

      const response = await fetch(`/api/tags?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load tags')
      }

      setTags(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tags'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [includeChildren, includeUsage])

  const createTag = useCallback(async (data: {
    name: string
    parentId?: string
    color?: string
    description?: string
  }): Promise<TagWithChildren> => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create tag')
      }

      // Reload tags to get updated hierarchy
      await loadTags()

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag'
      setError(errorMessage)
      throw err
    }
  }, [loadTags])

  const updateTag = useCallback(async (id: string, data: {
    name?: string
    parentId?: string | null
    color?: string
    description?: string
  }): Promise<TagWithChildren> => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update tag')
      }

      // Reload tags to get updated hierarchy
      await loadTags()

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag'
      setError(errorMessage)
      throw err
    }
  }, [loadTags])

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete tag')
      }

      // Reload tags to get updated hierarchy
      await loadTags()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag'
      setError(errorMessage)
      throw err
    }
  }, [loadTags])

  const getTagPath = useCallback(async (tagId: string): Promise<TagWithChildren[]> => {
    try {
      const response = await fetch(`/api/tags/${tagId}/path`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get tag path')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get tag path'
      setError(errorMessage)
      throw err
    }
  }, [])

  const getTagDescendants = useCallback(async (tagId: string): Promise<TagWithChildren[]> => {
    try {
      const response = await fetch(`/api/tags/${tagId}/descendants`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get tag descendants')
      }

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get tag descendants'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Auto-load tags on mount
  useEffect(() => {
    if (autoLoad) {
      loadTags()
    }
  }, [autoLoad, loadTags])

  return {
    tags,
    loading,
    error,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    getTagPath,
    getTagDescendants
  }
}

interface UseTaggingOptions {
  taggableType: 'task' | 'document' | 'email' | 'chat_channel'
  taggableId: string
  autoLoad?: boolean
}

interface UseTaggingReturn {
  resourceTags: TagWithChildren[]
  loading: boolean
  error: string | null
  suggestions: TagSuggestion[]
  loadResourceTags: () => Promise<void>
  applyTag: (tagId: string) => Promise<void>
  removeTag: (tagId: string) => Promise<void>
  bulkApplyTags: (tagIds: string[]) => Promise<void>
  bulkRemoveTags: (tagIds: string[]) => Promise<void>
  loadSuggestions: (content: string) => Promise<void>
  clearSuggestions: () => void
}

export function useTagging(options: UseTaggingOptions): UseTaggingReturn {
  const { taggableType, taggableId, autoLoad = true } = options

  const [resourceTags, setResourceTags] = useState<TagWithChildren[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])

  const loadResourceTags = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        taggableType,
        taggableId
      })

      const response = await fetch(`/api/taggings?${params}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load resource tags')
      }

      setResourceTags(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load resource tags'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [taggableType, taggableId])

  const applyTag = useCallback(async (tagId: string) => {
    try {
      const response = await fetch('/api/taggings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          tagId,
          taggableType,
          taggableId
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to apply tag')
      }

      // Reload resource tags
      await loadResourceTags()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply tag'
      setError(errorMessage)
      throw err
    }
  }, [taggableType, taggableId, loadResourceTags])

  const removeTag = useCallback(async (tagId: string) => {
    try {
      const response = await fetch('/api/taggings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          tagId,
          taggableType,
          taggableId
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to remove tag')
      }

      // Reload resource tags
      await loadResourceTags()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove tag'
      setError(errorMessage)
      throw err
    }
  }, [taggableType, taggableId, loadResourceTags])

  const bulkApplyTags = useCallback(async (tagIds: string[]) => {
    try {
      const response = await fetch('/api/taggings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_apply',
          tagIds,
          taggableType,
          taggableIds: [taggableId]
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to apply tags')
      }

      // Reload resource tags
      await loadResourceTags()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply tags'
      setError(errorMessage)
      throw err
    }
  }, [taggableType, taggableId, loadResourceTags])

  const bulkRemoveTags = useCallback(async (tagIds: string[]) => {
    try {
      const response = await fetch('/api/taggings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_remove',
          tagIds,
          taggableType,
          taggableIds: [taggableId]
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to remove tags')
      }

      // Reload resource tags
      await loadResourceTags()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove tags'
      setError(errorMessage)
      throw err
    }
  }, [taggableType, taggableId, loadResourceTags])

  const loadSuggestions = useCallback(async (content: string) => {
    try {
      const response = await fetch('/api/taggings/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          taggableType
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to load suggestions')
      }

      setSuggestions(result.data)
    } catch (err) {
      console.error('Failed to load tag suggestions:', err)
      // Don't throw here as suggestions are optional
    }
  }, [taggableType])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  // Auto-load resource tags on mount
  useEffect(() => {
    if (autoLoad && taggableId) {
      loadResourceTags()
    }
  }, [autoLoad, taggableId, loadResourceTags])

  return {
    resourceTags,
    loading,
    error,
    suggestions,
    loadResourceTags,
    applyTag,
    removeTag,
    bulkApplyTags,
    bulkRemoveTags,
    loadSuggestions,
    clearSuggestions
  }
}