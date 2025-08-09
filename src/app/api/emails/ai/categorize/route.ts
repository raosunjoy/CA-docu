import { NextRequest, NextResponse } from 'next/server'

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

// Mock AI email categorization service
class EmailAIService {
  async categorizeEmail(emailData: {
    emailId: string
    subject: string
    body: string
    sender: string
    recipients: string[]
  }) {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    const { subject, body, sender } = emailData
    const lowerSubject = subject.toLowerCase()
    const lowerBody = body.toLowerCase()
    const lowerSender = sender.toLowerCase()
    
    const categories: EmailCategory[] = []
    const suggestions: any = {}
    
    // Urgency detection
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical', 'immediate', 'deadline']
    if (urgentKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'urgent',
        name: 'urgent',
        color: '#ef4444',
        confidence: 92,
        description: 'Requires immediate attention'
      })
    }
    
    // Client request detection
    const clientKeywords = ['request', 'need', 'require', 'please', 'could you', 'would you']
    const questionMarks = (subject.match(/\?/g) || []).length
    if (clientKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword)) || questionMarks > 0) {
      categories.push({
        id: 'client-request',
        name: 'client-request',
        color: '#3b82f6',
        confidence: 88,
        description: 'Client is requesting something'
      })
    }
    
    // Financial detection
    const financialKeywords = ['invoice', 'payment', 'bill', 'receipt', 'tax', 'accounting', 'budget', 'expense', '$', 'cost']
    if (financialKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'financial',
        name: 'financial',
        color: '#f59e0b',
        confidence: 95,
        description: 'Financial or accounting related'
      })
    }
    
    // Legal detection
    const legalKeywords = ['contract', 'legal', 'compliance', 'regulation', 'law', 'attorney', 'court', 'lawsuit']
    if (legalKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'legal',
        name: 'legal',
        color: '#8b5cf6',
        confidence: 91,
        description: 'Legal or compliance matter'
      })
    }
    
    // Meeting detection
    const meetingKeywords = ['meeting', 'call', 'conference', 'zoom', 'teams', 'schedule', 'appointment']
    if (meetingKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'meeting',
        name: 'meeting',
        color: '#f97316',
        confidence: 89,
        description: 'Meeting or appointment related'
      })
    }
    
    // Internal communication detection
    const internalDomains = ['company.com', 'internal.com', 'corp.com']
    if (internalDomains.some(domain => lowerSender.includes(domain))) {
      categories.push({
        id: 'internal',
        name: 'internal',
        color: '#10b981',
        confidence: 96,
        description: 'Internal company communication'
      })
    }
    
    // HR detection
    const hrKeywords = ['hr', 'human resources', 'employee', 'benefits', 'payroll', 'vacation', 'pto']
    if (hrKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'hr',
        name: 'hr',
        color: '#6366f1',
        confidence: 87,
        description: 'Human resources related'
      })
    }
    
    // Marketing/Newsletter detection
    const marketingKeywords = ['newsletter', 'unsubscribe', 'marketing', 'promotion', 'sale', 'offer']
    if (marketingKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'newsletter',
        name: 'newsletter',
        color: '#06b6d4',
        confidence: 85,
        description: 'Marketing or newsletter content'
      })
    }
    
    // Spam detection
    const spamKeywords = ['winner', 'congratulations', 'free money', 'click here', 'limited time']
    if (spamKeywords.some(keyword => lowerSubject.includes(keyword) || lowerBody.includes(keyword))) {
      categories.push({
        id: 'spam',
        name: 'spam',
        color: '#6b7280',
        confidence: 78,
        description: 'Likely spam or promotional'
      })
    }
    
    // If no specific categories found, mark as general
    if (categories.length === 0) {
      categories.push({
        id: 'general',
        name: 'general',
        color: '#6b7280',
        confidence: 70,
        description: 'General communication'
      })
    }
    
    // Generate AI suggestions based on categories
    suggestions.priority = this.calculatePriority(categories)
    suggestions.recommendedActions = this.generateRecommendedActions(categories, subject, body)
    suggestions.estimatedResponseTime = this.estimateResponseTime(categories)
    suggestions.taskSuggestions = this.generateTaskSuggestions(categories, subject, body)
    
    return {
      categories,
      suggestions,
      processingTime: Math.floor(Math.random() * 2000) + 800, // 0.8-2.8 seconds
      aiModel: 'Zetra-EmailAI-v1.0',
      timestamp: new Date().toISOString()
    }
  }
  
  private calculatePriority(categories: EmailCategory[]): 'low' | 'medium' | 'high' {
    if (categories.some(cat => cat.name === 'urgent' || cat.name === 'legal')) {
      return 'high'
    }
    if (categories.some(cat => cat.name === 'client-request' || cat.name === 'financial')) {
      return 'medium'
    }
    return 'low'
  }
  
  private generateRecommendedActions(categories: EmailCategory[], subject: string, body: string): string[] {
    const actions: string[] = []
    
    if (categories.some(cat => cat.name === 'urgent')) {
      actions.push('Respond within 2 hours')
      actions.push('Escalate to manager if needed')
    }
    
    if (categories.some(cat => cat.name === 'client-request')) {
      actions.push('Acknowledge receipt within 24 hours')
      actions.push('Gather required information')
    }
    
    if (categories.some(cat => cat.name === 'financial')) {
      actions.push('Forward to accounting team')
      actions.push('Verify payment details')
    }
    
    if (categories.some(cat => cat.name === 'legal')) {
      actions.push('Consult with legal team')
      actions.push('Review compliance requirements')
    }
    
    if (categories.some(cat => cat.name === 'meeting')) {
      actions.push('Check calendar availability')
      actions.push('Send meeting invite')
    }
    
    return actions
  }
  
  private estimateResponseTime(categories: EmailCategory[]): string {
    if (categories.some(cat => cat.name === 'urgent')) {
      return '2 hours'
    }
    if (categories.some(cat => cat.name === 'client-request')) {
      return '24 hours'
    }
    if (categories.some(cat => cat.name === 'financial' || cat.name === 'legal')) {
      return '48 hours'
    }
    return '3-5 days'
  }
  
  private generateTaskSuggestions(categories: EmailCategory[], subject: string, body: string): TaskSuggestion[] {
    const suggestions: TaskSuggestion[] = []
    
    if (categories.some(cat => cat.name === 'client-request')) {
      suggestions.push({
        title: `Respond to client: ${subject.substring(0, 50)}...`,
        description: 'Address client request and provide necessary information',
        priority: 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        tags: ['client', 'response', 'communication']
      })
    }
    
    if (categories.some(cat => cat.name === 'financial')) {
      suggestions.push({
        title: 'Process financial document',
        description: 'Review and process the financial information provided',
        priority: 'medium',
        dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 2 days
        tags: ['financial', 'processing', 'review']
      })
    }
    
    if (categories.some(cat => cat.name === 'meeting')) {
      suggestions.push({
        title: 'Schedule meeting',
        description: 'Coordinate and schedule the requested meeting',
        priority: 'low',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
        tags: ['meeting', 'scheduling', 'coordination']
      })
    }
    
    if (categories.some(cat => cat.name === 'legal')) {
      suggestions.push({
        title: 'Legal review required',
        description: 'Consult with legal team and review compliance requirements',
        priority: 'high',
        dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 3 days
        tags: ['legal', 'compliance', 'review']
      })
    }
    
    if (categories.some(cat => cat.name === 'urgent')) {
      suggestions.push({
        title: 'URGENT: Immediate action required',
        description: 'Address urgent matter requiring immediate attention',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        tags: ['urgent', 'immediate', 'priority']
      })
    }
    
    return suggestions
  }
}

const emailAI = new EmailAIService()

export async function POST(request: NextRequest) {
  try {
    const emailData = await request.json()
    
    if (!emailData.emailId || !emailData.subject) {
      return NextResponse.json(
        { error: 'Email ID and subject are required' },
        { status: 400 }
      )
    }
    
    const result = await emailAI.categorizeEmail(emailData)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Email categorization error:', error)
    return NextResponse.json(
      { error: 'Email categorization failed' },
      { status: 500 }
    )
  }
}