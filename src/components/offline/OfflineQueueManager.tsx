'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/atoms/Modal'
import { useSync } from '@/hooks/useSync'
import { cn } from '@/lib/utils'

interface QueueOperation {
  id: string
  type: 'create' | 'update' | 'delete' | 'sync'
  resourceType: string
  resourceId: string
  data: any
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'critical'
  attempts: number
  maxAttempts: number
  createdAt: Date
  updatedAt: Date
  scheduledAt?: Date
  completedAt?: Date
  error?: string
  estimatedSize: number
  dependencies: string[]
}

interface QueueMetrics {
  totalOperations: number
  pendingOperations: number
  processingOperations: number
  completedOperations: number
  failedOperations: number
  averageProcessingTime: number
  successRate: number
  queueSize: number
  estimatedSyncTime: number
}

interface OfflineQueueManagerProps {
  className?: string
}

export const OfflineQueueManager: React.FC<OfflineQueueManagerProps> = ({
  className = ''
}) => {
  const { 
    pendingOperations, 
    isOnline, 
    isSyncing,
    startSync,
    cancelOperation,
    retryOperation,
    clearCompletedOperations
  } = useSync()

  const [operations, setOperations] = useState<QueueOperation[]>([])
  const [metrics, setMetrics] = useState<QueueMetrics>({
    totalOperations: 0,
    pendingOperations: 0,
    processingOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    averageProcessingTime: 0,
    successRate: 0,
    queueSize: 0,
    estimatedSyncTime: 0
  })
  const [selectedOperation, setSelectedOperation] = useState<QueueOperation | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status'>('createdAt')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchQueueOperations()
    const interval = setInterval(fetchQueueOperations, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchQueueOperations = async () => {
    try {
      // In a real implementation, this would fetch from the sync engine
      // For now, we'll simulate queue operations
      const mockOperations: QueueOperation[] = Array.from({ length: 15 }, (_, i) => {
        const statuses: QueueOperation['status'][] = ['pending', 'processing', 'completed', 'failed']
        const priorities: QueueOperation['priority'][] = ['low', 'medium', 'high', 'critical']
        const types: QueueOperation['type'][] = ['create', 'update', 'delete', 'sync']
        const resourceTypes = ['task', 'document', 'user', 'project', 'comment']
        
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const createdAt = new Date(Date.now() - Math.random() * 86400000) // Last 24 hours
        
        return {
          id: `op-${i + 1}`,
          type: types[Math.floor(Math.random() * types.length)],
          resourceType: resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
          resourceId: `res-${Math.random().toString(36).substr(2, 9)}`,
          data: { title: `Sample ${resourceTypes[Math.floor(Math.random() * resourceTypes.length)]} ${i + 1}` },
          status,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          attempts: status === 'failed' ? Math.floor(Math.random() * 3) + 1 : 0,
          maxAttempts: 3,
          createdAt,
          updatedAt: new Date(),
          scheduledAt: status === 'pending' ? new Date(Date.now() + Math.random() * 3600000) : undefined,
          completedAt: status === 'completed' ? new Date() : undefined,
          error: status === 'failed' ? 'Network timeout' : undefined,
          estimatedSize: Math.floor(Math.random() * 1024) + 100, // 100-1124 bytes
          dependencies: Math.random() > 0.7 ? [`op-${Math.floor(Math.random() * i) + 1}`] : []
        }
      })

      setOperations(mockOperations)

      // Calculate metrics
      const totalOps = mockOperations.length
      const pendingOps = mockOperations.filter(op => op.status === 'pending').length
      const processingOps = mockOperations.filter(op => op.status === 'processing').length
      const completedOps = mockOperations.filter(op => op.status === 'completed').length
      const failedOps = mockOperations.filter(op => op.status === 'failed').length
      const successRate = totalOps > 0 ? (completedOps / (completedOps + failedOps)) * 100 : 0
      const queueSize = mockOperations.reduce((acc, op) => acc + op.estimatedSize, 0)

      setMetrics({
        totalOperations: totalOps,
        pendingOperations: pendingOps,
        processingOperations: processingOps,
        completedOperations: completedOps,
        failedOperations: failedOps,
        averageProcessingTime: 2500, // 2.5 seconds average
        successRate,
        queueSize,
        estimatedSyncTime: pendingOps * 2.5 // Estimated time in seconds
      })
    } catch (error) {
      console.error('Failed to fetch queue operations:', error)
    }
  }

  const getFilteredOperations = () => {
    let filtered = operations
    
    if (filter !== 'all') {
      filtered = filtered.filter(op => op.status === filter)
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'status':
          return a.status.localeCompare(b.status)
        case 'createdAt':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime()
      }
    })
  }

  const getStatusColor = (status: QueueOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    }
  }

  const getPriorityColor = (priority: QueueOperation['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-700 bg-red-100'
      case 'high':
        return 'text-orange-700 bg-orange-100'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const getOperationIcon = (type: QueueOperation['type']) => {
    switch (type) {
      case 'create':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'update':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'delete':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${Math.round(remainingSeconds)}s`
  }

  const handleOperationAction = async (operation: QueueOperation, action: 'retry' | 'cancel' | 'prioritize') => {
    setLoading(true)
    try {
      switch (action) {
        case 'retry':
          await retryOperation(operation.id)
          break
        case 'cancel':
          await cancelOperation(operation.id)
          break
        case 'prioritize':
          // In a real implementation, this would update the operation priority
          console.log('Prioritizing operation:', operation.id)
          break
      }
      await fetchQueueOperations()
    } catch (error) {
      console.error(`Failed to ${action} operation:`, error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOperations = getFilteredOperations()

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Offline Queue Manager</h3>
          <p className="text-sm text-gray-600">
            {metrics.pendingOperations} pending operations • {formatBytes(metrics.queueSize)} total size
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompletedOperations}
            disabled={metrics.completedOperations === 0}
          >
            Clear Completed
          </Button>
          <Button
            onClick={startSync}
            disabled={!isOnline || isSyncing || metrics.pendingOperations === 0}
          >
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.pendingOperations}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.completedOperations}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{metrics.failedOperations}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(metrics.successRate)}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All ({operations.length})</option>
              <option value="pending">Pending ({metrics.pendingOperations})</option>
              <option value="processing">Processing ({metrics.processingOperations})</option>
              <option value="completed">Completed ({metrics.completedOperations})</option>
              <option value="failed">Failed ({metrics.failedOperations})</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt">Created Date</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {metrics.estimatedSyncTime > 0 && (
          <div className="text-sm text-gray-600">
            Estimated sync time: {formatDuration(metrics.estimatedSyncTime)}
          </div>
        )}
      </div>

      {/* Operations List */}
      {filteredOperations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600">No operations in queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredOperations.map((operation) => (
            <Card
              key={operation.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                operation.priority === 'critical' && 'border-red-200',
                operation.priority === 'high' && 'border-orange-200'
              )}
              onClick={() => {
                setSelectedOperation(operation)
                setShowDetails(true)
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {getOperationIcon(operation.type)}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {operation.type}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" size="sm">
                        {operation.resourceType}
                      </Badge>
                      <Badge 
                        variant={
                          operation.priority === 'critical' ? 'destructive' :
                          operation.priority === 'high' ? 'warning' : 'secondary'
                        }
                        size="sm"
                      >
                        {operation.priority}
                      </Badge>
                      <Badge 
                        variant={
                          operation.status === 'completed' ? 'success' :
                          operation.status === 'failed' ? 'destructive' : 'default'
                        }
                        size="sm"
                      >
                        {operation.status}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">
                        {operation.data?.title || `${operation.resourceType} ${operation.resourceId.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {operation.createdAt.toLocaleString()} • {formatBytes(operation.estimatedSize)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {operation.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOperationAction(operation, 'retry')
                        }}
                        disabled={loading}
                      >
                        Retry
                      </Button>
                    )}
                    
                    {(operation.status === 'pending' || operation.status === 'processing') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOperationAction(operation, 'cancel')
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      {operation.attempts > 0 && `${operation.attempts}/${operation.maxAttempts} attempts`}
                    </div>
                  </div>
                </div>
                
                {operation.dependencies.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      Dependencies: {operation.dependencies.join(', ')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Operation Details Modal */}
      {selectedOperation && (
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          size="lg"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Operation Details
                </h3>
                <div className="flex items-center gap-2">
                  {getOperationIcon(selectedOperation.type)}
                  <span className="text-sm font-medium capitalize">{selectedOperation.type}</span>
                  <Badge variant="outline" size="sm">
                    {selectedOperation.resourceType}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant={
                    selectedOperation.priority === 'critical' ? 'destructive' :
                    selectedOperation.priority === 'high' ? 'warning' : 'secondary'
                  }
                >
                  {selectedOperation.priority} priority
                </Badge>
                <Badge 
                  variant={
                    selectedOperation.status === 'completed' ? 'success' :
                    selectedOperation.status === 'failed' ? 'destructive' : 'default'
                  }
                >
                  {selectedOperation.status}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Operation Info</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">ID:</span>
                    <span className="ml-2 text-gray-600 font-mono">{selectedOperation.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Resource ID:</span>
                    <span className="ml-2 text-gray-600 font-mono">{selectedOperation.resourceId}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Size:</span>
                    <span className="ml-2 text-gray-600">{formatBytes(selectedOperation.estimatedSize)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Attempts:</span>
                    <span className="ml-2 text-gray-600">{selectedOperation.attempts}/{selectedOperation.maxAttempts}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Timestamps</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">{selectedOperation.createdAt.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Updated:</span>
                    <span className="ml-2 text-gray-600">{selectedOperation.updatedAt.toLocaleString()}</span>
                  </div>
                  {selectedOperation.scheduledAt && (
                    <div>
                      <span className="font-medium text-gray-700">Scheduled:</span>
                      <span className="ml-2 text-gray-600">{selectedOperation.scheduledAt.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOperation.completedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Completed:</span>
                      <span className="ml-2 text-gray-600">{selectedOperation.completedAt.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedOperation.error && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Error Details</h4>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-700">{selectedOperation.error}</div>
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Operation Data</h4>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(selectedOperation.data, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowDetails(false)}>
                Close
              </Button>
              
              {selectedOperation.status === 'failed' && (
                <Button
                  onClick={() => {
                    handleOperationAction(selectedOperation, 'retry')
                    setShowDetails(false)
                  }}
                  disabled={loading}
                >
                  Retry Operation
                </Button>
              )}
              
              {(selectedOperation.status === 'pending' || selectedOperation.status === 'processing') && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleOperationAction(selectedOperation, 'cancel')
                    setShowDetails(false)
                  }}
                  disabled={loading}
                >
                  Cancel Operation
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default OfflineQueueManager