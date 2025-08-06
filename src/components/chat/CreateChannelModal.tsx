// Create Channel Modal Component
// Modal for creating new chat channels

'use client'

import React, { useState, useEffect } from 'react'
import { useChatChannels } from '../../hooks/useChatChannels'
import type { ChannelType } from '../../types'
import type { ChatChannelWithDetails } from '../../lib/chat-service'

interface CreateChannelModalProps {
  onClose: () => void
  onChannelCreated: (channel: ChatChannelWithDetails) => void
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export function CreateChannelModal({ onClose, onChannelCreated }: CreateChannelModalProps) {
  const [step, setStep] = useState<'type' | 'details' | 'members'>('type')
  const [channelType, setChannelType] = useState<ChannelType>('GROUP')
  const [channelName, setChannelName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { createChannel } = useChatChannels()

  // Fetch available users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setAvailableUsers(result.data)
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    if (step === 'members') {
      fetchUsers()
    }
  }, [step])

  const filteredUsers = availableUsers.filter(user => {
    if (!searchQuery.trim()) return true
    
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    const email = user.email.toLowerCase()
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || email.includes(query)
  })

  const handleTypeSelect = (type: ChannelType) => {
    setChannelType(type)
    setStep('details')
  }

  const handleDetailsNext = () => {
    if (!channelName.trim()) {
      setError('Channel name is required')
      return
    }

    if (channelType === 'DIRECT') {
      // For direct channels, skip to member selection
      setStep('members')
    } else {
      setStep('members')
    }
  }

  const handleMemberToggle = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreate = async () => {
    try {
      setLoading(true)
      setError(null)

      const channel = await createChannel({
        name: channelName.trim(),
        type: channelType,
        memberIds: selectedMembers,
        metadata: {}
      })

      onChannelCreated(channel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  const channelTypes = [
    {
      type: 'GROUP' as ChannelType,
      icon: '👥',
      title: 'Group Channel',
      description: 'Create a channel for team discussions'
    },
    {
      type: 'TASK' as ChannelType,
      icon: '📋',
      title: 'Task Channel',
      description: 'Create a channel for a specific task or project'
    },
    {
      type: 'CLIENT' as ChannelType,
      icon: '🏢',
      title: 'Client Channel',
      description: 'Create a channel for client communication'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {step === 'type' && 'Create Channel'}
            {step === 'details' && 'Channel Details'}
            {step === 'members' && 'Add Members'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: Channel Type Selection */}
          {step === 'type' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Choose the type of channel you want to create
              </p>
              
              {channelTypes.map(type => (
                <button
                  key={type.type}
                  onClick={() => handleTypeSelect(type.type)}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{type.title}</h3>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Channel Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Enter channel name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                <span className="text-2xl">
                  {channelTypes.find(t => t.type === channelType)?.icon}
                </span>
                <div>
                  <p className="font-medium text-gray-900">
                    {channelTypes.find(t => t.type === channelType)?.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {channelTypes.find(t => t.type === channelType)?.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Member Selection */}
          {step === 'members' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Members (optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected ({selectedMembers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map(userId => {
                      const user = availableUsers.find(u => u.id === userId)
                      if (!user) return null
                      
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {user.firstName} {user.lastName}
                          <button
                            onClick={() => handleMemberToggle(userId)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available Users */}
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery ? 'No users found' : 'No users available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(user.id)}
                          onChange={() => handleMemberToggle(user.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex space-x-3">
            {step !== 'type' && (
              <button
                onClick={() => {
                  if (step === 'details') setStep('type')
                  else if (step === 'members') setStep('details')
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {step === 'details' && (
              <button
                onClick={handleDetailsNext}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            )}
            
            {step === 'members' && (
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Channel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}