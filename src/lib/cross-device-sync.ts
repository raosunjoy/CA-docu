/**
 * Cross-Device Synchronization Service
 * Manages data sync and session management across multiple devices
 */

export interface DeviceInfo {
  id: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet'
  platform: string
  browser: string
  lastActive: Date
  isOnline: boolean
  location?: string
  ipAddress?: string
}

export interface SyncData {
  id: string
  type: 'preferences' | 'session' | 'cache' | 'state'
  data: any
  timestamp: Date
  deviceId: string
  version: number
}

export interface CrossDeviceSession {
  sessionId: string
  userId: string
  devices: DeviceInfo[]
  activeDevice?: string
  sharedState: Record<string, any>
  lastSync: Date
}

export interface SyncConflict {
  id: string
  type: string
  localData: any
  remoteData: any
  localTimestamp: Date
  remoteTimestamp: Date
  deviceId: string
}

class CrossDeviceSyncService {
  private deviceId: string
  private userId: string | null = null
  private websocket: WebSocket | null = null
  private syncQueue: SyncData[] = []
  private conflictQueue: SyncConflict[] = []
  private isOnline = navigator.onLine
  private syncInterval: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private callbacks: Map<string, Function[]> = new Map()

  constructor() {
    this.deviceId = this.generateDeviceId()
    this.initializeSync()
    this.setupEventListeners()
  }

