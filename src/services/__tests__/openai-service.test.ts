// OpenAI Service Tests
import { OpenAIService, DocumentAnalysisRequest, ChatRequest } from '../openai-service'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      embeddings: {
        create: jest.fn(),
      },
    })),
  }
})

import OpenAI from 'openai'
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('OpenAI Service', () => {
  let service: OpenAIService
  let mockOpenAIInstance: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key'

    // Create mock instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
      embeddings: {
        create: jest.fn(),
      },
    }

    mockOpenAI.mockImplementation(() => mockOpenAIInstance)

    // Create new service instance
    service = new OpenAIService()

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.OPENAI_API_KEY
  })

  describe('Service Initialization', () => {
    it('should initialize with valid API key', () => {
      process.env.OPENAI_API_KEY = 'valid-key'
      const testService = new OpenAIService()

      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: 'valid-key',
      })
      expect(console.log).toHaveBeenCalledWith('✅ OpenAI service initialized')
    })

    it('should warn when API key is not configured', () => {
      delete process.env.OPENAI_API_KEY
      new OpenAIService()

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️  OpenAI API key not configured, using mock responses'
      )
    })

    it('should warn when API key is placeholder', () => {
      process.env.OPENAI_API_KEY = 'your-openai-api-key-here'
      new OpenAIService()

      expect(console.warn).toHaveBeenCalledWith(
        '⚠️  OpenAI API key not configured, using mock responses'
      )
    })

    it('should handle initialization errors gracefully', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      mockOpenAI.mockImplementation(() => {
        throw new Error('Initialization failed')
      })

      new OpenAIService()

      expect(console.error).toHaveBeenCalledWith(
        '❌ Failed to initialize OpenAI service:',
        expect.any(Error)
      )
    })
  })

  describe('Document Analysis', () => {
    it('should analyze financial documents successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `**Summary**: Invoice analysis complete

**Key Findings**:
- Amount: ₹50,000
- GST: 18%

**Recommendations**:
- Verify GST calculation

**Risk Indicators**: None identified`,
            },
          },
        ],
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse)

      const request: DocumentAnalysisRequest = {
        content: 'Invoice #1234 for ₹50,000 with 18% GST',
        documentType: 'FINANCIAL',
        context: {
          clientName: 'Test Client',
          period: 'Q1 2024',
        },
      }

      const result = await service.analyzeDocument(request)

      expect(result.summary).toBe('Invoice analysis complete')
      expect(result.keyFindings).toContain('Amount: ₹50,000')
      expect(result.entities).toBeDefined()
      expect(result.recommendations).toContain('- Verify GST calculation')
      expect(result.confidence).toBe(0.85) // Base confidence for OpenAI responses
      expect(result.processingTime).toBeGreaterThanOrEqual(0)

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert CA (Chartered Accountant)'),
          },
          {
            role: 'user',
            content: expect.stringContaining('Invoice #1234'),
          },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      })
    })

    it('should handle different document types', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `**Summary**: Tax document analysis

**Key Findings**:
- TDS calculation details

**Recommendations**:
- File return timely`,
            },
          },
        ],
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse)

      const request: DocumentAnalysisRequest = {
        content: 'TDS certificate for ₹10,000',
        documentType: 'TAX',
      }

      const result = await service.analyzeDocument(request)

      expect(result.summary).toBe('Tax document analysis')
      expect(result.keyFindings).toContain('TDS calculation details')
    })

    it('should return mock analysis when OpenAI is not initialized', async () => {
      delete process.env.OPENAI_API_KEY
      const uninitializedService = new OpenAIService()

      const request: DocumentAnalysisRequest = {
        content: 'Test document',
        documentType: 'GENERAL',
      }

      const result = await uninitializedService.analyzeDocument(request)

      expect(result.summary).toBeDefined()
      expect(result.keyFindings).toBeDefined()
      expect(result.entities).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.riskIndicators).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.processingTime).toBeGreaterThanOrEqual(0)

      // Should not call OpenAI API
      expect(mockOpenAIInstance.chat.completions.create).not.toHaveBeenCalled()
    })

    it('should fallback to mock response on API error', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const request: DocumentAnalysisRequest = {
        content: 'Test document',
        documentType: 'FINANCIAL',
      }

      const result = await service.analyzeDocument(request)

      expect(result.summary).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(console.error).toHaveBeenCalledWith(
        'OpenAI document analysis error:',
        expect.any(Error)
      )
    })

    it('should handle empty OpenAI response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse)

      const request: DocumentAnalysisRequest = {
        content: 'Test document',
        documentType: 'FINANCIAL',
      }

      const result = await service.analyzeDocument(request)

      // Should fallback to mock response
      expect(result.summary).toBeDefined()
      expect(console.error).toHaveBeenCalledWith(
        'OpenAI document analysis error:',
        expect.any(Error)
      )
    })
  })

  describe('Chat with Assistant', () => {
    it('should handle chat requests successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                'GST filing deadline is 20th of each month. You should also check for any recent updates on the GST portal.',
            },
          },
        ],
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse)

      const request: ChatRequest = {
        message: 'What is the GST filing deadline?',
        context: {
          userRole: 'ASSOCIATE',
          businessContext: 'compliance_query',
        },
      }

      const result = await service.chatWithAssistant(request)

      expect(result.response).toBe(
        'GST filing deadline is 20th of each month. You should also check for any recent updates on the GST portal.'
      )
      expect(result.confidence).toBe(0.9) // Base confidence for chat responses
      expect(result.suggestions).toBeDefined()
      expect(result.followUpQuestions).toBeDefined()
      expect(result.resources).toBeDefined()

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({
            role: 'user',
            content: 'What is the GST filing deadline?',
          }),
        ]),
        temperature: 0.3,
        max_tokens: 1500,
      })
    })

    it('should include conversation history in requests', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                'Based on our previous discussion about GST filing, late filing penalties can range from ₹200 to ₹5,000.',
            },
          },
        ],
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse)

      const request: ChatRequest = {
        message: 'What about late filing penalties?',
        context: {
          userRole: 'MANAGER',
          conversationHistory: [
            {
              role: 'user',
              content: 'Tell me about GST filing',
              timestamp: new Date(),
            },
            {
              role: 'assistant',
              content: 'GST filing is required monthly',
              timestamp: new Date(),
            },
          ],
        },
      }

      const result = await service.chatWithAssistant(request)

      expect(result.response).toBe(
        'Based on our previous discussion about GST filing, late filing penalties can range from ₹200 to ₹5,000.'
      )

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0]
      expect(callArgs.messages).toHaveLength(4) // system + 2 history + current message
    })

    it('should return mock response when OpenAI is not initialized', async () => {
      delete process.env.OPENAI_API_KEY
      const uninitializedService = new OpenAIService()

      const request: ChatRequest = {
        message: 'Test question',
        context: {
          userRole: 'ASSOCIATE',
        },
      }

      const result = await uninitializedService.chatWithAssistant(request)

      expect(result.response).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.suggestions).toBeDefined()
      expect(result.followUpQuestions).toBeDefined()
      expect(result.resources).toBeDefined()

      // Should not call OpenAI API
      expect(mockOpenAIInstance.chat.completions.create).not.toHaveBeenCalled()
    })

    it('should handle different user roles', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                'As a partner, you should focus on strategic compliance risks and business growth opportunities in the current regulatory environment.',
            },
          },
        ],
      }

      mockOpenAIInstance.chat.completions.create.mockResolvedValue(mockResponse)

      const request: ChatRequest = {
        message: 'What are the compliance risks?',
        context: {
          userRole: 'PARTNER',
          businessContext: 'risk_assessment',
        },
      }

      await service.chatWithAssistant(request)

      const callArgs = mockOpenAIInstance.chat.completions.create.mock.calls[0][0]
      expect(callArgs.messages[0].content).toContain('partner')
    })

    it('should fallback to mock response on API error', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const request: ChatRequest = {
        message: 'Test question',
        context: {
          userRole: 'ASSOCIATE',
        },
      }

      const result = await service.chatWithAssistant(request)

      expect(result.response).toBeDefined()
      expect(console.error).toHaveBeenCalledWith('OpenAI chat error:', expect.any(Error))
    })
  })

  describe('Embeddings', () => {
    it('should create embeddings successfully', async () => {
      const mockEmbeddingResponse = {
        data: [
          {
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          },
        ],
      }

      mockOpenAIInstance.embeddings.create.mockResolvedValue(mockEmbeddingResponse)

      const text = 'Test document for embedding'
      const result = await service.createEmbedding(text)

      expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])

      expect(mockOpenAIInstance.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: text,
      })
    })

    it('should handle embedding creation errors', async () => {
      mockOpenAIInstance.embeddings.create.mockRejectedValue(new Error('Embedding failed'))

      const text = 'Test document'

      await expect(service.createEmbedding(text)).rejects.toThrow('Failed to create embedding')
      expect(console.error).toHaveBeenCalledWith('OpenAI embedding error:', expect.any(Error))
    })

    it('should return mock embedding when OpenAI is not initialized', async () => {
      delete process.env.OPENAI_API_KEY
      const uninitializedService = new OpenAIService()

      const text = 'Test document'
      const result = await uninitializedService.createEmbedding(text)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Should not call OpenAI API
      expect(mockOpenAIInstance.embeddings.create).not.toHaveBeenCalled()
    })
  })

  describe('Health Check', () => {
    it('should return healthy status when OpenAI is initialized', async () => {
      const health = await service.healthCheck()

      expect(health.status).toBe('healthy')
      expect(health.details).toContain('OpenAI service operational')
    })

    it('should return degraded status when OpenAI is not initialized', async () => {
      delete process.env.OPENAI_API_KEY
      const uninitializedService = new OpenAIService()

      const health = await uninitializedService.healthCheck()

      expect(health.status).toBe('degraded')
      expect(health.details).toContain('not initialized')
    })

    it('should test API connectivity', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Health check OK' } }],
      })

      const health = await service.healthCheck()

      expect(health.status).toBe('healthy')
      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5,
      })
    })

    it('should handle API connectivity errors', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const health = await service.healthCheck()

      expect(health.status).toBe('degraded')
      expect(health.details).toContain('API Error')
    })
  })

  describe('Insights Generation', () => {
    it('should generate insights from analysis results', async () => {
      // Mock OpenAI response for insights
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: `- High-value transaction requires additional scrutiny
- Consider implementing automated compliance checks
- Review client risk profile based on this analysis`,
            },
          },
        ],
      })

      const analysisResults = {
        summary: 'Document analysis complete',
        keyFindings: ['High amount transaction'],
        confidence: 0.9,
      }

      const insights = await service.generateInsights(analysisResults, 'compliance_check')

      expect(Array.isArray(insights)).toBe(true)
      expect(insights.length).toBeGreaterThan(0)
      expect(insights[0]).toContain('transaction')
    })

    it('should handle empty analysis results', async () => {
      const insights = await service.generateInsights({}, 'general')

      expect(Array.isArray(insights)).toBe(true)
      expect(insights.length).toBeGreaterThan(0)
    })
  })
})
