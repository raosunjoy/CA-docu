// Sync Hook - Manages synchronization state and operations
import { useState, useCallback, useEffect } from 'react'
import { syncEngine } from '@/lib/sync-engine'

interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  syncProgress: number
  lastSyncAt?: Date
  pendingOperations: number
  conflicts: number
  errors: number
  syncStats: {
    totalOperations: number
    successRate: number
    averageSyncTime: number
    networkLatency: number
  }
  error?: string
}

interface SyncActions {
  startSync: () => Promise<void>
  stopSync: () => Promise<void>
  resolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>
  getConflicts: () => Promise<any[]>
  refreshStats: () => Promise<void>
  clearError: () => void
}

export function useSync(): SyncState & SyncActions {
  const [state, setState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    syncProgress: 0,
    pendingOperations: 0,
    conflicts: 0,
    errors: 0,
    syncStats: {
      totalOperations: 0,
      successRate: 0,
      averageSyncTime: 0,
      networkLatency: 0
    }
  })

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
      // Auto-sync when coming back online
      if (state.pendingOperations > 0) {
        startSync()
      }
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [state.pendingOperations])

  // Load initial stats
  useEffect(() => {
    refreshStats()
  }, [])

  // Periodic stats refresh
  useEffect(() => {
    const interval = setInterval(refreshStats, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const stats = await syncEngine.getSyncStats()
      const conflicts = await syncEngine.getConflicts()

      setState(prev => ({
        ...prev,
        pendingOperations: stats.pendingOperations,
        conflicts: conflicts.length,
        errors: stats.failedOperations,
        lastSyncAt: stats.lastSyncAt,
        syncStats: {
          totalOperations: stats.totalOperations,
          successRate: stats.successRate,
          averageSyncTime: stats.averageSyncTime,
          networkLatency: stats.networkLatency
        }
      }))
    } catch (error) {
      console.error('Failed to refresh sync stats:', error)
    }
  }, [])

  const startSync = useCallback(async () => {
    if (!state.isOnline) {
      setState(prev => ({ 
        ...prev, 
        error: 'Cannot sync while offline' 
      }))
      return
    }

    if (state.isSyncing) {
      return // Already syncing
    }

    setState(prev => ({ 
      ...prev, 
      isSyncing: true, 
      syncProgress: 0,
      error: undefined 
    }))

    try {
      // Start sync with progress tracking
      const result = await syncEngine.startSync()

      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 100,
        lastSyncAt: new Date(),
        pendingOperations: Math.max(0, prev.pendingOperations - result.uploaded),
        conflicts: prev.conflicts + result.conflicts,
        errors: prev.errors + result.errors
      }))

      // Refresh stats after sync
      await refreshStats()
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 0,
        error: error instanceof Error ? error.message : 'Sync failed'
      }))
    }
  }, [state.isOnline, state.isSyncing, refreshStats])

  const stopSync = useCallback(async () => {
    if (!state.isSyncing) {
      return
    }

    try {
      await syncEngine.stopSync()
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: 0
      }))
    } catch (error) {
      console.error('Failed to stop sync:', error)
    }
  }, [state.isSyncing])

  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge'
  ) => {
    try {
      await syncEngine.resolveConflict(conflictId, resolution)
      
      setState(prev => ({
        ...prev,
        conflicts: Math.max(0, prev.conflicts - 1)
      }))

      await refreshStats()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve conflict'
      }))
    }
  }, [refreshStats])

  const getConflicts = useCallback(async () => {
    try {
      return await syncEngine.getConflicts()
    } catch (error) {
      console.error('Failed to get conflicts:', error)
      return []
    }
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }))
  }, [])

  return {
    ...state,
    startSync,
    stopSync,
    resolveConflict,
    getConflicts,
    refreshStats,
    clearError
  }
}