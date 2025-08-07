/**
 * Mobile Push Notification Hooks
 * React hooks for mobile push notification functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { mobilePushService, NotificationPreferences, PushNotificationPayload } from '@/lib/mobile-push-service'

/**
 * Hook for mobile push notification management
 */
export function useMobilePush() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    mobilePushService.getPreferences()
  )

  // Initialize state
  useEffect(() => {
    setIsSupported(mobilePushService.isSupported())
    setPermission(mobilePushService.getPermissionStatus())
    setIsSubscribed(!!mobilePushService.getSubscription())
  }, [])

  // Request permission
  const requestPermission = useCallback(async () => {
    try {
      const newPermission = await mobilePushService.requestPermission()
      setPermission(newPermission)
      return newPermission
    } catch (error) {
      console.error('Failed to request permission:', error)
      throw error
    }
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      throw new Error('Push notifications not available')
    }

    setIsSubscribing(true)
    try {
      const subscription = await mobilePushService.subscribe()
      setIsSubscribed(!!subscription)
      return subscription
    } catch (error) {
      console.error('Failed to subscribe:', error)
      throw error
    } finally {
      setIsSubscribing(false)
    }
  }, [isSupported, permission])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      const success = await mobilePushService.unsubscribe()
      if (success) {
        setIsSubscribed(false)
      }
      return success
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      throw error
    }
  }, [])

  // Update preferences
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    mobilePushService.updatePreferences(newPreferences)
    setPreferences(mobilePushService.getPreferences())
  }, [])

  // Show local notification
  const showNotification = useCallback(async (payload: PushNotificationPayload) => {
    try {
      await mobilePushService.showLocalNotification(payload)
    } catch (error) {
      console.error('Failed to show notification:', error)
      throw error
    }
  }, [])

  // Test notification
  const testNotification = useCallback(async () => {
    try {
      await mobilePushService.testNotification()
    } catch (error) {
      console.error('Failed to test notification:', error)
      throw error
    }
  }, [])

  return {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    preferences,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    showNotification,
    testNotification
  }
}

/**
 * Hook for task-specific notifications
 */
export function useTaskNotifications() {
  const { showNotification, isSubscribed, permission } = useMobilePush()

  const sendTaskAssignedNotification = useCallback(async (
    taskTitle: string,
    taskId: string,
    assignedBy?: string
  ) => {
    if (!isSubscribed || permission !== 'granted') return

    await mobilePushService.sendTaskNotification('assigned', taskTitle, taskId, {
      assignedBy
    })
  }, [isSubscribed, permission])

  const sendTaskDueNotification = useCallback(async (
    taskTitle: string,
    taskId: string,
    dueDate: Date
  ) => {
    if (!isSubscribed || permission !== 'granted') return

    await mobilePushService.sendTaskNotification('due_soon', taskTitle, taskId, {
      dueDate: dueDate.toISOString()
    })
  }, [isSubscribed, permission])

  const sendTaskOverdueNotification = useCallback(async (
    taskTitle: string,
    taskId: string,
    overdueDays: number
  ) => {
    if (!isSubscribed || permission !== 'granted') return

    await mobilePushService.sendTaskNotification('overdue', taskTitle, taskId, {
      overdueDays
    })
  }, [isSubscribed, permission])

  const sendTaskCompletedNotification = useCallback(async (
    taskTitle: string,
    taskId: string,
    completedBy?: string
  ) => {
    if (!isSubscribed || permission !== 'granted') return

    await mobilePushService.sendTaskNotification('completed', taskTitle, taskId, {
      completedBy
    })
  }, [isSubscribed, permission])

  return {
    sendTaskAssignedNotification,
    sendTaskDueNotification,
    sendTaskOverdueNotification,
    sendTaskCompletedNotification
  }
}

/**
 * Hook for message notifications
 */
