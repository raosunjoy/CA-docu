import { openaiService, ChatRequest } from './openai-service'
import { analyticsService, AnalyticsQuery } from './analytics-service'
import { vectorService, SemanticSearchQuery } from './vector-service'
import { aiOrchestrator, UnifiedRequest, ProcessingContext } from './ai-orchestrator'

export interface ConversationContext {
  userId: string
  sessionId: string
  userRole: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN'
  organizationId: string
  conversationHistory: ConversationMessage[]
  businessContext: {
    currentProjects: string[]
    activeClients: string[]
    priorities: string[]
  }
  preferences: {
    responseStyle: 'CONCISE' | 'DETAILED' | 'TECHNICAL'
    includeAnalytics: boolean
    autoGenerateInsights: boolean
  }
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    type?: 'query' | 'command' | 'analysis_request'
    confidence?: number
    analytics_included?: boolean
    tools_used?: string[]
  }
}

export interface ConversationResponse {
  id: string
  content: string
  type: 'text' | 'analytics' | 'hybrid'
  confidence: number
  sources: SourceReference[]
  analytics?: AnalyticsInsight[]
  suggestions: ActionSuggestion[]
  followUpQuestions: string[]
  timestamp: Date
}

export interface SourceReference {
  type: 'knowledge_base' | 'analytics' | 'document' | 'task'
  title: string
  content: string
  relevance: number
  url?: string
}

export interface AnalyticsInsight {
  metric: string
  value: number | string
  trend: 'up' | 'down' | 'stable'
  interpretation: string
  significance: 'low' | 'medium' | 'high'
}

export interface ActionSuggestion {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  category: 'process_improvement' | 'risk_mitigation' | 'opportunity' | 'automation'
  estimatedImpact: string
  nextSteps: string[]
}

export class ConversationalAIService {
  private activeConversations = new Map<string, ConversationContext>()
  
  constructor() {
    // Initialize service
  }

  async startConversation(
    userId: string, 
    userRole: ConversationContext['userRole'],
    organizationId: string,
    initialContext?: Partial<ConversationContext['businessContext']>
  ): Promise<{ sessionId: string; welcomeMessage: ConversationResponse }> {
    const sessionId = this.generateSessionId()
    
    const context: ConversationContext = {
      userId,
      sessionId,
      userRole,
      organizationId,
      conversationHistory: [],
      businessContext: {
        currentProjects: initialContext?.currentProjects || [],
        activeClients: initialContext?.activeClients || [],
        priorities: initialContext?.priorities || []
      },
      preferences: {
        responseStyle: 'DETAILED',
        includeAnalytics: true,
        autoGenerateInsights: true
      }
    }

    this.activeConversations.set(sessionId, context)

    // Generate personalized welcome message
    const welcomeMessage = await this.generateWelcomeMessage(context)
    
    return { sessionId, welcomeMessage }
  }

  async processMessage(
    sessionId: string, 
    message: string, 
    messageType: 'query' | 'command' | 'analysis_request' = 'query'
  ): Promise<ConversationResponse> {
    const context = this.activeConversations.get(sessionId)
    if (!context) {
      throw new Error('Conversation session not found')
    }

    // Add user message to history
    const userMessage: ConversationMessage = {
      id: this.generateMessageId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      metadata: { type: messageType }
    }
    context.conversationHistory.push(userMessage)

    // Determine intent and extract entities
    const intent = await this.analyzeIntent(message, context)
    
    let response: ConversationResponse

    switch (intent.type) {
      case 'analytics_request':
        response = await this.handleAnalyticsRequest(message, intent, context)
        break
      case 'document_query':
        response = await this.handleDocumentQuery(message, intent, context)
        break
      case 'task_management':
        response = await this.handleTaskManagement(message, intent, context)
        break
      case 'general_ca_query':
        response = await this.handleCAQuery(message, intent, context)
        break
      default:
        response = await this.handleGeneralQuery(message, context)
    }

    // Add assistant response to history
    const assistantMessage: ConversationMessage = {
      id: response.id,
      role: 'assistant',
      content: response.content,
      timestamp: response.timestamp,
      metadata: {
        type: messageType,
        confidence: response.confidence,
        analytics_included: Boolean(response.analytics?.length),
        tools_used: response.sources.map(s => s.type)
      }
    }
    context.conversationHistory.push(assistantMessage)

    // Update conversation context
    this.activeConversations.set(sessionId, context)

    return response
  }

