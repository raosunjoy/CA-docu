import { prisma } from '@/lib/prisma'
import { openaiService } from './openai-service'
import { taskService } from '../lib/task-service'
import { EmailData, TaskCreationData, TaskPriority, TaskStatus } from '@/types'

interface EmailWorkflowRule {
  id: string
  name: string
  conditions: EmailCondition[]
  actions: EmailAction[]
  priority: number
  isActive: boolean
}

interface EmailCondition {
  field: 'from' | 'subject' | 'body' | 'attachments' | 'labels'
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex'
  value: string
  caseSensitive?: boolean
}

interface EmailAction {
  type: 'create_task' | 'assign_tags' | 'move_folder' | 'auto_reply' | 'forward' | 'escalate'
  config: Record<string, any>
}

interface EmailInsights {
  category: string
  priority: TaskPriority
  urgency: 'low' | 'medium' | 'high' | 'urgent'
  clientMatch?: string
  suggestedActions: string[]
  extractedData: Record<string, any>
  confidence: number
}

export class EmailWorkflowAutomationService {
  private rules: EmailWorkflowRule[] = []

  async initialize() {
    await this.loadWorkflowRules()
  }

  private async loadWorkflowRules() {
    // Load rules from database or configuration
    this.rules = [
      {
        id: 'tax-notice-workflow',
        name: 'Tax Notice Response',
        conditions: [
          { field: 'from', operator: 'contains', value: '@incometax.gov.in' },
          { field: 'subject', operator: 'contains', value: 'notice' }
        ],
        actions: [
          {
            type: 'create_task',
            config: {
              title: 'Respond to Tax Notice',
              priority: 'HIGH',
              estimatedHours: 4,
              dueDate: '+7days'
            }
          },
          {
            type: 'assign_tags',
            config: { tags: ['tax-notice', 'compliance', 'urgent'] }
          }
        ],
        priority: 1,
        isActive: true
      },
      {
        id: 'client-document-request',
        name: 'Client Document Request',
        conditions: [
          { field: 'subject', operator: 'contains', value: 'document' },
          { field: 'body', operator: 'contains', value: 'please send' }
        ],
        actions: [
          {
            type: 'create_task',
            config: {
              title: 'Prepare Client Documents',
              priority: 'MEDIUM',
              estimatedHours: 2
            }
          }
        ],
        priority: 2,
        isActive: true
      },
      {
        id: 'audit-deadline',
        name: 'Audit Deadline Reminder',
        conditions: [
          { field: 'subject', operator: 'contains', value: 'audit' },
          { field: 'subject', operator: 'contains', value: 'deadline' }
        ],
        actions: [
          {
            type: 'create_task',
            config: {
              title: 'Complete Audit Before Deadline',
              priority: 'HIGH',
              estimatedHours: 8
            }
          },
          {
            type: 'escalate',
            config: { escalateTo: 'manager', reason: 'audit_deadline' }
          }
        ],
        priority: 1,
        isActive: true
      }
    ]
  }

  async processEmail(emailData: EmailData, organizationId: string): Promise<{
    insights: EmailInsights
    actionsPerformed: string[]
    tasksCreated: string[]
  }> {
    try {
      // Step 1: Generate AI insights for the email
      const insights = await this.generateEmailInsights(emailData)
      
      // Step 2: Match email against workflow rules
      const matchingRules = this.matchWorkflowRules(emailData, insights)
      
      // Step 3: Execute actions from matching rules
      const actionsPerformed: string[] = []
      const tasksCreated: string[] = []
      
      for (const rule of matchingRules) {
        for (const action of rule.actions) {
          const result = await this.executeAction(action, emailData, insights, organizationId)
          actionsPerformed.push(`${rule.name}: ${action.type}`)
          
          if (action.type === 'create_task' && result.taskId) {
            tasksCreated.push(result.taskId)
          }
        }
      }
      
      return {
        insights,
        actionsPerformed,
        tasksCreated
      }
      
    } catch (error) {
      console.error('Email workflow processing error:', error)
      throw new Error('Failed to process email workflow')
    }
  }

  private async generateEmailInsights(emailData: EmailData): Promise<EmailInsights> {
    const prompt = `
      Analyze this email for a CA firm and provide structured insights:
      
      From: ${emailData.fromAddress}
      Subject: ${emailData.subject}
      Body: ${emailData.bodyText?.substring(0, 1000)}
      
      Please categorize and analyze this email:
      1. What category does this email belong to? (client_inquiry, tax_notice, document_request, compliance, internal, etc.)
      2. What priority should this have? (LOW, MEDIUM, HIGH, URGENT)
      3. What is the urgency level? (low, medium, high, urgent)
      4. Can you identify any client names or references?
      5. What actions should be taken?
      6. Extract any important dates, amounts, or deadlines
      7. How confident are you in this analysis? (0.0 to 1.0)
      
      Respond in JSON format.
    `

    try {
      const response = await openaiService.generateCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 800
      })

      const insights = JSON.parse(response.content)
      
      return {
        category: insights.category || 'general',
        priority: insights.priority || 'MEDIUM',
        urgency: insights.urgency || 'medium',
        clientMatch: insights.clientMatch,
        suggestedActions: insights.suggestedActions || [],
        extractedData: insights.extractedData || {},
        confidence: insights.confidence || 0.7
      }
      
    } catch (error) {
      console.error('AI insights generation error:', error)
      return {
        category: 'general',
        priority: 'MEDIUM',
        urgency: 'medium',
        suggestedActions: ['Review manually'],
        extractedData: {},
        confidence: 0.5
      }
    }
  }

  private matchWorkflowRules(emailData: EmailData, insights: EmailInsights): EmailWorkflowRule[] {
    return this.rules
      .filter(rule => rule.isActive)
      .filter(rule => {
        return rule.conditions.every(condition => 
          this.evaluateCondition(condition, emailData, insights)
        )
      })
      .sort((a, b) => a.priority - b.priority)
  }

  private evaluateCondition(
    condition: EmailCondition, 
    emailData: EmailData, 
    insights: EmailInsights
  ): boolean {
    let fieldValue = ''
    
    switch (condition.field) {
      case 'from':
        fieldValue = emailData.fromAddress || ''
        break
      case 'subject':
        fieldValue = emailData.subject || ''
        break
      case 'body':
        fieldValue = emailData.bodyText || ''
        break
      case 'attachments':
        fieldValue = emailData.attachments?.map(a => a.filename).join(' ') || ''
        break
      default:
        return false
    }

    if (!condition.caseSensitive) {
      fieldValue = fieldValue.toLowerCase()
      condition.value = condition.value.toLowerCase()
    }

    switch (condition.operator) {
      case 'contains':
        return fieldValue.includes(condition.value)
      case 'equals':
        return fieldValue === condition.value
      case 'starts_with':
        return fieldValue.startsWith(condition.value)
      case 'ends_with':
        return fieldValue.endsWith(condition.value)
      case 'regex':
        try {
          const regex = new RegExp(condition.value, condition.caseSensitive ? '' : 'i')
          return regex.test(fieldValue)
        } catch {
          return false
        }
      default:
        return false
    }
  }

  private async executeAction(
    action: EmailAction, 
    emailData: EmailData, 
    insights: EmailInsights,
    organizationId: string
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      switch (action.type) {
        case 'create_task':
          return await this.createTaskFromEmail(action.config, emailData, insights, organizationId)
        
        case 'assign_tags':
          return await this.assignEmailTags(emailData, action.config.tags)
        
        case 'escalate':
          return await this.escalateEmail(emailData, action.config, organizationId)
        
        default:
          return { success: false, error: 'Unknown action type' }
      }
    } catch (error) {
      console.error(`Action execution error for ${action.type}:`, error)
      return { success: false, error: error.message }
    }
  }

  private async createTaskFromEmail(
    config: any, 
    emailData: EmailData, 
    insights: EmailInsights,
    organizationId: string
  ): Promise<{ success: boolean; taskId?: string }> {
    try {
      const dueDate = config.dueDate === '+7days' 
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : config.dueDate ? new Date(config.dueDate) : undefined

      const taskData: TaskCreationData = {
        title: config.title || `Email Task: ${emailData.subject}`,
        description: `
          Generated from email workflow automation
          
          Original Email:
          From: ${emailData.fromAddress}
          Subject: ${emailData.subject}
          Received: ${emailData.receivedAt}
          
          AI Analysis:
          Category: ${insights.category}
          Urgency: ${insights.urgency}
          Confidence: ${(insights.confidence * 100).toFixed(1)}%
          
          Suggested Actions:
          ${insights.suggestedActions.map(action => `- ${action}`).join('\n')}
          
          ${emailData.bodyText ? `Email Content:\n${emailData.bodyText.substring(0, 500)}...` : ''}
        `,
        status: TaskStatus.TODO,
        priority: config.priority || insights.priority,
        createdBy: 'system-automation',
        organizationId,
        dueDate,
        estimatedHours: config.estimatedHours || 2,
        metadata: {
          source: 'email_automation',
          emailId: emailData.externalId,
          automationRule: config.ruleName,
          aiInsights: insights
        }
      }

      const task = await prisma.task.create({
        data: taskData
      })

      return { success: true, taskId: task.id }
      
    } catch (error) {
      console.error('Task creation error:', error)
      return { success: false }
    }
  }

  private async assignEmailTags(emailData: EmailData, tags: string[]): Promise<{ success: boolean }> {
    try {
      // This would update the email with tags in the database
      // Implementation depends on your email storage structure
      console.log(`Assigning tags ${tags.join(', ')} to email ${emailData.externalId}`)
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  private async escalateEmail(
    emailData: EmailData, 
    config: any, 
    organizationId: string
  ): Promise<{ success: boolean }> {
    try {
      // Create escalation notification or task
      console.log(`Escalating email ${emailData.externalId} to ${config.escalateTo}`)
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  }

  async createCustomWorkflowRule(
    ruleData: Omit<EmailWorkflowRule, 'id'>, 
    organizationId: string
  ): Promise<string> {
    const rule: EmailWorkflowRule = {
      ...ruleData,
      id: `custom_${Date.now()}`
    }
    
    this.rules.push(rule)
    
    // In a real implementation, this would be stored in the database
    return rule.id
  }

  async getWorkflowStatistics(organizationId: string): Promise<{
    totalEmailsProcessed: number
    tasksCreated: number
    rulesTriggered: Record<string, number>
    averageProcessingTime: number
  }> {
    // This would query actual statistics from the database
    return {
      totalEmailsProcessed: 1250,
      tasksCreated: 89,
      rulesTriggered: {
        'tax-notice-workflow': 23,
        'client-document-request': 45,
        'audit-deadline': 12
      },
      averageProcessingTime: 2.3
    }
  }
}

export const emailWorkflowAutomation = new EmailWorkflowAutomationService()