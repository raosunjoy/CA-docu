import { OpenAI } from 'openai'
import { EventEmitter } from 'events'

export interface EmailProvider {
  id: string
  name: string
  type: 'gmail' | 'outlook' | 'exchange' | 'imap' | 'smtp'
  config: EmailProviderConfig
  status: 'connected' | 'disconnected' | 'error'
  lastSync: Date
  capabilities: EmailCapability[]
}

export interface EmailProviderConfig {
  credentials: EmailCredentials
  settings: EmailSettings
  security: EmailSecurity
  sync: EmailSyncConfig
}

export interface EmailCredentials {
  type: 'oauth' | 'password' | 'app_password'
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  accessToken?: string
  username?: string
  password?: string
  host?: string
  port?: number
}

export interface EmailSettings {
  folders: string[]
  autoSync: boolean
  syncFrequency: number
  maxEmails: number
  retentionDays: number
  attachmentSync: boolean
  maxAttachmentSize: number
}

export interface EmailSecurity {
  encryption: 'ssl' | 'tls' | 'none'
  certificate?: string
  skipVerification: boolean
  allowInsecure: boolean
}

export interface EmailSyncConfig {
  bidirectional: boolean
  conflictResolution: 'server_wins' | 'client_wins' | 'merge'
  batchSize: number
  throttleMs: number
  retryAttempts: number
}

export interface EmailCapability {
  type: 'read' | 'write' | 'delete' | 'move' | 'search' | 'attachment' | 'calendar'
  enabled: boolean
  permissions: string[]
}

export interface EmailMessage {
  id: string
  providerId: string
  threadId?: string
  parentId?: string
  subject: string
  from: EmailAddress
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  replyTo?: EmailAddress
  body: EmailBody
  attachments: EmailAttachment[]
  headers: Record<string, string>
  timestamp: Date
  status: EmailStatus
  metadata: EmailMetadata
  aiAnalysis?: EmailAIAnalysis
}

export interface EmailAddress {
  email: string
  name?: string
  type?: 'person' | 'group' | 'system'
}

export interface EmailBody {
  text: string
  html?: string
  preview: string
  wordCount: number
  language?: string
}

export interface EmailAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  contentId?: string
  disposition: 'attachment' | 'inline'
  url?: string
  content?: Buffer
}

export interface EmailStatus {
  read: boolean
  flagged: boolean
  important: boolean
  archived: boolean
  deleted: boolean
  spam: boolean
  draft: boolean
  sent: boolean
}

export interface EmailMetadata {
  organizationId: string
  userId: string
  folderId: string
  labels: string[]
  tags: string[]
  lastModified: Date
  syncVersion: number
}

export interface EmailAIAnalysis {
  category: EmailCategory
  priority: EmailPriority
  sentiment: EmailSentiment
  intent: EmailIntent
  entities: EmailEntity[]
  actionItems: ActionItem[]
  suggestedResponses: SuggestedResponse[]
  clientMatching: ClientMatch
  confidenceScore: number
  analysisTimestamp: Date
}

export interface EmailCategory {
  primary: string
  secondary?: string
  confidence: number
  tags: string[]
}

export interface EmailPriority {
  level: 'low' | 'normal' | 'high' | 'urgent'
  confidence: number
  reasoning: string
  deadline?: Date
}

export interface EmailSentiment {
  score: number
  label: 'negative' | 'neutral' | 'positive'
  confidence: number
  emotions: string[]
}

export interface EmailIntent {
  type: 'request' | 'information' | 'complaint' | 'inquiry' | 'approval' | 'update' | 'reminder'
  confidence: number
  actions: string[]
}