  private async generateWelcomeMessage(context: ConversationContext): Promise<ConversationResponse> {
    const roleSpecificGreeting = this.getRoleSpecificGreeting(context.userRole)
    
    // Get recent analytics to personalize welcome
    const recentAnalytics = await this.getContextualAnalytics(context)
    
    let content = `${roleSpecificGreeting}

I'm your AI assistant, integrated with your firm's analytics and knowledge base. I can help you with:

📊 **Analytics & Insights**: Ask me about performance metrics, trends, or forecasts
📑 **Document Analysis**: Get AI-powered insights from your documents  
📋 **Task Management**: Optimize workflows and track progress
⚖️ **CA Compliance**: Stay updated on regulatory requirements
🔍 **Knowledge Search**: Find information from your firm's knowledge base`

    if (recentAnalytics.length > 0) {
      content += `\n\n**Quick Insights for You:**\n${recentAnalytics.map(insight => 
        `• ${insight.interpretation}`
      ).join('\n')}`
    }

    content += `\n\nWhat would you like to explore today?`

    return {
      id: this.generateMessageId(),
      content,
      type: 'text',
      confidence: 0.95,
      sources: [],
      analytics: recentAnalytics,
      suggestions: await this.generateContextualSuggestions(context),
      followUpQuestions: [
        "Show me this month's performance dashboard",
        "What documents need my review?",
        "Are there any compliance alerts?",
        "How is my team performing?"
      ],
      timestamp: new Date()
    }
  }

  private async analyzeIntent(message: string, context: ConversationContext): Promise<{
    type: string
    entities: Record<string, any>
    confidence: number
  }> {
    const chatRequest: ChatRequest = {
      message: `Analyze the intent of this message from a CA firm context: "${message}"
      
Context: User is a ${context.userRole} at a CA firm.
Recent conversation: ${context.conversationHistory.slice(-3).map(m => m.content).join(' | ')}

Classify the intent as one of:
- analytics_request (asking for metrics, trends, reports)
- document_query (asking about documents, analysis)
- task_management (task creation, status, assignment)
- general_ca_query (CA/compliance/regulatory questions)
- general (other queries)

Respond with JSON: {"type": "intent_type", "entities": {...}, "confidence": 0.0-1.0}`,
      context: {
        userRole: context.userRole,
        businessContext: 'Intent analysis for conversational AI'
      }
    }

    try {
      const response = await openaiService.chatWithAssistant(chatRequest)
      return JSON.parse(response.response)
    } catch (error) {
      console.error('Intent analysis error:', error)
      return { type: 'general', entities: {}, confidence: 0.5 }
    }
  }

  private async handleAnalyticsRequest(
    message: string, 
    intent: any, 
    context: ConversationContext
  ): Promise<ConversationResponse> {
    // Extract time period and metrics from the message
    const analyticsQuery: AnalyticsQuery = {
      period: intent.entities.period || 'MONTHLY',
      startDate: intent.entities.startDate ? new Date(intent.entities.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: intent.entities.endDate ? new Date(intent.entities.endDate) : new Date(),
      organizationId: context.organizationId,
      userId: context.userId,
      filters: intent.entities.filters
    }

    // Get analytics data
    const analyticsData = await analyticsService.generateComprehensiveAnalytics(analyticsQuery)
    
    // Use AI to interpret and explain the analytics
    const interpretationRequest: ChatRequest = {
      message: `As a CA industry expert, interpret these analytics for a ${context.userRole}:
      
Original question: ${message}
Analytics data: ${JSON.stringify(analyticsData, null, 2)}

Provide:
1. Key insights in business language
2. Trends and their implications
3. Actionable recommendations
4. Areas of concern or opportunity

Format as a professional, conversational response.`,
      context: {
        userRole: context.userRole,
        businessContext: 'Analytics interpretation for CA firm'
      }
    }

    const interpretation = await openaiService.chatWithAssistant(interpretationRequest)

    // Convert analytics to insights format
    const insights: AnalyticsInsight[] = this.convertAnalyticsToInsights(analyticsData)

    return {
      id: this.generateMessageId(),
      content: interpretation.response,
      type: 'analytics',
      confidence: interpretation.confidence,
      sources: [
        {
          type: 'analytics',
          title: 'Firm Analytics Dashboard',
          content: 'Comprehensive performance metrics',
          relevance: 0.95
        }
      ],
      analytics: insights,
      suggestions: await this.generateActionSuggestions(analyticsData, context),
      followUpQuestions: [
        "Can you break down the performance by team?",
        "What's driving these trends?",
        "How do we compare to industry benchmarks?",
        "What should be our priorities for improvement?"
      ],
      timestamp: new Date()
    }
  }

  private async handleDocumentQuery(
    message: string, 
    intent: any, 
    context: ConversationContext
  ): Promise<ConversationResponse> {
    // Search for relevant documents using vector search
    const searchQuery: SemanticSearchQuery = {
      query: message,
      filters: {
        organizationId: context.organizationId,
        status: ['ACTIVE']
      },
      limit: 5
    }

    const searchResults = await vectorService.semanticSearch(searchQuery)

    // Use AI orchestrator for document analysis if specific documents found
    if (searchResults.results.length > 0) {
      const unifiedRequest: UnifiedRequest = {
        id: this.generateMessageId(),
        type: 'AI',
        priority: 'MEDIUM',
        data: {
          message,
          documents: searchResults.results,
          analysisType: 'semantic_query'
        },
        context: {
          userRole: context.userRole,
          businessContext: 'Document query processing',
          dataContext: { searchResults },
          preferences: context.preferences
        } as ProcessingContext,
        userId: context.userId,
        timestamp: new Date()
      }

      const aiResponse = await aiOrchestrator.processUnifiedRequest(unifiedRequest)

      return {
        id: this.generateMessageId(),
        content: this.formatAIResponseForConversation(aiResponse, message),
        type: 'hybrid',
        confidence: aiResponse.confidence,
        sources: searchResults.results.map(result => ({
          type: 'document' as const,
          title: result.document.metadata.title || 'Document',
          content: result.relevantSections?.join(' ') || result.document.content.substring(0, 200),
          relevance: result.relevanceScore,
          url: result.document.metadata.url
        })),
        suggestions: aiResponse.recommendations.map(rec => ({
          title: rec.title,
          description: rec.description,
          priority: rec.priority === 1 ? 'high' as const : 
                   rec.priority === 2 ? 'medium' as const : 'low' as const,
          category: 'process_improvement' as const,
          estimatedImpact: rec.expectedImpact,
          nextSteps: [rec.description]
        })),
        followUpQuestions: [
          "Can you analyze specific sections in detail?",
          "Are there any compliance issues in these documents?",
          "How do these documents relate to current projects?",
          "What actions do these documents require?"
        ],
        timestamp: new Date()
      }
    }

    // If no documents found, provide helpful response
    return {
      id: this.generateMessageId(),
      content: `I couldn't find specific documents matching "${message}". However, I can help you with:

• **Document Upload**: Upload documents for AI analysis
• **Search Tips**: Try more specific terms or document types
• **General CA Knowledge**: Ask about CA procedures, compliance requirements
• **Document Templates**: Access standard CA firm document templates

Would you like me to help with any of these alternatives?`,
      type: 'text',
      confidence: 0.7,
      sources: [],
      suggestions: [
        {
          title: 'Upload Document for Analysis',
          description: 'Upload a document to get AI-powered insights and analysis',
          priority: 'medium',
          category: 'process_improvement',
          estimatedImpact: 'Immediate document insights',
          nextSteps: ['Navigate to document upload', 'Select file for analysis']
        }
      ],
      followUpQuestions: [
        "How do I upload documents for analysis?",
        "What types of documents can you analyze?",
        "Can you help with document templates?",
        "What CA compliance documents do I need?"
      ],
      timestamp: new Date()
    }
  }

  private async handleTaskManagement(
    message: string, 
    intent: any, 
    context: ConversationContext
  ): Promise<ConversationResponse> {
    // This would integrate with the existing task service
    const taskInsights = await this.getTaskInsights(context)
    
    const taskResponse: ChatRequest = {
      message: `Help with task management: "${message}"
      
Current task context: ${JSON.stringify(taskInsights, null, 2)}
User role: ${context.userRole}

Provide task-related assistance, suggestions, and next steps.`,
      context: {
        userRole: context.userRole,
        businessContext: 'Task management assistance'
      }
    }

    const response = await openaiService.chatWithAssistant(taskResponse)

    return {
      id: this.generateMessageId(),
      content: response.response,
      type: 'text',
      confidence: response.confidence,
      sources: [
        {
          type: 'task',
          title: 'Task Management System',
          content: 'Current task status and recommendations',
          relevance: 0.9
        }
      ],
      suggestions: [
        {
          title: 'Optimize Task Workflow',
          description: 'Review and optimize current task assignments and priorities',
          priority: 'medium',
          category: 'process_improvement',
          estimatedImpact: 'Improved team efficiency',
          nextSteps: ['Review task board', 'Adjust priorities', 'Reassign if needed']
        }
      ],
      followUpQuestions: [
        "Show me my team's current workload",
        "Which tasks are behind schedule?",
        "Can you suggest task prioritization?",
        "How can we improve our workflow?"
      ],
      timestamp: new Date()
    }
  }

  private async handleCAQuery(
    message: string, 
    intent: any, 
    context: ConversationContext
  ): Promise<ConversationResponse> {
    // Search knowledge base for CA-specific information
    const searchQuery: SemanticSearchQuery = {
      query: `CA compliance ${message}`,
      filters: {
        organizationId: 'ca-knowledge-base',
        category: ['compliance', 'regulations', 'procedures']
      },
      limit: 3
    }

    const knowledgeResults = await vectorService.semanticSearch(searchQuery)

    const enhancedQuery: ChatRequest = {
      message: `${message}

Relevant CA knowledge base information:
${knowledgeResults.results.map(result => 
  `- ${result.document.metadata.title}: ${result.relevantSections?.join('. ') || result.document.content.substring(0, 200)}`
).join('\n')}

Provide expert CA guidance considering current regulations and best practices.`,
      context: {
        userRole: context.userRole,
        businessContext: 'CA compliance and regulatory guidance'
      }
    }

    const response = await openaiService.chatWithAssistant(enhancedQuery)

    return {
      id: this.generateMessageId(),
      content: response.response,
      type: 'text',
      confidence: response.confidence,
      sources: knowledgeResults.results.map(result => ({
        type: 'knowledge_base' as const,
        title: result.document.metadata.title || 'CA Knowledge Base',
        content: result.relevantSections?.join(' ') || result.document.content.substring(0, 200),
        relevance: result.relevanceScore
      })),
      suggestions: response.suggestions?.map(suggestion => ({
        title: suggestion,
        description: 'Consider implementing this compliance recommendation',
        priority: 'medium' as const,
        category: 'process_improvement' as const,
        estimatedImpact: 'Improved compliance',
        nextSteps: [suggestion]
      })) || [],
      followUpQuestions: [
        "What are the current compliance requirements?",
        "How do I implement this procedure?",
        "Are there any recent regulatory changes?",
        "What documentation is required?"
      ],
      timestamp: new Date()
    }
  }

  private async handleGeneralQuery(
    message: string, 
    context: ConversationContext
  ): Promise<ConversationResponse> {
    const chatRequest: ChatRequest = {
      message: `${message}

Context: User is a ${context.userRole} at a CA firm. Provide helpful, professional assistance.`,
      context: {
        userRole: context.userRole,
        businessContext: 'General assistance for CA firm'
      }
    }

    const response = await openaiService.chatWithAssistant(chatRequest)

    return {
      id: this.generateMessageId(),
      content: response.response,
      type: 'text',
      confidence: response.confidence,
      sources: [],
      suggestions: [],
      followUpQuestions: [
        "Can you help me with analytics?",
        "What documents need review?",
        "How can I improve our processes?",
        "Are there any urgent tasks?"
      ],
      timestamp: new Date()
    }
  }

  // Utility methods
  private getRoleSpecificGreeting(role: ConversationContext['userRole']): string {
    switch (role) {
      case 'PARTNER':
        return "Good day! As a Partner, I'm here to provide strategic insights and firm-wide analytics."
      case 'MANAGER':
        return "Hello! I'll help you manage your team effectively and track performance metrics."
      case 'ASSOCIATE':
        return "Hi! I'm ready to assist with your daily tasks and provide analytical insights."
      case 'INTERN':
        return "Welcome! I'll help guide you through CA procedures and learning resources."
      default:
        return "Hello! I'm your AI assistant, ready to help with CA firm operations."
    }
  }

  private async getContextualAnalytics(context: ConversationContext): Promise<AnalyticsInsight[]> {
    try {
      const query: AnalyticsQuery = {
        period: 'MONTHLY',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        organizationId: context.organizationId,
        userId: context.userId
      }

      const analytics = await analyticsService.generateComprehensiveAnalytics(query)
      return this.convertAnalyticsToInsights(analytics).slice(0, 3) // Top 3 insights
    } catch (error) {
      console.error('Error getting contextual analytics:', error)
      return []
    }
  }

  private async generateContextualSuggestions(context: ConversationContext): Promise<ActionSuggestion[]> {
    const baseSuggestions: ActionSuggestion[] = [
      {
        title: 'Review Monthly Performance',
        description: 'Get insights into your firm\'s performance metrics',
        priority: 'medium',
        category: 'process_improvement',
        estimatedImpact: 'Better decision making',
        nextSteps: ['Ask: "Show me this month\'s analytics"']
      }
    ]

    // Add role-specific suggestions
    switch (context.userRole) {
      case 'PARTNER':
        baseSuggestions.push({
          title: 'Strategic Dashboard Review',
          description: 'Analyze firm-wide metrics and growth opportunities',
          priority: 'high',
          category: 'opportunity',
          estimatedImpact: 'Strategic insights for growth',
          nextSteps: ['Review dashboard', 'Identify growth areas']
        })
        break
      case 'MANAGER':
        baseSuggestions.push({
          title: 'Team Performance Analysis',
          description: 'Monitor and optimize team productivity',
          priority: 'medium',
          category: 'process_improvement',
          estimatedImpact: 'Improved team efficiency',
          nextSteps: ['Check team metrics', 'Identify bottlenecks']
        })
        break
    }

    return baseSuggestions
  }

  private convertAnalyticsToInsights(analyticsData: any): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = []

    if (analyticsData.productivity) {
      insights.push({
        metric: 'Task Completion Rate',
        value: `${analyticsData.productivity.tasksCompleted}%`,
        trend: analyticsData.productivity.tasksCompleted > 75 ? 'up' : 'down',
        interpretation: `Task completion is ${analyticsData.productivity.tasksCompleted > 75 ? 'above' : 'below'} target`,
        significance: analyticsData.productivity.tasksCompleted > 85 ? 'high' : 'medium'
      })
    }

    if (analyticsData.financial) {
      insights.push({
        metric: 'Profit Margin',
        value: `${analyticsData.financial.profitMargin}%`,
        trend: analyticsData.financial.profitMargin > 25 ? 'up' : 'stable',
        interpretation: `Profitability is ${analyticsData.financial.profitMargin > 25 ? 'strong' : 'stable'}`,
        significance: 'high'
      })
    }

    return insights
  }

