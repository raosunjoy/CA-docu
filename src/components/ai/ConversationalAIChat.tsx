'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, BarChart3, FileText, Settings, X, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Badge } from '../atoms/Badge'
import { ConversationResponse, AnalyticsInsight, ActionSuggestion } from '../../services/conversational-ai-service'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  type?: 'text' | 'analytics' | 'hybrid'
  timestamp: Date
  confidence?: number
  analytics?: AnalyticsInsight[]
  suggestions?: ActionSuggestion[]
  followUpQuestions?: string[]
  isLoading?: boolean
}

interface ConversationalAIChatProps {
  className?: string
  onSessionStart?: (sessionId: string) => void
  onSessionEnd?: () => void
  businessContext?: {
    currentProjects?: string[]
    activeClients?: string[]
    priorities?: string[]
  }
}

export default function ConversationalAIChat({
  className = '',
  onSessionStart,
  onSessionEnd,
  businessContext
}: ConversationalAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [preferences, setPreferences] = useState({
    responseStyle: 'DETAILED' as const,
    includeAnalytics: true,
    autoGenerateInsights: true
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startNewSession = async () => {
    setIsInitializing(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startNewSession: true,
          businessContext
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start conversation')
      }

      const data = await response.json()
      const newSessionId = data.sessionId
      const welcomeResponse: ConversationResponse = data.response

      setSessionId(newSessionId)
      setMessages([{
        id: welcomeResponse.id,
        role: 'assistant',
        content: welcomeResponse.content,
        type: welcomeResponse.type,
        timestamp: new Date(welcomeResponse.timestamp),
        confidence: welcomeResponse.confidence,
        analytics: welcomeResponse.analytics,
        suggestions: welcomeResponse.suggestions,
        followUpQuestions: welcomeResponse.followUpQuestions
      }])

      onSessionStart?.(newSessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
    } finally {
      setIsInitializing(false)
    }
  }

  const sendMessage = async (message: string, messageType: 'query' | 'command' | 'analysis_request' = 'query') => {
    if (!message.trim() || !sessionId || isLoading) return

    setIsLoading(true)
    setError(null)

    // Add user message immediately
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    }

    // Add loading message
    const loadingMessage: Message = {
      id: `loading_${Date.now()}`,
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date(),
      isLoading: true
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])
    setCurrentMessage('')

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message,
          messageType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      const aiResponse: ConversationResponse = data.response

      // Remove loading message and add actual response
      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.id !== loadingMessage.id)
        return [...withoutLoading, {
          id: aiResponse.id,
          role: 'assistant',
          content: aiResponse.content,
          type: aiResponse.type,
          timestamp: new Date(aiResponse.timestamp),
          confidence: aiResponse.confidence,
          analytics: aiResponse.analytics,
          suggestions: aiResponse.suggestions,
          followUpQuestions: aiResponse.followUpQuestions
        }]
      })

    } catch (err) {
      // Remove loading message and show error
      setMessages(prev => prev.filter(m => m.id !== loadingMessage.id))
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(currentMessage)
  }

  const handleFollowUpQuestion = (question: string) => {
    sendMessage(question)
  }

  const handleSuggestionClick = (suggestion: ActionSuggestion) => {
    sendMessage(`Tell me more about: ${suggestion.title}`, 'query')
  }

  const endSession = async () => {
    if (!sessionId) return

    try {
      await fetch(`/api/ai/chat?sessionId=${sessionId}`, {
        method: 'DELETE'
      })
      
      setSessionId(null)
      setMessages([])
      setError(null)
      onSessionEnd?.()
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }

  const updatePreferences = async (newPreferences: Partial<typeof preferences>) => {
    if (!sessionId) return

    try {
      await fetch('/api/ai/chat', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          preferences: newPreferences
        })
      })

      setPreferences(prev => ({ ...prev, ...newPreferences }))
    } catch (err) {
      console.error('Failed to update preferences:', err)
    }
  }

  const renderAnalyticsInsights = (analytics?: AnalyticsInsight[]) => {
    if (!analytics || analytics.length === 0) return null

    return (
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Analytics Insights</span>
        </div>
        <div className="space-y-2">
          {analytics.map((insight, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{insight.metric}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{insight.value}</span>
                <Badge
                  variant={
                    insight.trend === 'up' ? 'success' : 
                    insight.trend === 'down' ? 'error' : 'secondary'
                  }
                  className="text-xs"
                >
                  {insight.trend}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSuggestions = (suggestions?: ActionSuggestion[]) => {
    if (!suggestions || suggestions.length === 0 || !showSuggestions) return null

    return (
      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Suggestions</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(false)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-2">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <div
              key={index}
              className="p-2 bg-white rounded border border-green-200 cursor-pointer hover:bg-green-50 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{suggestion.title}</span>
                <Badge
                  variant={
                    suggestion.priority === 'high' ? 'error' : 
                    suggestion.priority === 'medium' ? 'warning' : 'secondary'
                  }
                  className="text-xs"
                >
                  {suggestion.priority}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderFollowUpQuestions = (questions?: string[]) => {
    if (!questions || questions.length === 0) return null

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleFollowUpQuestion(question)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            disabled={isLoading}
          >
            {question}
          </button>
        ))}
      </div>
    )
  }

  if (!sessionId) {
    return (
      <Card className={`w-full max-w-4xl mx-auto ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bot className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Welcome to your AI Assistant
          </h3>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            Get intelligent insights, analytics, and assistance with your CA firm operations.
            Start a conversation to begin.
          </p>
          <Button
            onClick={startNewSession}
            disabled={isInitializing}
            className="flex items-center gap-2"
          >
            {isInitializing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
            Start Conversation
          </Button>
          {error && (
            <p className="text-red-600 text-sm mt-4">{error}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updatePreferences({ includeAnalytics: !preferences.includeAnalytics })}
              className="flex items-center gap-1"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics {preferences.includeAnalytics ? 'ON' : 'OFF'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={endSession}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Messages Area */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isLoading
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{message.content}</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>

                {message.role === 'assistant' && !message.isLoading && (
                  <>
                    {message.confidence && (
                      <div className="mt-1 text-xs text-gray-500">
                        Confidence: {Math.round(message.confidence * 100)}%
                      </div>
                    )}
                    
                    {renderAnalyticsInsights(message.analytics)}
                    {renderSuggestions(message.suggestions)}
                    {renderFollowUpQuestions(message.followUpQuestions)}
                  </>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 order-1">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          {error && (
            <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask me anything about your CA firm operations..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !currentMessage.trim()}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <Settings className="w-3 h-3" />
            Style: {preferences.responseStyle} | Analytics: {preferences.includeAnalytics ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}