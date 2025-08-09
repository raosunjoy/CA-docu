import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { taskService } from '@/services/task-service'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import type { CreateTaskRequest, Task } from '@/types/task'

// Schema for bulk task conversion from emails
const bulkConvertSchema = z.object({
  emails: z.array(z.object({
    emailId: z.string(),
    subject: z.string(),
    body: z.string().optional(),
    sender: z.string(),
    recipients: z.array(z.string()),
    receivedAt: z.string().datetime(),
    attachments: z.array(z.object({
      name: z.string(),
      size: z.number(),
      type: z.string()
    })).optional(),
    // Task generation parameters
    taskType: z.enum(['COMPLIANCE', 'AUDIT', 'TAX_FILING', 'CONSULTATION', 'REVIEW', 'RESEARCH', 'CLIENT_MEETING', 'DOCUMENTATION', 'FOLLOW_UP', 'ADMINISTRATIVE']).optional(),
    taskCategory: z.enum(['GST', 'INCOME_TAX', 'CORPORATE_TAX', 'AUDIT', 'COMPLIANCE', 'ADVISORY', 'LITIGATION', 'BUSINESS_SETUP', 'ANNUAL_FILINGS', 'OTHER']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
    assigneeId: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    extractCompliance: z.boolean().default(true),
    autoAssign: z.boolean().default(true)
  })),
  options: z.object({
    defaultAssigneeId: z.string().optional(),
    defaultTaskType: z.enum(['COMPLIANCE', 'AUDIT', 'TAX_FILING', 'CONSULTATION', 'REVIEW', 'RESEARCH', 'CLIENT_MEETING', 'DOCUMENTATION', 'FOLLOW_UP', 'ADMINISTRATIVE']).default('FOLLOW_UP'),
    defaultCategory: z.enum(['GST', 'INCOME_TAX', 'CORPORATE_TAX', 'AUDIT', 'COMPLIANCE', 'ADVISORY', 'LITIGATION', 'BUSINESS_SETUP', 'ANNUAL_FILINGS', 'OTHER']).default('OTHER'),
    defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).default('MEDIUM'),
    createApprovalWorkflow: z.boolean().default(false),
    enableAuditTrail: z.boolean().default(true),
    tagEmails: z.boolean().default(true),
    generateClientTasks: z.boolean().default(false)
  }).optional()
})

interface BulkConvertResult {
  successful: Array<{
    emailId: string
    taskId: string
    task: Task
  }>
  failed: Array<{
    emailId: string
    error: string
    emailSubject?: string
  }>
  summary: {
    totalEmails: number
    successfulConversions: number
    failedConversions: number
    tasksCreated: number
    complianceTasksDetected: number
    highPriorityTasks: number
  }
}

// POST /api/tasks/bulk/convert-to-tasks - Convert emails to tasks
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<BulkConvertResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<BulkConvertResult>>
    }

    const { user } = authResult
    const body = await request.json()
    const validatedData = bulkConvertSchema.parse(body)
    
    const result: BulkConvertResult = {
      successful: [],
      failed: [],
      summary: {
        totalEmails: validatedData.emails.length,
        successfulConversions: 0,
        failedConversions: 0,
        tasksCreated: 0,
        complianceTasksDetected: 0,
        highPriorityTasks: 0
      }
    }

    const options = validatedData.options || {}
    
    // Process each email and convert to task
    for (const email of validatedData.emails) {
      try {
        // AI-powered email analysis for task generation
        const taskAnalysis = await analyzeEmailForTask(email, options)
        
        // Create task request from email analysis
        const taskRequest: CreateTaskRequest = {
          title: taskAnalysis.suggestedTitle,
          description: taskAnalysis.suggestedDescription,
          type: email.taskType || taskAnalysis.detectedType || options.defaultTaskType,
          category: email.taskCategory || taskAnalysis.detectedCategory || options.defaultCategory,
          priority: email.priority || taskAnalysis.detectedPriority || options.defaultPriority,
          assigneeId: email.assigneeId || taskAnalysis.suggestedAssignee || options.defaultAssigneeId || user.sub,
          dueDate: email.dueDate ? new Date(email.dueDate) : taskAnalysis.suggestedDueDate,
          regulatoryRequirement: taskAnalysis.regulatoryRequirement,
          auditTrailRequired: options.enableAuditTrail,
          approvalRequired: options.createApprovalWorkflow || taskAnalysis.requiresApproval,
          tags: [
            'EMAIL_GENERATED',
            ...(options.tagEmails ? [`FROM:${email.sender}`, `EMAIL:${email.emailId.substring(0, 8)}`] : []),
            ...taskAnalysis.suggestedTags
          ],
          customFields: {
            emailId: email.emailId,
            originalSubject: email.subject,
            sender: email.sender,
            recipients: email.recipients,
            receivedAt: email.receivedAt,
            hasAttachments: (email.attachments?.length || 0) > 0,
            attachmentCount: email.attachments?.length || 0,
            emailAnalysis: taskAnalysis
          },
          emailId: email.emailId,
          sourceSystem: 'EMAIL_CONVERSION'
        }
        
        // Create the task
        const createdTask = await taskService.createTask(
          taskRequest,
          user.orgId,
          user.sub
        )
        
        result.successful.push({
          emailId: email.emailId,
          taskId: createdTask.id,
          task: createdTask
        })
        
        // Update summary statistics
        result.summary.successfulConversions++
        result.summary.tasksCreated++
        
        if (taskAnalysis.isComplianceRelated) {
          result.summary.complianceTasksDetected++
        }
        
        if (['HIGH', 'URGENT', 'CRITICAL'].includes(createdTask.priority)) {
          result.summary.highPriorityTasks++
        }
        
      } catch (error) {
        result.failed.push({
          emailId: email.emailId,
          error: error instanceof Error ? error.message : 'Failed to convert email to task',
          emailSubject: email.subject
        })
        result.summary.failedConversions++
      }
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        processingTime: `${result.summary.totalEmails} emails processed`,
        conversionRate: `${Math.round((result.summary.successfulConversions / result.summary.totalEmails) * 100)}%`
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid bulk conversion data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }
    
    console.error('Bulk email to task conversion error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to convert emails to tasks'
        }
      },
      { status: 500 }
    )
  }
}

// AI-powered email analysis for task generation
async function analyzeEmailForTask(email: any, options: any) {
  // This would be enhanced with actual AI/NLP processing
  const subject = email.subject.toLowerCase()
  const body = (email.body || '').toLowerCase()
  const sender = email.sender.toLowerCase()
  
  // Compliance keywords detection
  const complianceKeywords = [
    'gst', 'tax', 'filing', 'return', 'compliance', 'deadline', 'notice',
    'audit', 'assessment', 'penalty', 'appeal', 'refund', 'tds', 'tcs',
    'income tax', 'corporate tax', 'advance tax', 'self assessment',
    'mca', 'roc', 'annual filing', 'board resolution', 'agm', 'aoc',
    'sebi', 'listing', 'disclosure', 'insider trading', 'corporate governance'
  ]
  
  const urgencyKeywords = ['urgent', 'asap', 'immediate', 'today', 'tomorrow', 'deadline', 'due']
  const meetingKeywords = ['meeting', 'call', 'discussion', 'presentation', 'conference']
  const reviewKeywords = ['review', 'check', 'verify', 'approve', 'feedback']
  
  // Detect task type based on content
  let detectedType: any = options.defaultTaskType
  let detectedCategory: any = options.defaultCategory
  let detectedPriority: any = options.defaultPriority
  
  const contentText = `${subject} ${body}`
  
  // Type detection
  if (meetingKeywords.some(keyword => contentText.includes(keyword))) {
    detectedType = 'CLIENT_MEETING'
  } else if (reviewKeywords.some(keyword => contentText.includes(keyword))) {
    detectedType = 'REVIEW'
  } else if (complianceKeywords.some(keyword => contentText.includes(keyword))) {
    detectedType = 'COMPLIANCE'
  }
  
  // Category detection
  if (contentText.includes('gst')) {
    detectedCategory = 'GST'
  } else if (contentText.includes('income tax') || contentText.includes('itr')) {
    detectedCategory = 'INCOME_TAX'
  } else if (contentText.includes('audit')) {
    detectedCategory = 'AUDIT'
  }
  
  // Priority detection
  if (urgencyKeywords.some(keyword => contentText.includes(keyword))) {
    detectedPriority = 'HIGH'
  }
  
  // Extract due date from email content
  let suggestedDueDate: Date | undefined
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g
  const dateMatch = contentText.match(datePattern)
  if (dateMatch) {
    try {
      suggestedDueDate = new Date(dateMatch[0])
      if (suggestedDueDate <= new Date()) {
        suggestedDueDate = undefined // Ignore past dates
      }
    } catch {
      suggestedDueDate = undefined
    }
  }
  
  // Generate regulatory requirement if compliance-related
  let regulatoryRequirement
  if (detectedType === 'COMPLIANCE' && detectedCategory !== 'OTHER') {
    regulatoryRequirement = {
      type: detectedCategory === 'GST' ? 'GST' : 
            detectedCategory === 'INCOME_TAX' ? 'INCOME_TAX' : 
            detectedCategory === 'AUDIT' ? 'AUDIT' : 'OTHER',
      frequency: 'ONE_TIME',
      mandatoryDeadline: suggestedDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      penaltyApplicable: true
    }
  }
  
  return {
    suggestedTitle: email.subject.length > 100 ? 
      email.subject.substring(0, 97) + '...' : 
      email.subject,
    suggestedDescription: `Task created from email received from ${email.sender}.\n\nOriginal subject: ${email.subject}\n\n${email.body ? `Content preview: ${email.body.substring(0, 500)}${email.body.length > 500 ? '...' : ''}` : 'No content preview available'}`,
    detectedType,
    detectedCategory,
    detectedPriority,
    suggestedDueDate,
    regulatoryRequirement,
    isComplianceRelated: complianceKeywords.some(keyword => contentText.includes(keyword)),
    requiresApproval: detectedPriority === 'HIGH' || detectedType === 'COMPLIANCE',
    suggestedAssignee: null, // Would be determined by AI/rules
    suggestedTags: [
      detectedCategory,
      detectedType,
      ...(sender.includes('gov') || sender.includes('tax') ? ['GOVERNMENT'] : []),
      ...(contentText.includes('deadline') ? ['DEADLINE'] : []),
      ...(email.attachments?.length ? ['HAS_ATTACHMENTS'] : [])
    ].filter(tag => tag !== 'OTHER')
  }
}