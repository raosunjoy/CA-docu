// Sync Administration Dashboard - For IT teams to monitor and manage sync
'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'

interface SyncMetrics {
  totalUsers: number
  activeUsers: number
  totalOperations: number
  pendingOperations: number
  failedOperations: number
  conflictedOperations: number
  averageSyncTime: number
  successRate: number
  dataTransferred: number
  storageUsed: number
  lastSyncAt: Date
}

interface UserSyncStatus {
  userId: string
  userName: string
  email: string
  isOnline: boolean
  lastSyncAt?: Date
  pendingOperations: number
  conflicts: number
  errors: number
  storageUsed: number
  syncEnabled: boolean
}

interface SyncError {
  id: string
  userId: string
  userName: string
  operationType: string
  resourceType: string
  resourceId: string
  error: string
  timestamp: Date
  retryCount: number
  resolved: boolean
}

interface SyncPolicy {
  id: string
  name: string
  description: string
  rules: {
    maxCacheSize: number
    retentionDays: number
    syncFrequency: number
    autoResolveConflicts: boolean
    allowMobileSync: boolean
  }
  appliedToUsers: string[]
  isDefault: boolean
  createdAt: Date
}

export function SyncAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'errors' | 'policies'>('overview')
  const [metrics, setMetrics] = useState<SyncMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalOperations: 0,
    pendingOperations: 0,
    failedOperations: 0,
    conflictedOperations: 0,
    averageSyncTime: 0,
    successRate: 0,
    dataTransferred: 0,
    storageUsed: 0,
    lastSyncAt: new Date()
  })
  
  const [users, setUsers] = useState<UserSyncStatus[]>([])
  const [errors, setErrors] = useState<SyncError[]>([])
  const [policies, setPolicies] = useState<SyncPolicy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // In a real implementation, these would be API calls
      await Promise.all([
        loadMetrics(),
        loadUsers(),
        loadErrors(),
        loadPolicies()
      ])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async () => {
    // Mock data - in real implementation, fetch from API
    setMetrics({
      totalUsers: 150,
      activeUsers: 89,
      totalOperations: 12450,
      pendingOperations: 23,
      failedOperations: 5,
      conflictedOperations: 3,
      averageSyncTime: 1250,
      successRate: 97.8,
      dataTransferred: 2.4 * 1024 * 1024 * 1024, // 2.4 GB
      storageUsed: 15.6 * 1024 * 1024 * 1024, // 15.6 GB
      lastSyncAt: new Date()
    })
  }

  const loadUsers = async () => {
    // Mock data
    setUsers([
      {
        userId: '1',
        userName: 'John Doe',
        email: 'john@example.com',
        isOnline: true,
        lastSyncAt: new Date(Date.now() - 300000),
        pendingOperations: 2,
        conflicts: 0,
        errors: 0,
        storageUsed: 120 * 1024 * 1024,
        syncEnabled: true
      },
      {
        userId: '2',
        userName: 'Jane Smith',
        email: 'jane@example.com',
        isOnline: false,
        lastSyncAt: new Date(Date.now() - 3600000),
        pendingOperations: 8,
        conflicts: 1,
        errors: 0,
        storageUsed: 85 * 1024 * 1024,
        syncEnabled: true
      }
    ])
  }

  const loadErrors = async () => {
    // Mock data
    setErrors([
      {
        id: '1',
        userId: '2',
        userName: 'Jane Smith',
        operationType: 'update',
        resourceType: 'task',
        resourceId: 'task-123',
        error: 'Network timeout after 30 seconds',
        timestamp: new Date(Date.now() - 1800000),
        retryCount: 2,
        resolved: false
      }
    ])
  }

  const loadPolicies = async () => {
    // Mock data
    setPolicies([
      {
        id: '1',
        name: 'Default Policy',
        description: 'Standard sync policy for all users',
        rules: {
          maxCacheSize: 100,
          retentionDays: 30,
          syncFrequency: 300,
          autoResolveConflicts: true,
          allowMobileSync: false
        },
        appliedToUsers: ['*'],
        isDefault: true,
        createdAt: new Date('2024-01-01')
      }
    ])
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'errors', label: 'Errors', icon: '⚠️' },
    { id: 'policies', label: 'Policies', icon: '⚙️' }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Sync Administration
        </h1>
        <p className="text-gray-600">
          Monitor and manage offline synchronization across your organization
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {metrics.activeUsers}
                        <span className="text-sm font-normal text-gray-500">
                          /{metrics.totalUsers}
                        </span>
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {metrics.successRate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Pending Ops</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {metrics.pendingOperations}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Storage Used</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatBytes(metrics.storageUsed)}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                      </svg>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Sync Performance
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Sync Time</span>
                      <span className="text-sm font-medium">
                        {formatDuration(metrics.averageSyncTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Data Transferred</span>
                      <span className="text-sm font-medium">
                        {formatBytes(metrics.dataTransferred)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Operations</span>
                      <span className="text-sm font-medium">
                        {metrics.totalOperations.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Sync</span>
                      <span className="text-sm font-medium">
                        {formatTimeAgo(metrics.lastSyncAt)}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Issues Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Failed Operations</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        metrics.failedOperations > 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {metrics.failedOperations}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conflicts</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        metrics.conflictedOperations > 0 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {metrics.conflictedOperations}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending Operations</span>
                      <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                        metrics.pendingOperations > 10 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {metrics.pendingOperations}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  User Sync Status
                </h2>
                <Button size="sm">
                  Export Report
                </Button>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Sync
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pending
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Storage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.userId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.userName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                              }`} />
                              <span className="text-sm text-gray-900">
                                {user.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.lastSyncAt ? formatTimeAgo(user.lastSyncAt) : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">
                                {user.pendingOperations}
                              </span>
                              {user.conflicts > 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  {user.conflicts} conflicts
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatBytes(user.storageUsed)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                              View Details
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              Force Sync
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Sync Errors
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Clear Resolved
                  </Button>
                  <Button size="sm">
                    Retry All
                  </Button>
                </div>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Operation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Error
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Retries
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {errors.map((error) => (
                        <tr key={error.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {error.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {error.operationType} {error.resourceType}
                            </div>
                            <div className="text-sm text-gray-500">
                              #{error.resourceId.slice(-8)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate">
                              {error.error}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimeAgo(error.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {error.retryCount}/3
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">
                              Retry
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              Skip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Policies Tab */}
          {activeTab === 'policies' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">
                  Sync Policies
                </h2>
                <Button size="sm">
                  Create Policy
                </Button>
              </div>

              <div className="space-y-4">
                {policies.map((policy) => (
                  <Card key={policy.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {policy.name}
                          </h3>
                          {policy.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{policy.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Max Cache Size:</span>
                            <span className="ml-2 font-medium">{policy.rules.maxCacheSize}MB</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Retention:</span>
                            <span className="ml-2 font-medium">{policy.rules.retentionDays} days</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Sync Frequency:</span>
                            <span className="ml-2 font-medium">{policy.rules.syncFrequency}s</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Auto Resolve:</span>
                            <span className="ml-2 font-medium">
                              {policy.rules.autoResolveConflicts ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Mobile Sync:</span>
                            <span className="ml-2 font-medium">
                              {policy.rules.allowMobileSync ? 'Allowed' : 'Disabled'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Applied To:</span>
                            <span className="ml-2 font-medium">
                              {policy.appliedToUsers.includes('*') ? 'All Users' : `${policy.appliedToUsers.length} users`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        {!policy.isDefault && (
                          <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}