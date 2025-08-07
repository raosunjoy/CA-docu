/**
 * Audit Report Manager Component
 * Provides comprehensive audit report generation and management
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Alert } from '@/components/common/Alert'
import { AuditAction, AuditCategory, AuditSeverity, UserRole } from '@prisma/client'

interface AuditReport {
  id: string
  name: string
  description?: string
  reportType: 'compliance' | 'security' | 'activity' | 'custom'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  totalRecords: number
  fileFormat?: string
  fileSize?: number
  isScheduled: boolean
  lastGenerated?: string
  nextGeneration?: string
  generatedBy: string
  createdAt: string
  updatedAt: string
}

interface AuditReportManagerProps {
  className?: string
}

export function AuditReportManager({ className = '' }: AuditReportManagerProps) {
  const [reports, setReports] = useState<AuditReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null)

  // Form state for creating new reports
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reportType: 'compliance' as const,
    format: 'pdf' as const,
    dateFrom: '',
    dateTo: '',
    actions: [] as AuditAction[],
    categories: [] as AuditCategory[],
    severities: [] as AuditSeverity[],
    resourceTypes: [] as string[],
    riskScoreMin: '',
    riskScoreMax: '',
    searchText: '',
    isScheduled: false,
    schedule: '',
    allowedRoles: [] as UserRole[],
  })

  // Load reports
  const loadReports = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/audit/reports')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load reports')
      }

      setReports(data.data.reports)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadReports()
  }, [])

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle array field changes
  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }))
  }

  // Create new report
  const handleCreateReport = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Report name is required')
      }

      if (!formData.dateFrom || !formData.dateTo) {
        throw new Error('Date range is required')
      }

      const reportConfig = {
        name: formData.name,
        description: formData.description || undefined,
        reportType: formData.reportType,
        filters: {
          actions: formData.actions.length > 0 ? formData.actions : undefined,
          categories: formData.categories.length > 0 ? formData.categories : undefined,
          severities: formData.severities.length > 0 ? formData.severities : undefined,
          resourceTypes: formData.resourceTypes.length > 0 ? formData.resourceTypes : undefined,
          riskScoreMin: formData.riskScoreMin ? parseInt(formData.riskScoreMin) : undefined,
          riskScoreMax: formData.riskScoreMax ? parseInt(formData.riskScoreMax) : undefined,
          searchText: formData.searchText || undefined,
        },
        dateRange: {
          start: new Date(formData.dateFrom).toISOString(),
          end: new Date(formData.dateTo).toISOString(),
        },
        format: formData.format,
        isScheduled: formData.isScheduled,
        schedule: formData.schedule || undefined,
        allowedRoles: formData.allowedRoles.length > 0 ? formData.allowedRoles : undefined,
      }

      const response = await fetch('/api/audit/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfig),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create report')
      }

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        reportType: 'compliance',
        format: 'pdf',
        dateFrom: '',
        dateTo: '',
        actions: [],
        categories: [],
        severities: [],
        resourceTypes: [],
        riskScoreMin: '',
        riskScoreMax: '',
        searchText: '',
        isScheduled: false,
        schedule: '',
        allowedRoles: [],
      })
      setShowCreateModal(false)

      // Reload reports
      await loadReports()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report')
    } finally {
      setLoading(false)
    }
  }

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/audit/reports/${reportId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete report')
      }

      // Reload reports
      await loadReports()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report')
    } finally {
      setLoading(false)
    }
  }

  // Download report
  const handleDownloadReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/audit/reports/${reportId}/download`)
      
      if (!response.ok) {
        throw new Error('Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-report-${reportId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download report')
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'generating': return 'text-blue-600 bg-blue-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'failed': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Audit Reports</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Report
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Reports List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {report.name}
                    </div>
                    {report.description && (
                      <div className="text-sm text-gray-500">
                        {report.description}
                      </div>
                    )}
                    {report.isScheduled && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        Scheduled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {report.reportType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.totalRecords.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatFileSize(report.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.lastGenerated 
                      ? new Date(report.lastGenerated).toLocaleString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {report.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(report.id)}
                      >
                        Download
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteReport(report.id)}
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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && reports.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No audit reports found. Create your first report to get started.
          </div>
        )}
      </Card>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold">Create Audit Report</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter report name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.reportType}
                      onChange={(e) => handleInputChange('reportType', e.target.value)}
                    >
                      <option value="compliance">Compliance</option>
                      <option value="security">Security</option>
                      <option value="activity">Activity</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter report description"
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Date *
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.dateFrom}
                      onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Date *
                    </label>
                    <Input
                      type="datetime-local"
                      value={formData.dateTo}
                      onChange={(e) => handleInputChange('dateTo', e.target.value)}
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Filters</h4>
                  
                  {/* Actions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actions
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.values(AuditAction).map(action => (
                        <label key={action} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={formData.actions.includes(action)}
                            onChange={(e) => handleArrayChange('actions', action, e.target.checked)}
                          />
                          <span className="text-sm">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.values(AuditCategory).map(category => (
                        <label key={category} className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={formData.categories.includes(category)}
                            onChange={(e) => handleArrayChange('categories', category, e.target.checked)}
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Risk Score Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Risk Score
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.riskScoreMin}
                        onChange={(e) => handleInputChange('riskScoreMin', e.target.value)}
                        placeholder="0-100"
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
                        value={formData.riskScoreMax}
                        onChange={(e) => handleInputChange('riskScoreMax', e.target.value)}
                        placeholder="0-100"
                      />
                    </div>
                  </div>

                  {/* Search Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Text
                    </label>
                    <Input
                      value={formData.searchText}
                      onChange={(e) => handleInputChange('searchText', e.target.value)}
                      placeholder="Search in descriptions, resources, etc."
                    />
                  </div>
                </div>

                {/* Output Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.format}
                      onChange={(e) => handleInputChange('format', e.target.value)}
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.isScheduled}
                        onChange={(e) => handleInputChange('isScheduled', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Schedule Report</span>
                    </label>
                  </div>
                </div>

                {/* Schedule Configuration */}
                {formData.isScheduled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schedule (Cron Expression)
                    </label>
                    <Input
                      value={formData.schedule}
                      onChange={(e) => handleInputChange('schedule', e.target.value)}
                      placeholder="0 0 * * 0 (weekly on Sunday)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Examples: "0 0 * * 0" (weekly), "0 0 1 * *" (monthly), "0 0 * * 1-5" (weekdays)
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateReport}
                    disabled={loading || !formData.name.trim() || !formData.dateFrom || !formData.dateTo}
                  >
                    {loading ? 'Creating...' : 'Create Report'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Report Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedReport(null)}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReport.name}</p>
                </div>
                
                {selectedReport.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{selectedReport.reportType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Records</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReport.totalRecords.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">File Size</label>
                    <p className="mt-1 text-sm text-gray-900">{formatFileSize(selectedReport.fileSize)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Generated</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedReport.lastGenerated 
                        ? new Date(selectedReport.lastGenerated).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                {selectedReport.isScheduled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next Generation</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedReport.nextGeneration 
                        ? new Date(selectedReport.nextGeneration).toLocaleString()
                        : 'Not scheduled'
                      }
                    </p>
                  </div>
                )}

                {selectedReport.status === 'completed' && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => handleDownloadReport(selectedReport.id)}
                      className="w-full"
                    >
                      Download Report
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditReportManager