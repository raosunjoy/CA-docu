import { OpenAI } from 'openai'
import { EventEmitter } from 'events'

export interface ChatRoom {
  id: string
  name: string
  type: 'direct' | 'group' | 'project' | 'client' | 'ai_assistant'
  participants: ChatParticipant[]
  createdBy: string
  createdAt: Date
  lastActivity: Date
  isActive: boolean
  settings: ChatRoomSettings
  metadata: ChatRoomMetadata
}

export interface ChatParticipant {
  userId: string
  username: string
  displayName: string
  role: 'admin' | 'moderator' | 'member' | 'guest' | 'ai_assistant'
  joinedAt: Date
  lastSeen: Date
  status: 'online' | 'away' | 'busy' | 'offline'
  permissions: ChatPermissions
}

export interface ChatPermissions {
  canSendMessages: boolean
  canSendFiles: boolean
  canMentionAll: boolean
  canInviteUsers: boolean
  canManageRoom: boolean
  canAccessHistory: boolean
  canUseAIFeatures: boolean
}

export interface ChatRoomSettings {
  allowFileSharing: boolean
  allowMentions: boolean
  enableAIAssistant: boolean
  enableSmartSuggestions: boolean
  enableAutoTranslation: boolean
  messageRetentionDays: number
  requireApproval: boolean
  allowedFileTypes: string[]
  maxFileSize: number
}

export interface ChatRoomMetadata {
  organizationId: string
  projectId?: string
  clientId?: string
  taskId?: string
  tags: string[]
  description?: string
  avatar?: string
  isArchived: boolean
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  content: MessageContent
  timestamp: Date
  editedAt?: Date
  replyToId?: string
  threadId?: string
  reactions: MessageReaction[]
  mentions: string[]
  attachments: MessageAttachment[]
  aiAnalysis?: MessageAIAnalysis
  status: MessageStatus
}

export interface MessageContent {
  text: string
  formatted?: string
  type: 'text' | 'file' | 'image' | 'code' | 'task_reference' | 'ai_response' | 'system'
  metadata?: Record<string, any>
}

export interface MessageReaction {
  emoji: string
  userId: string
  timestamp: Date
}

export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  previewUrl?: string
  metadata?: Record<string, any>
}

export interface MessageAIAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral'
  intent: MessageIntent
  entities: MessageEntity[]
  actionItems: string[]
  suggestions: AISuggestion[]
  language: string
  confidence: number
}

export interface MessageIntent {
  type: 'question' | 'request' | 'information' | 'complaint' | 'praise' | 'task_related'
  confidence: number
  context: string[]
}

export interface MessageEntity {
  type: 'person' | 'organization' | 'date' | 'amount' | 'document' | 'task'
  value: string
  confidence: number
}

export interface AISuggestion {
  type: 'response' | 'action' | 'resource' | 'clarification'
  content: string
  confidence: number
  reasoning: string
}

export interface MessageStatus {
  delivered: boolean
  read: boolean
  readBy: MessageReadStatus[]
}

export interface MessageReadStatus {
  userId: string
  readAt: Date
}

export interface ChatThread {
  id: string
  roomId: string
  parentMessageId: string
  messages: ChatMessage[]
  participants: string[]
  createdAt: Date
  lastActivity: Date
  isResolved: boolean
}

export interface AIAssistant {
  id: string
  name: string
  description: string
  capabilities: AICapability[]
  knowledgeBase: string[]
  personalityProfile: PersonalityProfile
  isActive: boolean
  specializationDomains: string[]
}

export interface AICapability {
  type: 'document_analysis' | 'task_creation' | 'regulation_query' | 'calculation' | 'translation' | 'summarization'
  description: string
  enabled: boolean
  parameters: Record<string, any>
}

export interface PersonalityProfile {
  tone: 'professional' | 'friendly' | 'formal' | 'casual'
  verbosity: 'concise' | 'detailed' | 'comprehensive'
  expertise: 'junior' | 'senior' | 'expert'
  specialties: string[]
}

export interface SmartSuggestion {
  id: string
  type: 'quick_reply' | 'auto_complete' | 'topic_change' | 'task_creation' | 'file_share'
  content: string
  context: string
  confidence: number
  triggers: string[]
}

