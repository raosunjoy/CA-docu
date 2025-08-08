'use client'

import React, { useState } from 'react'
import { 
  useAnalytics, 
  useKPIs, 
  useMetrics, 
  usePerformanceAnalytics,
  useProductivityMetrics,
  useTimeTrackingAnalytics,
  useComplianceMetrics,
  useClientEngagementAnalytics
} from '../../hooks/useGraphQL'
import { Card } from '../atoms/Card'
import { Button } from '../atoms/Button'

interface GraphQLAnalyticsDemoProps {
  organizationId: string
  userId?: string
  role?: string
}

export function GraphQLAnalyticsDemo({ 
  organizationId, 
  userId, 
  role 
}: GraphQLAnalyticsDemoProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('performance')
  const [period, setPeriod] = useState<string>('MONTH')

  // Analytics hooks
  const { 
    data: analyticsData, 
    loading: analyticsLoading, 
    error: analyticsError,
    refetch: refetchAnalytics
  } = useAnalytics({
    organizationId,
    userId,
    role,
    metric: selectedMetric,
    period
  })

  const { 
    data: kpisData, 
    loading: kpisLoading, 
    error: kpisError 
  } = useKPIs({
    organizationId,
    userId,
    role
  })

  const { 
    data: metricsData, 
    loading: metricsLoading, 
    error: metricsError 
  } = useMetrics({
    organizationId,
    userId,
    metricTypes: ['task-count', 'completion-rate']
  })

  const { 
    data: performanceData, 
    loading: performanceLoading, 
    error: performanceError 
  } = usePerformanceAnalytics({
    organizationId,
    userId,
    role,
    period
  })

  const { 
    data: productivityData, 
    loading: productivityLoading, 
    error: productivityError 
  } = useProductivityMetrics({
    organizationId,
    userId
  })

  const { 
    data: timeTrackingData, 
    loading: timeTrackingLoading, 
    error: timeTrackingError 
  } = useTimeTrackingAnalytics({
    organizationId,
    userId
  })

  const { 
    data: complianceData, 
    loading: complianceLoading, 
    error: complianceError 
  } = useComplianceMetrics({
    organizationId,
    role
  })

  const { 
    data: clientEngagementData, 
    loading: clientEngagementLoading, 
    error: clientEngagementError 
  } = useClientEngagementAnalytics({
    organizationId
  })

  const metricOptions = [
    { value: 'performance', label: 'Performance Analytics' },
    { value: 'productivity', label: 'Productivity Metrics' },
    { value: 'time-tracking', label: 'Time Tracking Analytics' },
    { value: 'compliance', label: 'Compliance Metrics' },
    { value: 'client-engagement', label: 'Client Engagement Analytics' }
  ]

  const periodOptions = [
    { value: 'DAY', label: 'Daily' },
    { value: 'WEEK', label: 'Weekly' },
    { value: 'MONTH', label: 'Monthly' },
    { value: 'QUARTER', label: 'Quarterly' },
    { value: 'YEAR', label: 'Yearly' }
  ]

  const renderAnalyticsData = () => {
    if (analyticsLoading) return <div className="p-4">Loading analytics...</div>
    if (analyticsError) return <div className="p-4 text-red-600">Error: {analyticsError.message}</div>
    if (!analyticsData) return <div className="p-4">No analytics data available</div>

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Analytics Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Period:</strong> {analyticsData.period}</p>
            <p><strong>Trend:</strong> {analyticsData.trend}</p>
            <p><strong>Trend Percentage:</strong> {analyticsData.trendPercentage}%</p>
          </div>
          <div>
            <p><strong>Data Points:</strong> {analyticsData.data?.length || 0}</p>
            {analyticsData.comparison && (
              <p><strong>Comparison:</strong> {analyticsData.comparison.change}% vs {analyticsData.comparison.period}</p>
            )}
          </div>
        </div>
        
        {analyticsData.data && analyticsData.data.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Recent Data Points:</h4>
            <div className="space-y-2">
              {analyticsData.data.slice(0, 5).map((point: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>{point.date}</span>
                  <span className="font-medium">{point.value}</span>
                  {point.label && <span className="text-sm text-gray-600">{point.label}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderKPIs = () => {
    if (kpisLoading) return <div className="p-4">Loading KPIs...</div>
    if (kpisError) return <div className="p-4 text-red-600">Error: {kpisError.message}</div>
    if (!kpisData || kpisData.length === 0) return <div className="p-4">No KPI data available</div>

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpisData.map((kpi: any) => (
            <div key={kpi.id} className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-gray-600">{kpi.name}</h4>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold">{kpi.value}{kpi.unit}</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  kpi.status === 'good' ? 'bg-green-100 text-green-800' :
                  kpi.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {kpi.status}
                </span>
              </div>
              {kpi.target && (
                <p className="text-sm text-gray-600 mt-1">Target: {kpi.target}{kpi.unit}</p>
              )}
              <div className="flex items-center mt-2">
                <span className={`text-sm ${
                  kpi.trend === 'UP' ? 'text-green-600' :
                  kpi.trend === 'DOWN' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {kpi.trend === 'UP' ? '↗' : kpi.trend === 'DOWN' ? '↘' : '→'} {kpi.trendPercentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderMetrics = () => {
    if (metricsLoading) return <div className="p-4">Loading metrics...</div>
    if (metricsError) return <div className="p-4 text-red-600">Error: {metricsError.message}</div>
    if (!metricsData || metricsData.length === 0) return <div className="p-4">No metrics data available</div>

    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-4">Metrics</h3>
        <div className="space-y-3">
          {metricsData.map((metric: any) => (
            <div key={metric.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <h4 className="font-medium">{metric.name}</h4>
                <p className="text-sm text-gray-600">{new Date(metric.timestamp).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold">{metric.value}</span>
                {metric.metadata?.type && (
                  <p className="text-sm text-gray-600">{metric.metadata.type}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSpecificAnalytics = () => {
    switch (selectedMetric) {
      case 'performance':
        if (performanceLoading) return <div className="p-4">Loading performance data...</div>
        if (performanceError) return <div className="p-4 text-red-600">Error: {performanceError.message}</div>
        if (!performanceData) return <div className="p-4">No performance data available</div>
        
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Performance Analytics</h3>
            {performanceData.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{performanceData.summary.totalTasks}</div>
                  <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{performanceData.summary.completedTasks}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{performanceData.summary.averageCompletionTime}h</div>
                  <div className="text-sm text-gray-600">Avg Completion</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-600">{performanceData.summary.productivityScore}</div>
                  <div className="text-sm text-gray-600">Productivity Score</div>
                </div>
              </div>
            )}
          </div>
        )

      case 'time-tracking':
        if (timeTrackingLoading) return <div className="p-4">Loading time tracking data...</div>
        if (timeTrackingError) return <div className="p-4 text-red-600">Error: {timeTrackingError.message}</div>
        if (!timeTrackingData) return <div className="p-4">No time tracking data available</div>
        
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Time Tracking Analytics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{timeTrackingData.totalHours.toFixed(1)}h</div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{timeTrackingData.billableHours.toFixed(1)}h</div>
                <div className="text-sm text-gray-600">Billable Hours</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">{timeTrackingData.utilizationRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Utilization</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{timeTrackingData.productivityScore}</div>
                <div className="text-sm text-gray-600">Productivity</div>
              </div>
            </div>
          </div>
        )

      case 'compliance':
        if (complianceLoading) return <div className="p-4">Loading compliance data...</div>
        if (complianceError) return <div className="p-4 text-red-600">Error: {complianceError.message}</div>
        if (!complianceData) return <div className="p-4">No compliance data available</div>
        
        return (
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Compliance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{complianceData.complianceScore}%</div>
                <div className="text-sm text-gray-600">Compliance Score</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{complianceData.pendingCompliance}</div>
                <div className="text-sm text-gray-600">Pending Items</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">{complianceData.complianceDeadlines}</div>
                <div className="text-sm text-gray-600">Upcoming Deadlines</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <div className={`text-2xl font-bold ${
                  complianceData.riskLevel === 'LOW' ? 'text-green-600' :
                  complianceData.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                  complianceData.riskLevel === 'HIGH' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {complianceData.riskLevel}
                </div>
                <div className="text-sm text-gray-600">Risk Level</div>
              </div>
            </div>
          </div>
        )

      default:
        return renderAnalyticsData()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">GraphQL Analytics Interface Demo</h2>
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metric Type
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {metricOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={refetchAnalytics}
              disabled={analyticsLoading}
              className="px-4 py-2"
            >
              {analyticsLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        {/* Analytics Data */}
        {renderSpecificAnalytics()}
      </Card>

      {/* KPIs Section */}
      <Card>
        {renderKPIs()}
      </Card>

      {/* Metrics Section */}
      <Card>
        {renderMetrics()}
      </Card>
    </div>
  )
}