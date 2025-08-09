'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent } from '@/components/atoms/Card'
import { Modal } from '@/components/atoms/Modal'
import { SystemAlert } from '@/hooks/useSystemHealth'
import { cn } from '@/lib/utils'

interface MonitoringAlertsNotificationProps {
  alerts: SystemAlert[]
  onAlertAcknowledge?: (alertId: string) => void
  onAlertDismiss?: (alertId: string) => void
  onAlertAction?: (alertId: string, action: string) => void
  className?: string
}

interface AlertPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  slackIntegration: boolean
  severityThreshold: 'low' | 'medium' | 'high' | 'critical'
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export const MonitoringAlertsNotification: React.FC<MonitoringAlertsNotificationProps> = ({
  alerts,
  onAlertAcknowledge,
  onAlertDismiss,
  onAlertAction,
  className = ''
}) => {
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<AlertPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    slackIntegration: false,
    severityThreshold: 'medium',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  })
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')

  const getSeverityColor = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'high':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'medium':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      case 'low':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getFilteredAlerts = () => {
    if (filter === 'all') return alerts
    return alerts.filter(alert => alert.severity === filter)
  }

  const getAlertActions = (alert: SystemAlert) => {
    const actions = []
    
    if (alert.actionRequired) {
      actions.push({
        label: 'Take Action',
        action: 'resolve',
        variant: 'primary' as const
      })
    }
    
    actions.push({
      label: 'Acknowledge',
      action: 'acknowledge',
      variant: 'secondary' as const
    })
    
    actions.push({
      label: 'Dismiss',
      action: 'dismiss',
      variant: 'ghost' as const
    })
    
    return actions
  }

  const handleAlertClick = (alert: SystemAlert) => {
    setSelectedAlert(alert)
  }

  const handleAlertAction = (alertId: string, action: string) => {
    switch (action) {
      case 'acknowledge':
        onAlertAcknowledge?.(alertId)
        break
      case 'dismiss':
        onAlertDismiss?.(alertId)
        break
      default:
        onAlertAction?.(alertId, action)
    }
    setSelectedAlert(null)
  }

  const filteredAlerts = getFilteredAlerts()
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const highAlerts = alerts.filter(a => a.severity === 'high').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
          <div className="flex items-center gap-2">
            {criticalAlerts > 0 && (
              <Badge variant="destructive" size="sm">
                {criticalAlerts} Critical
              </Badge>
            )}
            {highAlerts > 0 && (
              <Badge variant="warning" size="sm">
                {highAlerts} High
              </Badge>
            )}
            {alerts.length === 0 && (
              <Badge variant="success" size="sm">
                All Clear
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreferences(true)}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setFilter(severity)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                filter === severity
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
              {severity !== 'all' && (
                <span className="ml-1 text-xs">
                  ({alerts.filter(a => a.severity === severity).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600">
              {filter === 'all' ? 'No active alerts' : `No ${filter} severity alerts`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                alert.acknowledged && 'opacity-60'
              )}
              onClick={() => handleAlertClick(alert)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full',
                      getSeverityColor(alert.severity)
                    )}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'warning' : 'secondary'
                          }
                          size="sm"
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900">
                          {alert.component}
                        </span>
                        {alert.acknowledged && (
                          <Badge variant="outline" size="sm">
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                      
                      {alert.actionRequired && (
                        <p className="text-xs text-blue-600 font-medium">
                          Action Required: {alert.actionRequired}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 ml-4">
                    {alert.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAlert(null)}
          size="md"
        >
          <div className="p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full',
                getSeverityColor(selectedAlert.severity)
              )}>
                {getSeverityIcon(selectedAlert.severity)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={
                      selectedAlert.severity === 'critical' ? 'destructive' :
                      selectedAlert.severity === 'high' ? 'warning' : 'secondary'
                    }
                  >
                    {selectedAlert.severity.toUpperCase()}
                  </Badge>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedAlert.component}
                  </h3>
                </div>
                
                <p className="text-gray-700 mb-4">{selectedAlert.message}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Alert ID:</span>
                    <span className="ml-2 text-gray-600 font-mono">{selectedAlert.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Timestamp:</span>
                    <span className="ml-2 text-gray-600">{selectedAlert.timestamp.toLocaleString()}</span>
                  </div>
                </div>
                
                {selectedAlert.actionRequired && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-1">Recommended Action</h4>
                    <p className="text-sm text-blue-700">{selectedAlert.actionRequired}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              {getAlertActions(selectedAlert).map((action) => (
                <Button
                  key={action.action}
                  variant={action.variant}
                  onClick={() => handleAlertAction(selectedAlert.id, action.action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <Modal
          isOpen={true}
          onClose={() => setShowPreferences(false)}
          size="md"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Alert Preferences</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Notification Channels</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        emailNotifications: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.pushNotifications}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        pushNotifications: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Push Notifications</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.slackIntegration}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        slackIntegration: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Slack Integration</span>
                  </label>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Severity Threshold</h4>
                <select
                  value={preferences.severityThreshold}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    severityThreshold: e.target.value as AlertPreferences['severityThreshold']
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low and above</option>
                  <option value="medium">Medium and above</option>
                  <option value="high">High and above</option>
                  <option value="critical">Critical only</option>
                </select>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Quiet Hours</h4>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={preferences.quietHours.enabled}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      quietHours: { ...prev.quietHours, enabled: e.target.checked }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable quiet hours</span>
                </label>
                
                {preferences.quietHours.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                      <input
                        type="time"
                        value={preferences.quietHours.start}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, start: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                      <input
                        type="time"
                        value={preferences.quietHours.end}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          quietHours: { ...prev.quietHours, end: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button variant="ghost" onClick={() => setShowPreferences(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowPreferences(false)}>
                Save Preferences
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default MonitoringAlertsNotification