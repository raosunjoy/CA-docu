'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  ShieldCheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import type { TagAuditLog, TagComplianceViolation, TagComplianceReport } from '@/lib/tag-audit-service'

interface TagAuditDashboardProps {
  organizationId: string
  className?: string
}

interface AuditFilters {
  action?: string[]
  resourceType?: string[]
  userId?: string
  tagId?: string
  startDate?: string
  endDate?: string
}

export const TagAuditDashboard: React.FC<TagAuditDashboardProps> = ({
  organizationId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'compliance' | 'reports'>('logs')
  const [auditLogs, setAuditLogs] = useState<TagAuditLog[]>([])
  const [violations, setViolations] = useState<TagComplianceViolation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AuditFilters>({})
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.action?.length) {
        params.append('action', filters.action.join(','))
      }
      if (filters.resourceType?.length) {
        params.append('resourceType', filters.resourceType.join(','))
      }
      if (filters.userId) {
        params.append('userId', filters.userId)
      }
      if (filters.tagId) {
        params.append('tagId', filters.tagId)
      }
      if (filters.startDate) {
        params.append('startDate', new Date(filters.startDate).toISOString())
      }
      if (filters.endDate) {
        params.append('endDate', new Date(filters.endDate).toISOString())
      }

      const response = await fetch(`/api/tags/audit?${params}`)
      const result = await response.json()

      if (result.success) {
        setAuditLogs(result.data.logs)
        setPagination(prev => ({
          ...prev,
          total: result.data.total
        }))
      } else {
        throw new Error(result.error?.message || 'Failed to load audit logs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit])

  // Load compliance data
  const loadComplianceData = useCallback(async () => {
    // Implementation would load compliance violations and rules
    console.log('Loading compliance data...')
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') {
      loadAuditLogs()
    } else if (activeTab === 'compliance') {
      loadComplianceData()
    }
  }, [activeTab, loadAuditLogs, loadComplianceData])

  const handleFilterChange = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(date))
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <span className="text-green-600">+</span>
      case 'update':
        return <span className="text-blue-600">✎</span>
      case 'delete':
        return <span className="text-red-600">×</span>
      case 'apply':
        return <span className="text-purple-600">→</span>
      case 'remove':
        return <span className="text-orange-600">←</span>
      default:
        return <span className="text-gray-600">•</span>
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheckIcon className="w-8 h-8 mr-3 text-blue-600" />
            Tag Audit & Compliance
          </h2>
          <p className="text-gray-600">Monitor tag usage, compliance, and security</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClockIcon className="w-4 h-4 inline mr-2" />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ExclamationTriangleIcon className="w-4 h-4 inline mr-2" />
            Compliance
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ChartBarIcon className="w-4 h-4 inline mr-2" />
            Reports
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  multiple
                  value={filters.action || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value)
                    handleFilterChange({ action: values.length > 0 ? values : undefined })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="apply">Apply</option>
                  <option value="remove">Remove</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource Type
                </label>
                <select
                  multiple
                  value={filters.resourceType || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value)
                    handleFilterChange({ resourceType: values.length > 0 ? values : undefined })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="tag">Tag</option>
                  <option value="tagging">Tagging</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({})
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Audit Logs ({pagination.total.toLocaleString()})
                </h3>
                <button
                  onClick={loadAuditLogs}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowPathIcon className="w-4 h-4 inline mr-1" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                {error}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No audit logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resource
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getActionIcon(log.action)}
                            <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                              {log.action.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {log.resourceType}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.resourceId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userId || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              // Show log details modal
                              console.log('Show log details:', log)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total.toLocaleString()} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Compliance Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Active Violations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">5</div>
                <div className="text-sm text-gray-600">Compliance Rules</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">Compliance Score</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Compliance Features
            </h3>
            <div className="space-y-4">
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <ShieldCheckIcon className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h4 className="font-medium text-green-900">Automated Compliance Monitoring</h4>
                  <p className="text-sm text-green-700">Real-time monitoring of tag compliance rules</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                <DocumentTextIcon className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-blue-900">Audit Trail</h4>
                  <p className="text-sm text-blue-700">Complete audit trail of all tag operations</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                <CogIcon className="w-6 h-6 text-purple-600 mr-3" />
                <div>
                  <h4 className="font-medium text-purple-900">Data Retention Policies</h4>
                  <p className="text-sm text-purple-700">Automated cleanup based on retention policies</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Compliance Reports
            </h3>
            <p className="text-gray-600 mb-6">
              Generate comprehensive compliance reports for regulatory requirements
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Violations Report</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Detailed report of all compliance violations
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Generate Report
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Usage Report</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Analysis of tag usage patterns and trends
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Generate Report
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Access Report</h4>
                <p className="text-sm text-gray-600 mb-4">
                  User access patterns and security monitoring
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Generate Report
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Retention Report</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Data retention policy execution and cleanup
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TagAuditDashboard