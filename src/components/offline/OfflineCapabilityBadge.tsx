// Offline Capability Badge - Shows which features work offline
'use client'

import React from 'react'

interface OfflineCapabilityBadgeProps {
  feature: string
  isAvailableOffline: boolean
  isCurrentlyOffline?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function OfflineCapabilityBadge({
  feature,
  isAvailableOffline,
  isCurrentlyOffline = false,
  size = 'md',
  showLabel = true
}: OfflineCapabilityBadgeProps) {
  const getSizeClasses = () => {
    const sizes = {
      sm: 'w-3 h-3 text-xs',
      md: 'w-4 h-4 text-sm',
      lg: 'w-5 h-5 text-base'
    }
    return sizes[size]
  }

  const getStatusColor = () => {
    if (!isCurrentlyOffline) {
      return 'text-gray-400' // Not relevant when online
    }
    
    return isAvailableOffline ? 'text-green-500' : 'text-red-500'
  }

  const getStatusIcon = () => {
    if (!isCurrentlyOffline) {
      return (
        <svg className={getSizeClasses()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    }

    if (isAvailableOffline) {
      return (
        <svg className={getSizeClasses()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    }

    return (
      <svg className={getSizeClasses()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }

  const getTooltipText = () => {
    if (!isCurrentlyOffline) {
      return `${feature} - Online`
    }
    
    return isAvailableOffline 
      ? `${feature} - Available offline`
      : `${feature} - Requires internet connection`
  }

  return (
    <div 
      className={`inline-flex items-center gap-1 ${getStatusColor()}`}
      title={getTooltipText()}
    >
      {getStatusIcon()}
      {showLabel && (
        <span className={`${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {isCurrentlyOffline ? (
            isAvailableOffline ? 'Offline' : 'Online Only'
          ) : (
            'Online'
          )}
        </span>
      )}
    </div>
  )
}

// Predefined capability badges for common features
export function TaskOfflineBadge({ isCurrentlyOffline }: { isCurrentlyOffline?: boolean }) {
  return (
    <OfflineCapabilityBadge
      feature="Tasks"
      isAvailableOffline={true}
      isCurrentlyOffline={isCurrentlyOffline}
    />
  )
}

export function DocumentOfflineBadge({ isCurrentlyOffline }: { isCurrentlyOffline?: boolean }) {
  return (
    <OfflineCapabilityBadge
      feature="Documents"
      isAvailableOffline={true}
      isCurrentlyOffline={isCurrentlyOffline}
    />
  )
}

export function EmailOfflineBadge({ isCurrentlyOffline }: { isCurrentlyOffline?: boolean }) {
  return (
    <OfflineCapabilityBadge
      feature="Email"
      isAvailableOffline={false}
      isCurrentlyOffline={isCurrentlyOffline}
    />
  )
}

export function ChatOfflineBadge({ isCurrentlyOffline }: { isCurrentlyOffline?: boolean }) {
  return (
    <OfflineCapabilityBadge
      feature="Chat"
      isAvailableOffline={true}
      isCurrentlyOffline={isCurrentlyOffline}
    />
  )
}

export function SearchOfflineBadge({ isCurrentlyOffline }: { isCurrentlyOffline?: boolean }) {
  return (
    <OfflineCapabilityBadge
      feature="Search"
      isAvailableOffline={true}
      isCurrentlyOffline={isCurrentlyOffline}
    />
  )
}