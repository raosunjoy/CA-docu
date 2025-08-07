/**
 * Mobile Push Notifications Component
 * Comprehensive push notification management for mobile devices
 */

'use client'

import React, { useState } from 'react'
import { useMobilePush } from '@/hooks/useMobilePush'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'
import { 
  Bell, 
  BellOff, 
  Settings, 
  TestTube,
  Clock,
  Volume2,
  VolumeX,
  Smartphone,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'

interface MobilePushNotificationsProps {
  className?: string
}

export function MobilePushNotifications({ className = '' }: MobilePushNotificationsProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isSubscribing,
    preferences,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
    testNotification
  } = useMobilePush()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const handleEnableNotifications = async () => {
    try {
      if (permission === 'default') {
        const newPermission = await requestPermission()
        if (newPermission !== 'granted') return
      }
      
      if (permission === 'granted' && !isSubscribed) {
        await subscribe()
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error)
      alert('Failed to enable notifications. Please try again.')
    }
  }

  const handleDisableNotifications = async () => {
    try {
      await unsubscribe()
    } catch (error) {
      console.error('Failed to disable notifications:', error)
      alert('Failed to disable notifications. Please try again.')
    }
  }

  const handleTestNotification = async () => {
    setIsTesting(true)
    try {
      await testNotification()
    } catch (error) {
      console.error('Failed to test notification:', error)
      alert('Failed to send test notification. Please check your settings.')
    } finally {
      setIsTesting(false)
    }
  }

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreferences({ [key]: value })
  }

  const handleQuietHoursChange = (key: string, value: any) => {
    updatePreferences({
      quietHours: {
        ...preferences.quietHours,
        [key]: value
      }
    })
  }

  if (!isSupported) {
    return (
      <Alert variant="warning" className={className}>
        <AlertTriangle className="h-5 w-5" />
        <div>
          <h4 className="font-medium">Push Notifications Not Supported</h4>
          <p className="text-sm mt-1">
            Your browser or device doesn't support push notifications.
          </p>
        </div>
      </Alert>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isSubscribed ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {isSubscribed ? (
                <Bell className="h-6 w-6 text-green-600" />
              ) : (
                <BellOff className="h-6 w-6 text-gray-600" />
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-600">
                {isSubscribed 
                  ? 'You will receive important updates and reminders'
                  : 'Enable notifications to stay updated on important events'
                }
              </p>
            </div>
          </div>

          {/* Permission Status */}
          <div className="flex items-center gap-2 mb-4">
            {permission === 'granted' ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Permission granted</span>
              </>
            ) : permission === 'denied' ? (
              <>
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">Permission denied</span>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">Permission not requested</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!isSubscribed ? (
              <Button
                onClick={handleEnableNotifications}
                loading={isSubscribing}
                disabled={permission === 'denied'}
                className="flex-1"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Notifications
              </Button>
            ) : (
              <Button
                onClick={handleDisableNotifications}
                variant="outline"
                className="flex-1"
              >
                <BellOff className="h-4 w-4 mr-2" />
                Disable
              </Button>
            )}
            
            <Button
              onClick={handleTestNotification}
              loading={isTesting}
              disabled={!isSubscribed}
              variant="outline"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
          </div>

          {permission === 'denied' && (
            <Alert variant="warning" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <p className="text-sm">
                  Notifications are blocked. To enable them, please update your browser settings 
                  and refresh the page.
                </p>
              </div>
            </Alert>
          )}
        </div>
      </Card>

      {/* Notification Preferences */}
      {isSubscribed && (
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Notification Preferences
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdvanced ? 'Basic' : 'Advanced'}
              </Button>
            </div>

            <div className="space-y-4">
              {/* Category Preferences */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Categories</h4>
                <div className="space-y-3">
                  <NotificationToggle
                    label="Task Updates"
                    description="New assignments, due dates, and status changes"
                    checked={preferences.tasks}
                    onChange={(checked) => handlePreferenceChange('tasks', checked)}
                  />
                  
                  <NotificationToggle
                    label="Messages & Chat"
                    description="New messages and mentions in chat"
                    checked={preferences.messages}
                    onChange={(checked) => handlePreferenceChange('messages', checked)}
                  />
                  
                  <NotificationToggle
                    label="Deadlines & Reminders"
                    description="Upcoming deadlines and important reminders"
                    checked={preferences.deadlines}
                    onChange={(checked) => handlePreferenceChange('deadlines', checked)}
                  />
                  
                  <NotificationToggle
                    label="Mentions"
                    description="When you're mentioned in comments or discussions"
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

              {showAdvanced && (
                <>
                  {/* Sound & Vibration */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Sound & Vibration</h4>
                    <div className="space-y-3">
                      <NotificationToggle
                        label="Sound"
                        description="Play notification sounds"
                        checked={preferences.sound}
                        onChange={(checked) => handlePreferenceChange('sound', checked)}
                        icon={preferences.sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      />
                      
                      <NotificationToggle
                        label="Vibration"
                        description="Vibrate on notifications"
                        checked={preferences.vibration}
                        onChange={(checked) => handlePreferenceChange('vibration', checked)}
                        icon={<Smartphone className="h-4 w-4" />}
                      />
                      
                      <NotificationToggle
                        label="Badge"
                        description="Show notification count on app icon"
                        checked={preferences.badge}
                        onChange={(checked) => handlePreferenceChange('badge', checked)}
                        icon={<Shield className="h-4 w-4" />}
                      />
                    </div>
                  </div>

                  {/* Quiet Hours */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Quiet Hours</h4>
                    
                    <NotificationToggle
                      label="Enable Quiet Hours"
                      description="Silence notifications during specified hours"
                      checked={preferences.quietHours.enabled}
                      onChange={(checked) => handleQuietHoursChange('enabled', checked)}
                      icon={<Clock className="h-4 w-4" />}
                    />
                    
                    {preferences.quietHours.enabled && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={preferences.quietHours.start}
                            onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={preferences.quietHours.end}
                            onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Help & Information */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            About Push Notifications
          </h3>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Push notifications help you stay updated on important events even when 
              the app is closed. You can customize which types of notifications you receive.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">Privacy & Security</p>
                  <p className="text-blue-700 text-xs mt-1">
                    Notifications are sent securely and only contain necessary information. 
                    You can disable them at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
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
  icon?: React.ReactNode
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  icon
}: NotificationToggleProps) {
  return (
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3 flex-1">
        {icon && (
          <div className="text-gray-400 mt-0.5">
            {icon}
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      
      <label className="relative inline-flex items-center cursor-pointer ml-4">
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