// Message Area Component
// Displays chat messages with real-time updates and message composition

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useChatMessages } from '../../hooks/useChatMessages'
import { MessageComposer } from './MessageComposer'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from './TypingIndicator'
import type { ChatChannelWithDetails } from '../../lib/chat-service'
import type { ChatMessageWithUser, TypingData } from '../../lib/websocket-server'

interface MessageAreaProps {
  channel: ChatChannelWithDetails
  className?: string
}

export function MessageArea({ channel, className = '' }: MessageAreaProps) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingData>>(new Map())
  const [replyingTo, setReplyingTo] = useState<ChatMessageWithUser | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  const { 
    sendMessage, 
    startTyping, 
    stopTyping, 
    onMessage, 
    onTyping 
  } = useWebSocket()

  const {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    addMessage,
    updateMessage,
    removeMessage
  } = useChatMessages(channel.id)

  // Handle new messages
  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (message.channelId === channel.id) {
        addMessage(message)
        
        // Auto-scroll if user is near bottom
        if (shouldAutoScroll) {
          setTimeout(() => scrollToBottom(), 100)
        }
      }
    })

    return unsubscribe
  }, [channel.id, onMessage, addMessage, shouldAutoScroll])

  // Handle typing indicators
  useEffect(() => {
    const unsubscribe = onTyping((data) => {
      if (data.channelId === channel.id) {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          
          if ('isTyping' in data && data.isTyping) {
            newMap.set(data.userId, data)
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
              setTypingUsers(current => {
                const updated = new Map(current)
                updated.delete(data.userId)
                return updated
              })
            }, 5000)
          } else {
            newMap.delete(data.userId)
          }
          
          return newMap
        })
      }
    })

    return unsubscribe
  }, [channel.id, onTyping])

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [channel.id]) // Only on channel change

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShouldAutoScroll(isNearBottom)

    // Load more messages when scrolling to top
    if (scrollTop < 100 && hasMore && !loading) {
      loadMore()
    }
  }, [hasMore, loading, loadMore])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (content: string, options?: {
    repliedToId?: string
    metadata?: Record<string, any>
  }) => {
    sendMessage(channel.id, content, {
      messageType: 'TEXT',
      repliedToId: options?.repliedToId || replyingTo?.id,
      metadata: options?.metadata
    })
    
    setReplyingTo(null)
  }

  const handleStartTyping = () => {
    startTyping(channel.id)
  }

  const handleStopTyping = () => {
    stopTyping(channel.id)
  }

  const handleReply = (message: ChatMessageWithUser) => {
    setReplyingTo(message)
  }

  const handleCancelReply = () => {
    setReplyingTo(null)
  }

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

  if (loading && messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load messages</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Load More Button */}
        {hasMore && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        {/* Message Groups by Date */}
        {messageGroups.map(group => (
          <div key={group.date}>
            {/* Date Header */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-xs font-medium text-gray-600">
                  {formatDateHeader(group.date)}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {group.messages.map((message, index) => {
                const prevMessage = index > 0 ? group.messages[index - 1] : null
                const showAvatar = !prevMessage || 
                                 prevMessage.userId !== message.userId ||
                                 new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000 // 5 minutes

                return (
                  <MessageItem
                    key={message.id}
                    message={message}
                    showAvatar={showAvatar}
                    onReply={handleReply}
                    onEdit={updateMessage}
                    onDelete={removeMessage}
                  />
                )
              })}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500">Start the conversation by sending a message below</p>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <TypingIndicator users={Array.from(typingUsers.values())} />
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-sm text-gray-600">
                Replying to <span className="font-medium">{replyingTo.user.firstName}</span>
              </span>
            </div>
            <button
              onClick={handleCancelReply}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1 truncate">
            {replyingTo.content}
          </p>
        </div>
      )}

      {/* Message Composer */}
      <MessageComposer
        channelId={channel.id}
        onSendMessage={handleSendMessage}
        onStartTyping={handleStartTyping}
        onStopTyping={handleStopTyping}
        onFileUploaded={(file) => {
          // File upload is handled via WebSocket, so we don't need to do anything here
          console.log('File uploaded:', file)
        }}
        onError={(error) => {
          console.error('File upload error:', error)
          // You could show a toast notification here
        }}
        placeholder={`Message ${channel.name}...`}
        disabled={false}
      />

      {/* Scroll to Bottom Button */}
      {!shouldAutoScroll && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Scroll to bottom"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  )
}