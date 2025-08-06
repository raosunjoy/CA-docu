// Typing Indicator Component
// Shows when other users are typing in the channel

'use client'

import React from 'react'
import type { TypingData } from '../../lib/websocket-server'

interface TypingIndicatorProps {
  users: TypingData[]
  className?: string
}

export function TypingIndicator({ users, className = '' }: TypingIndicatorProps) {
  if (users.length === 0) return null

  const formatTypingText = () => {
    const names = users.map(user => user.userName)
    
    if (names.length === 1) {
      return `${names[0]} is typing...`
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`
    } else if (names.length === 3) {
      return `${names[0]}, ${names[1]}, and ${names[2]} are typing...`
    } else {
      return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing...`
    }
  }

  return (
    <div className={`flex items-center space-x-3 px-4 py-2 ${className}`}>
      {/* Avatar for first user */}
      <div className="flex-shrink-0 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
        <span className="text-xs text-gray-600">
          {users[0]?.userName?.[0]?.toUpperCase() || '?'}
        </span>
      </div>

      {/* Typing animation and text */}
      <div className="flex items-center space-x-2">
        {/* Animated dots */}
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div 
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" 
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>

        {/* Typing text */}
        <span className="text-sm text-gray-500 italic">
          {formatTypingText()}
        </span>
      </div>
    </div>
  )
}