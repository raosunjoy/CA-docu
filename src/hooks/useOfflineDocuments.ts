// Offline Documents Hook - Enhanced document management with offline capabilities
import { useState, useCallback, useEffect } from 'react'
import { Document, CreateDocumentData, DocumentFilters } from '@/types'
import { offlineDocumentService } from '@/lib/offline-document-service'

interface OfflineDocumentsState {
  documents: Document[]
  loading: boolean
  error: string | null
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  downloadQueue: number
  storageUsed: number
  maxStorage: number
  conflicts: number
  lastSyncAt?: Date
}

interface OfflineDocumentsActions {
  // Core CRUD operations
  fetchDocuments: (filters?: DocumentFilters) => Promise<void>
  createDocument: (documentData: CreateDocumentData, file?: File) => Promise<Document>
  updateDocument: (documentId: string, updates: Partial<Document>) => Promise<Document>
  deleteDocument: (documentId: string) => Promise<void>
  getDocument: (documentId: string) => Promise<Document | null>
  
  // Download management
  downloadDocument: (documentId: string, priority?: 'high' | 'medium' | 'low') => Promise<void>
  downloadForOffline: (documentId: string) => Promise<void>
  getLocalFile: (documentId: string) => Promise<File | null>
  
  // Search and organization
  searchDocuments: (query: string) => Promise<Document[]>
  searchByTags: (tags: string[]) => Promise<Document[]>
  moveDocument: (documentId: string, folderPath: string) => Promise<Document>
  tagDocument: (documentId: string, tags: string[]) => Promise<Document>
  untagDocument: (documentId: string, tags: string[]) => Promise<Document>
  
  // Annotations and comments
  addAnnotation: (documentId: string, annotation: any) => Promise<any>
  updateAnnotation: (annotationId: string, updates: any) => Promise<any>
  deleteAnnotation: (annotationId: string) => Promise<void>
  addComment: (documentId: string, content: string, position?: any) => Promise<any>
  
  // Version management
  createVersion: (documentId: string, file: File, changes: string) => Promise<any>
  
  // Sharing
  prepareForSharing: (documentId: string, shareConfig: any) => Promise<void>
  
  // Sync and conflict resolution
  syncDocuments: () => Promise<void>
  resolveConflict: (documentId: string, resolution: 'local' | 'remote' | 'merge') => Promise<Document>
  
  // Cache management
  optimizeCache: () => Promise<void>
  clearCache: () => Promise<void>
  
  // Utility operations
  clearError: () => void
  refreshStats: () => Promise<void>
}