  /**
   * Initialize synchronization service
   */
  private async initializeSync(): Promise<void> {
    // Load user session
    this.userId = this.getCurrentUserId()
    
    if (this.userId) {
      // Connect to sync server
      await this.connectToSyncServer()
      
      // Start periodic sync
      this.startPeriodicSync()
      
      // Register device
      await this.registerDevice()
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.isOnline = true
      this.emit('online')
      this.reconnectToSyncServer()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.emit('offline')
    })

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncNow()
      }
    })

    // Before unload
    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })
  }

  /**
   * Connect to sync server via WebSocket
   */
  private async connectToSyncServer(): Promise<void> {
    if (!this.userId || !this.isOnline) return

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/sync/ws`
      this.websocket = new WebSocket(wsUrl)

      this.websocket.onopen = () => {
        console.log('Sync WebSocket connected')
        this.authenticate()
        this.startHeartbeat()
        this.emit('connected')
      }

      this.websocket.onmessage = (event) => {
        this.handleSyncMessage(JSON.parse(event.data))
      }

      this.websocket.onclose = () => {
        console.log('Sync WebSocket disconnected')
        this.websocket = null
        this.stopHeartbeat()
        this.emit('disconnected')
        
        // Attempt reconnection
        setTimeout(() => this.reconnectToSyncServer(), 5000)
      }

      this.websocket.onerror = (error) => {
        console.error('Sync WebSocket error:', error)
        this.emit('error', error)
      }
    } catch (error) {
      console.error('Failed to connect to sync server:', error)
    }
  }

  /**
   * Reconnect to sync server
   */
  private async reconnectToSyncServer(): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN) return
    
    await this.connectToSyncServer()
  }

  /**
   * Authenticate with sync server
   */
  private authenticate(): void {
    if (!this.websocket || !this.userId) return

    this.websocket.send(JSON.stringify({
      type: 'auth',
      userId: this.userId,
      deviceId: this.deviceId,
      deviceInfo: this.getDeviceInfo()
    }))
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Handle incoming sync messages
   */
  private handleSyncMessage(message: any): void {
    switch (message.type) {
      case 'sync_data':
        this.handleIncomingSyncData(message.data)
        break
      case 'device_update':
        this.handleDeviceUpdate(message.data)
        break
      case 'session_update':
        this.handleSessionUpdate(message.data)
        break
      case 'conflict':
        this.handleSyncConflict(message.data)
        break
      case 'pong':
        // Heartbeat response
        break
      default:
        console.log('Unknown sync message type:', message.type)
    }
  }

  /**
   * Handle incoming sync data
   */
  private async handleIncomingSyncData(syncData: SyncData): Promise<void> {
    if (syncData.deviceId === this.deviceId) return // Ignore own data

    try {
      // Check for conflicts
      const localData = await this.getLocalData(syncData.type, syncData.id)
      
      if (localData && localData.version !== syncData.version) {
        // Conflict detected
        const conflict: SyncConflict = {
          id: syncData.id,
          type: syncData.type,
          localData: localData.data,
          remoteData: syncData.data,
          localTimestamp: localData.timestamp,
          remoteTimestamp: syncData.timestamp,
          deviceId: syncData.deviceId
        }
        
        this.conflictQueue.push(conflict)
        this.emit('conflict', conflict)
        return
      }

      // Apply sync data
      await this.applySync(syncData)
      this.emit('sync_applied', syncData)
    } catch (error) {
      console.error('Failed to handle incoming sync data:', error)
    }
  }

  /**
   * Sync data across devices
   */
  async syncData(type: string, id: string, data: any): Promise<void> {
    const syncData: SyncData = {
      id,
      type,
      data,
      timestamp: new Date(),
      deviceId: this.deviceId,
      version: Date.now()
    }

    // Store locally
    await this.storeLocalData(syncData)

    // Add to sync queue
    this.syncQueue.push(syncData)

    // Send immediately if online
    if (this.isOnline && this.websocket?.readyState === WebSocket.OPEN) {
      this.sendSyncData(syncData)
    }
  }

  /**
   * Sync user preferences
   */
  async syncPreferences(preferences: Record<string, any>): Promise<void> {
    await this.syncData('preferences', 'user_preferences', preferences)
  }

  /**
   * Sync session state
   */
  async syncSessionState(state: Record<string, any>): Promise<void> {
    await this.syncData('session', 'session_state', state)
  }

  /**
   * Sync application cache
   */
  async syncCache(cacheKey: string, cacheData: any): Promise<void> {
    await this.syncData('cache', cacheKey, cacheData)
  }

  /**
   * Get connected devices
   */
  async getConnectedDevices(): Promise<DeviceInfo[]> {
    try {
      const response = await fetch('/api/sync/devices', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.devices || []
      }
    } catch (error) {
      console.error('Failed to get connected devices:', error)
    }
    
    return []
  }

  /**
   * Remove device from sync
   */
  async removeDevice(deviceId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/sync/devices/${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      })
      
      return response.ok
    } catch (error) {
      console.error('Failed to remove device:', error)
      return false
    }
  }

  /**
   * Resolve sync conflict
   */
  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ): Promise<void> {
    const conflict = this.conflictQueue.find(c => c.id === conflictId)
    if (!conflict) return

    let resolvedData: any

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData
        break
      case 'remote':
        resolvedData = conflict.remoteData
        break
      case 'merge':
        resolvedData = mergedData || this.mergeData(conflict.localData, conflict.remoteData)
        break
    }

    // Apply resolved data
    await this.syncData(conflict.type, conflict.id, resolvedData)

    // Remove from conflict queue
    this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId)
    
    this.emit('conflict_resolved', { conflictId, resolution, data: resolvedData })
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): SyncConflict[] {
    return [...this.conflictQueue]
  }

  /**
   * Force sync now
   */
  async syncNow(): Promise<void> {
    if (!this.isOnline || !this.websocket) return

    // Send queued sync data
    while (this.syncQueue.length > 0) {
      const syncData = this.syncQueue.shift()
      if (syncData) {
        this.sendSyncData(syncData)
      }
    }

    // Request latest data from server
    this.websocket.send(JSON.stringify({
      type: 'sync_request',
      deviceId: this.deviceId,
      lastSync: this.getLastSyncTime()
    }))
  }

  /**
   * Private helper methods
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id')
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('device_id', deviceId)
    }
    
    return deviceId
  }

  private getCurrentUserId(): string | null {
    // Get from auth token or session
    const token = this.getAuthToken()
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.userId || payload.sub
      } catch (error) {
        console.error('Failed to parse auth token:', error)
      }
    }
    return null
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile'
    }

    return {
      id: this.deviceId,
      name: this.getDeviceName(),
      type: deviceType,
      platform: navigator.platform,
      browser: this.getBrowserName(),
      lastActive: new Date(),
      isOnline: this.isOnline
    }
  }

  private getDeviceName(): string {
    const stored = localStorage.getItem('device_name')
    if (stored) return stored

    const userAgent = navigator.userAgent
    let name = 'Unknown Device'

    if (/iPhone/.test(userAgent)) name = 'iPhone'
    else if (/iPad/.test(userAgent)) name = 'iPad'
    else if (/Android/.test(userAgent)) name = 'Android Device'
    else if (/Mac/.test(userAgent)) name = 'Mac'
    else if (/Windows/.test(userAgent)) name = 'Windows PC'
    else if (/Linux/.test(userAgent)) name = 'Linux PC'

    return name
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent
    
    if (/Chrome/.test(userAgent)) return 'Chrome'
    if (/Firefox/.test(userAgent)) return 'Firefox'
    if (/Safari/.test(userAgent)) return 'Safari'
    if (/Edge/.test(userAgent)) return 'Edge'
    
    return 'Unknown'
  }

  private async registerDevice(): Promise<void> {
    try {
      await fetch('/api/sync/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          deviceInfo: this.getDeviceInfo()
        })
      })
    } catch (error) {
      console.error('Failed to register device:', error)
    }
  }

  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncNow()
      }
    }, 60000) // 1 minute
  }

  private sendSyncData(syncData: SyncData): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify({
        type: 'sync_data',
        data: syncData
      }))
    }
  }

  private async storeLocalData(syncData: SyncData): Promise<void> {
    const key = `sync_${syncData.type}_${syncData.id}`
    localStorage.setItem(key, JSON.stringify(syncData))
  }

  private async getLocalData(type: string, id: string): Promise<SyncData | null> {
    const key = `sync_${type}_${id}`
    const stored = localStorage.getItem(key)
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.error('Failed to parse local sync data:', error)
      }
    }
    
    return null
  }

  private async applySync(syncData: SyncData): Promise<void> {
    // Store the synced data
    await this.storeLocalData(syncData)
    
    // Apply to application state based on type
    switch (syncData.type) {
      case 'preferences':
        this.applyPreferences(syncData.data)
        break
      case 'session':
        this.applySessionState(syncData.data)
        break
      case 'cache':
        this.applyCache(syncData.id, syncData.data)
        break
    }
  }

  private applyPreferences(preferences: Record<string, any>): void {
    // Apply preferences to application
    Object.keys(preferences).forEach(key => {
      localStorage.setItem(`pref_${key}`, JSON.stringify(preferences[key]))
    })
    
    this.emit('preferences_updated', preferences)
  }

  private applySessionState(state: Record<string, any>): void {
    // Apply session state
    Object.keys(state).forEach(key => {
      sessionStorage.setItem(`session_${key}`, JSON.stringify(state[key]))
    })
    
    this.emit('session_updated', state)
  }

  private applyCache(key: string, data: any): void {
    localStorage.setItem(`cache_${key}`, JSON.stringify(data))
    this.emit('cache_updated', { key, data })
  }

  private mergeData(localData: any, remoteData: any): any {
    // Simple merge strategy - can be enhanced based on data type
    if (typeof localData === 'object' && typeof remoteData === 'object') {
      return { ...localData, ...remoteData }
    }
    
    // For non-objects, prefer remote data (most recent)
    return remoteData
  }

  private getLastSyncTime(): Date {
    const stored = localStorage.getItem('last_sync_time')
    return stored ? new Date(stored) : new Date(0)
  }

  private handleDeviceUpdate(deviceInfo: DeviceInfo): void {
    this.emit('device_updated', deviceInfo)
  }

  private handleSessionUpdate(session: CrossDeviceSession): void {
    this.emit('session_updated', session)
  }

  private handleSyncConflict(conflict: SyncConflict): void {
    this.conflictQueue.push(conflict)
    this.emit('conflict', conflict)
  }

  private cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    if (this.websocket) {
      this.websocket.close()
    }
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])
    }
    this.callbacks.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }
}

// Export singleton instance
export const crossDeviceSync = new CrossDeviceSyncService()
export default crossDeviceSync