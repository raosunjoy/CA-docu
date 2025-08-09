import { format, parseISO } from 'date-fns'

// Types for WebSocket data from the dashboard endpoint
export interface WebSocketWidgetData {
  chartData: Array<{
    date: string
    [key: string]: any
  }>
  summary: Record<string, any>
}

// Types for Recharts components
export interface LineChartData {
  name: string
  value: number
  [key: string]: any
}

export interface BarChartData {
  name: string
  value: number
  target?: number
  [key: string]: any
}

export interface PieChartData {
  name: string
  value: number
}

export interface KPIData {
  value: number
  target?: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  status: 'excellent' | 'good' | 'warning' | 'error'
  unit?: string
  prefix?: string
}

/**
 * Formats task overview data for LineChart component
 */
export const formatTaskOverviewData = (wsData: WebSocketWidgetData): {
  chartData: LineChartData[]
  kpiData: KPIData
} => {
  const chartData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    value: point.completed || 0,
    timestamp: point.timestamp
  }))

  const kpiData: KPIData = {
    value: wsData.summary.completedTasks || 0,
    target: wsData.summary.totalTasks || 0,
    trend: wsData.summary.trend === 'up' ? 'up' : wsData.summary.trend === 'down' ? 'down' : 'stable',
    trendPercentage: wsData.summary.completionRate || 0,
    status: wsData.summary.completionRate >= 90 ? 'excellent' :
             wsData.summary.completionRate >= 75 ? 'good' :
             wsData.summary.completionRate >= 60 ? 'warning' : 'error',
    unit: 'tasks'
  }

  return { chartData, kpiData }
}

/**
 * Formats compliance status data for BarChart and KPI components
 */
export const formatComplianceStatusData = (wsData: WebSocketWidgetData): {
  chartData: BarChartData[]
  kpiData: KPIData
  pieData: PieChartData[]
} => {
  const chartData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    value: point.score || 0,
    target: 95, // Target compliance score
    timestamp: point.timestamp
  }))

  const kpiData: KPIData = {
    value: wsData.summary.currentScore || 0,
    target: 95,
    trend: wsData.summary.trend === 'up' ? 'up' : wsData.summary.trend === 'down' ? 'down' : 'stable',
    trendPercentage: Math.abs(wsData.summary.currentScore - 90), // Baseline of 90%
    status: wsData.summary.status === 'excellent' ? 'excellent' :
            wsData.summary.status === 'good' ? 'good' : 'warning',
    unit: '%'
  }

  // Pie chart for compliance breakdown
  const pieData: PieChartData[] = [
    { name: 'Compliant', value: wsData.summary.currentScore || 0 },
    { name: 'Non-Compliant', value: 100 - (wsData.summary.currentScore || 0) }
  ]

  return { chartData, kpiData, pieData }
}

/**
 * Formats team performance data for multiple chart types
 */
export const formatTeamPerformanceData = (wsData: WebSocketWidgetData): {
  efficiencyData: LineChartData[]
  utilizationData: BarChartData[]
  kpiData: {
    efficiency: KPIData
    utilization: KPIData
    collaboration: KPIData
  }
} => {
  const efficiencyData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    value: point.efficiency || 0,
    timestamp: point.timestamp
  }))

  const utilizationData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    value: point.utilization || 0,
    target: 85, // Target utilization
    timestamp: point.timestamp
  }))

  const kpiData = {
    efficiency: {
      value: wsData.summary.averageEfficiency || 0,
      target: 90,
      trend: 'up' as const,
      trendPercentage: 5.2,
      status: wsData.summary.averageEfficiency >= 85 ? 'excellent' as const : 
              wsData.summary.averageEfficiency >= 75 ? 'good' as const : 'warning' as const,
      unit: '%'
    },
    utilization: {
      value: wsData.summary.utilization || 0,
      target: 85,
      trend: 'stable' as const,
      trendPercentage: 1.8,
      status: wsData.summary.utilization >= 80 ? 'good' as const : 'warning' as const,
      unit: '%'
    },
    collaboration: {
      value: wsData.summary.collaborationScore || 0,
      target: 90,
      trend: 'up' as const,
      trendPercentage: 3.1,
      status: wsData.summary.collaborationScore >= 85 ? 'excellent' as const : 'good' as const,
      unit: 'score'
    }
  }

  return { efficiencyData, utilizationData, kpiData }
}

/**
 * Formats workload analytics data for area chart and metrics
 */
