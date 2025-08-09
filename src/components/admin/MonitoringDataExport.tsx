'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent } from '@/components/atoms/Card'
import { Modal } from '@/components/atoms/Modal'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'

interface ExportConfig {
  format: 'csv' | 'json' | 'pdf' | 'xlsx'
  dateRange: {
    start: string
    end: string
    preset?: 'last24h' | 'last7d' | 'last30d' | 'custom'
  }
  dataTypes: {
    systemMetrics: boolean
    alerts: boolean
    deployments: boolean
    serviceStatus: boolean
    userActivity: boolean
    errorLogs: boolean
  }
  filters: {
    severity?: ('low' | 'medium' | 'high' | 'critical')[]
    services?: string[]
    components?: string[]
  }
}

interface ExportJob {
  id: string
  name: string
  config: ExportConfig
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  createdAt: Date
  completedAt?: Date
  downloadUrl?: string
  fileSize?: string
  error?: string
}

interface MonitoringDataExportProps {
  onExport?: (config: ExportConfig) => Promise<void>
  className?: string
}

export const MonitoringDataExport: React.FC<MonitoringDataExportProps> = ({
  onExport,
  className = ''
}) => {
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    dateRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
      preset: 'last24h'
    },
    dataTypes: {
      systemMetrics: true,
      alerts: true,
      deployments: false,
      serviceStatus: true,
      userActivity: false,
      errorLogs: false
    },
    filters: {
      severity: ['medium', 'high', 'critical'],
      services: [],
      components: []
    }
  })

  const availableServices = [
    'API Gateway',
    'Database',
    'Redis Cache',
    'Email Service',
    'File Storage',
    'Search Engine',
    'WebSocket Server',
    'Background Jobs'
  ]

  const availableComponents = [
    'System CPU',
    'System Memory',
    'API Performance',
    'Database Performance',
    'Cache Performance',
    'Network',
    'Storage'
  ]

  const handleDatePresetChange = (preset: ExportConfig['dateRange']['preset']) => {
    const now = new Date()
    let start: Date
    
    switch (preset) {
      case 'last24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'last7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        return
    }
    
    setConfig(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        preset,
        start: start.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    }))
  }

  const handleExport = async () => {
    const jobId = `export-${Date.now()}`
    const newJob: ExportJob = {
      id: jobId,
      name: `Monitoring Data Export - ${new Date().toLocaleDateString()}`,
      config: { ...config },
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }
    
    setExportJobs(prev => [newJob, ...prev])
    setShowExportModal(false)
    
    // Simulate export process
    try {
      // Update to processing
      setExportJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'processing', progress: 10 }
          : job
      ))
      
      // Simulate progress updates
      const progressSteps = [25, 50, 75, 90, 100]
      for (const progress of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        setExportJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { ...job, progress }
            : job
        ))
      }
      
      // Complete the job
      setExportJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              downloadUrl: `/api/exports/${jobId}/download`,
              fileSize: '2.4 MB'
            }
          : job
      ))
      
      if (onExport) {
        await onExport(config)
      }
    } catch (error) {
      setExportJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'failed',
              error: error instanceof Error ? error.message : 'Export failed'
            }
          : job
      ))
    }
  }

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      // In a real implementation, this would trigger the actual download
      console.log('Downloading:', job.downloadUrl)
      window.open(job.downloadUrl, '_blank')
    }
  }

  const getStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getFormatIcon = (format: ExportConfig['format']) => {
    switch (format) {
      case 'csv':
        return '📊'
      case 'json':
        return '📄'
      case 'pdf':
        return '📋'
      case 'xlsx':
        return '📈'
      default:
        return '📁'
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Data Export & Reporting</h3>
          <p className="text-sm text-gray-600">Export monitoring data for analysis and compliance</p>
        </div>
        <Button onClick={() => setShowExportModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          New Export
        </Button>
      </div>

      {/* Export Jobs */}
      {exportJobs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600">No export jobs yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first export to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exportJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="text-2xl">{getFormatIcon(job.config.format)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{job.name}</h4>
                        <Badge 
                          variant={
                            job.status === 'completed' ? 'success' :
                            job.status === 'failed' ? 'destructive' : 'default'
                          }
                          size="sm"
                        >
                          {job.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Format: {job.config.format.toUpperCase()}</span>
                        <span>Created: {job.createdAt.toLocaleString()}</span>
                        {job.fileSize && <span>Size: {job.fileSize}</span>}
                      </div>
                      
                      {job.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="text-gray-900">{job.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {job.error && (
                        <div className="mt-2 text-sm text-red-600">
                          Error: {job.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {job.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(job)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Export Configuration Modal */}
      {showExportModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          size="lg"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Export Monitoring Data</h3>
            
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['csv', 'json', 'pdf', 'xlsx'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => setConfig(prev => ({ ...prev, format }))}
                      className={cn(
                        'p-3 border rounded-lg text-center transition-colors',
                        config.format === format
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="text-2xl mb-1">{getFormatIcon(format)}</div>
                      <div className="text-sm font-medium">{format.toUpperCase()}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Date Range</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {([
                    { key: 'last24h', label: 'Last 24 Hours' },
                    { key: 'last7d', label: 'Last 7 Days' },
                    { key: 'last30d', label: 'Last 30 Days' }
                  ] as const).map((preset) => (
                    <button
                      key={preset.key}
                      onClick={() => handleDatePresetChange(preset.key)}
                      className={cn(
                        'px-3 py-2 border rounded-md text-sm transition-colors',
                        config.dateRange.preset === preset.key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={config.dateRange.start}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value, preset: 'custom' }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={config.dateRange.end}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value, preset: 'custom' }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Data Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Data Types</label>
                <div className="space-y-2">
                  {Object.entries(config.dataTypes).map(([key, value]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          dataTypes: { ...prev.dataTypes, [key]: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Filters</label>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Alert Severity</label>
                    <div className="flex flex-wrap gap-2">
                      {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                        <label key={severity} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={config.filters.severity?.includes(severity)}
                            onChange={(e) => {
                              const currentSeverities = config.filters.severity || []
                              const newSeverities = e.target.checked
                                ? [...currentSeverities, severity]
                                : currentSeverities.filter(s => s !== severity)
                              setConfig(prev => ({
                                ...prev,
                                filters: { ...prev.filters, severity: newSeverities }
                              }))
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-1 text-sm text-gray-700 capitalize">{severity}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
              <Button variant="ghost" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport}>
                Start Export
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default MonitoringDataExport