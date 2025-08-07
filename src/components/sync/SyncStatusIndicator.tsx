// Sync Status Indicator Component
'use client'

import React, { useState } from 'react'
import { useSync } from '@/hooks/useSync'
import { SyncConflictResolver } from './SyncConflictResolver'

export function SyncStatusIndicator() {
  const {
    isOnline,
    isSyncing,
    syncProgress,
    lastSyncAt,
    pendingOperations,
    conflicts,
    errors,
    syncStats,
    error,
    startSync,
    clearError
  } = useSync()

  const [showConflictResolver, setShowConflictResolver] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const getSyncStatusColor = () => {
    if (!isOnline) return 'text-gray-500'
    if (isSyncing) return 'text-blue-500'
    if (conflicts > 0) return 'text-yellow-500'
    if (errors > 0) return 'text-red-500'
    if (pendingOperations > 0) return 'text-orange-500'
    return 'text-green-500'
  }

  const getSyncStatusIcon = () => {
    if (!isOnline) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }

    if (isSyncing) {
      return (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }

    if (conflicts > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }

    if (errors > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }

    if (pendingOperations > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }

    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }

  const getSyncStatusText = () => {
    if (!isOnline) return 'Offline'
    if (isSyncing) return `Syncing... ${syncProgress}%`
    if (conflicts > 0) return `${conflicts} conflicts`
    if (errors > 0) return `${errors} errors`
    if (pendingOperations > 0) return `${pendingOperations} pending`
    return 'Synced'
  }

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Never'
    
    const now = new Date()
    const diff = now.getTime() - lastSyncAt.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 ${getSyncStatusColor()}`}
        >
          {getSyncStatusIcon()}
          <span>{getSyncStatusText()}</span>
          
          {/* Progress bar for syncing */}
          {isSyncing && (
            <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          )}
        </button>

        {/* Detailed status dropdown */}
        {showDetails && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Sync Status</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Connection Status */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Last sync: {formatLastSync()}
                </div>
              </div>

              {/* Sync Statistics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {pendingOperations}
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {conflicts}
                  </div>
                  <div className="text-xs text-gray-500">Conflicts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {errors}
                  </div>
                  <div className="text-xs text-gray-500">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.round(syncStats.successRate)}%
                  </div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-red-800">Sync Error</div>
                      <div className="text-xs text-red-600 mt-1">{error}</div>
                    </div>
                    <button
                      onClick={clearError}
                      className="text-red-400 hover:text-red-600 ml-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={startSync}
                  disabled={!isOnline || isSyncing}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
                
                {conflicts > 0 && (
                  <button
                    onClick={() => {
                      setShowConflictResolver(true)
                      setShowDetails(false)
                    }}
                    className="px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700"
                  >
                    Resolve
                  </button>
                )}
              </div>

              {/* Network Info */}
              {isOnline && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Network latency: {Math.round(syncStats.networkLatency)}ms
                  </div>
                  <div className="text-xs text-gray-500">
                    Avg sync time: {Math.round(syncStats.averageSyncTime)}ms
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      <SyncConflictResolver
        isOpen={showConflictResolver}
        onClose={() => setShowConflictResolver(false)}
      />
    </>
  )
}