import { NextRequest, NextResponse } from 'next/server'
import { unifiedDataLayer } from '@/lib/unified/data-layer'
import { analyticsService } from '@/services/analytics-service'
import { 
  formatDataForExport, 
  formatWidgetData,
  type WebSocketWidgetData 
} from '@/lib/chart-data-formatter'
import { 
  canExportWidget,
  sanitizeWidgetData,
  getRolePermissions,
  type Role 
} from '@/lib/role-based-filter'

// Support multiple export formats
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json'

interface ExportRequest {
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

interface ExportResponse {
  success: boolean
  data?: any
  downloadUrl?: string
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

/**
 * POST /api/dashboard/export
 * Export dashboard widget data in various formats
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ExportRequest = await request.json()
    
    // Validate request
    const validation = validateExportRequest(body)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Check role permissions
    const canExport = canExportWidget(body.widgetId, body.role, body.format)
    if (!canExport) {
      const permissions = getRolePermissions(body.role)
      return NextResponse.json(
        { 
          success: false, 
          error: `Export access denied. Role '${body.role}' cannot export '${body.widgetId}' data in '${body.format}' format.${
            !permissions.canExportData ? ' Your role does not have export permissions.' : ''
          }`
        },
        { status: 403 }
      )
    }

    // Fetch widget data
    const widgetData = await fetchWidgetDataForExport(body)
    
    // Sanitize data based on role
    const sanitizedData = sanitizeWidgetData(
      body.widgetId,
      widgetData,
      body.role,
      body.userId
    )

    // Handle error in sanitized data
    if (sanitizedData.error) {
      return NextResponse.json(
        { success: false, error: sanitizedData.error },
        { status: 403 }
      )
    }

    // Format data for export
    const exportData = await formatDataForExport(
      body.widgetId,
      sanitizedData,
      body.format
    )

    // Generate response based on format
    const response = await generateExportResponse(
      body,
      exportData,
      sanitizedData
    )

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Dashboard export error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dashboard/export/formats
 * Get available export formats for a widget and role
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const widgetId = searchParams.get('widgetId')
    const role = searchParams.get('role') as Role
    
    if (!widgetId || !role) {
      return NextResponse.json(
        { error: 'Missing widgetId or role parameter' },
        { status: 400 }
      )
    }

    const availableFormats: ExportFormat[] = ['csv', 'excel', 'pdf', 'json']
    const allowedFormats = availableFormats.filter(format => 
      canExportWidget(widgetId, role, format)
    )

    const permissions = getRolePermissions(role)

    return NextResponse.json({
      widgetId,
      role,
      allowedFormats,
      permissions: {
        canExportData: permissions.canExportData,
        maxDataRetention: permissions.maxDataRetention
      },
      formatDetails: {
        csv: {
          description: 'Comma-separated values for spreadsheet applications',
          contentType: 'text/csv',
          fileExtension: '.csv'
        },
        excel: {
          description: 'Microsoft Excel format with multiple worksheets',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileExtension: '.xlsx'
        },
        pdf: {
          description: 'PDF report with charts and formatted data',
          contentType: 'application/pdf',
          fileExtension: '.pdf'
        },
        json: {
          description: 'Raw JSON data for API integration',
          contentType: 'application/json',
          fileExtension: '.json'
        }
      }
    })
    
  } catch (error) {
    console.error('Export formats error:', error)
    return NextResponse.json(
      { error: 'Failed to get export formats' },
      { status: 500 }
    )
  }
}

/**
 * Validate export request
 */
function validateExportRequest(body: ExportRequest): { valid: boolean; error?: string } {
  if (!body.widgetId) {
    return { valid: false, error: 'widgetId is required' }
  }
  
  if (!body.format) {
    return { valid: false, error: 'format is required' }
  }
  
  if (!['csv', 'excel', 'pdf', 'json'].includes(body.format)) {
    return { valid: false, error: 'Invalid format. Supported: csv, excel, pdf, json' }
  }
  
  if (!body.userId) {
    return { valid: false, error: 'userId is required' }
  }
  
  if (!body.organizationId) {
    return { valid: false, error: 'organizationId is required' }
  }
  
  if (!body.role) {
    return { valid: false, error: 'role is required' }
  }
  
  // Validate date range if provided
  if (body.dateRange) {
    const startDate = new Date(body.dateRange.startDate)
    const endDate = new Date(body.dateRange.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid date format in dateRange' }
    }
    
    if (startDate >= endDate) {
      return { valid: false, error: 'startDate must be before endDate' }
    }
    
    // Check data retention limits
    const permissions = getRolePermissions(body.role)
    const maxRetentionDate = new Date(Date.now() - permissions.maxDataRetention * 24 * 60 * 60 * 1000)
    
    if (startDate < maxRetentionDate) {
      return { 
        valid: false, 
        error: `Date range exceeds maximum data retention (${permissions.maxDataRetention} days) for role '${body.role}'` 
      }
    }
  }
  
  return { valid: true }
}

/**
 * Fetch widget data for export
 */
async function fetchWidgetDataForExport(request: ExportRequest): Promise<WebSocketWidgetData> {
  const endDate = request.dateRange ? new Date(request.dateRange.endDate) : new Date()
  const startDate = request.dateRange ? 
    new Date(request.dateRange.startDate) : 
    new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days

  // Use the same data fetching logic as the WebSocket service
  switch (request.widgetId) {
    case 'task_overview':
      return await getTaskOverviewData(request, startDate, endDate)
    
    case 'compliance_status':
      return await getComplianceStatusData(request, startDate, endDate)
    
    case 'team_performance':
      return await getTeamPerformanceData(request, startDate, endDate)
    
    case 'workload_analytics':
      return await getWorkloadAnalyticsData(request, startDate, endDate)
    
    case 'financial_metrics':
      return await getFinancialMetricsData(request, startDate, endDate)
    
    case 'client_engagement':
      return await getClientEngagementData(request, startDate, endDate)
    
    default:
      throw new Error(`Unknown widget: ${request.widgetId}`)
  }
}

// Widget data fetching functions (mirrors WebSocket service)
async function getTaskOverviewData(request: ExportRequest, startDate: Date, endDate: Date): Promise<WebSocketWidgetData> {
  const taskCompletionData = await unifiedDataLayer.getTimeSeriesData(
    'task_completion_rate',
    { start: startDate, end: endDate },
    'gold'
  )
  
  const analytics = await analyticsService.generateComprehensiveAnalytics({
    period: 'DAILY',
    startDate,
    endDate,
    organizationId: request.organizationId,
    userId: request.userId,
    filters: request.filters
  })
  
  return {
    chartData: taskCompletionData.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      completed: point.value,
      timestamp: point.timestamp.toISOString()
    })),
    summary: {
      totalTasks: analytics.productivity.totalTasks,
      completedTasks: analytics.productivity.tasksCompleted,
      completionRate: Math.round((analytics.productivity.tasksCompleted / analytics.productivity.totalTasks) * 100),
      trend: taskCompletionData.length > 1 ? 
        (taskCompletionData[taskCompletionData.length - 1].value > taskCompletionData[0].value ? 'up' : 'down') : 'stable'
    }
  }
}

