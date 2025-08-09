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
  usageCount: number
  successRate: number
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

interface EnhancedSyncConflictResolverProps {
  isOpen: boolean
  onClose: () => void
  enableBatchResolution?: boolean
  showTemplates?: boolean
  showHistory?: boolean
}

export function EnhancedSyncConflictResolver({ 
  isOpen, 
  onClose, 
  enableBatchResolution = true,
  showTemplates = true,
  showHistory = true
}: EnhancedSyncConflictResolverProps) {
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
  const [filter, setFilter] = useState<'all' | 'high' | 'critical' | 'auto-resolvable'>('all')

  useEffect(() => {
    if (isOpen) {
      loadConflicts()
      if (showTemplates) loadTemplates()
      if (showHistory) loadConflictHistory()
    }
  }, [isOpen, showTemplates, showHistory])

  const loadConflicts = async () => {
    setLoading(true)
    try {
      // Simulate enhanced conflict data
      const mockConflicts: ConflictData[] = Array.from({ length: 8 }, (_, i) => {
        const severities: ConflictData['severity'][] = ['low', 'medium', 'high', 'critical']
        const types: ConflictData['conflictType'][] = ['data', 'structure', 'permission', 'version']
        const resourceTypes = ['task', 'document', 'user', 'project']
        
        const severity = severities[Math.floor(Math.random() * severities.length)]
        const conflictType = types[Math.floor(Math.random() * types.length)]
        const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
        
        return {
          id: `conflict-${i + 1}`,
          operationId: `op-${i + 1}`,
          resourceType,
          resourceId: `res-${Math.random().toString(36).substr(2, 9)}`,
          localData: {
            title: `Local ${resourceType} ${i + 1}`,
            content: `Local content for ${resourceType}`,
            lastModified: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            version: i + 1
          },
          remoteData: {
            title: `Remote ${resourceType} ${i + 1}`,
            content: `Remote content for ${resourceType}`,
            lastModified: new Date(Date.now() - Math.random() * 43200000).toISOString(),
            version: i + 2
          },
          baseData: Math.random() > 0.5 ? {
            title: `Base ${resourceType} ${i + 1}`,
            content: `Base content for ${resourceType}`,
            lastModified: new Date(Date.now() - Math.random() * 172800000).toISOString(),
            version: i
          } : undefined,
          resolution: null,
          status: 'pending',
          severity,
          conflictType,
          createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
          autoResolvable: Math.random() > 0.6,
          suggestions: [
            {
              type: 'merge',
              confidence: Math.random() * 0.4 + 0.6, // 60-100%
              description: 'Automatically merge non-conflicting changes',
              preview: { merged: true }
            },
            {
              type: 'local',
              confidence: Math.random() * 0.3 + 0.4, // 40-70%
              description: 'Keep local version (more recent)',
              preview: { useLocal: true }
            },
            {
              type: 'remote',
              confidence: Math.random() * 0.3 + 0.4, // 40-70%
              description: 'Use remote version (from server)',
              preview: { useRemote: true }
            }
          ]
        }
      })
      
      setConflicts(mockConflicts)
      if (mockConflicts.length > 0 && !selectedConflict) {
        setSelectedConflict(mockConflicts[0])
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const mockTemplates: ConflictTemplate[] = [
        {
          id: 'template-1',
          name: 'Auto-merge Documents',
          description: 'Automatically merge document changes when no content conflicts exist',
          resourceType: 'document',
          conflictType: 'data',
          resolution: 'merge',
          conditions: [{ field: 'content', operator: 'no_overlap' }],
          usageCount: 45,
          successRate: 92
        },
        {
          id: 'template-2',
          name: 'Prefer Recent Tasks',
          description: 'Always use the most recently modified task version',
          resourceType: 'task',
          conflictType: 'data',
          resolution: 'custom',
          conditions: [{ field: 'lastModified', operator: 'newer' }],
          customLogic: 'return data.lastModified > other.lastModified ? data : other',
          usageCount: 23,
          successRate: 88
        },
        {
          id: 'template-3',
          name: 'Server Wins Structure',
          description: 'Use server version for structural changes',
          resourceType: 'all',
          conflictType: 'structure',
          resolution: 'remote',
          conditions: [{ field: 'type', operator: 'equals', value: 'structure' }],
          usageCount: 67,
          successRate: 95
        }
      ]
      
      setTemplates(mockTemplates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadConflictHistory = async () => {
    try {
      const mockHistory: ConflictHistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `history-${i + 1}`,
        conflictId: `conflict-${Math.floor(Math.random() * 10) + 1}`,
        action: ['resolved', 'ignored', 'escalated'][Math.floor(Math.random() * 3)] as any,
        resolution: ['local', 'remote', 'merge', 'custom'][Math.floor(Math.random() * 4)],
        timestamp: new Date(Date.now() - Math.random() * 604800000), // Last week
        user: ['admin@zetra.com', 'user@zetra.com', 'manager@zetra.com'][Math.floor(Math.random() * 3)],
        notes: Math.random() > 0.7 ? 'Manual resolution required due to complex changes' : undefined
      }))
      
      setConflictHistory(mockHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()))
    } catch (error) {
      console.error('Failed to load conflict history:', error)
    }
  }

  const getFilteredConflicts = () => {
    let filtered = conflicts
    
    switch (filter) {
      case 'high':
        filtered = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical')
        break
      case 'critical':
        filtered = conflicts.filter(c => c.severity === 'critical')
        break
      case 'auto-resolvable':
        filtered = conflicts.filter(c => c.autoResolvable)
        break
    }
    
    return filtered
  }

  const getSeverityColor = (severity: ConflictData['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getConflictTypeIcon = (type: ConflictData['conflictType']) => {
    switch (type) {
      case 'data':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'structure':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      case 'permission':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v2a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8H3a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
          </svg>
        )
    }
  }

  const handleResolveConflict = async (resolution: 'local' | 'remote' | 'merge' | 'custom', conflictId?: string) => {
    setLoading(true)
    try {
      const targetConflict = conflictId ? conflicts.find(c => c.id === conflictId) : selectedConflict
      if (!targetConflict) return

      await resolveConflict(targetConflict.id, resolution)
      
      // Update conflicts list
      const updatedConflicts = conflicts.filter(c => c.id !== targetConflict.id)
      setConflicts(updatedConflicts)
      
      // Add to history
      const historyEntry: ConflictHistoryEntry = {
        id: `history-${Date.now()}`,
        conflictId: targetConflict.id,
        action: 'resolved',
        resolution,
        timestamp: new Date(),
        user: 'current-user@zetra.com'
      }
      setConflictHistory(prev => [historyEntry, ...prev])
      
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

  const handleBatchResolve = async (resolution: 'local' | 'remote' | 'merge') => {
    if (selectedConflicts.length === 0) return

    setLoading(true)
    try {
      for (const conflictId of selectedConflicts) {
        await handleResolveConflict(resolution, conflictId)
      }
      setSelectedConflicts([])
    } catch (error) {
      console.error('Failed to batch resolve conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = async (template: ConflictTemplate, conflictIds: string[]) => {
    setLoading(true)
    try {
      for (const conflictId of conflictIds) {
        await handleResolveConflict(template.resolution as any, conflictId)
      }
      
      // Update template usage
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, usageCount: t.usageCount + conflictIds.length }
          : t
      ))
    } catch (error) {
      console.error('Failed to apply template:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderThreeWayMerge = (conflict: ConflictData) => {
    if (!conflict.baseData) return null

    return (
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Three-Way Merge View</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2">Base Version</div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(conflict.baseData, null, 2)}
              </pre>
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-blue-600 mb-2">Local Changes</div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <pre className="text-sm text-blue-700 whitespace-pre-wrap">
                {JSON.stringify(conflict.localData, null, 2)}
              </pre>
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-green-600 mb-2">Remote Changes</div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <pre className="text-sm text-green-700 whitespace-pre-wrap">
                {JSON.stringify(conflict.remoteData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderConflictSuggestions = (conflict: ConflictData) => {
    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">AI Suggestions</h4>
        {conflict.suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
            onClick={() => handleResolveConflict(suggestion.type as any)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {suggestion.type}
                </Badge>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(suggestion.confidence * 100)}% confidence
                </span>
              </div>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${suggestion.confidence * 100}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">{suggestion.description}</p>
          </div>
        ))}
      </div>
    )
  }

  const filteredConflicts = getFilteredConflicts()

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Enhanced Conflict Resolution ({filteredConflicts.length})
          </h2>
          
          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Conflicts</option>
              <option value="high">High Priority</option>
              <option value="critical">Critical Only</option>
              <option value="auto-resolvable">Auto-resolvable</option>
            </select>
            
            {enableBatchResolution && selectedConflicts.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedConflicts.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchResolve('merge')}
                  disabled={loading}
                >
                  Batch Merge
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('conflicts')}
              className={cn(
                'py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === 'conflicts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              Conflicts ({filteredConflicts.length})
            </button>
            
            {showTemplates && (
              <button
                onClick={() => setActiveTab('templates')}
                className={cn(
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                Templates ({templates.length})
              </button>
            )}
            
            {showHistory && (
              <button
                onClick={() => setActiveTab('history')}
                className={cn(
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                History ({conflictHistory.length})
              </button>
            )}
          </nav>
        </div>

        <div className="h-[600px] overflow-hidden">
          {activeTab === 'conflicts' && (
            <div className="flex h-full">
              {/* Conflict List */}
              <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
                <div className="p-4">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : filteredConflicts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No conflicts to resolve
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredConflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className={cn(
                            'p-3 rounded-lg cursor-pointer transition-colors border',
                            selectedConflict?.id === conflict.id
                              ? 'bg-blue-100 border-blue-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            {enableBatchResolution && (
                              <input
                                type="checkbox"
                                checked={selectedConflicts.includes(conflict.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedConflicts(prev => [...prev, conflict.id])
                                  } else {
                                    setSelectedConflicts(prev => prev.filter(id => id !== conflict.id))
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            
                            <div 
                              className="flex-1 ml-2"
                              onClick={() => setSelectedConflict(conflict)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {getConflictTypeIcon(conflict.conflictType)}
                                <Badge 
                                  variant={
                                    conflict.severity === 'critical' ? 'destructive' :
                                    conflict.severity === 'high' ? 'warning' : 'secondary'
                                  }
                                  size="sm"
                                >
                                  {conflict.severity}
                                </Badge>
                                {conflict.autoResolvable && (
                                  <Badge variant="success" size="sm">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="font-medium text-sm text-gray-900">
                                {conflict.resourceType} #{conflict.resourceId.slice(0, 8)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(conflict.createdAt).toLocaleString()}
                              </div>
                            </div>
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
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {selectedConflict.resourceType} Conflict
                        </h3>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              selectedConflict.severity === 'critical' ? 'destructive' :
                              selectedConflict.severity === 'high' ? 'warning' : 'secondary'
                            }
                          >
                            {selectedConflict.severity} severity
                          </Badge>
                          <Badge variant="outline">
                            {selectedConflict.conflictType}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Resource ID: {selectedConflict.resourceId}</div>
                        <div>Created: {new Date(selectedConflict.createdAt).toLocaleString()}</div>
                        {selectedConflict.autoResolvable && (
                          <div className="text-green-600">✓ Auto-resolvable conflict</div>
                        )}
                      </div>
                    </div>

                    {/* Three-way merge toggle */}
                    {selectedConflict.baseData && (
                      <div className="mb-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowThreeWayMerge(!showThreeWayMerge)}
                        >
                          {showThreeWayMerge ? 'Hide' : 'Show'} Three-Way Merge
                        </Button>
                      </div>
                    )}

                    {/* Conflict visualization */}
                    {showThreeWayMerge && selectedConflict.baseData ? 
                      renderThreeWayMerge(selectedConflict) : (
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-4">Field Comparison</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-medium text-blue-600 mb-2">Local Version</div>
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <pre className="text-sm text-blue-700 whitespace-pre-wrap">
                                  {JSON.stringify(selectedConflict.localData, null, 2)}
                                </pre>
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs font-medium text-green-600 mb-2">Remote Version</div>
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <pre className="text-sm text-green-700 whitespace-pre-wrap">
                                  {JSON.stringify(selectedConflict.remoteData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    {/* AI Suggestions */}
                    {selectedConflict.suggestions.length > 0 && (
                      <div className="mb-6">
                        {renderConflictSuggestions(selectedConflict)}
                      </div>
                    )}

                    {/* Resolution Actions */}
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
          )}

          {activeTab === 'templates' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Resolution Templates</h3>
                <Button variant="outline" size="sm">
                  Create Template
                </Button>
              </div>
              
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Used {template.usageCount} times</span>
                          <span>{template.successRate}% success rate</span>
                          <Badge variant="outline" size="sm">
                            {template.resourceType}
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {template.conflictType}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const applicableConflicts = filteredConflicts
                            .filter(c => 
                              (template.resourceType === 'all' || c.resourceType === template.resourceType) &&
                              c.conflictType === template.conflictType
                            )
                            .map(c => c.id)
                          
                          if (applicableConflicts.length > 0) {
                            applyTemplate(template, applicableConflicts)
                          }
                        }}
                        disabled={loading}
                      >
                        Apply to {filteredConflicts.filter(c => 
                          (template.resourceType === 'all' || c.resourceType === template.resourceType) &&
                          c.conflictType === template.conflictType
                        ).length} conflicts
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Resolution History</h3>
              
              {conflictHistory.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={
                            entry.action === 'resolved' ? 'success' :
                            entry.action === 'escalated' ? 'warning' : 'secondary'
                          }
                          size="sm"
                        >
                          {entry.action}
                        </Badge>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {entry.resolution} resolution
                          </div>
                          <div className="text-xs text-gray-500">
                            by {entry.user} • {entry.timestamp.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {entry.conflictId}
                      </div>
                    </div>
                    
                    {entry.notes && (
                      <div className="mt-2 text-sm text-gray-600 italic">
                        "{entry.notes}"
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}