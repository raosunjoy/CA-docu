// Offline Storage Service - SQLite database for offline data storage
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Task, Document, Email, ChatMessage, Tag } from '@/types'

// Database schema definition
interface OfflineDB extends DBSchema {
  tasks: {
    key: string
    value: OfflineTask
    indexes: {
      'by-status': string
      'by-assignee': string
      'by-updated': Date
      'by-sync-status': string
    }
  }
  documents: {
    key: string
    value: OfflineDocument
    indexes: {
      'by-folder': string
      'by-updated': Date
      'by-sync-status': string
    }
  }
  emails: {
    key: string
    value: OfflineEmail
    indexes: {
      'by-account': string
      'by-folder': string
      'by-updated': Date
      'by-sync-status': string
    }
  }
  chat_messages: {
    key: string
    value: OfflineChatMessage
    indexes: {
      'by-channel': string
      'by-updated': Date
      'by-sync-status': string
    }
  }
  tags: {
    key: string
    value: OfflineTag
    indexes: {
      'by-parent': string
      'by-updated': Date
      'by-sync-status': string
    }
  }
  sync_queue: {
    key: string
    value: SyncOperation
    indexes: {
      'by-priority': number
      'by-created': Date
      'by-status': string
    }
  }
  cache_metadata: {
    key: string
    value: CacheMetadata
  }
  user_preferences: {
    key: string
    value: UserPreferences
  }
}

// Offline data types with sync metadata
interface OfflineTask extends Task {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<Task>
  conflictData?: Task
  isDeleted?: boolean
  cachedAt: Date
}

interface OfflineDocument extends Document {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<Document>
  conflictData?: Document
  isDeleted?: boolean
  cachedAt: Date
  localFilePath?: string
  isDownloaded: boolean
}

interface OfflineEmail extends Email {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<Email>
  conflictData?: Email
  isDeleted?: boolean
  cachedAt: Date
}

interface OfflineChatMessage extends ChatMessage {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<ChatMessage>
  conflictData?: ChatMessage
  isDeleted?: boolean
  cachedAt: Date
}

interface OfflineTag extends Tag {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<Tag>
  conflictData?: Tag
  isDeleted?: boolean
  cachedAt: Date
}

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
}

interface CacheMetadata {
  key: string
  size: number
  lastAccessed: Date
  accessCount: number
  priority: number
  expiresAt?: Date
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

// Encryption utilities for offline data
class OfflineEncryption {
  private static async getEncryptionKey(): Promise<CryptoKey> {
    const keyData = localStorage.getItem('offline_encryption_key')
    if (keyData) {
      const keyBuffer = new Uint8Array(JSON.parse(keyData))
      return await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      )
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    const keyBuffer = await crypto.subtle.exportKey('raw', key)
    localStorage.setItem('offline_encryption_key', JSON.stringify(Array.from(new Uint8Array(keyBuffer))))
    
    return key
  }

  static async encrypt(data: any): Promise<string> {
    const key = await this.getEncryptionKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedData = new TextEncoder().encode(JSON.stringify(data))

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    )

    const result = {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData))
    }

    return btoa(JSON.stringify(result))
  }

  static async decrypt(encryptedData: string): Promise<any> {
    const key = await this.getEncryptionKey()
    const { iv, data } = JSON.parse(atob(encryptedData))

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    )

    const decodedData = new TextDecoder().decode(decryptedData)
    return JSON.parse(decodedData)
  }
}