export function useOfflineDocuments(): OfflineDocumentsState & OfflineDocumentsActions {
  const [state, setState] = useState<OfflineDocumentsState>({
    documents: [],
    loading: false,
    error: null,
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    downloadQueue: 0,
    storageUsed: 0,
    maxStorage: 500 * 1024 * 1024, // 500MB
    conflicts: 0
  })

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
      // Auto-sync when coming back online
      syncDocuments()
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
  }, [])

  // Load stats on mount
  useEffect(() => {
    refreshStats()
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const stats = await offlineDocumentService.getOfflineDocumentStats()
      setState(prev => ({
        ...prev,
        storageUsed: stats.storageUsed,
        conflicts: stats.conflicts,
        downloadQueue: 0 // Would need to track download queue size
      }))
    } catch (error) {
      console.error('Failed to refresh document stats:', error)
    }
  }, [])

  const fetchDocuments = useCallback(async (filters?: DocumentFilters) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let documents: Document[]

      if (state.isOnline) {
        // Try to fetch from server first
        try {
          const response = await fetch('/api/documents')
          const data = await response.json()
          
          if (data.success) {
            documents = data.data
            
            // Cache documents offline
            for (const doc of documents) {
              await offlineDocumentService.updateDocument(doc.id, doc)
            }
          } else {
            throw new Error(data.error?.message || 'Failed to fetch documents')
          }
        } catch (error) {
          // Fallback to offline data
          documents = await offlineDocumentService.getDocuments(filters)
        }
      } else {
        // Load from offline storage
        documents = await offlineDocumentService.getDocuments(filters)
      }

      setState(prev => ({
        ...prev,
        documents,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents'
      }))
    }
  }, [state.isOnline])

  const createDocument = useCallback(async (
    documentData: CreateDocumentData, 
    file?: File
  ): Promise<Document> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      let document: Document

      if (state.isOnline && !file) {
        // Try online creation first (for metadata only)
        try {
          const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(documentData)
          })
          
          const data = await response.json()
          if (data.success) {
            document = data.data
            // Cache offline
            await offlineDocumentService.updateDocument(document.id, document)
          } else {
            throw new Error(data.error?.message || 'Failed to create document')
          }
        } catch (error) {
          // Fallback to offline creation
          document = await offlineDocumentService.createDocument(documentData, file)
        }
      } else {
        // Create offline (especially when file is provided)
        document = await offlineDocumentService.createDocument(documentData, file)
      }

      setState(prev => ({
        ...prev,
        documents: [document, ...prev.documents]
      }))

      await refreshStats()
      return document
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create document'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, refreshStats])

  const updateDocument = useCallback(async (
    documentId: string, 
    updates: Partial<Document>
  ): Promise<Document> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      let document: Document

      if (state.isOnline) {
        // Try online update first
        try {
          const response = await fetch(`/api/documents/${documentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })
          
          const data = await response.json()
          if (data.success) {
            document = data.data
            // Update offline cache
            await offlineDocumentService.updateDocument(documentId, document)
          } else {
            throw new Error(data.error?.message || 'Failed to update document')
          }
        } catch (error) {
          // Fallback to offline update
          document = await offlineDocumentService.updateDocument(documentId, updates)
        }
      } else {
        // Update offline
        document = await offlineDocumentService.updateDocument(documentId, updates)
      }

      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d => d.id === documentId ? document : d)
      }))

      await refreshStats()
      return document
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update document'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, refreshStats])

  const deleteDocument = useCallback(async (documentId: string): Promise<void> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      if (state.isOnline) {
        // Try online deletion first
        try {
          const response = await fetch(`/api/documents/${documentId}`, {
            method: 'DELETE'
          })
          
          const data = await response.json()
          if (!data.success) {
            throw new Error(data.error?.message || 'Failed to delete document')
          }
          
          // Mark as deleted offline
          await offlineDocumentService.deleteDocument(documentId)
        } catch (error) {
          // Fallback to offline deletion
          await offlineDocumentService.deleteDocument(documentId)
        }
      } else {
        // Delete offline
        await offlineDocumentService.deleteDocument(documentId)
      }

      setState(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d.id !== documentId)
      }))

      await refreshStats()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete document'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, refreshStats])

  const getDocument = useCallback(async (documentId: string): Promise<Document | null> => {
    try {
      if (state.isOnline) {
        // Try online first
        try {
          const response = await fetch(`/api/documents/${documentId}`)
          const data = await response.json()
          
          if (data.success) {
            // Cache offline
            await offlineDocumentService.updateDocument(documentId, data.data)
            return data.data
          }
        } catch (error) {
          // Fallback to offline
          return await offlineDocumentService.getDocument(documentId)
        }
      } else {
        // Get from offline storage
        return await offlineDocumentService.getDocument(documentId)
      }
    } catch (error) {
      console.error('Failed to get document:', error)
      return null
    }
  }, [state.isOnline])

  const downloadDocument = useCallback(async (
    documentId: string, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> => {
    if (!state.isOnline) {
      throw new Error('Cannot download documents while offline')
    }

    try {
      await offlineDocumentService.downloadDocument(documentId, { priority })
      await refreshStats()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download document'
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [state.isOnline, refreshStats])

  const downloadForOffline = useCallback(async (documentId: string): Promise<void> => {
    return downloadDocument(documentId, 'high')
  }, [downloadDocument])

  const getLocalFile = useCallback(async (documentId: string): Promise<File | null> => {
    const document = await offlineDocumentService.getDocument(documentId)
    if (!document || !document.localFilePath) {
      return null
    }

    return await offlineDocumentService.getLocalFile(document.localFilePath)
  }, [])

  const searchDocuments = useCallback(async (query: string): Promise<Document[]> => {
    try {
      return await offlineDocumentService.searchDocuments(query)
    } catch (error) {
      console.error('Failed to search documents:', error)
      return []
    }
  }, [])

  const searchByTags = useCallback(async (tags: string[]): Promise<Document[]> => {
    try {
      return await offlineDocumentService.searchDocumentsByTags(tags)
    } catch (error) {
      console.error('Failed to search documents by tags:', error)
      return []
    }
  }, [])

  const moveDocument = useCallback(async (
    documentId: string, 
    folderPath: string
  ): Promise<Document> => {
    return offlineDocumentService.moveDocument(documentId, folderPath)
  }, [])

  const tagDocument = useCallback(async (
    documentId: string, 
    tags: string[]
  ): Promise<Document> => {
    return offlineDocumentService.tagDocument(documentId, tags)
  }, [])

  const untagDocument = useCallback(async (
    documentId: string, 
    tags: string[]
  ): Promise<Document> => {
    return offlineDocumentService.untagDocument(documentId, tags)
  }, [])

  const addAnnotation = useCallback(async (documentId: string, annotation: any) => {
    return offlineDocumentService.addAnnotation(documentId, annotation)
  }, [])

  const updateAnnotation = useCallback(async (annotationId: string, updates: any) => {
    return offlineDocumentService.updateAnnotation(annotationId, updates)
  }, [])

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    return offlineDocumentService.deleteAnnotation(annotationId)
  }, [])

  const addComment = useCallback(async (
    documentId: string, 
    content: string, 
    position?: any
  ) => {
    return offlineDocumentService.addComment(documentId, content, position)
  }, [])

  const createVersion = useCallback(async (
    documentId: string, 
    file: File, 
    changes: string
  ) => {
    return offlineDocumentService.createDocumentVersion(documentId, file, changes)
  }, [])

  const prepareForSharing = useCallback(async (
    documentId: string, 
    shareConfig: any
  ) => {
    return offlineDocumentService.prepareDocumentForSharing(documentId, shareConfig)
  }, [])

  const syncDocuments = useCallback(async (): Promise<void> => {
    if (!state.isOnline) {
      throw new Error('Cannot sync while offline')
    }

    setState(prev => ({ ...prev, syncStatus: 'syncing' }))

    try {
      // Implementation would sync pending operations with server
      // For now, just update sync status
      setState(prev => ({ 
        ...prev, 
        syncStatus: 'idle',
        lastSyncAt: new Date()
      }))

      await refreshStats()
    } catch (error) {
      setState(prev => ({ ...prev, syncStatus: 'error' }))
      throw error
    }
  }, [state.isOnline, refreshStats])

  const resolveConflict = useCallback(async (
    documentId: string, 
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<Document> => {
    // Implementation would resolve document conflicts
    const document = await offlineDocumentService.getDocument(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(d => d.id === documentId ? document : d)
    }))

    await refreshStats()
    return document
  }, [refreshStats])

  const optimizeCache = useCallback(async (): Promise<void> => {
    try {
      await offlineDocumentService.optimizeDocumentCache()
      await refreshStats()
    } catch (error) {
      console.error('Failed to optimize cache:', error)
    }
  }, [refreshStats])

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      // Implementation would clear document cache
      await refreshStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }, [refreshStats])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    downloadDocument,
    downloadForOffline,
    getLocalFile,
    searchDocuments,
    searchByTags,
    moveDocument,
    tagDocument,
    untagDocument,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    addComment,
    createVersion,
    prepareForSharing,
    syncDocuments,
    resolveConflict,
    optimizeCache,
    clearCache,
    clearError,
    refreshStats
  }
}