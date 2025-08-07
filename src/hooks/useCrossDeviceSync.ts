/**
 * Cross-Device Sync Hooks
 * React hooks for cross-device synchronization functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { crossDeviceSync, DeviceInfo, SyncConflict } from '@/lib/cross-device-sync'

/**
 * Hook for cross-device synchronization
 */
export function useCrossDeviceSync() {
  const [isConnected, setIsConnected] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectedDevices, setConnectedDevices] = useState<DeviceInfo[]>([])
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    // Listen for sync events
    const handleConnected = () => {
      setIsConnected(true)
      loadConnectedDevices()
    }

    const handleDisconnected = () => {
      setIsConnected(false)
    }

    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    const handleConflict = (conflict: SyncConflict) => {
      setPendingConflicts(prev => [...prev, conflict])
    }

    const handleConflictResolved = ({ conflictId }: { conflictId: string }) => {
      setPendingConflicts(prev => prev.filter(c => c.id !== conflictId))
    }

    const handleSyncApplied = () => {
      setLastSyncTime(new Date())
    }

    // Register event listeners
    crossDeviceSync.on('connected', handleConnected)
    crossDeviceSync.on('disconnected', handleDisconnected)
    crossDeviceSync.on('online', handleOnline)
    crossDeviceSync.on('offline', handleOffline)
    crossDeviceSync.on('conflict', handleConflict)
    crossDeviceSync.on('conflict_resolved', handleConflictResolved)
    crossDeviceSync.on('sync_applied', handleSyncApplied)

    // Initial state
    setPendingConflicts(crossDeviceSync.getPendingConflicts())

    return () => {
      crossDeviceSync.off('connected', handleConnected)
      crossDeviceSync.off('disconnected', handleDisconnected)
      crossDeviceSync.off('online', handleOnline)
      crossDeviceSync.off('offline', handleOffline)
      crossDeviceSync.off('conflict', handleConflict)
      crossDeviceSync.off('conflict_resolved', handleConflictResolved)
      crossDeviceSync.off('sync_applied', handleSyncApplied)
    }
  }, [])

  const loadConnectedDevices = useCallback(async () => {
    try {
      const devices = await crossDeviceSync.getConnectedDevices()
      setConnectedDevices(devices)
    } catch (error) {
      console.error('Failed to load connected devices:', error)
    }
  }, [])

  const syncData = useCallback(async (type: string, id: string, data: any) => {
    try {
      await crossDeviceSync.syncData(type, id, data)
    } catch (error) {
      console.error('Failed to sync data:', error)
      throw error
    }
  }, [])

  const syncNow = useCallback(async () => {
    try {
      await crossDeviceSync.syncNow()
      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Failed to sync now:', error)
      throw error
    }
  }, [])

  const removeDevice = useCallback(async (deviceId: string) => {
    try {
      const success = await crossDeviceSync.removeDevice(deviceId)
      if (success) {
        setConnectedDevices(prev => prev.filter(d => d.id !== deviceId))
      }
      return success
    } catch (error) {
      console.error('Failed to remove device:', error)
      throw error
    }
  }, [])

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => {
    try {
      await crossDeviceSync.resolveConflict(conflictId, resolution, mergedData)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      throw error
    }
  }, [])

  return {
    isConnected,
    isOnline,
    connectedDevices,
    pendingConflicts,
    lastSyncTime,
    syncData,
    syncNow,
    removeDevice,
    resolveConflict,
    loadConnectedDevices
  }
}

/**
 * Hook for syncing user preferences across devices
 */
export function useSyncedPreferences<T extends Record<string, any>>(
  defaultPreferences: T
) {
  const [preferences, setPreferences] = useState<T>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load preferences from localStorage
    const loadPreferences = () => {
      const loaded: Partial<T> = {}
      
      Object.keys(defaultPreferences).forEach(key => {
        const stored = localStorage.getItem(`pref_${key}`)
        if (stored) {
          try {
            loaded[key as keyof T] = JSON.parse(stored)
          } catch (error) {
            console.error(`Failed to parse preference ${key}:`, error)
          }
        }
      })
      
      setPreferences({ ...defaultPreferences, ...loaded })
      setIsLoading(false)
    }

    loadPreferences()

    // Listen for preference updates from other devices
    const handlePreferencesUpdated = (updatedPreferences: Record<string, any>) => {
      setPreferences(prev => ({ ...prev, ...updatedPreferences }))
    }

    crossDeviceSync.on('preferences_updated', handlePreferencesUpdated)

    return () => {
      crossDeviceSync.off('preferences_updated', handlePreferencesUpdated)
    }
  }, [defaultPreferences])

  const updatePreference = useCallback(async <K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)
    
    // Store locally
    localStorage.setItem(`pref_${String(key)}`, JSON.stringify(value))
    
    // Sync across devices
    await crossDeviceSync.syncPreferences(newPreferences)
  }, [preferences])

  const updatePreferences = useCallback(async (updates: Partial<T>) => {
    const newPreferences = { ...preferences, ...updates }
    setPreferences(newPreferences)
    
    // Store locally
    Object.keys(updates).forEach(key => {
      localStorage.setItem(`pref_${key}`, JSON.stringify(updates[key as keyof T]))
    })
    
    // Sync across devices
    await crossDeviceSync.syncPreferences(newPreferences)
  }, [preferences])

  return {
    preferences,
    isLoading,
    updatePreference,
    updatePreferences
  }
}