// Main offline storage service
export class OfflineStorageService {
  private db: IDBPDatabase<OfflineDB> | null = null
  private isInitialized = false
  private maxCacheSize = 100 * 1024 * 1024 // 100MB default
  private currentCacheSize = 0

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    this.db = await openDB<OfflineDB>('zetra-offline', 1, {
      upgrade(db) {
        // Tasks store
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' })
        tasksStore.createIndex('by-status', 'status')
        tasksStore.createIndex('by-assignee', 'assignedTo')
        tasksStore.createIndex('by-updated', 'updatedAt')
        tasksStore.createIndex('by-sync-status', 'syncStatus')

        // Documents store
        const documentsStore = db.createObjectStore('documents', { keyPath: 'id' })
        documentsStore.createIndex('by-folder', 'folderId')
        documentsStore.createIndex('by-updated', 'updatedAt')
        documentsStore.createIndex('by-sync-status', 'syncStatus')

        // Emails store
        const emailsStore = db.createObjectStore('emails', { keyPath: 'id' })
        emailsStore.createIndex('by-account', 'accountId')
        emailsStore.createIndex('by-folder', 'folder')
        emailsStore.createIndex('by-updated', 'updatedAt')
        emailsStore.createIndex('by-sync-status', 'syncStatus')

        // Chat messages store
        const chatStore = db.createObjectStore('chat_messages', { keyPath: 'id' })
        chatStore.createIndex('by-channel', 'channelId')
        chatStore.createIndex('by-updated', 'updatedAt')
        chatStore.createIndex('by-sync-status', 'syncStatus')

        // Tags store
        const tagsStore = db.createObjectStore('tags', { keyPath: 'id' })
        tagsStore.createIndex('by-parent', 'parentId')
        tagsStore.createIndex('by-updated', 'updatedAt')
        tagsStore.createIndex('by-sync-status', 'syncStatus')

        // Sync queue store
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
        syncStore.createIndex('by-priority', 'priority')
        syncStore.createIndex('by-created', 'createdAt')
        syncStore.createIndex('by-status', 'status')

        // Cache metadata store
        db.createObjectStore('cache_metadata', { keyPath: 'key' })

        // User preferences store
        db.createObjectStore('user_preferences', { keyPath: 'userId' })
      }
    })

