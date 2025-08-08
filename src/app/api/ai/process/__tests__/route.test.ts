// AI Process API Route Tests
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      const response = {
        json: jest.fn().mockResolvedValue(data),
        status: options?.status || 200,
        headers: new Map(),
      }
      return response
    }),
  },
}))

// Mock all dependencies
jest.mock('../../../../../services/ai-orchestrator', () => ({
  aiOrchestrator: {
    processUnifiedRequest: jest.fn(),
  },
}))

jest.mock('../../../../../services/openai-service', () => ({
  openaiService: {
    analyzeDocument: jest.fn(),
    chatWithAssistant: jest.fn(),
  },
}))

jest.mock('../../../../../services/vector-service', () => ({
  vectorService: {
    semanticSearch: jest.fn(),
  },
}))

jest.mock('../../../../../services/ai-database', () => ({
  aiDatabase: {
    storeAnalysisResult: jest.fn(),
    logUsage: jest.fn(),
  },
}))

jest.mock('../../../../../middleware/ai-security', () => ({
  AISecurityMiddleware: {
    protect: jest.fn(),
  },
}))

import { aiOrchestrator } from '../../../../../services/ai-orchestrator'
import { openaiService } from '../../../../../services/openai-service'
import { vectorService } from '../../../../../services/vector-service'
import { aiDatabase } from '../../../../../services/ai-database'
import { AISecurityMiddleware } from '../../../../../middleware/ai-security'

const mockAiOrchestrator = aiOrchestrator as jest.Mocked<typeof aiOrchestrator>
const mockOpenaiService = openaiService as jest.Mocked<typeof openaiService>
const mockVectorService = vectorService as jest.Mocked<typeof vectorService>
const mockAiDatabase = aiDatabase as jest.Mocked<typeof aiDatabase>
const mockSecurity = AISecurityMiddleware as jest.Mocked<typeof AISecurityMiddleware>

