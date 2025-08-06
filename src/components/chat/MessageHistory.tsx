// Message History Component
// Provides browsable message history with infinite scroll

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { format, isToday, isYesterday, startOfDay } from 'date-fns'
import { MessageItem } from './MessageItem'
import type { ChatChannelWithDetails } from '../../lib/chat-service'
import type { ChatMessageWithUser } from '../../lib/websocket-server'

interface MessageHistoryProps {
  channel: ChatChannelWithDetails
  onClose: () => void
  onMessageSelect?: (message: ChatMessageWithUser) => void
  className?: string
}

export function MessageHistory({ 
  channel, 
  onClose, 
  onMessageSelect, 
  className = '' 
}: MessageHistoryProps) {
  const [messages, setMessages] = useState<ChatMessageWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver>()

  // Fetch messages
  const fetchMessages = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset
      const params = new URLSearchParams({
        limit: '50',
        offset: currentOffset.toString()
      })

      if (selectedDate) {
        const startOfSelectedDay = startOfDay(selectedDate)
        const endOfSelectedDay = new Date(startOfSelectedDay.getTime() + 24 * 60 * 60 * 1000 - 1)
        params.append('startDate', startOfSelectedDay.toISOString())
        params.append('endDate', endOfSelectedDay.toISOString())
      }

      const response = await fetch(`/api/chat/channels/${channel.id}/messages?${params}`, {
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
          // Prepend older messages
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
  }, [channel.id, offset, selectedDate])

  // Initial fetch
  useEffect(() => {
    setOffset(0)
    fetchMessages(true)
  }, [channel.id, selectedDate])

  // Infinite scroll
  const lastMessageRef = useCallback((node: HTMLDivElement) => {
    if (loading) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMessages(false)
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, fetchMessages])

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessageWithUser[]) => {
    const groups: { date: string; messages: ChatMessageWithUser[] }[] = []
    let currentGroup: { date: string; messages: ChatMessageWithUser[] } | null = null

    messages.forEach(message => {
      const messageDate = new Date(message.createdAt)
      const dateKey = format(messageDate, 'yyyy-MM-dd')

      if (!currentGroup || currentGroup.date !== dateKey) {
        currentGroup = { date: dateKey, messages: [] }
        groups.push(currentGroup)
      }

      currentGroup.messages.push(message)
    })

    return groups
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    
    if (isToday(date)) {
      return 'Today'
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'MMMM d, yyyy')
    }
  }

  // Get available dates for filtering
  const getAvailableDates = () => {
    const dates = new Set<string>()
    messages.forEach(message => {
      const dateKey = format(new Date(message.createdAt), 'yyyy-MM-dd')
      dates.add(dateKey)
    })
    return Array.from(dates).sort().reverse()
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Message History</h2>
            <p className="text-sm text-gray-500">{channel.name}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Date Filter */}
            <select
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                setSelectedDate(e.target.value ? new Date(e.target.value) : null)
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All dates</option>
              {getAvailableDates().map(date => (
                <option key={date} value={date}>
                  {formatDateHeader(date)}
                </option>
              ))}
            </select>

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

        {/* Messages */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
        >
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading messages...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-600 mb-2">Failed to load messages</p>
                <p className="text-gray-500 text-sm">{error}</p>
                <button
                  onClick={() => fetchMessages(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                <p className="text-gray-500">
                  {selectedDate ? 'No messages found for the selected date' : 'This channel has no messages yet'}
                </p>
              </div>
            </div>
          )}

          {/* Message Groups */}
          {messageGroups.map((group, groupIndex) => (
            <div key={group.date}>
              {/* Date Header */}
              <div className="flex items-center justify-center my-6">
                <div className="bg-gray-100 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-600">
                    {formatDateHeader(group.date)}
                  </span>
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-1">
                {group.messages.map((message, messageIndex) => {
                  const isLastMessage = groupIndex === 0 && messageIndex === 0
                  const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null
                  const showAvatar = !prevMessage || 
                                   prevMessage.userId !== message.userId ||
                                   new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000

                  return (
                    <div
                      key={message.id}
                      ref={isLastMessage ? lastMessageRef : undefined}
                      className={onMessageSelect ? 'cursor-pointer hover:bg-gray-50' : ''}
                      onClick={() => onMessageSelect?.(message)}
                    >
                      <MessageItem
                        message={message}
                        showAvatar={showAvatar}
                        onReply={() => {}}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load More Indicator */}
          {loading && messages.length > 0 && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <div className="text-center p-4">
              <p className="text-sm text-gray-500">No more messages to load</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {messages.length > 0 && `${messages.length} message${messages.length === 1 ? '' : 's'} loaded`}
            </span>
            <span>
              {onMessageSelect && 'Click on a message to jump to it in the chat'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}