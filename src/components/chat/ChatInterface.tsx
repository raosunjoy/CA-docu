// Chat Interface Component
// Main chat interface with channel list and message area

'use client'

import React, { useState, useEffect } from 'react'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useChatChannels } from '../../hooks/useChatChannels'
import { ChannelList } from './ChannelList'
import { MessageArea } from './MessageArea'
import { UserList } from './UserList'
import { CreateChannelModal } from './CreateChannelModal'
import { ChatHeader } from './ChatHeader'
import { ChatSearch } from './ChatSearch'
import { MessageHistory } from './MessageHistory'
import { OfflineIndicator } from './OfflineIndicator'
import type { ChatChannelWithDetails } from '../../lib/chat-service'
import type { ChatMessageWithUser } from '../../lib/websocket-server'

interface ChatInterfaceProps {
  className?: string
  initialChannelId?: string
}

export function ChatInterface({ className = '', initialChannelId }: ChatInterfaceProps) {
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelWithDetails | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUserList, setShowUserList] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  const { 
    isConnected, 
    isAuthenticated, 
    connect, 
    disconnect,
    joinChannel,
    leaveChannel 
  } = useWebSocket()

  const {
    channels,
    loading: channelsLoading,
    error: channelsError,
    refetch: refetchChannels
  } = useChatChannels()

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Connect to WebSocket on mount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  // Select initial channel
  useEffect(() => {
    if (initialChannelId && channels.length > 0 && !selectedChannel) {
      const channel = channels.find(c => c.id === initialChannelId)
      if (channel) {
        setSelectedChannel(channel)
      }
    } else if (channels.length > 0 && !selectedChannel) {
      // Select first channel by default
      setSelectedChannel(channels[0])
    }
  }, [initialChannelId, channels, selectedChannel])

  // Join/leave channels when selection changes
  useEffect(() => {
    if (selectedChannel && isAuthenticated) {
      joinChannel(selectedChannel.id)
      return () => leaveChannel(selectedChannel.id)
    }
  }, [selectedChannel, isAuthenticated, joinChannel, leaveChannel])

  const handleChannelSelect = (channel: ChatChannelWithDetails) => {
    if (selectedChannel) {
      leaveChannel(selectedChannel.id)
    }
    setSelectedChannel(channel)
  }

  const handleChannelCreated = (channel: ChatChannelWithDetails) => {
    setShowCreateModal(false)
    refetchChannels()
    setSelectedChannel(channel)
  }

  const handleSearchMessageSelect = (message: ChatMessageWithUser) => {
    // Find the channel for this message and switch to it
    const messageChannel = channels.find(c => c.id === message.channelId)
    if (messageChannel) {
      setSelectedChannel(messageChannel)
    }
    setShowSearch(false)
    // You could also scroll to the specific message here
  }

  const handleHistoryMessageSelect = (message: ChatMessageWithUser) => {
    setShowHistory(false)
    // You could scroll to the specific message in the current channel here
  }

  if (!isConnected) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to chat...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 mb-4">Authentication required</p>
          <button
            onClick={connect}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Channel List - Hidden on mobile when channel is selected */}
      <div className={`
        ${isMobileView && selectedChannel ? 'hidden' : 'flex'}
        flex-col w-80 border-r border-gray-200 bg-gray-50
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Channels</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              title="Create Channel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {/* Connection Status */}
          <OfflineIndicator />
        </div>

        <ChannelList
          channels={channels}
          selectedChannel={selectedChannel}
          onChannelSelect={handleChannelSelect}
          loading={channelsLoading}
          error={channelsError}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <ChatHeader
              channel={selectedChannel}
              onShowUserList={() => setShowUserList(!showUserList)}
              onShowSearch={() => setShowSearch(true)}
              onShowHistory={() => setShowHistory(true)}
              onBack={isMobileView ? () => setSelectedChannel(null) : undefined}
              showUserListButton={!isMobileView}
            />
            
            <div className="flex-1 flex">
              <MessageArea
                channel={selectedChannel}
                className="flex-1"
              />
              
              {/* User List - Show as sidebar on desktop, modal on mobile */}
              {showUserList && !isMobileView && (
                <UserList
                  channel={selectedChannel}
                  onClose={() => setShowUserList(false)}
                  className="w-64 border-l border-gray-200"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a channel</h3>
              <p className="text-gray-500">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile User List Modal */}
      {showUserList && isMobileView && selectedChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <UserList
            channel={selectedChannel}
            onClose={() => setShowUserList(false)}
            className="w-full max-h-96 bg-white rounded-t-lg"
          />
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={handleChannelCreated}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <ChatSearch
          onClose={() => setShowSearch(false)}
          onMessageSelect={handleSearchMessageSelect}
        />
      )}

      {/* History Modal */}
      {showHistory && selectedChannel && (
        <MessageHistory
          channel={selectedChannel}
          onClose={() => setShowHistory(false)}
          onMessageSelect={handleHistoryMessageSelect}
        />
      )}
    </div>
  )
}