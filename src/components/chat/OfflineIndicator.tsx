// Offline Indicator Component
// Shows connection status and offline message queue

'use client'

import React, { useState, useEffect } from 'react'
import { offlineChatService } from '../../lib/offline-chat-service'

interface OfflineIndicatorProps {
  className?: string
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    queuedMessages: 0,
    syncInProgress: false
  })

  useEffect(() => {
    // Update status periodically
    const updateStatus = () => {
      setStatus(offlineChatService.getOfflineStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)

    // Listen for online/offline events
    const handleOnline = () => updateStatus()
    const handleOffline = () => updateStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (status.isOnline && status.queuedMessages === 0 && !status.syncInProgress) {
    return null // Don't show indicator when everything is normal
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 text-sm ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          status.isOnline ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
        <span className={`font-medium ${
          status.isOnline ? 'text-green-700' : 'text-red-700'
        }`}>
          {status.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Status */}
      {status.syncInProgress && (
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
          <span>Syncing...</span>
        </div>
      )}

      {/* Queued Messages */}
      {status.queuedMessages > 0 && (
        <div className="flex items-center space-x-2 text-orange-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {status.queuedMessages} message{status.queuedMessages === 1 ? '' : 's'} queued
          </span>
        </div>
      )}

      {/* Offline Mode Message */}
      {!status.isOnline && (
        <div className="text-gray-600">
          Messages will be sent when connection is restored
        </div>
      )}
    </div>
  )
}