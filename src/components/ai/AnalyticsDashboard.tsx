'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface DashboardMetric {
  metric: string
  value: number
  trend: 'UP' | 'DOWN' | 'STABLE'
  variance: number
  benchmark: number
  significance: number
}

interface AIInsight {
  type: 'PATTERN' | 'ANOMALY' | 'PREDICTION' | 'OPTIMIZATION'
  title: string
  description: string
  confidence: number
  actionable: boolean
}

interface Recommendation {
  type: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM'
  priority: number
  title: string
  description: string
  expectedImpact: string
  effort: 'LOW' | 'MEDIUM' | 'HIGH'
  roi: number
}

interface DashboardData {
  analytics: DashboardMetric[]
  insights: AIInsight[]
  recommendations: Recommendation[]
  processingTime: number
}

interface MetricCardProps {
  metric: DashboardMetric
}

function MetricCard({ metric }: MetricCardProps) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'UP': return 'text-green-600'
      case 'DOWN': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return '↗️'
      case 'DOWN': return '↘️'
      default: return '➡️'
    }
  }

  const formatMetricName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getMetricIcon = (name: string) => {
    if (name.includes('task')) return '📋'
    if (name.includes('revenue') || name.includes('profit')) return '💰'
    if (name.includes('client')) return '👥'
    if (name.includes('compliance')) return '📊'
    if (name.includes('efficiency') || name.includes('utilization')) return '⚡'
    if (name.includes('satisfaction')) return '😊'
    return '📈'
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getMetricIcon(metric.metric)}</span>
          <div>
            <h3 className="text-sm font-medium text-gray-600">
              {formatMetricName(metric.metric)}
            </h3>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {metric.value.toLocaleString()}
              </span>
              <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                {getTrendIcon(metric.trend)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">vs Benchmark</div>
          <div className={`text-sm font-semibold ${
            metric.value > metric.benchmark ? 'text-green-600' : 'text-red-600'
          }`}>
            {metric.value > metric.benchmark ? '+' : ''}{((metric.value - metric.benchmark) / metric.benchmark * 100).toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Variance: ±{metric.variance}</span>
          <span>Confidence: {(metric.significance * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

interface InsightCardProps {
  insight: AIInsight
}

function InsightCard({ insight }: InsightCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PATTERN': return '🔍'
      case 'ANOMALY': return '⚠️'
      case 'PREDICTION': return '🔮'
      case 'OPTIMIZATION': return '⚡'
      default: return '💡'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PATTERN': return 'bg-blue-50 border-blue-200'
      case 'ANOMALY': return 'bg-red-50 border-red-200'
      case 'PREDICTION': return 'bg-purple-50 border-purple-200'
      case 'OPTIMIZATION': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`rounded-lg p-4 border ${getTypeColor(insight.type)}`}>
      <div className="flex items-start space-x-3">
        <span className="text-lg">{getTypeIcon(insight.type)}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{insight.title}</h4>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-1 bg-white rounded-full border">
                {insight.type}
              </span>
              {insight.actionable && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Actionable
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Confidence: {(insight.confidence * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface RecommendationCardProps {
  recommendation: Recommendation
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-50 border-red-200 text-red-800'
    if (priority <= 3) return 'bg-orange-50 border-orange-200 text-orange-800'
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const getEffortIcon = (effort: string) => {
    switch (effort) {
      case 'LOW': return '🟢'
      case 'MEDIUM': return '🟡'
      case 'HIGH': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <div className={`rounded-lg p-4 border ${getPriorityColor(recommendation.priority)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">#{recommendation.priority}</span>
          <h4 className="font-semibold">{recommendation.title}</h4>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs px-2 py-1 bg-white rounded-full border">
            {recommendation.type}
          </span>
          <span className="text-sm">ROI: {recommendation.roi}x</span>
        </div>
      </div>
      
      <p className="text-sm mb-3">{recommendation.description}</p>
      
      <div className="flex justify-between items-center">
        <div className="text-xs">
          <span className="font-medium">Impact:</span> {recommendation.expectedImpact}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs">Effort:</span>
          <span className="text-sm">{getEffortIcon(recommendation.effort)} {recommendation.effort}</span>
        </div>
      </div>
    </div>
  )
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedView, setSelectedView] = useState<'ANALYTICS' | 'HYBRID'>('ANALYTICS')

  const loadDashboardData = async (type: 'ANALYTICS' | 'HYBRID' = 'ANALYTICS') => {
    setLoading(true)
    try {
      const requestData = type === 'ANALYTICS' ? {
        type: 'ANALYTICS',
        data: {
          period: 'MONTHLY',
          organizationId: 'demo-org',
          metrics: {
            revenue: 605000,
            expenses: 375000,
            clients: 42,
            tasks_completed: 156,
            team_utilization: 82.5
          }
        },
        userId: 'dashboard-user',
        context: {
          userRole: 'MANAGER',
          businessContext: 'dashboard_analytics'
        }
      } : {
        type: 'HYBRID',
        data: {
          document: `MANAGEMENT DASHBOARD REPORT - Q3 2024
          
Performance Summary:
- Revenue increased by 25% to ₹605,000
- Team productivity up 15% with 156 tasks completed
- Client satisfaction score: 4.3/5.0
- 3 new clients acquired, 1 client churned
- Compliance score: 88.5% (improved from 85.2%)

Areas of Concern:
- Overdue tasks increased to 12 items
- Project delivery delays in 2 major accounts
- Team utilization below target at 82.5%

Opportunities:
- Pipeline shows ₹2.1M in potential revenue for Q4
- 5 qualified leads from referrals
- Automation implementation could save 15 hours/week`,
          message: 'Analyze our Q3 performance and provide strategic recommendations for Q4 planning',
          metrics: {
            revenue: 605000,
            expenses: 375000,
            profit_margin: 38.0,
            client_satisfaction: 4.3,
            team_utilization: 82.5,
            compliance_score: 88.5,
            tasks_completed: 156,
            overdue_tasks: 12,
            new_clients: 3,
            churned_clients: 1
          }
        },
        userId: 'executive-user',
        context: {
          userRole: 'PARTNER',
          businessContext: 'executive_dashboard'
        }
      }

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      
      if (result.success) {
        setData({
          analytics: result.data.analytics || [],
          insights: result.data.insights || [],
          recommendations: result.data.recommendations || [],
          processingTime: result.data.processingTime || 0
        })
        setSelectedView(type)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI-Powered Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">Real-time insights and intelligent recommendations for your CA firm</p>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => loadDashboardData('ANALYTICS')}
                variant={selectedView === 'ANALYTICS' ? 'default' : 'outline'}
                disabled={loading}
                className="min-w-[120px]"
              >
                📊 Analytics View
              </Button>
              <Button
                onClick={() => loadDashboardData('HYBRID')}
                variant={selectedView === 'HYBRID' ? 'default' : 'outline'}
                disabled={loading}
                className="min-w-[120px]"
              >
                🚀 AI + Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating AI-powered insights...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {data && !loading && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <div className="text-sm opacity-80">Analytics Points</div>
                    <div className="text-2xl font-bold">{data.analytics.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="text-sm opacity-80">AI Insights</div>
                    <div className="text-2xl font-bold">{data.insights.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <div className="text-sm opacity-80">Recommendations</div>
                    <div className="text-2xl font-bold">{data.recommendations.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="text-sm opacity-80">Processing Time</div>
                    <div className="text-2xl font-bold">{data.processingTime}ms</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            {data.analytics.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Key Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.analytics.map((metric, index) => (
                    <MetricCard key={index} metric={metric} />
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {data.insights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">🧠 AI-Generated Insights</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.insights.map((insight, index) => (
                    <InsightCard key={index} insight={insight} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">💡 Strategic Recommendations</h2>
                <div className="space-y-4">
                  {data.recommendations.map((rec, index) => (
                    <RecommendationCard key={index} recommendation={rec} />
                  ))}
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <div className="text-center">
              <Button
                onClick={() => loadDashboardData(selectedView)}
                disabled={loading}
                variant="outline"
                className="min-w-[200px]"
              >
                🔄 Refresh Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}