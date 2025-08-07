/**
 * PWA Provider Component
 * Provides PWA context and manages global PWA state
 */

'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { pwaService, PWACapabilities } from '@/lib/pwa-service'
import { PWAInstallPrompt } from './PWAInstallPrompt'
import { PWAUpdatePrompt } from './PWAUpdatePrompt'

interface PWAContextType {
  capabilities: PWACapabilities
  showInstallPrompt: boolean
  showUpdatePrompt: boolean
  dismissInstallPrompt: () => void
  dismissUpdatePrompt: () => void
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export function usePWAContext() {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWAContext must be used within a PWAProvider')
  }
  return context
}

interface PWAProviderProps {
  children: React.ReactNode
  showGlobalPrompts?: boolean
  installPromptDelay?: number
}

export function PWAProvider({
  children,
  showGlobalPrompts = true,
  installPromptDelay = 30000 // 30 seconds
}: PWAProviderProps) {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    supportsNotifications: false,
    supportsBackgroundSync: false,
    supportsShare: false,
    supportsFileHandling: false
  })
  
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false)
  const [updatePromptDismissed, setUpdatePromptDismissed] = useState(false)

  useEffect(() => {
    // Initialize capabilities
    const updateCapabilities = () => {
      setCapabilities(pwaService.getCapabilities())
    }

    updateCapabilities()

    // Listen for PWA events
    const handleInstallAvailable = () => {
      if (!installPromptDismissed && showGlobalPrompts) {
        // Delay showing install prompt to avoid being too aggressive
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, installPromptDelay)
      }
      updateCapabilities()
    }

    const handleAppInstalled = () => {
      setShowInstallPrompt(false)
      setInstallPromptDismissed(true)
      updateCapabilities()
    }

    const handleUpdateAvailable = () => {
      if (!updatePromptDismissed && showGlobalPrompts) {
        setShowUpdatePrompt(true)
      }
    }

    const handleContentShared = (content: any) => {
      // Handle shared content when app is launched via share target
      console.log('Content shared:', content)
      // You could dispatch this to a global state manager or show a notification
    }

    const handleNotificationClick = (data: any) => {
      // Handle notification clicks
      console.log('Notification clicked:', data)
      // Navigate to relevant page based on notification data
      if (data.url) {
        window.location.href = data.url
      }
    }

    // Register event listeners
    pwaService.on('install-available', handleInstallAvailable)
    pwaService.on('app-installed', handleAppInstalled)
    pwaService.on('update-available', handleUpdateAvailable)
    pwaService.on('content-shared', handleContentShared)
    pwaService.on('notification-click', handleNotificationClick)

    // Cleanup
    return () => {
      pwaService.off('install-available', handleInstallAvailable)
      pwaService.off('app-installed', handleAppInstalled)
      pwaService.off('update-available', handleUpdateAvailable)
      pwaService.off('content-shared', handleContentShared)
      pwaService.off('notification-click', handleNotificationClick)
    }
  }, [showGlobalPrompts, installPromptDelay, installPromptDismissed, updatePromptDismissed])

  // Handle visibility change to check for updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible, check for updates
        // This is handled automatically by the service worker
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    setInstallPromptDismissed(true)
    
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  const dismissUpdatePrompt = () => {
    setShowUpdatePrompt(false)
    setUpdatePromptDismissed(true)
  }

  const contextValue: PWAContextType = {
    capabilities,
    showInstallPrompt: showInstallPrompt && !installPromptDismissed,
    showUpdatePrompt: showUpdatePrompt && !updatePromptDismissed,
    dismissInstallPrompt,
    dismissUpdatePrompt
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
      
      {/* Global PWA Prompts */}
      {showGlobalPrompts && (
        <>
          {showInstallPrompt && !installPromptDismissed && (
            <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
              <PWAInstallPrompt
                onDismiss={dismissInstallPrompt}
                compact={true}
              />
            </div>
          )}
          
          {showUpdatePrompt && !updatePromptDismissed && (
            <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
              <PWAUpdatePrompt
                onDismiss={dismissUpdatePrompt}
              />
            </div>
          )}
        </>
      )}
    </PWAContext.Provider>
  )
}

/**
 * PWA Status Bar Component
 * Shows PWA status in the app header/navigation
 */
export function PWAStatusBar({ className = '' }: { className?: string }) {
  const { capabilities } = usePWAContext()

  if (!capabilities.isInstallable && !capabilities.isInstalled) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {capabilities.isInstalled ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-700">PWA Active</span>
        </>
      ) : capabilities.isInstallable ? (
        <>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-blue-700">PWA Available</span>
        </>
      ) : null}
      
      {capabilities.isStandalone && (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
          Standalone
        </span>
      )}
    </div>
  )
}

/**
 * PWA Feature Badge Component
 * Shows available PWA features
 */
export function PWAFeatureBadge({ className = '' }: { className?: string }) {
  const { capabilities } = usePWAContext()

  const features = []
  if (capabilities.supportsNotifications) features.push('Notifications')
  if (capabilities.supportsShare) features.push('Share')
  if (capabilities.supportsBackgroundSync) features.push('Offline Sync')
  if (capabilities.supportsFileHandling) features.push('File Handling')

  if (features.length === 0) {
    return null
  }

  return (
    <div className={`text-xs text-gray-600 ${className}`}>
      <span className="font-medium">PWA Features: </span>
      <span>{features.join(', ')}</span>
    </div>
  )
}