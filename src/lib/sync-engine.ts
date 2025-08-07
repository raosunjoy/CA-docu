// Comprehensive Sync Engine - Handles offline/online synchronization
import { offlineStorage } from './offline-storage'
import { Task, Document, Email, ChatMessage, Tag } from '@/types'

interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  resourceType: 'task' | 'document' | 'email' | 'chat_message' | 'tag'
  resourceId: string
  data: Record<string, unknown>
  priority: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
  maxRetries: number
  createdAt: Date
  scheduledAt?: Date
  error?: string
  conflictData?: any
}

interface SyncResult {
  success: boolean
  uploaded: number
  downloaded: number
  conflicts: number
  errors: number
  duration: number
  operations: SyncOperationResult[]
}

interface SyncOperationResult {
  operationId: string
  success: boolean
  error?: string
  conflictResolution?: 'local' | 'remote' | 'merge' | 'user_choice'
}

interface ConflictResolution {
  strategy: 'merge' | 'local' | 'remote' | 'version' | 'user_choice'
  result: Record<string, unknown>
  requiresUserInput: boolean
  mergeFields?: string[]
  conflictFields?: string[]
}

interface SyncConfig {
  batchSize: number
  maxConcurrentOperations: number
  retryDelay: number
  maxRetryDelay: number
  backoffMultiplier: number
  conflictResolutionStrategy: 'auto' | 'manual'
  autoMergeFields: string[]
  priorityThreshold: number
}

interface SyncStats {
  totalOperations: number
  pendingOperations: number
  failedOperations: number
  conflictedOperations: number
  lastSyncAt?: Date
  averageSyncTime: number
  successRate: number
  networkLatency: number
}

export class SyncEngine {
  private config: SyncConfig = {
    batchSize: 10,
    maxConcurrentOperations: 3,
    retryDelay: 1000,
    maxRetryDelay: 30000,
    backoffMultiplier: 2,
    conflictResolutionStrategy: 'auto',
    autoMergeFields: ['updatedAt', 'lastAccessedAt', 'metadata'],
    priorityThreshold: 2
  }

  private isRunning = false
  private syncQueue: SyncOperation[] = []
  private activeOperations = new Map<string, Promise<SyncOperationResult>>()
  private conflictResolver = new ConflictResolver()
  private networkMonitor = new NetworkMonitor()

  constructor(config?: Partial<SyncConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }

