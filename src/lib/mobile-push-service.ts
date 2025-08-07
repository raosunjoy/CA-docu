/**
 * Mobile Push Notification Service
 * Handles push notifications for mobile devices with FCM/APNS integration
 */

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: Record<string, any>
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  timestamp?: number
  vibrate?: number[]
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  userAgent?: string
}

export interface NotificationPreferences {
  enabled: boolean
  tasks: boolean
  messages: boolean
  deadlines: boolean
  mentions: boolean
  emails: boolean
  marketing: boolean
  quietHours: {
    enabled: boolean
    start: string // HH:MM format
    end: string   // HH:MM format
  }
  sound: boolean
  vibration: boolean
  badge: boolean
}

class MobilePushService {
  private vapidPublicKey: string
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private preferences: NotificationPreferences

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    this.preferences = this.loadPreferences()
    this.initializeService()
  }

  /**
   * Initialize the push service
   */
  private async initializeService(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      // Register service worker if not already registered
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.ready
      }

      // Check for existing subscription
      if (this.registration) {
        this.subscription = await this.registration.pushManager.getSubscription()
      }

      // Listen for notification clicks
      this.setupNotificationHandlers()
    } catch (error) {
      console.error('Push service initialization failed:', error)
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied'
    return Notification.permission
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications not supported')
    }

    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      // Show welcome notification
      this.showLocalNotification({
        title: 'Notifications Enabled',
        body: 'You will now receive important updates from Zetra Platform',
        icon: '/icons/icon-192x192.png'
      })
    }

    return permission
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered')
    }

    if (this.getPermissionStatus() !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      })

      this.subscription = subscription

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)

      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return false

    try {
      const success = await this.subscription.unsubscribe()
      
      if (success) {
        // Remove subscription from server
        await this.removeSubscriptionFromServer(this.subscription)
        this.subscription = null
      }

      return success
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      return false
    }
  }

  /**
   * Get current subscription
   */
  getSubscription(): PushSubscription | null {
    return this.subscription
  }

  /**
   * Show local notification
   */
  async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    if (this.getPermissionStatus() !== 'granted') return

    // Check quiet hours
    if (this.isQuietHours()) {
      payload.silent = true
    }

    // Apply user preferences
    if (!this.shouldShowNotification(payload)) return

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      image: payload.image,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || !this.preferences.sound,
      tag: payload.tag,
      timestamp: payload.timestamp || Date.now(),
      vibrate: this.preferences.vibration ? (payload.vibrate || [200, 100, 200]) : []
    }

    const notification = new Notification(payload.title, options)

    // Auto close after 5 seconds unless requireInteraction is true
    if (!payload.requireInteraction) {
      setTimeout(() => notification.close(), 5000)
    }

    // Handle click
    notification.onclick = () => {
      window.focus()
      this.handleNotificationClick(payload.data)
      notification.close()
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(
    payload: PushNotificationPayload,
    scheduledTime: Date
  ): Promise<void> {
    const delay = scheduledTime.getTime() - Date.now()
    
    if (delay <= 0) {
      await this.showLocalNotification(payload)
      return
    }

    setTimeout(() => {
      this.showLocalNotification(payload)
    }, delay)
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences }
    this.savePreferences()
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences }
  }

  /**
   * Test notification
   */
  async testNotification(): Promise<void> {
    await this.showLocalNotification({
      title: 'Test Notification',
      body: 'This is a test notification from Zetra Platform',
      icon: '/icons/icon-192x192.png',
      data: { type: 'test' }
    })
  }

  /**
   * Send task notification
   */
  async sendTaskNotification(
    type: 'assigned' | 'due_soon' | 'overdue' | 'completed',
    taskTitle: string,
    taskId: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    let title: string
    let body: string
    let requireInteraction = false

    switch (type) {
      case 'assigned':
        title = 'New Task Assigned'
        body = `You have been assigned: "${taskTitle}"`
        break
      case 'due_soon':
        title = 'Task Due Soon'
        body = `"${taskTitle}" is due soon`
        requireInteraction = true
        break
      case 'overdue':
        title = 'Task Overdue'
        body = `"${taskTitle}" is overdue`
        requireInteraction = true
        break
      case 'completed':
        title = 'Task Completed'
        body = `"${taskTitle}" has been completed`
        break
    }

    await this.showLocalNotification({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'task',
        action: type,
        taskId,
        url: `/tasks/${taskId}`,
        ...additionalData
      },
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction,
      tag: `task_${taskId}`
    })
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(
    senderName: string,
    message: string,
    channelId: string,
    messageId: string
  ): Promise<void> {
    await this.showLocalNotification({
      title: `Message from ${senderName}`,
      body: message,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'message',
        channelId,
        messageId,
        url: `/chat/${channelId}`
      },
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View Chat' }
      ],
      tag: `message_${channelId}`
    })
  }

  /**
   * Private helper methods
   */
  private setupNotificationHandlers(): void {
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICK') {
          this.handleNotificationClick(event.data.data)
        }
      })
    }
  }

  private handleNotificationClick(data?: Record<string, any>): void {
    if (!data) return

    // Navigate to relevant page
    if (data.url) {
      window.location.href = data.url
    }

    // Handle specific actions
    switch (data.type) {
      case 'task':
        // Handle task notification click
        break
      case 'message':
        // Handle message notification click
        break
      default:
        // Handle generic notification click
        break
    }
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHours.enabled) return false

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const { start, end } = this.preferences.quietHours
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end
    }
    
    return currentTime >= start && currentTime <= end
  }

  private shouldShowNotification(payload: PushNotificationPayload): boolean {
    if (!this.preferences.enabled) return false

    // Check category-specific preferences
    const data = payload.data
    if (data?.type) {
      switch (data.type) {
        case 'task':
          return this.preferences.tasks
        case 'message':
          return this.preferences.messages
        case 'email':
          return this.preferences.emails
        case 'mention':
          return this.preferences.mentions
        case 'marketing':
          return this.preferences.marketing
        default:
          return true
      }
    }

    return true
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.getKey('p256dh') ? 
              btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
            auth: subscription.getKey('auth') ? 
              btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
          },
          userAgent: navigator.userAgent
        })
      })
    } catch (error) {
      console.error('Failed to send subscription to server:', error)
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint
        })
      })
    } catch (error) {
      console.error('Failed to remove subscription from server:', error)
    }
  }

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

  private loadPreferences(): NotificationPreferences {
    if (typeof window === 'undefined') {
      return this.getDefaultPreferences()
    }

    try {
      const saved = localStorage.getItem('notification-preferences')
      if (saved) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }

    return this.getDefaultPreferences()
  }

  private savePreferences(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem('notification-preferences', JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      enabled: true,
      tasks: true,
      messages: true,
      deadlines: true,
      mentions: true,
      emails: false,
      marketing: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      sound: true,
      vibration: true,
      badge: true
    }
  }
}

// Export singleton instance
export const mobilePushService = new MobilePushService()
export default mobilePushService