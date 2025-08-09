// Offline Chat Service
// Handles offline message queuing, storage, and synchronization

import { openDB, IDBPDatabase } from 'idb'
import type { ChatMessageWithUser } from './websocket-server'

interface OfflineMessage {
  id: string
  channelId: string
  content: string
  messageType: string
  metadata?: Record<string, any>
  repliedToId?: string
  tempId: string // Temporary ID for offline messages
  timestamp: number
  synced: boolean
  retryCount: number
  lastRetryAt?: number
}

interface OfflineChannel {
  id: string
  name: string
  type: string
  lastSyncAt: number
  messageCount: number
}

interface MessageDraft {
  channelId: string
  content: string
  repliedToId?: string
  timestamp: number
}

class OfflineChatService {
  private db: IDBPDatabase | null = null
  private readonly DB_NAME = 'zetra_chat_offline'
  private readonly DB_VERSION = 1
  private syncQueue: OfflineMessage[] = []
  private isOnline = typeof window !== 'undefined' ? navigator.onLine : false
  private syncInProgress = false

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initDB()
      this.setupOnlineListener()
    }
  }

  // Check if we're in browser environment
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
  }

  // Initialize IndexedDB
  private async initDB() {
    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Messages store
          if (!db.objectStoreNames.contains('messages')) {
            const messagesStore = db.createObjectStore('messages', { keyPath: 'id' })
            messagesStore.createIndex('channelId', 'channelId')
            messagesStore.createIndex('timestamp', 'timestamp')
            messagesStore.createIndex('synced', 'synced')
          }

          // Offline messages queue
          if (!db.objectStoreNames.contains('offlineMessages')) {
            const offlineStore = db.createObjectStore('offlineMessages', { keyPath: 'tempId' })
            offlineStore.createIndex('channelId', 'channelId')
            offlineStore.createIndex('timestamp', 'timestamp')
            offlineStore.createIndex('synced', 'synced')
          }

          // Channels cache
          if (!db.objectStoreNames.contains('channels')) {
            const channelsStore = db.createObjectStore('channels', { keyPath: 'id' })
            channelsStore.createIndex('lastSyncAt', 'lastSyncAt')
          }

          // Message drafts
          if (!db.objectStoreNames.contains('drafts')) {
            const draftsStore = db.createObjectStore('drafts', { keyPath: 'channelId' })
            draftsStore.createIndex('timestamp', 'timestamp')
          }

          // User cache
          if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id' })
          }
        }
      })

      console.log('Offline chat database initialized')
    } catch (error) {
      console.error('Failed to initialize offline chat database:', error)
    }
  }

  // Setup online/offline listeners
  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('Connection restored, syncing offline messages...')
      this.isOnline = true
      this.syncOfflineMessages()
    })

    window.addEventListener('offline', () => {
      console.log('Connection lost, switching to offline mode')
      this.isOnline = false
    })
  }

  // Cache messages for offline access
  async cacheMessages(channelId: string, messages: ChatMessageWithUser[]): Promise<void> {
    if (!this.isBrowser() || !this.db) return

    try {
      const tx = this.db.transaction('messages', 'readwrite')
      const store = tx.objectStore('messages')

      for (const message of messages) {
        await store.put({
          ...message,
          channelId,
          cached: true,
          cachedAt: Date.now()
        })
      }

      await tx.done

      // Update channel cache info
      await this.updateChannelCache(channelId, messages.length)

    } catch (error) {
      console.error('Error caching messages:', error)
    }
  }

  // Get cached messages for offline viewing
  async getCachedMessages(channelId: string, limit = 50): Promise<ChatMessageWithUser[]> {
    if (!this.isBrowser() || !this.db) return []

    try {
      const tx = this.db.transaction('messages', 'readonly')
      const store = tx.objectStore('messages')
      const index = store.index('channelId')

      const messages = await index.getAll(channelId)
      
      // Sort by timestamp and limit
      return messages
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
        .reverse() // Show oldest first

    } catch (error) {
      console.error('Error getting cached messages:', error)
      return []
    }
  }

  // Send message (queue if offline)
  async sendMessage(
    channelId: string,
    content: string,
    options: {
      messageType?: string
      repliedToId?: string
      metadata?: Record<string, any>
    } = {}
  ): Promise<{ tempId: string; queued: boolean }> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const offlineMessage: OfflineMessage = {
      id: '', // Will be set when synced
      channelId,
      content,
      messageType: options.messageType || 'TEXT',
      metadata: options.metadata,
      repliedToId: options.repliedToId,
      tempId,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    }

    if (this.isOnline) {
      // Try to send immediately
      try {
        await this.syncMessage(offlineMessage)
        return { tempId, queued: false }
      } catch (error) {
        console.error('Failed to send message, queuing for later:', error)
        await this.queueMessage(offlineMessage)
        return { tempId, queued: true }
      }
    } else {
      // Queue for later
      await this.queueMessage(offlineMessage)
      return { tempId, queued: true }
    }
  }

  // Queue message for offline sending
  private async queueMessage(message: OfflineMessage): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction('offlineMessages', 'readwrite')
      const store = tx.objectStore('offlineMessages')
      await store.put(message)
      await tx.done

      this.syncQueue.push(message)

      // Add to local message cache for immediate display
      await this.addLocalMessage(message)

    } catch (error) {
      console.error('Error queuing message:', error)
    }
  }

  // Add message to local cache for immediate display
  private async addLocalMessage(offlineMessage: OfflineMessage): Promise<void> {
    if (!this.db) return

    try {
      // Create a temporary message for display
      const localMessage: ChatMessageWithUser = {
        id: offlineMessage.tempId,
        channelId: offlineMessage.channelId,
        userId: 'current-user', // Would get from auth context
        content: offlineMessage.content,
        messageType: offlineMessage.messageType as any,
        metadata: offlineMessage.metadata || {},
        repliedToId: offlineMessage.repliedToId,
        createdAt: new Date(offlineMessage.timestamp),
        updatedAt: new Date(offlineMessage.timestamp),
        user: {
          id: 'current-user',
          firstName: 'You',
          lastName: '',
          email: '',
          role: 'USER'
        },
        repliedTo: undefined
      }

      const tx = this.db.transaction('messages', 'readwrite')
      const store = tx.objectStore('messages')
      await store.put({
        ...localMessage,
        isOffline: true,
        synced: false
      })
      await tx.done

    } catch (error) {
      console.error('Error adding local message:', error)
    }
  }

  // Sync offline messages when online
  async syncOfflineMessages(): Promise<void> {
    if (!this.isBrowser() || !this.db || this.syncInProgress || !this.isOnline) return

    this.syncInProgress = true

    try {
      const tx = this.db.transaction('offlineMessages', 'readonly')
      const store = tx.objectStore('offlineMessages')
      const index = store.index('synced')
      const unsynced = await index.getAll(false)

      console.log(`Syncing ${unsynced.length} offline messages...`)

      for (const message of unsynced) {
        try {
          await this.syncMessage(message)
          await this.markMessageSynced(message.tempId)
        } catch (error) {
          console.error(`Failed to sync message ${message.tempId}:`, error)
          await this.incrementRetryCount(message.tempId)
        }
      }

    } catch (error) {
      console.error('Error syncing offline messages:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Sync individual message
  private async syncMessage(message: OfflineMessage): Promise<void> {
    const response = await fetch(`/api/chat/channels/${message.channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        content: message.content,
        messageType: message.messageType,
        metadata: message.metadata,
        repliedToId: message.repliedToId,
        tempId: message.tempId
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to sync message')
    }

    // Update local cache with real message ID
    await this.updateLocalMessage(message.tempId, result.data)
  }

  // Mark message as synced
  private async markMessageSynced(tempId: string): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction('offlineMessages', 'readwrite')
      const store = tx.objectStore('offlineMessages')
      const message = await store.get(tempId)
      
      if (message) {
        message.synced = true
        await store.put(message)
      }
      
      await tx.done
    } catch (error) {
      console.error('Error marking message as synced:', error)
    }
  }

  // Update local message with synced data
  private async updateLocalMessage(tempId: string, syncedMessage: any): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction('messages', 'readwrite')
      const store = tx.objectStore('messages')
      
      // Remove temporary message
      await store.delete(tempId)
      
      // Add synced message
      await store.put({
        ...syncedMessage,
        synced: true,
        isOffline: false
      })
      
      await tx.done
    } catch (error) {
      console.error('Error updating local message:', error)
    }
  }

  // Increment retry count for failed messages
  private async incrementRetryCount(tempId: string): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction('offlineMessages', 'readwrite')
      const store = tx.objectStore('offlineMessages')
      const message = await store.get(tempId)
      
      if (message) {
        message.retryCount++
        message.lastRetryAt = Date.now()
        await store.put(message)
      }
      
      await tx.done
    } catch (error) {
      console.error('Error incrementing retry count:', error)
    }
  }

  // Save message draft
  async saveDraft(channelId: string, content: string, repliedToId?: string): Promise<void> {
    if (!this.db || !content.trim()) return

    try {
      const draft: MessageDraft = {
        channelId,
        content: content.trim(),
        repliedToId,
        timestamp: Date.now()
      }

      const tx = this.db.transaction('drafts', 'readwrite')
      const store = tx.objectStore('drafts')
      await store.put(draft)
      await tx.done

    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }

  // Get message draft
  async getDraft(channelId: string): Promise<MessageDraft | null> {
    if (!this.db) return null

    try {
      const tx = this.db.transaction('drafts', 'readonly')
      const store = tx.objectStore('drafts')
      const draft = await store.get(channelId)
      return draft || null

    } catch (error) {
      console.error('Error getting draft:', error)
      return null
    }
  }

  // Clear message draft
  async clearDraft(channelId: string): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction('drafts', 'readwrite')
      const store = tx.objectStore('drafts')
      await store.delete(channelId)
      await tx.done

    } catch (error) {
      console.error('Error clearing draft:', error)
    }
  }

  // Update channel cache info
  private async updateChannelCache(channelId: string, messageCount: number): Promise<void> {
    if (!this.db) return

    try {
      const tx = this.db.transaction('channels', 'readwrite')
      const store = tx.objectStore('channels')
      
      const existing = await store.get(channelId)
      const channelCache: OfflineChannel = {
        id: channelId,
        name: existing?.name || 'Unknown Channel',
        type: existing?.type || 'GROUP',
        lastSyncAt: Date.now(),
        messageCount: existing ? existing.messageCount + messageCount : messageCount
      }

      await store.put(channelCache)
      await tx.done

    } catch (error) {
      console.error('Error updating channel cache:', error)
    }
  }

  // Get offline status
  getOfflineStatus(): {
    isOnline: boolean
    queuedMessages: number
    syncInProgress: boolean
  } {
    return {
      isOnline: this.isOnline,
      queuedMessages: this.syncQueue.length,
      syncInProgress: this.syncInProgress
    }
  }

  // Clear all offline data (for logout/reset)
  async clearOfflineData(): Promise<void> {
    if (!this.db) return

    try {
      const stores = ['messages', 'offlineMessages', 'channels', 'drafts', 'users']
      
      for (const storeName of stores) {
        const tx = this.db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        await store.clear()
        await tx.done
      }

      this.syncQueue = []
      console.log('Offline chat data cleared')

    } catch (error) {
      console.error('Error clearing offline data:', error)
    }
  }
}

export const offlineChatService = new OfflineChatService()
export default offlineChatService