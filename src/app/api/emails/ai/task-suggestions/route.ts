// Zetra Platform - AI Task Suggestions API
// Generates intelligent task suggestions from email content

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../../lib/auth'
import { aiDatabase } from '@/services/ai-database'
import { AISecurityMiddleware } from '@/middleware/ai-security'

interface EmailContent {
  emailId: string
  subject?: string
  body?: string
  fromAddress: string
  attachments?: Array<{
    filename: string
    contentType: string
  }>
}

interface TaskSuggestion {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  tags: string[]
  confidence: number
  reasoning: string[]
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId = 'unknown'
  
  // Security middleware check (but we still need our own auth since this endpoint has specific auth logic)
  const securityCheck = await AISecurityMiddleware.protect(
    request, 
    '/api/emails/ai/task-suggestions',
    { requireAuth: false } // We'll handle auth manually since this endpoint has special auth requirements
  )
  if (securityCheck) {
    return securityCheck // Return security error response
  }
  
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      await aiDatabase.logUsage({
        userId: 'unauthorized',
        organizationId: 'unknown',
        endpoint: '/api/emails/ai/task-suggestions',
        requestType: 'TASK_SUGGESTION',
        userRole: 'UNKNOWN',
        businessContext: 'email_to_task',
        success: false,
        errorMessage: 'Unauthorized - missing token',
        processingTime: Date.now() - startTime
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      await aiDatabase.logUsage({
        userId: 'unauthorized',
        organizationId: 'unknown',
        endpoint: '/api/emails/ai/task-suggestions',
        requestType: 'TASK_SUGGESTION',
        userRole: 'UNKNOWN',
        businessContext: 'email_to_task',
        success: false,
        errorMessage: 'Unauthorized - invalid token',
        processingTime: Date.now() - startTime
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    userId = payload.userId || payload.sub || 'unknown'
    const organizationId = payload.organizationId || 'demo-org'
    const userRole = payload.role || 'ASSOCIATE'

    const emailContent: EmailContent = await request.json()

    if (!emailContent.emailId || !emailContent.fromAddress) {
      await aiDatabase.logUsage({
        userId,
        organizationId,
        endpoint: '/api/emails/ai/task-suggestions',
        requestType: 'TASK_SUGGESTION',
        userRole,
        businessContext: 'email_to_task',
        success: false,
        errorMessage: 'Missing required fields: emailId or fromAddress',
        processingTime: Date.now() - startTime
      })

      return NextResponse.json(
        { error: 'Email ID and from address are required' },
        { status: 400 }
      )
    }

    const suggestion = await generateTaskSuggestion(emailContent)
    const processingTime = Date.now() - startTime

    // Store AI analysis result
    try {
      const analysisId = await aiDatabase.storeAnalysisResult({
        requestId: crypto.randomUUID(),
        userId,
        organizationId,
        type: 'TASK_SUGGESTION',
        inputData: emailContent,
        outputData: suggestion,
        confidence: suggestion.confidence,
        processingTime,
        aiModel: 'rule-based-ai',
        cached: false
      })

      // Track the generated task suggestion
      if (suggestion.confidence > 0.7) {
        await aiDatabase.trackGeneratedTask({
          taskId: `pending_${emailContent.emailId}`,
          sourceType: 'EMAIL',
          sourceId: emailContent.emailId,
          aiAnalysisId: analysisId,
          confidence: suggestion.confidence
        })
      }
    } catch (dbError) {
      console.error('Database storage failed:', dbError)
      // Don't fail the request if database storage fails
    }

    // Log successful usage
    await aiDatabase.logUsage({
      userId,
      organizationId,
      endpoint: '/api/emails/ai/task-suggestions',
      requestType: 'TASK_SUGGESTION',
      userRole,
      businessContext: 'email_to_task',
      success: true,
      tokensUsed: Math.ceil(JSON.stringify(emailContent).length / 4), // Approximate tokens
      processingTime
    })

    return NextResponse.json({
      success: true,
      data: suggestion,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        processingTime
      }
    })
  } catch (error) {
    console.error('AI task suggestion API error:', error)
    
    // Log failed usage
    try {
      await aiDatabase.logUsage({
        userId,
        organizationId: 'unknown',
        endpoint: '/api/emails/ai/task-suggestions',
        requestType: 'TASK_SUGGESTION',
        userRole: 'UNKNOWN',
        businessContext: 'email_to_task',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      })
    } catch (logError) {
      console.error('Failed to log task suggestion error:', logError)
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'AI_ERROR',
          message: 'Failed to generate task suggestion',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

async function generateTaskSuggestion(emailContent: EmailContent): Promise<TaskSuggestion> {
  const { subject, body, fromAddress, attachments = [] } = emailContent
  
  // Extract key information
  const text = `${subject || ''} ${body || ''}`.toLowerCase()
  const hasAttachments = attachments.length > 0
  
  // Initialize suggestion
  let suggestion: TaskSuggestion = {
    title: subject || 'Task from email',
    description: '',
    priority: 'MEDIUM',
    tags: [],
    confidence: 0.5,
    reasoning: []
  }

  // Analyze content for task characteristics
  const analysis = analyzeEmailContent(text, fromAddress, hasAttachments)
  
  // Generate title
  suggestion.title = generateTitle(subject, analysis)
  suggestion.reasoning.push(`Generated title based on email subject: "${subject}"`)
  
  // Determine priority
  suggestion.priority = determinePriority(text, analysis)
  suggestion.reasoning.push(`Priority set to ${suggestion.priority} based on content analysis`)
  
  // Generate tags
  suggestion.tags = generateTags(text, fromAddress, analysis)
  if (suggestion.tags.length > 0) {
    suggestion.reasoning.push(`Added tags: ${suggestion.tags.join(', ')}`)
  }
  
  // Generate description
  suggestion.description = generateDescription(body, analysis)
  
  // Calculate confidence
  suggestion.confidence = calculateConfidence(analysis)
  
  return suggestion
}

interface ContentAnalysis {
  isUrgent: boolean
  isRequest: boolean
  isComplaint: boolean
  isInquiry: boolean
  isDeadline: boolean
  isFollowUp: boolean
  isInternal: boolean
  isClient: boolean
  hasNumbers: boolean
  hasDocuments: boolean
  domain: string
  keywords: string[]
}

function analyzeEmailContent(text: string, fromAddress: string, hasAttachments: boolean): ContentAnalysis {
  const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline']
  const requestKeywords = ['please', 'request', 'need', 'require', 'can you', 'could you']
  const complaintKeywords = ['issue', 'problem', 'error', 'wrong', 'mistake', 'complaint']
  const inquiryKeywords = ['question', 'inquiry', 'clarification', 'information', 'details']
  const deadlineKeywords = ['due', 'deadline', 'by', 'before', 'until', 'expires']
  const followUpKeywords = ['follow up', 'following up', 'reminder', 'checking in']
  
  const domain = fromAddress.split('@')[1] || ''
  const isInternal = domain.includes('company.com') || domain.includes('internal') // Adjust based on organization
  
  return {
    isUrgent: urgentKeywords.some(keyword => text.includes(keyword)),
    isRequest: requestKeywords.some(keyword => text.includes(keyword)),
    isComplaint: complaintKeywords.some(keyword => text.includes(keyword)),
    isInquiry: inquiryKeywords.some(keyword => text.includes(keyword)),
    isDeadline: deadlineKeywords.some(keyword => text.includes(keyword)),
    isFollowUp: followUpKeywords.some(keyword => text.includes(keyword)),
    isInternal: isInternal,
    isClient: !isInternal,
    hasNumbers: /\d/.test(text),
    hasDocuments: hasAttachments,
    domain,
    keywords: extractKeywords(text)
  }
}

function extractKeywords(text: string): string[] {
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall', 'this', 'that', 'these', 'those', 'a', 'an']
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
  
  // Count word frequency
  const wordCount: Record<string, number> = {}
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1
  })
  
  // Return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word)
}

function generateTitle(subject: string | undefined, analysis: ContentAnalysis): string {
  if (!subject) {
    if (analysis.isRequest) return 'Handle client request'
    if (analysis.isComplaint) return 'Resolve client issue'
    if (analysis.isInquiry) return 'Respond to inquiry'
    if (analysis.isFollowUp) return 'Follow up required'
    return 'Task from email'
  }
  
  // Clean up subject line
  let title = subject
    .replace(/^(re:|fwd?:|fw:)\s*/i, '')
    .replace(/\[.*?\]/g, '')
    .trim()
  
  // Add action prefix if needed
  if (analysis.isRequest && !title.toLowerCase().startsWith('handle')) {
    title = `Handle: ${title}`
  } else if (analysis.isComplaint && !title.toLowerCase().startsWith('resolve')) {
    title = `Resolve: ${title}`
  } else if (analysis.isInquiry && !title.toLowerCase().startsWith('respond')) {
    title = `Respond to: ${title}`
  }
  
  return title.length > 100 ? title.substring(0, 97) + '...' : title
}

function determinePriority(text: string, analysis: ContentAnalysis): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  let score = 0
  
  if (analysis.isUrgent) score += 3
  if (analysis.isDeadline) score += 2
  if (analysis.isComplaint) score += 2
  if (analysis.isClient) score += 1
  if (analysis.isFollowUp) score += 1
  
  if (score >= 4) return 'URGENT'
  if (score >= 2) return 'HIGH'
  if (score >= 1) return 'MEDIUM'
  return 'LOW'
}

function generateTags(text: string, fromAddress: string, analysis: ContentAnalysis): string[] {
  const tags: string[] = []
  
  // Source tags
  tags.push('email')
  if (analysis.isClient) tags.push('client')
  if (analysis.isInternal) tags.push('internal')
  
  // Type tags
  if (analysis.isRequest) tags.push('request')
  if (analysis.isComplaint) tags.push('issue')
  if (analysis.isInquiry) tags.push('inquiry')
  if (analysis.isFollowUp) tags.push('follow-up')
  
  // Content tags
  if (analysis.hasDocuments) tags.push('documents')
  if (analysis.hasNumbers) tags.push('data')
  
  // Domain-specific tags (customize based on CA firm needs)
  if (text.includes('audit')) tags.push('audit')
  if (text.includes('tax')) tags.push('tax')
  if (text.includes('compliance')) tags.push('compliance')
  if (text.includes('filing')) tags.push('filing')
  if (text.includes('return')) tags.push('tax-return')
  if (text.includes('gst')) tags.push('gst')
  if (text.includes('invoice')) tags.push('billing')
  
  return [...new Set(tags)] // Remove duplicates
}

function generateDescription(body: string | undefined, analysis: ContentAnalysis): string {
  if (!body) return ''
  
  // Clean and truncate body
  const cleanBody = body
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  let description = cleanBody.length > 500 ? cleanBody.substring(0, 497) + '...' : cleanBody
  
  // Add context based on analysis
  const context: string[] = []
  if (analysis.isUrgent) context.push('⚠️ Marked as urgent')
  if (analysis.isClient) context.push('👤 From client')
  if (analysis.hasDocuments) context.push('📎 Has attachments')
  
  if (context.length > 0) {
    description = `${context.join(' | ')}\n\n${description}`
  }
  
  return description
}

function calculateConfidence(analysis: ContentAnalysis): number {
  let confidence = 0.5 // Base confidence
  
  // Increase confidence based on clear indicators
  if (analysis.isUrgent) confidence += 0.2
  if (analysis.isRequest || analysis.isComplaint || analysis.isInquiry) confidence += 0.15
  if (analysis.isDeadline) confidence += 0.1
  if (analysis.keywords.length > 3) confidence += 0.1
  if (analysis.hasDocuments) confidence += 0.05
  
  return Math.min(confidence, 0.95) // Cap at 95%
}