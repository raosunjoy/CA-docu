/**
 * Session Manager Component
 * Provides comprehensive session and device management interface
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Alert } from '@/components/common/Alert'

interface SessionInfo {
  id: string
  deviceId: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  location?: {
    country: string
    region: string
    city: string
  }
  isTrustedDevice: boolean
  createdAt: string
  lastAccessedAt: string
  expiresAt: string
  metadata: Record<string, any>
}

interface DeviceInfo {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os: string
  browser: string
  isTrusted: boolean
  trustGrantedAt?: string
  trustExpiresAt?: string
  lastSeenAt: string
  locations: Array<{
    country: string
    region: string
    city: string
    timestamp: string
  }>
}

interface SessionManagerProps {
  className?: string
  userId?: string
}

export function SessionManager({ className = '', userId }: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null)

  // Load session and device data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)

      const response = await fetch(`/api/security/sessions?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load session data')
      }

      setSessions(data.data.sessions)
      setDevices(data.data.devices)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session data')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadData()
  }, [userId])

  // Terminate session
  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate',
          sessionId,
          reason: 'user_request',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to terminate session')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate session')
    } finally {
      setLoading(false)
    }
  }

  // Terminate all sessions
  const handleTerminateAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate ALL sessions? You will be logged out.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'terminate_all',
          reason: 'user_request',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to terminate sessions')
      }

      // Redirect to login after terminating all sessions
      window.location.href = '/login'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to terminate sessions')
      setLoading(false)
    }
  }

  // Grant device trust
  const handleGrantDeviceTrust = async (deviceId: string) => {
    if (!confirm('Are you sure you want to trust this device?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant_device_trust',
          deviceId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to grant device trust')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant device trust')
    } finally {
      setLoading(false)
    }
  }

  // Revoke device trust
  const handleRevokeDeviceTrust = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke trust from this device? All sessions on this device will be terminated.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/security/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_device_trust',
          deviceId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to revoke device trust')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke device trust')
    } finally {
      setLoading(false)
    }
  }

  // Get device type icon
  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z" />
          </svg>
        )
      case 'tablet':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  // Get trust status color
  const getTrustStatusColor = (isTrusted: boolean) => {
    return isTrusted ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
  }

  // Format location
  const formatLocation = (location?: { country: string; region: string; city: string }) => {
    if (!location) return 'Unknown'
    return `${location.city}, ${location.region}, ${location.country}`
  }

  // Parse user agent
  const parseUserAgent = (userAgent: string) => {
    // Simplified user agent parsing
    let browser = 'Unknown'
    let os = 'Unknown'

    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Macintosh')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('iPhone')) os = 'iOS'
    else if (userAgent.includes('Android')) os = 'Android'

    return { browser, os }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Session & Device Management</h2>
        <div className="flex gap-2">
          <Button onClick={loadData} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleTerminateAllSessions}
            disabled={loading}
            className="text-red-600 hover:text-red-700"
          >
            Terminate All Sessions
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Active Sessions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h3>
        
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No active sessions found</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const { browser, os } = parseUserAgent(session.userAgent)
              const isCurrentSession = session.metadata?.isCurrent

              return (
                <div
                  key={session.id}
                  className={`border rounded-lg p-4 ${isCurrentSession ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getDeviceTypeIcon('desktop')}
                        <span className="font-medium text-gray-900">
                          {browser} on {os}
                        </span>
                        {isCurrentSession && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Current Session
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrustStatusColor(session.isTrustedDevice)}`}>
                          {session.isTrustedDevice ? 'Trusted' : 'Untrusted'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">IP Address:</span> {session.ipAddress}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {formatLocation(session.location)}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(session.createdAt).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Last Active:</span> {new Date(session.lastAccessedAt).toLocaleString()}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {new Date(session.expiresAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSession(session)}
                      >
                        Details
                      </Button>
                      {!isCurrentSession && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTerminateSession(session.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Terminate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Trusted Devices */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Devices</h3>
        
        {devices.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No devices found</p>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getDeviceTypeIcon(device.type)}
                      <span className="font-medium text-gray-900">{device.name}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrustStatusColor(device.isTrusted)}`}>
                        {device.isTrusted ? 'Trusted' : 'Untrusted'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Type:</span> {device.type}
                      </div>
                      <div>
                        <span className="font-medium">OS:</span> {device.os}
                      </div>
                      <div>
                        <span className="font-medium">Browser:</span> {device.browser}
                      </div>
                      <div>
                        <span className="font-medium">Last Seen:</span> {new Date(device.lastSeenAt).toLocaleString()}
                      </div>
                      {device.isTrusted && device.trustExpiresAt && (
                        <div>
                          <span className="font-medium">Trust Expires:</span> {new Date(device.trustExpiresAt).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {device.locations.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium text-gray-600">Recent Locations:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {device.locations.slice(0, 3).map((location, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                            >
                              {formatLocation(location)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDevice(device)}
                    >
                      Details
                    </Button>
                    {device.isTrusted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevokeDeviceTrust(device.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Revoke Trust
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleGrantDeviceTrust(device.id)}
                      >
                        Trust Device
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Session Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Session ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedSession.id}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Device Fingerprint</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedSession.deviceFingerprint}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSession.ipAddress}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trusted Device</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrustStatusColor(selectedSession.isTrustedDevice)}`}>
                      {selectedSession.isTrustedDevice ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="mt-1 text-sm text-gray-900 break-all">{selectedSession.userAgent}</p>
                </div>

                {selectedSession.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{formatLocation(selectedSession.location)}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedSession.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Active</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedSession.lastAccessedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Expires</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedSession.expiresAt).toLocaleString()}</p>
                </div>

                {Object.keys(selectedSession.metadata).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Metadata</label>
                    <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedSession.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Details Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Device Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDevice(null)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Device Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDevice.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedDevice.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Operating System</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.os}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Browser</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedDevice.browser}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trust Status</label>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTrustStatusColor(selectedDevice.isTrusted)}`}>
                      {selectedDevice.isTrusted ? 'Trusted' : 'Untrusted'}
                    </span>
                  </div>
                </div>

                {selectedDevice.isTrusted && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedDevice.trustGrantedAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Trust Granted</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedDevice.trustGrantedAt).toLocaleString()}</p>
                      </div>
                    )}
                    {selectedDevice.trustExpiresAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Trust Expires</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedDevice.trustExpiresAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Seen</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedDevice.lastSeenAt).toLocaleString()}</p>
                </div>

                {selectedDevice.locations.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location History</label>
                    <div className="mt-2 space-y-2">
                      {selectedDevice.locations.map((location, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{formatLocation(location)}</span>
                          <span className="text-gray-500">{new Date(location.timestamp).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionManager