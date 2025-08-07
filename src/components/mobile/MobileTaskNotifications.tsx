/**
 * Mobile Task Notifications Component
 * Handles task-related notifications and reminders for mobile devices
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Task } from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { 
  Bell, 
  BellOff, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  X,
  Settings,
  Calendar,
  Flag
} from 'lucide-react'

interface MobileTaskNotificationsProps {
  tasks: Task[]
  className?: string
}

interface NotificationSettings {
  enabled: boolean
  dueDateReminders: boolean
  overdueAlerts: boolean
  assignmentNotifications: boolean
  statusChangeNotifications: boolean
  reminderTiming: number // minutes before due date
}

interface TaskNotification {
  id: string
  taskId: string
  type: 'due_soon' | 'overdue' | 'assigned' | 'status_changed'
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: 'low' | 'medium' | 'high'
}

export function MobileTaskNotifications({
  tasks,
  className = ''
}: MobileTaskNotificationsProps) {
  const [notifications, setNotifications] = useState<TaskNotification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    dueDateReminders: true,
    overdueAlerts: true,
    assignmentNotifications: true,
    statusChangeNotifications: true,
    reminderTiming: 60 // 1 hour before
  })
  const [showSettings, setShowSettings] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Generate notifications based on tasks
  useEffect(() => {
    if (!settings.enabled) return

    const now = new Date()
    const newNotifications: TaskNotification[] = []

    tasks.forEach(task => {
      // Due date reminders
      if (settings.dueDateReminders && task.dueDate) {
        const dueDate = new Date(task.dueDate)
        const timeDiff = dueDate.getTime() - now.getTime()
        const minutesDiff = Math.floor(timeDiff / (1000 * 60))

        if (minutesDiff > 0 && minutesDiff <= settings.reminderTiming) {
          newNotifications.push({
            id: `due_${task.id}`,
            taskId: task.id,
            type: 'due_soon',
            title: 'Task Due Soon',
            message: `"${task.title}" is due in ${Math.floor(minutesDiff / 60)}h ${minutesDiff % 60}m`,
            timestamp: now,
            read: false,
            priority: task.priority === 'URGENT' ? 'high' : 'medium'
          })
        }
      }

      // Overdue alerts
      if (settings.overdueAlerts && task.dueDate && task.status !== 'COMPLETED') {
        const dueDate = new Date(task.dueDate)
        if (now > dueDate) {
          const overdueDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          newNotifications.push({
            id: `overdue_${task.id}`,
            taskId: task.id,
            type: 'overdue',
            title: 'Task Overdue',
            message: `"${task.title}" is ${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`,
            timestamp: now,
            read: false,
            priority: 'high'
          })
        }
      }
    })

    setNotifications(prev => {
      // Merge with existing notifications, avoiding duplicates
      const existingIds = prev.map(n => n.id)
      const filtered = newNotifications.filter(n => !existingIds.includes(n.id))
      return [...prev, ...filtered].slice(0, 50) // Keep only latest 50
    })
  }, [tasks, settings])

  // Update unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        // Show success message
        showBrowserNotification('Notifications Enabled', 'You will now receive task reminders')
      }
    }
  }

  // Show browser notification
  const showBrowserNotification = (title: string, body: string, data?: any) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data,
        requireInteraction: false,
        silent: false
      })

      notification.onclick = () => {
        window.focus()
        if (data?.taskId) {
          // Navigate to task
          window.location.href = `/tasks/${data.taskId}`
        }
        notification.close()
      }

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: TaskNotification['type']) => {
    switch (type) {
      case 'due_soon':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'assigned':
        return <Bell className="h-4 w-4 text-blue-600" />
      case 'status_changed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: TaskNotification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Notification Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          {notifications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Notification Settings */}
      {showSettings && (
        <Card>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Notification Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Enable Notifications</p>
                  <p className="text-sm text-gray-600">Receive task reminders and alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={settings.enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${
                    settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`} />
                  </div>
                </label>
              </div>

              {settings.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Due Date Reminders</p>
                      <p className="text-sm text-gray-600">Get notified before tasks are due</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={settings.dueDateReminders}
                        onChange={(e) => setSettings(prev => ({ ...prev, dueDateReminders: e.target.checked }))}
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.dueDateReminders ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          settings.dueDateReminders ? 'translate-x-5' : 'translate-x-0.5'
                        } mt-0.5`} />
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Overdue Alerts</p>
                      <p className="text-sm text-gray-600">Get alerted about overdue tasks</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={settings.overdueAlerts}
                        onChange={(e) => setSettings(prev => ({ ...prev, overdueAlerts: e.target.checked }))}
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        settings.overdueAlerts ? 'bg-blue-600' : 'bg-gray-200'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                          settings.overdueAlerts ? 'translate-x-5' : 'translate-x-0.5'
                        } mt-0.5`} />
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reminder Timing (minutes before due date)
                    </label>
                    <select
                      value={settings.reminderTiming}
                      onChange={(e) => setSettings(prev => ({ ...prev, reminderTiming: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                      <option value={1440}>1 day</option>
                    </select>
                  </div>

                  {Notification.permission === 'default' && (
                    <Button
                      onClick={requestNotificationPermission}
                      className="w-full"
                    >
                      Enable Browser Notifications
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">You're all caught up! No task reminders at the moment.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`border-l-4 ${getPriorityColor(notification.priority)} ${
                !notification.read ? 'shadow-md' : 'opacity-75'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismissNotification(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {notifications.length > 5 && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={clearAllNotifications}
              >
                Clear All Notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}