export interface EmailEntity {
  type: 'person' | 'organization' | 'date' | 'amount' | 'document' | 'location' | 'tax_year'
  value: string
  confidence: number
  context: string
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

export interface SuggestedResponse {
  type: 'quick_reply' | 'template' | 'ai_draft'
  content: string
  confidence: number
  reasoning: string
  tone: 'formal' | 'professional' | 'friendly' | 'urgent'
}

export interface ClientMatch {
  clientId?: string
  clientName?: string
  confidence: number
  matchedFields: string[]
  potentialMatches: PotentialClientMatch[]
}

export interface PotentialClientMatch {
  clientId: string
  clientName: string
  confidence: number
  matchReason: string
}

export interface EmailRule {
  id: string
  name: string
  description: string
  conditions: EmailCondition[]
  actions: EmailAction[]
  priority: number
  enabled: boolean
  createdBy: string
  lastModified: Date
}

export interface EmailCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'attachment' | 'header'
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'regex' | 'not_contains'
  value: string
  caseSensitive: boolean
}

export interface EmailAction {
  type: 'categorize' | 'prioritize' | 'tag' | 'forward' | 'create_task' | 'notify' | 'archive'
  parameters: Record<string, any>
  conditions?: string[]
}

export interface EmailThread {
  id: string
  subject: string
  participants: EmailAddress[]
  messageCount: number
  messages: EmailMessage[]
  lastActivity: Date
  status: 'active' | 'closed' | 'archived'
  tags: string[]
  clientId?: string
  projectId?: string
}

export interface EmailSyncResult {
  providerId: string
  success: boolean
  processed: number
  errors: number
  warnings: number
  newMessages: number
  updatedMessages: number
  deletedMessages: number
  duration: number
  lastMessageDate?: Date
}

export class NativeEmailIntegration extends EventEmitter {
  private openai: OpenAI
  private providers: Map<string, EmailProvider> = new Map()
  private rules: EmailRule[] = []
  private syncInProgress: Set<string> = new Set()
  private messageCache: Map<string, EmailMessage> = new Map()
  private threadCache: Map<string, EmailThread> = new Map()

  constructor(config: { openaiApiKey: string }) {
    super()
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.initializeDefaultRules()
  }