  // Main sync orchestration
  async startSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync is already running')
    }

    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline')
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      // Load pending operations from storage
      await this.loadPendingOperations()

      // Sort operations by priority and dependency
      this.sortOperationsByPriority()

      // Process operations in batches
      const results = await this.processOperations()

      // Update sync statistics
      await this.updateSyncStats(results)

      const duration = Date.now() - startTime

      return {
        success: true,
        uploaded: results.filter(r => r.success).length,
        downloaded: 0, // Would be calculated based on download operations
        conflicts: results.filter(r => r.conflictResolution).length,
        errors: results.filter(r => !r.success).length,
        duration,
        operations: results
      }
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    } finally {
      this.isRunning = false
      this.syncQueue = []
      this.activeOperations.clear()
    }
  }

  async stopSync(): Promise<void> {
    this.isRunning = false
    
    // Wait for active operations to complete
    const activePromises = Array.from(this.activeOperations.values())
    await Promise.allSettled(activePromises)
    
    this.activeOperations.clear()
  }

  // Operation processing
  private async loadPendingOperations(): Promise<void> {
    await offlineStorage.initialize()
    
    const operations = await offlineStorage.getAll('sync_queue', (op) => 
      op.status === 'pending' || op.status === 'failed'
    )

    this.syncQueue = operations.sort((a, b) => {
      // Sort by priority first, then by creation time
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
  }

  private sortOperationsByPriority(): void {
    // Group operations by resource to handle dependencies
    const resourceGroups = new Map<string, SyncOperation[]>()
    
    for (const operation of this.syncQueue) {
      const key = `${operation.resourceType}:${operation.resourceId}`
      if (!resourceGroups.has(key)) {
        resourceGroups.set(key, [])
      }
      resourceGroups.get(key)!.push(operation)
    }

    // Sort operations within each resource group
    for (const [, operations] of resourceGroups) {
      operations.sort((a, b) => {
        // Ensure create operations come before updates/deletes
        const typeOrder = { create: 1, update: 2, delete: 3 }
        if (a.type !== b.type) {
          return typeOrder[a.type] - typeOrder[b.type]
        }
        return a.createdAt.getTime() - b.createdAt.getTime()
      })
    }

    // Flatten back to single queue
    this.syncQueue = Array.from(resourceGroups.values()).flat()
  }

  private async processOperations(): Promise<SyncOperationResult[]> {
    const results: SyncOperationResult[] = []
    const batches = this.createBatches()

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch)
      results.push(...batchResults)
    }

    return results
  }

  private createBatches(): SyncOperation[][] {
    const batches: SyncOperation[][] = []
    
    for (let i = 0; i < this.syncQueue.length; i += this.config.batchSize) {
      batches.push(this.syncQueue.slice(i, i + this.config.batchSize))
    }

    return batches
  }

  private async processBatch(batch: SyncOperation[]): Promise<SyncOperationResult[]> {
    const promises = batch.map(operation => this.processOperation(operation))
    return Promise.all(promises)
  }

  private async processOperation(operation: SyncOperation): Promise<SyncOperationResult> {
    const operationPromise = this.executeOperation(operation)
    this.activeOperations.set(operation.id, operationPromise)

    try {
      const result = await operationPromise
      await this.updateOperationStatus(operation.id, 'completed')
      return result
    } catch (error) {
      await this.handleOperationError(operation, error)
      return {
        operationId: operation.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      this.activeOperations.delete(operation.id)
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<SyncOperationResult> {
    await this.updateOperationStatus(operation.id, 'processing')

    try {
      switch (operation.resourceType) {
        case 'task':
          return await this.syncTask(operation)
        case 'document':
          return await this.syncDocument(operation)
        case 'email':
          return await this.syncEmail(operation)
        case 'chat_message':
          return await this.syncChatMessage(operation)
        case 'tag':
          return await this.syncTag(operation)
        default:
          throw new Error(`Unknown resource type: ${operation.resourceType}`)
      }
    } catch (error) {
      if (this.isConflictError(error)) {
        return await this.handleConflict(operation, error)
      }
      throw error
    }
  }

  // Resource-specific sync methods
  private async syncTask(operation: SyncOperation): Promise<SyncOperationResult> {
    const endpoint = this.getApiEndpoint('task', operation)
    const method = this.getHttpMethod(operation.type)

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Operation': operation.id
      },
      body: method !== 'DELETE' ? JSON.stringify(operation.data) : undefined
    })

    if (!response.ok) {
      if (response.status === 409) {
        // Conflict detected
        const conflictData = await response.json()
        throw new ConflictError(conflictData)
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Update local data with server response
    if (result.data && operation.type !== 'delete') {
      await this.updateLocalData('task', operation.resourceId, result.data)
    }

    return {
      operationId: operation.id,
      success: true
    }
  }

  private async syncDocument(operation: SyncOperation): Promise<SyncOperationResult> {
    // Handle file uploads separately
    if (operation.type === 'create' && operation.data.file) {
      return await this.syncDocumentWithFile(operation)
    }

    const endpoint = this.getApiEndpoint('document', operation)
    const method = this.getHttpMethod(operation.type)

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Operation': operation.id
      },
      body: method !== 'DELETE' ? JSON.stringify(operation.data) : undefined
    })

    if (!response.ok) {
      if (response.status === 409) {
        const conflictData = await response.json()
        throw new ConflictError(conflictData)
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    if (result.data && operation.type !== 'delete') {
      await this.updateLocalData('document', operation.resourceId, result.data)
    }

    return {
      operationId: operation.id,
      success: true
    }
  }

  private async syncDocumentWithFile(operation: SyncOperation): Promise<SyncOperationResult> {
    const formData = new FormData()
    
    // Add file if it exists locally
    const localFile = await this.getLocalFile(operation.resourceId)
    if (localFile) {
      formData.append('file', localFile)
    }

    // Add metadata
    formData.append('metadata', JSON.stringify(operation.data))
    formData.append('syncOperation', operation.id)

    const response = await fetch('/api/documents', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      if (response.status === 409) {
        const conflictData = await response.json()
        throw new ConflictError(conflictData)
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    await this.updateLocalData('document', operation.resourceId, result.data)

    return {
      operationId: operation.id,
      success: true
    }
  }

  private async syncEmail(operation: SyncOperation): Promise<SyncOperationResult> {
    // Email sync implementation
    const endpoint = this.getApiEndpoint('email', operation)
    const method = this.getHttpMethod(operation.type)

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Operation': operation.id
      },
      body: method !== 'DELETE' ? JSON.stringify(operation.data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return {
      operationId: operation.id,
      success: true
    }
  }

  private async syncChatMessage(operation: SyncOperation): Promise<SyncOperationResult> {
    // Chat message sync implementation
    const endpoint = this.getApiEndpoint('chat_message', operation)
    const method = this.getHttpMethod(operation.type)

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Operation': operation.id
      },
      body: method !== 'DELETE' ? JSON.stringify(operation.data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return {
      operationId: operation.id,
      success: true
    }
  }

  private async syncTag(operation: SyncOperation): Promise<SyncOperationResult> {
    // Tag sync implementation
    const endpoint = this.getApiEndpoint('tag', operation)
    const method = this.getHttpMethod(operation.type)

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Operation': operation.id
      },
      body: method !== 'DELETE' ? JSON.stringify(operation.data) : undefined
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return {
      operationId: operation.id,
      success: true
    }
  }

  // Conflict handling
  private async handleConflict(
    operation: SyncOperation, 
    error: ConflictError
  ): Promise<SyncOperationResult> {
    const resolution = await this.conflictResolver.resolve(
      operation,
      error.conflictData,
      this.config.conflictResolutionStrategy
    )

    if (resolution.requiresUserInput) {
      // Store conflict for manual resolution
      await this.storeConflict(operation, error.conflictData, resolution)
      
      return {
        operationId: operation.id,
        success: false,
        error: 'Conflict requires manual resolution',
        conflictResolution: 'user_choice'
      }
    }

    // Apply automatic resolution
    const resolvedData = resolution.result
    const updatedOperation = {
      ...operation,
      data: resolvedData
    }

    // Retry with resolved data
    return await this.executeOperation(updatedOperation)
  }

  private async storeConflict(
    operation: SyncOperation,
    conflictData: any,
    resolution: ConflictResolution
  ): Promise<void> {
    const conflict = {
      id: `conflict_${operation.id}`,
      operationId: operation.id,
      resourceType: operation.resourceType,
      resourceId: operation.resourceId,
      localData: operation.data,
      remoteData: conflictData,
      resolution,
      status: 'pending',
      createdAt: new Date()
    }

    // Store conflict for UI to handle
    localStorage.setItem(`conflict_${operation.id}`, JSON.stringify(conflict))
  }

  // Utility methods
  private getApiEndpoint(resourceType: string, operation: SyncOperation): string {
    const baseEndpoints = {
      task: '/api/tasks',
      document: '/api/documents',
      email: '/api/emails',
      chat_message: '/api/chat/messages',
      tag: '/api/tags'
    }

    const base = baseEndpoints[resourceType as keyof typeof baseEndpoints]
    
    if (operation.type === 'create') {
      return base
    }
    
    return `${base}/${operation.resourceId}`
  }

  private getHttpMethod(operationType: string): string {
    const methods = {
      create: 'POST',
      update: 'PUT',
      delete: 'DELETE'
    }
    
    return methods[operationType as keyof typeof methods]
  }

  private isConflictError(error: any): error is ConflictError {
    return error instanceof ConflictError
  }

  private async updateOperationStatus(
    operationId: string, 
    status: SyncOperation['status']
  ): Promise<void> {
    const operation = await offlineStorage.get('sync_queue', operationId)
    if (operation) {
      operation.status = status
      await offlineStorage.store('sync_queue', operation)
    }
  }

  private async handleOperationError(
    operation: SyncOperation, 
    error: any
  ): Promise<void> {
    operation.retryCount++
    operation.error = error instanceof Error ? error.message : 'Unknown error'

    if (operation.retryCount < operation.maxRetries) {
      // Schedule retry with exponential backoff
      const delay = Math.min(
        this.config.retryDelay * Math.pow(this.config.backoffMultiplier, operation.retryCount - 1),
        this.config.maxRetryDelay
      )
      
      operation.scheduledAt = new Date(Date.now() + delay)
      operation.status = 'pending'
    } else {
      operation.status = 'failed'
    }

    await offlineStorage.store('sync_queue', operation)
  }

  private async updateLocalData(
    resourceType: string,
    resourceId: string,
    serverData: any
  ): Promise<void> {
    const storeMap = {
      task: 'tasks',
      document: 'documents',
      email: 'emails',
      chat_message: 'chat_messages',
      tag: 'tags'
    }

    const storeName = storeMap[resourceType as keyof typeof storeMap]
    if (storeName) {
      const updatedData = {
        ...serverData,
        syncStatus: 'synced',
        lastSyncAt: new Date(),
        cachedAt: new Date()
      }
      
      await offlineStorage.store(storeName as any, updatedData)
    }
  }

  private async getLocalFile(resourceId: string): Promise<File | null> {
    // Implementation to retrieve local file for upload
    const fileInfoStr = localStorage.getItem(`doc_file_${resourceId}`)
    if (!fileInfoStr) return null

    try {
      const fileInfo = JSON.parse(fileInfoStr)
      const fileData = new Uint8Array(fileInfo.data)
      return new File([fileData], fileInfo.name, { type: fileInfo.type })
    } catch (error) {
      console.error('Failed to retrieve local file:', error)
      return null
    }
  }

  private async updateSyncStats(results: SyncOperationResult[]): Promise<void> {
    const stats = {
      lastSyncAt: new Date(),
      totalOperations: results.length,
      successfulOperations: results.filter(r => r.success).length,
      failedOperations: results.filter(r => !r.success).length,
      conflictedOperations: results.filter(r => r.conflictResolution).length
    }

    localStorage.setItem('sync_stats', JSON.stringify(stats))
  }

  // Public API for sync management
  async getSyncStats(): Promise<SyncStats> {
    const statsStr = localStorage.getItem('sync_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}

    const pendingOps = await offlineStorage.getAll('sync_queue', op => op.status === 'pending')
    const failedOps = await offlineStorage.getAll('sync_queue', op => op.status === 'failed')

    return {
      totalOperations: stats.totalOperations || 0,
      pendingOperations: pendingOps.length,
      failedOperations: failedOps.length,
      conflictedOperations: stats.conflictedOperations || 0,
      lastSyncAt: stats.lastSyncAt ? new Date(stats.lastSyncAt) : undefined,
      averageSyncTime: stats.averageSyncTime || 0,
      successRate: stats.totalOperations > 0 ? 
        (stats.successfulOperations / stats.totalOperations) * 100 : 0,
      networkLatency: this.networkMonitor.getAverageLatency()
    }
  }

  async getConflicts(): Promise<any[]> {
    const conflicts = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('conflict_')) {
        const conflictStr = localStorage.getItem(key)
        if (conflictStr) {
          conflicts.push(JSON.parse(conflictStr))
        }
      }
    }

    return conflicts
  }

  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<void> {
    const conflictStr = localStorage.getItem(conflictId)
    if (!conflictStr) {
      throw new Error('Conflict not found')
    }

    const conflict = JSON.parse(conflictStr)
    let resolvedData: any

    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData
        break
      case 'remote':
        resolvedData = conflict.remoteData
        break
      case 'merge':
        resolvedData = this.conflictResolver.mergeData(
          conflict.localData,
          conflict.remoteData,
          this.config.autoMergeFields
        )
        break
    }

    // Update the operation with resolved data
    const operation = await offlineStorage.get('sync_queue', conflict.operationId)
    if (operation) {
      operation.data = resolvedData
      operation.status = 'pending'
      await offlineStorage.store('sync_queue', operation)
    }

    // Remove conflict
    localStorage.removeItem(conflictId)
  }
}

