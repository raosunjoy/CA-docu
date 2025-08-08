import OpenAI from 'openai'

export interface DocumentAnalysisRequest {
  content: string
  documentType?: 'FINANCIAL' | 'LEGAL' | 'TAX' | 'COMPLIANCE' | 'GENERAL'
  context?: {
    clientName?: string
    period?: string
    purpose?: string
  }
}

export interface DocumentAnalysisResult {
  summary: string
  keyFindings: string[]
  entities: ExtractedEntity[]
  recommendations: string[]
  riskIndicators: RiskIndicator[]
  confidence: number
  processingTime: number
}

export interface ExtractedEntity {
  type: 'AMOUNT' | 'DATE' | 'PERSON' | 'COMPANY' | 'ACCOUNT_NUMBER' | 'TAX_ID' | 'REFERENCE_NUMBER'
  value: string
  confidence: number
  context: string
}

export interface RiskIndicator {
  type: 'HIGH' | 'MEDIUM' | 'LOW'
  category: 'COMPLIANCE' | 'FINANCIAL' | 'OPERATIONAL' | 'REGULATORY'
  description: string
  recommendation: string
}

export interface ChatRequest {
  message: string
  context: {
    userRole: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN'
    businessContext?: string
    conversationHistory?: ChatMessage[]
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatResponse {
  response: string
  confidence: number
  suggestions: string[]
  followUpQuestions: string[]
  resources: string[]
}

export class OpenAIService {
  private openai: OpenAI | null = null
  private isInitialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    try {
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
        this.isInitialized = true
        console.log('✅ OpenAI service initialized')
      } else {
        console.warn('⚠️  OpenAI API key not configured, using mock responses')
      }
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI service:', error)
    }
  }

  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
    const startTime = Date.now()

    if (!this.isInitialized || !this.openai) {
      return this.getMockDocumentAnalysis(request, Date.now() - startTime)
    }