  /**
   * Configures a new email provider
   */
  async configureProvider(providerConfig: Omit<EmailProvider, 'id' | 'status' | 'lastSync'>): Promise<string> {
    const providerId = `provider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Test connection
      await this.testConnection(providerConfig.config)
      
      const provider: EmailProvider = {
        id: providerId,
        status: 'connected',
        lastSync: new Date(),
        ...providerConfig
      }
      
      this.providers.set(providerId, provider)
      this.emit('provider_configured', provider)
      
      // Start initial sync
      await this.syncProvider(providerId)
      
      return providerId
    } catch (error) {
      console.error('Failed to configure email provider:', error)
      throw new Error(`Email provider configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Syncs emails from a specific provider
   */
  async syncProvider(providerId: string): Promise<EmailSyncResult> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    if (this.syncInProgress.has(providerId)) {
      throw new Error(`Sync already in progress for provider ${providerId}`)
    }

    this.syncInProgress.add(providerId)
    const startTime = Date.now()
    
    try {
      const result: EmailSyncResult = {
        providerId,
        success: true,
        processed: 0,
        errors: 0,
        warnings: 0,
        newMessages: 0,
        updatedMessages: 0,
        deletedMessages: 0,
        duration: 0
      }

      // Fetch emails from provider
      const messages = await this.fetchEmailsFromProvider(provider)
      result.processed = messages.length

      for (const message of messages) {
        try {
          // Check if message already exists
          const existingMessage = this.messageCache.get(message.id)
          
          if (!existingMessage) {
            // Perform AI analysis
            message.aiAnalysis = await this.analyzeEmailWithAI(message)
            
            // Apply email rules
            await this.applyEmailRules(message)
            
            // Cache the message
            this.messageCache.set(message.id, message)
            result.newMessages++
            
            // Update thread
            await this.updateEmailThread(message)
            
            this.emit('email_received', message)
          } else {
            // Update existing message
            const updatedMessage = { ...existingMessage, ...message }
            this.messageCache.set(message.id, updatedMessage)
            result.updatedMessages++
            
            this.emit('email_updated', updatedMessage)
          }
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error)
          result.errors++
        }
      }

      provider.lastSync = new Date()
      result.duration = Date.now() - startTime
      result.lastMessageDate = messages.length > 0 
        ? new Date(Math.max(...messages.map(m => m.timestamp.getTime())))
        : undefined

      this.emit('sync_completed', result)
      return result
    } catch (error) {
      console.error(`Email sync failed for provider ${providerId}:`, error)
      provider.status = 'error'
      
      return {
        providerId,
        success: false,
        processed: 0,
        errors: 1,
        warnings: 0,
        newMessages: 0,
        updatedMessages: 0,
        deletedMessages: 0,
        duration: Date.now() - startTime
      }
    } finally {
      this.syncInProgress.delete(providerId)
    }
  }

  /**
   * Analyzes an email using AI
   */
  async analyzeEmailWithAI(message: EmailMessage): Promise<EmailAIAnalysis> {
    try {
      const analysisPrompt = `
        Analyze this email for a CA firm:
        
        From: ${message.from.email} (${message.from.name || 'Unknown'})
        To: ${message.to.map(t => t.email).join(', ')}
        Subject: ${message.subject}
        Body: ${message.body.text.substring(0, 2000)}
        
        Provide analysis for:
        1. Category (tax, audit, compliance, consultation, administrative, etc.)
        2. Priority level (low, normal, high, urgent) with reasoning
        3. Sentiment analysis
        4. Intent (request, information, complaint, inquiry, approval, update, reminder)
        5. Extract entities (people, organizations, dates, amounts, documents, tax years)
        6. Identify action items with due dates and priorities
        7. Suggest 2-3 appropriate response templates
        8. Match to potential clients based on content
        
        Return as structured JSON with confidence scores.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert email analyst for CA firms. Analyze emails for categorization, 
            priority, sentiment, intent, and business intelligence. Always provide confidence scores.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3
      })

      const aiResponse = response.choices[0].message.content || '{}'
      return this.parseAIAnalysis(aiResponse, message)
    } catch (error) {
      console.error('AI email analysis failed:', error)
      
      // Return basic analysis if AI fails
      return {
        category: { primary: 'general', confidence: 0.5, tags: [] },
        priority: { level: 'normal', confidence: 0.5, reasoning: 'Default priority' },
        sentiment: { score: 0, label: 'neutral', confidence: 0.5, emotions: [] },
        intent: { type: 'information', confidence: 0.5, actions: [] },
        entities: [],
        actionItems: [],
        suggestedResponses: [],
        clientMatching: { confidence: 0, matchedFields: [], potentialMatches: [] },
        confidenceScore: 0.5,
        analysisTimestamp: new Date()
      }
    }
  }

  /**
   * Creates an email rule for automatic processing
   */
  createEmailRule(
    name: string,
    description: string,
    conditions: EmailCondition[],
    actions: EmailAction[],
    priority = 1
  ): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const rule: EmailRule = {
      id: ruleId,
      name,
      description,
      conditions,
      actions,
      priority,
      enabled: true,
      createdBy: 'system', // In production, use actual user ID
      lastModified: new Date()
    }
    
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
    
    this.emit('rule_created', rule)
    return ruleId
  }

  /**
   * Sends an email through a provider
   */
  async sendEmail(
    providerId: string,
    message: {
      to: EmailAddress[]
      cc?: EmailAddress[]
      bcc?: EmailAddress[]
      subject: string
      body: string
      attachments?: EmailAttachment[]
      replyToId?: string
    }
  ): Promise<string> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`)
    }

    if (provider.status !== 'connected') {
      throw new Error(`Provider ${providerId} is not connected`)
    }

    try {
      // Create email message
      const emailMessage: EmailMessage = {
        id: `sent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        providerId,
        subject: message.subject,
        from: { email: 'system@example.com', name: 'System' }, // Use configured sender
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        body: {
          text: message.body,
          html: message.body, // Convert to HTML if needed
          preview: message.body.substring(0, 100),
          wordCount: message.body.split(' ').length
        },
        attachments: message.attachments || [],
        headers: {},
        timestamp: new Date(),
        status: {
          read: false,
          flagged: false,
          important: false,
          archived: false,
          deleted: false,
          spam: false,
          draft: false,
          sent: true
        },
        metadata: {
          organizationId: 'system',
          userId: 'system',
          folderId: 'sent',
          labels: ['sent'],
          tags: [],
          lastModified: new Date(),
          syncVersion: 1
        }
      }

      // Send through provider (mock implementation)
      await this.sendThroughProvider(provider, emailMessage)
      
      // Cache sent message
      this.messageCache.set(emailMessage.id, emailMessage)
      
      this.emit('email_sent', emailMessage)
      return emailMessage.id
    } catch (error) {
      console.error('Failed to send email:', error)
      throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Searches emails with AI-enhanced capabilities
   */
  async searchEmails(query: {
    text?: string
    from?: string
    to?: string
    subject?: string
    dateRange?: { start: Date; end: Date }
    category?: string
    priority?: string
    hasAttachments?: boolean
    clientId?: string
    tags?: string[]
    limit?: number
  }): Promise<EmailMessage[]> {
    try {
      let results = Array.from(this.messageCache.values())

      // Apply filters
      if (query.text) {
        const searchTerms = query.text.toLowerCase().split(' ')
        results = results.filter(message => 
          searchTerms.every(term =>
            message.subject.toLowerCase().includes(term) ||
            message.body.text.toLowerCase().includes(term) ||
            message.from.email.toLowerCase().includes(term)
          )
        )
      }

      if (query.from) {
        results = results.filter(message => 
          message.from.email.toLowerCase().includes(query.from!.toLowerCase())
        )
      }

      if (query.to) {
        results = results.filter(message =>
          message.to.some(addr => 
            addr.email.toLowerCase().includes(query.to!.toLowerCase())
          )
        )
      }

      if (query.subject) {
        results = results.filter(message =>
          message.subject.toLowerCase().includes(query.subject!.toLowerCase())
        )
      }

      if (query.dateRange) {
        results = results.filter(message =>
          message.timestamp >= query.dateRange!.start &&
          message.timestamp <= query.dateRange!.end
        )
      }

      if (query.category && query.category !== 'all') {
        results = results.filter(message =>
          message.aiAnalysis?.category.primary === query.category
        )
      }

      if (query.priority && query.priority !== 'all') {
        results = results.filter(message =>
          message.aiAnalysis?.priority.level === query.priority
        )
      }

      if (query.hasAttachments !== undefined) {
        results = results.filter(message =>
          query.hasAttachments ? message.attachments.length > 0 : message.attachments.length === 0
        )
      }

      if (query.clientId) {
        results = results.filter(message =>
          message.aiAnalysis?.clientMatching.clientId === query.clientId
        )
      }

      if (query.tags && query.tags.length > 0) {
        results = results.filter(message =>
          query.tags!.some(tag => message.metadata.tags.includes(tag))
        )
      }

      // Sort by relevance and date
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      // Limit results
      if (query.limit) {
        results = results.slice(0, query.limit)
      }

      return results
    } catch (error) {
      console.error('Email search failed:', error)
      return []
    }
  }

  /**
   * Gets email threads for a specific client or project
   */
  getEmailThreads(filter: {
    clientId?: string
    projectId?: string
    status?: 'active' | 'closed' | 'archived'
    limit?: number
  }): EmailThread[] {
    let threads = Array.from(this.threadCache.values())

    if (filter.clientId) {
      threads = threads.filter(thread => thread.clientId === filter.clientId)
    }

    if (filter.projectId) {
      threads = threads.filter(thread => thread.projectId === filter.projectId)
    }

    if (filter.status) {
      threads = threads.filter(thread => thread.status === filter.status)
    }

    threads.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())

    if (filter.limit) {
      threads = threads.slice(0, filter.limit)
    }

    return threads
  }

  /**
   * Gets configured email providers
   */
  getProviders(): EmailProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * Gets email rules
   */
  getEmailRules(): EmailRule[] {
    return [...this.rules]
  }

  /**
   * Private helper methods
   */
  private initializeDefaultRules(): void {
    // High priority keywords rule
    this.createEmailRule(
      'High Priority Keywords',
      'Mark emails with urgent keywords as high priority',
      [
        {
          field: 'subject',
          operator: 'contains',
          value: 'urgent|asap|immediate|deadline|emergency',
          caseSensitive: false
        }
      ],
      [
        {
          type: 'prioritize',
          parameters: { priority: 'high' }
        }
      ],
      10
    )

    // Tax season categorization
    this.createEmailRule(
      'Tax Season Emails',
      'Categorize tax-related emails during tax season',
      [
        {
          field: 'body',
          operator: 'contains',
          value: 'tax return|ITR|income tax|GST|TDS',
          caseSensitive: false
        }
      ],
      [
        {
          type: 'categorize',
          parameters: { category: 'tax' }
        },
        {
          type: 'tag',
          parameters: { tags: ['tax', 'priority'] }
        }
      ],
      8
    )

    // Compliance deadline rule
    this.createEmailRule(
      'Compliance Deadlines',
      'Create tasks for compliance deadlines mentioned in emails',
      [
        {
          field: 'body',
          operator: 'contains',
          value: 'deadline|due date|filing date|compliance|regulatory',
          caseSensitive: false
        }
      ],
      [
        {
          type: 'create_task',
          parameters: { 
            category: 'compliance',
            priority: 'high',
            autoAssign: true
          }
        }
      ],
      9
    )
  }

  private async testConnection(config: EmailProviderConfig): Promise<void> {
    // Mock connection test - in production, test actual connection
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (!config.credentials.username && !config.credentials.clientId) {
      throw new Error('Invalid credentials')
    }
  }

  private async fetchEmailsFromProvider(provider: EmailProvider): Promise<EmailMessage[]> {
    // Mock email fetching - in production, use actual email APIs
    const mockEmails: EmailMessage[] = [
      {
        id: `email_${Date.now()}_1`,
        providerId: provider.id,
        subject: 'Tax Return Query - ABC Ltd',
        from: { email: 'client@abcltd.com', name: 'ABC Ltd CFO' },
        to: [{ email: 'ca@firm.com', name: 'CA Firm' }],
        body: {
          text: 'Dear CA, We need help with our income tax return for FY 2024-25. The deadline is approaching and we have some complex transactions to report.',
          preview: 'Dear CA, We need help with our income tax return...',
          wordCount: 25
        },
        attachments: [],
        headers: {},
        timestamp: new Date(),
        status: {
          read: false,
          flagged: false,
          important: false,
          archived: false,
          deleted: false,
          spam: false,
          draft: false,
          sent: false
        },
        metadata: {
          organizationId: 'org1',
          userId: 'user1',
          folderId: 'inbox',
          labels: ['inbox'],
          tags: [],
          lastModified: new Date(),
          syncVersion: 1
        }
      }
    ]

    return mockEmails
  }

  private async sendThroughProvider(provider: EmailProvider, message: EmailMessage): Promise<void> {
    // Mock email sending - in production, use actual email APIs
    console.log(`Sending email through ${provider.name}:`, message.subject)
  }

  private parseAIAnalysis(aiResponse: string, message: EmailMessage): EmailAIAnalysis {
    try {
      const parsed = JSON.parse(aiResponse)
      
      return {
        category: parsed.category || { primary: 'general', confidence: 0.5, tags: [] },
        priority: parsed.priority || { level: 'normal', confidence: 0.5, reasoning: 'Default' },
        sentiment: parsed.sentiment || { score: 0, label: 'neutral', confidence: 0.5, emotions: [] },
        intent: parsed.intent || { type: 'information', confidence: 0.5, actions: [] },
        entities: parsed.entities || [],
        actionItems: parsed.actionItems || [],
        suggestedResponses: parsed.suggestedResponses || [],
        clientMatching: parsed.clientMatching || { confidence: 0, matchedFields: [], potentialMatches: [] },
        confidenceScore: parsed.confidenceScore || 0.5,
        analysisTimestamp: new Date()
      }
    } catch {
      // Return fallback analysis
      return {
        category: { primary: 'general', confidence: 0.3, tags: [] },
        priority: { level: 'normal', confidence: 0.3, reasoning: 'Parse error fallback' },
        sentiment: { score: 0, label: 'neutral', confidence: 0.3, emotions: [] },
        intent: { type: 'information', confidence: 0.3, actions: [] },
        entities: [],
        actionItems: [],
        suggestedResponses: [],
        clientMatching: { confidence: 0, matchedFields: [], potentialMatches: [] },
        confidenceScore: 0.3,
        analysisTimestamp: new Date()
      }
    }
  }

  private async applyEmailRules(message: EmailMessage): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue
      
      const matchesRule = rule.conditions.every(condition => 
        this.evaluateCondition(message, condition)
      )
      
      if (matchesRule) {
        for (const action of rule.actions) {
          await this.executeEmailAction(message, action)
        }
      }
    }
  }

  private evaluateCondition(message: EmailMessage, condition: EmailCondition): boolean {
    let fieldValue = ''
    
    switch (condition.field) {
      case 'from':
        fieldValue = message.from.email
        break
      case 'to':
        fieldValue = message.to.map(t => t.email).join(' ')
        break
      case 'subject':
        fieldValue = message.subject
        break
      case 'body':
        fieldValue = message.body.text
        break
      case 'attachment':
        fieldValue = message.attachments.map(a => a.name).join(' ')
        break
      default:
        return false
    }

    if (!condition.caseSensitive) {
      fieldValue = fieldValue.toLowerCase()
    }

    const testValue = condition.caseSensitive ? condition.value : condition.value.toLowerCase()

    switch (condition.operator) {
      case 'contains':
        return fieldValue.includes(testValue)
      case 'equals':
        return fieldValue === testValue
      case 'starts_with':
        return fieldValue.startsWith(testValue)
      case 'ends_with':
        return fieldValue.endsWith(testValue)
      case 'regex':
        return new RegExp(testValue).test(fieldValue)
      case 'not_contains':
        return !fieldValue.includes(testValue)
      default:
        return false
    }
  }

  private async executeEmailAction(message: EmailMessage, action: EmailAction): Promise<void> {
    switch (action.type) {
      case 'categorize':
        if (!message.aiAnalysis) return
        message.aiAnalysis.category.primary = action.parameters.category
        break
        
      case 'prioritize':
        if (!message.aiAnalysis) return
        message.aiAnalysis.priority.level = action.parameters.priority
        break
        
      case 'tag':
        message.metadata.tags.push(...action.parameters.tags)
        break
        
      case 'create_task':
        this.emit('task_creation_requested', {
          emailId: message.id,
          category: action.parameters.category,
          priority: action.parameters.priority,
          title: message.subject,
          description: `Task created from email: ${message.subject}`
        })
        break
        
      case 'notify':
        this.emit('notification_requested', {
          emailId: message.id,
          type: action.parameters.type,
          recipients: action.parameters.recipients
        })
        break
        
      default:
        console.warn(`Unknown email action: ${action.type}`)
    }
  }

  private async updateEmailThread(message: EmailMessage): Promise<void> {
    const threadId = message.threadId || `thread_${message.subject.replace(/[^a-zA-Z0-9]/g, '_')}`
    
    let thread = this.threadCache.get(threadId)
    
    if (!thread) {
      thread = {
        id: threadId,
        subject: message.subject,
        participants: [message.from, ...message.to],
        messageCount: 1,
        messages: [message],
        lastActivity: message.timestamp,
        status: 'active',
        tags: message.metadata.tags,
        clientId: message.aiAnalysis?.clientMatching.clientId
      }
    } else {
      thread.messages.push(message)
      thread.messageCount = thread.messages.length
      thread.lastActivity = message.timestamp
      
      // Update participants
      const newParticipants = [message.from, ...message.to]
      newParticipants.forEach(participant => {
        if (!thread!.participants.some(p => p.email === participant.email)) {
          thread!.participants.push(participant)
        }
      })
    }
    
    this.threadCache.set(threadId, thread)
    this.emit('thread_updated', thread)
  }
}