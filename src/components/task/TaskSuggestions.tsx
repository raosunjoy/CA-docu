'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Alert } from '@/components/common/Alert'
import { SmartTaskSuggestion } from '@/types'

interface TaskSuggestionsProps {
  organizationId: string
  userId: string
  onTaskCreated?: (task: any) => void
}

export function TaskSuggestions({ 
  organizationId, 
  userId, 
  onTaskCreated 
}: TaskSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SmartTaskSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSuggestions()
  }, [organizationId, userId])

  const fetchSuggestions = async (generate = false) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/tasks/suggestions?organizationId=${organizationId}&userId=${userId}&generate=${generate}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const result = await response.json()
      if (result.success) {
        setSuggestions(result.data)
      } else {
        throw new Error(result.error?.message || 'Failed to fetch suggestions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionResponse = async (suggestionId: string, status: 'accepted' | 'rejected') => {
    try {
      setProcessingId(suggestionId)
      const response = await fetch(
        `/api/tasks/suggestions?organizationId=${organizationId}&userId=${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            suggestionId,
            status,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to respond to suggestion')
      }

      const result = await response.json()
      if (result.success) {
        // Update suggestion status
        setSuggestions(prev =>
          prev.map(suggestion =>
            suggestion.id === suggestionId
              ? { ...suggestion, status }
              : suggestion
          )
        )

        // If accepted and a task was created, notify parent
        if (status === 'accepted' && result.data.createdTask) {
          onTaskCreated?.(result.data.createdTask)
        }
      } else {
        throw new Error(result.error?.message || 'Failed to respond to suggestion')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setProcessingId(null)
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recurring':
        return '🔄'
      case 'similar':
        return '👥'
      case 'workload':
        return '⚖️'
      case 'deadline':
        return '⏰'
      default:
        return '💡'
    }
  }

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'recurring':
        return 'Recurring Pattern'
      case 'similar':
        return 'Similar Task'
      case 'workload':
        return 'Workload Optimization'
      case 'deadline':
        return 'Deadline Management'
      default:
        return 'Smart Suggestion'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-orange-600 bg-orange-100'
  }

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')
  const respondedSuggestions = suggestions.filter(s => s.status !== 'pending')

  return (
    <div className="space-y-6">
      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Task Suggestions</h2>
        <div className="flex space-x-3">
          <Button
            onClick={() => fetchSuggestions(false)}
            variant="outline"
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            onClick={() => fetchSuggestions(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate New Suggestions'}
          </Button>
        </div>
      </div>

      {loading && suggestions.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-600">Loading suggestions...</div>
        </div>
      ) : (
        <>
          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                New Suggestions ({pendingSuggestions.length})
              </h3>
              <div className="space-y-4">
                {pendingSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{getSuggestionIcon(suggestion.type)}</span>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {suggestion.title}
                            </h4>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className="text-sm text-gray-500">
                                {getSuggestionTypeLabel(suggestion.type)}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(suggestion.confidence)}`}>
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>

                        {suggestion.description && (
                          <p className="text-gray-600 mb-3">{suggestion.description}</p>
                        )}

                        {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Why this suggestion?</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {suggestion.reasoning.map((reason, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-blue-500 mr-2">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {suggestion.expiresAt && (
                          <div className="text-sm text-gray-500">
                            Expires: {new Date(suggestion.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleSuggestionResponse(suggestion.id, 'accepted')}
                          disabled={processingId === suggestion.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === suggestion.id ? 'Processing...' : 'Accept'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuggestionResponse(suggestion.id, 'rejected')}
                          disabled={processingId === suggestion.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recent Responses */}
          {respondedSuggestions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Responses
              </h3>
              <div className="space-y-3">
                {respondedSuggestions.slice(0, 5).map((suggestion) => (
                  <Card key={suggestion.id} className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                        <div>
                          <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                          <span className="text-sm text-gray-500">
                            {getSuggestionTypeLabel(suggestion.type)}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        suggestion.status === 'accepted' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {suggestion.status === 'accepted' ? 'Accepted' : 'Dismissed'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {suggestions.length === 0 && !loading && (
            <Card className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <span className="text-4xl mb-4 block">💡</span>
                No suggestions available right now.
              </div>
              <p className="text-gray-600 mb-4">
                Suggestions are generated based on your task patterns, workload, and deadlines.
              </p>
              <Button
                onClick={() => fetchSuggestions(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Generate Suggestions
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  )
}