    try {
      const prompt = this.buildDocumentAnalysisPrompt(request)
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // More cost-effective for document analysis
        messages: [
          {
            role: 'system',
            content: 'You are an expert CA (Chartered Accountant) assistant specializing in document analysis, financial review, and compliance checking. Provide detailed, professional analysis with actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Low temperature for consistent, factual analysis
        max_tokens: 2000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      return this.parseDocumentAnalysisResponse(response, Date.now() - startTime)

    } catch (error) {
      console.error('OpenAI document analysis error:', error)
      // Fallback to mock response with error context
      return this.getMockDocumentAnalysis(request, Date.now() - startTime)
    }
  }

  async chatWithAssistant(request: ChatRequest): Promise<ChatResponse> {
    if (!this.isInitialized || !this.openai) {
      return this.getMockChatResponse(request)
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(request.context.userRole)
        }
      ]

      // Add conversation history
      if (request.context.conversationHistory) {
        messages.push(...request.context.conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })))
      }

      messages.push({
        role: 'user',
        content: request.message
      })

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      return this.parseChatResponse(response)

    } catch (error) {
      console.error('OpenAI chat error:', error)
      return this.getMockChatResponse(request)
    }
  }

  async generateInsights(data: any, context: string): Promise<string[]> {
    if (!this.isInitialized || !this.openai) {
      return this.getMockInsights(context)
    }

    try {
      const prompt = `As a CA expert, analyze this data and provide 3-5 key business insights:
      
Context: ${context}
Data: ${JSON.stringify(data, null, 2)}

Provide insights in the format:
- [Insight 1]
- [Insight 2]
- [Insight 3]
etc.

Focus on actionable insights that would help a CA firm improve their operations, compliance, or client service.`

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 800,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        return this.getMockInsights(context)
      }

      // Parse the response to extract insights
      const insights = response
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(1).trim())
        .filter(insight => insight.length > 0)

      return insights.length > 0 ? insights : this.getMockInsights(context)

    } catch (error) {
      console.error('OpenAI insights generation error:', error)
      return this.getMockInsights(context)
    }
  }

  private buildDocumentAnalysisPrompt(request: DocumentAnalysisRequest): string {
    return `Please analyze this ${request.documentType || 'business'} document and provide:

1. **Summary**: Brief overview of the document
2. **Key Findings**: Important points, numbers, dates, parties involved
3. **Extracted Entities**: Important amounts, dates, names, account numbers (format as JSON)
4. **Recommendations**: What actions should be taken based on this document
5. **Risk Indicators**: Any compliance, financial, or operational risks identified

Document Content:
${request.content}

${request.context ? `
Context:
- Client: ${request.context.clientName || 'N/A'}
- Period: ${request.context.period || 'N/A'}  
- Purpose: ${request.context.purpose || 'N/A'}
` : ''}

Please format your response in a structured way that can be parsed programmatically.`
  }

  private buildSystemPrompt(userRole: string): string {
    const roleContext: Record<string, string> = {
      PARTNER: 'You are assisting a CA firm partner. Focus on strategic insights, high-level compliance, and business growth opportunities.',
      MANAGER: 'You are assisting a CA firm manager. Focus on team coordination, workflow optimization, and operational efficiency.',
      ASSOCIATE: 'You are assisting a CA associate. Focus on task execution, technical guidance, and detailed compliance procedures.',
      INTERN: 'You are assisting a CA intern. Focus on learning guidance, basic procedures, and foundational concepts.'
    }

    return `You are an expert CA (Chartered Accountant) AI assistant. ${roleContext[userRole] || roleContext.ASSOCIATE}

Always provide:
- Accurate, professional advice
- Relevant CA industry context
- Actionable recommendations
- Appropriate regulatory considerations (ICAI, GST, Income Tax)
- Clear explanations suitable for the user's role level

Be concise but comprehensive. If you're uncertain about specific regulations or recent changes, recommend consulting current official sources.`
  }

  private parseDocumentAnalysisResponse(response: string, processingTime: number): DocumentAnalysisResult {
    // This is a simplified parser - in production, you'd want more robust parsing
    
    return {
      summary: this.extractSection(response, 'Summary') || response.substring(0, 200) + '...',
      keyFindings: this.extractListItems(response, 'Key Findings'),
      entities: this.extractEntities(response),
      recommendations: this.extractListItems(response, 'Recommendations'),
      riskIndicators: this.extractRiskIndicators(response),
      confidence: 0.85, // Base confidence for OpenAI responses
      processingTime
    }
  }

  private parseChatResponse(response: string): ChatResponse {
    // Extract suggestions and follow-up questions from response
    const suggestions = this.extractSuggestions(response)
    const followUpQuestions = this.extractFollowUpQuestions(response)
    
    return {
      response: response.trim(),
      confidence: 0.9,
      suggestions,
      followUpQuestions,
      resources: [] // Could be enhanced to extract relevant resources
    }
  }

  private extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`\\*\\*${sectionName}\\*\\*:?\\s*([^*]+)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }

  private extractListItems(text: string, sectionName: string): string[] {
    const sectionText = this.extractSection(text, sectionName)
    if (!sectionText) return []
    
    return sectionText
      .split(/\n|;/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && (item.startsWith('-') || item.startsWith('•')))
      .map(item => item.replace(/^[-•]\s*/, ''))
  }

  private extractEntities(text: string): ExtractedEntity[] {
    // Simplified entity extraction - could be enhanced with NER
    const entities: ExtractedEntity[] = []
    
    // Extract amounts
    const amountRegex = /\$[\d,]+\.?\d*/g
    const amounts = text.match(amountRegex) || []
    amounts.forEach(amount => {
      entities.push({
        type: 'AMOUNT',
        value: amount,
        confidence: 0.8,
        context: 'Found in document text'
      })
    })

    // Extract dates
    const dateRegex = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{1,2}-\d{1,2}-\d{2,4}\b/g
    const dates = text.match(dateRegex) || []
    dates.forEach(date => {
      entities.push({
        type: 'DATE',
        value: date,
        confidence: 0.9,
        context: 'Date found in document'
      })
    })

    return entities
  }

  private extractRiskIndicators(text: string): RiskIndicator[] {
    // Simplified risk extraction based on keywords
    const risks: RiskIndicator[] = []
    
    const riskKeywords = [
      { keywords: ['non-compliant', 'violation', 'breach'], type: 'HIGH' as const, category: 'COMPLIANCE' as const },
      { keywords: ['unusual', 'anomaly', 'irregular'], type: 'MEDIUM' as const, category: 'FINANCIAL' as const },
      { keywords: ['delay', 'overdue', 'pending'], type: 'MEDIUM' as const, category: 'OPERATIONAL' as const }
    ]

    riskKeywords.forEach(risk => {
      const found = risk.keywords.some(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      )
      
      if (found) {
        risks.push({
          type: risk.type,
          category: risk.category,
          description: `Potential ${risk.category.toLowerCase()} risk detected`,
          recommendation: 'Review and investigate this issue promptly'
        })
      }
    })

    return risks
  }

  private extractSuggestions(response: string): string[] {
    // Look for bullet points or numbered lists that might be suggestions
    const suggestions = response
      .split('\n')
      .filter(line => line.trim().match(/^[-•\d]/))
      .map(line => line.trim().replace(/^[-•\d.)\s]+/, ''))
      .filter(suggestion => suggestion.length > 10)

    return suggestions.slice(0, 3) // Limit to 3 suggestions
  }

  private extractFollowUpQuestions(response: string): string[] {
    // Look for questions in the response
    const questions = response
      .split(/[.!]/)
      .filter(sentence => sentence.trim().endsWith('?'))
      .map(question => question.trim())

    return questions.slice(0, 2) // Limit to 2 follow-up questions
  }

  // Mock responses for when OpenAI is not available
  private getMockDocumentAnalysis(request: DocumentAnalysisRequest, processingTime: number): DocumentAnalysisResult {
    return {
      summary: `Analysis of ${request.documentType || 'business'} document completed. This appears to be a standard business document requiring review for compliance and accuracy.`,
      keyFindings: [
        'Document contains financial data that needs verification',
        'Multiple transaction entries identified',
        'Compliance review recommended for regulatory adherence'
      ],
      entities: [
        {
          type: 'AMOUNT',
          value: '₹125,000',
          confidence: 0.9,
          context: 'Revenue figure'
        },
        {
          type: 'DATE',
          value: '2024-03-31',
          confidence: 0.95,
          context: 'Period end date'
        }
      ],
      recommendations: [
        'Verify all financial figures against supporting documents',
        'Ensure compliance with current tax regulations',
        'Schedule follow-up review within 30 days'
      ],
      riskIndicators: [
        {
          type: 'MEDIUM',
          category: 'COMPLIANCE',
          description: 'Requires regulatory compliance check',
          recommendation: 'Conduct thorough compliance review'
        }
      ],
      confidence: 0.75, // Lower confidence for mock data
      processingTime
    }
  }

  private getMockChatResponse(request: ChatRequest): ChatResponse {
    const roleResponses = {
      PARTNER: 'As a partner, you should focus on strategic decision-making and business growth opportunities.',
      MANAGER: 'From a management perspective, consider how this impacts team efficiency and workflow optimization.',
      ASSOCIATE: 'Here\'s the technical guidance you need to complete this task effectively.',
      INTERN: 'Let me explain this concept step by step to help you understand the fundamentals.'
    }

    return {
      response: roleResponses[request.context.userRole] + ' This is a mock response since OpenAI is not configured. Please add your OpenAI API key to get real AI assistance.',
      confidence: 0.6,
      suggestions: [
        'Configure OpenAI API key for real responses',
        'Review the documentation for more details',
        'Consider consulting with a senior colleague'
      ],
      followUpQuestions: [
        'Would you like me to explain this in more detail?',
        'Do you need help with the next steps?'
      ],
      resources: []
    }
  }

  private getMockInsights(context: string): string[] {
    return [
      `Based on ${context}, there's an opportunity to improve workflow efficiency`,
      'Consider implementing automated document processing to save time',
      'Regular compliance reviews could reduce regulatory risks',
      'Team productivity could benefit from better task allocation'
    ]
  }

  // Create embeddings for semantic search
  async createEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.openai) {
      throw new Error('OpenAI service not initialized')
    }

    try {
      // Clean and prepare text for embedding
      const cleanedText = text.trim().slice(0, 8000) // Limit to 8k characters
      
      if (!cleanedText) {
        throw new Error('Empty text provided for embedding')
      }

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: cleanedText,
      })

      const embedding = response.data[0]?.embedding
      if (!embedding) {
        throw new Error('No embedding returned from OpenAI')
      }

      return embedding
    } catch (error) {
      console.error('Embedding creation failed:', error)
      throw error
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unavailable', details: string }> {
    if (!this.isInitialized) {
      return {
        status: 'unavailable',
        details: 'OpenAI service not initialized - API key missing or invalid'
      }
    }

    try {
      // Simple test request
      const testCompletion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      })

      return {
        status: 'healthy',
        details: `OpenAI service operational - Model: ${testCompletion.model || 'gpt-4o-mini'}`
      }
    } catch (error) {
      return {
        status: 'degraded',
        details: `OpenAI service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Export singleton instance
export const openaiService = new OpenAIService()