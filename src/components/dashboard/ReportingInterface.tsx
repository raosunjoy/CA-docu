'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import type { 
  ReportTemplate, 
  GeneratedReport, 
  DashboardExportConfig,
  UserRole 
} from '../../types'

interface ReportingInterfaceProps {
  organizationId: string
  userId: string
  userRole: UserRole
  className?: string
}

export const ReportingInterface: React.FC<ReportingInterfaceProps> = ({
  organizationId,
  userId,
  userRole,
  className = ''
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'templates' | 'reports' | 'export'>('templates')
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [templatesResponse, reportsResponse] = await Promise.all([
        fetch(`/api/dashboard/reports?organizationId=${organizationId}&includeCA=true`),
        fetch(`/api/dashboard/reports/history?organizationId=${organizationId}&limit=20`)
      ])

      if (!templatesResponse.ok || !reportsResponse.ok) {
        throw new Error('Failed to load reporting data')
      }

      const templatesData = await templatesResponse.json()
      const reportsData = await reportsResponse.json()

      if (templatesData.success && reportsData.success) {
        setTemplates(templatesData.data)
        setReports(reportsData.data)
      } else {
        throw new Error('Failed to load data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reporting data')
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (templateId: string, parameters: Record<string, any> = {}) => {
    try {
      setGeneratingReports(prev => new Set([...prev, templateId]))

      const response = await fetch('/api/dashboard/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generate_report',
          organizationId,
          templateId,
          parameters: {
            ...parameters,
            role: userRole,
            format: 'pdf'
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const result = await response.json()
      
      if (result.success) {
        setReports(prev => [result.data, ...prev])
      } else {
        throw new Error(result.error?.message || 'Report generation failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev)
        newSet.delete(templateId)
        return newSet
      })
    }
  }

  const exportDashboard = async (config: DashboardExportConfig) => {
    try {
      const response = await fetch('/api/dashboard/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'export_dashboard',
          organizationId,
          exportConfig: config
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export dashboard')
      }

      const result = await response.json()
      
      if (result.success) {
        setReports(prev => [result.data, ...prev])
      } else {
        throw new Error(result.error?.message || 'Dashboard export failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export dashboard')
    }
  }

  if (loading) {
    return (
      <div className={`reporting-interface ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`reporting-interface ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate reports and export dashboard data</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'templates', label: 'Report Templates' },
            { id: 'reports', label: 'Generated Reports' },
            { id: 'export', label: 'Dashboard Export' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <ReportTemplatesTab
          templates={templates}
          onGenerateReport={generateReport}
          generatingReports={generatingReports}
          userRole={userRole}
        />
      )}

      {activeTab === 'reports' && (
        <GeneratedReportsTab
          reports={reports}
          userRole={userRole}
        />
      )}

      {activeTab === 'export' && (
        <DashboardExportTab
          onExportDashboard={exportDashboard}
          userRole={userRole}
        />
      )}
    </div>
  )
}

// Report Templates Tab
interface ReportTemplatesTabProps {
  templates: ReportTemplate[]
  onGenerateReport: (templateId: string, parameters?: Record<string, any>) => void
  generatingReports: Set<string>
  userRole: UserRole
}

const ReportTemplatesTab: React.FC<ReportTemplatesTabProps> = ({
  templates,
  onGenerateReport,
  generatingReports,
  userRole
}) => {
  const categorizedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {} as Record<string, ReportTemplate[]>)

  return (
    <div className="space-y-6">
      {Object.entries(categorizedTemplates).map(([category, categoryTemplates]) => (
        <div key={category}>
          <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
            {category} Reports
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTemplates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    template.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 capitalize">
                    {template.reportType}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => onGenerateReport(template.id)}
                    disabled={generatingReports.has(template.id) || !template.isActive}
                  >
                    {generatingReports.has(template.id) ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Generated Reports Tab
interface GeneratedReportsTabProps {
  reports: GeneratedReport[]
  userRole: UserRole
}

const GeneratedReportsTab: React.FC<GeneratedReportsTabProps> = ({
  reports,
  userRole
}) => {
  const downloadReport = (report: GeneratedReport) => {
    // Mock download - would implement actual file download
    console.log('Downloading report:', report.id)
  }

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated</h3>
          <p className="text-gray-500">Generate your first report from the templates tab</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{report.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {report.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      report.status === 'completed' ? 'bg-green-100 text-green-800' :
                      report.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.generatedAt.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.fileSize ? `${Math.round(report.fileSize / 1024)} KB` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {report.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReport(report)}
                      >
                        Download
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Dashboard Export Tab
interface DashboardExportTabProps {
  onExportDashboard: (config: DashboardExportConfig) => void
  userRole: UserRole
}

const DashboardExportTab: React.FC<DashboardExportTabProps> = ({
  onExportDashboard,
  userRole
}) => {
  const [exportConfig, setExportConfig] = useState<DashboardExportConfig>({
    format: 'pdf',
    widgets: [],
    includeData: true,
    includeCharts: true
  })

  const availableWidgets = [
    { id: 'task-overview', label: 'Task Overview' },
    { id: 'team-performance', label: 'Team Performance' },
    { id: 'compliance-status', label: 'Compliance Status' },
    { id: 'time-tracking', label: 'Time Tracking' },
    { id: 'analytics-chart', label: 'Analytics Charts' }
  ]

  const handleExport = () => {
    onExportDashboard(exportConfig)
  }

  return (
    <div className="max-w-2xl">
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Export Dashboard</h3>
        
        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={exportConfig.format}
              onChange={(e) => setExportConfig(prev => ({ 
                ...prev, 
                format: e.target.value as any 
              }))}
              className="block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="png">PNG Image</option>
            </select>
          </div>

          {/* Widget Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widgets to Include
            </label>
            <div className="space-y-2">
              {availableWidgets.map((widget) => (
                <label key={widget.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportConfig.widgets.includes(widget.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportConfig(prev => ({
                          ...prev,
                          widgets: [...prev.widgets, widget.id]
                        }))
                      } else {
                        setExportConfig(prev => ({
                          ...prev,
                          widgets: prev.widgets.filter(w => w !== widget.id)
                        }))
                      }
                    }}
                    className="mr-2"
                  />
                  {widget.label}
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportConfig.includeData}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  includeData: e.target.checked
                }))}
                className="mr-2"
              />
              Include raw data tables
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={exportConfig.includeCharts}
                onChange={(e) => setExportConfig(prev => ({
                  ...prev,
                  includeCharts: e.target.checked
                }))}
                className="mr-2"
              />
              Include charts and visualizations
            </label>
          </div>

          {/* Title and Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Title (Optional)
            </label>
            <input
              type="text"
              value={exportConfig.title || ''}
              onChange={(e) => setExportConfig(prev => ({
                ...prev,
                title: e.target.value
              }))}
              className="block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Dashboard Export"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={exportConfig.description || ''}
              onChange={(e) => setExportConfig(prev => ({
                ...prev,
                description: e.target.value
              }))}
              className="block w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="Brief description of the export..."
            />
          </div>

          {/* Export Button */}
          <div className="pt-4">
            <Button
              onClick={handleExport}
              disabled={exportConfig.widgets.length === 0}
              className="w-full"
            >
              Export Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}