// Notifications Hook
// Manages notifications and notification preferences

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from './useWebSocket'
import type { NotificationData } from '../lib/websocket-server'
import type { NotificationRecord, NotificationPreferences } from '../lib/notification-service'

interface UseNotificationsReturn {
  notifications: NotificationRecord[]
  unreadCount: number
  loading: boolean
  error: string | null
  preferences: NotificationPreferences | null
  hasMore: boolean
  loadMore: () => Promise<void>
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotifications: (notificationIds: string[]) => Promise<void>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>
  refetch: () => Promise<void>
  requestNotificationPermission: () => Promise<boolean>
  showDesktopNotification: (notification: NotificationData) => void
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const { onNotification } = useWebSocket()

  // Fetch notifications
  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      setError(null)

      const currentOffset = reset ? 0 : offset
      const params = new URLSearchParams({
        limit: '20',
        offset: currentOffset.toString()
      })

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const result = await response.json()
      if (result.success) {
        const newNotifications = result.data as NotificationRecord[]
        
        if (reset) {
          setNotifications(newNotifications)
          setOffset(newNotifications.length)
        } else {
          setNotifications(prev => [...prev, ...newNotifications])
          setOffset(prev => prev + newNotifications.length)
        }

        setUnreadCount(result.meta?.unreadCount || 0)
        setHasMore(result.meta?.pagination?.hasMore || false)
      } else {
        throw new Error(result.error?.message || 'Failed to fetch notifications')
      }

    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [offset])

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPreferences(result.data)
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }, [])

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchNotifications(false)
  }, [fetchNotifications, hasMore, loading])

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.map(notification => 
          notificationIds.includes(notification.id)
            ? { ...notification, read: true }
            : notification
        ))
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length))
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.map(notification => ({ ...notification, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [])

  // Delete notifications
  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ notificationIds })
      })

      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.filter(notification => 
          !notificationIds.includes(notification.id)
        ))
        
        // Update unread count for deleted unread notifications
        const deletedUnreadCount = notifications.filter(n => 
          notificationIds.includes(n.id) && !n.read
        ).length
        setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount))
      }
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }, [notifications])

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(newPreferences)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setPreferences(result.data)
        }
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
    }
  }, [])

  // Refetch notifications
  const refetch = useCallback(async () => {
    setOffset(0)
    await fetchNotifications(true)
  }, [fetchNotifications])

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: NotificationData) => {
    if (!preferences?.desktopNotifications) return
    if (Notification.permission !== 'granted') return

    const desktopNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      requireInteraction: false,
      silent: !preferences.soundEnabled
    })

    // Auto-close after 5 seconds
    setTimeout(() => {
      desktopNotification.close()
    }, 5000)

    // Handle click
    desktopNotification.onclick = () => {
      window.focus()
      desktopNotification.close()
      
      // Navigate to relevant page based on notification type
      if (notification.data?.channelId) {
        window.location.href = `/chat?channel=${notification.data.channelId}`
      } else if (notification.data?.taskId) {
        window.location.href = `/tasks/${notification.data.taskId}`
      } else if (notification.data?.documentId) {
        window.location.href = `/documents/${notification.data.documentId}`
      }
    }
  }, [preferences])

  // Handle real-time notifications
  useEffect(() => {
    const unsubscribe = onNotification((notification) => {
      // Add to notifications list
      setNotifications(prev => [notification as any, ...prev])
      
      // Update unread count
      setUnreadCount(prev => prev + 1)
      
      // Show desktop notification
      showDesktopNotification(notification)
    })

    return unsubscribe
  }, [onNotification, showDesktopNotification])

  // Initial fetch
  useEffect(() => {
    fetchNotifications(true)
    fetchPreferences()
  }, [fetchNotifications, fetchPreferences])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    updatePreferences,
    refetch,
    requestNotificationPermission,
    showDesktopNotification
  }
}