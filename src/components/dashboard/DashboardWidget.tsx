'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../common/Card'
import { Button } from '../common/Button'
import type { DashboardWidgetConfig, UserRole } from '../../types'

interface DashboardWidgetProps {
  config: DashboardWidgetConfig
  userRole: UserRole
  onEdit?: (config: DashboardWidgetConfig) => void
  onRemove?: (widgetId: string) => void
  onRefresh?: (widgetId: string) => void
  isEditing?: boolean
  className?: string
  organizationId?: string
  userId?: string
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  config,
  userRole,
  onEdit,
  onRemove,
  onRefresh,
  isEditing = false,
  className = '',
  organizationId,
  userId
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Check if user has permission to view this widget
  const hasPermission = config.permissions.length === 0 || config.permissions.includes(userRole)

  // Auto-refresh functionality
  useEffect(() => {
    if (!config.refreshInterval || !hasPermission) return

    const interval = setInterval(() => {
      handleRefresh()
    }, config.refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [config.refreshInterval, hasPermission])

  const handleRefresh = async () => {
    if (!onRefresh) return

    setIsLoading(true)
    setError(null)
    
    try {
      await onRefresh(config.id)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh widget')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(config)
    }
  }

  const handleRemove = () => {
    if (onRemove && window.confirm('Are you sure you want to remove this widget?')) {
      onRemove(config.id)
    }
  }

  if (!hasPermission) {
    return null
  }

  return (
    <Card className={`dashboard-widget ${className} ${isEditing ? 'editing' : ''}`}>
      <div className="widget-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
        
        <div className="widget-actions flex items-center space-x-2">
          {config.refreshInterval && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-1"
              title="Refresh"
            >
              <svg 
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </Button>
          )}
          
          {isEditing && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="p-1"
              title="Edit Widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                />
              </svg>
            </Button>
          )}
          
          {isEditing && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="p-1 text-red-600 hover:text-red-700"
              title="Remove Widget"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      <div className="widget-content">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
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

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!isLoading && !error && (
          <WidgetContent config={config} organizationId={organizationId} userId={userId} />
        )}
      </div>

      {config.refreshInterval && (
        <div className="widget-footer mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  )
}

// Widget content renderer based on widget type
const WidgetContent: React.FC<{ 
  config: DashboardWidgetConfig
  organizationId?: string
  userId?: string 
}> = ({ config, organizationId, userId }) => {
  switch (config.type) {
    case 'task-overview':
      return <TaskOverviewWidget config={config} organizationId={organizationId} userId={userId} />
    case 'task-board':
      return <TaskBoardWidget config={config} />
    case 'compliance-status':
      return <ComplianceStatusWidget config={config} organizationId={organizationId} userId={userId} />
    case 'team-performance':
      return <TeamPerformanceWidget config={config} organizationId={organizationId} userId={userId} />
    case 'workload-analytics':
      return <WorkloadAnalyticsWidget config={config} organizationId={organizationId} userId={userId} />
    case 'time-tracking':
      return <TimeTrackingWidget config={config} />
    case 'document-stats':
      return <DocumentStatsWidget config={config} />
    case 'email-stats':
      return <EmailStatsWidget config={config} />
    case 'productivity-metrics':
      return <ProductivityMetricsWidget config={config} />
    case 'client-engagement':
      return <ClientEngagementWidget config={config} />
    case 'learning-progress':
      return <LearningProgressWidget config={config} />
    case 'deadlines':
      return <DeadlinesWidget config={config} />
    case 'notifications':
      return <NotificationsWidget config={config} />
    case 'quick-actions':
      return <QuickActionsWidget config={config} />
    case 'analytics-chart':
      return <AnalyticsChartWidget config={config} />
    case 'kpi-card':
      return <KPICardWidget config={config} />
    case 'activity-feed':
      return <ActivityFeedWidget config={config} />
    default:
      return (
        <div className="text-center py-8 text-gray-500">
          <p>Unknown widget type: {config.type}</p>
        </div>
      )
  }
}

// Import actual widget implementations
import { TaskOverviewWidget } from './widgets/TaskOverviewWidget'
import { ComplianceStatusWidget } from './widgets/ComplianceStatusWidget'
import { TeamPerformanceWidget } from './widgets/TeamPerformanceWidget'
import { WorkloadAnalyticsWidget } from './widgets/WorkloadAnalyticsWidget'

// Placeholder widget components - these will be implemented in separate files
const TaskBoardWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Task Board Widget</div>
)

const TimeTrackingWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Time Tracking Widget</div>
)

const DocumentStatsWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Document Stats Widget</div>
)

const EmailStatsWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Email Stats Widget</div>
)

const ProductivityMetricsWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Productivity Metrics Widget</div>
)

const ClientEngagementWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Client Engagement Widget</div>
)

const LearningProgressWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Learning Progress Widget</div>
)

const DeadlinesWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Deadlines Widget</div>
)

const NotificationsWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Notifications Widget</div>
)

const QuickActionsWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Quick Actions Widget</div>
)

const AnalyticsChartWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Analytics Chart Widget</div>
)

const KPICardWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">KPI Card Widget</div>
)

const ActivityFeedWidget: React.FC<{ config: DashboardWidgetConfig }> = ({ config }) => (
  <div className="text-center py-4">Activity Feed Widget</div>
)