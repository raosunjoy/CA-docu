/**
 * PWA Update Prompt Component
 * Notifies users when app updates are available
 */

'use client'

import React, { useState } from 'react'
import { usePWAUpdate } from '@/hooks/usePWA'
import { Button } from '@/components/common/Button'
import { Alert } from '@/components/common/Alert'
import { RefreshCw, X, Download } from 'lucide-react'

interface PWAUpdatePromptProps {
  onDismiss?: () => void
  autoShow?: boolean
  className?: string
}

export function PWAUpdatePrompt({
  onDismiss,
  autoShow = true,
  className = ''
}: PWAUpdatePromptProps) {
  const { updateAvailable, isUpdating, updateInfo, updateApp } = usePWAUpdate()
  const [isDismissed, setIsDismissed] = useState(false)

  if (!updateAvailable || (!autoShow && isDismissed)) {
    return null
  }

  const handleUpdate = async () => {
    try {
      await updateApp()
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <Alert
      variant="info"
      className={`relative ${className}`}
      icon={<RefreshCw className="h-5 w-5" />}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <h4 className="font-medium text-gray-900 mb-1">
          App Update Available
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          A new version of Zetra Platform is ready to install.
          {updateInfo?.version && ` Version ${updateInfo.version}`}
        </p>
        
        {updateInfo?.releaseNotes && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-1">What's New:</p>
            <p className="text-xs text-gray-600">{updateInfo.releaseNotes}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleUpdate}
            loading={isUpdating}
            disabled={isUpdating}
          >
            <Download className="h-3 w-3 mr-1" />
            {isUpdating ? 'Updating...' : 'Update Now'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            disabled={isUpdating}
          >
            Later
          </Button>
        </div>
      </div>
    </Alert>
  )
}

/**
 * PWA Update Button - Standalone update button
 */
export function PWAUpdateButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode
}) {
  const { updateAvailable, isUpdating, updateApp } = usePWAUpdate()

  if (!updateAvailable) {
    return null
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      await updateApp()
    } catch (error) {
      console.error('Update failed:', error)
    }
    props.onClick?.(e)
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      loading={isUpdating}
      className={className}
    >
      {children || (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Update App
        </>
      )}
    </Button>
  )
}

/**
 * PWA Update Status - Shows update status in settings
 */
export function PWAUpdateStatus({ className = '' }: { className?: string }) {
  const { updateAvailable, isUpdating, updateInfo } = usePWAUpdate()

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">App Version</span>
        <span className="text-sm text-gray-600">
          {updateInfo?.version || 'Current'}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Update Status</span>
        <div className="flex items-center gap-2">
          {updateAvailable ? (
            <>
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-sm text-orange-700">Update Available</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-green-700">Up to Date</span>
            </>
          )}
        </div>
      </div>

      {isUpdating && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Updating application...</span>
        </div>
      )}
    </div>
  )
}