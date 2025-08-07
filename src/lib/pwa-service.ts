/**
 * PWA Service - Handles Progressive Web App functionality
 * Manages installation, updates, and PWA-specific features
 */

export interface PWAInstallPrompt {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PWACapabilities {
  isInstallable: boolean
  isInstalled: boolean
  isStandalone: boolean
  supportsNotifications: boolean
  supportsBackgroundSync: boolean
  supportsShare: boolean
  supportsFileHandling: boolean
}

export interface PWAUpdateInfo {
  available: boolean
  version?: string
  releaseNotes?: string
}

class PWAService {
  private installPrompt: PWAInstallPrompt | null = null
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false
  private callbacks: Map<string, Function[]> = new Map()

  constructor() {
    this.initializePWA()
  }

  /**
   * Initialize PWA functionality
   */
  private async initializePWA(): Promise<void> {
    if (typeof window === 'undefined') return

    // Register service worker
    await this.registerServiceWorker()

    // Listen for install prompt
    this.setupInstallPrompt()

    // Check for updates
    this.checkForUpdates()

    // Setup notification permissions
    this.setupNotifications()

    // Setup share target handling
    this.setupShareTarget()
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service Worker registered successfully')

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true
              this.emit('update-available', { version: 'latest' })
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data)
      })

    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  /**
   * Setup install prompt handling
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      this.installPrompt = event as any
      this.emit('install-available')
    })

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null
      this.emit('app-installed')
    })
  }

  /**
   * Check for app updates
   */
  private async checkForUpdates(): Promise<void> {
    if (!this.registration) return

    try {
      await this.registration.update()
    } catch (error) {
      console.error('Update check failed:', error)
    }
  }

  /**
   * Setup notification permissions
   */
  private async setupNotifications(): Promise<void> {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      // Don't request permission immediately, wait for user action
      this.emit('notification-permission-needed')
    }
  }

  /**
   * Setup share target handling
   */
  private setupShareTarget(): void {
    // Handle shared content when app is launched via share target
    const urlParams = new URLSearchParams(window.location.search)
    const sharedTitle = urlParams.get('title')
    const sharedText = urlParams.get('text')
    const sharedUrl = urlParams.get('url')

    if (sharedTitle || sharedText || sharedUrl) {
      this.emit('content-shared', {
        title: sharedTitle,
        text: sharedText,
        url: sharedUrl
      })
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'DATA_UPDATED':
        this.emit('data-updated', { url: data.url })
        break
      case 'SYNC_SUCCESS':
        this.emit('sync-success', { action: data.action })
        break
      case 'NOTIFICATION_CLICK':
        this.emit('notification-click', data.data)
        break
      default:
        console.log('Unknown service worker message:', data)
    }
  }

  /**
   * Get PWA capabilities
   */
  getCapabilities(): PWACapabilities {
    return {
      isInstallable: !!this.installPrompt,
      isInstalled: this.isInstalled(),
      isStandalone: this.isStandalone(),
      supportsNotifications: 'Notification' in window,
      supportsBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      supportsShare: 'share' in navigator,
      supportsFileHandling: 'launchQueue' in window
    }
  }

  /**
   * Check if app is installed
   */
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: minimal-ui)').matches ||
           (window.navigator as any).standalone === true
  }

  /**
   * Check if app is running in standalone mode
   */
  isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
  }

  /**
   * Prompt user to install the app
   */
  async promptInstall(): Promise<boolean> {
    if (!this.installPrompt) {
      throw new Error('Install prompt not available')
    }

    try {
      await this.installPrompt.prompt()
      const choice = await this.installPrompt.userChoice
      
      if (choice.outcome === 'accepted') {
        this.installPrompt = null
        return true
      }
      
      return false
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported')
    }

    const permission = await Notification.requestPermission()
    this.emit('notification-permission-changed', { permission })
    return permission
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)
      
      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.registration) return false

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscriptionFromServer(subscription)
        return true
      }
      return false
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      return false
    }
  }

  /**
   * Share content using Web Share API
   */
  async shareContent(data: ShareData): Promise<boolean> {
    if (!('share' in navigator)) {
      throw new Error('Web Share API not supported')
    }

    try {
      await navigator.share(data)
      return true
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled sharing
        return false
      }
      throw error
    }
  }

  /**
   * Update the app
   */
  async updateApp(): Promise<void> {
    if (!this.registration || !this.updateAvailable) {
      throw new Error('No update available')
    }

    const waitingWorker = this.registration.waiting
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve()
        }, { once: true })
      })

      // Reload the page to use the new service worker
      window.location.reload()
    }
  }

  /**
   * Get performance metrics from service worker
   */
  async getPerformanceMetrics(): Promise<any> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service Worker not active')
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_PERFORMANCE_METRICS' },
        [messageChannel.port2]
      )

      setTimeout(() => reject(new Error('Timeout')), 5000)
    })
  }

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service Worker not active')
    }

    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
  }

  /**
   * Prefetch resources
   */
  async prefetchResources(urls: string[]): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      throw new Error('Service Worker not active')
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_RESOURCES',
      data: { urls }
    })
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])
    }
    this.callbacks.get(event)!.push(callback)
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      })
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      })
    } catch (error) {
      console.error('Failed to remove subscription from server:', error)
    }
  }
}

// Export singleton instance
export const pwaService = new PWAService()
export default pwaService