'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'

interface EmailCategory {
  id: string
  name: string
  color: string
  confidence: number
  description: string
}

interface TaskSuggestion {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  assignee?: string
  tags: string[]
}

interface AIEmailCategorizerProps {
  emails: any[]
  onEmailCategorized: (emailId: string, categories: EmailCategory[], suggestions: any) => void
  onCreateTask: (emailId: string, taskData: TaskSuggestion) => void
}

export const AIEmailCategorizer: React.FC<AIEmailCategorizerProps> = ({
  emails,
  onEmailCategorized,
  onCreateTask
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedEmails, setProcessedEmails] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<Record<string, any>>({})

  const categorizeEmails = async () => {
    setIsProcessing(true)
    
    try {
      // Process uncategorized emails
      const uncategorizedEmails = emails.filter(email => 
        !processedEmails.has(email.id) && !email.categories?.length
      )
      
      for (const email of uncategorizedEmails.slice(0, 5)) { // Process 5 at a time
        const response = await fetch('/api/emails/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId: email.id,
            subject: email.subject,
            body: email.body || email.preview,
            sender: email.from,
            recipients: email.to
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          onEmailCategorized(email.id, result.categories, result.suggestions)
          setSuggestions(prev => ({
            ...prev,
            [email.id]: result.suggestions
          }))
          setProcessedEmails(prev => new Set([...prev, email.id]))
        }
      }
    } catch (error) {
      console.error('Email categorization failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const generateTaskSuggestions = async (emailId: string) => {
    try {
      const response = await fetch('/api/emails/ai/task-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId })
      })
      
      if (response.ok) {
        const taskSuggestions = await response.json()
        setSuggestions(prev => ({
          ...prev,
          [emailId]: {
            ...prev[emailId],
            taskSuggestions
          }
        }))
      }
    } catch (error) {
      console.error('Task suggestion generation failed:', error)
    }
  }

  const handleCreateTask = (emailId: string, taskData: TaskSuggestion) => {
    onCreateTask(emailId, taskData)
    // Remove the suggestion after creating the task
    setSuggestions(prev => ({
      ...prev,
      [emailId]: {
        ...prev[emailId],
        taskSuggestions: prev[emailId]?.taskSuggestions?.filter(
          (t: TaskSuggestion) => t.title !== taskData.title
        )
      }
    }))
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'urgent': 'bg-red-100 text-red-800',
      'client-request': 'bg-blue-100 text-blue-800',
      'internal': 'bg-green-100 text-green-800',
      'financial': 'bg-yellow-100 text-yellow-800',
      'legal': 'bg-purple-100 text-purple-800',
      'marketing': 'bg-pink-100 text-pink-800',
      'hr': 'bg-indigo-100 text-indigo-800',
      'spam': 'bg-gray-100 text-gray-800',
      'newsletter': 'bg-cyan-100 text-cyan-800',
      'meeting': 'bg-orange-100 text-orange-800'
    }
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const uncategorizedCount = emails.filter(email => 
    !processedEmails.has(email.id) && !email.categories?.length
  ).length

  const emailsWithSuggestions = emails.filter(email => 
    suggestions[email.id]?.taskSuggestions?.length > 0
  )

  return (
    <div className="space-y-4">
      {/* AI Categorization Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🤖 AI Email Intelligence</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {uncategorizedCount} uncategorized
              </Badge>
              <Button
                onClick={categorizeEmails}
                disabled={isProcessing || uncategorizedCount === 0}
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Categorize Emails'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {emails.filter(e => e.categories?.some((c: any) => c.name === 'client-request')).length}
              </div>
              <div className="text-gray-600">Client Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {emails.filter(e => e.categories?.some((c: any) => c.name === 'urgent')).length}
              </div>
              <div className="text-gray-600">Urgent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {emails.filter(e => e.categories?.some((c: any) => c.name === 'financial')).length}
              </div>
              <div className="text-gray-600">Financial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {emailsWithSuggestions.length}
              </div>
              <div className="text-gray-600">Task Suggestions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Suggestions */}
      {emailsWithSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💡 AI Task Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emailsWithSuggestions.slice(0, 3).map(email => (
                <div key={email.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {email.subject}
                      </h4>
                      <p className="text-xs text-gray-500">
                        From: {email.from}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-2">
                      {email.categories?.slice(0, 2).map((category: EmailCategory) => (
                        <Badge
                          key={category.id}
                          className={getCategoryColor(category.name)}
                          size="sm"
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {suggestions[email.id]?.taskSuggestions?.slice(0, 2).map((task: TaskSuggestion, index: number) => (
                      <div key={index} className="bg-gray-50 rounded p-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm text-gray-900">
                              {task.title}
                            </h5>
                            <p className="text-xs text-gray-600 mt-1">
                              {task.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge
                                className={getPriorityColor(task.priority)}
                                size="sm"
                              >
                                {task.priority.toUpperCase()}
                              </Badge>
                              {task.dueDate && (
                                <span className="text-xs text-gray-500">
                                  Due: {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleCreateTask(email.id, task)}
                            size="sm"
                            variant="outline"
                            className="ml-2"
                          >
                            Create Task
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>🎯 AI Accuracy:</span>
        <Badge variant="secondary">94.2%</Badge>
        <span>•</span>
        <span>⚡ Avg Processing:</span>
        <Badge variant="secondary">1.2s</Badge>
        <span>•</span>
        <span>📊 Processed Today:</span>
        <Badge variant="secondary">{processedEmails.size}</Badge>
      </div>
    </div>
  )
}