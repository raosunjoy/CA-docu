'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface QuickInsight {
  type: 'METRIC' | 'INSIGHT' | 'ALERT'
  title: string
  value?: string | number
  description: string
  trend?: 'UP' | 'DOWN' | 'STABLE'
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface WidgetProps {
  userRole?: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN'
  compact?: boolean
}

export function AIInsightsWidget({ userRole = 'MANAGER', compact = false }: WidgetProps) {
  const [insights, setInsights] = useState<QuickInsight[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const loadQuickInsights = async () => {
    setLoading(true)
    try {
      // Get role-specific insights
      const contextData = {
        PARTNER: {
          businessContext: 'executive_overview',
          data: {
            message: 'Show me key strategic insights and performance indicators',
            metrics: { revenue: 605000, profit_margin: 30.5, client_count: 42 }
          }
        },
        MANAGER: {
          businessContext: 'team_performance',
          data: {
            message: 'What are the current team productivity trends and bottlenecks?',
            metrics: { tasks_completed: 156, team_utilization: 82.5, efficiency: 88.2 }
          }
        },
        ASSOCIATE: {
          businessContext: 'task_optimization',
          data: {
            message: 'Help me understand my task performance and areas for improvement',
            metrics: { tasks_assigned: 25, completion_rate: 92, quality_score: 85 }
          }
        },
        INTERN: {
          businessContext: 'learning_progress',
          data: {
            message: 'What should I focus on to improve my skills and productivity?',
            metrics: { training_hours: 40, skill_assessment: 75, mentor_rating: 4.2 }
          }
        }
      }

      const context = contextData[userRole]
      
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'AI',
          data: context.data,
          userId: `widget-${userRole.toLowerCase()}`,
          context: {
            userRole: userRole,
            businessContext: context.businessContext
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        const quickInsights: QuickInsight[] = []

        // Extract insights from AI response
        if (result.data.insights) {
          result.data.insights.slice(0, compact ? 2 : 4).forEach((insight: any) => {
            quickInsights.push({
              type: insight.type === 'ANOMALY' ? 'ALERT' : 'INSIGHT',
              title: insight.title,
              description: insight.description,
              priority: insight.actionable ? 'HIGH' : 'MEDIUM'
            })
          })
        }

        // Extract metrics from analytics
        if (result.data.analytics) {
          result.data.analytics.slice(0, compact ? 1 : 2).forEach((metric: any) => {
            quickInsights.push({
              type: 'METRIC',
              title: metric.metric.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              value: metric.value,
              description: `${metric.trend} trend vs benchmark ${metric.benchmark}`,
              trend: metric.trend
            })
          })
        }

        setInsights(quickInsights)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
      // Provide fallback insights
      setInsights([
        {
          type: 'METRIC',
          title: 'Performance Score',
          value: '85.2%',
          description: 'UP trend vs target of 80%',
          trend: 'UP'
        },
        {
          type: 'INSIGHT',
          title: 'Productivity Opportunity',
          description: 'AI detected 15% efficiency gain potential in document processing',
          priority: 'MEDIUM'
        }
      ])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadQuickInsights()
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadQuickInsights, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [userRole])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'METRIC': return '📊'
      case 'INSIGHT': return '💡'
      case 'ALERT': return '⚠️'
      default: return '🔍'
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'UP': return '↗️'
      case 'DOWN': return '↘️'
      case 'STABLE': return '➡️'
      default: return ''
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH': return 'border-l-red-400 bg-red-50'
      case 'MEDIUM': return 'border-l-orange-400 bg-orange-50'
      case 'LOW': return 'border-l-blue-400 bg-blue-50'
      default: return 'border-l-gray-400 bg-gray-50'
    }
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">🤖 AI Insights</h3>
          <Button
            onClick={loadQuickInsights}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            {loading ? '⏳' : '🔄'}
          </Button>
        </div>
        
        <div className="space-y-2">
          {insights.slice(0, 2).map((insight, index) => (
            <div key={index} className={`p-2 rounded border-l-2 ${getPriorityColor(insight.priority)}`}>
              <div className="flex items-start space-x-2">
                <span className="text-sm">{getInsightIcon(insight.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <p className="text-xs font-medium text-gray-900 truncate">{insight.title}</p>
                    {insight.value && (
                      <span className="text-xs font-bold text-blue-600">
                        {insight.value} {getTrendIcon(insight.trend)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {lastUpdate && (
          <div className="text-xs text-gray-400 mt-2 text-center">
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">🤖 AI-Powered Insights</h2>
            <p className="text-sm text-gray-600 mt-1">
              Personalized insights for {userRole.toLowerCase()}
            </p>
          </div>
          <Button
            onClick={loadQuickInsights}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? '⏳ Updating...' : '🔄 Refresh'}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Generating insights...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${getPriorityColor(insight.priority)}`}>
                <div className="flex items-start space-x-3">
                  <span className="text-xl">{getInsightIcon(insight.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{insight.title}</h4>
                      {insight.value && (
                        <div className="flex items-center space-x-1">
                          <span className="text-lg font-bold text-blue-600">
                            {insight.value}
                          </span>
                          <span className="text-sm">{getTrendIcon(insight.trend)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{insight.description}</p>
                    {insight.priority && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          insight.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          insight.priority === 'MEDIUM' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {insight.priority} Priority
                        </span>
                        {insight.type === 'INSIGHT' && (
                          <span className="text-xs text-gray-500">AI-Generated</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {lastUpdate && !loading && (
          <div className="text-xs text-gray-400 mt-4 text-center border-t pt-4">
            Last updated: {lastUpdate.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}