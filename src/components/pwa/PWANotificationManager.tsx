/**
 * PWA Notification Manager Component
 * Handles push notification setup and management
 */

'use client'

import React, { useState } from 'react'
import { usePWANotifications } from '@/hooks/usePWA'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'
import { Bell, BellOff, Settings, Check, X } from 'lucide-react'

interface PWANotificationManagerProps {
  className?: string
  showPermissionPrompt?: boolean
}

export function PWANotificationManager({
  className = '',
  showPermissionPrompt = true
}: PWANotificationManagerProps) {
  const {
    permission,
    isSubscribed,
    isSubscribing,
    requestPermission,
    subscribe,
    unsubscribe
  } = usePWANotifications()

  const [showSettings, setShowSettings] = useState(false)

  const handleEnableNotifications = async () => {
    try {
      if (permission === 'default') {
        const newPermission = await requestPermission()
        if (newPermission !== 'granted') {
          return
        }
      }
      
      if (permission === 'granted' && !isSubscribed) {
        await subscribe()
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
    }
  }

  const handleDisableNotifications = async () => {
    try {
      await unsubscribe()
    } catch (error) {
      console.error('Failed to disable notifications:', error)
    }
  }

  if (permission === 'denied') {
    return (
      <Alert variant="warning" className={className}>
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-1">
              Notifications Blocked
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              Notifications are currently blocked. To enable them, please update your browser settings.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-3 w-3 mr-1" />
              Browser Settings
            </Button>
          </div>
        </div>
      </Alert>
    )
  }

  if (permission === 'default' && showPermissionPrompt) {
    return (
      <Card className={className}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                Stay Updated
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Enable notifications to get instant updates about tasks, messages, and important deadlines.
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEnableNotifications}
                  loading={isSubscribing}
                >
                  <Bell className="h-3 w-3 mr-1" />
                  Enable Notifications
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Not Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">Push Notifications</h3>
            <p className="text-sm text-gray-600">
              Get notified about important updates
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSubscribed ? (
            <>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Enabled</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisableNotifications}
              >
                Disable
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <X className="h-4 w-4" />
                <span>Disabled</span>
              </div>
              <Button
                size="sm"
                onClick={handleEnableNotifications}
                loading={isSubscribing}
              >
                Enable
              </Button>
            </>
          )}
        </div>
      </div>

      {isSubscribed && (
        <NotificationPreferences />
      )}
    </div>
  )
}

/**
 * Notification Preferences Component
 */
function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    tasks: true,
    messages: true,
    deadlines: true,
    mentions: true,
    emails: false,
    marketing: false
  })

  const handlePreferenceChange = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
    
    // TODO: Save preferences to server
    // await updateNotificationPreferences({ [key]: value })
  }

  return (
    <Card>
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">
          Notification Preferences
        </h4>
        
        <div className="space-y-3">
          <NotificationToggle
            label="Task Updates"
            description="When tasks are assigned or updated"
            checked={preferences.tasks}
            onChange={(checked) => handlePreferenceChange('tasks', checked)}
          />
          
          <NotificationToggle
            label="Messages"
            description="New chat messages and mentions"
            checked={preferences.messages}
            onChange={(checked) => handlePreferenceChange('messages', checked)}
          />
          
          <NotificationToggle
            label="Deadlines"
            description="Upcoming task and project deadlines"
            checked={preferences.deadlines}
            onChange={(checked) => handlePreferenceChange('deadlines', checked)}
          />
          
          <NotificationToggle
            label="Mentions"
            description="When you're mentioned in comments"
            checked={preferences.mentions}
            onChange={(checked) => handlePreferenceChange('mentions', checked)}
          />
          
          <NotificationToggle
            label="Email Updates"
            description="New emails and email-to-task conversions"
            checked={preferences.emails}
            onChange={(checked) => handlePreferenceChange('emails', checked)}
          />
        </div>
      </div>
    </Card>
  )
}

/**
 * Notification Toggle Component
 */
interface NotificationToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-600">{description}</p>
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          } mt-0.5`} />
        </div>
      </label>
    </div>
  )
}

/**
 * PWA Notification Status - Simple status indicator
 */
export function PWANotificationStatus({ className = '' }: { className?: string }) {
  const { permission, isSubscribed } = usePWANotifications()

  if (permission === 'denied') {
    return (
      <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <BellOff className="h-4 w-4" />
        <span>Notifications Blocked</span>
      </div>
    )
  }

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
        <Bell className="h-4 w-4" />
        <span>Notifications Enabled</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <BellOff className="h-4 w-4" />
      <span>Notifications Disabled</span>
    </div>
  )
}