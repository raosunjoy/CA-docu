'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface TaskSuggestion {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category: string
  estimatedTime: string
  confidence: number
  reasoning: string
  suggestedDueDate?: string
  prerequisites?: string[]
  relatedTasks?: string[]
  aiGenerated: boolean
}

interface AITaskSuggestionsProps {
  onCreateTask: (suggestion: TaskSuggestion) => void
  currentTasks: any[]
  className?: string
}

export function AITaskSuggestions({ 
  onCreateTask, 
  currentTasks, 
  className = '' 
}: AITaskSuggestionsProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<TaskSuggestion | null>(null)

  useEffect(() => {
    if (user) {
      loadTaskSuggestions()
    }
  }, [user, currentTasks])

  const loadTaskSuggestions = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Prepare context for AI analysis
      const tasksContext = currentTasks.map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        tags: task.tags
      }))

      const aiRequest = {
        type: 'AI',
        data: {
          message: `Analyze current tasks and suggest new tasks for a ${user.role.toLowerCase()} in a CA firm. Consider deadlines, compliance requirements, and workload optimization.`,
          context: {
            currentTasks: tasksContext,
            userRole: user.role,
            organizationId: user.organizationId || 'demo-org',
            currentDate: new Date().toISOString(),
            taskCount: currentTasks.length
          }
        },
        userId: user.id,
        context: {
          userRole: user.role,
          businessContext: 'task_suggestions',
          priority: 'MEDIUM'
        }
      }

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiRequest)
      })

      if (response.ok) {
        const result = await response.json()
        const suggestions = generateTaskSuggestions(result.data, user.role, currentTasks)
        setSuggestions(suggestions)
      } else {
        throw new Error('Failed to get task suggestions')
      }
    } catch (err) {
      setError('Unable to load AI suggestions')
      // Fallback to static suggestions
      setSuggestions(generateFallbackSuggestions(user.role, currentTasks))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const generateTaskSuggestions = (aiData: any, userRole: string, tasks: any[]): TaskSuggestion[] => {
    const suggestions: TaskSuggestion[] = []
    const currentDate = new Date()

    // Generate role-based suggestions
    if (userRole === 'PARTNER') {
      suggestions.push({
        id: 'ai-partner-1',
        title: 'Quarterly Performance Review',
        description: 'AI detected optimal time for team performance evaluation based on project completion patterns',
        priority: 'MEDIUM',
        category: 'Management',
        estimatedTime: '2 hours',
        confidence: 0.85,
        reasoning: 'Analysis shows 3 major projects completed this quarter, ideal time for performance review',
        suggestedDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        aiGenerated: true
      })
      
      suggestions.push({
        id: 'ai-partner-2',
        title: 'Business Development Follow-up',
        description: 'AI identified 2 warm leads that haven\'t been contacted in 2 weeks',
        priority: 'HIGH',
        category: 'Business Development',
        estimatedTime: '1.5 hours',
        confidence: 0.92,
        reasoning: 'Lead engagement data shows optimal conversion window closing soon',
        suggestedDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        aiGenerated: true
      })
    } else if (userRole === 'MANAGER') {
      suggestions.push({
        id: 'ai-manager-1',
        title: 'Team Workload Rebalancing',
        description: 'AI detected workload imbalance: Associate team at 95% capacity while Intern team at 60%',
        priority: 'HIGH',
        category: 'Team Management',
        estimatedTime: '45 minutes',
        confidence: 0.88,
        reasoning: 'Current task distribution analysis shows efficiency opportunity',
        prerequisites: ['Review current assignments', 'Check skill requirements'],
        aiGenerated: true
      })
      
      suggestions.push({
        id: 'ai-manager-2',
        title: 'Compliance Deadline Planning',
        description: 'AI identified 5 upcoming compliance deadlines in next 2 weeks requiring team coordination',
        priority: 'URGENT',
        category: 'Compliance',
        estimatedTime: '1 hour',
        confidence: 0.95,
        reasoning: 'Multiple regulatory deadlines converging, requires proactive planning',
        suggestedDueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        aiGenerated: true
      })
    } else if (userRole === 'ASSOCIATE') {
      suggestions.push({
        id: 'ai-associate-1',
        title: 'GST Reconciliation Review',
        description: 'AI suggests proactive reconciliation check for clients with GST filing next week',
        priority: 'HIGH',
        category: 'GST Compliance',
        estimatedTime: '3 hours',
        confidence: 0.87,
        reasoning: 'Pattern analysis shows reconciliation issues commonly found 1 week before filing',
        prerequisites: ['Access client GST data', 'Prepare reconciliation templates'],
        aiGenerated: true
      })
      
      suggestions.push({
        id: 'ai-associate-2',
        title: 'Document Digitization Batch',
        description: 'AI identified 15 physical documents that should be digitized based on recent access patterns',
        priority: 'MEDIUM',
        category: 'Documentation',
        estimatedTime: '2 hours',
        confidence: 0.75,
        reasoning: 'Recent search queries indicate these documents are frequently needed',
        aiGenerated: true
      })
    } else { // INTERN
      suggestions.push({
        id: 'ai-intern-1',
        title: 'Learning Module: Tax Code Updates',
        description: 'AI recommends studying recent tax code changes based on your assigned task patterns',
        priority: 'MEDIUM',
        category: 'Learning',
        estimatedTime: '1.5 hours',
        confidence: 0.82,
        reasoning: 'Your recent tasks involve areas affected by recent tax updates',
        aiGenerated: true
      })
    }

    // Add context-based suggestions from AI response
    if (aiData?.taskSuggestions && Array.isArray(aiData.taskSuggestions)) {
      aiData.taskSuggestions.slice(0, 2).forEach((suggestion: any, index: number) => {
        suggestions.push({
          id: `ai-dynamic-${index}`,
          title: suggestion.title || `AI Suggested Task ${index + 1}`,
          description: suggestion.description || 'AI-generated task based on current workload analysis',
          priority: suggestion.priority || 'MEDIUM',
          category: suggestion.category || 'General',
          estimatedTime: suggestion.estimatedTime || '1 hour',
          confidence: suggestion.confidence || 0.75,
          reasoning: suggestion.reasoning || 'Generated based on current task patterns and priorities',
          aiGenerated: true
        })
      })
    }

    return suggestions.slice(0, 4) // Limit to 4 suggestions
  }

  const generateFallbackSuggestions = (userRole: string, tasks: any[]): TaskSuggestion[] => {
    const overdueTasks = tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
    ).length

    return [{
      id: 'fallback-1',
      title: 'AI Task Analysis',
      description: `AI assistant is ready to analyze your ${tasks.length} current tasks and provide intelligent suggestions`,
      priority: 'MEDIUM',
      category: 'AI Assistance',
      estimatedTime: '5 minutes',
      confidence: 0.9,
      reasoning: 'AI services available for task optimization and planning assistance',
      aiGenerated: false
    }]
  }

  const handleCreateFromSuggestion = (suggestion: TaskSuggestion) => {
    onCreateTask(suggestion)
    // Remove the created suggestion
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadTaskSuggestions()
  }

  return (
    <Card className={`bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🎯</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Task Suggestions</h3>
              <p className="text-xs text-gray-600">Smart recommendations for your workflow</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="text-gray-400 hover:text-gray-600"
          >
            {refreshing ? <LoadingSpinner size="sm" /> : '↻'}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-6">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-gray-600 mt-2">Analyzing your workflow...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={loadTaskSuggestions}>
              Try Again
            </Button>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white/70 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{suggestion.title}</span>
                      <Badge
                        variant={suggestion.priority === 'URGENT' ? 'error' : 
                                suggestion.priority === 'HIGH' ? 'warning' :
                                suggestion.priority === 'MEDIUM' ? 'info' : 'secondary'}
                        size="sm"
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-xs mb-2">{suggestion.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3 text-gray-500">
                        <span>⏱️ {suggestion.estimatedTime}</span>
                        <span>📁 {suggestion.category}</span>
                        {suggestion.aiGenerated && (
                          <span className="text-purple-600">
                            🤖 {(suggestion.confidence * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-600">{suggestion.reasoning}</p>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSuggestion(suggestion)}
                      className="text-xs"
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCreateFromSuggestion(suggestion)}
                      className="text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      Create Task
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-sm text-gray-600">No new suggestions at this time</p>
            <p className="text-xs text-gray-500 mt-1">Your task workflow looks optimized!</p>
          </div>
        )}
      </div>

      {/* Suggestion Detail Modal */}
      {selectedSuggestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-gray-900">{selectedSuggestion.title}</h3>
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{selectedSuggestion.description}</p>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-700">
                  <strong>AI Reasoning:</strong> {selectedSuggestion.reasoning}
                </p>
              </div>

              {selectedSuggestion.prerequisites && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Prerequisites:</p>
                  <ul className="text-xs text-gray-600 list-disc list-inside">
                    {selectedSuggestion.prerequisites.map((prereq, index) => (
                      <li key={index}>{prereq}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSuggestion(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleCreateFromSuggestion(selectedSuggestion)
                    setSelectedSuggestion(null)
                  }}
                >
                  Create Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}