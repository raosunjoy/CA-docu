import { useState, useCallback } from 'react'
import type { Role } from '@/lib/role-based-filter'

export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json'

interface ExportOptions {
  widgetId: string
  format: ExportFormat
  userId: string
  organizationId: string
  role: Role
  dateRange?: {
    startDate: string
    endDate: string
  }
  filters?: Record<string, any>
  includeMetadata?: boolean
}

interface ExportResult {
  success: boolean
  data?: any
  filename?: string
  contentType?: string
  error?: string
  metadata?: {
    exportedAt: string
    recordCount: number
    fileSize: number
    expiresAt: string
  }
}

interface ExportState {
  isExporting: boolean
  error: string | null
  lastExport: ExportResult | null
}

export const useDataExport = () => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    error: null,
    lastExport: null
  })

  /**
   * Export widget data
   */
  const exportData = useCallback(async (options: ExportOptions): Promise<ExportResult> => {
    setExportState(prev => ({ ...prev, isExporting: true, error: null }))
    
    try {
      const response = await fetch('/api/dashboard/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      })

      const result: ExportResult = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Export failed with status ${response.status}`)
      }

      if (result.success && result.data) {
        // Handle different export formats
        switch (options.format) {
          case 'csv':
            downloadFile(result.data, result.filename!, 'text/csv')
            break
          
          case 'json':
            downloadFile(
              JSON.stringify(result.data, null, 2), 
              result.filename!, 
              'application/json'
            )
            break
          
          case 'excel':
          case 'pdf':
            // For binary formats, the API should return a download URL or base64 data
            // This is a placeholder implementation
            console.log(`${options.format.toUpperCase()} export data:`, result.data)
            // In a real implementation, you'd handle binary file download
            break
        }
      }

      setExportState(prev => ({ 
        ...prev, 
        isExporting: false, 
        lastExport: result 
      }))

      return result
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      
      setExportState(prev => ({ 
        ...prev, 
        isExporting: false, 
        error: errorMessage 
      }))

      return {
        success: false,
        error: errorMessage
      }
    }
  }, [])

  /**
   * Get available export formats for a widget
   */
  const getAvailableFormats = useCallback(async (
    widgetId: string, 
    role: Role
  ): Promise<ExportFormat[]> => {
    try {
      const response = await fetch(
        `/api/dashboard/export/formats?widgetId=${widgetId}&role=${role}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to get available formats')
      }
      
      const data = await response.json()
      return data.allowedFormats || []
      
    } catch (error) {
      console.error('Failed to get available export formats:', error)
      return []
    }
  }, [])

  /**
   * Export multiple widgets at once
   */
  const exportMultipleWidgets = useCallback(async (
    widgets: Array<{ widgetId: string; format: ExportFormat }>,
    commonOptions: Omit<ExportOptions, 'widgetId' | 'format'>
  ): Promise<ExportResult[]> => {
    const results: ExportResult[] = []
    
    // Export widgets sequentially to avoid overwhelming the server
    for (const widget of widgets) {
      const result = await exportData({
        ...commonOptions,
        widgetId: widget.widgetId,
        format: widget.format
      })
      results.push(result)
      
      // Small delay between exports
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return results
  }, [exportData])

  /**
   * Clear export state
   */
  const clearExportState = useCallback(() => {
    setExportState({
      isExporting: false,
      error: null,
      lastExport: null
    })
  }, [])

  return {
    ...exportState,
    exportData,
    getAvailableFormats,
    exportMultipleWidgets,
    clearExportState
  }
}

/**
 * Utility function to trigger file download
 */
function downloadFile(data: string, filename: string, contentType: string) {
  const blob = new Blob([data], { type: contentType })
  const url = window.URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL object
  window.URL.revokeObjectURL(url)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Generate export filename with timestamp
 */
export function generateExportFilename(
  widgetId: string,
  format: ExportFormat,
  includeTimestamp = true
): string {
  const cleanWidgetId = widgetId.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = includeTimestamp ? 
    new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] : ''
  
  return `${cleanWidgetId}${timestamp ? `_${timestamp}` : ''}.${format}`
}

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): { valid: boolean; error?: string } {
  if (!options.widgetId) {
    return { valid: false, error: 'Widget ID is required' }
  }
  
  if (!options.format || !['csv', 'excel', 'pdf', 'json'].includes(options.format)) {
    return { valid: false, error: 'Valid format is required (csv, excel, pdf, json)' }
  }
  
  if (!options.userId) {
    return { valid: false, error: 'User ID is required' }
  }
  
  if (!options.organizationId) {
    return { valid: false, error: 'Organization ID is required' }
  }
  
  if (!options.role) {
    return { valid: false, error: 'User role is required' }
  }
  
  if (options.dateRange) {
    const startDate = new Date(options.dateRange.startDate)
    const endDate = new Date(options.dateRange.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid date format in date range' }
    }
    
    if (startDate >= endDate) {
      return { valid: false, error: 'Start date must be before end date' }
    }
  }
  
  return { valid: true }
}