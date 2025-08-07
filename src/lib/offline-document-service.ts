// Offline Document Management Service
import { offlineStorage, OfflineStorageService } from './offline-storage'
import { Document, DocumentType, DocumentStatus, CreateDocumentData, DocumentFilters } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface OfflineDocument extends Document {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  lastSyncAt?: Date
  localChanges?: Partial<Document>
  conflictData?: Document
  isDeleted?: boolean
  cachedAt: Date
  localFilePath?: string
  isDownloaded: boolean
  downloadPriority: number
}

interface OfflineDocumentAnnotation {
  id: string
  documentId: string
  type: 'highlight' | 'comment' | 'drawing' | 'text'
  content: string
  position: {
    page: number
    x: number
    y: number
    width?: number
    height?: number
  }
  style?: {
    color: string
    fontSize?: number
    fontFamily?: string
  }
  createdBy: string
  createdAt: Date
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  isDeleted?: boolean
}

interface OfflineDocumentComment {
  id: string
  documentId: string
  content: string
  position?: {
    page: number
    x: number
    y: number
  }
  parentId?: string
  createdBy: string
  createdAt: Date
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  isDeleted?: boolean
}

interface OfflineDocumentVersion {
  id: string
  documentId: string
  version: number
  filePath: string
  fileSize: number
  checksum: string
  changes: string
  createdBy: string
  createdAt: Date
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error'
  isDeleted?: boolean
}

interface DocumentDownloadOptions {
  priority: 'high' | 'medium' | 'low'
  includeVersions?: boolean
  maxVersions?: number
  quality?: 'original' | 'compressed'
}

export class OfflineDocumentService {
  private storage: OfflineStorageService
  private downloadQueue: Map<string, DocumentDownloadOptions> = new Map()
  private maxCacheSize = 500 * 1024 * 1024 // 500MB default

  constructor() {
    this.storage = offlineStorage
  }

  // Document CRUD Operations
  async createDocument(documentData: CreateDocumentData, file?: File): Promise<Document> {
    await this.storage.initialize()

    const now = new Date()
    const documentId = uuidv4()
    const userId = this.getCurrentUserId()

    let localFilePath: string | undefined
    let isDownloaded = false

    if (file) {
      localFilePath = await this.storeFileLocally(file, documentId)
      isDownloaded = true
    }

    const document: OfflineDocument = {
      id: documentId,
      organizationId: this.getCurrentOrganizationId(),
      name: documentData.name,
      originalName: documentData.name,
      description: null,
      filePath: documentData.filePath,
      localFilePath,
      cloudPath: documentData.filePath,
      thumbnailPath: null,
      fileSize: documentData.fileSize,
      mimeType: documentData.mimeType,
      checksum: await this.calculateChecksum(file),
      type: this.getDocumentType(documentData.mimeType),
      status: 'ACTIVE',
      category: 'GENERAL',
      confidentialityLevel: 'INTERNAL',
      version: 1,
      parentDocumentId: null,
      versionHistory: [],
      folderId: null,
      folderPath: documentData.folderPath || '/',
      tags: [],
      annotations: [],
      comments: [],
      shares: [],
      permissions: [],
      extractedText: null,
      ocrText: null,
      searchableContent: documentData.name,
      metadata: documentData.metadata || {},
      customFields: {},
      uploadedBy: userId,
      uploadedAt: now,
      lastAccessedAt: now,
      lastModifiedAt: now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      // Offline-specific fields
      syncStatus: 'pending',
      cachedAt: now,
      isDownloaded,
      downloadPriority: 1
    }

    await this.storage.store('documents', document)
    await this.queueSyncOperation('create', 'document', documentId, document)

    return document
  }

