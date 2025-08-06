'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  ClockIcon, 
  UserIcon, 
  DocumentIcon,
  ArrowPathIcon,
  EyeIcon,
  ScaleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

interface DocumentVersion {
  id: string
  version: number
  name: string
  originalName?: string
  fileSize: number
  mimeType: string
  checksum: string
  uploadedAt: string
  metadata?: {
    changeDescription?: string
    rollbackReason?: string
    rolledBackFrom?: number
    rolledBackTo?: number
    originalVersionId?: string
  }
  uploader: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  parentDocument?: {
    id: string
    name: string
    version: number
  }
  _count: {
    annotations: number
    comments: number
    shares: number
  }
}

interface VersionStats {
  totalVersions: number
  currentVersion: number
  totalSize: number
  contributors: number
}

interface VersionComparison {
  version1: {
    id: string
    version: number
    name: string
    fileSize: number
    checksum: string
    uploadedAt: string
    uploader: {
      id: string
      firstName: string
      lastName: string
    }
  }
  version2: {
    id: string
    version: number
    name: string
    fileSize: number
    checksum: string
    uploadedAt: string
    uploader: {
      id: string
      firstName: string
      lastName: string
    }
  }
  differences: {
    sizeChange: number
    sizeChangePercent: number
    checksumMatch: boolean
    timeDifference: number
    uploaderChanged: boolean
  }
  textComparison?: {
    addedLines: number
    removedLines: number
    modifiedLines: number
    similarity: number
  }
}

interface VersionHistoryProps {
  documentId: string
  onVersionSelect?: (version: DocumentVersion) => void
  onVersionRollback?: (versionId: string, reason?: string) => Promise<void>
  onVersionCompare?: (version1Id: string, version2Id: string) => void
  enableRollback?: boolean
  enableComparison?: boolean
  className?: string
}

interface HistoryState {
  versions: DocumentVersion[]
  stats: VersionStats | null
  loading: boolean
  error: string | null
  selectedVersions: Set<string>
  expandedVersions: Set<string>
  comparison: VersionComparison | null
  showComparison: boolean
}