async function getComplianceStatusData(request: ExportRequest, startDate: Date, endDate: Date): Promise<WebSocketWidgetData> {
  const complianceData = await unifiedDataLayer.getTimeSeriesData(
    'compliance_score',
    { start: startDate, end: endDate },
    'gold'
  )
  
  const analytics = await analyticsService.generateComprehensiveAnalytics({
    period: 'WEEKLY',
    startDate,
    endDate,
    organizationId: request.organizationId,
    userId: request.userId
  })
  
  return {
    chartData: complianceData.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      score: point.value,
      timestamp: point.timestamp.toISOString()
    })),
    summary: {
      currentScore: analytics.compliance.complianceScore,
      status: analytics.compliance.complianceScore >= 90 ? 'excellent' : 
              analytics.compliance.complianceScore >= 75 ? 'good' : 'needs_attention',
      deadlines: analytics.compliance.upcomingDeadlines || 0,
      trend: complianceData.length > 1 ? 
        (complianceData[complianceData.length - 1].value > complianceData[0].value ? 'up' : 'down') : 'stable'
    }
  }
}

async function getTeamPerformanceData(request: ExportRequest, startDate: Date, endDate: Date): Promise<WebSocketWidgetData> {
  const performanceData = await unifiedDataLayer.getTimeSeriesData(
    'team_efficiency',
    { start: startDate, end: endDate },
    'gold'
  )
  
  const analytics = await analyticsService.generateComprehensiveAnalytics({
    period: 'DAILY',
    startDate,
    endDate,
    organizationId: request.organizationId,
    userId: request.userId
  })
  
  return {
    chartData: performanceData.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      efficiency: point.value,
      utilization: (point.tags as any)?.utilization || 75,
      timestamp: point.timestamp.toISOString()
    })),
    summary: {
      averageEfficiency: analytics.productivity.efficiencyScore,
      utilization: analytics.productivity.utilizationRate,
      activeMembers: analytics.team.activeMembers || 8,
      collaborationScore: analytics.team.collaborationScore || 82
    }
  }
}