  async updateDocument(documentId: string, updates: Partial<Document>): Promise<Document> {
    await this.storage.initialize()

    const existingDoc = await this.storage.get('documents', documentId)
    if (!existingDoc) {
      throw new Error('Document not found')
    }

    const now = new Date()
    const updatedDoc: OfflineDocument = {
      ...existingDoc,
      ...updates,
      updatedAt: now,
      lastModifiedAt: now,
      syncStatus: existingDoc.syncStatus === 'synced' ? 'pending' : existingDoc.syncStatus,
      localChanges: {
        ...existingDoc.localChanges,
        ...updates,
        updatedAt: now
      }
    }

    await this.storage.store('documents', updatedDoc)
    await this.queueSyncOperation('update', 'document', documentId, updates)

    return updatedDoc
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.storage.initialize()

    const existingDoc = await this.storage.get('documents', documentId)
    if (!existingDoc) {
      throw new Error('Document not found')
    }

    const now = new Date()
    const deletedDoc: OfflineDocument = {
      ...existingDoc,
      isDeleted: true,
      updatedAt: now,
      syncStatus: 'pending'
    }

    await this.storage.store('documents', deletedDoc)
    await this.queueSyncOperation('delete', 'document', documentId, { isDeleted: true })

    // Clean up local file
    if (existingDoc.localFilePath) {
      await this.deleteLocalFile(existingDoc.localFilePath)
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    await this.storage.initialize()

    const document = await this.storage.get('documents', documentId)
    if (!document || document.isDeleted) {
      return null
    }

    // Update last accessed time
    await this.updateDocument(documentId, { lastAccessedAt: new Date() })

    return document
  }

  async getDocuments(filters?: DocumentFilters): Promise<Document[]> {
    await this.storage.initialize()

    const allDocs = await this.storage.getAll('documents', (doc) => {
      if (doc.isDeleted) return false

      // Apply filters
      if (filters?.mimeType && !filters.mimeType.includes(doc.mimeType)) return false
      if (filters?.folderPath && doc.folderPath !== filters.folderPath) return false
      if (filters?.uploadedBy && doc.uploadedBy !== filters.uploadedBy) return false
      if (filters?.dateRange) {
        const uploadDate = new Date(doc.uploadedAt)
        const [start, end] = filters.dateRange
        if (uploadDate < start || uploadDate > end) return false
      }

      return true
    })

    return allDocs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  // Document Download Management
  async downloadDocument(
    documentId: string, 
    options: DocumentDownloadOptions = { priority: 'medium' }
  ): Promise<void> {
    await this.storage.initialize()

    const document = await this.storage.get('documents', documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    if (document.isDownloaded) {
      return // Already downloaded
    }

    // Add to download queue
    this.downloadQueue.set(documentId, options)

    // If online, start download immediately
    if (navigator.onLine) {
      await this.processDownloadQueue()
    }
  }

  async downloadDocumentForOffline(documentId: string): Promise<void> {
    await this.downloadDocument(documentId, { priority: 'high' })
  }

  private async processDownloadQueue(): Promise<void> {
    const sortedQueue = Array.from(this.downloadQueue.entries())
      .sort(([, a], [, b]) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

    for (const [documentId, options] of sortedQueue) {
      try {
        await this.downloadDocumentFile(documentId, options)
        this.downloadQueue.delete(documentId)
      } catch (error) {
        console.error(`Failed to download document ${documentId}:`, error)
        // Keep in queue for retry
      }
    }
  }

  private async downloadDocumentFile(
    documentId: string, 
    options: DocumentDownloadOptions
  ): Promise<void> {
    const document = await this.storage.get('documents', documentId)
    if (!document) return

    try {
      // Download file from server
      const response = await fetch(`/api/documents/${documentId}/download`)
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const localFilePath = await this.storeFileLocally(
        new File([blob], document.name, { type: document.mimeType }),
        documentId
      )

      // Update document with local file path
      await this.updateDocument(documentId, {
        localFilePath,
        isDownloaded: true
      } as any)

      // Download versions if requested
      if (options.includeVersions) {
        await this.downloadDocumentVersions(documentId, options.maxVersions)
      }
    } catch (error) {
      console.error(`Failed to download document ${documentId}:`, error)
      throw error
    }
  }

  private async downloadDocumentVersions(
    documentId: string, 
    maxVersions?: number
  ): Promise<void> {
    // Implementation for downloading document versions
    // This would fetch version history and download each version file
  }

  // Document Annotations (offline)
  async addAnnotation(
    documentId: string,
    annotation: Omit<OfflineDocumentAnnotation, 'id' | 'documentId' | 'createdBy' | 'createdAt' | 'syncStatus'>
  ): Promise<OfflineDocumentAnnotation> {
    await this.storage.initialize()

    const annotationId = uuidv4()
    const now = new Date()
    const userId = this.getCurrentUserId()

    const newAnnotation: OfflineDocumentAnnotation = {
      id: annotationId,
      documentId,
      ...annotation,
      createdBy: userId,
      createdAt: now,
      syncStatus: 'pending',
      isDeleted: false
    }

    // Store annotation (would need separate store in schema)
    await this.queueSyncOperation('create', 'document_annotation', annotationId, newAnnotation)

    return newAnnotation
  }

  async updateAnnotation(
    annotationId: string,
    updates: Partial<OfflineDocumentAnnotation>
  ): Promise<OfflineDocumentAnnotation> {
    // Implementation for updating annotations
    await this.queueSyncOperation('update', 'document_annotation', annotationId, updates)
    
    // Return updated annotation (would need to fetch from store)
    return {} as OfflineDocumentAnnotation
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    await this.queueSyncOperation('delete', 'document_annotation', annotationId, { isDeleted: true })
  }

  // Document Comments (offline)
  async addComment(
    documentId: string,
    content: string,
    position?: { page: number; x: number; y: number },
    parentId?: string
  ): Promise<OfflineDocumentComment> {
    await this.storage.initialize()

    const commentId = uuidv4()
    const now = new Date()
    const userId = this.getCurrentUserId()

    const comment: OfflineDocumentComment = {
      id: commentId,
      documentId,
      content,
      position,
      parentId,
      createdBy: userId,
      createdAt: now,
      syncStatus: 'pending',
      isDeleted: false
    }

    await this.queueSyncOperation('create', 'document_comment', commentId, comment)

    return comment
  }

  // Document Search (offline)
  async searchDocuments(query: string): Promise<Document[]> {
    await this.storage.initialize()

    const searchLower = query.toLowerCase()
    const allDocs = await this.storage.getAll('documents', (doc) => {
      if (doc.isDeleted) return false

      const nameMatch = doc.name.toLowerCase().includes(searchLower)
      const descMatch = doc.description?.toLowerCase().includes(searchLower)
      const contentMatch = doc.searchableContent?.toLowerCase().includes(searchLower)
      const extractedMatch = doc.extractedText?.toLowerCase().includes(searchLower)

      return nameMatch || descMatch || contentMatch || extractedMatch
    })

    return allDocs.sort((a, b) => b.lastAccessedAt!.getTime() - a.lastAccessedAt!.getTime())
  }

  async searchDocumentsByTags(tags: string[]): Promise<Document[]> {
    await this.storage.initialize()

    return this.storage.getAll('documents', (doc) => {
      if (doc.isDeleted) return false
      return tags.some(tag => doc.tags.includes(tag))
    })
  }

  // Document Organization (offline)
  async moveDocument(documentId: string, newFolderPath: string): Promise<Document> {
    return this.updateDocument(documentId, { folderPath: newFolderPath })
  }

  async tagDocument(documentId: string, tags: string[]): Promise<Document> {
    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const uniqueTags = Array.from(new Set([...document.tags, ...tags]))
    return this.updateDocument(documentId, { tags: uniqueTags })
  }

  async untagDocument(documentId: string, tagsToRemove: string[]): Promise<Document> {
    const document = await this.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const filteredTags = document.tags.filter(tag => !tagsToRemove.includes(tag))
    return this.updateDocument(documentId, { tags: filteredTags })
  }

  // Document Sharing (offline preparation)
  async prepareDocumentForSharing(
    documentId: string,
    shareConfig: {
      recipients: string[]
      permissions: string[]
      expiresAt?: Date
      message?: string
    }
  ): Promise<void> {
    await this.storage.initialize()

    const shareData = {
      documentId,
      ...shareConfig,
      preparedAt: new Date(),
      status: 'pending'
    }

    await this.queueSyncOperation('create', 'document_share', uuidv4(), shareData)
  }

  // Document Version Management (offline)
  async createDocumentVersion(
    documentId: string,
    file: File,
    changes: string
  ): Promise<OfflineDocumentVersion> {
    await this.storage.initialize()

    const document = await this.storage.get('documents', documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    const versionId = uuidv4()
    const now = new Date()
    const userId = this.getCurrentUserId()

    // Store new version file locally
    const localFilePath = await this.storeFileLocally(file, `${documentId}_v${document.version + 1}`)

    const version: OfflineDocumentVersion = {
      id: versionId,
      documentId,
      version: document.version + 1,
      filePath: localFilePath,
      fileSize: file.size,
      checksum: await this.calculateChecksum(file),
      changes,
      createdBy: userId,
      createdAt: now,
      syncStatus: 'pending',
      isDeleted: false
    }

    // Update document version
    await this.updateDocument(documentId, { 
      version: version.version,
      fileSize: file.size,
      checksum: version.checksum,
      lastModifiedAt: now
    })

    await this.queueSyncOperation('create', 'document_version', versionId, version)

    return version
  }

  // File Management Utilities
  private async storeFileLocally(file: File, fileId: string): Promise<string> {
    const fileData = await file.arrayBuffer()
    const filePath = `offline_documents/${fileId}_${file.name}`
    
    // Store file data in IndexedDB (in a real implementation, might use File System Access API)
    const fileInfo = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: Array.from(new Uint8Array(fileData)),
      storedAt: new Date()
    }

    localStorage.setItem(`doc_file_${fileId}`, JSON.stringify(fileInfo))
    return filePath
  }

  private async deleteLocalFile(filePath: string): Promise<void> {
    const fileId = filePath.split('/').pop()?.split('_')[0]
    if (fileId) {
      localStorage.removeItem(`doc_file_${fileId}`)
    }
  }

  async getLocalFile(filePath: string): Promise<File | null> {
    const fileId = filePath.split('/').pop()?.split('_')[0]
    if (!fileId) return null

    const fileInfoStr = localStorage.getItem(`doc_file_${fileId}`)
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

  private async calculateChecksum(file?: File): Promise<string> {
    if (!file) return ''

    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private getDocumentType(mimeType: string): DocumentType {
    if (mimeType.startsWith('image/')) return 'IMAGE'
    if (mimeType === 'application/pdf') return 'PDF'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCUMENT'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'SPREADSHEET'
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PRESENTATION'
    return 'OTHER'
  }

  // Sync queue management
  private async queueSyncOperation(
    type: 'create' | 'update' | 'delete',
    resourceType: string,
    resourceId: string,
    data: any
  ): Promise<void> {
    const operation = {
      id: uuidv4(),
      type,
      resourceType,
      resourceId,
      data,
      priority: this.getSyncPriority(type, resourceType),
      status: 'pending' as const,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date()
    }

    await this.storage.store('sync_queue', operation)
  }

  private getSyncPriority(type: string, resourceType: string): number {
    // Higher priority for critical operations
    if (type === 'delete') return 1
    if (type === 'create') return 2
    if (type === 'update') return 3
    return 4
  }

  // Utility methods
  private getCurrentUserId(): string {
    return localStorage.getItem('current_user_id') || 'offline_user'
  }

  private getCurrentOrganizationId(): string {
    return localStorage.getItem('current_organization_id') || 'offline_org'
  }

  // Statistics and monitoring
  async getOfflineDocumentStats(): Promise<{
    totalDocuments: number
    downloadedDocuments: number
    pendingSync: number
    conflicts: number
    storageUsed: number
    annotationsCount: number
    commentsCount: number
  }> {
    await this.storage.initialize()

    const allDocs = await this.storage.getAll('documents')
    const downloadedDocs = allDocs.filter(d => d.isDownloaded && !d.isDeleted)
    const pendingSync = allDocs.filter(d => d.syncStatus === 'pending')
    const conflicts = allDocs.filter(d => d.syncStatus === 'conflict')

    // Calculate storage used
    let storageUsed = 0
    for (const doc of downloadedDocs) {
      storageUsed += doc.fileSize
    }

    return {
      totalDocuments: allDocs.filter(d => !d.isDeleted).length,
      downloadedDocuments: downloadedDocs.length,
      pendingSync: pendingSync.length,
      conflicts: conflicts.length,
      storageUsed,
      annotationsCount: 0, // Would need to count from annotations store
      commentsCount: 0 // Would need to count from comments store
    }
  }

  // Cache management
  async optimizeDocumentCache(): Promise<void> {
    await this.storage.initialize()

    const cacheInfo = await this.storage.getCacheSize()
    if (cacheInfo.percentage < 90) return

    // Remove least recently accessed documents
    const allDocs = await this.storage.getAll('documents')
    const downloadedDocs = allDocs
      .filter(d => d.isDownloaded && !d.isDeleted)
      .sort((a, b) => a.lastAccessedAt!.getTime() - b.lastAccessedAt!.getTime())

    // Remove oldest 20% of downloaded documents
    const docsToRemove = Math.floor(downloadedDocs.length * 0.2)
    for (let i = 0; i < docsToRemove; i++) {
      const doc = downloadedDocs[i]
      if (doc.localFilePath) {
        await this.deleteLocalFile(doc.localFilePath)
        await this.updateDocument(doc.id, { 
          isDownloaded: false, 
          localFilePath: undefined 
        } as any)
      }
    }
  }
}

// Singleton instance
export const offlineDocumentService = new OfflineDocumentService()