export function VersionHistory({
  documentId,
  onVersionSelect,
  onVersionRollback,
  onVersionCompare,
  enableRollback = true,
  enableComparison = true,
  className = ''
}: VersionHistoryProps) {
  const [state, setState] = useState<HistoryState>({
    versions: [],
    stats: null,
    loading: true,
    error: null,
    selectedVersions: new Set(),
    expandedVersions: new Set(),
    comparison: null,
    showComparison: false
  })

  const [rollbackState, setRollbackState] = useState<{
    versionId: string | null
    reason: string
    confirming: boolean
  }>({
    versionId: null,
    reason: '',
    confirming: false
  })

  // Load version history
  const loadVersions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`/api/documents/${documentId}/versions`)
      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          versions: data.data.versions,
          stats: data.data.stats,
          loading: false
        }))
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error?.message || 'Failed to load version history'
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load version history'
      }))
    }
  }, [documentId])

  // Handle version selection
  const handleVersionSelect = useCallback((version: DocumentVersion, event: React.MouseEvent) => {
    if (enableComparison && (event.ctrlKey || event.metaKey)) {
      setState(prev => {
        const newSelected = new Set(prev.selectedVersions)
        if (newSelected.has(version.id)) {
          newSelected.delete(version.id)
        } else if (newSelected.size < 2) {
          newSelected.add(version.id)
        }
        return { ...prev, selectedVersions: newSelected }
      })
    } else {
      if (onVersionSelect) {
        onVersionSelect(version)
      }
    }
  }, [enableComparison, onVersionSelect])

  // Toggle version details
  const toggleVersionDetails = useCallback((versionId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedVersions)
      if (newExpanded.has(versionId)) {
        newExpanded.delete(versionId)
      } else {
        newExpanded.add(versionId)
      }
      return { ...prev, expandedVersions: newExpanded }
    })
  }, [])

  // Start rollback process
  const startRollback = useCallback((versionId: string) => {
    setRollbackState({
      versionId,
      reason: '',
      confirming: true
    })
  }, [])

  // Confirm rollback
  const confirmRollback = useCallback(async () => {
    if (!rollbackState.versionId || !onVersionRollback) return

    try {
      await onVersionRollback(rollbackState.versionId, rollbackState.reason)
      setRollbackState({ versionId: null, reason: '', confirming: false })
      loadVersions() // Reload to show new version
    } catch (error) {
      console.error('Rollback failed:', error)
    }
  }, [rollbackState, onVersionRollback, loadVersions])

  // Cancel rollback
  const cancelRollback = useCallback(() => {
    setRollbackState({ versionId: null, reason: '', confirming: false })
  }, [])

  // Compare selected versions
  const compareVersions = useCallback(async () => {
    if (state.selectedVersions.size !== 2) return

    const versionIds = Array.from(state.selectedVersions)
    
    try {
      const response = await fetch(`/api/documents/${documentId}/versions/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version1Id: versionIds[0],
          version2Id: versionIds[1],
          includeTextComparison: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setState(prev => ({
          ...prev,
          comparison: data.data.comparison,
          showComparison: true
        }))
        
        if (onVersionCompare) {
          onVersionCompare(versionIds[0], versionIds[1])
        }
      } else {
        console.error('Comparison failed:', data.error?.message)
      }
    } catch (error) {
      console.error('Comparison failed:', error)
    }
  }, [state.selectedVersions, documentId, onVersionCompare])

  // Clear selection
  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedVersions: new Set() }))
  }, [])

  // Close comparison
  const closeComparison = useCallback(() => {
    setState(prev => ({ ...prev, showComparison: false, comparison: null }))
  }, [])

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  // Format date
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }, [])

  // Format time difference
  const formatTimeDifference = useCallback((milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`
    return `${seconds} second${seconds > 1 ? 's' : ''}`
  }, [])

  // Load versions on mount
  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  return (
    <div className={`version-history ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Version History</h3>
          {state.stats && (
            <p className="text-sm text-gray-500">
              {state.stats.totalVersions} versions • {formatFileSize(state.stats.totalSize)} total • {state.stats.contributors} contributors
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {enableComparison && state.selectedVersions.size === 2 && (
            <>
              <Button size="sm" onClick={compareVersions}>
                <ScaleIcon className="w-4 h-4 mr-1" />
                Compare
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
          
          <Button size="sm" variant="outline" onClick={loadVersions}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {state.loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading version history...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-600">{state.error}</p>
        </div>
      )}

      {/* Version List */}
      {!state.loading && !state.error && state.versions.length > 0 && (
        <div className="space-y-3">
          {state.versions.map((version, index) => {
            const isSelected = state.selectedVersions.has(version.id)
            const isExpanded = state.expandedVersions.has(version.id)
            const isCurrent = index === 0
            const isRollback = version.metadata?.rollbackReason

            return (
              <div
                key={version.id}
                className={`border rounded-lg transition-colors ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isCurrent ? 'ring-2 ring-green-200' : ''}`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={(e) => handleVersionSelect(version, e)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleVersionDetails(version.id)
                        }}
                        className="mt-1 p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <DocumentIcon className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            Version {version.version}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Current
                            </span>
                          )}
                          {isRollback && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Rollback
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <UserIcon className="w-4 h-4" />
                            <span>{version.uploader.firstName} {version.uploader.lastName}</span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{formatDate(version.uploadedAt)}</span>
                          </div>

                          <span>{formatFileSize(version.fileSize)}</span>
                        </div>

                        {(version.metadata?.changeDescription || version.metadata?.rollbackReason) && (
                          <p className="text-sm text-gray-600 mt-2">
                            {version.metadata.rollbackReason || version.metadata.changeDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onVersionSelect) {
                            onVersionSelect(version)
                          }
                        }}
                      >
                        <EyeIcon className="w-4 h-4 mr-1" />
                        View
                      </Button>

                      {enableRollback && !isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            startRollback(version.id)
                          }}
                        >
                          <ArrowPathIcon className="w-4 h-4 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">File Name:</span>
                        <p className="text-gray-600">{version.originalName || version.name}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">MIME Type:</span>
                        <p className="text-gray-600">{version.mimeType}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Checksum:</span>
                        <p className="text-gray-600 font-mono text-xs">{version.checksum}</p>
                      </div>
                      
                      <div>
                        <span className="font-medium text-gray-700">Activity:</span>
                        <p className="text-gray-600">
                          {version._count.annotations} annotations, {version._count.comments} comments, {version._count.shares} shares
                        </p>
                      </div>
                    </div>

                    {version.metadata?.rolledBackFrom && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">
                            Rolled back from version {version.metadata.rolledBackFrom} to version {version.metadata.rolledBackTo}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!state.loading && !state.error && state.versions.length === 0 && (
        <div className="text-center py-12">
          <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No version history</h3>
          <p className="text-gray-500">This document doesn't have any version history yet.</p>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackState.confirming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Confirm Rollback</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to rollback to this version? This will create a new version based on the selected version.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rollback Reason (Optional)
              </label>
              <Input
                value={rollbackState.reason}
                onChange={(e) => setRollbackState(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Describe why you're rolling back..."
                className="w-full"
              />
            </div>

            <div className="flex space-x-3">
              <Button onClick={confirmRollback} className="flex-1">
                Confirm Rollback
              </Button>
              <Button variant="outline" onClick={cancelRollback} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Version Comparison Modal */}
      {state.showComparison && state.comparison && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Version Comparison</h3>
              <Button variant="outline" onClick={closeComparison}>
                Close
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Version 1 */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Version {state.comparison.version1.version}</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Size:</span> {formatFileSize(state.comparison.version1.fileSize)}</p>
                  <p><span className="font-medium">Uploaded:</span> {formatDate(state.comparison.version1.uploadedAt)}</p>
                  <p><span className="font-medium">By:</span> {state.comparison.version1.uploader.firstName} {state.comparison.version1.uploader.lastName}</p>
                </div>
              </div>

              {/* Version 2 */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Version {state.comparison.version2.version}</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Size:</span> {formatFileSize(state.comparison.version2.fileSize)}</p>
                  <p><span className="font-medium">Uploaded:</span> {formatDate(state.comparison.version2.uploadedAt)}</p>
                  <p><span className="font-medium">By:</span> {state.comparison.version2.uploader.firstName} {state.comparison.version2.uploader.lastName}</p>
                </div>
              </div>
            </div>

            {/* Differences */}
            <div className="border rounded-lg p-4 mb-6">
              <h4 className="font-medium mb-3">Differences</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Size Change:</span>
                  <p className={`${state.comparison.differences.sizeChange > 0 ? 'text-green-600' : state.comparison.differences.sizeChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {state.comparison.differences.sizeChange > 0 ? '+' : ''}{formatFileSize(Math.abs(state.comparison.differences.sizeChange))} 
                    ({state.comparison.differences.sizeChangePercent.toFixed(1)}%)
                  </p>
                </div>
                
                <div>
                  <span className="font-medium">Time Difference:</span>
                  <p className="text-gray-600">
                    {formatTimeDifference(state.comparison.differences.timeDifference)}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium">Content Match:</span>
                  <p className={state.comparison.differences.checksumMatch ? 'text-green-600' : 'text-red-600'}>
                    {state.comparison.differences.checksumMatch ? 'Identical' : 'Different'}
                  </p>
                </div>
                
                <div>
                  <span className="font-medium">Uploader:</span>
                  <p className={state.comparison.differences.uploaderChanged ? 'text-yellow-600' : 'text-gray-600'}>
                    {state.comparison.differences.uploaderChanged ? 'Changed' : 'Same'}
                  </p>
                </div>
              </div>
            </div>

            {/* Text Comparison */}
            {state.comparison.textComparison && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Text Changes</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-green-600">Added Lines:</span>
                    <p className="text-green-600">{state.comparison.textComparison.addedLines}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-red-600">Removed Lines:</span>
                    <p className="text-red-600">{state.comparison.textComparison.removedLines}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-yellow-600">Modified Lines:</span>
                    <p className="text-yellow-600">{state.comparison.textComparison.modifiedLines}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-blue-600">Similarity:</span>
                    <p className="text-blue-600">{state.comparison.textComparison.similarity.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}