export const formatWorkloadAnalyticsData = (wsData: WebSocketWidgetData): {
  chartData: Array<{ name: string; workload: number; capacity: number; timestamp: string }>
  kpiData: {
    currentLoad: KPIData
    efficiency: KPIData
    bottlenecks: KPIData
  }
} => {
  const chartData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    workload: point.workload || 0,
    capacity: point.capacity || 100,
    timestamp: point.timestamp
  }))

  const currentLoad = wsData.summary.currentLoad || 0
  const kpiData = {
    currentLoad: {
      value: currentLoad,
      target: 85,
      trend: currentLoad > 85 ? 'up' as const : 'stable' as const,
      trendPercentage: Math.abs(currentLoad - 75),
      status: currentLoad > 90 ? 'warning' as const : 
              currentLoad > 75 ? 'good' as const : 'excellent' as const,
      unit: '%'
    },
    efficiency: {
      value: wsData.summary.efficiency || 0,
      target: 90,
      trend: 'up' as const,
      trendPercentage: 2.5,
      status: wsData.summary.efficiency >= 85 ? 'excellent' as const : 'good' as const,
      unit: '%'
    },
    bottlenecks: {
      value: wsData.summary.bottlenecks || 0,
      target: 0,
      trend: wsData.summary.bottlenecks > 2 ? 'up' as const : 'down' as const,
      trendPercentage: wsData.summary.bottlenecks * 10,
      status: wsData.summary.bottlenecks === 0 ? 'excellent' as const :
              wsData.summary.bottlenecks <= 2 ? 'good' as const : 'warning' as const,
      unit: 'issues'
    }
  }

  return { chartData, kpiData }
}

/**
 * Formats financial metrics data for revenue charts
 */
export const formatFinancialMetricsData = (wsData: WebSocketWidgetData): {
  revenueData: Array<{ name: string; revenue: number; profit: number; timestamp: string }>
  kpiData: {
    revenue: KPIData
    profit: KPIData
    growth: KPIData
    forecast: KPIData
  }
} => {
  const revenueData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    revenue: point.revenue || 0,
    profit: point.profit || 0,
    timestamp: point.timestamp
  }))

  const monthlyRevenue = wsData.summary.monthlyRevenue || 0
  const kpiData = {
    revenue: {
      value: monthlyRevenue,
      target: 150000,
      trend: 'up' as const,
      trendPercentage: wsData.summary.growth || 0,
      status: monthlyRevenue >= 140000 ? 'excellent' as const : 
              monthlyRevenue >= 100000 ? 'good' as const : 'warning' as const,
      prefix: '$',
      unit: 'monthly'
    },
    profit: {
      value: wsData.summary.profitMargin || 0,
      target: 30,
      trend: 'stable' as const,
      trendPercentage: 1.5,
      status: wsData.summary.profitMargin >= 25 ? 'excellent' as const : 'good' as const,
      unit: '%'
    },
    growth: {
      value: wsData.summary.growth || 0,
      target: 15,
      trend: 'up' as const,
      trendPercentage: wsData.summary.growth || 0,
      status: wsData.summary.growth >= 10 ? 'excellent' as const : 'good' as const,
      unit: '%'
    },
    forecast: {
      value: wsData.summary.forecastAccuracy || 0,
      target: 95,
      trend: 'stable' as const,
      trendPercentage: 2.1,
      status: wsData.summary.forecastAccuracy >= 85 ? 'excellent' as const : 'good' as const,
      unit: '% accuracy'
    }
  }

  return { revenueData, kpiData }
}

/**
 * Formats client engagement data for satisfaction charts
 */
export const formatClientEngagementData = (wsData: WebSocketWidgetData): {
  chartData: LineChartData[]
  interactionData: BarChartData[]
  kpiData: {
    satisfaction: KPIData
    retention: KPIData
    activeClients: KPIData
  }
} => {
  const chartData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    value: point.satisfaction || 0,
    timestamp: point.timestamp
  }))

  const interactionData = wsData.chartData.map(point => ({
    name: format(parseISO(point.date), 'MMM dd'),
    value: point.interactions || 0,
    timestamp: point.timestamp
  }))

  const satisfactionScore = wsData.summary.satisfactionScore || 0
  const kpiData = {
    satisfaction: {
      value: satisfactionScore,
      target: 90,
      trend: 'stable' as const,
      trendPercentage: 1.2,
      status: satisfactionScore >= 85 ? 'excellent' as const :
              satisfactionScore >= 75 ? 'good' as const : 'warning' as const,
      unit: '% satisfied'
    },
    retention: {
      value: wsData.summary.retentionRate || 0,
      target: 95,
      trend: 'up' as const,
      trendPercentage: 2.3,
      status: wsData.summary.retentionRate >= 90 ? 'excellent' as const : 'good' as const,
      unit: '%'
    },
    activeClients: {
      value: wsData.summary.activeClients || 0,
      target: wsData.summary.totalClients || 0,
      trend: 'up' as const,
      trendPercentage: 5.1,
      status: 'good' as const,
      unit: 'clients'
    }
  }

  return { chartData, interactionData, kpiData }
}

