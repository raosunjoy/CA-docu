'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface EmailCategory {
  id: string
  name: string
  description: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  suggestedActions: string[]
  color: string
}

interface CategorizedEmail {
  id: string
  subject: string
  fromName: string
  fromAddress: string
  snippet: string
  categories: EmailCategory[]
  aiSuggestions: {
    shouldCreateTask: boolean
    taskTitle?: string
    taskPriority?: string
    requiresResponse: boolean
    urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    estimatedResponseTime?: string
  }
  processingTime: number
}

interface AIEmailCategorizerProps {
  emails: any[]
  onEmailCategorized: (emailId: string, categories: EmailCategory[], suggestions: any) => void
  onCreateTask: (emailId: string, taskData: any) => void
  className?: string
}

export function AIEmailCategorizer({ 
  emails, 
  onEmailCategorized, 
  onCreateTask,
  className = '' 
}: AIEmailCategorizerProps) {
  const { user } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [categorizedEmails, setCategorizedEmails] = useState<CategorizedEmail[]>([])
  const [selectedEmail, setSelectedEmail] = useState<CategorizedEmail | null>(null)
  const [autoProcessing, setAutoProcessing] = useState(true)
  const [processingStats, setProcessingStats] = useState({
    processed: 0,
    total: 0,
    accuracy: 0
  })

  useEffect(() => {
    if (autoProcessing && emails.length > 0 && categorizedEmails.length === 0) {
      processEmailBatch()
    }
  }, [emails, autoProcessing])

  const processEmailBatch = async () => {
    if (!user || emails.length === 0) return

    try {
      setProcessing(true)
      setProcessingStats(prev => ({ ...prev, total: emails.length, processed: 0 }))

      const results: CategorizedEmail[] = []

      // Process emails in batches of 5 to avoid overwhelming the AI service
      const batchSize = 5
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(email => processSingleEmail(email))
        )
        results.push(...batchResults.filter(Boolean))
        setProcessingStats(prev => ({ ...prev, processed: i + batch.length }))
      }

      setCategorizedEmails(results)
      calculateAccuracy(results)
      
      // Apply categorization results
      results.forEach(result => {
        onEmailCategorized(result.id, result.categories, result.aiSuggestions)
      })

    } catch (error) {
      console.error('Email categorization failed:', error)
    } finally {
      setProcessing(false)
    }
  }

  const processSingleEmail = async (email: any): Promise<CategorizedEmail | null> => {
    try {
      const aiRequest = {
        type: 'AI',
        data: {
          message: `Categorize this email and provide intelligent suggestions for a ${user?.role?.toLowerCase()} in a CA firm.`,
          context: {
            email: {
              subject: email.subject,
              from: email.fromName || email.fromAddress,
              body: email.bodyText?.substring(0, 1000) || email.snippet,
              attachments: email.attachments?.length || 0
            },
            userRole: user?.role,
            businessContext: 'email_categorization'
          }
        },
        userId: user?.id,
        context: {
          userRole: user?.role || 'ASSOCIATE',
          businessContext: 'email_categorization',
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
        return transformEmailAnalysis(email, result.data)
      } else {
        // Fallback to rule-based categorization
        return generateFallbackCategories(email)
      }
    } catch (error) {
      console.error('Failed to process email:', email.id, error)
      return generateFallbackCategories(email)
    }
  }

  const transformEmailAnalysis = (email: any, aiData: any): CategorizedEmail => {
    const categories = generateCategories(email, aiData)
    const suggestions = generateSuggestions(email, aiData, categories)

    return {
      id: email.id,
      subject: email.subject || '(No subject)',
      fromName: email.fromName || email.fromAddress,
      fromAddress: email.fromAddress,
      snippet: email.snippet || email.bodyText?.substring(0, 100) || '',
      categories,
      aiSuggestions: suggestions,
      processingTime: aiData?.processingTime || 0
    }
  }

  const generateCategories = (email: any, aiData: any): EmailCategory[] => {
    const categories: EmailCategory[] = []
    const subject = (email.subject || '').toLowerCase()
    const body = (email.bodyText || email.snippet || '').toLowerCase()

    // AI-enhanced categorization
    if (aiData?.categories && Array.isArray(aiData.categories)) {
      aiData.categories.forEach((cat: any) => {
        categories.push({
          id: cat.id || `ai-${Math.random()}`,
          name: cat.name,
          description: cat.description || '',
          priority: cat.priority || 'MEDIUM',
          confidence: cat.confidence || 0.75,
          suggestedActions: cat.actions || [],
          color: getCategoryColor(cat.name)
        })
      })
    }

    // Rule-based fallback categorization
    if (categories.length === 0) {
      // Compliance & Regulatory
      if (subject.includes('gst') || subject.includes('tax') || body.includes('compliance') || body.includes('filing')) {
        categories.push({
          id: 'compliance',
          name: 'Tax & Compliance',
          description: 'Tax filings, GST, and compliance matters',
          priority: 'HIGH',
          confidence: 0.85,
          suggestedActions: ['Review immediately', 'Check deadline', 'Assign to tax team'],
          color: 'bg-red-100 text-red-800'
        })
      }

      // Client Communication
      if (subject.includes('client') || body.includes('urgent') || body.includes('meeting')) {
        categories.push({
          id: 'client-comm',
          name: 'Client Communication',
          description: 'Direct client correspondence requiring attention',
          priority: 'HIGH',
          confidence: 0.90,
          suggestedActions: ['Respond within 24 hours', 'Schedule meeting', 'Update client status'],
          color: 'bg-blue-100 text-blue-800'
        })
      }

      // Audit & Review
      if (subject.includes('audit') || subject.includes('review') || body.includes('financial statement')) {
        categories.push({
          id: 'audit',
          name: 'Audit & Review',
          description: 'Audit planning, review, and related activities',
          priority: 'MEDIUM',
          confidence: 0.80,
          suggestedActions: ['Schedule review', 'Prepare documentation', 'Assign audit team'],
          color: 'bg-purple-100 text-purple-800'
        })
      }

      // Internal Operations
      if (subject.includes('team') || subject.includes('internal') || body.includes('staff')) {
        categories.push({
          id: 'internal',
          name: 'Internal Operations',
          description: 'Internal team communication and operations',
          priority: 'MEDIUM',
          confidence: 0.75,
          suggestedActions: ['Review with team', 'Update procedures', 'Schedule discussion'],
          color: 'bg-green-100 text-green-800'
        })
      }

      // Default category if none match
      if (categories.length === 0) {
        categories.push({
          id: 'general',
          name: 'General Business',
          description: 'General business correspondence',
          priority: 'LOW',
          confidence: 0.60,
          suggestedActions: ['Review when convenient', 'File appropriately'],
          color: 'bg-gray-100 text-gray-800'
        })
      }
    }

    return categories.slice(0, 3) // Limit to top 3 categories
  }

  const generateSuggestions = (email: any, aiData: any, categories: EmailCategory[]): any => {
    const hasHighPriorityCategory = categories.some(cat => cat.priority === 'HIGH')
    const hasAttachments = email.attachments && email.attachments.length > 0
    const isFromClient = email.fromAddress && !email.fromAddress.includes(user?.organizationId || '')

    const suggestions = {
      shouldCreateTask: false,
      taskTitle: '',
      taskPriority: 'MEDIUM' as const,
      requiresResponse: false,
      urgencyLevel: 'MEDIUM' as const,
      estimatedResponseTime: ''
    }

    // AI-enhanced suggestions
    if (aiData?.suggestions) {
      Object.assign(suggestions, aiData.suggestions)
    }

    // Rule-based suggestions
    if (hasHighPriorityCategory) {
      suggestions.shouldCreateTask = true
      suggestions.taskTitle = `Handle: ${email.subject}`
      suggestions.taskPriority = 'HIGH'
      suggestions.urgencyLevel = 'HIGH'
      suggestions.requiresResponse = true
      suggestions.estimatedResponseTime = '24 hours'
    }

    if (hasAttachments) {
      suggestions.shouldCreateTask = true
      suggestions.taskTitle = `Review documents: ${email.subject}`
    }

    if (isFromClient && categories.some(cat => cat.name.includes('Client'))) {
      suggestions.requiresResponse = true
      suggestions.urgencyLevel = 'HIGH'
      suggestions.estimatedResponseTime = '4 hours'
    }

    return suggestions
  }

  const generateFallbackCategories = (email: any): CategorizedEmail => {
    const categories = generateCategories(email, {})
    const suggestions = generateSuggestions(email, {}, categories)

    return {
      id: email.id,
      subject: email.subject || '(No subject)',
      fromName: email.fromName || email.fromAddress,
      fromAddress: email.fromAddress,
      snippet: email.snippet || '',
      categories,
      aiSuggestions: suggestions,
      processingTime: 0
    }
  }

  const getCategoryColor = (categoryName: string): string => {
    const colorMap: Record<string, string> = {
      'Tax & Compliance': 'bg-red-100 text-red-800',
      'Client Communication': 'bg-blue-100 text-blue-800',
      'Audit & Review': 'bg-purple-100 text-purple-800',
      'Internal Operations': 'bg-green-100 text-green-800',
      'Financial': 'bg-yellow-100 text-yellow-800',
      'Legal': 'bg-indigo-100 text-indigo-800',
      'General Business': 'bg-gray-100 text-gray-800'
    }
    return colorMap[categoryName] || 'bg-gray-100 text-gray-800'
  }

  const calculateAccuracy = (results: CategorizedEmail[]) => {
    const totalConfidence = results.reduce((sum, email) => 
      sum + email.categories.reduce((catSum, cat) => catSum + cat.confidence, 0), 0
    )
    const avgConfidence = totalConfidence / (results.length * results[0]?.categories.length || 1)
    setProcessingStats(prev => ({ ...prev, accuracy: avgConfidence * 100 }))
  }

  const handleCreateTaskFromEmail = (email: CategorizedEmail) => {
    const taskData = {
      title: email.aiSuggestions.taskTitle || `Handle: ${email.subject}`,
      description: `Email from ${email.fromName}: ${email.snippet}`,
      priority: email.aiSuggestions.taskPriority || 'MEDIUM',
      dueDate: email.aiSuggestions.estimatedResponseTime ? 
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      tags: ['Email', ...email.categories.map(cat => cat.name)],
      linkedEmailId: email.id
    }
    onCreateTask(email.id, taskData)
  }

  return (
    <Card className={`bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">📧</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Email Categorization</h3>
              <p className="text-xs text-gray-600">
                Intelligent email analysis and organization
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoProcessing(!autoProcessing)}
              className={`text-xs ${autoProcessing ? 'text-emerald-600' : 'text-gray-400'}`}
            >
              Auto-categorize
            </Button>
            {!autoProcessing && (
              <Button
                variant="outline"
                size="sm"
                onClick={processEmailBatch}
                disabled={processing}
                className="text-xs"
              >
                {processing ? <LoadingSpinner size="sm" /> : 'Process'}
              </Button>
            )}
          </div>
        </div>

        {processing ? (
          <div className="text-center py-6">
            <LoadingSpinner size="sm" />
            <p className="text-xs text-gray-600 mt-2">
              Processing emails... {processingStats.processed}/{processingStats.total}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(processingStats.processed / processingStats.total) * 100}%` }}
              />
            </div>
          </div>
        ) : categorizedEmails.length > 0 ? (
          <div className="space-y-3">
            {/* Processing Stats */}
            <div className="bg-white/70 rounded-lg p-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  📊 {categorizedEmails.length} emails categorized
                </span>
                <span className="text-emerald-600">
                  🎯 {processingStats.accuracy.toFixed(1)}% avg confidence
                </span>
              </div>
            </div>

            {/* Top Categorized Emails */}
            {categorizedEmails.slice(0, 3).map((email) => (
              <div key={email.id} className="bg-white/70 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {email.subject}
                      </span>
                      {email.aiSuggestions.urgencyLevel === 'HIGH' && (
                        <Badge variant="error" size="sm">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">From: {email.fromName}</p>
                    
                    {/* Categories */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {email.categories.map((category) => (
                        <span
                          key={category.id}
                          className={`px-2 py-1 text-xs rounded ${category.color}`}
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>

                    {/* AI Suggestions */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3 text-gray-500">
                        {email.aiSuggestions.requiresResponse && (
                          <span className="text-orange-600">📩 Response needed</span>
                        )}
                        {email.aiSuggestions.shouldCreateTask && (
                          <span className="text-purple-600">📋 Create task</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    {email.categories.map(cat => (
                      <span key={cat.id} className="text-xs text-gray-600">
                        {(cat.confidence * 100).toFixed(0)}% confidence
                      </span>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEmail(email)}
                      className="text-xs"
                    >
                      Details
                    </Button>
                    {email.aiSuggestions.shouldCreateTask && (
                      <Button
                        size="sm"
                        onClick={() => handleCreateTaskFromEmail(email)}
                        className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600"
                      >
                        Create Task
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {categorizedEmails.length > 3 && (
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* Show all categorized emails */}}
                  className="text-xs"
                >
                  View all {categorizedEmails.length} categorized emails
                </Button>
              </div>
            )}
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">📫</div>
            <p className="text-sm text-gray-600">No emails to categorize</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">🤖</div>
            <p className="text-sm text-gray-600 mb-2">Ready to categorize emails</p>
            <Button
              size="sm"
              onClick={processEmailBatch}
              className="bg-gradient-to-r from-emerald-600 to-teal-600"
            >
              Start AI Categorization
            </Button>
          </div>
        )}
      </div>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-gray-900">{selectedEmail.subject}</h3>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">From: {selectedEmail.fromName}</p>
                <p className="text-sm text-gray-600">{selectedEmail.snippet}</p>
              </div>

              {/* Categories */}
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">AI Categories:</p>
                {selectedEmail.categories.map((category) => (
                  <div key={category.id} className="mb-3 p-2 bg-gray-50 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-1 text-xs rounded ${category.color}`}>
                        {category.name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {(category.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{category.description}</p>
                    <div className="mt-1">
                      <p className="text-xs font-medium text-gray-700">Suggested Actions:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {category.suggestedActions.map((action, idx) => (
                          <li key={idx}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Suggestions */}
              <div className="bg-blue-50 rounded p-3">
                <p className="text-sm font-medium text-gray-900 mb-2">🤖 AI Recommendations:</p>
                <div className="space-y-1 text-xs">
                  <p>Priority: <span className="font-medium">{selectedEmail.aiSuggestions.urgencyLevel}</span></p>
                  <p>Response needed: <span className="font-medium">{selectedEmail.aiSuggestions.requiresResponse ? 'Yes' : 'No'}</span></p>
                  <p>Create task: <span className="font-medium">{selectedEmail.aiSuggestions.shouldCreateTask ? 'Yes' : 'No'}</span></p>
                  {selectedEmail.aiSuggestions.estimatedResponseTime && (
                    <p>Response time: <span className="font-medium">{selectedEmail.aiSuggestions.estimatedResponseTime}</span></p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmail(null)}
                >
                  Close
                </Button>
                {selectedEmail.aiSuggestions.shouldCreateTask && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleCreateTaskFromEmail(selectedEmail)
                      setSelectedEmail(null)
                    }}
                  >
                    Create Task
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}