export interface ChatAnalytics {
  roomId: string
  messageCount: number
  participantEngagement: Record<string, number>
  peakActivityHours: number[]
  averageResponseTime: number
  sentimentTrend: SentimentDataPoint[]
  topicDistribution: Record<string, number>
  aiUsageStats: AIUsageStats
}

export interface SentimentDataPoint {
  timestamp: Date
  sentiment: number
  messageCount: number
}

export interface AIUsageStats {
  queriesHandled: number
  successRate: number
  averageConfidence: number
  popularCapabilities: Record<string, number>
  userSatisfactionScore: number
}

export interface ChatNotification {
  id: string
  userId: string
  roomId: string
  type: 'mention' | 'direct_message' | 'ai_suggestion' | 'task_created' | 'file_shared'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export class AdvancedChatSystem extends EventEmitter {
  private openai: OpenAI
  private rooms: Map<string, ChatRoom> = new Map()
  private messages: Map<string, ChatMessage[]> = new Map()
  private threads: Map<string, ChatThread> = new Map()
  private aiAssistants: Map<string, AIAssistant> = new Map()
  private activeConnections: Map<string, Set<string>> = new Map()
  private smartSuggestions: SmartSuggestion[] = []

  constructor(config: { openaiApiKey: string }) {
    super()
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.initializeDefaultAIAssistants()
    this.initializeSmartSuggestions()
  }

  /**
   * Creates a new chat room
   */
  async createRoom(
    name: string,
    type: ChatRoom['type'],
    createdBy: string,
    participants: string[] = [],
    settings: Partial<ChatRoomSettings> = {}
  ): Promise<string> {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const room: ChatRoom = {
      id: roomId,
      name,
      type,
      participants: participants.map(userId => ({
        userId,
        username: userId,
        displayName: userId,
        role: userId === createdBy ? 'admin' : 'member',
        joinedAt: new Date(),
        lastSeen: new Date(),
        status: 'online',
        permissions: this.getDefaultPermissions(type)
      })),
      createdBy,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      settings: {
        allowFileSharing: true,
        allowMentions: true,
        enableAIAssistant: true,
        enableSmartSuggestions: true,
        enableAutoTranslation: false,
        messageRetentionDays: 365,
        requireApproval: false,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        ...settings
      },
      metadata: {
        organizationId: 'default',
        tags: [],
        isArchived: false
      }
    }

    this.rooms.set(roomId, room)
    this.messages.set(roomId, [])
    
    // Add AI assistant if enabled
    if (room.settings.enableAIAssistant) {
      await this.addAIAssistantToRoom(roomId)
    }

    this.emit('room_created', room)
    return roomId
  }

  /**
   * Sends a message to a chat room
   */
  async sendMessage(
    roomId: string,
    senderId: string,
    content: string,
    options: {
      type?: MessageContent['type']
      replyToId?: string
      threadId?: string
      attachments?: MessageAttachment[]
      mentions?: string[]
    } = {}
  ): Promise<string> {
    const room = this.rooms.get(roomId)
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const message: ChatMessage = {
      id: messageId,
      roomId,
      senderId,
      senderName: this.getSenderName(senderId),
      content: {
        text: content,
        type: options.type || 'text'
      },
      timestamp: new Date(),
      replyToId: options.replyToId,
      threadId: options.threadId,
      reactions: [],
      mentions: options.mentions || this.extractMentions(content),
      attachments: options.attachments || [],
      status: {
        delivered: true,
        read: false,
        readBy: []
      }
    }

    // Perform AI analysis if enabled
    if (room.settings.enableAIAssistant) {
      message.aiAnalysis = await this.analyzeMessageWithAI(message, room)
    }

    // Store message
    const roomMessages = this.messages.get(roomId) || []
    roomMessages.push(message)
    this.messages.set(roomId, roomMessages)

    // Update room activity
    room.lastActivity = new Date()

    // Handle thread if applicable
    if (options.threadId) {
      await this.updateThread(options.threadId, message)
    }

    // Send to active connections
    this.broadcastToRoom(roomId, 'message', message)

    // Process AI assistant response if mentioned or in AI room
    if (room.type === 'ai_assistant' || this.containsAIMention(content)) {
      await this.processAIResponse(room, message)
    }

    // Generate smart suggestions for other participants
    if (room.settings.enableSmartSuggestions) {
      await this.generateSmartSuggestions(room, message)
    }

    // Handle notifications
    await this.processMessageNotifications(room, message)

    this.emit('message_sent', message)
    return messageId
  }

  /**
   * Processes AI assistant response
   */
  private async processAIResponse(room: ChatRoom, userMessage: ChatMessage): Promise<void> {
    try {
      const aiAssistantId = this.findRoomAIAssistant(room.id)
      if (!aiAssistantId) return

      const assistant = this.aiAssistants.get(aiAssistantId)
      if (!assistant?.isActive) return

      // Build conversation context
      const recentMessages = (this.messages.get(room.id) || []).slice(-10)
      const context = this.buildConversationContext(recentMessages, room)

      const aiPrompt = `
        You are ${assistant.name}, an AI assistant specialized in CA firm operations.
        
        Personality: ${assistant.personalityProfile.tone}, ${assistant.personalityProfile.verbosity}
        Expertise: ${assistant.personalityProfile.expertise}
        Specialties: ${assistant.personalityProfile.specialties.join(', ')}
        
        Context: ${context}
        
        User Message: ${userMessage.content.text}
        
        Respond helpfully and professionally. If the user needs:
        - Document analysis: Offer to analyze uploaded documents
        - Task creation: Suggest creating tasks from conversation
        - Regulation queries: Provide relevant CA regulations
        - Calculations: Help with financial calculations
        - Information: Provide accurate CA-related information
        
        Keep responses concise but thorough.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert CA assistant. Provide helpful, accurate responses for CA firm operations.`
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.4
      })

      const aiResponse = response.choices[0].message.content || "I'm sorry, I couldn't process that request."
      
      // Send AI response with slight delay to appear natural
      setTimeout(async () => {
        await this.sendMessage(
          room.id,
          aiAssistantId,
          aiResponse,
          { type: 'ai_response' }
        )
      }, 1000)

    } catch (error) {
      console.error('AI response generation failed:', error)
      
      // Send fallback response
      const fallbackResponse = "I apologize, but I'm having technical difficulties right now. Please try again in a moment."
      setTimeout(async () => {
        await this.sendMessage(
          room.id,
          'ai_assistant',
          fallbackResponse,
          { type: 'ai_response' }
        )
      }, 1000)
    }
  }

  /**
   * Generates smart suggestions for participants
   */
  private async generateSmartSuggestions(room: ChatRoom, message: ChatMessage): Promise<void> {
    try {
      const suggestionPrompt = `
        Based on this conversation message, suggest helpful quick replies or actions:
        
        Room Type: ${room.type}
        Message: ${message.content.text}
        Sender: ${message.senderName}
        
        Generate 2-3 smart suggestions like:
        - Quick reply options
        - Relevant actions (create task, schedule meeting, etc.)
        - Resource suggestions
        - Follow-up questions
        
        Make suggestions contextual and useful for CA firm operations.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Generate helpful smart suggestions for chat participants in a CA firm context.'
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        temperature: 0.6
      })

      const suggestions = this.parseSmartSuggestions(response.choices[0].message.content || '[]')
      
      // Broadcast suggestions to room participants (excluding sender)
      room.participants.forEach(participant => {
        if (participant.userId !== message.senderId && participant.permissions.canSendMessages) {
          this.emit('smart_suggestions', {
            userId: participant.userId,
            roomId: room.id,
            messageId: message.id,
            suggestions
          })
        }
      })

    } catch (error) {
      console.error('Smart suggestion generation failed:', error)
    }
  }

  /**
   * Analyzes message with AI
   */
  private async analyzeMessageWithAI(message: ChatMessage, room: ChatRoom): Promise<MessageAIAnalysis> {
    try {
      const analysisPrompt = `
        Analyze this chat message for a CA firm:
        
        Message: ${message.content.text}
        Context: ${room.type} chat room
        
        Provide analysis for:
        1. Sentiment (positive/negative/neutral)
        2. Intent (question/request/information/complaint/praise/task_related)
        3. Extract entities (people, organizations, dates, amounts, documents, tasks)
        4. Identify action items
        5. Generate helpful suggestions
        6. Detect language
        
        Return as structured JSON with confidence scores.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert message analyzer for CA firm communications.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3
      })

      return this.parseMessageAnalysis(response.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Message AI analysis failed:', error)
      
      return {
        sentiment: 'neutral',
        intent: { type: 'information', confidence: 0.3, context: [] },
        entities: [],
        actionItems: [],
        suggestions: [],
        language: 'en',
        confidence: 0.3
      }
    }
  }

  /**
   * Creates a thread from a message
   */
  async createThread(parentMessageId: string): Promise<string> {
    const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Find the parent message
    let parentMessage: ChatMessage | null = null
    let roomId = ''
    
    for (const [rId, messages] of this.messages.entries()) {
      const found = messages.find(m => m.id === parentMessageId)
      if (found) {
        parentMessage = found
        roomId = rId
        break
      }
    }

    if (!parentMessage) {
      throw new Error(`Parent message ${parentMessageId} not found`)
    }

    const thread: ChatThread = {
      id: threadId,
      roomId,
      parentMessageId,
      messages: [],
      participants: [parentMessage.senderId],
      createdAt: new Date(),
      lastActivity: new Date(),
      isResolved: false
    }

    this.threads.set(threadId, thread)
    this.emit('thread_created', thread)
    
    return threadId
  }

  /**
   * Adds reaction to a message
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId)
      if (message) {
        // Remove existing reaction from this user for this emoji
        message.reactions = message.reactions.filter(r => !(r.userId === userId && r.emoji === emoji))
        
        // Add new reaction
        message.reactions.push({
          emoji,
          userId,
          timestamp: new Date()
        })

        this.broadcastToRoom(message.roomId, 'reaction_added', {
          messageId,
          userId,
          emoji,
          timestamp: new Date()
        })
        
        return
      }
    }
    
    throw new Error(`Message ${messageId} not found`)
  }

  /**
   * Searches messages across rooms
   */
  async searchMessages(query: {
    text?: string
    roomId?: string
    senderId?: string
    dateRange?: { start: Date; end: Date }
    hasAttachments?: boolean
    messageType?: MessageContent['type']
    mentions?: string
    limit?: number
  }): Promise<ChatMessage[]> {
    let results: ChatMessage[] = []
    
    // Determine which rooms to search
    const roomsToSearch = query.roomId ? [query.roomId] : Array.from(this.messages.keys())
    
    for (const roomId of roomsToSearch) {
      const messages = this.messages.get(roomId) || []
      results.push(...messages)
    }
    
    // Apply filters
    if (query.text) {
      const searchTerms = query.text.toLowerCase().split(' ')
      results = results.filter(message =>
        searchTerms.every(term =>
          message.content.text.toLowerCase().includes(term) ||
          message.senderName.toLowerCase().includes(term)
        )
      )
    }

    if (query.senderId) {
      results = results.filter(message => message.senderId === query.senderId)
    }

    if (query.dateRange) {
      results = results.filter(message =>
        message.timestamp >= query.dateRange!.start &&
        message.timestamp <= query.dateRange!.end
      )
    }

    if (query.hasAttachments !== undefined) {
      results = results.filter(message =>
        query.hasAttachments ? message.attachments.length > 0 : message.attachments.length === 0
      )
    }

    if (query.messageType) {
      results = results.filter(message => message.content.type === query.messageType)
    }

    if (query.mentions) {
      results = results.filter(message => message.mentions.includes(query.mentions!))
    }

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    // Limit results
    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Gets chat analytics for a room
   */
  getChatAnalytics(roomId: string, timeframe: { start: Date; end: Date }): ChatAnalytics {
    const messages = this.messages.get(roomId) || []
    const filteredMessages = messages.filter(m => 
      m.timestamp >= timeframe.start && m.timestamp <= timeframe.end
    )

    const participantEngagement: Record<string, number> = {}
    const hourlyActivity = new Array(24).fill(0)
    const sentimentTrend: SentimentDataPoint[] = []
    const topicDistribution: Record<string, number> = {}

    filteredMessages.forEach(message => {
      // Participant engagement
      participantEngagement[message.senderId] = (participantEngagement[message.senderId] || 0) + 1
      
      // Hourly activity
      hourlyActivity[message.timestamp.getHours()]++
      
      // Sentiment trend
      if (message.aiAnalysis) {
        const sentimentScore = message.aiAnalysis.sentiment === 'positive' ? 1 : 
                              message.aiAnalysis.sentiment === 'negative' ? -1 : 0
        sentimentTrend.push({
          timestamp: message.timestamp,
          sentiment: sentimentScore,
          messageCount: 1
        })
      }
    })

    const peakActivityHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour)

    return {
      roomId,
      messageCount: filteredMessages.length,
      participantEngagement,
      peakActivityHours,
      averageResponseTime: this.calculateAverageResponseTime(filteredMessages),
      sentimentTrend,
      topicDistribution,
      aiUsageStats: {
        queriesHandled: filteredMessages.filter(m => m.content.type === 'ai_response').length,
        successRate: 95, // Mock success rate
        averageConfidence: 0.85, // Mock confidence
        popularCapabilities: { 'document_analysis': 10, 'regulation_query': 8 },
        userSatisfactionScore: 4.2
      }
    }
  }

  /**
   * Gets chat rooms for a user
   */
  getUserRooms(userId: string): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(room =>
      room.participants.some(p => p.userId === userId)
    )
  }

  /**
   * Gets room messages with pagination
   */
  getRoomMessages(roomId: string, limit = 50, offset = 0): ChatMessage[] {
    const messages = this.messages.get(roomId) || []
    return messages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit)
  }

  /**
   * Private helper methods
   */
  private initializeDefaultAIAssistants(): void {
    const defaultAssistant: AIAssistant = {
      id: 'ca_assistant',
      name: 'CA Assistant',
      description: 'Expert AI assistant for CA firm operations',
      capabilities: [
        {
          type: 'document_analysis',
          description: 'Analyze financial documents and reports',
          enabled: true,
          parameters: {}
        },
        {
          type: 'regulation_query',
          description: 'Answer questions about CA regulations and standards',
          enabled: true,
          parameters: {}
        },
        {
          type: 'calculation',
          description: 'Perform financial calculations',
          enabled: true,
          parameters: {}
        },
        {
          type: 'task_creation',
          description: 'Create tasks from conversation context',
          enabled: true,
          parameters: {}
        }
      ],
      knowledgeBase: ['icai_standards', 'tax_regulations', 'audit_procedures'],
      personalityProfile: {
        tone: 'professional',
        verbosity: 'detailed',
        expertise: 'expert',
        specialties: ['taxation', 'audit', 'compliance', 'financial_reporting']
      },
      isActive: true,
      specializationDomains: ['taxation', 'audit', 'compliance']
    }

    this.aiAssistants.set(defaultAssistant.id, defaultAssistant)
  }

  private initializeSmartSuggestions(): void {
    this.smartSuggestions = [
      {
        id: 'quick_thanks',
        type: 'quick_reply',
        content: 'Thank you!',
        context: 'appreciation',
        confidence: 0.9,
        triggers: ['help', 'assist', 'support']
      },
      {
        id: 'schedule_meeting',
        type: 'task_creation',
        content: 'Schedule a meeting to discuss this',
        context: 'meeting_request',
        confidence: 0.8,
        triggers: ['discuss', 'meeting', 'call']
      },
      {
        id: 'create_task',
        type: 'task_creation',
        content: 'Create task from this discussion',
        context: 'task_creation',
        confidence: 0.85,
        triggers: ['task', 'todo', 'action', 'follow up']
      }
    ]
  }

  private getDefaultPermissions(roomType: ChatRoom['type']): ChatPermissions {
    const basePermissions: ChatPermissions = {
      canSendMessages: true,
      canSendFiles: true,
      canMentionAll: false,
      canInviteUsers: false,
      canManageRoom: false,
      canAccessHistory: true,
      canUseAIFeatures: true
    }

    switch (roomType) {
      case 'client':
        return {
          ...basePermissions,
          canMentionAll: false,
          canInviteUsers: false,
          canUseAIFeatures: false
        }
      case 'project':
        return {
          ...basePermissions,
          canMentionAll: true,
          canInviteUsers: true
        }
      default:
        return basePermissions
    }
  }

  private getSenderName(senderId: string): string {
    // In production, lookup from user service
    if (senderId === 'ca_assistant') return 'CA Assistant'
    return senderId
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1])
    }

    return mentions
  }

  private containsAIMention(content: string): boolean {
    return content.toLowerCase().includes('@ai') || 
           content.toLowerCase().includes('@assistant') ||
           content.toLowerCase().includes('@ca_assistant')
  }

  private findRoomAIAssistant(roomId: string): string | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    
    const aiParticipant = room.participants.find(p => p.role === 'ai_assistant')
    return aiParticipant?.userId || 'ca_assistant'
  }

  private buildConversationContext(messages: ChatMessage[], room: ChatRoom): string {
    const recentContext = messages
      .slice(-5)
      .map(m => `${m.senderName}: ${m.content.text}`)
      .join('\n')
    
    return `Room: ${room.name} (${room.type})\nRecent conversation:\n${recentContext}`
  }

  private async addAIAssistantToRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId)
    if (!room) return

    const aiAssistant: ChatParticipant = {
      userId: 'ca_assistant',
      username: 'ca_assistant',
      displayName: 'CA Assistant',
      role: 'ai_assistant',
      joinedAt: new Date(),
      lastSeen: new Date(),
      status: 'online',
      permissions: {
        canSendMessages: true,
        canSendFiles: false,
        canMentionAll: false,
        canInviteUsers: false,
        canManageRoom: false,
        canAccessHistory: true,
        canUseAIFeatures: true
      }
    }

    room.participants.push(aiAssistant)
  }

  private parseSmartSuggestions(aiResponse: string): SmartSuggestion[] {
    try {
      const parsed = JSON.parse(aiResponse)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private parseMessageAnalysis(aiResponse: string): MessageAIAnalysis {
    try {
      const parsed = JSON.parse(aiResponse)
      return {
        sentiment: parsed.sentiment || 'neutral',
        intent: parsed.intent || { type: 'information', confidence: 0.5, context: [] },
        entities: parsed.entities || [],
        actionItems: parsed.actionItems || [],
        suggestions: parsed.suggestions || [],
        language: parsed.language || 'en',
        confidence: parsed.confidence || 0.5
      }
    } catch {
      return {
        sentiment: 'neutral',
        intent: { type: 'information', confidence: 0.3, context: [] },
        entities: [],
        actionItems: [],
        suggestions: [],
        language: 'en',
        confidence: 0.3
      }
    }
  }

  private broadcastToRoom(roomId: string, event: string, data: any): void {
    const connections = this.activeConnections.get(roomId)
    if (connections) {
      connections.forEach(connectionId => {
        this.emit('broadcast', { connectionId, event, data })
      })
    }
  }

  private async updateThread(threadId: string, message: ChatMessage): Promise<void> {
    const thread = this.threads.get(threadId)
    if (thread) {
      thread.messages.push(message)
      thread.lastActivity = new Date()
      
      if (!thread.participants.includes(message.senderId)) {
        thread.participants.push(message.senderId)
      }
      
      this.emit('thread_updated', thread)
    }
  }

  private async processMessageNotifications(room: ChatRoom, message: ChatMessage): Promise<void> {
    // Process mentions
    for (const mentionedUser of message.mentions) {
      const notification: ChatNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: mentionedUser,
        roomId: room.id,
        type: 'mention',
        title: `Mentioned in ${room.name}`,
        message: `${message.senderName}: ${message.content.text.substring(0, 100)}...`,
        timestamp: new Date(),
        read: false,
        actionUrl: `/chat/${room.id}#${message.id}`
      }
      
      this.emit('notification', notification)
    }
  }

  private calculateAverageResponseTime(messages: ChatMessage[]): number {
    // Simple implementation - in production, use more sophisticated logic
    return messages.length > 1 ? 300 : 0 // 5 minutes average
  }
}