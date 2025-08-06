// Chat Header Component
// Displays channel information and controls

'use client'

import React from 'react'
import type { ChatChannelWithDetails } from '../../lib/chat-service'

interface ChatHeaderProps {
  channel: ChatChannelWithDetails
  onShowUserList: () => void
  onShowSearch?: () => void
  onShowHistory?: () => void
  onBack?: () => void
  showUserListButton?: boolean
  className?: string
}

const channelTypeIcons: Record<string, string> = {
  DIRECT: '👤',
  GROUP: '👥',
  TASK: '📋',
  CLIENT: '🏢'
}

export function ChatHeader({ 
  channel, 
  onShowUserList, 
  onShowSearch,
  onShowHistory,
  onBack, 
  showUserListButton = true,
  className = '' 
}: ChatHeaderProps) {
  const getChannelDisplayName = () => {
    if (channel.type === 'DIRECT') {
      // For direct channels, show the other user's name
      const otherMember = channel.members.find(member => member.user.id !== 'current-user-id') // You'd get this from auth context
      return otherMember ? `${otherMember.user.firstName} ${otherMember.user.lastName}` : channel.name
    }
    return channel.name
  }

  const getChannelDescription = () => {
    if (channel.type === 'DIRECT') {
      return 'Direct message'
    } else if (channel.type === 'TASK') {
      return `Task channel • ${channel._count.members} members`
    } else if (channel.type === 'GROUP') {
      return `Group channel • ${channel._count.members} members`
    } else if (channel.type === 'CLIENT') {
      return `Client channel • ${channel._count.members} members`
    }
    return `${channel._count.members} members`
  }

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white ${className}`}>
      <div className="flex items-center space-x-3">
        {/* Back Button (mobile) */}
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md md:hidden"
            title="Back to channels"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Channel Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg
          ${channel.type === 'DIRECT' ? 'bg-green-100 text-green-600' : 
            channel.type === 'GROUP' ? 'bg-blue-100 text-blue-600' :
            channel.type === 'TASK' ? 'bg-orange-100 text-orange-600' :
            'bg-purple-100 text-purple-600'}
        `}>
          {channelTypeIcons[channel.type] || '💬'}
        </div>

        {/* Channel Info */}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {getChannelDisplayName()}
          </h1>
          <p className="text-sm text-gray-500 truncate">
            {getChannelDescription()}
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-2">
        {/* Search Messages */}
        {onShowSearch && (
          <button
            onClick={onShowSearch}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            title="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        )}

        {/* Message History */}
        {onShowHistory && (
          <button
            onClick={onShowHistory}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            title="Message history"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}

        {/* Video Call */}
        {channel.type === 'DIRECT' && (
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            title="Start video call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* Voice Call */}
        {channel.type === 'DIRECT' && (
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            title="Start voice call"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        )}

        {/* Show User List */}
        {showUserListButton && (
          <button
            onClick={onShowUserList}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
            title="Show members"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
        )}

        {/* Channel Settings */}
        <button
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          title="Channel settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}