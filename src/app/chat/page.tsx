'use client'

import { useState, useEffect } from 'react'
import { ChatPage } from '@/components/chat/ChatPage'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function ChatMainPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading for chat initialization
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access team chat</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Connecting to chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
            <p className="text-gray-600 mt-1">
              Collaborate with your team in real-time
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="h-full">
        <ChatPage 
          userId={user.id} 
          organizationId={user.organizationId || 'default'}
        />
      </div>
    </div>
  )
}