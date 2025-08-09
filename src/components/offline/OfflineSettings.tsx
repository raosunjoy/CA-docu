// Offline Settings Component - Configure offline behavior and preferences
'use client'

import React, { useState, useEffect } from 'react'
import { offlineStorage } from '@/lib/offline-storage'
import { Button } from '@/components/common/Button'

interface OfflineSettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface UserPreferences {
  userId: string
  cacheStrategy: 'aggressive' | 'balanced' | 'minimal'
  maxCacheSize: number // MB
  offlineRetentionDays: number
  syncOnWifi: boolean
  syncOnMobile: boolean
  autoDownloadDocuments: boolean
  maxDocumentSize: number // MB
}

export function OfflineSettings({ isOpen, onClose }: OfflineSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    userId: '',
    cacheStrategy: 'balanced',
    maxCacheSize: 100,
    offlineRetentionDays: 30,
    syncOnWifi: true,
    syncOnMobile: false,
    autoDownloadDocuments: false,
    maxDocumentSize: 10
  })
  
  const [storageStats, setStorageStats] = useState({
    current: 0,
    max: 0,
    percentage: 0
  })
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadPreferences()
      loadStorageStats()
    }
  }, [isOpen])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const userId = localStorage.getItem('current_user_id') || 'default'
      const userPrefs = await offlineStorage.getUserPreferences(userId)
      setPreferences(userPrefs)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStorageStats = async () => {
    try {
      const stats = await offlineStorage.getCacheSize()
      setStorageStats(stats)
    } catch (error) {
      console.error('Failed to load storage stats:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await offlineStorage.updateUserPreferences(preferences)
      onClose()
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await offlineStorage.clear()
        await loadStorageStats()
      } catch (error) {
        console.error('Failed to clear cache:', error)
      }
    }
  }

  const handleOptimizeCache = async () => {
    try {
      await offlineStorage.optimizeCache()
      await loadStorageStats()
    } catch (error) {
      console.error('Failed to optimize cache:', error)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Offline Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Storage Usage */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Usage</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {formatBytes(storageStats.current)} of {formatBytes(storageStats.max)} used
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(storageStats.percentage)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        storageStats.percentage > 90 ? 'bg-red-500' :
                        storageStats.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleOptimizeCache}
                    variant="outline"
                    size="sm"
                  >
                    Optimize Cache
                  </Button>
                  <Button
                    onClick={handleClearCache}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Clear All Data
                  </Button>
                </div>
              </div>

              {/* Cache Strategy */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cache Strategy</h3>
                
                <div className="space-y-3">
                  {[
                    {
                      value: 'aggressive',
                      label: 'Aggressive',
                      description: 'Cache everything for maximum offline capability'
                    },
                    {
                      value: 'balanced',
                      label: 'Balanced',
                      description: 'Cache recent and important items (recommended)'
                    },
                    {
                      value: 'minimal',
                      label: 'Minimal',
                      description: 'Cache only essential items to save space'
                    }
                  ].map((strategy) => (
                    <label key={strategy.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="cacheStrategy"
                        value={strategy.value}
                        checked={preferences.cacheStrategy === strategy.value}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          cacheStrategy: e.target.value as any
                        }))}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{strategy.label}</div>
                        <div className="text-sm text-gray-600">{strategy.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Storage Limits */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Limits</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Cache Size (MB)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="1000"
                      step="50"
                      value={preferences.maxCacheSize}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        maxCacheSize: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retention Period (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={preferences.offlineRetentionDays}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        offlineRetentionDays: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sync Preferences */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sync Preferences</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.syncOnWifi}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        syncOnWifi: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Sync on WiFi</div>
                      <div className="text-sm text-gray-600">
                        Automatically sync when connected to WiFi
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.syncOnMobile}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        syncOnMobile: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Sync on Mobile Data</div>
                      <div className="text-sm text-gray-600">
                        Sync using mobile data (may incur charges)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Document Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Document Settings</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.autoDownloadDocuments}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        autoDownloadDocuments: e.target.checked
                      }))}
                      className="rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Auto-download Documents</div>
                      <div className="text-sm text-gray-600">
                        Automatically download documents for offline access
                      </div>
                    </div>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Document Size for Auto-download (MB)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={preferences.maxDocumentSize}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        maxDocumentSize: parseInt(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!preferences.autoDownloadDocuments}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Documents larger than this size will require manual download
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Changes take effect immediately
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}