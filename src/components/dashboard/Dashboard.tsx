'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PartnerDashboard } from './widgets/PartnerDashboard'
import { ManagerDashboard } from './widgets/ManagerDashboard'
import { AssociateDashboard } from './widgets/AssociateDashboard'
import { InternDashboard } from './widgets/InternDashboard'
import { ProactiveAIAssistant } from '@/components/ai/ProactiveAIAssistant'
import { UnifiedSystemStatus } from './UnifiedSystemStatus'
import { DashboardFilters } from './DashboardFilters'
import { ResponsiveDashboardGrid } from './ResponsiveDashboardGrid'
import { WorkloadAnalyticsWidget } from './widgets/WorkloadAnalyticsWidget'
import { TeamPerformanceWidget } from './widgets/TeamPerformanceWidget'
import { ComplianceStatusWidget } from './widgets/ComplianceStatusWidget'
import { TaskOverviewWidget } from './widgets/TaskOverviewWidget'
import { useDashboardPreferences, useWidgetManagement, useThemePreferences } from '@/hooks/useDashboardPreferences'
import { useRealtimeAnalytics } from '@/hooks/useRealtimeAnalytics'
import { dashboardApi, handleApiError } from '@/lib/dashboard-api-client'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Settings, Moon, Sun, Monitor } from 'lucide-react'

