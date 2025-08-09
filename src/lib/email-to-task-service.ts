// Email-to-Task AI Service
// Converts emails into tasks using AI categorization and extraction

import { openaiService } from '../services/openai-service'
import { prisma } from './prisma'
import { taskService } from './task-service'
import type { EmailMessage } from '../types'
import type { TaskPriority, TaskStatus } from '../../generated/prisma'

interface TaskExtractionResult {
  title: string
  description: string
  priority: TaskPriority
  dueDate?: Date
  assigneeEmail?: string
  tags: string[]
  category: 'compliance' | 'audit' | 'tax' | 'client_communication' | 'document_review' | 'general'
  estimatedHours?: number
  actionItems: string[]
  context: {
    clientName?: string
    documentTypes?: string[]
    deadlines?: string[]
    urgencyIndicators: string[]
  }
}

interface EmailAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'urgent'
  isActionRequired: boolean
  hasDeadlines: boolean
  containsAttachments: boolean
  clientMentioned: boolean
  complianceRelated: boolean
  confidence: number
}

export class EmailToTaskService {
  private readonly AI_PROMPT_TEMPLATE = `
    You are an AI assistant specialized in analyzing emails for Indian CA (Chartered Accountant) firms. 
    Your job is to extract actionable tasks from email content and categorize them appropriately.
    
    Context: This email is from a CA firm's inbox. Common activities include:
    - Tax filing and compliance (GST, ITR, TDS)
    - Statutory audits and reviews
    - Client communication and follow-ups
    - Document preparation and review
    - Regulatory deadlines (ROC, GSTN, etc.)
    
    Please analyze the following email and extract task information:
    
    FROM: {from}
    TO: {to}
    SUBJECT: {subject}
    DATE: {date}
    
    EMAIL CONTENT:
    {content}
    
    Please provide a JSON response with the following structure:
    {
      "title": "Concise task title (max 60 chars)",
      "description": "Detailed task description with context",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dueDate": "ISO date string if deadline mentioned, null otherwise",
      "assigneeEmail": "Email of person mentioned for assignment, null if not specified",
      "tags": ["relevant", "tags", "from", "content"],
      "category": "compliance" | "audit" | "tax" | "client_communication" | "document_review" | "general",
      "estimatedHours": number or null,
      "actionItems": ["specific", "actionable", "items"],
      "context": {
        "clientName": "Client name if mentioned",
        "documentTypes": ["documents", "mentioned"],
        "deadlines": ["deadline", "phrases"],
        "urgencyIndicators": ["urgent", "phrases", "found"]
      },
      "analysis": {
        "sentiment": "positive" | "negative" | "neutral" | "urgent",
        "isActionRequired": boolean,
        "hasDeadlines": boolean,
        "containsAttachments": boolean,
        "clientMentioned": boolean,
        "complianceRelated": boolean,
        "confidence": number between 0-1
      }
    }
    
    Guidelines:
    1. If no clear action is required, set isActionRequired to false
    2. Look for Indian regulatory terms (GST, ITR, TDS, ROC, ICAI, etc.)
    3. Identify client names, company names, or individual names
    4. Extract specific dates, deadlines, or time references
    5. Determine urgency from phrases like "urgent", "ASAP", "immediate", etc.
    6. Consider CA-specific workflows and terminology
  `

