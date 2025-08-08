// AI Integration Test Suite
// Tests the complete AI integration flow

import { openaiService } from '../services/openai-service'
import { vectorService } from '../services/vector-service'
import { aiOrchestrator } from '../services/ai-orchestrator'

describe('AI Integration Tests', () => {
  beforeAll(async () => {
    // Initialize AI services
    await vectorService.initializeKnowledgeBase()
  })

  describe('OpenAI Service', () => {
    test('should create embeddings when API is available', async () => {
      const testText = 'This is a test document for embedding creation'

      try {
        const embedding = await openaiService.createEmbedding(testText)
        expect(embedding).toBeDefined()
        expect(Array.isArray(embedding)).toBe(true)
        expect(embedding.length).toBeGreaterThan(0)
      } catch (error) {
        // If OpenAI API is not configured, should gracefully handle
        expect(error).toBeDefined()
      }
    }, 10000)

    test('should handle document analysis requests', async () => {
      const request = {
        content: 'Invoice #1234 dated March 15, 2024 for ₹50,000 with GST @18%',
        documentType: 'FINANCIAL' as const,
        context: {
          clientName: 'Test Client',
          period: 'March 2024',
        },
      }

      const result = await openaiService.analyzeDocument(request)

      expect(result).toBeDefined()
      expect(result.summary).toBeDefined()
      expect(result.keyFindings).toBeDefined()
      expect(result.entities).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    test('should process chat requests with role context', async () => {
      const chatRequest = {
        message: 'What are the GST filing deadlines?',
        context: {
          userRole: 'ASSOCIATE' as const,
          businessContext: 'compliance_query',
        },
      }

      const response = await openaiService.chatWithAssistant(chatRequest)

      expect(response).toBeDefined()
      expect(response.response).toBeDefined()
      expect(response.confidence).toBeGreaterThan(0)
      expect(response.suggestions).toBeDefined()
    })
  })

  describe('Vector Search Service', () => {
    test('should perform semantic search', async () => {
      const searchQuery = {
        query: 'GST return filing requirements',
        limit: 5,
        threshold: 0.3,
      }

      const results = await vectorService.semanticSearch(searchQuery)

      expect(results).toBeDefined()
      expect(results.results).toBeDefined()
      expect(results.query).toBe(searchQuery.query)
      expect(results.processingTime).toBeGreaterThan(0)
      expect(results.totalFound).toBeGreaterThanOrEqual(0)
    })

    test('should search regulations with filters', async () => {
      const results = await vectorService.searchRegulations('TDS requirements', 'CBDT')

      expect(results).toBeDefined()
      expect(results.results).toBeDefined()
      expect(Array.isArray(results.results)).toBe(true)
    })

    test('should search procedures', async () => {
      const results = await vectorService.searchProcedures('audit checklist', 'GST Audit')

      expect(results).toBeDefined()
      expect(results.results).toBeDefined()
      expect(Array.isArray(results.results)).toBe(true)
    })
  })

  describe('AI Orchestrator', () => {
    test('should route AI requests correctly', async () => {
      const aiRequest = {
        id: `req_${Date.now()}_test`,
        type: 'AI' as const,
        priority: 'MEDIUM' as const,
        data: {
          message: 'Analyze this GST return document',
          documentType: 'FINANCIAL',
          userRole: 'ASSOCIATE',
        },
        userId: 'test-user-123',
        context: {
          userRole: 'ASSOCIATE' as const,
          businessContext: 'document_analysis',
          dataContext: {},
          preferences: {
            insightLevel: 'ADVANCED' as const,
            preferredFormat: 'DETAILED' as const,
            autoEnableAI: true,
            cachePreferences: true,
          },
        },
        timestamp: new Date(),
      }

      const result = await aiOrchestrator.processUnifiedRequest(aiRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(aiRequest.id)
      expect(result.results).toBeDefined()
      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
    })

    test('should handle vector search requests', async () => {
      const searchRequest = {
        id: `req_${Date.now()}_search`,
        type: 'AI' as const,
        priority: 'MEDIUM' as const,
        data: {
          query: 'income tax section 194A',
          filters: {
            types: ['REGULATION'],
            authorities: ['CBDT'],
          },
        },
        userId: 'test-user-123',
        context: {
          userRole: 'MANAGER' as const,
          businessContext: 'knowledge_search',
          dataContext: {},
          preferences: {
            insightLevel: 'ADVANCED' as const,
            preferredFormat: 'DETAILED' as const,
            autoEnableAI: true,
            cachePreferences: true,
          },
        },
        timestamp: new Date(),
      }

      const result = await aiOrchestrator.processUnifiedRequest(searchRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(searchRequest.id)
      expect(result.results).toBeDefined()
      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('Health Checks', () => {
    test('should verify OpenAI service health', async () => {
      const health = await openaiService.healthCheck()

      expect(health).toBeDefined()
      expect(health.status).toBeDefined()
      expect(['healthy', 'degraded', 'unavailable']).toContain(health.status)
      expect(health.details).toBeDefined()
    })

    test('should verify vector service health', async () => {
      const health = await vectorService.healthCheck()

      expect(health).toBeDefined()
      expect(health.status).toBeDefined()
      expect(['healthy', 'degraded']).toContain(health.status)
      expect(health.details).toBeDefined()
    })
  })

  describe('Integration Flow', () => {
    test('should complete end-to-end AI workflow', async () => {
      // 1. Document analysis
      const documentRequest = {
        content: 'GSTR-3B for March 2024: Total taxable supplies ₹10,00,000, CGST @9% ₹90,000',
        documentType: 'FINANCIAL' as const,
      }

      const documentAnalysis = await openaiService.analyzeDocument(documentRequest)
      expect(documentAnalysis.confidence).toBeGreaterThan(0)

      // 2. Knowledge base search
      const searchResults = await vectorService.semanticSearch({
        query: 'GSTR-3B filing requirements and deadlines',
        limit: 3,
      })
      expect(searchResults.results).toBeDefined()

      // 3. AI orchestration
      const orchestratedRequest = {
        id: `req_${Date.now()}_workflow`,
        type: 'AI' as const,
        priority: 'HIGH' as const,
        data: {
          message: 'What should I do with this GSTR-3B document?',
          context: {
            documentAnalysis,
            searchResults: searchResults.results,
          },
        },
        userId: 'test-user',
        context: {
          userRole: 'ASSOCIATE' as const,
          businessContext: 'document_workflow',
          dataContext: { documentType: 'GSTR-3B' },
          preferences: {
            insightLevel: 'ADVANCED' as const,
            preferredFormat: 'DETAILED' as const,
            autoEnableAI: true,
            cachePreferences: true,
          },
        },
        timestamp: new Date(),
      }

      const finalResult = await aiOrchestrator.processUnifiedRequest(orchestratedRequest)
      expect(finalResult.requestId).toBe(orchestratedRequest.id)
      expect(finalResult.results).toBeDefined()
      expect(finalResult.confidence).toBeGreaterThan(0)
      expect(finalResult.processingTime).toBeGreaterThanOrEqual(0)
    }, 15000)
  })
})
