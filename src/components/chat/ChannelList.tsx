// Channel List Component
// Displays list of chat channels with search and filtering

'use client'

import React, { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { ChatChannelWithDetails } from '../../lib/chat-service'
import type { ChannelType } from '../../types'

interface ChannelListProps {
  channels: ChatChannelWithDetails[]
  selectedChannel: ChatChannelWithDetails | null
  onChannelSelect: (channel: ChatChannelWithDetails) => void
  loading: boolean
  error: string | null
}

const channelTypeIcons: Record<ChannelType, string> = {
  DIRECT: '👤',
  GROUP: '👥',
  TASK: '📋',
  CLIENT: '🏢'
}

const channelTypeLabels: Record<ChannelType, string> = {
  DIRECT: 'Direct',
  GROUP: 'Group',
  TASK: 'Task',
  CLIENT: 'Client'
}

export function ChannelList({ 
  channels, 
  selectedChannel, 
  onChannelSelect, 
  loading, 
  error 
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<ChannelType | 'ALL'>('ALL')

  const filteredChannels = useMemo(() => {
    let filtered = channels

    // Filter by type
    if (filterType !== 'ALL') {
      filtered = filtered.filter(channel => channel.type === filterType)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(channel =>
        channel.name.toLowerCase().includes(query) ||
        channel.members.some(member => 
          `${member.user.firstName} ${member.user.lastName}`.toLowerCase().includes(query)
        )
      )
    }

    return filtered
  }, [channels, filterType, searchQuery])

  const groupedChannels = useMemo(() => {
    const groups: Record<string, ChatChannelWithDetails[]> = {
      DIRECT: [],
      GROUP: [],
      TASK: [],
      CLIENT: []
    }

    filteredChannels.forEach(channel => {
      groups[channel.type].push(channel)
    })

    return groups
  }, [filteredChannels])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-2">Failed to load channels</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Search and Filter */}
      <div className="p-3 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ChannelType | 'ALL')}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ALL">All Channels</option>
          <option value="DIRECT">Direct Messages</option>
          <option value="GROUP">Group Channels</option>
          <option value="TASK">Task Channels</option>
          <option value="CLIENT">Client Channels</option>
        </select>
      </div>

      {/* Channel Groups */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedChannels).map(([type, typeChannels]) => {
          if (typeChannels.length === 0) return null

          return (
            <div key={type} className="mb-4">
              {/* Group Header */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-100">
                {channelTypeIcons[type as ChannelType]} {channelTypeLabels[type as ChannelType]} ({typeChannels.length})
              </div>

              {/* Channels in Group */}
              <div className="space-y-1">
                {typeChannels.map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isSelected={selectedChannel?.id === channel.id}
                    onClick={() => onChannelSelect(channel)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {filteredChannels.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No channels found' : 'No channels available'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface ChannelItemProps {
  channel: ChatChannelWithDetails
  isSelected: boolean
  onClick: () => void
}

function ChannelItem({ channel, isSelected, onClick }: ChannelItemProps) {
  const getChannelDisplayName = () => {
    if (channel.type === 'DIRECT') {
      // For direct channels, show the other user's name
      const otherMember = channel.members.find(member => member.user.id !== 'current-user-id') // You'd get this from auth context
      return otherMember ? `${otherMember.user.firstName} ${otherMember.user.lastName}` : channel.name
    }
    return channel.name
  }

  const getLastMessagePreview = () => {
    if (!channel.lastMessage) return 'No messages yet'
    
    const content = channel.lastMessage.content
    const maxLength = 40
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content
  }

  const getLastMessageTime = () => {
    if (!channel.lastMessage) return ''
    
    try {
      return formatDistanceToNow(new Date(channel.lastMessage.createdAt), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-3 py-3 text-left hover:bg-gray-100 transition-colors
        ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Channel Avatar/Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm
          ${channel.type === 'DIRECT' ? 'bg-green-100 text-green-600' : 
            channel.type === 'GROUP' ? 'bg-blue-100 text-blue-600' :
            channel.type === 'TASK' ? 'bg-orange-100 text-orange-600' :
            'bg-purple-100 text-purple-600'}
        `}>
          {channelTypeIcons[channel.type]}
        </div>

        {/* Channel Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`
              text-sm font-medium truncate
              ${isSelected ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {getChannelDisplayName()}
            </h3>
            
            {/* Member Count */}
            <span className="text-xs text-gray-500 ml-2">
              {channel._count.members}
            </span>
          </div>

          {/* Last Message */}
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500 truncate">
              {channel.lastMessage && (
                <span className="font-medium">
                  {channel.lastMessage.user.firstName}:
                </span>
              )}
              {' '}
              {getLastMessagePreview()}
            </p>
            
            {/* Time */}
            {channel.lastMessage && (
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                {getLastMessageTime()}
              </span>
            )}
          </div>

          {/* Unread Indicator */}
          {/* You would implement unread message tracking here */}
        </div>
      </div>
    </button>
  )
}