  async analyzeEmail(email: EmailMessage): Promise<{
    shouldCreateTask: boolean
    taskData?: TaskExtractionResult
    analysis: EmailAnalysis
  }> {
    try {
      const emailContent = email.bodyText || email.bodyHtml || email.snippet || ''
      
      const prompt = this.AI_PROMPT_TEMPLATE
        .replace('{from}', email.from)
        .replace('{to}', email.to || '')
        .replace('{subject}', email.subject)
        .replace('{date}', email.date.toISOString())
        .replace('{content}', emailContent)

      const response = await openaiService.generateCompletion([
        {
          role: 'system',
          content: 'You are an expert AI assistant for CA firms. Analyze emails and extract task information in valid JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500
      })

      const aiResponse = JSON.parse(response)
      
      return {
        shouldCreateTask: aiResponse.analysis.isActionRequired && aiResponse.analysis.confidence > 0.6,
        taskData: aiResponse.analysis.isActionRequired ? aiResponse : undefined,
        analysis: aiResponse.analysis
      }
    } catch (error) {
      console.error('Failed to analyze email with AI:', error)
      
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(email)
    }
  }

  private fallbackAnalysis(email: EmailMessage): {
    shouldCreateTask: boolean
    taskData?: TaskExtractionResult
    analysis: EmailAnalysis
  } {
    const content = (email.bodyText || email.bodyHtml || email.snippet || '').toLowerCase()
    const subject = email.subject.toLowerCase()
    
    // Rule-based indicators
    const urgentKeywords = ['urgent', 'asap', 'immediate', 'emergency', 'critical']
    const actionKeywords = ['please', 'request', 'need', 'require', 'submit', 'prepare', 'review', 'complete']
    const complianceKeywords = ['gst', 'itr', 'tds', 'audit', 'filing', 'compliance', 'deadline', 'roc']
    const deadlineKeywords = ['deadline', 'due date', 'by tomorrow', 'end of month', 'before']
    
    const hasUrgent = urgentKeywords.some(keyword => content.includes(keyword) || subject.includes(keyword))
    const hasAction = actionKeywords.some(keyword => content.includes(keyword) || subject.includes(keyword))
    const hasCompliance = complianceKeywords.some(keyword => content.includes(keyword) || subject.includes(keyword))
    const hasDeadline = deadlineKeywords.some(keyword => content.includes(keyword))
    
    const isActionRequired = hasAction && (hasCompliance || hasUrgent || hasDeadline)
    
    const analysis: EmailAnalysis = {
      sentiment: hasUrgent ? 'urgent' : 'neutral',
      isActionRequired,
      hasDeadlines: hasDeadline,
      containsAttachments: email.hasAttachments,
      clientMentioned: this.extractClientName(content) !== null,
      complianceRelated: hasCompliance,
      confidence: isActionRequired ? 0.7 : 0.3
    }

    let taskData: TaskExtractionResult | undefined
    if (isActionRequired) {
      taskData = {
        title: this.generateTaskTitle(email.subject),
        description: `Email from ${email.from}: ${email.subject}\n\n${email.snippet}`,
        priority: hasUrgent ? 'URGENT' : hasCompliance ? 'HIGH' : 'MEDIUM',
        tags: ['email-generated', ...(hasCompliance ? ['compliance'] : [])],
        category: hasCompliance ? 'compliance' : 'client_communication',
        actionItems: this.extractActionItems(content),
        context: {
          clientName: this.extractClientName(content),
          urgencyIndicators: urgentKeywords.filter(keyword => content.includes(keyword))
        }
      }
    }

    return {
      shouldCreateTask: isActionRequired,
      taskData,
      analysis
    }
  }

  private generateTaskTitle(subject: string): string {
    // Clean up email subject to create a task title
    let title = subject
      .replace(/^(re:|fwd?:|fw:)\s*/i, '') // Remove reply/forward prefixes
      .replace(/^\[.*?\]\s*/, '') // Remove bracketed prefixes
      .trim()
    
    if (title.length > 60) {
      title = `${title.substring(0, 57)  }...`
    }
    
    return title || 'Email Follow-up Required'
  }

  private extractClientName(content: string): string | null {
    // Simple client name extraction patterns
    const patterns = [
      /client:\s*([a-zA-Z\s]+)/i,
      /company:\s*([a-zA-Z\s]+)/i,
      /([a-zA-Z\s]+)\s+(ltd|limited|pvt|private)/i,
      /dear\s+([a-zA-Z\s]+),/i
    ]
    
    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return null
  }

  private extractActionItems(content: string): string[] {
    const actionItems: string[] = []
    
    // Look for numbered lists or bullet points
    const listPatterns = [
      /\d+\.\s*([^\n]+)/g,
      /[-*•]\s*([^\n]+)/g,
      /please\s+([^.]+)/gi,
      /need\s+to\s+([^.]+)/gi
    ]
    
    for (const pattern of listPatterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          actionItems.push(match[1].trim())
        }
      }
    }
    
