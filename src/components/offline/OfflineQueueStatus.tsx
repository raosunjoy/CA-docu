// Offline Queue Status Component - Shows pending operations and sync progress
'use client'

import React, { useState, useEffect } from 'react'
import { useSync } from '@/hooks/useSync'

interface QueueOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  resourceType: string
  resourceId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  error?: string
}

interface OfflineQueueStatusProps {
  isOpen: boolean
  onClose: () => void
}

export function OfflineQueueStatus({ isOpen, onClose }: OfflineQueueStatusProps) {
  const { 
    pendingOperations, 
    isSyncing, 
    syncProgress, 
    isOnline,
    startSync 
  } = useSync()
  
  const [operations, setOperations] = useState<QueueOperation[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadOperations()
    }
  }, [isOpen])

  const loadOperations = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would fetch from the sync queue
      // For now, we'll simulate some operations
      const mockOperations: QueueOperation[] = [
        {
          id: '1',
          type: 'create',
          resourceType: 'task',
          resourceId: 'task-123',
          status: 'pending',
          createdAt: new Date(Date.now() - 300000) // 5 minutes ago
        },
        {
          id: '2',
          type: 'update',
          resourceType: 'document',
          resourceId: 'doc-456',
          status: 'pending',
          createdAt: new Date(Date.now() - 180000) // 3 minutes ago
        },
        {
          id: '3',
          type: 'delete',
          resourceType: 'task',
          resourceId: 'task-789',
          status: 'failed',
          createdAt: new Date(Date.now() - 120000), // 2 minutes ago
          error: 'Network timeout'
        }
      ]
      
      setOperations(mockOperations)
    } catch (error) {
      console.error('Failed to load operations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOperationIcon = (type: string) => {
    const icons = {
      create: (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      update: (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      delete: (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    }
    return icons[type as keyof typeof icons] || icons.update
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'processing':
        return (
          <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const getResourceDisplayName = (resourceType: string, resourceId: string) => {
    const typeNames = {
      task: 'Task',
      document: 'Document',
      email: 'Email',
      chat_message: 'Message',
      tag: 'Tag'
    }
    
    const typeName = typeNames[resourceType as keyof typeof typeNames] || resourceType
    const shortId = resourceId.slice(-8)
    
    return `${typeName} #${shortId}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Sync Queue ({pendingOperations})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isOnline ? 'Operations waiting to sync' : 'Operations will sync when online'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Syncing...</span>
              <span className="text-sm text-blue-700">{syncProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Operations List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>All changes are synced</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {operations.map((operation) => (
                <div key={operation.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getOperationIcon(operation.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {operation.type}
                        </span>
                        <span className="text-sm text-gray-600">
                          {getResourceDisplayName(operation.resourceType, operation.resourceId)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(operation.createdAt)}
                        </span>
                        
                        {operation.error && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {operation.error}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {getStatusIcon(operation.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isOnline ? (
                `${pendingOperations} operations ready to sync`
              ) : (
                'Will sync automatically when connection is restored'
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              
              {isOnline && pendingOperations > 0 && (
                <button
                  onClick={() => {
                    startSync()
                    onClose()
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}