/**
 * Generic formatter for any widget type - detects type and applies appropriate formatting
 */
export const formatWidgetData = (widgetId: string, wsData: WebSocketWidgetData) => {
  switch (widgetId) {
    case 'task_overview':
      return { type: 'task_overview', ...formatTaskOverviewData(wsData) }
    
    case 'compliance_status':
      return { type: 'compliance_status', ...formatComplianceStatusData(wsData) }
    
    case 'team_performance':
      return { type: 'team_performance', ...formatTeamPerformanceData(wsData) }
    
    case 'workload_analytics':
      return { type: 'workload_analytics', ...formatWorkloadAnalyticsData(wsData) }
    
    case 'financial_metrics':
      return { type: 'financial_metrics', ...formatFinancialMetricsData(wsData) }
    
    case 'client_engagement':
      return { type: 'client_engagement', ...formatClientEngagementData(wsData) }
    
    default:
      console.warn(`Unknown widget type: ${widgetId}`)
      return { type: 'unknown', chartData: [], kpiData: null }
  }
}

/**
 * Formats data for export (CSV, Excel, PDF)
 */
export const formatDataForExport = (
  widgetId: string, 
  wsData: WebSocketWidgetData, 
  format: 'csv' | 'excel' | 'pdf'
): string | object => {
  const formattedData = formatWidgetData(widgetId, wsData)
  
  switch (format) {
    case 'csv':
      return formatAsCSV(formattedData)
    case 'excel':
      return formatAsExcelData(formattedData)
    case 'pdf':
      return formatAsPDFData(formattedData)
    default:
      return formattedData
  }
}

/**
 * Helper function to format data as CSV string
 */
const formatAsCSV = (data: any): string => {
  if (!data.chartData || data.chartData.length === 0) return ''
  
  const headers = Object.keys(data.chartData[0])
  const csvHeader = headers.join(',')
  const csvRows = data.chartData.map((row: any) => 
    headers.map(header => row[header] || '').join(',')
  )
  
  return [csvHeader, ...csvRows].join('\n')
}

/**
 * Helper function to format data for Excel export
 */
const formatAsExcelData = (data: any): object => {
  return {
    worksheets: [
      {
        name: `${data.type}_chart_data`,
        data: data.chartData || []
      },
      {
        name: `${data.type}_summary`,
        data: [data.kpiData || {}]
      }
    ],
    metadata: {
      title: `${data.type.replace('_', ' ')} Analytics Report`,
      generated: new Date().toISOString(),
      source: 'Zetra Analytics Platform'
    }
  }
}

/**
 * Helper function to format data for PDF export
 */
const formatAsPDFData = (data: any): object => {
  return {
    title: `${data.type.replace('_', ' ')} Analytics Report`,
    sections: [
      {
        title: 'Key Performance Indicators',
        type: 'kpi',
        data: data.kpiData
      },
      {
        title: 'Chart Data',
        type: 'table',
        data: data.chartData
      },
      {
        title: 'Summary',
        type: 'text',
        data: `Generated on ${new Date().toLocaleString()} by Zetra Analytics Platform`
      }
    ]
  }
}

/**
 * Utility function to determine optimal chart type for data
 */
export const getOptimalChartType = (data: any[]): 'line' | 'bar' | 'pie' | 'area' => {
  if (!data || data.length === 0) return 'bar'
  
  const hasTimeData = data.some(item => item.timestamp || item.date)
  const hasMultipleMetrics = data.some(item => Object.keys(item).length > 3)
  const isCategoricalData = data.length <= 8 && !hasTimeData
  
  if (isCategoricalData) return 'pie'
  if (hasTimeData && hasMultipleMetrics) return 'area'
  if (hasTimeData) return 'line'
  
  return 'bar'
}

/**
 * Color palette generator for charts based on data values
 */
export const generateChartColors = (dataLength: number, theme: 'light' | 'dark' = 'light'): string[] => {
  const lightPalette = [
    '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
    '#EC4899', '#84CC16', '#6366F1', '#14B8A6', '#F97316'
  ]
  
  const darkPalette = [
    '#A78BFA', '#22D3EE', '#34D399', '#FBBF24', '#F87171',
    '#F472B6', '#A3E635', '#818CF8', '#2DD4BF', '#FB923C'
  ]
  
  const palette = theme === 'dark' ? darkPalette : lightPalette
  
  // Extend palette if more colors needed
  const colors = []
  for (let i = 0; i < dataLength; i++) {
    colors.push(palette[i % palette.length])
  }
  
  return colors
}