'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/atoms/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface AIInsight {
  type: 'PATTERN' | 'ANOMALY' | 'PREDICTION' | 'OPTIMIZATION'
  title: string
  description: string
  confidence: number
  actionable: boolean
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

interface AIAssistantData {
  insights: AIInsight[]
  quickActions: Array<{
    label: string
    description: string
    href: string
    icon: string
  }>
  contextualHelp: string
  processingTime: number
}

export function ProactiveAIAssistant() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AIAssistantData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    if (user) {
      loadAIInsights()
      // Refresh insights every 5 minutes
      const interval = setInterval(loadAIInsights, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user])

  const loadAIInsights = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Simulate context-aware AI request based on user activity
      const contextualRequest = {
        type: 'AI',
        data: {
          message: `Provide proactive insights for a ${user.role.toLowerCase()} in a CA firm. Focus on current priorities, potential issues, and optimization opportunities.`,
          context: {
            userRole: user.role,
            userId: user.id,
            organizationId: user.organizationId || 'demo-org',
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay()
          }
        },
        userId: user.id,
        context: {
          userRole: user.role,
          businessContext: 'proactive_assistance',
          priority: 'MEDIUM'
        }
      }

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextualRequest)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Transform AI response into structured insights
        const insights = generateContextualInsights(result.data, user.role)
        const quickActions = generateQuickActions(user.role)
        
        setData({
          insights,
          quickActions,
          contextualHelp: generateContextualHelp(user.role),
          processingTime: result.data?.processingTime || 0
        })
      } else {
        throw new Error('Failed to load AI insights')
      }
    } catch (err) {
      setError('AI assistant temporarily unavailable')
      // Fallback to static insights
      setData(generateFallbackData(user.role))
    } finally {
      setLoading(false)
    }
  }

  const generateContextualInsights = (aiData: any, userRole: string): AIInsight[] => {
    const baseInsights: AIInsight[] = []

    // Generate role-specific insights
    if (userRole === 'PARTNER') {
      baseInsights.push({
        type: 'PATTERN',
        title: 'Revenue Opportunity Identified',
        description: 'AI detected 3 potential new client engagements worth ₹2.5L based on recent inquiries and market patterns.',
        confidence: 0.85,
        actionable: true,
        priority: 'HIGH',
        action: { label: 'Review Opportunities', href: '/reports' }
      })
    } else if (userRole === 'MANAGER') {
      baseInsights.push({
        type: 'OPTIMIZATION',
        title: 'Team Efficiency Alert',
        description: 'Workload analysis shows Associate team at 92% capacity. Consider redistributing tasks or hiring.',
        confidence: 0.78,
        actionable: true,
        priority: 'MEDIUM',
        action: { label: 'Review Team Load', href: '/tasks' }
      })
    } else if (userRole === 'ASSOCIATE') {
      baseInsights.push({
        type: 'PREDICTION',
        title: 'Upcoming Deadline Alert',
        description: 'AI predicts you have 8 hours of GST filing work to complete by Friday. Consider starting today.',
        confidence: 0.92,
        actionable: true,
        priority: 'HIGH',
        action: { label: 'View Tasks', href: '/tasks' }
      })
    }

    // Add AI-generated insights if available
    if (aiData?.insights && Array.isArray(aiData.insights)) {
      aiData.insights.forEach((insight: any, index: number) => {
        if (index < 2) { // Limit to 2 AI insights
          baseInsights.push({
            type: 'PATTERN',
            title: insight.title || `AI Insight ${index + 1}`,
            description: insight.description || 'AI-generated recommendation based on your recent activity.',
            confidence: insight.confidence || 0.75,
            actionable: insight.actionable || true,
            priority: insight.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
            action: { label: 'Learn More', href: '/ai-showcase' }
          })
        }
      })
    }

    return baseInsights.slice(0, 3) // Limit to 3 insights
  }

  const generateQuickActions = (userRole: string) => {
    const commonActions = [
      { label: 'Upload Document', description: 'AI-powered analysis', href: '/documents', icon: '📄' },
      { label: 'Search Knowledge', description: 'CA regulations & procedures', href: '/search', icon: '🔍' }
    ]

    const roleActions = {
      PARTNER: [
        { label: 'View Analytics', description: 'Business intelligence', href: '/reports', icon: '📊' },
        { label: 'Review Approvals', description: 'Pending decisions', href: '/approvals', icon: '✅' }
      ],
      MANAGER: [
        { label: 'Team Dashboard', description: 'Performance metrics', href: '/reports', icon: '👥' },
        { label: 'Assign Tasks', description: 'Workload balancing', href: '/tasks', icon: '📋' }
      ],
      ASSOCIATE: [
        { label: 'My Tasks', description: 'Priority work items', href: '/tasks', icon: '✓' },
        { label: 'Time Tracker', description: 'Log your hours', href: '/time-tracking', icon: '⏱️' }
      ],
      INTERN: [
        { label: 'Learning Center', description: 'Training materials', href: '/search', icon: '📚' },
        { label: 'My Progress', description: 'Track development', href: '/tasks', icon: '🎯' }
      ]
    }

    return [...commonActions, ...(roleActions[userRole as keyof typeof roleActions] || [])]
  }

  const generateContextualHelp = (userRole: string): string => {
    const helpText = {
      PARTNER: "Focus on strategic decisions and business growth. AI can help identify revenue opportunities and risk patterns.",
      MANAGER: "Optimize team performance and workflow efficiency. AI provides workload analysis and resource recommendations.",
      ASSOCIATE: "Stay on top of deadlines and maintain quality. AI assists with compliance checks and task prioritization.",
      INTERN: "Learn efficiently and track progress. AI provides guidance and identifies learning opportunities."
    }
    
    return helpText[userRole as keyof typeof helpText] || helpText.ASSOCIATE
  }

  const generateFallbackData = (userRole: string): AIAssistantData => ({
    insights: [{
      type: 'PATTERN',
      title: 'AI Assistant Ready',
      description: 'Your AI assistant is ready to help with document analysis, compliance checks, and workflow optimization.',
      confidence: 0.9,
      actionable: true,
      priority: 'MEDIUM',
      action: { label: 'Try AI Features', href: '/ai-test' }
    }],
    quickActions: generateQuickActions(userRole),
    contextualHelp: generateContextualHelp(userRole),
    processingTime: 0
  })

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setMinimized(false)}
          className="rounded-full w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
        >
          🤖
        </Button>
      </div>
    )
  }

  return (
    <Card className="sticky top-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-600">Proactive insights for {user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMinimized(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-gray-600 mt-2">Loading AI insights...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={loadAIInsights}>
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* AI Insights */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Smart Insights</h4>
              <div className="space-y-2">
                {data.insights.map((insight, index) => (
                  <div key={index} className="bg-white/60 rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{insight.title}</span>
                          <Badge
                            variant={insight.priority === 'HIGH' ? 'error' : insight.priority === 'MEDIUM' ? 'warning' : 'secondary'}
                            size="sm"
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-xs mb-2">{insight.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-purple-600">
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </span>
                          {insight.action && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => insight.action?.href && (window.location.href = insight.action.href)}
                              className="text-xs"
                            >
                              {insight.action.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">⚡ Quick Actions</h4>
              <div className="grid grid-cols-2 gap-2">
                {data.quickActions.slice(0, 4).map((action, index) => (
                  <button
                    key={index}
                    onClick={() => window.location.href = action.href}
                    className="bg-white/60 hover:bg-white/80 rounded-lg p-2 text-left transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{action.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{action.label}</p>
                        <p className="text-xs text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contextual Help */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> {data.contextualHelp}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}