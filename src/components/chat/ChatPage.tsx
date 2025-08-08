'use client'

import React, { useState } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChannelList } from './ChannelList'
import { UserList } from './UserList'
import { CreateChannelModal } from './CreateChannelModal'

interface ChatPageProps {
  userId: string
  organizationId: string
  className?: string
}

export const ChatPage: React.FC<ChatPageProps> = ({ 
  userId, 
  organizationId,
  className = '' 
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showUserList, setShowUserList] = useState(true)

  return (
    <div className={`chat-page h-full flex ${className}`}>
      {/* Left Sidebar - Channels */}
      <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Channels</h2>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Create Channel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <ChannelList
            userId={userId}
            organizationId={organizationId}
            selectedChannelId={selectedChannelId}
            onChannelSelect={setSelectedChannelId}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannelId ? (
          <ChatInterface
            channelId={selectedChannelId}
            userId={userId}
            onToggleUserList={() => setShowUserList(!showUserList)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">No channel selected</p>
              <p className="text-gray-600">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - User List */}
      {showUserList && selectedChannelId && (
        <div className="w-64 border-l border-gray-200 bg-white">
          <UserList
            channelId={selectedChannelId}
            currentUserId={userId}
          />
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <CreateChannelModal
          userId={userId}
          organizationId={organizationId}
          onClose={() => setShowCreateChannel(false)}
          onChannelCreated={(channelId) => {
            setSelectedChannelId(channelId)
            setShowCreateChannel(false)
          }}
        />
      )}
    </div>
  )
}