// Conflict resolution helper
class ConflictResolver {
  async resolve(
    operation: SyncOperation,
    conflictData: any,
    strategy: 'auto' | 'manual'
  ): Promise<ConflictResolution> {
    if (strategy === 'manual') {
      return {
        strategy: 'user_choice',
        result: {},
        requiresUserInput: true
      }
    }

    // Auto-resolution logic
    const merged = this.mergeData(operation.data, conflictData, [
      'updatedAt', 'lastAccessedAt', 'metadata'
    ])

    return {
      strategy: 'merge',
      result: merged,
      requiresUserInput: false,
      mergeFields: ['updatedAt', 'lastAccessedAt', 'metadata']
    }
  }

  mergeData(localData: any, remoteData: any, autoMergeFields: string[]): any {
    const merged = { ...remoteData }

    // Auto-merge specific fields
    for (const field of autoMergeFields) {
      if (localData[field] && remoteData[field]) {
        if (field === 'updatedAt' || field === 'lastAccessedAt') {
          // Use the latest timestamp
          merged[field] = new Date(Math.max(
            new Date(localData[field]).getTime(),
            new Date(remoteData[field]).getTime()
          ))
        } else if (field === 'metadata' && typeof localData[field] === 'object') {
          // Merge metadata objects
          merged[field] = { ...remoteData[field], ...localData[field] }
        }
      }
    }

    return merged
  }
}

// Network monitoring helper
class NetworkMonitor {
  private latencyHistory: number[] = []
  private maxHistorySize = 10

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0
    
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0)
    return sum / this.latencyHistory.length
  }

  recordLatency(latency: number): void {
    this.latencyHistory.push(latency)
    
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift()
    }
  }
}

// Custom error types
class ConflictError extends Error {
  constructor(public conflictData: any) {
    super('Sync conflict detected')
    this.name = 'ConflictError'
  }
}

// Singleton instance
export const syncEngine = new SyncEngine()