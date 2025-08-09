'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent } from '@/components/atoms/Card'
import { useSync } from '@/hooks/useSync'
import { cn } from '@/lib/utils'

interface SyncNotification {
  id: string
  type: 'status' | 'conflict' | 'progress' | 'completion' | 'error'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: Date
  read: boolean
  persistent: boolean
  actions?: NotificationAction[]
  metadata?: {
    operationId?: string
    conflictId?: string
    progress?: number
    errorCode?: string
    resourceType?: string
    resourceId?: string
  }
}

interface NotificationAction {
  id: string
  label: string
  type: 'primary' | 'secondary' | 'destructive'
  action: () => void
}

interface NotificationPreferences {
  enableDesktopNotifications: boolean
  enableSoundAlerts: boolean
  showProgressNotifications: boolean
  showCompletionNotifications: boolean
  showErrorNotifications: boolean
  showConflictNotifications: boolean
  minimumPriority: 'low' | 'medium' | 'high' | 'critical'
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  groupSimilarNotifications: boolean
  autoHideAfter: number // seconds, 0 = never
}

interface OfflineSyncNotificationSystemProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxVisible?: number
  className?: string
}

export const OfflineSyncNotificationSystem: React.FC<OfflineSyncNotificationSystemProps> = ({
  position = 'top-right',
  maxVisible = 5,
  className = ''
}) => {
  const { 
    isOnline, 
    isSyncing, 
    syncProgress, 
    conflicts, 
    errors, 
    pendingOperations,
    lastSyncAt 
  } = useSync()

  const [notifications, setNotifications] = useState<SyncNotification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enableDesktopNotifications: true,
    enableSoundAlerts: false,
    showProgressNotifications: true,
    showCompletionNotifications: true,
    showErrorNotifications: true,
    showConflictNotifications: true,
    minimumPriority: 'medium',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    groupSimilarNotifications: true,
    autoHideAfter: 10
  })
  const [showPreferences, setShowPreferences] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)

  // Initialize sound
  useEffect(() => {
    if (preferences.enableSoundAlerts && !soundEnabled) {
      setSoundEnabled(true)
    }
  }, [preferences.enableSoundAlerts, soundEnabled])

  // Monitor sync state changes
  useEffect(() => {
    handleSyncStateChange()
  }, [isOnline, isSyncing, syncProgress, conflicts, errors, pendingOperations])

  const handleSyncStateChange = () => {
    const now = new Date()
    
    // Online/Offline status notifications
    if (!isOnline && !notifications.some(n => n.type === 'status' && n.message.includes('offline'))) {
      addNotification({
        type: 'status',
        priority: 'medium',
        title: 'Connection Lost',
        message: 'You are now offline. Changes will be synced when connection is restored.',
        persistent: true,
        actions: [
          {
            id: 'retry-connection',
            label: 'Retry Connection',
            type: 'primary',
            action: () => window.location.reload()
          }
        ]
      })
    } else if (isOnline && notifications.some(n => n.type === 'status' && n.message.includes('offline'))) {
      // Remove offline notification and add online notification
      setNotifications(prev => prev.filter(n => !(n.type === 'status' && n.message.includes('offline'))))
      
      addNotification({
        type: 'status',
        priority: 'low',
        title: 'Connection Restored',
        message: 'You are back online. Syncing pending changes...',
        persistent: false
      })
    }

    // Sync progress notifications
    if (isSyncing && preferences.showProgressNotifications) {
      const existingProgressNotification = notifications.find(n => 
        n.type === 'progress' && n.metadata?.operationId === 'sync-progress'
      )
      
      if (existingProgressNotification) {
        // Update existing progress notification
        setNotifications(prev => prev.map(n => 
          n.id === existingProgressNotification.id
            ? {
                ...n,
                message: `Syncing ${pendingOperations} operations... ${syncProgress}% complete`,
                metadata: { ...n.metadata, progress: syncProgress },
                timestamp: now
              }
            : n
        ))
      } else {
        addNotification({
          type: 'progress',
          priority: 'low',
          title: 'Sync in Progress',
          message: `Syncing ${pendingOperations} operations... ${syncProgress}% complete`,
          persistent: true,
          metadata: {
            operationId: 'sync-progress',
            progress: syncProgress
          }
        })
      }
    } else if (!isSyncing) {
      // Remove progress notifications when sync completes
      setNotifications(prev => prev.filter(n => !(n.type === 'progress' && n.metadata?.operationId === 'sync-progress')))
      
      // Add completion notification if sync just finished
      if (preferences.showCompletionNotifications && lastSyncAt && 
          (now.getTime() - lastSyncAt.getTime()) < 5000) { // Within last 5 seconds
        addNotification({
          type: 'completion',
          priority: 'low',
          title: 'Sync Complete',
          message: `Successfully synced all changes. Last sync: ${lastSyncAt.toLocaleTimeString()}`,
          persistent: false
        })
      }
    }

    // Conflict notifications
    if (conflicts > 0 && preferences.showConflictNotifications) {
      const existingConflictNotification = notifications.find(n => 
        n.type === 'conflict' && n.metadata?.conflictId === 'sync-conflicts'
      )
      
      if (!existingConflictNotification) {
        addNotification({
          type: 'conflict',
          priority: 'high',
          title: 'Sync Conflicts Detected',
          message: `${conflicts} conflict${conflicts > 1 ? 's' : ''} require${conflicts === 1 ? 's' : ''} your attention`,
          persistent: true,
          metadata: {
            conflictId: 'sync-conflicts'
          },
          actions: [
            {
              id: 'resolve-conflicts',
              label: 'Resolve Conflicts',
              type: 'primary',
              action: () => {
                // This would open the conflict resolver
                console.log('Opening conflict resolver')
              }
            },
            {
              id: 'ignore-conflicts',
              label: 'Ignore',
              type: 'secondary',
              action: () => {
                removeNotification('sync-conflicts')
              }
            }
          ]
        })
      }
    } else if (conflicts === 0) {
      // Remove conflict notifications when resolved
      setNotifications(prev => prev.filter(n => !(n.type === 'conflict' && n.metadata?.conflictId === 'sync-conflicts')))
    }

    // Error notifications
    if (errors > 0 && preferences.showErrorNotifications) {
      const existingErrorNotification = notifications.find(n => 
        n.type === 'error' && n.metadata?.errorCode === 'sync-errors'
      )
      
      if (!existingErrorNotification) {
        addNotification({
          type: 'error',
          priority: 'critical',
          title: 'Sync Errors',
          message: `${errors} operation${errors > 1 ? 's' : ''} failed to sync. Check your connection and try again.`,
          persistent: true,
          metadata: {
            errorCode: 'sync-errors'
          },
          actions: [
            {
              id: 'retry-sync',
              label: 'Retry Sync',
              type: 'primary',
              action: () => {
                // This would retry failed operations
                console.log('Retrying sync')
              }
            },
            {
              id: 'view-errors',
              label: 'View Details',
              type: 'secondary',
              action: () => {
                // This would show error details
                console.log('Viewing error details')
              }
            }
          ]
        })
      }
    }
  }

  const addNotification = (notification: Omit<SyncNotification, 'id' | 'timestamp' | 'read'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: SyncNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false
    }

    // Check if we should show this notification based on preferences
    if (!shouldShowNotification(newNotification)) {
      return
    }

    setNotifications(prev => {
      let updated = [...prev, newNotification]
      
      // Group similar notifications if enabled
      if (preferences.groupSimilarNotifications) {
        updated = groupSimilarNotifications(updated)
      }
      
      // Limit visible notifications
      if (updated.length > maxVisible) {
        updated = updated.slice(-maxVisible)
      }
      
      return updated
    })

    // Show desktop notification if enabled
    if (preferences.enableDesktopNotifications && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(newNotification.title, {
          body: newNotification.message,
          icon: '/favicon.ico',
          tag: newNotification.id
        })
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/favicon.ico',
              tag: newNotification.id
            })
          }
        })
      }
    }

    // Play sound if enabled
    if (preferences.enableSoundAlerts && soundEnabled) {
      playNotificationSound(newNotification.priority)
    }

    // Auto-hide notification if configured
    if (!newNotification.persistent && preferences.autoHideAfter > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, preferences.autoHideAfter * 1000)
    }
  }

  const shouldShowNotification = (notification: SyncNotification): boolean => {
    // Check minimum priority
    const priorityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    if (priorityLevels[notification.priority] < priorityLevels[preferences.minimumPriority]) {
      return false
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date()
      const currentTime = now.getHours() * 100 + now.getMinutes()
      const startTime = parseInt(preferences.quietHours.start.replace(':', ''))
      const endTime = parseInt(preferences.quietHours.end.replace(':', ''))
      
      if (startTime <= endTime) {
        // Same day quiet hours
        if (currentTime >= startTime && currentTime <= endTime) {
          return notification.priority === 'critical'
        }
      } else {
        // Overnight quiet hours
        if (currentTime >= startTime || currentTime <= endTime) {
          return notification.priority === 'critical'
        }
      }
    }

    return true
  }

  const groupSimilarNotifications = (notifications: SyncNotification[]): SyncNotification[] => {
    const grouped = new Map<string, SyncNotification[]>()
    
    notifications.forEach(notification => {
      const key = `${notification.type}-${notification.title}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(notification)
    })

    const result: SyncNotification[] = []
    
    grouped.forEach((group, key) => {
      if (group.length === 1) {
        result.push(group[0])
      } else {
        // Create a grouped notification
        const latest = group[group.length - 1]
        const count = group.length
        
        result.push({
          ...latest,
          title: `${latest.title} (${count})`,
          message: `${count} similar notifications. Latest: ${latest.message}`,
          id: `grouped-${key}-${Date.now()}`
        })
      }
    })
    
    return result
  }

  const playNotificationSound = (priority: SyncNotification['priority']) => {
    // In a real implementation, you would play different sounds based on priority
    // For now, we'll just use the browser's default notification sound
    const audio = new Audio('/notification-sound.mp3')
    audio.volume = priority === 'critical' ? 0.8 : 0.5
    audio.play().catch(() => {
      // Ignore audio play errors (user might not have interacted with page yet)
    })
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: SyncNotification['type']) => {
    switch (type) {
      case 'status':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'conflict':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'progress':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'completion':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          </svg>
        )
    }
  }

  const getPriorityColor = (priority: SyncNotification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      default:
        return 'top-4 right-4'
    }
  }

  const visibleNotifications = notifications.slice(-maxVisible)

  return (
    <>
      {/* Notification Container */}
      <div className={cn(
        'fixed z-50 space-y-2 w-80',
        getPositionClasses(),
        className
      )}>
        {visibleNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={cn(
              'transition-all duration-300 transform',
              'animate-in slide-in-from-right-full',
              getPriorityColor(notification.priority),
              !notification.read && 'shadow-lg'
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex-shrink-0 mt-0.5',
                  notification.priority === 'critical' ? 'text-red-600' :
                  notification.priority === 'high' ? 'text-orange-600' :
                  notification.priority === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                )}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge 
                        variant={
                          notification.priority === 'critical' ? 'destructive' :
                          notification.priority === 'high' ? 'warning' : 'secondary'
                        }
                        size="sm"
                      >
                        {notification.priority}
                      </Badge>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-2">
                    {notification.message}
                  </p>
                  
                  {notification.metadata?.progress !== undefined && (
                    <div className="mb-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${notification.metadata.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {notification.actions.map((action) => (
                        <Button
                          key={action.id}
                          variant={
                            action.type === 'primary' ? 'primary' :
                            action.type === 'destructive' ? 'destructive' : 'outline'
                          }
                          size="sm"
                          onClick={() => {
                            action.action()
                            if (!notification.persistent) {
                              removeNotification(notification.id)
                            }
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{notification.timestamp.toLocaleTimeString()}</span>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="hover:text-gray-700"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Clear All Button */}
        {visibleNotifications.length > 1 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Notification Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notification Preferences
                </h3>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
                  <div className="space-y-2">
                    {[
                      { key: 'showProgressNotifications', label: 'Progress Updates' },
                      { key: 'showCompletionNotifications', label: 'Completion Alerts' },
                      { key: 'showErrorNotifications', label: 'Error Notifications' },
                      { key: 'showConflictNotifications', label: 'Conflict Alerts' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences[key as keyof NotificationPreferences] as boolean}
                          onChange={(e) => setPreferences(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Delivery Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.enableDesktopNotifications}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          enableDesktopNotifications: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Desktop Notifications</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.enableSoundAlerts}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          enableSoundAlerts: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Sound Alerts</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Priority
                  </label>
                  <select
                    value={preferences.minimumPriority}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      minimumPriority: e.target.value as any
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low and above</option>
                    <option value="medium">Medium and above</option>
                    <option value="high">High and above</option>
                    <option value="critical">Critical only</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowPreferences(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowPreferences(false)}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default OfflineSyncNotificationSystem