// Enhanced Sync Conflict Resolution Component
'use client'

import React, { useState, useEffect } from 'react'
import { useSync } from '@/hooks/useSync'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/atoms/Modal'
import { cn } from '@/lib/utils'

interface ConflictData {
  id: string
  operationId: string
  resourceType: string
  resourceId: string
  localData: any
  remoteData: any
  baseData?: any // For three-way merge
  resolution: any
  status: 'pending' | 'resolved' | 'ignored'
  severity: 'low' | 'medium' | 'high' | 'critical'
  conflictType: 'data' | 'structure' | 'permission' | 'version'
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  autoResolvable: boolean
  suggestions: ConflictSuggestion[]
}

interface ConflictSuggestion {
  type: 'merge' | 'local' | 'remote' | 'custom'
  confidence: number
  description: string
  preview: any
}

interface ConflictTemplate {
  id: string
  name: string
  description: string
  resourceType: string
  conflictType: string
  resolution: 'local' | 'remote' | 'merge' | 'custom'
  conditions: any[]
  customLogic?: string
}

interface ConflictHistoryEntry {
  id: string
  conflictId: string
  action: 'resolved' | 'ignored' | 'escalated'
  resolution: string
  timestamp: Date
  user: string
  notes?: string
}

interface SyncConflictResolverProps {
  isOpen: boolean
  onClose: () => void
  enableBatchResolution?: boolean
  showTemplates?: boolean
  showHistory?: boolean
}

export function SyncConflictResolver({ 
  isOpen, 
  onClose, 
  enableBatchResolution = true,
  showTemplates = true,
  showHistory = true
}: SyncConflictResolverProps) {
  const { getConflicts, resolveConflict } = useSync()
  const [conflicts, setConflicts] = useState<ConflictData[]>([])
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null)
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([])
  const [templates, setTemplates] = useState<ConflictTemplate[]>([])
  const [conflictHistory, setConflictHistory] = useState<ConflictHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'conflicts' | 'templates' | 'history'>('conflicts')
  const [showThreeWayMerge, setShowThreeWayMerge] = useState(false)
  const [customResolution, setCustomResolution] = useState<any>(null)

  useEffect(() => {
    if (isOpen) {
      loadConflicts()
    }
  }, [isOpen])

  const loadConflicts = async () => {
    setLoading(true)
    try {
      const conflictData = await getConflicts()
      setConflicts(conflictData)
      if (conflictData.length > 0 && !selectedConflict) {
        setSelectedConflict(conflictData[0])
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveConflict = async (resolution: 'local' | 'remote' | 'merge') => {
    if (!selectedConflict) return

    setLoading(true)
    try {
      await resolveConflict(selectedConflict.id, resolution)
      
      // Remove resolved conflict from list
      const updatedConflicts = conflicts.filter(c => c.id !== selectedConflict.id)
      setConflicts(updatedConflicts)
      
      // Select next conflict or close if none left
      if (updatedConflicts.length > 0) {
        setSelectedConflict(updatedConflicts[0])
      } else {
        setSelectedConflict(null)
        onClose()
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderFieldComparison = (field: string, localValue: any, remoteValue: any) => {
    const isConflicted = JSON.stringify(localValue) !== JSON.stringify(remoteValue)
    
    return (
      <div key={field} className={`mb-4 p-3 rounded-lg border ${
        isConflicted ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="font-medium text-sm text-gray-700 mb-2">{field}</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-blue-600 mb-1">Local Version</div>
            <div className="text-sm bg-white p-2 rounded border">
              {typeof localValue === 'object' ? 
                JSON.stringify(localValue, null, 2) : 
                String(localValue)
              }
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-green-600 mb-1">Remote Version</div>
            <div className="text-sm bg-white p-2 rounded border">
              {typeof remoteValue === 'object' ? 
                JSON.stringify(remoteValue, null, 2) : 
                String(remoteValue)
              }
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Resolve Sync Conflicts ({conflicts.length})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Conflict List */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-3">Conflicts</h3>
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : conflicts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No conflicts to resolve
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      onClick={() => setSelectedConflict(conflict)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConflict?.id === conflict.id
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      } border`}
                    >
                      <div className="font-medium text-sm text-gray-900">
                        {conflict.resourceType} #{conflict.resourceId.slice(0, 8)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(conflict.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conflict Details */}
          <div className="flex-1 overflow-y-auto">
            {selectedConflict ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectedConflict.resourceType} Conflict
                  </h3>
                  <div className="text-sm text-gray-600">
                    Resource ID: {selectedConflict.resourceId}
                  </div>
                  <div className="text-sm text-gray-600">
                    Created: {new Date(selectedConflict.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">Field Comparison</h4>
                  <div className="space-y-4">
                    {Object.keys(selectedConflict.localData).map(field => 
                      renderFieldComparison(
                        field,
                        selectedConflict.localData[field],
                        selectedConflict.remoteData[field]
                      )
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleResolveConflict('local')}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    Use Local Version
                  </Button>
                  
                  <Button
                    onClick={() => handleResolveConflict('remote')}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    Use Remote Version
                  </Button>
                  
                  <Button
                    onClick={() => handleResolveConflict('merge')}
                    disabled={loading}
                    className="flex-1"
                  >
                    Auto Merge
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a conflict to resolve
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}