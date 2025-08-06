'use client'

import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  X, 
  RefreshCw,
  Eye,
  GitMerge,
  Clock,
  User,
  Mail
} from 'lucide-react'

interface SyncConflict {
  id: string
  type: 'update' | 'delete' | 'move'
  emailId: string
  accountId: string
  localEmail: {
    id: string
    subject: string
    isRead: boolean
    isStarred: boolean
    labels: string[]
    lastModified: Date
  }
  remoteEmail: {
    id: string
    subject: string
    isRead: boolean
    isStarred: boolean
    labels: string[]
    lastModified: Date
  }
  conflictFields: string[]
  detectedAt: Date
  resolution?: 'local' | 'remote' | 'merge'
}

interface EmailSyncConflictsProps {
  conflicts: SyncConflict[]
  onResolveConflict: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => Promise<void>
  onResolveAll: (resolution: 'local' | 'remote' | 'merge') => Promise<void>
  onDismiss: (conflictId: string) => Promise<void>
  className?: string
}

interface ConflictItemProps {
  conflict: SyncConflict
  onResolve: (resolution: 'local' | 'remote' | 'merge') => Promise<void>
  onDismiss: () => Promise<void>
}

const ConflictItem: React.FC<ConflictItemProps> = ({
  conflict,
  onResolve,
  onDismiss
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [resolving, setResolving] = useState(false)

  const handleResolve = async (resolution: 'local' | 'remote' | 'merge') => {
    try {
      setResolving(true)
      await onResolve(resolution)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setResolving(false)
    }
  }

  const getConflictTypeIcon = () => {
    switch (conflict.type) {
      case 'update':
        return <RefreshCw size={16} className="text-blue-600" />
      case 'delete':
        return <X size={16} className="text-red-600" />
      case 'move':
        return <ArrowRight size={16} className="text-yellow-600" />
      default:
        return <AlertTriangle size={16} className="text-orange-600" />
    }
  }

  const getConflictDescription = () => {
    switch (conflict.type) {
      case 'update':
        return `Email "${conflict.localEmail.subject}" was modified both locally and remotely`
      case 'delete':
        return `Email "${conflict.localEmail.subject}" was deleted remotely but modified locally`
      case 'move':
        return `Email "${conflict.localEmail.subject}" was moved to different folders`
      default:
        return 'Unknown conflict type'
    }
  }

  const renderFieldComparison = (field: string) => {
    const localValue = conflict.localEmail[field as keyof typeof conflict.localEmail]
    const remoteValue = conflict.remoteEmail[field as keyof typeof conflict.remoteEmail]

    const formatValue = (value: any) => {
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      if (Array.isArray(value)) {
        return value.join(', ') || 'None'
      }
      if (value instanceof Date) {
        return value.toLocaleString()
      }
      return String(value)
    }

    return (
      <div key={field} className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 last:border-b-0">
        <div className="font-medium text-gray-700 capitalize">
          {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
        </div>
        <div className="text-sm">
          <div className="text-gray-600 mb-1">Local</div>
          <div className="font-mono text-xs bg-blue-50 p-2 rounded">
            {formatValue(localValue)}
          </div>
        </div>
        <div className="text-sm">
          <div className="text-gray-600 mb-1">Remote</div>
          <div className="font-mono text-xs bg-green-50 p-2 rounded">
            {formatValue(remoteValue)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          {getConflictTypeIcon()}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">
              {getConflictDescription()}
            </h4>
            <div className="text-sm text-gray-600 mt-1">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <Clock size={14} className="mr-1" />
                  {new Date(conflict.detectedAt).toLocaleString()}
                </span>
                <span className="flex items-center">
                  <Mail size={14} className="mr-1" />
                  {conflict.conflictFields.length} field{conflict.conflictFields.length !== 1 ? 's' : ''} affected
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <Eye size={16} />
        </button>
      </div>

      {/* Conflict fields summary */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">Conflicting fields:</div>
        <div className="flex flex-wrap gap-2">
          {conflict.conflictFields.map(field => (
            <span
              key={field}
              className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
            >
              {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Detailed comparison */}
      {showDetails && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <h5 className="font-medium text-gray-900 mb-3">Field Comparison</h5>
          <div className="space-y-2">
            {conflict.conflictFields.map(field => renderFieldComparison(field))}
          </div>
        </div>
      )}

      {/* Resolution actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleResolve('local')}
            disabled={resolving}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <User size={14} />
            <span>Keep Local</span>
          </button>

          <button
            onClick={() => handleResolve('remote')}
            disabled={resolving}
            className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <RefreshCw size={14} />
            <span>Use Remote</span>
          </button>

          <button
            onClick={() => handleResolve('merge')}
            disabled={resolving}
            className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <GitMerge size={14} />
            <span>Merge</span>
          </button>
        </div>

        <button
          onClick={onDismiss}
          disabled={resolving}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>

      {resolving && (
        <div className="mt-3 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Resolving conflict...</span>
        </div>
      )}
    </div>
  )
}

export const EmailSyncConflicts: React.FC<EmailSyncConflictsProps> = ({
  conflicts,
  onResolveConflict,
  onResolveAll,
  onDismiss,
  className = ''
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge'>('merge')
  const [resolvingAll, setResolvingAll] = useState(false)

  const handleResolveAll = async () => {
    try {
      setResolvingAll(true)
      await onResolveAll(selectedResolution)
    } catch (error) {
      console.error('Failed to resolve all conflicts:', error)
    } finally {
      setResolvingAll(false)
    }
  }

  const conflictStats = {
    total: conflicts.length,
    updates: conflicts.filter(c => c.type === 'update').length,
    deletes: conflicts.filter(c => c.type === 'delete').length,
    moves: conflicts.filter(c => c.type === 'move').length
  }

  if (conflicts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow border border-gray-200 p-8 text-center ${className}`}>
        <Check size={48} className="mx-auto mb-4 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sync Conflicts</h3>
        <p className="text-gray-600">All email accounts are synchronized without conflicts.</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="text-orange-600" size={20} />
          <div>
            <h3 className="text-lg font-semibold">Email Sync Conflicts</h3>
            <p className="text-sm text-gray-600">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} require{conflicts.length === 1 ? 's' : ''} resolution
            </p>
          </div>
        </div>

        {/* Bulk resolution */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedResolution}
            onChange={(e) => setSelectedResolution(e.target.value as 'local' | 'remote' | 'merge')}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="local">Keep Local Changes</option>
            <option value="remote">Use Remote Changes</option>
            <option value="merge">Merge Changes</option>
          </select>

          <button
            onClick={handleResolveAll}
            disabled={resolvingAll}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {resolvingAll && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <span>{resolvingAll ? 'Resolving...' : 'Resolve All'}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{conflictStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{conflictStats.updates}</div>
            <div className="text-sm text-gray-600">Updates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{conflictStats.deletes}</div>
            <div className="text-sm text-gray-600">Deletes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{conflictStats.moves}</div>
            <div className="text-sm text-gray-600">Moves</div>
          </div>
        </div>
      </div>

      {/* Conflicts list */}
      <div className="p-4">
        <div className="space-y-4">
          {conflicts.map(conflict => (
            <ConflictItem
              key={conflict.id}
              conflict={conflict}
              onResolve={(resolution) => onResolveConflict(conflict.id, resolution)}
              onDismiss={() => onDismiss(conflict.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}