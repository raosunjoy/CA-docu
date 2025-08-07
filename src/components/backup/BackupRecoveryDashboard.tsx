/**
 * Backup and Recovery Dashboard Component
 * Provides comprehensive backup and disaster recovery management interface
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Alert } from '@/components/common/Alert'

interface BackupMetrics {
  totalBackups: number
  successfulBackups: number
  failedBackups: number
  averageBackupSize: number
  averageBackupDuration: number
  lastBackupAt?: string
  nextScheduledBackup?: string
  storageUsed: number
  storageQuota: number
  recoveryPlans: number
  lastRecoveryTest?: string
  complianceScore: number
  recommendations: string[]
}

interface BackupRecord {
  id: string
  configurationId: string
  type: string
  status: string
  startedAt: string
  completedAt?: string
  size: number
  compressedSize: number
  compressionRatio: number
  verificationStatus: string
  performanceMetrics: {
    backupDuration: number
    throughput: number
    cpuUsage: number
    memoryUsage: number
  }
  expiresAt: string
}

interface RecoveryPlan {
  id: string
  name: string
  description: string
  type: string
  priority: string
  rto: number
  rpo: number
  isActive: boolean
  lastTestedAt?: string
  createdAt: string
}

interface BackupRecoveryDashboardProps {
  className?: string
}

export function BackupRecoveryDashboard({ className = '' }: BackupRecoveryDashboardProps) {
  const [metrics, setMetrics] = useState<BackupMetrics | null>(null)
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [recoveryPlans, setRecoveryPlans] = useState<RecoveryPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false)

  // Recovery form state
  const [recoveryForm, setRecoveryForm] = useState({
    type: 'FULL_RESTORE',
    overwriteExisting: false,
    validateBeforeRestore: true,
    notifyUsers: true,
    confirmed: false,
  })

  // Load dashboard data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load metrics
      const metricsResponse = await fetch('/api/backup?action=metrics')
      const metricsData = await metricsResponse.json()

      if (!metricsData.success) {
        throw new Error(metricsData.error || 'Failed to load metrics')
      }

      setMetrics(metricsData.data)

      // Load backups
      const backupsResponse = await fetch('/api/backup?limit=10')
      const backupsData = await backupsResponse.json()

      if (!backupsData.success) {
        throw new Error(backupsData.error || 'Failed to load backups')
      }

      setBackups(backupsData.data.backups)

      // Load recovery plans
      const plansResponse = await fetch('/api/backup/recovery?action=plans')
      const plansData = await plansResponse.json()

      if (!plansData.success) {
        throw new Error(plansData.error || 'Failed to load recovery plans')
      }

      setRecoveryPlans(plansData.data.plans)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadData()
  }, [])

  // Execute backup
  const handleExecuteBackup = async (type: string = 'FULL') => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          configurationId: 'default-config', // Would be selected from UI
          type,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to execute backup')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute backup')
    } finally {
      setLoading(false)
    }
  }

  // Verify backup
  const handleVerifyBackup = async (backupId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          backupId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to verify backup')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify backup')
    } finally {
      setLoading(false)
    }
  }

  // Delete backup
  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          backupId,
          reason: 'manual_deletion',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete backup')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete backup')
    } finally {
      setLoading(false)
    }
  }

  // Start recovery
  const handleStartRecovery = async () => {
    if (!selectedBackup) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/backup/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          backupId: selectedBackup.id,
          ...recoveryForm,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        if (data.requiresConfirmation) {
          setRecoveryForm(prev => ({ ...prev, confirmed: false }))
          setError(data.warning)
          return
        }
        throw new Error(data.error || 'Failed to start recovery')
      }

      setShowRecoveryModal(false)
      setSelectedBackup(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recovery')
    } finally {
      setLoading(false)
    }
  }

  // Test recovery plan
  const handleTestRecoveryPlan = async (planId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/backup/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_plan',
          planId,
          testType: 'manual',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to test recovery plan')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test recovery plan')
    } finally {
      setLoading(false)
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'failed': return 'text-red-600 bg-red-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get compliance score color
  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    if (score >= 50) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Format duration
  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Backup & Recovery</h2>
        <div className="flex gap-2">
          <Button onClick={loadData} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => handleExecuteBackup('FULL')} disabled={loading}>
            Run Full Backup
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExecuteBackup('INCREMENTAL')}
            disabled={loading}
          >
            Run Incremental
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Loading State */}
      {loading && !metrics && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Compliance Score</p>
                  <div className="flex items-center">
                    <span className={`text-2xl font-bold px-3 py-1 rounded-full ${getComplianceScoreColor(metrics.complianceScore)}`}>
                      {metrics.complianceScore}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Successful Backups</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.successfulBackups}/{metrics.totalBackups}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Storage Used</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatFileSize(metrics.storageUsed)}
                  </p>
                  <p className="text-xs text-gray-500">
                    of {formatFileSize(metrics.storageQuota)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Last Backup</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.lastBackupAt 
                      ? new Date(metrics.lastBackupAt).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {metrics.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="ml-3 text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Recent Backups */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Backups</h3>
        
        {backups.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No backups found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {backup.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatFileSize(backup.compressedSize)}</div>
                      <div className="text-xs text-gray-500">
                        {Math.round(backup.compressionRatio * 100)}% compression
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(backup.performanceMetrics.backupDuration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(backup.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {backup.status === 'COMPLETED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBackup(backup)
                              setShowRecoveryModal(true)
                            }}
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyBackup(backup.id)}
                          >
                            Verify
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recovery Plans */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recovery Plans</h3>
          <Button
            variant="outline"
            onClick={() => setShowCreatePlanModal(true)}
          >
            Create Plan
          </Button>
        </div>
        
        {recoveryPlans.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recovery plans found</p>
        ) : (
          <div className="space-y-4">
            {recoveryPlans.map((plan) => (
              <div key={plan.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{plan.name}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        plan.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        plan.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        plan.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.priority}
                      </span>
                      {plan.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">RTO:</span> {plan.rto} minutes
                      </div>
                      <div>
                        <span className="font-medium">RPO:</span> {plan.rpo} minutes
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {plan.type}
                      </div>
                      <div>
                        <span className="font-medium">Last Tested:</span>{' '}
                        {plan.lastTestedAt 
                          ? new Date(plan.lastTestedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestRecoveryPlan(plan.id)}
                    >
                      Test Plan
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recovery Modal */}
      {showRecoveryModal && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Restore from Backup</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRecoveryModal(false)
                    setSelectedBackup(null)
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono">{selectedBackup.id}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recovery Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={recoveryForm.type}
                    onChange={(e) => setRecoveryForm(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="FULL_RESTORE">Full Restore</option>
                    <option value="POINT_IN_TIME">Point-in-Time Recovery</option>
                    <option value="SELECTIVE_RESTORE">Selective Restore</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={recoveryForm.overwriteExisting}
                      onChange={(e) => setRecoveryForm(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                    />
                    <span className="text-sm">Overwrite existing data</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={recoveryForm.validateBeforeRestore}
                      onChange={(e) => setRecoveryForm(prev => ({ ...prev, validateBeforeRestore: e.target.checked }))}
                    />
                    <span className="text-sm">Validate backup before restore</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={recoveryForm.notifyUsers}
                      onChange={(e) => setRecoveryForm(prev => ({ ...prev, notifyUsers: e.target.checked }))}
                    />
                    <span className="text-sm">Notify users of recovery</span>
                  </label>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Warning</p>
                      <p className="text-sm text-yellow-700">
                        This operation will restore data from the backup and may cause system downtime.
                        Please ensure you have proper authorization before proceeding.
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={recoveryForm.confirmed}
                    onChange={(e) => setRecoveryForm(prev => ({ ...prev, confirmed: e.target.checked }))}
                  />
                  <span className="text-sm font-medium">I understand the risks and want to proceed</span>
                </label>

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRecoveryModal(false)
                      setSelectedBackup(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartRecovery}
                    disabled={loading || !recoveryForm.confirmed}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading ? 'Starting...' : 'Start Recovery'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BackupRecoveryDashboard