export function useMessageNotifications() {
  const { isSubscribed, permission } = useMobilePush()

  const sendMessageNotification = useCallback(async (
    senderName: string,
    message: string,
    channelId: string,
    messageId: string
  ) => {
    if (!isSubscribed || permission !== 'granted') return

    await mobilePushService.sendMessageNotification(
      senderName,
      message,
      channelId,
      messageId
    )
  }, [isSubscribed, permission])

  const sendMentionNotification = useCallback(async (
    senderName: string,
    message: string,
    channelId: string,
    messageId: string
  ) => {
    if (!isSubscribed || permission !== 'granted') return

    await mobilePushService.showLocalNotification({
      title: `${senderName} mentioned you`,
      body: message,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'mention',
        channelId,
        messageId,
        url: `/chat/${channelId}#${messageId}`
      },
      actions: [
        { action: 'reply', title: 'Reply' },
        { action: 'view', title: 'View' }
      ],
      requireInteraction: true,
      tag: `mention_${messageId}`
    })
  }, [isSubscribed, permission])

  return {
    sendMessageNotification,
    sendMentionNotification
  }
}

/**
 * Hook for scheduled notifications
 */
export function useScheduledNotifications() {
  const [scheduledNotifications, setScheduledNotifications] = useState<Map<string, NodeJS.Timeout>>(new Map())

  const scheduleNotification = useCallback(async (
    id: string,
    payload: PushNotificationPayload,
    scheduledTime: Date
  ) => {
    // Cancel existing notification with same ID
    const existingTimeout = scheduledNotifications.get(id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const delay = scheduledTime.getTime() - Date.now()
    
    if (delay <= 0) {
      await mobilePushService.showLocalNotification(payload)
      return
    }

    const timeout = setTimeout(async () => {
      await mobilePushService.showLocalNotification(payload)
      setScheduledNotifications(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }, delay)

    setScheduledNotifications(prev => {
      const newMap = new Map(prev)
      newMap.set(id, timeout)
      return newMap
    })
  }, [scheduledNotifications])

  const cancelScheduledNotification = useCallback((id: string) => {
    const timeout = scheduledNotifications.get(id)
    if (timeout) {
      clearTimeout(timeout)
      setScheduledNotifications(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }
  }, [scheduledNotifications])

  const cancelAllScheduledNotifications = useCallback(() => {
    scheduledNotifications.forEach(timeout => clearTimeout(timeout))
    setScheduledNotifications(new Map())
  }, [scheduledNotifications])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledNotifications.forEach(timeout => clearTimeout(timeout))
    }
  }, [scheduledNotifications])

  return {
    scheduleNotification,
    cancelScheduledNotification,
    cancelAllScheduledNotifications,
    scheduledCount: scheduledNotifications.size
  }
}

/**
 * Hook for notification analytics
 */
export function useNotificationAnalytics() {
  const [analytics, setAnalytics] = useState({
    sent: 0,
    clicked: 0,
    dismissed: 0,
    clickRate: 0
  })

  const trackNotificationSent = useCallback(() => {
    setAnalytics(prev => ({
      ...prev,
      sent: prev.sent + 1
    }))
  }, [])

  const trackNotificationClicked = useCallback(() => {
    setAnalytics(prev => {
      const clicked = prev.clicked + 1
      return {
        ...prev,
        clicked,
        clickRate: prev.sent > 0 ? (clicked / prev.sent) * 100 : 0
      }
    })
  }, [])

  const trackNotificationDismissed = useCallback(() => {
    setAnalytics(prev => ({
      ...prev,
      dismissed: prev.dismissed + 1
    }))
  }, [])

  const resetAnalytics = useCallback(() => {
    setAnalytics({
      sent: 0,
      clicked: 0,
      dismissed: 0,
      clickRate: 0
    })
  }, [])

  return {
    analytics,
    trackNotificationSent,
    trackNotificationClicked,
    trackNotificationDismissed,
    resetAnalytics
  }
}