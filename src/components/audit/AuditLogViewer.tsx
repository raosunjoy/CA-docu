/**
 * Audit Log Viewer Component
 * Provides comprehensive audit log search and viewing capabilities
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Alert } from '@/components/common/Alert'
import { AuditAction, AuditCategory, AuditSeverity, UserRole } from '@prisma/client'

interface AuditLog {
  id: string
  action: AuditAction
  category: AuditCategory
  severity: AuditSeverity
  description: string
  resourceType?: string
  resourceId?: string
  resourceName?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  changesSummary?: string
  ipAddress?: string
  userAgent?: string
  deviceId?: string
  location?: string
  requestId?: string
  endpoint?: string
  method?: string
  complianceFlags: string[]
  riskScore?: number
  metadata: Record<string, any>
  tags: string[]
  occurredAt: string
  createdAt: string
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: UserRole
  }
}

interface AuditSearchFilters {
  userId?: string
  actions?: AuditAction[]
  categories?: AuditCategory[]
  severities?: AuditSeverity[]
  resourceTypes?: string[]
  resourceIds?: string[]
  dateFrom?: string
  dateTo?: string
  complianceFlags?: string[]
  riskScoreMin?: number
  riskScoreMax?: number
  searchText?: string
  tags?: string[]
  limit?: number
  offset?: number
}

interface AuditLogViewerProps {
  className?: string
  initialFilters?: Partial<AuditSearchFilters>
  onLogSelect?: (log: AuditLog) => void
  showFilters?: boolean
  showExport?: boolean
}

export function AuditLogViewer({
  className = '',
  initialFilters = {},
  onLogSelect,
  showFilters = true,
  showExport = true,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Filter state
  const [filters, setFilters] = useState<AuditSearchFilters>({
    limit: 50,
    offset: 0,
    ...initialFilters,
  })

  // Advanced filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchText, setSearchText] = useState(filters.searchText || '')
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || '')
  const [dateTo, setDateTo] = useState(filters.dateTo || '')

  // Load audit logs
  const loadAuditLogs = async (newFilters?: Partial<AuditSearchFilters>, append = false) => {
    try {
      setLoading(true)
      setError(null)

      const searchFilters = { ...filters, ...newFilters }
      const params = new URLSearchParams()

      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.set(key, value.join(','))
          } else {
            params.set(key, value.toString())
          }
        }
      })

      const response = await fetch(`/api/audit/logs?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load audit logs')
      }

      if (append) {
        setLogs(prev => [...prev, ...data.data.logs])
      } else {
        setLogs(data.data.logs)
      }

      setTotal(data.data.total)
      setHasMore(data.data.hasMore)
      setFilters(searchFilters)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadAuditLogs()
  }, [])

  // Handle search
  const handleSearch = () => {
    loadAuditLogs({
      searchText: searchText || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      offset: 0,
    })
  }

  // Handle load more
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadAuditLogs({ offset: logs.length }, true)
    }
  }

  // Handle filter change
  const handleFilterChange = (key: keyof AuditSearchFilters, value: any) => {
    loadAuditLogs({ [key]: value, offset: 0 })
  }

  // Handle log selection
  const handleLogSelect = (log: AuditLog) => {
    setSelectedLog(log)
    onLogSelect?.(log)
  }

  // Export logs
  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params.set(key, value.join(','))
          } else {
            params.set(key, value.toString())
          }
        }
      })
      params.set('export', format)

      const response = await fetch(`/api/audit/logs/export?${params}`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to export audit logs')
    }
  }

  // Severity color mapping
  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case AuditSeverity.LOW: return 'text-green-600 bg-green-50'
      case AuditSeverity.MEDIUM: return 'text-yellow-600 bg-yellow-50'
      case AuditSeverity.HIGH: return 'text-orange-600 bg-orange-50'
      case AuditSeverity.CRITICAL: return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Risk score color
  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score <= 25) return 'text-green-600'
    if (score <= 50) return 'text-yellow-600'
    if (score <= 75) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="space-y-4">
            {/* Basic Search */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search audit logs..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date From
                  </label>
                  <Input
                    type="datetime-local"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date To
                  </label>
                  <Input
                    type="datetime-local"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Action
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => handleFilterChange('actions', e.target.value ? [e.target.value] : undefined)}
                  >
                    <option value="">All Actions</option>
                    {Object.values(AuditAction).map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => handleFilterChange('categories', e.target.value ? [e.target.value] : undefined)}
                  >
                    <option value="">All Categories</option>
                    {Object.values(AuditCategory).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => handleFilterChange('severities', e.target.value ? [e.target.value] : undefined)}
                  >
                    <option value="">All Severities</option>
                    {Object.values(AuditSeverity).map(severity => (
                      <option key={severity} value={severity}>{severity}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resource Type
                  </label>
                  <Input
                    placeholder="e.g., task, document"
                    onChange={(e) => handleFilterChange('resourceTypes', e.target.value ? [e.target.value] : undefined)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Risk Score
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    onChange={(e) => handleFilterChange('riskScoreMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Risk Score
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0-100"
                    onChange={(e) => handleFilterChange('riskScoreMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>
            )}

            {/* Export Options */}
            {showExport && (
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {total > 0 && `${logs.length} of ${total} logs shown`}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('csv')}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('json')}
                  >
                    Export JSON
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Audit Logs List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleLogSelect(log)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.occurredAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {log.user?.role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {log.action}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {log.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>{log.resourceType}</div>
                    {log.resourceName && (
                      <div className="text-xs text-gray-500 truncate max-w-32">
                        {log.resourceName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${getRiskScoreColor(log.riskScore)}`}>
                      {log.riskScore || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {log.description}
                    </div>
                    {log.complianceFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {log.complianceFlags.map(flag => (
                          <span
                            key={flag}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No audit logs found matching your criteria
          </div>
        )}

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center py-4 border-t">
            <Button variant="outline" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </Card>

      {/* Selected Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Audit Log Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Severity</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedLog.severity)}`}>
                      {selectedLog.severity}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Risk Score</label>
                    <p className={`mt-1 text-sm font-medium ${getRiskScoreColor(selectedLog.riskScore)}`}>
                      {selectedLog.riskScore || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName} (${selectedLog.user.email})` : 'System'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedLog.occurredAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.resourceType} {selectedLog.resourceName && `- ${selectedLog.resourceName}`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.endpoint || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Method</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.method || 'N/A'}</p>
                  </div>
                  {selectedLog.complianceFlags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Compliance Flags</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedLog.complianceFlags.map(flag => (
                          <span
                            key={flag}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedLog.description}</p>
              </div>

              {selectedLog.changesSummary && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Changes Summary</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.changesSummary}</p>
                </div>
              )}

              {(selectedLog.oldValues || selectedLog.newValues) && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedLog.oldValues && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Previous Values</label>
                      <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValues && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">New Values</label>
                      <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                        {JSON.stringify(selectedLog.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {Object.keys(selectedLog.metadata).length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Metadata</label>
                  <pre className="mt-1 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogViewer