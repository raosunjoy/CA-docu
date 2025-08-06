// User List Component
// Displays channel members with presence indicators

'use client'

import React, { useState } from 'react'
import type { ChatChannelWithDetails } from '../../lib/chat-service'

interface UserListProps {
  channel: ChatChannelWithDetails
  onClose: () => void
  className?: string
}

export function UserList({ channel, onClose, className = '' }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMembers = channel.members.filter(member => {
    if (!searchQuery.trim()) return true
    
    const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase()
    const email = member.user.email.toLowerCase()
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || email.includes(query)
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PARTNER':
        return 'bg-purple-100 text-purple-800'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800'
      case 'ASSOCIATE':
        return 'bg-green-100 text-green-800'
      case 'INTERN':
        return 'bg-yellow-100 text-yellow-800'
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatJoinDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date))
  }

  return (
    <div className={`flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Members ({channel._count.members})
          </h3>
          <p className="text-sm text-gray-500">
            {channel.name}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Search members..."
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
      </div>

      {/* Add Member Button (for group channels) */}
      {(channel.type === 'GROUP' || channel.type === 'TASK') && (
        <div className="p-4 border-b border-gray-200">
          <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Member</span>
          </button>
        </div>
      )}

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No members found' : 'No members'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredMembers.map(member => (
              <div key={member.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.user.firstName[0]}{member.user.lastName[0]}
                      </span>
                    </div>
                    
                    {/* Online Status Indicator */}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      
                      {/* Role Badge */}
                      <span className={`
                        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${getRoleColor(member.user.role)}
                      `}>
                        {member.user.role.toLowerCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 truncate">
                      {member.user.email}
                    </p>
                    
                    <p className="text-xs text-gray-400">
                      Joined {formatJoinDate(member.joinedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1">
                    {/* Direct Message */}
                    {channel.type !== 'DIRECT' && (
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                        title="Send direct message"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                    )}

                    {/* More Actions */}
                    <div className="relative">
                      <button
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                        title="More actions"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filteredMembers.length} of {channel._count.members} members</span>
          
          {/* Channel Settings Link */}
          <button className="text-blue-600 hover:text-blue-800">
            Channel settings
          </button>
        </div>
      </div>
    </div>
  )
}