async function getWorkloadAnalyticsData(request: ExportRequest, startDate: Date, endDate: Date): Promise<WebSocketWidgetData> {
  const workloadData = await unifiedDataLayer.getTimeSeriesData(
    'workload_distribution',
    { start: startDate, end: endDate },
    'silver'
  )
  
  return {
    chartData: workloadData.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      workload: point.value,
      capacity: (point.tags as any)?.capacity || 100,
      timestamp: point.timestamp.toISOString()
    })),
    summary: {
      currentLoad: workloadData.length > 0 ? workloadData[workloadData.length - 1].value : 75,
      capacity: 100,
      efficiency: 85,
      bottlenecks: 2
    }
  }
}

async function getFinancialMetricsData(request: ExportRequest, startDate: Date, endDate: Date): Promise<WebSocketWidgetData> {
  const revenueData = await unifiedDataLayer.getTimeSeriesData(
    'revenue_trend',
    { start: startDate, end: endDate },
    'platinum'
  )
  
  const analytics = await analyticsService.generateComprehensiveAnalytics({
    period: 'MONTHLY',
    startDate,
    endDate,
    organizationId: request.organizationId,
    userId: request.userId
  })
  
  return {
    chartData: revenueData.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      revenue: point.value,
      profit: point.value * 0.25, // 25% profit margin
      timestamp: point.timestamp.toISOString()
    })),
    summary: {
      monthlyRevenue: analytics.financial.totalRevenue,
      profitMargin: analytics.financial.profitMargin,
      growth: 12.5,
      forecastAccuracy: 89
    }
  }
}

async function getClientEngagementData(request: ExportRequest, startDate: Date, endDate: Date): Promise<WebSocketWidgetData> {
  const engagementData = await unifiedDataLayer.getTimeSeriesData(
    'client_satisfaction',
    { start: startDate, end: endDate },
    'gold'
  )
  
  const analytics = await analyticsService.generateComprehensiveAnalytics({
    period: 'WEEKLY',
    startDate,
    endDate,
    organizationId: request.organizationId,
    userId: request.userId
  })
  
  return {
    chartData: engagementData.map(point => ({
      date: point.timestamp.toISOString().split('T')[0],
      satisfaction: point.value,
      interactions: (point.tags as any)?.interactions || 15,
      timestamp: point.timestamp.toISOString()
    })),
    summary: {
      totalClients: analytics.client.totalClients,
      activeClients: analytics.client.activeClients,
      satisfactionScore: analytics.client.clientSatisfactionScore * 20, // Convert to 0-100 scale
      retentionRate: analytics.client.clientRetentionRate
    }
  }
}

/**
 * Generate export response based on format
 */
async function generateExportResponse(
  request: ExportRequest,
  exportData: any,
  rawData: WebSocketWidgetData
): Promise<ExportResponse> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `${request.widgetId}_${request.format}_${timestamp}`
  
  const metadata = {
    exportedAt: new Date().toISOString(),
    recordCount: rawData.chartData.length,
    fileSize: JSON.stringify(exportData).length,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  }

  switch (request.format) {
    case 'csv':
      return {
        success: true,
        data: exportData,
        filename: `${filename}.csv`,
        contentType: 'text/csv',
        metadata
      }
    
    case 'json':
      return {
        success: true,
        data: request.includeMetadata ? { ...rawData, exportMetadata: metadata } : rawData,
        filename: `${filename}.json`,
        contentType: 'application/json',
        metadata
      }
    
    case 'excel':
      return {
        success: true,
        data: exportData,
        filename: `${filename}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        metadata
      }
    
    case 'pdf':
      return {
        success: true,
        data: exportData,
        filename: `${filename}.pdf`,
        contentType: 'application/pdf',
        metadata
      }
    
    default:
      throw new Error(`Unsupported export format: ${request.format}`)
  }
}