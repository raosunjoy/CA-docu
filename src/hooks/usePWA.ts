/**
 * PWA Hooks - React hooks for Progressive Web App functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { pwaService, PWACapabilities, PWAUpdateInfo } from '@/lib/pwa-service'

/**
 * Hook for PWA installation functionality
 */
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    const updateInstallState = () => {
      const capabilities = pwaService.getCapabilities()
      setIsInstallable(capabilities.isInstallable)
      setIsInstalled(capabilities.isInstalled)
    }

    // Initial state
    updateInstallState()

    // Listen for install events
    const handleInstallAvailable = () => {
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstallable(false)
      setIsInstalled(true)
      setIsInstalling(false)
    }

    pwaService.on('install-available', handleInstallAvailable)
    pwaService.on('app-installed', handleAppInstalled)

    return () => {
      pwaService.off('install-available', handleInstallAvailable)
      pwaService.off('app-installed', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!isInstallable) return false

    setIsInstalling(true)
    try {
      const result = await pwaService.promptInstall()
      if (!result) {
        setIsInstalling(false)
      }
      return result
    } catch (error) {
      setIsInstalling(false)
      throw error
    }
  }, [isInstallable])

  return {
    isInstallable,
    isInstalled,
    isInstalling,
    promptInstall
  }
}

/**
 * Hook for PWA update functionality
 */
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<PWAUpdateInfo | null>(null)

  useEffect(() => {
    const handleUpdateAvailable = (info: PWAUpdateInfo) => {
      setUpdateAvailable(true)
      setUpdateInfo(info)
    }

    pwaService.on('update-available', handleUpdateAvailable)

    return () => {
      pwaService.off('update-available', handleUpdateAvailable)
    }
  }, [])

  const updateApp = useCallback(async () => {
    if (!updateAvailable) return

    setIsUpdating(true)
    try {
      await pwaService.updateApp()
    } catch (error) {
      setIsUpdating(false)
      throw error
    }
  }, [updateAvailable])

  return {
    updateAvailable,
    isUpdating,
    updateInfo,
    updateApp
  }
}

/**
 * Hook for PWA notifications
 */
export function usePWANotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  useEffect(() => {
    // Check initial permission state
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Check subscription state
    checkSubscriptionState()

    const handlePermissionChange = (data: { permission: NotificationPermission }) => {
      setPermission(data.permission)
    }

    pwaService.on('notification-permission-changed', handlePermissionChange)

    return () => {
      pwaService.off('notification-permission-changed', handlePermissionChange)
    }
  }, [])

  const checkSubscriptionState = async () => {
    try {
      // This would need to be implemented in pwaService
      // const subscription = await pwaService.getSubscription()
      // setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Failed to check subscription state:', error)
    }
  }

  const requestPermission = useCallback(async () => {
    try {
      const newPermission = await pwaService.requestNotificationPermission()
      setPermission(newPermission)
      return newPermission
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      throw error
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    setIsSubscribing(true)
    try {
      const subscription = await pwaService.subscribeToPushNotifications()
      setIsSubscribed(!!subscription)
      return subscription
    } catch (error) {
      throw error
    } finally {
      setIsSubscribing(false)
    }
  }, [permission])

  const unsubscribe = useCallback(async () => {
    try {
      const result = await pwaService.unsubscribeFromPushNotifications()
      if (result) {
        setIsSubscribed(false)
      }
      return result
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      throw error
    }
  }, [])

  return {
    permission,
    isSubscribed,
    isSubscribing,
    requestPermission,
    subscribe,
    unsubscribe
  }
}

/**
 * Hook for PWA sharing functionality
 */
export function usePWAShare() {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('share' in navigator)
  }, [])

  const share = useCallback(async (data: ShareData) => {
    if (!isSupported) {
      throw new Error('Web Share API not supported')
    }

    return await pwaService.shareContent(data)
  }, [isSupported])

  const canShare = useCallback((data: ShareData) => {
    if (!isSupported) return false
    
    // Check if navigator.canShare exists and use it
    if ('canShare' in navigator) {
      return (navigator as any).canShare(data)
    }
    
    // Fallback: basic validation
    return !!(data.title || data.text || data.url)
  }, [isSupported])

  return {
    isSupported,
    share,
    canShare
  }
}

/**
 * Hook for PWA capabilities detection
 */
export function usePWACapabilities() {
  const [capabilities, setCapabilities] = useState<PWACapabilities>({
    isInstallable: false,
    isInstalled: false,
    isStandalone: false,
    supportsNotifications: false,
    supportsBackgroundSync: false,
    supportsShare: false,
    supportsFileHandling: false
  })

  useEffect(() => {
    const updateCapabilities = () => {
      setCapabilities(pwaService.getCapabilities())
    }

    // Initial check
    updateCapabilities()

    // Update when install state changes
    const handleInstallChange = () => {
      updateCapabilities()
    }

    pwaService.on('install-available', handleInstallChange)
    pwaService.on('app-installed', handleInstallChange)

    return () => {
      pwaService.off('install-available', handleInstallChange)
      pwaService.off('app-installed', handleInstallChange)
    }
  }, [])

  return capabilities
}

/**
 * Hook for PWA performance metrics
 */
export function usePWAPerformance() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const getMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const performanceMetrics = await pwaService.getPerformanceMetrics()
      setMetrics(performanceMetrics)
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearCaches = useCallback(async () => {
    try {
      await pwaService.clearCaches()
      // Refresh metrics after clearing caches
      await getMetrics()
    } catch (error) {
      console.error('Failed to clear caches:', error)
      throw error
    }
  }, [getMetrics])

  return {
    metrics,
    loading,
    getMetrics,
    clearCaches
  }
}

/**
 * Hook for handling shared content
 */
export function usePWAShareTarget() {
  const [sharedContent, setSharedContent] = useState<{
    title?: string
    text?: string
    url?: string
  } | null>(null)

  useEffect(() => {
    const handleContentShared = (content: any) => {
      setSharedContent(content)
    }

    pwaService.on('content-shared', handleContentShared)

    return () => {
      pwaService.off('content-shared', handleContentShared)
    }
  }, [])

  const clearSharedContent = useCallback(() => {
    setSharedContent(null)
  }, [])

  return {
    sharedContent,
    clearSharedContent
  }
}

/**
 * Hook for PWA offline status
 */
export function usePWAOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    // Initial state
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Listen for sync events
    const handleSyncSuccess = () => {
      setSyncStatus('idle')
    }

    const handleDataUpdated = () => {
      setSyncStatus('syncing')
      // Reset to idle after a short delay
      setTimeout(() => setSyncStatus('idle'), 1000)
    }

    pwaService.on('sync-success', handleSyncSuccess)
    pwaService.on('data-updated', handleDataUpdated)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      pwaService.off('sync-success', handleSyncSuccess)
      pwaService.off('data-updated', handleDataUpdated)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    syncStatus
  }
}