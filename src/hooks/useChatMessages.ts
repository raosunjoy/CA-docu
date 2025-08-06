// Chat Messages Hook
// Manages chat message data and operations for a specific channel

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatMessageWithUser } from '../lib/websocket-server'

interface UseChatMessagesReturn {
  messages: ChatMessageWithUser[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  addMessage: (message: ChatMessageWithUser) => void
  updateMessage: (messageId: string, content: string) => void
  removeMessage: (messageId: string) => void
  refetch: () => Promise<void>
}

export function useChatMessages(channelId: string): UseChatMessagesReturn {
  const [messages, setMessages] = useState<ChatMessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const fetchMessages = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset
      const params = new URLSearchParams({
        limit: '50',
        offset: currentOffset.toString()
      })

      const response = await fetch(`/api/chat/channels/${channelId}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const result = await response.json()
      if (result.success) {
        const newMessages = result.data as ChatMessageWithUser[]
        
        if (reset) {
          setMessages(newMessages)
          setOffset(newMessages.length)
        } else {
          // Prepend older messages (they come in reverse chronological order)
          setMessages(prev => [...newMessages, ...prev])
          setOffset(prev => prev + newMessages.length)
        }

        setHasMore(result.meta?.pagination?.hasMore || false)
      } else {
        throw new Error(result.error?.message || 'Failed to fetch messages')
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setLoading(false)
    }
  }, [channelId, offset])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchMessages(false)
  }, [fetchMessages, hasMore, loading])

  const refetch = useCallback(async () => {
    setOffset(0)
    await fetchMessages(true)
  }, [fetchMessages])

  const addMessage = useCallback((message: ChatMessageWithUser) => {
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const exists = prev.find(m => m.id === message.id)
      if (exists) return prev

      // Add to end (newest messages at bottom)
      return [...prev, message]
    })
  }, [])

  const updateMessage = useCallback((messageId: string, content: string) => {
    setMessages(prev => prev.map(message => 
      message.id === messageId 
        ? { ...message, content, updatedAt: new Date() }
        : message
    ))
  }, [])

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(message => message.id !== messageId))
  }, [])

  // Initial fetch when channel changes
  useEffect(() => {
    setMessages([])
    setOffset(0)
    setHasMore(true)
    fetchMessages(true)
  }, [channelId]) // Only depend on channelId to avoid infinite loops

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    addMessage,
    updateMessage,
    removeMessage,
    refetch
  }
}