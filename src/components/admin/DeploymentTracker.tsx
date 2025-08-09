'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { useDeploymentTracker, DeploymentStatus, DeploymentStage } from '@/hooks/useDeploymentTracker'
import { cn } from '@/lib/utils'

interface DeploymentTrackerProps {
  refreshInterval?: number
  showHistory?: boolean
  onRollbackRequest?: (deploymentId: string) => void
  className?: string
}

export const DeploymentTracker: React.FC<DeploymentTrackerProps> = ({
  refreshInterval = 5000,
  showHistory = true,
  onRollbackRequest,
  className = ''
}) => {
  const { currentDeployment, deploymentHistory, loading, error, refresh, triggerRollback } = useDeploymentTracker(refreshInterval)
  const [showLogs, setShowLogs] = useState<string | null>(null)

  const getStatusColor = (status: DeploymentStatus['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'rolled_back':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStageStatusIcon = (status: DeploymentStage['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'running':
        return (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        )
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
        )
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const handleRollback = async (deploymentId: string) => {
    if (onRollbackRequest) {
      onRollbackRequest(deploymentId)
    } else {
      await triggerRollback(deploymentId)
    }
  }

  if (error) {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Deployment Tracker</h3>
            <Button variant="ghost" size="sm" onClick={refresh}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Failed to load deployment data</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Current Deployment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Current Deployment</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refresh}
              disabled={loading}
              className={cn(loading && 'animate-spin')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>

          {currentDeployment ? (
            <div className="space-y-6">
              {/* Deployment Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
                    getStatusColor(currentDeployment.status)
                  )}>
                    <span className="capitalize">{currentDeployment.status.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{currentDeployment.version}</h4>
                    <p className="text-sm text-gray-600">{currentDeployment.environment}</p>
                  </div>
                </div>
                
                {currentDeployment.rollbackAvailable && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRollback(currentDeployment.id)}
                  >
                    Rollback
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{currentDeployment.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentDeployment.progress}%` }}
                  />
                </div>
              </div>

              {/* Deployment Stages */}
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Deployment Stages</h5>
                <div className="space-y-3">
                  {currentDeployment.stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {getStageStatusIcon(stage.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{stage.name}</span>
                          {stage.duration && (
                            <span className="text-sm text-gray-600">
                              {formatDuration(stage.duration)}
                            </span>
                          )}
                        </div>
                        {stage.status === 'running' && (
                          <div className="text-sm text-blue-600">In progress...</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deployment Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <span className="text-sm font-medium text-gray-700">Started:</span>
                  <p className="text-sm text-gray-600">{currentDeployment.startTime.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Deployed by:</span>
                  <p className="text-sm text-gray-600">{currentDeployment.deployedBy}</p>
                </div>
                {currentDeployment.commitHash && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Commit:</span>
                    <p className="text-sm text-gray-600 font-mono">{currentDeployment.commitHash}</p>
                  </div>
                )}
                {currentDeployment.commitMessage && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Message:</span>
                    <p className="text-sm text-gray-600">{currentDeployment.commitMessage}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-600">No active deployments</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deployment History */}
      {showHistory && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Deployment History</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Success Rate: {deploymentHistory.successRate}%</span>
                <span>Avg Duration: {formatDuration(deploymentHistory.averageDuration)}</span>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {deploymentHistory.deployments.map((deployment) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={deployment.status === 'success' ? 'success' : 'error'}
                      size="sm"
                    >
                      {deployment.status}
                    </Badge>
                    <div>
                      <div className="font-medium text-gray-900">{deployment.version}</div>
                      <div className="text-sm text-gray-600">{deployment.environment}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-900">
                      {deployment.endTime && formatDuration(
                        (deployment.endTime.getTime() - deployment.startTime.getTime()) / 1000
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {deployment.startTime.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default DeploymentTracker