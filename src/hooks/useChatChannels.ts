// Chat Channels Hook
// Manages chat channel data and operations

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatChannelWithDetails, ChannelFilters } from '../lib/chat-service'
import type { ChannelType } from '../types'

interface UseChatChannelsReturn {
  channels: ChatChannelWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createChannel: (data: {
    name: string
    type: ChannelType
    memberIds?: string[]
    metadata?: Record<string, any>
  }) => Promise<ChatChannelWithDetails>
  updateChannel: (channelId: string, data: {
    name?: string
    metadata?: Record<string, any>
  }) => Promise<ChatChannelWithDetails>
  deleteChannel: (channelId: string) => Promise<void>
  addMember: (channelId: string, userId: string) => Promise<void>
  removeMember: (channelId: string, userId: string) => Promise<void>
  createDirectChannel: (userId: string) => Promise<ChatChannelWithDetails>
}

export function useChatChannels(filters?: ChannelFilters): UseChatChannelsReturn {
  const [channels, setChannels] = useState<ChatChannelWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters?.type) {
        params.append('type', filters.type.join(','))
      }
      if (filters?.search) {
        params.append('search', filters.search)
      }
      if (filters?.includeArchived) {
        params.append('includeArchived', 'true')
      }

      const response = await fetch(`/api/chat/channels?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch channels')
      }

      const result = await response.json()
      if (result.success) {
        setChannels(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to fetch channels')
      }
    } catch (err) {
      console.error('Error fetching channels:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch channels')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const createChannel = useCallback(async (data: {
    name: string
    type: ChannelType
    memberIds?: string[]
    metadata?: Record<string, any>
  }): Promise<ChatChannelWithDetails> => {
    const response = await fetch('/api/chat/channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to create channel')
    }

    const result = await response.json()
    if (result.success) {
      const newChannel = result.data
      setChannels(prev => [newChannel, ...prev])
      return newChannel
    } else {
      throw new Error(result.error?.message || 'Failed to create channel')
    }
  }, [])

  const updateChannel = useCallback(async (channelId: string, data: {
    name?: string
    metadata?: Record<string, any>
  }): Promise<ChatChannelWithDetails> => {
    const response = await fetch(`/api/chat/channels/${channelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to update channel')
    }

    const result = await response.json()
    if (result.success) {
      const updatedChannel = result.data
      setChannels(prev => prev.map(channel => 
        channel.id === channelId ? updatedChannel : channel
      ))
      return updatedChannel
    } else {
      throw new Error(result.error?.message || 'Failed to update channel')
    }
  }, [])

  const deleteChannel = useCallback(async (channelId: string): Promise<void> => {
    const response = await fetch(`/api/chat/channels/${channelId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to delete channel')
    }

    const result = await response.json()
    if (result.success) {
      setChannels(prev => prev.filter(channel => channel.id !== channelId))
    } else {
      throw new Error(result.error?.message || 'Failed to delete channel')
    }
  }, [])

  const addMember = useCallback(async (channelId: string, userId: string): Promise<void> => {
    const response = await fetch(`/api/chat/channels/${channelId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to add member')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to add member')
    }

    // Refresh channel data to get updated member list
    await fetchChannels()
  }, [fetchChannels])

  const removeMember = useCallback(async (channelId: string, userId: string): Promise<void> => {
    const response = await fetch(`/api/chat/channels/${channelId}/members`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to remove member')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to remove member')
    }

    // Refresh channel data to get updated member list
    await fetchChannels()
  }, [fetchChannels])

  const createDirectChannel = useCallback(async (userId: string): Promise<ChatChannelWithDetails> => {
    const response = await fetch('/api/chat/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({ userId })
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error?.message || 'Failed to create direct channel')
    }

    const result = await response.json()
    if (result.success) {
      const channel = result.data
      
      // Add to channels list if not already present
      setChannels(prev => {
        const exists = prev.find(c => c.id === channel.id)
        return exists ? prev : [channel, ...prev]
      })
      
      return channel
    } else {
      throw new Error(result.error?.message || 'Failed to create direct channel')
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  return {
    channels,
    loading,
    error,
    refetch: fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    addMember,
    removeMember,
    createDirectChannel
  }
}