const getRoleDashboard = (role: string, organizationId: string, userId: string) => {
  switch (role) {
    case 'PARTNER':
      return <PartnerDashboard organizationId={organizationId} userId={userId} />
    case 'MANAGER':
      return <ManagerDashboard organizationId={organizationId} userId={userId} />
    case 'ASSOCIATE':
      return <AssociateDashboard organizationId={organizationId} userId={userId} />
    case 'INTERN':
      return <InternDashboard organizationId={organizationId} userId={userId} />
    default:
      return <AssociateDashboard organizationId={organizationId} userId={userId} />
  }
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'system'>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  if (!user) {
    return null
  }

  // Use organizationId from user or default for demo
  const organizationId = user.organizationId || 'demo-org'

  // Dashboard preferences
  const { preferences, updatePreferences, loading: prefsLoading } = useDashboardPreferences(user.id)
  const { updateWidgetOrder, getVisibleWidgets } = useWidgetManagement(preferences, updatePreferences)
  const { currentTheme, setTheme, themePreference } = useThemePreferences(preferences, updatePreferences)

  // Available widgets for the grid system
  const availableWidgets = [
    {
      id: 'workload-analytics',
      title: 'Workload Analytics',
      component: WorkloadAnalyticsWidget,
      defaultSize: 'large' as const,
      description: 'Monitor team workload and resource utilization'
    },
    {
      id: 'team-performance',
      title: 'Team Performance',
      component: TeamPerformanceWidget,
      defaultSize: 'large' as const,
      description: 'Track team productivity and performance metrics'
    },
    {
      id: 'compliance-status',
      title: 'Compliance Status',
      component: ComplianceStatusWidget,
      defaultSize: 'medium' as const,
      description: 'Monitor compliance scores and deadlines'
    },
    {
      id: 'task-overview',
      title: 'Task Overview',
      component: TaskOverviewWidget,
      defaultSize: 'medium' as const,
      description: 'Overview of tasks by status and priority'
    }
  ]

  // Initialize default widgets if none exist
  useEffect(() => {
    if (!prefsLoading && preferences.widgets.length === 0) {
      const defaultWidgets = availableWidgets.map((widget, index) => ({
        id: `${widget.id}-default`,
        title: widget.title,
        component: widget.component,
        size: widget.defaultSize,
        position: { x: index % 2, y: Math.floor(index / 2) },
        props: { organizationId, userId: user.id },
        visible: true
      }))
      updatePreferences({ widgets: defaultWidgets })
    }
  }, [prefsLoading, preferences.widgets.length])

  // Real-time analytics integration
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError,
    lastUpdated,
    isConnected,
    refresh: refreshAnalytics,
    exportData
  } = useRealtimeAnalytics({
    organizationId,
    userId: user.id,
    dateRange,
    refreshInterval: preferences.refreshInterval * 1000
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshAnalytics()
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleExport = async () => {
    try {
      await exportData('excel')
    } catch (error) {
      console.error('Export failed:', error)
      // Could show a toast notification here
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${currentTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-sm border-b transition-colors duration-200 ${currentTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-purple rounded-lg flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">Z</span>
              </div>
              <h1 className={`text-xl font-semibold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Zetra
              </h1>
              <Badge variant="success" size="sm" className="ml-3">Enhanced Dashboard</Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 rounded-md transition-colors ${
                    themePreference === 'light' 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 rounded-md transition-colors ${
                    themePreference === 'dark' 
                      ? 'bg-gray-800 shadow-sm text-white' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('auto')}
                  className={`p-1.5 rounded-md transition-colors ${
                    themePreference === 'auto' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
              </div>

              <Badge variant="primary">{user.role}</Badge>
              <span className={`text-sm ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {user.firstName} {user.lastName}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className={`flex space-x-8 border-b ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : `border-transparent ${currentTheme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
            }`}
          >
            Enhanced Dashboard
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'system'
                ? 'border-purple-500 text-purple-600'
                : `border-transparent ${currentTheme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} hover:border-gray-300`
            }`}
          >
            System Status
          </button>
        </div>
      </div>

      {/* Dashboard Filters */}
      {activeTab === 'overview' && (
        <DashboardFilters
          onDateRangeChange={setDateRange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          loading={refreshing}
          className="max-w-7xl mx-auto"
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h2 className={`text-2xl font-bold mb-2 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Welcome back, {user.firstName}!
              </h2>
              <p className={`${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Your personalized dashboard with interactive analytics and real-time insights.
              </p>
              <div className={`mt-4 p-4 rounded-lg border transition-colors ${
                currentTheme === 'dark' 
                  ? 'bg-green-900/20 border-green-800 text-green-300' 
                  : 'bg-green-50 border-green-200 text-green-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                      isConnected ? 'bg-green-400' : 'bg-yellow-400'
                    }`}>
                      <span className="text-white text-xs">
                        {isConnected ? '✓' : '⚡'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isConnected ? 'Real-time Dashboard Active' : 'Dashboard Loading...'}
                      </p>
                      <p className="text-xs opacity-80">
                        Interactive charts • Responsive design • Live updates • Claude's APIs integrated
                      </p>
                    </div>
                  </div>
                  {lastUpdated && (
                    <div className="text-xs opacity-70">
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics Error Display */}
              {analyticsError && (
                <div className={`mt-4 p-4 rounded-lg border transition-colors ${
                  currentTheme === 'dark' 
                    ? 'bg-red-900/20 border-red-800 text-red-300' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-red-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Analytics Connection Error</p>
                      <p className="text-xs opacity-80">{handleApiError({ code: 'API_ERROR', message: analyticsError })}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Dashboard Content */}
              <div className="lg:col-span-3">
                {!prefsLoading && (
                  <ResponsiveDashboardGrid
                    widgets={getVisibleWidgets().map(widget => ({
                      ...widget,
                      props: { 
                        ...widget.props, 
                        organizationId, 
                        userId: user.id, 
                        dateRange,
                        analyticsData: analyticsData?.[widget.id.split('-')[0]] || null,
                        loading: analyticsLoading,
                        error: analyticsError
                      }
                    }))}
                    onWidgetUpdate={updateWidgetOrder}
                    availableWidgets={availableWidgets}
                    editable={true}
                  />
                )}
                
                {prefsLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-80 rounded-lg animate-pulse ${
                        currentTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                      }`}></div>
                    ))}
                  </div>
                )}

                {/* Legacy Role-based Dashboard (fallback) */}
                <div className="mt-8">
                  <details className="group">
                    <summary className={`cursor-pointer text-sm font-medium ${
                      currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    } hover:text-purple-600 transition-colors`}>
                      Show Legacy Role-based Dashboard
                    </summary>
                    <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                      {getRoleDashboard(user.role, organizationId, user.id)}
                    </div>
                  </details>
                </div>
              </div>

              {/* AI Assistant Sidebar */}
              <div className="lg:col-span-1">
                <div className={`sticky top-8 ${currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${
                  currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                } shadow-sm`}>
                  <ProactiveAIAssistant />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Unified System Status */
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className={`text-2xl font-bold mb-2 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Unified System Status
              </h2>
              <p className={`${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Real-time monitoring of the AI-Analytics platform infrastructure.
              </p>
            </div>
            <UnifiedSystemStatus />
          </div>
        )}

        {/* Quick Actions - Only show on overview tab */}
        {activeTab === 'overview' && (
          <div className="mt-8">
            <h3 className={`text-lg font-semibold mb-4 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card clickable className={`text-center transition-colors ${
                currentTheme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-md'
              }`}>
                <CardContent>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className={`font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tasks</h3>
                  <p className={`text-xs mt-1 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Manage your work</p>
                </CardContent>
              </Card>

              <Card clickable className={`text-center transition-colors ${
                currentTheme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-md'
              }`}>
                <CardContent>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className={`font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Documents</h3>
                  <p className={`text-xs mt-1 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>File management</p>
                </CardContent>
              </Card>

              <Card clickable className={`text-center transition-colors ${
                currentTheme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-md'
              }`}>
                <CardContent>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className={`font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Chat</h3>
                  <p className={`text-xs mt-1 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Team communication</p>
                </CardContent>
              </Card>

              <Card clickable className={`text-center transition-colors ${
                currentTheme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'hover:shadow-md'
              }`}>
                <CardContent>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className={`font-medium ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analytics</h3>
                  <p className={`text-xs mt-1 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>View insights</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}