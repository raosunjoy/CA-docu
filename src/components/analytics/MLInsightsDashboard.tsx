import React, { useState, useEffect } from 'react'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { PredictiveComplianceWidget } from './PredictiveComplianceWidget'
import { RevenueForecastWidget } from './RevenueForecastWidget'
import { ClientRiskAssessmentWidget } from './ClientRiskAssessmentWidget'
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Target,
  Settings,
  RefreshCw,
  Filter,
  Download,
  Maximize2,
  Grid3X3,
  LayoutGrid,
  Clock,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react'

interface DashboardWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  props?: any
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
  enabled: boolean
}

interface AnalyticsFilter {
  clientId?: string
  timeRange: '3m' | '6m' | '12m'
  analysisTypes: string[]
  refreshInterval: number
}

interface MLInsightsDashboardProps {
  className?: string
  clientId?: string
  customizable?: boolean
}

export const MLInsightsDashboard: React.FC<MLInsightsDashboardProps> = ({
  className = '',
  clientId,
  customizable = true
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'compliance',
      title: 'Predictive Compliance',
      component: PredictiveComplianceWidget,
      props: { clientId },
      size: 'large',
      position: { x: 0, y: 0 },
      enabled: true
    },
    {
      id: 'revenue',
      title: 'Revenue Forecast',
      component: RevenueForecastWidget,
      props: {},
      size: 'large',
      position: { x: 1, y: 0 },
      enabled: true
    },
    {
      id: 'risk',
      title: 'Client Risk Assessment',
      component: ClientRiskAssessmentWidget,
      props: { clientId },
      size: 'large',
      position: { x: 0, y: 1 },
      enabled: true
    }
  ])

  const [filters, setFilters] = useState<AnalyticsFilter>({
    clientId,
    timeRange: '6m',
    analysisTypes: ['compliance', 'revenue', 'risk'],
    refreshInterval: 300000 // 5 minutes
  })

  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [dragMode, setDragMode] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [dashboardStats, setDashboardStats] = useState({
    totalInsights: 0,
    highRiskAlerts: 0,
    accuracyScore: 0,
    lastUpdate: new Date()
  })

  useEffect(() => {
    // Set up auto-refresh
    const interval = setInterval(() => {
      refreshDashboard()
    }, filters.refreshInterval)

    return () => clearInterval(interval)
  }, [filters.refreshInterval])

  useEffect(() => {
    fetchDashboardStats()
  }, [filters])

  const fetchDashboardStats = async () => {
    try {
      const params = new URLSearchParams({
        analysisType: 'all',
        ...(filters.clientId && { clientId: filters.clientId })
      })

      const response = await fetch(`/api/analytics/ml-insights?${params}`)
      if (!response.ok) return

      const result = await response.json()
      
      if (result.success) {
        setDashboardStats({
          totalInsights: result.data.performance?.dataPoints || 0,
          highRiskAlerts: result.data.performance?.recommendations?.length || 0,
          accuracyScore: result.data.performance?.confidenceScore || 0,
          lastUpdate: new Date(result.data.metadata?.generatedAt || Date.now())
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }

  const refreshDashboard = async () => {
    setLoading(true)
    try {
      // Trigger refresh for all widgets
      await fetchDashboardStats()
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Dashboard refresh failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, enabled: !widget.enabled }
        : widget
    ))
  }

  const updateWidgetPosition = (widgetId: string, position: { x: number; y: number }) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, position }
        : widget
    ))
  }

  const exportDashboard = () => {
    // Implementation for dashboard export
    const dashboardData = {
      widgets: widgets.filter(w => w.enabled),
      filters,
      stats: dashboardStats,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ml-insights-dashboard-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getGridClass = (size: string) => {
    switch (size) {
      case 'small': return 'col-span-1 row-span-1'
      case 'medium': return 'col-span-2 row-span-1'
      case 'large': return 'col-span-2 row-span-2'
      default: return 'col-span-1 row-span-1'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            ML Insights Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Advanced analytics and predictive insights powered by machine learning
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Dashboard Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              <span>{dashboardStats.totalInsights} insights</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              <span>{dashboardStats.highRiskAlerts} alerts</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{Math.round(dashboardStats.accuracyScore * 100)}% accuracy</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            
            <button
              onClick={refreshDashboard}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={exportDashboard}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
            
            {customizable && (
              <button
                onClick={() => setDragMode(!dragMode)}
                className={`p-2 rounded-lg transition-colors ${
                  dragMode 
                    ? 'text-blue-600 bg-blue-100' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Customize Layout"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4 bg-gray-50 border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  timeRange: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="12m">Last 12 months</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Filter
              </label>
              <input
                type="text"
                placeholder="Client ID (optional)"
                value={filters.clientId || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  clientId: e.target.value || undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refresh Interval
              </label>
              <select
                value={filters.refreshInterval}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  refreshInterval: parseInt(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={600000}>10 minutes</option>
                <option value={1800000}>30 minutes</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Types
              </label>
              <div className="space-y-1">
                {['compliance', 'revenue', 'risk'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.analysisTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({
                            ...prev,
                            analysisTypes: [...prev.analysisTypes, type]
                          }))
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            analysisTypes: prev.analysisTypes.filter(t => t !== type)
                          }))
                        }
                      }}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Widget Customization Panel */}
      {dragMode && customizable && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-blue-900">Customize Dashboard</h3>
            <button
              onClick={() => setDragMode(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              Done
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {widgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  widget.enabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {widget.title}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-fr">
        {widgets
          .filter(widget => widget.enabled && filters.analysisTypes.includes(widget.id))
          .map(widget => {
            const WidgetComponent = widget.component
            return (
              <div
                key={widget.id}
                className={`${getGridClass(widget.size)} ${
                  dragMode ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
                }`}
              >
                <WidgetComponent
                  {...widget.props}
                  clientId={filters.clientId || widget.props?.clientId}
                  className="h-full"
                />
              </div>
            )
          })}
      </div>

      {/* Empty State */}
      {widgets.filter(w => w.enabled && filters.analysisTypes.includes(w.id)).length === 0 && (
        <Card className="p-12 text-center">
          <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Widgets Enabled</h3>
          <p className="text-gray-600 mb-4">
            Enable some analysis types in the filters to see ML insights
          </p>
          <button
            onClick={() => setShowFilters(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Configure Filters
          </button>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            System operational
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">
            ML Engine v2.1.0
          </Badge>
          <Badge className="bg-green-100 text-green-800">
            Real-time
          </Badge>
        </div>
      </div>
    </div>
  )
}