/**
 * Hook for syncing session state across devices
 */
export function useSyncedSessionState<T extends Record<string, any>>(
  initialState: T
) {
  const [sessionState, setSessionState] = useState<T>(initialState)

  useEffect(() => {
    // Load session state from sessionStorage
    const loadSessionState = () => {
      const loaded: Partial<T> = {}
      
      Object.keys(initialState).forEach(key => {
        const stored = sessionStorage.getItem(`session_${key}`)
        if (stored) {
          try {
            loaded[key as keyof T] = JSON.parse(stored)
          } catch (error) {
            console.error(`Failed to parse session state ${key}:`, error)
          }
        }
      })
      
      setSessionState({ ...initialState, ...loaded })
    }

    loadSessionState()

    // Listen for session updates from other devices
    const handleSessionUpdated = (updatedState: Record<string, any>) => {
      setSessionState(prev => ({ ...prev, ...updatedState }))
    }

    crossDeviceSync.on('session_updated', handleSessionUpdated)

    return () => {
      crossDeviceSync.off('session_updated', handleSessionUpdated)
    }
  }, [initialState])

  const updateSessionState = useCallback(async <K extends keyof T>(
    key: K,
    value: T[K]
  ) => {
    const newState = { ...sessionState, [key]: value }
    setSessionState(newState)
    
    // Store locally
    sessionStorage.setItem(`session_${String(key)}`, JSON.stringify(value))
    
    // Sync across devices
    await crossDeviceSync.syncSessionState(newState)
  }, [sessionState])

  return {
    sessionState,
    updateSessionState
  }
}

/**
 * Hook for syncing cache data across devices
 */
export function useSyncedCache() {
  const [cache, setCache] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    // Listen for cache updates from other devices
    const handleCacheUpdated = ({ key, data }: { key: string; data: any }) => {
      setCache(prev => new Map(prev).set(key, data))
    }

    crossDeviceSync.on('cache_updated', handleCacheUpdated)

    return () => {
      crossDeviceSync.off('cache_updated', handleCacheUpdated)
    }
  }, [])

  const setCacheData = useCallback(async (key: string, data: any) => {
    setCache(prev => new Map(prev).set(key, data))
    
    // Store locally
    localStorage.setItem(`cache_${key}`, JSON.stringify(data))
    
    // Sync across devices
    await crossDeviceSync.syncCache(key, data)
  }, [])

  const getCacheData = useCallback((key: string) => {
    let data = cache.get(key)
    
    if (!data) {
      // Try to load from localStorage
      const stored = localStorage.getItem(`cache_${key}`)
      if (stored) {
        try {
          data = JSON.parse(stored)
          setCache(prev => new Map(prev).set(key, data))
        } catch (error) {
          console.error(`Failed to parse cache data ${key}:`, error)
        }
      }
    }
    
    return data
  }, [cache])

  const removeCacheData = useCallback(async (key: string) => {
    setCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(key)
      return newCache
    })
    
    // Remove locally
    localStorage.removeItem(`cache_${key}`)
    
    // Sync removal across devices
    await crossDeviceSync.syncCache(key, null)
  }, [])

  return {
    setCacheData,
    getCacheData,
    removeCacheData,
    cacheKeys: Array.from(cache.keys())
  }
}

/**
 * Hook for handling sync conflicts
 */
export function useSyncConflicts() {
  const { pendingConflicts, resolveConflict } = useCrossDeviceSync()

  const resolveWithLocal = useCallback(async (conflictId: string) => {
    await resolveConflict(conflictId, 'local')
  }, [resolveConflict])

  const resolveWithRemote = useCallback(async (conflictId: string) => {
    await resolveConflict(conflictId, 'remote')
  }, [resolveConflict])

  const resolveWithMerge = useCallback(async (conflictId: string, mergedData: any) => {
    await resolveConflict(conflictId, 'merge', mergedData)
  }, [resolveConflict])

  const getConflictById = useCallback((conflictId: string) => {
    return pendingConflicts.find(c => c.id === conflictId)
  }, [pendingConflicts])

  return {
    pendingConflicts,
    conflictCount: pendingConflicts.length,
    resolveWithLocal,
    resolveWithRemote,
    resolveWithMerge,
    getConflictById
  }
}