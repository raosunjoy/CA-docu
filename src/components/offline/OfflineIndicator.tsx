// Offline Indicator Component - Shows online/offline status and capabilities
'use client'

import React, { useState, useEffect } from 'react'
import { useSync } from '@/hooks/useSync'

interface OfflineIndicatorProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showDetails?: boolean
}

export function OfflineIndicator({ 
  position = 'top-right', 
  showDetails = true 
}: OfflineIndicatorProps) {
  const { isOnline, pendingOperations, conflicts } = useSync()
  const [showTooltip, setShowTooltip] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      // Show reconnection notification
      setWasOffline(false)
      // Could trigger a toast notification here
    }
  }, [isOnline, wasOffline])

  const getPositionClasses = () => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    }
    return positions[position]
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (conflicts > 0) return 'bg-yellow-500'
    if (pendingOperations > 0) return 'bg-orange-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline Mode'
    if (conflicts > 0) return 'Sync Conflicts'
    if (pendingOperations > 0) return 'Sync Pending'
    return 'Online'
  }

  const getStatusDescription = () => {
    if (!isOnline) {
      return 'You can continue working. Changes will sync when connection is restored.'
    }
    if (conflicts > 0) {
      return `${conflicts} conflicts need resolution before syncing can continue.`
    }
    if (pendingOperations > 0) {
      return `${pendingOperations} changes are waiting to be synced to the server.`
    }
    return 'All changes are synced with the server.'
  }

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-white text-sm font-medium ${getStatusColor()}`}>
          <div className="flex items-center gap-2">
            {/* Connection Icon */}
            {isOnline ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364" />
              </svg>
            )}
            
            {showDetails && (
              <span className="hidden sm:inline">{getStatusText()}</span>
            )}
            
            {/* Notification badges */}
            {(pendingOperations > 0 || conflicts > 0) && (
              <div className="flex items-center gap-1">
                {pendingOperations > 0 && (
                  <span className="bg-white bg-opacity-20 text-xs px-1.5 py-0.5 rounded-full">
                    {pendingOperations}
                  </span>
                )}
                {conflicts > 0 && (
                  <span className="bg-white bg-opacity-20 text-xs px-1.5 py-0.5 rounded-full">
                    !{conflicts}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className={`absolute ${
            position.includes('right') ? 'right-0' : 'left-0'
          } ${
            position.includes('top') ? 'top-full mt-2' : 'bottom-full mb-2'
          } w-64 bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 z-10`}>
            <div className="font-medium mb-1">{getStatusText()}</div>
            <div className="text-gray-300 text-xs">
              {getStatusDescription()}
            </div>
            
            {/* Arrow */}
            <div className={`absolute ${
              position.includes('right') ? 'right-4' : 'left-4'
            } ${
              position.includes('top') ? 'top-0 -mt-1' : 'bottom-0 -mb-1'
            } w-2 h-2 bg-gray-900 transform rotate-45`} />
          </div>
        )}
      </div>
    </div>
  )
}