  private async generateActionSuggestions(analyticsData: any, context: ConversationContext): Promise<ActionSuggestion[]> {
    // Generate suggestions based on analytics data and user role
    const suggestions: ActionSuggestion[] = []

    if (analyticsData.productivity?.utilizationRate < 70) {
      suggestions.push({
        title: 'Improve Resource Utilization',
        description: 'Current utilization is below optimal levels',
        priority: 'high',
        category: 'process_improvement',
        estimatedImpact: '15-20% efficiency gain',
        nextSteps: ['Analyze workload distribution', 'Optimize task assignments']
      })
    }

    return suggestions
  }

  private async getTaskInsights(context: ConversationContext): Promise<any> {
    // This would integrate with the task service to get current task status
    return {
      totalTasks: 45,
      completed: 32,
      inProgress: 10,
      overdue: 3
    }
  }

  private formatAIResponseForConversation(aiResponse: any, originalMessage: string): string {
    let content = `Based on your query "${originalMessage}", here's what I found:\n\n`
    
    if (aiResponse.insights?.length > 0) {
      content += "**Key Insights:**\n"
      aiResponse.insights.forEach((insight: any, index: number) => {
        content += `${index + 1}. ${insight.title}: ${insight.description}\n`
      })
      content += "\n"
    }

    if (aiResponse.analytics?.length > 0) {
      content += "**Analytics:**\n"
      aiResponse.analytics.forEach((metric: any) => {
        content += `• ${metric.metric}: ${metric.value} (${metric.trend})\n`
      })
      content += "\n"
    }

    if (aiResponse.recommendations?.length > 0) {
      content += "**Recommendations:**\n"
      aiResponse.recommendations.forEach((rec: any, index: number) => {
        content += `${index + 1}. **${rec.title}**: ${rec.description}\n`
      })
    }

    return content
  }

  private generateSessionId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods for external integration
  async getConversationHistory(sessionId: string): Promise<ConversationMessage[]> {
    const context = this.activeConversations.get(sessionId)
    return context?.conversationHistory || []
  }

  async updateConversationPreferences(
    sessionId: string, 
    preferences: Partial<ConversationContext['preferences']>
  ): Promise<void> {
    const context = this.activeConversations.get(sessionId)
    if (context) {
      context.preferences = { ...context.preferences, ...preferences }
      this.activeConversations.set(sessionId, context)
    }
  }

  async endConversation(sessionId: string): Promise<void> {
    this.activeConversations.delete(sessionId)
  }
}

// Export singleton instance
export const conversationalAI = new ConversationalAIService()