describe('/api/ai/process API Route', () => {
  const createMockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
    } as unknown as NextRequest
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock security to pass by default
    mockSecurity.protect.mockResolvedValue(null)
    // Mock successful database operations
    mockAiDatabase.storeAnalysisResult.mockResolvedValue('analysis_123')
    mockAiDatabase.logUsage.mockResolvedValue()
  })

  describe('POST /api/ai/process', () => {
    it('should process document analysis requests', async () => {
      const requestBody = {
        type: 'AI',
        data: {
          document: 'Test invoice content',
          documentType: 'FINANCIAL',
          context: { clientName: 'Test Client' },
        },
        userId: 'user_123',
        context: {
          userRole: 'ASSOCIATE',
          businessContext: 'document_analysis',
          organizationId: 'org_456',
        },
      }

      const mockAnalysisResult = {
        summary: 'Invoice analysis complete',
        keyFindings: ['Amount: ₹50,000'],
        entities: [],
        recommendations: ['Verify GST calculation'],
        riskIndicators: [],
        confidence: 0.95,
        processingTime: 1500,
      }

      mockOpenaiService.analyzeDocument.mockResolvedValue(mockAnalysisResult)

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockAnalysisResult)
      expect(responseData.requestId).toBeDefined()
      expect(responseData.processingTime).toBeGreaterThanOrEqual(0)

      expect(mockOpenaiService.analyzeDocument).toHaveBeenCalledWith({
        content: 'Test invoice content',
        documentType: 'FINANCIAL',
        context: { clientName: 'Test Client' },
      })

      expect(mockAiDatabase.storeAnalysisResult).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          organizationId: 'org_456',
          type: 'GENERAL',
          inputData: expect.objectContaining({
            type: 'AI',
            data: expect.objectContaining({
              document: 'Test invoice content',
            }),
          }),
          outputData: mockAnalysisResult,
        })
      )
    })

    it('should process chat requests', async () => {
      const requestBody = {
        type: 'AI',
        data: {
          message: 'What are GST filing deadlines?',
          context: {
            userRole: 'ASSOCIATE',
          },
        },
        userId: 'user_123',
        context: {
          userRole: 'ASSOCIATE',
          businessContext: 'compliance_query',
          organizationId: 'org_456',
        },
      }

      const mockChatResponse = {
        response: 'GST filing deadlines are on the 20th of each month.',
        confidence: 0.92,
        suggestions: ['Check latest updates'],
        followUpQuestions: ['Need help with specific form?'],
        resources: ['GST Guide'],
      }

      mockOpenaiService.chatWithAssistant.mockResolvedValue(mockChatResponse)

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockChatResponse)

      expect(mockOpenaiService.chatWithAssistant).toHaveBeenCalledWith({
        message: 'What are GST filing deadlines?',
        context: {
          userRole: 'ASSOCIATE',
          businessContext: 'compliance_query',
          conversationHistory: undefined,
        },
      })
    })

    it('should process vector search requests', async () => {
      const requestBody = {
        type: 'VECTOR_SEARCH',
        data: {
          query: 'tax regulations',
          filters: { type: 'REGULATION' },
          limit: 5,
          threshold: 0.8,
        },
        userId: 'user_123',
        context: {
          userRole: 'MANAGER',
          businessContext: 'research',
          organizationId: 'org_456',
        },
      }

      const mockSearchResults = {
        results: [
          { id: '1', content: 'Tax Regulation A', score: 0.95 },
          { id: '2', content: 'Tax Regulation B', score: 0.87 },
        ],
        query: 'tax regulations',
        totalFound: 2,
        processingTime: 250,
      }

      mockVectorService.semanticSearch.mockResolvedValue(mockSearchResults)

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockSearchResults)

      expect(mockVectorService.semanticSearch).toHaveBeenCalledWith({
        query: 'tax regulations',
        filters: { type: 'REGULATION' },
        limit: 5,
        threshold: 0.8,
      })
    })

    it('should process unified orchestrator requests', async () => {
      const requestBody = {
        type: 'AI',
        data: {
          someComplexData: 'test',
        },
        userId: 'user_123',
        context: {
          userRole: 'PARTNER',
          businessContext: 'analytics',
          organizationId: 'org_456',
        },
      }

      const mockUnifiedResponse = {
        id: 'unified_123',
        requestId: 'req_456',
        results: { processedData: 'success' },
        insights: [],
        analytics: [],
        recommendations: [],
        confidence: 0.88,
        processingTime: 2000,
        cached: false,
      }

      mockAiOrchestrator.processUnifiedRequest.mockResolvedValue(mockUnifiedResponse)

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockUnifiedResponse)

      expect(mockAiOrchestrator.processUnifiedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'AI',
          data: { someComplexData: 'test' },
          userId: 'user_123',
          context: expect.objectContaining({
            userRole: 'PARTNER',
            businessContext: 'analytics',
          }),
        })
      )
    })

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        type: 'AI',
        // Missing data and userId
        context: {
          userRole: 'ASSOCIATE',
        },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.error).toBe('Missing required fields: data, userId')

      expect(mockAiDatabase.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Missing required fields',
        })
      )
    })

    it('should return 400 for unsupported request types', async () => {
      const requestBody = {
        type: 'UNSUPPORTED_TYPE',
        data: { test: 'data' },
        userId: 'user_123',
        context: { userRole: 'ASSOCIATE' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.error).toBe('Unsupported request type: UNSUPPORTED_TYPE')
    })

    it('should handle security middleware blocking', async () => {
      const securityResponse = new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
      })
      mockSecurity.protect.mockResolvedValue(securityResponse)

      const requestBody = {
        type: 'AI',
        data: { test: 'data' },
        userId: 'user_123',
        context: { userRole: 'ASSOCIATE' },
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.error).toBe('Authentication required')
    })

    it('should handle processing errors gracefully', async () => {
      const requestBody = {
        type: 'AI',
        data: {
          document: 'test content',
        },
        userId: 'user_123',
        context: {
          userRole: 'ASSOCIATE',
          organizationId: 'org_456',
        },
      }

      mockOpenaiService.analyzeDocument.mockRejectedValue(new Error('AI service error'))

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.error).toBe('Processing failed')
      expect(responseData.message).toBe('AI service error')

      expect(mockAiDatabase.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'AI service error',
        })
      )
    })

    it('should continue processing even if database operations fail', async () => {
      const requestBody = {
        type: 'AI',
        data: {
          message: 'Test message',
        },
        userId: 'user_123',
        context: {
          userRole: 'ASSOCIATE',
          organizationId: 'org_456',
        },
      }

      const mockChatResponse = {
        response: 'Test response',
        confidence: 0.8,
        suggestions: [],
        followUpQuestions: [],
        resources: [],
      }

      mockOpenaiService.chatWithAssistant.mockResolvedValue(mockChatResponse)
      mockAiDatabase.storeAnalysisResult.mockRejectedValue(new Error('DB error'))

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(mockChatResponse)
    })
  })

  describe('GET /api/ai/process', () => {
    it('should return API status and capabilities', async () => {
      const request = {} as NextRequest
      const response = await GET(request)

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.message).toBe('AI Processing API is running')
      expect(responseData.version).toBe('1.0.0')
      expect(responseData.capabilities).toEqual([
        'DOCUMENT_PROCESSING',
        'ANALYTICS',
        'INSIGHTS',
        'RECOMMENDATIONS',
      ])
      expect(responseData.status).toBe('operational')
      expect(responseData.timestamp).toBeDefined()
    })
  })
})