    return actionItems.slice(0, 5) // Limit to 5 action items
  }

  async convertEmailToTask(
    email: EmailMessage, 
    organizationId: string, 
    userId: string,
    accountId: string
  ): Promise<{
    success: boolean
    taskId?: string
    confidence: number
    analysis: EmailAnalysis
  }> {
    try {
      const result = await this.analyzeEmail(email)
      
      if (!result.shouldCreateTask || !result.taskData) {
        return {
          success: false,
          confidence: result.analysis.confidence,
          analysis: result.analysis
        }
      }

      // Find or assign user based on email
      let assignedUserId = userId
      if (result.taskData.assigneeEmail) {
        const assigneeUser = await prisma.user.findFirst({
          where: {
            email: result.taskData.assigneeEmail,
            organizationId
          }
        })
        if (assigneeUser) {
          assignedUserId = assigneeUser.id
        }
      }

      // Create the task
      const task = await taskService.createTask({
        title: result.taskData.title,
        description: result.taskData.description,
        priority: result.taskData.priority,
        status: 'TODO' as TaskStatus,
        dueDate: result.taskData.dueDate,
        estimatedHours: result.taskData.estimatedHours,
        assignedTo: assignedUserId,
        organizationId,
        createdBy: userId,
        metadata: {
          source: 'email',
          emailId: email.id,
          emailSubject: email.subject,
          emailFrom: email.from,
          emailDate: email.date,
          aiGenerated: true,
          confidence: result.analysis.confidence,
          category: result.taskData.category,
          actionItems: result.taskData.actionItems,
          context: result.taskData.context
        }
      })

      // Create tags for the task
      if (result.taskData.tags.length > 0) {
        await this.createTaskTags(task.id, result.taskData.tags, organizationId, userId)
      }

      // Link email to task
      await this.linkEmailToTask(email.id, task.id, accountId)

      return {
        success: true,
        taskId: task.id,
        confidence: result.analysis.confidence,
        analysis: result.analysis
      }
    } catch (error) {
      console.error('Failed to convert email to task:', error)
      return {
        success: false,
        confidence: 0,
        analysis: {
          sentiment: 'neutral',
          isActionRequired: false,
          hasDeadlines: false,
          containsAttachments: email.hasAttachments,
          clientMentioned: false,
          complianceRelated: false,
          confidence: 0
        }
      }
    }
  }

  private async createTaskTags(taskId: string, tagNames: string[], organizationId: string, userId: string): Promise<void> {
    for (const tagName of tagNames) {
      try {
        // Find or create tag
        let tag = await prisma.tag.findFirst({
          where: {
            name: tagName,
            organizationId
          }
        })

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagName,
              organizationId,
              createdBy: userId,
              color: this.generateTagColor(tagName)
            }
          })
        }

        // Link tag to task
        await prisma.tagging.create({
          data: {
            tagId: tag.id,
            entityId: taskId,
            entityType: 'Task',
            organizationId,
            createdBy: userId
          }
        })
      } catch (error) {
        console.error(`Failed to create tag ${tagName}:`, error)
      }
    }
  }

  private generateTagColor(tagName: string): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green  
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316'  // Orange
    ]
    
    const hash = tagName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  private async linkEmailToTask(emailId: string, taskId: string, accountId: string): Promise<void> {
    // Update email to reference the created task
    await prisma.email.update({
      where: { id: emailId },
      data: {
        metadata: {
          taskId,
          processedAt: new Date(),
          convertedToTask: true
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_CONVERTED_TO_TASK',
        entityType: 'Task',
        entityId: taskId,
        details: {
          emailId,
          emailSubject: 'Email converted to task',
          accountId
        },
        userId: 'system', // System-generated
        organizationId: 'system'
      }
    })
  }

  async batchProcessEmails(
    emails: EmailMessage[], 
    organizationId: string, 
    userId: string,
    accountId: string
  ): Promise<{
    processed: number
    tasksCreated: number
    errors: number
    results: Array<{
      emailId: string
      taskCreated: boolean
      taskId?: string
      confidence: number
    }>
  }> {
    const results = []
    let tasksCreated = 0
    let errors = 0

    for (const email of emails) {
      try {
        const result = await this.convertEmailToTask(email, organizationId, userId, accountId)
        
        results.push({
          emailId: email.id,
          taskCreated: result.success,
          taskId: result.taskId,
          confidence: result.confidence
        })

        if (result.success) {
          tasksCreated++
        }
      } catch (error) {
        console.error(`Failed to process email ${email.id}:`, error)
        errors++
        results.push({
          emailId: email.id,
          taskCreated: false,
          confidence: 0
        })
      }
    }

    return {
      processed: emails.length,
      tasksCreated,
      errors,
      results
    }
  }
}

export const emailToTaskService = new EmailToTaskService()