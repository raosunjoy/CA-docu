/**
 * Cross-Device Sync Manager Component
 * Manages synchronization across multiple devices
 */

'use client'

import React, { useState } from 'react'
import { useCrossDeviceSync, useSyncConflicts } from '@/hooks/useCrossDeviceSync'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Sync,
  X,
  Check,
  Merge
} from 'lucide-react'

interface CrossDeviceSyncManagerProps {
  className?: string
}

export function CrossDeviceSyncManager({ className = '' }: CrossDeviceSyncManagerProps) {
  const {
    isConnected,
    isOnline,
    connectedDevices,
    lastSyncTime,
    syncNow,
    removeDevice,
    loadConnectedDevices
  } = useCrossDeviceSync()

  const { pendingConflicts, conflictCount } = useSyncConflicts()
  const [isLoading, setIsLoading] = useState(false)
  const [showConflicts, setShowConflicts] = useState(false)

  const handleSyncNow = async () => {
    setIsLoading(true)
    try {
      await syncNow()
      await loadConnectedDevices()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    if (confirm(`Remove "${deviceName}" from sync?`)) {
      try {
        await removeDevice(deviceId)
      } catch (error) {
        console.error('Failed to remove device:', error)
        alert('Failed to remove device. Please try again.')
      }
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'tablet':
        return <Tablet className="h-5 w-5" />
      case 'desktop':
      default:
        return <Monitor className="h-5 w-5" />
    }
  }

  const getConnectionStatus = () => {
    if (!isOnline) {
      return { icon: <WifiOff className="h-4 w-4 text-red-500" />, text: 'Offline', color: 'text-red-700' }
    }
    if (isConnected) {
      return { icon: <Wifi className="h-4 w-4 text-green-500" />, text: 'Connected', color: 'text-green-700' }
    }
    return { icon: <Clock className="h-4 w-4 text-yellow-500" />, text: 'Connecting...', color: 'text-yellow-700' }
  }

  const status = getConnectionStatus()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sync Status */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Sync className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Cross-Device Sync</h3>
                <div className="flex items-center gap-2">
                  {status.icon}
                  <span className={`text-sm ${status.color}`}>{status.text}</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleSyncNow}
              loading={isLoading}
              disabled={!isOnline}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>

          {lastSyncTime && (
            <p className="text-sm text-gray-600">
              Last synced: {lastSyncTime.toLocaleString()}
            </p>
          )}

          {/* Conflict Alert */}
          {conflictCount > 0 && (
            <Alert variant="warning" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium">
                  {conflictCount} sync conflict{conflictCount !== 1 ? 's' : ''} need{conflictCount === 1 ? 's' : ''} resolution
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConflicts(true)}
                  className="mt-2"
                >
                  Resolve Conflicts
                </Button>
              </div>
            </Alert>
          )}
        </div>
      </Card>

      {/* Connected Devices */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Connected Devices</h3>
            <span className="text-sm text-gray-600">
              {connectedDevices.length} device{connectedDevices.length !== 1 ? 's' : ''}
            </span>
          </div>

          {connectedDevices.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No other devices connected</p>
              <p className="text-sm text-gray-500 mt-1">
                Sign in on other devices to sync your data
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {getDeviceIcon(device.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{device.platform}</span>
                        <span>•</span>
                        <span>{device.browser}</span>
                        {device.isOnline ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            Offline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Last active: {device.lastActive.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveDevice(device.id, device.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Sync Settings */}
      <Card>
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Sync Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Auto Sync</p>
                <p className="text-sm text-gray-600">Automatically sync data across devices</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  defaultChecked={true}
                />
                <div className="w-11 h-6 bg-blue-600 rounded-full">
                  <div className="w-5 h-5 bg-white rounded-full shadow transform translate-x-5 mt-0.5" />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sync Preferences</p>
                <p className="text-sm text-gray-600">Sync app settings and preferences</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  defaultChecked={true}
                />
                <div className="w-11 h-6 bg-blue-600 rounded-full">
                  <div className="w-5 h-5 bg-white rounded-full shadow transform translate-x-5 mt-0.5" />
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sync Cache</p>
                <p className="text-sm text-gray-600">Sync cached data for offline access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  defaultChecked={false}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full">
                  <div className="w-5 h-5 bg-white rounded-full shadow transform translate-x-0.5 mt-0.5" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Conflict Resolution Modal */}
      {showConflicts && (
        <SyncConflictModal
          conflicts={pendingConflicts}
          onClose={() => setShowConflicts(false)}
        />
      )}
    </div>
  )
}

/**
 * Sync Conflict Resolution Modal
 */
interface SyncConflictModalProps {
  conflicts: any[]
  onClose: () => void
}

function SyncConflictModal({ conflicts, onClose }: SyncConflictModalProps) {
  const { resolveWithLocal, resolveWithRemote, resolveWithMerge } = useSyncConflicts()
  const [resolvingConflicts, setResolvingConflicts] = useState<Set<string>>(new Set())

  const handleResolve = async (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => {
    setResolvingConflicts(prev => new Set(prev).add(conflictId))
    
    try {
      switch (resolution) {
        case 'local':
          await resolveWithLocal(conflictId)
          break
        case 'remote':
          await resolveWithRemote(conflictId)
          break
        case 'merge':
          await resolveWithMerge(conflictId, mergedData)
          break
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      alert('Failed to resolve conflict. Please try again.')
    } finally {
      setResolvingConflicts(prev => {
        const newSet = new Set(prev)
        newSet.delete(conflictId)
        return newSet
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Resolve Sync Conflicts
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {conflicts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">All conflicts resolved!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <h3 className="font-medium text-gray-900">
                      {conflict.type} conflict
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <h4 className="font-medium text-blue-900 mb-2">This Device</h4>
                      <pre className="text-xs text-blue-800 overflow-auto">
                        {JSON.stringify(conflict.localData, null, 2)}
                      </pre>
                      <p className="text-xs text-blue-600 mt-2">
                        {conflict.localTimestamp.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <h4 className="font-medium text-green-900 mb-2">Other Device</h4>
                      <pre className="text-xs text-green-800 overflow-auto">
                        {JSON.stringify(conflict.remoteData, null, 2)}
                      </pre>
                      <p className="text-xs text-green-600 mt-2">
                        {conflict.remoteTimestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(conflict.id, 'local')}
                      loading={resolvingConflicts.has(conflict.id)}
                      disabled={resolvingConflicts.has(conflict.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Use This Device
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(conflict.id, 'remote')}
                      loading={resolvingConflicts.has(conflict.id)}
                      disabled={resolvingConflicts.has(conflict.id)}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Use Other Device
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(conflict.id, 'merge')}
                      loading={resolvingConflicts.has(conflict.id)}
                      disabled={resolvingConflicts.has(conflict.id)}
                    >
                      <Merge className="h-3 w-3 mr-1" />
                      Merge Both
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}