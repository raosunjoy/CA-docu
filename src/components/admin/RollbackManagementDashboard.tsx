'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { useRollbackManager, RollbackHistoryEntry, AutoRollbackTrigger } from '@/hooks/useRollbackManager'
import { cn } from '@/lib/utils'

interface RollbackManagementDashboardProps {
  className?: string
}

export const RollbackManagementDashboard: React.FC<RollbackManagementDashboardProps> = ({
  className = ''
}) => {
  const {
    rollbackHistory,
    autoTriggers,
    loading,
    error,
    getRollbackHistory,
    getAutoRollbackTriggers,
    updateAutoRollbackTrigger
  } = useRollbackManager()

  const [activeTab, setActiveTab] = useState<'history' | 'triggers'>('history')

  useEffect(() => {
    getRollbackHistory()
    getAutoRollbackTriggers()
  }, [getRollbackHistory, getAutoRollbackTriggers])

  const getStatusColor = (status: RollbackHistoryEntry['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const handleTriggerToggle = async (triggerId: string, enabled: boolean) => {
    await updateAutoRollbackTrigger(triggerId, { enabled })
  }

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Rollback History</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Total: {rollbackHistory.length}</span>
          <span>
            Success Rate: {
              rollbackHistory.length > 0 
                ? Math.round((rollbackHistory.filter(r => r.status === 'completed').length / rollbackHistory.length) * 100)
                : 0
            }%
          </span>
        </div>
      </div>

      {rollbackHistory.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600">No rollback history available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rollbackHistory.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge 
                        variant={entry.status === 'completed' ? 'success' : entry.status === 'failed' ? 'error' : 'default'}
                        size="sm"
                      >
                        {entry.status.replace('_', ' ')}
                      </Badge>
                      <span className="font-medium text-gray-900">
                        {entry.fromVersion} → {entry.toVersion}
                      </span>
                      <span className="text-sm text-gray-600">
                        Deployment: {entry.deploymentId}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Triggered by:</span>
                        <span className="ml-2 text-gray-600">{entry.triggeredBy}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Reason:</span>
                        <span className="ml-2 text-gray-600">{entry.reason}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Started:</span>
                        <span className="ml-2 text-gray-600">{entry.triggeredAt.toLocaleString()}</span>
                      </div>
                      {entry.duration && (
                        <div>
                          <span className="font-medium text-gray-700">Duration:</span>
                          <span className="ml-2 text-gray-600">{formatDuration(entry.duration)}</span>
                        </div>
                      )}
                    </div>

                    {entry.impact && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Data Loss Risk:</span>
                            <div className={cn(
                              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2',
                              entry.impact.dataLossRisk === 'none' ? 'text-green-600 bg-green-50' :
                              entry.impact.dataLossRisk === 'low' ? 'text-yellow-600 bg-yellow-50' :
                              entry.impact.dataLossRisk === 'medium' ? 'text-orange-600 bg-orange-50' :
                              'text-red-600 bg-red-50'
                            )}>
                              {entry.impact.dataLossRisk}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">User Impact:</span>
                            <div className={cn(
                              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2',
                              entry.impact.userImpact === 'minimal' ? 'text-green-600 bg-green-50' :
                              entry.impact.userImpact === 'moderate' ? 'text-yellow-600 bg-yellow-50' :
                              entry.impact.userImpact === 'significant' ? 'text-orange-600 bg-orange-50' :
                              'text-red-600 bg-red-50'
                            )}>
                              {entry.impact.userImpact}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Downtime:</span>
                            <span className="ml-2 text-gray-600">
                              {formatDuration(entry.impact.estimatedDowntime)}
                            </span>
                          </div>
                        </div>

                        {entry.impact.affectedServices.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-700">Affected Services:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.impact.affectedServices.map((service) => (
                                <Badge key={service} variant="secondary" size="sm">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderTriggersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Auto-Rollback Triggers</h3>
        <Button variant="outline" size="sm">
          Add Trigger
        </Button>
      </div>

      <div className="space-y-3">
        {autoTriggers.map((trigger) => (
          <Card key={trigger.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900">{trigger.name}</h4>
                    <Badge 
                      variant={trigger.enabled ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {trigger.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Condition:</span>
                      <span className="ml-2 text-gray-600 font-mono">{trigger.condition}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Threshold:</span>
                      <span className="ml-2 text-gray-600">{trigger.threshold}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Trigger Count:</span>
                      <span className="ml-2 text-gray-600">{trigger.triggerCount}</span>
                    </div>
                    {trigger.lastTriggered && (
                      <div>
                        <span className="font-medium text-gray-700">Last Triggered:</span>
                        <span className="ml-2 text-gray-600">
                          {trigger.lastTriggered.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTriggerToggle(trigger.id, !trigger.enabled)}
                  >
                    {trigger.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Failed to load rollback management data</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Rollback History
          </button>
          <button
            onClick={() => setActiveTab('triggers')}
            className={cn(
              'py-2 px-1 border-b-2 font-medium text-sm',
              activeTab === 'triggers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            Auto-Rollback Triggers
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading rollback management data...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'triggers' && renderTriggersTab()}
        </>
      )}
    </div>
  )
}

export default RollbackManagementDashboard