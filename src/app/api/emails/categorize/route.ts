// Email Categorization API - Handle AI email categorization
import { NextRequest, NextResponse } from 'next/server'
import { aiDatabase } from '@/services/ai-database'
import { AISecurityMiddleware } from '@/middleware/ai-security'

interface EmailCategorizationRequest {
  emails: Array<{
    id: string
    subject: string
    fromName: string
    fromAddress: string
    bodyText?: string
    snippet?: string
    attachments?: any[]
  }>
  userRole?: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN'
  organizationId?: string
}

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

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  // Security middleware check
  const securityCheck = await AISecurityMiddleware.protect(request, '/api/emails/categorize')
  if (securityCheck) {
    return securityCheck // Return security error response
  }
  
  try {
    const body: EmailCategorizationRequest = await request.json()
    const { emails, userRole = 'ASSOCIATE', organizationId = 'demo-org' } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      // Log failed usage
      await aiDatabase.logUsage({
        userId: 'unknown',
        organizationId,
        endpoint: '/api/emails/categorize',
        requestType: 'EMAIL_CATEGORIZATION',
        userRole: userRole || 'UNKNOWN',
        businessContext: 'email_processing',
        success: false,
        errorMessage: 'Missing or invalid emails array',
        processingTime: Date.now() - startTime
      })

      return NextResponse.json(
        { error: 'Missing or invalid emails array' },
        { status: 400 }
      )
    }

    const categorizedEmails: CategorizedEmail[] = []

    // Process each email
    for (const email of emails) {
      const emailStartTime = Date.now()
      
      // Categorize email using rule-based system (in production, use AI)
      const categories = categorizeEmail(email, userRole)
      const aiSuggestions = generateEmailSuggestions(email, categories, userRole)

      categorizedEmails.push({
        id: email.id,
        categories,
        aiSuggestions,
        processingTime: Date.now() - emailStartTime
      })

      // Store email classification in database
      try {
        const avgConfidence = categories.reduce((sum, cat) => sum + cat.confidence, 0) / categories.length
        
        await aiDatabase.storeEmailClassification({
          emailId: email.id,
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            confidence: cat.confidence,
            priority: cat.priority
          })),
          priority: aiSuggestions.urgencyLevel,
          confidence: avgConfidence,
          suggestedActions: categories.flatMap(cat => cat.suggestedActions),
          requiresResponse: aiSuggestions.requiresResponse,
          estimatedResponseTime: aiSuggestions.estimatedResponseTime
        })
      } catch (dbError) {
        console.error('Failed to store email classification:', dbError)
        // Don't fail the request if database storage fails
      }
    }

    const totalProcessingTime = Date.now() - startTime

    // Log successful usage
    await aiDatabase.logUsage({
      userId: 'system',
      organizationId,
      endpoint: '/api/emails/categorize',
      requestType: 'EMAIL_CATEGORIZATION',
      userRole,
      businessContext: 'email_processing',
      success: true,
      tokensUsed: emails.length * 10, // Mock token usage
      processingTime: totalProcessingTime
    })

    return NextResponse.json({
      success: true,
      data: {
        categorizedEmails,
        summary: {
          totalEmails: emails.length,
          avgProcessingTime: totalProcessingTime / emails.length,
          totalProcessingTime,
          categoriesFound: [...new Set(categorizedEmails.flatMap(e => e.categories.map(c => c.name)))],
          highPriorityEmails: categorizedEmails.filter(e => 
            e.categories.some(c => c.priority === 'HIGH')
          ).length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email categorization error:', error)
    
    // Log failed usage
    try {
      await aiDatabase.logUsage({
        userId: 'unknown',
        organizationId: 'demo-org',
        endpoint: '/api/emails/categorize',
        requestType: 'EMAIL_CATEGORIZATION',
        userRole: 'UNKNOWN',
        businessContext: 'email_processing',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      })
    } catch (logError) {
      console.error('Failed to log email categorization error:', logError)
    }
    
    return NextResponse.json(
      {
        error: 'Categorization failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

function categorizeEmail(email: any, userRole: string): EmailCategory[] {
  const categories: EmailCategory[] = []
  const subject = (email.subject || '').toLowerCase()
  const body = (email.bodyText || email.snippet || '').toLowerCase()
  
  // Tax & Compliance
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

  return categories.slice(0, 3) // Limit to top 3 categories
}

function generateEmailSuggestions(email: any, categories: EmailCategory[], userRole: string): any {
  const hasHighPriorityCategory = categories.some(cat => cat.priority === 'HIGH')
  const hasAttachments = email.attachments && email.attachments.length > 0
  const isFromClient = email.fromAddress && !email.fromAddress.includes('@company.com')

  const suggestions = {
    shouldCreateTask: false,
    taskTitle: '',
    taskPriority: 'MEDIUM' as const,
    requiresResponse: false,
    urgencyLevel: 'MEDIUM' as const,
    estimatedResponseTime: ''
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

  // Role-specific adjustments
  if (userRole === 'PARTNER' && hasHighPriorityCategory) {
    suggestions.estimatedResponseTime = '2 hours'
  } else if (userRole === 'INTERN') {
    suggestions.taskPriority = 'MEDIUM'
    suggestions.estimatedResponseTime = '48 hours'
  }

  return suggestions
}

// Health check endpoint
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'Email Categorization API is operational',
    version: '1.0.0',
    capabilities: ['EMAIL_CLASSIFICATION', 'PRIORITY_DETECTION', 'TASK_SUGGESTIONS'],
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}