    await this.loadUserPreferences()
    await this.calculateCacheSize()
    this.isInitialized = true
  }

  private async loadUserPreferences(): Promise<void> {
    const userId = this.getCurrentUserId()
    if (!userId) return

    const preferences = await this.db?.get('user_preferences', userId)
    if (preferences) {
      this.maxCacheSize = preferences.maxCacheSize * 1024 * 1024 // Convert MB to bytes
    }
  }

  private getCurrentUserId(): string | null {
    // Get current user ID from auth context or localStorage
    return localStorage.getItem('current_user_id')
  }

  private async calculateCacheSize(): Promise<void> {
    if (!this.db) return

    let totalSize = 0
    const stores = ['tasks', 'documents', 'emails', 'chat_messages', 'tags'] as const

    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const cursor = await store.openCursor()

      while (cursor) {
        const data = JSON.stringify(cursor.value)
        totalSize += new Blob([data]).size
        await cursor.continue()
      }
    }

    this.currentCacheSize = totalSize
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    await this.initialize()
    
    const preferences = await this.db!.get('user_preferences', userId)
    return preferences || {
      userId,
      cacheStrategy: 'balanced',
      maxCacheSize: 100, // MB
      offlineRetentionDays: 30,
      syncOnWifi: true,
      syncOnMobile: false,
      autoDownloadDocuments: false,
      maxDocumentSize: 10 // MB
    }
  }

  async updateUserPreferences(preferences: UserPreferences): Promise<void> {
    await this.initialize()
    await this.db!.put('user_preferences', preferences)
    this.maxCacheSize = preferences.maxCacheSize * 1024 * 1024
  }

  async getCacheSize(): Promise<{ current: number; max: number; percentage: number }> {
    await this.calculateCacheSize()
    return {
      current: this.currentCacheSize,
      max: this.maxCacheSize,
      percentage: (this.currentCacheSize / this.maxCacheSize) * 100
    }
  }

  async cleanupExpiredCache(): Promise<void> {
    await this.initialize()
    if (!this.db) return

    const now = new Date()
    const stores = ['tasks', 'documents', 'emails', 'chat_messages', 'tags'] as const

    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const cursor = await store.openCursor()

      while (cursor) {
        const item = cursor.value as any
        const daysSinceCache = (now.getTime() - item.cachedAt.getTime()) / (1000 * 60 * 60 * 24)
        
        // Remove items older than retention period
        const preferences = await this.getUserPreferences(this.getCurrentUserId() || '')
        if (daysSinceCache > preferences.offlineRetentionDays) {
          await cursor.delete()
        }
        
        await cursor.continue()
      }
    }

    await this.calculateCacheSize()
  }

  async optimizeCache(): Promise<void> {
    await this.initialize()
    if (!this.db) return

    const cacheInfo = await this.getCacheSize()
    if (cacheInfo.percentage < 90) return // Only optimize if cache is > 90% full

    // Remove least recently accessed items
    const metadataStore = this.db.transaction('cache_metadata', 'readwrite').objectStore('cache_metadata')
    const allMetadata = await metadataStore.getAll()
    
    // Sort by last accessed (oldest first)
    allMetadata.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime())

    // Remove oldest 20% of items
    const itemsToRemove = Math.floor(allMetadata.length * 0.2)
    for (let i = 0; i < itemsToRemove; i++) {
      const metadata = allMetadata[i]
      const [storeName, itemId] = metadata.key.split(':')
      
      if (storeName && itemId) {
        const tx = this.db.transaction(storeName as any, 'readwrite')
        await tx.objectStore(storeName as any).delete(itemId)
        await metadataStore.delete(metadata.key)
      }
    }

    await this.calculateCacheSize()
  }

  private async updateCacheMetadata(storeName: string, itemId: string): Promise<void> {
    if (!this.db) return

    const key = `${storeName}:${itemId}`
    const existing = await this.db.get('cache_metadata', key)
    
    const metadata: CacheMetadata = {
      key,
      size: existing?.size || 0,
      lastAccessed: new Date(),
      accessCount: (existing?.accessCount || 0) + 1,
      priority: existing?.priority || 1
    }

    await this.db.put('cache_metadata', metadata)
  }

  // Generic CRUD operations for offline data
  async store<T extends keyof OfflineDB>(
    storeName: T,
    data: OfflineDB[T]['value']
  ): Promise<void> {
    await this.initialize()
    if (!this.db) return

    // Encrypt sensitive data
    const encryptedData = await OfflineEncryption.encrypt(data)
    const dataWithEncryption = { ...data, _encrypted: encryptedData }

    await this.db.put(storeName, dataWithEncryption as any)
    await this.updateCacheMetadata(storeName, (data as any).id)
  }

  async get<T extends keyof OfflineDB>(
    storeName: T,
    id: string
  ): Promise<OfflineDB[T]['value'] | undefined> {
    await this.initialize()
    if (!this.db) return undefined

    const data = await this.db.get(storeName, id)
    if (!data) return undefined

    await this.updateCacheMetadata(storeName, id)

    // Decrypt if encrypted
    if ((data as any)._encrypted) {
      return await OfflineEncryption.decrypt((data as any)._encrypted)
    }

    return data
  }

  async getAll<T extends keyof OfflineDB>(
    storeName: T,
    filter?: (item: OfflineDB[T]['value']) => boolean
  ): Promise<OfflineDB[T]['value'][]> {
    await this.initialize()
    if (!this.db) return []

    const allData = await this.db.getAll(storeName)
    let results = allData

    // Decrypt encrypted items
    results = await Promise.all(
      results.map(async (item) => {
        if ((item as any)._encrypted) {
          return await OfflineEncryption.decrypt((item as any)._encrypted)
        }
        return item
      })
    )

    if (filter) {
      results = results.filter(filter)
    }

    return results
  }

  async delete<T extends keyof OfflineDB>(
    storeName: T,
    id: string
  ): Promise<void> {
    await this.initialize()
    if (!this.db) return

    await this.db.delete(storeName, id)
    await this.db.delete('cache_metadata', `${storeName}:${id}`)
  }

  async clear(): Promise<void> {
    await this.initialize()
    if (!this.db) return

    const stores = ['tasks', 'documents', 'emails', 'chat_messages', 'tags', 'sync_queue', 'cache_metadata'] as const
    
    for (const storeName of stores) {
      await this.db.clear(storeName)
    }

    this.currentCacheSize = 0
  }

  async getStorageStats(): Promise<{
    totalItems: number
    storageSize: number
    itemsByStore: Record<string, number>
    syncPending: number
    conflicts: number
  }> {
    await this.initialize()
    if (!this.db) return {
      totalItems: 0,
      storageSize: 0,
      itemsByStore: {},
      syncPending: 0,
      conflicts: 0
    }

    const stores = ['tasks', 'documents', 'emails', 'chat_messages', 'tags'] as const
    const itemsByStore: Record<string, number> = {}
    let totalItems = 0
    let syncPending = 0
    let conflicts = 0

    for (const storeName of stores) {
      const count = await this.db.count(storeName)
      itemsByStore[storeName] = count
      totalItems += count

      // Count sync status
      const tx = this.db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const cursor = await store.openCursor()

      while (cursor) {
        const item = cursor.value as any
        if (item.syncStatus === 'pending') syncPending++
        if (item.syncStatus === 'conflict') conflicts++
        await cursor.continue()
      }
    }

    return {
      totalItems,
      storageSize: this.currentCacheSize,
      itemsByStore,
      syncPending,
      conflicts
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorageService()