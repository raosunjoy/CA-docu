import { OpenAI } from 'openai'
import { EmailMessage, EmailAIAnalysis } from './email-integration'

export interface TaskConversionRequest {
  emailId: string
  userId: string
  organizationId: string
  conversionType: 'automatic' | 'manual' | 'batch'
  preferences: ConversionPreferences
}

export interface ConversionPreferences {
  autoAssign: boolean
  defaultAssignee?: string
  priorityMapping: Record<string, TaskPriority>
  categoryMapping: Record<string, TaskCategory>
  dueDateExtraction: boolean
  createSubtasks: boolean
  linkToClient: boolean
  notifyAssignee: boolean
}

export interface TaskPriority {
  level: 'low' | 'medium' | 'high' | 'urgent'
  reasoning: string
}

export interface TaskCategory {
  primary: string
  secondary?: string
  tags: string[]
}

export interface ConvertedTask {
  id: string
  emailId: string
  title: string
  description: string
  priority: TaskPriority['level']
  category: TaskCategory
  assignee?: string
  dueDate?: Date
  estimatedHours?: number
  subtasks: SubTask[]
  attachments: TaskAttachment[]
  clientId?: string
  projectId?: string
  metadata: TaskMetadata
  confidence: number
}

export interface SubTask {
  id: string
  title: string
  description: string
  order: number
  completed: boolean
  dueDate?: Date
  assignee?: string
  dependencies: string[]
}

export interface TaskAttachment {
  id: string
  name: string
  type: string
  size: number
  sourceEmailAttachmentId: string
}

export interface TaskMetadata {
  conversionMethod: 'automatic' | 'manual'
  aiConfidence: number
  originalEmailSubject: string
  senderEmail: string
  extractedEntities: string[]
  suggestedWorkflow?: string
  complianceRequirements?: string[]
}

export interface ConversionRule {
  id: string
  name: string
  description: string
  triggers: ConversionTrigger[]
  taskTemplate: TaskTemplate
  enabled: boolean
  priority: number
  organizationId: string
  createdBy: string
}

export interface ConversionTrigger {
  type: 'keyword' | 'sender' | 'subject_pattern' | 'ai_category' | 'priority' | 'date_mentioned'
  condition: TriggerCondition
}

export interface TriggerCondition {
  field: string
  operator: 'contains' | 'equals' | 'regex' | 'greater_than' | 'less_than'
  value: any
  caseSensitive?: boolean
}

export interface TaskTemplate {
  titlePattern: string
  descriptionTemplate: string
  defaultPriority: TaskPriority['level']
  defaultCategory: string
  assignmentRules: AssignmentRule[]
  dueDateRules: DueDateRule[]
  subtaskTemplates: SubTaskTemplate[]
  workflowId?: string
}

export interface AssignmentRule {
  condition: string
  assignee: string
  weight: number
}

export interface DueDateRule {
  pattern: string
  daysOffset: number
  businessDaysOnly: boolean
}

export interface SubTaskTemplate {
  title: string
  description: string
  order: number
  condition?: string
  estimatedHours?: number
}

export interface ConversionBatch {
  id: string
  emails: string[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results: BatchConversionResult[]
  startedAt: Date
  completedAt?: Date
  totalEmails: number
  successfulConversions: number
  failedConversions: number
}

export interface BatchConversionResult {
  emailId: string
  success: boolean
  taskId?: string
  error?: string
  confidence?: number
}

export interface ConversionAnalytics {
  totalConversions: number
  successRate: number
  averageConfidence: number
  categoryDistribution: Record<string, number>
  priorityDistribution: Record<string, number>
  assigneeDistribution: Record<string, number>
  conversionTimeMs: number[]
}

export class SmartEmailToTaskConverter {
  private openai: OpenAI
  private conversionRules: ConversionRule[] = []
  private activeBatches: Map<string, ConversionBatch> = new Map()
  private conversionHistory: Map<string, ConvertedTask> = new Map()
  private analytics: ConversionAnalytics

  constructor(config: { openaiApiKey: string }) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.analytics = {
      totalConversions: 0,
      successRate: 0,
      averageConfidence: 0,
      categoryDistribution: {},
      priorityDistribution: {},
      assigneeDistribution: {},
      conversionTimeMs: []
    }
    this.initializeDefaultRules()
  }

  /**
   * Converts a single email to task with AI assistance
   */
  async convertEmailToTask(
    email: EmailMessage,
    request: TaskConversionRequest
  ): Promise<ConvertedTask> {
    const startTime = Date.now()
    
    try {
      // Check for existing conversion
      const existingTask = this.conversionHistory.get(email.id)
      if (existingTask && request.conversionType === 'automatic') {
        return existingTask
      }

      // Apply conversion rules first
      const applicableRules = this.getApplicableRules(email)
      let task: ConvertedTask | null = null

      if (applicableRules.length > 0) {
        task = await this.convertWithRules(email, applicableRules[0], request)
      }

      // If no rules apply or manual conversion, use AI
      if (!task || request.conversionType === 'manual') {
        task = await this.convertWithAI(email, request)
      }

      // Apply user preferences
      task = this.applyConversionPreferences(task, request.preferences)

      // Store conversion
      this.conversionHistory.set(email.id, task)
      
      // Update analytics
      this.updateAnalytics(task, Date.now() - startTime)

      return task
    } catch (error) {
      console.error('Email to task conversion failed:', error)
      throw new Error(`Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Converts multiple emails to tasks in batch
   */
  async convertEmailsBatch(
    emailIds: string[],
    emails: EmailMessage[],
    request: Omit<TaskConversionRequest, 'emailId'>
  ): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const batch: ConversionBatch = {
      id: batchId,
      emails: emailIds,
      status: 'pending',
      results: [],
      startedAt: new Date(),
      totalEmails: emailIds.length,
      successfulConversions: 0,
      failedConversions: 0
    }

    this.activeBatches.set(batchId, batch)

    // Start batch processing asynchronously
    this.processBatch(batch, emails, request).catch(error => {
      console.error(`Batch processing failed for ${batchId}:`, error)
      batch.status = 'failed'
    })

    return batchId
  }

  /**
   * Suggests task conversion for an email
   */
  async suggestTaskConversion(email: EmailMessage): Promise<{
    shouldConvert: boolean
    confidence: number
    suggestedTask: Partial<ConvertedTask>
    reasoning: string
  }> {
    try {
      const suggestionPrompt = `
        Analyze this email to determine if it should be converted to a task:
        
        Subject: ${email.subject}
        From: ${email.from.email}
        Body: ${email.body.text.substring(0, 1500)}
        
        Consider:
        1. Does this email contain actionable requests?
        2. Are there deadlines or time-sensitive items?
        3. Does it require follow-up work?
        4. Is it a query that needs research/response?
        5. Are there compliance or regulatory requirements?
        
        Provide:
        - Should convert (yes/no with confidence 0-1)
        - Suggested task title and description
        - Priority level and reasoning
        - Estimated complexity
        - Recommended assignee type
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert task management assistant for CA firms. 
            Analyze emails to determine if they should be converted to actionable tasks.`
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        temperature: 0.3
      })

      const aiResponse = response.choices[0].message.content || '{}'
      return this.parseSuggestionResponse(aiResponse, email)
    } catch (error) {
      console.error('Task suggestion failed:', error)
      return {
        shouldConvert: false,
        confidence: 0,
        suggestedTask: {},
        reasoning: 'Analysis failed'
      }
    }
  }

  /**
   * Creates a conversion rule for automatic email-to-task conversion
   */
  createConversionRule(rule: Omit<ConversionRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const conversionRule: ConversionRule = {
      id: ruleId,
      ...rule
    }

    this.conversionRules.push(conversionRule)
    this.conversionRules.sort((a, b) => b.priority - a.priority)

    return ruleId
  }

  /**
   * Extracts action items from email content using AI
   */
  async extractActionItems(email: EmailMessage): Promise<{
    actionItems: ActionItem[]
    confidence: number
  }> {
    try {
      const extractionPrompt = `
        Extract specific action items from this email:
        
        Subject: ${email.subject}
        Body: ${email.body.text}
        
        Identify:
        1. Specific tasks that need to be done
        2. Deadlines or due dates mentioned
        3. Who should do each task
        4. Priority indicators
        5. Dependencies between tasks
        
        Return structured action items with confidence scores.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting actionable items from business emails. Be specific and practical.'
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.2
      })

      const aiResponse = response.choices[0].message.content || '{"actionItems": []}'
      return this.parseActionItemsResponse(aiResponse)
    } catch (error) {
      console.error('Action item extraction failed:', error)
      return { actionItems: [], confidence: 0 }
    }
  }

  /**
   * Gets conversion analytics
   */
  getConversionAnalytics(): ConversionAnalytics {
    return { ...this.analytics }
  }

  /**
   * Gets conversion history
   */
  getConversionHistory(): ConvertedTask[] {
    return Array.from(this.conversionHistory.values())
  }

  /**
   * Gets active batch conversions
   */
  getActiveBatches(): ConversionBatch[] {
    return Array.from(this.activeBatches.values())
  }

  /**
   * Gets batch conversion status
   */
  getBatchStatus(batchId: string): ConversionBatch | null {
    return this.activeBatches.get(batchId) || null
  }

  /**
   * Private helper methods
   */
  private initializeDefaultRules(): void {
    // Tax return preparation rule
    this.createConversionRule({
      name: 'Tax Return Requests',
      description: 'Convert tax return related emails to tasks',
      triggers: [
        {
          type: 'keyword',
          condition: {
            field: 'body',
            operator: 'contains',
            value: 'tax return|ITR|income tax return',
            caseSensitive: false
          }
        }
      ],
      taskTemplate: {
        titlePattern: 'Prepare Tax Return - {client_name}',
        descriptionTemplate: 'Tax return preparation requested via email from {sender}.\n\nOriginal request:\n{email_body}',
        defaultPriority: 'high',
        defaultCategory: 'tax',
        assignmentRules: [
          {
            condition: 'client_type = "corporate"',
            assignee: 'senior_ca',
            weight: 1
          },
          {
            condition: 'client_type = "individual"',
            assignee: 'junior_ca',
            weight: 1
          }
        ],
        dueDateRules: [
          {
            pattern: 'due.*([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})',
            daysOffset: -3,
            businessDaysOnly: true
          }
        ],
        subtaskTemplates: [
          {
            title: 'Collect required documents',
            description: 'Gather all necessary documents from client',
            order: 1
          },
          {
            title: 'Review and verify data',
            description: 'Verify accuracy of financial data',
            order: 2
          },
          {
            title: 'Prepare and review return',
            description: 'Complete tax return preparation',
            order: 3
          }
        ]
      },
      enabled: true,
      priority: 10,
      organizationId: 'default',
      createdBy: 'system'
    })

    // Compliance deadline rule
    this.createConversionRule({
      name: 'Compliance Deadlines',
      description: 'Create tasks for compliance deadlines mentioned in emails',
      triggers: [
        {
          type: 'keyword',
          condition: {
            field: 'body',
            operator: 'contains',
            value: 'compliance|deadline|filing|regulatory|GST|ROC|MCA',
            caseSensitive: false
          }
        }
      ],
      taskTemplate: {
        titlePattern: 'Compliance Task - {subject}',
        descriptionTemplate: 'Compliance requirement identified from email.\n\nDetails:\n{email_body}',
        defaultPriority: 'high',
        defaultCategory: 'compliance',
        assignmentRules: [
          {
            condition: 'always',
            assignee: 'compliance_officer',
            weight: 1
          }
        ],
        dueDateRules: [
          {
            pattern: 'deadline.*([0-9]{1,2})[/-]([0-9]{1,2})[/-]([0-9]{4})',
            daysOffset: -5,
            businessDaysOnly: true
          }
        ],
        subtaskTemplates: [
          {
            title: 'Review compliance requirements',
            description: 'Analyze specific compliance requirements',
            order: 1
          },
          {
            title: 'Prepare necessary documents',
            description: 'Collect and prepare required documentation',
            order: 2
          },
          {
            title: 'File compliance documents',
            description: 'Submit compliance filing',
            order: 3
          }
        ]
      },
      enabled: true,
      priority: 9,
      organizationId: 'default',
      createdBy: 'system'
    })

    // General client query rule
    this.createConversionRule({
      name: 'Client Queries',
      description: 'Convert client queries to follow-up tasks',
      triggers: [
        {
          type: 'ai_category',
          condition: {
            field: 'category',
            operator: 'equals',
            value: 'inquiry'
          }
        }
      ],
      taskTemplate: {
        titlePattern: 'Client Query - {subject}',
        descriptionTemplate: 'Client query received from {sender}.\n\nQuery:\n{email_body}',
        defaultPriority: 'medium',
        defaultCategory: 'consultation',
        assignmentRules: [
          {
            condition: 'sender_type = "existing_client"',
            assignee: 'account_manager',
            weight: 1
          }
        ],
        dueDateRules: [
          {
            pattern: 'urgent|asap',
            daysOffset: 1,
            businessDaysOnly: true
          }
        ],
        subtaskTemplates: [
          {
            title: 'Research query requirements',
            description: 'Understand client requirements and research applicable regulations',
            order: 1
          },
          {
            title: 'Prepare response',
            description: 'Draft comprehensive response to client query',
            order: 2
          }
        ]
      },
      enabled: true,
      priority: 5,
      organizationId: 'default',
      createdBy: 'system'
    })
  }

  private getApplicableRules(email: EmailMessage): ConversionRule[] {
    return this.conversionRules.filter(rule => {
      if (!rule.enabled) return false
      
      return rule.triggers.every(trigger => {
        return this.evaluateTrigger(email, trigger)
      })
    })
  }

  private evaluateTrigger(email: EmailMessage, trigger: ConversionTrigger): boolean {
    const { condition } = trigger
    let fieldValue: any

    switch (trigger.type) {
      case 'keyword':
        fieldValue = condition.field === 'subject' ? email.subject : email.body.text
        break
      case 'sender':
        fieldValue = email.from.email
        break
      case 'subject_pattern':
        fieldValue = email.subject
        break
      case 'ai_category':
        fieldValue = email.aiAnalysis?.category.primary
        break
      case 'priority':
        fieldValue = email.aiAnalysis?.priority.level
        break
      default:
        return false
    }

    if (!fieldValue) return false

    const caseSensitive = condition.caseSensitive !== false
    const testValue = caseSensitive ? condition.value : String(condition.value).toLowerCase()
    const actualValue = caseSensitive ? String(fieldValue) : String(fieldValue).toLowerCase()

    switch (condition.operator) {
      case 'contains':
        return actualValue.includes(testValue)
      case 'equals':
        return actualValue === testValue
      case 'regex':
        return new RegExp(testValue).test(actualValue)
      default:
        return false
    }
  }

  private async convertWithRules(
    email: EmailMessage,
    rule: ConversionRule,
    request: TaskConversionRequest
  ): Promise<ConvertedTask> {
    const template = rule.taskTemplate
    const clientName = this.extractClientName(email)
    
    // Generate task from template
    const task: ConvertedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      emailId: email.id,
      title: this.populateTemplate(template.titlePattern, {
        client_name: clientName,
        subject: email.subject,
        sender: email.from.name || email.from.email
      }),
      description: this.populateTemplate(template.descriptionTemplate, {
        client_name: clientName,
        sender: email.from.name || email.from.email,
        email_body: email.body.text,
        subject: email.subject
      }),
      priority: template.defaultPriority,
      category: {
        primary: template.defaultCategory,
        tags: []
      },
      subtasks: template.subtaskTemplates.map(st => ({
        id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: st.title,
        description: st.description,
        order: st.order,
        completed: false,
        dependencies: []
      })),
      attachments: email.attachments.map(att => ({
        id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: att.name,
        type: att.mimeType,
        size: att.size,
        sourceEmailAttachmentId: att.id
      })),
      clientId: email.aiAnalysis?.clientMatching.clientId,
      metadata: {
        conversionMethod: 'automatic',
        aiConfidence: 0.8,
        originalEmailSubject: email.subject,
        senderEmail: email.from.email,
        extractedEntities: email.aiAnalysis?.entities.map(e => e.value) || [],
        suggestedWorkflow: template.workflowId
      },
      confidence: 0.8
    }

    // Apply assignment rules
    task.assignee = this.applyAssignmentRules(template.assignmentRules, email)
    
    // Apply due date rules
    task.dueDate = this.applyDueDateRules(template.dueDateRules, email)

    return task
  }

  private async convertWithAI(
    email: EmailMessage,
    request: TaskConversionRequest
  ): Promise<ConvertedTask> {
    const conversionPrompt = `
      Convert this email to a structured task for a CA firm:
      
      Email Details:
      From: ${email.from.email} (${email.from.name || 'Unknown'})
      Subject: ${email.subject}
      Body: ${email.body.text.substring(0, 2000)}
      
      Existing AI Analysis:
      Category: ${email.aiAnalysis?.category.primary || 'unknown'}
      Priority: ${email.aiAnalysis?.priority.level || 'medium'}
      Intent: ${email.aiAnalysis?.intent.type || 'unknown'}
      
      Generate:
      1. Clear, actionable task title
      2. Detailed task description
      3. Priority level with reasoning
      4. Category and relevant tags
      5. Estimated completion time
      6. Subtasks breakdown (if complex)
      7. Suggested assignee type
      8. Due date if mentioned or inferred
      9. Client matching if applicable
      
      Return as structured JSON.
    `

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert task management assistant for CA firms. 
          Convert emails into well-structured, actionable tasks with appropriate priorities and assignments.`
        },
        {
          role: 'user',
          content: conversionPrompt
        }
      ],
      temperature: 0.3
    })

    const aiResponse = response.choices[0].message.content || '{}'
    return this.parseAIConversionResponse(aiResponse, email, request)
  }

  private async processBatch(
    batch: ConversionBatch,
    emails: EmailMessage[],
    request: Omit<TaskConversionRequest, 'emailId'>
  ): Promise<void> {
    batch.status = 'processing'
    
    for (const email of emails) {
      try {
        const taskRequest: TaskConversionRequest = {
          ...request,
          emailId: email.id,
          conversionType: 'batch'
        }
        
        const convertedTask = await this.convertEmailToTask(email, taskRequest)
        
        batch.results.push({
          emailId: email.id,
          success: true,
          taskId: convertedTask.id,
          confidence: convertedTask.confidence
        })
        batch.successfulConversions++
      } catch (error) {
        batch.results.push({
          emailId: email.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        batch.failedConversions++
      }
    }
    
    batch.status = 'completed'
    batch.completedAt = new Date()
  }

  private applyConversionPreferences(
    task: ConvertedTask,
    preferences: ConversionPreferences
  ): ConvertedTask {
    // Apply auto-assignment
    if (preferences.autoAssign && !task.assignee && preferences.defaultAssignee) {
      task.assignee = preferences.defaultAssignee
    }

    // Apply priority mapping
    const priorityMapping = preferences.priorityMapping[task.category.primary]
    if (priorityMapping) {
      task.priority = priorityMapping.level
    }

    // Apply category mapping
    const categoryMapping = preferences.categoryMapping[task.category.primary]
    if (categoryMapping) {
      task.category = categoryMapping
    }

    // Link to client if enabled
    if (!preferences.linkToClient) {
      task.clientId = undefined
    }

    return task
  }

  private extractClientName(email: EmailMessage): string {
    // Try to extract client name from sender or content
    if (email.from.name) {
      return email.from.name
    }
    
    // Extract from email domain
    const domain = email.from.email.split('@')[1]
    const companyName = domain.split('.')[0]
    return companyName.charAt(0).toUpperCase() + companyName.slice(1)
  }

  private populateTemplate(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value)
    }
    return result
  }

  private applyAssignmentRules(rules: AssignmentRule[], email: EmailMessage): string | undefined {
    // Simple rule application - in production, use more sophisticated logic
    const highestWeightRule = rules.reduce((prev, current) => 
      current.weight > prev.weight ? current : prev
    )
    
    return highestWeightRule?.assignee
  }

  private applyDueDateRules(rules: DueDateRule[], email: EmailMessage): Date | undefined {
    for (const rule of rules) {
      const pattern = new RegExp(rule.pattern, 'i')
      const match = pattern.exec(email.body.text)
      
      if (match) {
        const today = new Date()
        const dueDate = new Date(today)
        dueDate.setDate(today.getDate() + rule.daysOffset)
        
        if (rule.businessDaysOnly) {
          // Adjust for business days (simplified)
          while (dueDate.getDay() === 0 || dueDate.getDay() === 6) {
            dueDate.setDate(dueDate.getDate() + 1)
          }
        }
        
        return dueDate
      }
    }
    
    return undefined
  }

  private parseSuggestionResponse(aiResponse: string, email: EmailMessage): {
    shouldConvert: boolean
    confidence: number
    suggestedTask: Partial<ConvertedTask>
    reasoning: string
  } {
    try {
      const parsed = JSON.parse(aiResponse)
      
      return {
        shouldConvert: parsed.shouldConvert || false,
        confidence: parsed.confidence || 0,
        suggestedTask: {
          title: parsed.suggestedTitle || email.subject,
          description: parsed.suggestedDescription || '',
          priority: parsed.suggestedPriority || 'medium',
          category: { primary: parsed.suggestedCategory || 'general', tags: [] }
        },
        reasoning: parsed.reasoning || 'No specific reasoning provided'
      }
    } catch {
      return {
        shouldConvert: false,
        confidence: 0,
        suggestedTask: {},
        reasoning: 'Failed to parse AI response'
      }
    }
  }

  private parseActionItemsResponse(aiResponse: string): {
    actionItems: ActionItem[]
    confidence: number
  } {
    try {
      const parsed = JSON.parse(aiResponse)
      return {
        actionItems: parsed.actionItems || [],
        confidence: parsed.confidence || 0
      }
    } catch {
      return {
        actionItems: [],
        confidence: 0
      }
    }
  }

  private parseAIConversionResponse(
    aiResponse: string,
    email: EmailMessage,
    request: TaskConversionRequest
  ): ConvertedTask {
    try {
      const parsed = JSON.parse(aiResponse)
      
      return {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        emailId: email.id,
        title: parsed.title || email.subject,
        description: parsed.description || email.body.text,
        priority: parsed.priority || 'medium',
        category: {
          primary: parsed.category || 'general',
          secondary: parsed.subcategory,
          tags: parsed.tags || []
        },
        assignee: parsed.assignee,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
        estimatedHours: parsed.estimatedHours,
        subtasks: (parsed.subtasks || []).map((st: any, index: number) => ({
          id: `subtask_${Date.now()}_${index}`,
          title: st.title,
          description: st.description || '',
          order: index + 1,
          completed: false,
          dependencies: []
        })),
        attachments: email.attachments.map(att => ({
          id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: att.name,
          type: att.mimeType,
          size: att.size,
          sourceEmailAttachmentId: att.id
        })),
        clientId: parsed.clientId || email.aiAnalysis?.clientMatching.clientId,
        projectId: parsed.projectId,
        metadata: {
          conversionMethod: 'manual',
          aiConfidence: parsed.confidence || 0.7,
          originalEmailSubject: email.subject,
          senderEmail: email.from.email,
          extractedEntities: parsed.entities || [],
          suggestedWorkflow: parsed.workflow,
          complianceRequirements: parsed.complianceRequirements
        },
        confidence: parsed.confidence || 0.7
      }
    } catch (error) {
      console.error('Failed to parse AI conversion response:', error)
      
      // Return fallback task
      return {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        emailId: email.id,
        title: email.subject,
        description: email.body.text,
        priority: 'medium',
        category: { primary: 'general', tags: [] },
        subtasks: [],
        attachments: [],
        metadata: {
          conversionMethod: 'manual',
          aiConfidence: 0.3,
          originalEmailSubject: email.subject,
          senderEmail: email.from.email,
          extractedEntities: []
        },
        confidence: 0.3
      }
    }
  }

  private updateAnalytics(task: ConvertedTask, conversionTimeMs: number): void {
    this.analytics.totalConversions++
    this.analytics.conversionTimeMs.push(conversionTimeMs)
    
    // Update category distribution
    this.analytics.categoryDistribution[task.category.primary] = 
      (this.analytics.categoryDistribution[task.category.primary] || 0) + 1
    
    // Update priority distribution
    this.analytics.priorityDistribution[task.priority] = 
      (this.analytics.priorityDistribution[task.priority] || 0) + 1
    
    // Update assignee distribution
    if (task.assignee) {
      this.analytics.assigneeDistribution[task.assignee] = 
        (this.analytics.assigneeDistribution[task.assignee] || 0) + 1
    }
    
    // Calculate success rate (assuming all conversions are successful if they reach here)
    this.analytics.successRate = 100
    
    // Calculate average confidence
    const allTasks = Array.from(this.conversionHistory.values())
    this.analytics.averageConfidence = 
      allTasks.reduce((sum, t) => sum + t.confidence, 0) / allTasks.length
  }
}

export interface ActionItem {
  id: string
  description: string
  assignee?: string
  dueDate?: Date
  priority: 'low' | 'medium' | 'high'
  category: string
  confidence: number
  dependencies?: string[]
}