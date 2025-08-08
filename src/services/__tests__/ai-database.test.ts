// AI Database Service Tests
import { AIDatabaseService, aiDatabase, createContentHash } from '../ai-database'

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    // Mock Prisma methods if needed
  })),
}))

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('abcdef123456', 'hex')),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash-value'),
  }),
}))

describe('AI Database Service', () => {
  let service: AIDatabaseService

  beforeEach(() => {
    service = new AIDatabaseService()
    jest.clearAllMocks()
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Analysis Result Storage', () => {
    it('should store AI analysis results', async () => {
      const testData = {
        requestId: 'req_123',
        userId: 'user_456',
        organizationId: 'org_789',
        type: 'DOCUMENT_ANALYSIS' as const,
        inputData: { document: 'test document content' },
        outputData: { summary: 'test summary' },
        confidence: 0.85,
        processingTime: 1500,
        aiModel: 'gpt-4o-mini',
        cached: false,
      }

      const analysisId = await service.storeAnalysisResult(testData)

      expect(analysisId).toBeDefined()
      expect(analysisId).toMatch(/^ai_\d+_abcdef123456$/)
      expect(console.log).toHaveBeenCalledWith(
        '💾 Storing AI Analysis Result:',
        expect.objectContaining({
          id: analysisId,
          type: 'DOCUMENT_ANALYSIS',
          userId: 'user_456',
          confidence: 0.85,
          processingTime: 1500,
        })
      )
    })

    it('should handle errors during analysis result storage', async () => {
      // Mock crypto.randomBytes to throw error
      const mockRandomBytes = require('crypto').randomBytes
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Random bytes generation failed')
      })

      const testData = {
        requestId: 'req_123',
        userId: 'user_456',
        organizationId: 'org_789',
        type: 'DOCUMENT_ANALYSIS' as const,
        inputData: {},
        outputData: {},
        confidence: 0.85,
        processingTime: 1500,
        aiModel: 'gpt-4o-mini',
        cached: false,
      }

      await expect(service.storeAnalysisResult(testData)).rejects.toThrow(
        'Random bytes generation failed'
      )
    })
  })

  describe('Usage Logging', () => {
    it('should log AI usage successfully', async () => {
      const testUsage = {
        userId: 'user_123',
        organizationId: 'org_456',
        endpoint: '/api/ai/process',
        requestType: 'DOCUMENT_ANALYSIS',
        userRole: 'ASSOCIATE',
        businessContext: 'document_processing',
        success: true,
        tokensUsed: 150,
        processingTime: 2000,
      }

      await service.logUsage(testUsage)

      expect(console.log).toHaveBeenCalledWith(
        '📊 Logging AI Usage:',
        expect.objectContaining({
          endpoint: '/api/ai/process',
          userRole: 'ASSOCIATE',
          success: true,
          processingTime: 2000,
        })
      )
    })

    it('should handle errors during usage logging gracefully', async () => {
      // Mock crypto.randomBytes to throw error
      const mockRandomBytes = require('crypto').randomBytes
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Usage logging failed')
      })

      const testUsage = {
        userId: 'user_123',
        organizationId: 'org_456',
        endpoint: '/api/ai/process',
        requestType: 'DOCUMENT_ANALYSIS',
        userRole: 'ASSOCIATE',
        success: false,
        errorMessage: 'Test error',
        processingTime: 500,
      }

      // Should not throw error
      await expect(service.logUsage(testUsage)).resolves.toBeUndefined()
      expect(console.error).toHaveBeenCalledWith('Failed to log AI usage:', expect.any(Error))
    })
  })

  describe('Vector Embedding Cache', () => {
    it('should return null for cache miss', async () => {
      const result = await service.getEmbeddingByContentHash('test-hash')

      expect(result).toBeNull()
      expect(console.log).toHaveBeenCalledWith(
        '🔍 Looking up cached embedding for hash:',
        'test-hash...'
      )
    })

    it('should store vector embeddings', async () => {
      const testEmbedding = {
        contentHash: 'test-hash-123',
        content: 'Test document content',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        model: 'text-embedding-3-small',
        dimensions: 5,
        organizationId: 'org_789',
        documentType: 'FINANCIAL',
        metadata: { source: 'test' },
      }

      const embeddingId = await service.storeEmbedding(testEmbedding)

      expect(embeddingId).toBeDefined()
      expect(embeddingId).toMatch(/^emb_\d+_abcdef123456$/)
      expect(console.log).toHaveBeenCalledWith(
        '💾 Storing Vector Embedding:',
        expect.objectContaining({
          id: embeddingId,
          contentHash: 'test-hash-123...',
          dimensions: 5,
          model: 'text-embedding-3-small',
        })
      )
    })

    it('should handle errors during embedding storage', async () => {
      const mockRandomBytes = require('crypto').randomBytes
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Embedding storage failed')
      })

      const testEmbedding = {
        contentHash: 'test-hash',
        content: 'content',
        embedding: [0.1, 0.2],
        model: 'test-model',
        dimensions: 2,
        organizationId: 'org',
        metadata: {},
      }

      await expect(service.storeEmbedding(testEmbedding)).rejects.toThrow(
        'Embedding storage failed'
      )
    })
  })

  describe('AI Generated Task Tracking', () => {
    it('should track AI-generated tasks', async () => {
      const testTask = {
        taskId: 'task_123',
        sourceType: 'EMAIL' as const,
        sourceId: 'email_456',
        aiAnalysisId: 'analysis_789',
        confidence: 0.92,
      }

      const trackingId = await service.trackGeneratedTask(testTask)

      expect(trackingId).toBeDefined()
      expect(trackingId).toMatch(/^ai_task_\d+_abcdef123456$/)
      expect(console.log).toHaveBeenCalledWith(
        '📋 Tracking AI-Generated Task:',
        expect.objectContaining({
          id: trackingId,
          taskId: 'task_123',
          sourceType: 'EMAIL',
          confidence: 0.92,
        })
      )
    })

    it('should handle errors during task tracking', async () => {
      const mockRandomBytes = require('crypto').randomBytes
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Task tracking failed')
      })

      const testTask = {
        taskId: 'task_123',
        sourceType: 'EMAIL' as const,
        confidence: 0.92,
      }

      await expect(service.trackGeneratedTask(testTask)).rejects.toThrow('Task tracking failed')
    })
  })

  describe('Email Classification Storage', () => {
    it('should store email classification results', async () => {
      const testClassification = {
        emailId: 'email_123',
        categories: [{ id: 'tax', name: 'Tax & Compliance', confidence: 0.95 }],
        priority: 'HIGH',
        confidence: 0.88,
        suggestedActions: ['Review immediately', 'Schedule meeting'],
        requiresResponse: true,
        estimatedResponseTime: '24 hours',
        aiAnalysisId: 'analysis_456',
      }

      const classificationId = await service.storeEmailClassification(testClassification)

      expect(classificationId).toBeDefined()
      expect(classificationId).toMatch(/^email_class_\d+_abcdef123456$/)
      expect(console.log).toHaveBeenCalledWith(
        '📧 Storing Email Classification:',
        expect.objectContaining({
          id: classificationId,
          emailId: 'email_123',
          categories: 1,
          priority: 'HIGH',
          confidence: 0.88,
        })
      )
    })

    it('should handle errors during email classification storage', async () => {
      const mockRandomBytes = require('crypto').randomBytes
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Email classification storage failed')
      })

      const testClassification = {
        emailId: 'email_123',
        categories: [],
        priority: 'MEDIUM',
        confidence: 0.7,
        suggestedActions: [],
        requiresResponse: false,
      }

      await expect(service.storeEmailClassification(testClassification)).rejects.toThrow(
        'Email classification storage failed'
      )
    })
  })

  describe('User AI Preferences', () => {
    it('should get default user AI preferences', async () => {
      const preferences = await service.getUserAIPreferences('user_123')

      expect(preferences).toEqual({
        userId: 'user_123',
        aiEnabled: true,
        insightLevel: 'ADVANCED',
        autoTaskGeneration: true,
        autoEmailCategorization: true,
        notificationPreferences: {
          emailInsights: true,
          taskSuggestions: true,
          documentAnalysis: true,
        },
      })
    })

    it('should handle errors during preference retrieval', async () => {
      // Mock console.log to throw error
      const originalLog = console.log
      jest.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Preference retrieval failed')
      })

      const preferences = await service.getUserAIPreferences('user_123')

      // Should return default preferences on error
      expect(preferences.userId).toBe('user_123')
      expect(preferences.aiEnabled).toBe(true)
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get user AI preferences:',
        expect.any(Error)
      )

      console.log = originalLog
    })

    it('should update user AI preferences', async () => {
      const newPreferences = {
        aiEnabled: false,
        insightLevel: 'BASIC',
        autoTaskGeneration: false,
      }

      await service.updateUserAIPreferences('user_123', newPreferences)

      expect(console.log).toHaveBeenCalledWith(
        '⚙️ Updating AI preferences for user:',
        'user_123',
        newPreferences
      )
    })

    it('should handle errors during preference update', async () => {
      const originalLog = console.log
      jest.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Preference update failed')
      })

      const newPreferences = { aiEnabled: false }

      await expect(service.updateUserAIPreferences('user_123', newPreferences)).rejects.toThrow(
        'Preference update failed'
      )

      console.log = originalLog
    })
  })

  describe('Analytics Queries', () => {
    it('should return AI usage analytics', async () => {
      const analytics = await service.getAIUsageAnalytics('org_123', 'week')

      expect(analytics).toEqual({
        totalRequests: 1247,
        successRate: 94.2,
        avgProcessingTime: 1250,
        topEndpoints: [
          { endpoint: '/api/ai/process', count: 543 },
          { endpoint: '/api/emails/categorize', count: 367 },
          { endpoint: '/api/tasks/suggestions', count: 234 },
        ],
        userRoleDistribution: {
          PARTNER: 15,
          MANAGER: 35,
          ASSOCIATE: 45,
          INTERN: 5,
        },
        aiAccuracy: {
          documentAnalysis: 94.2,
          emailCategorization: 91.3,
          taskSuggestions: 88.7,
        },
      })
    })

    it('should handle errors during analytics retrieval', async () => {
      const originalLog = console.log
      jest.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Analytics query failed')
      })

      const analytics = await service.getAIUsageAnalytics('org_123')

      expect(analytics).toBeNull()
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get AI usage analytics:',
        expect.any(Error)
      )

      console.log = originalLog
    })
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await service.healthCheck()

      expect(health).toEqual({
        status: 'healthy',
        details: 'AI database service operational (mock mode)',
      })
    })

    it('should return degraded status on error', async () => {
      const originalLog = console.log
      jest.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      const health = await service.healthCheck()

      expect(health.status).toBe('degraded')
      expect(health.details).toContain('AI database error: Database connection failed')

      console.log = originalLog
    })
  })

  describe('Cleanup Operations', () => {
    it('should cleanup old records', async () => {
      const deletedCount = await service.cleanupOldRecords(90)

      expect(deletedCount).toBe(42) // Mock value
      expect(console.log).toHaveBeenCalledWith('🧹 Cleaning up AI records older than 90 days')
    })

    it('should handle cleanup errors', async () => {
      const originalLog = console.log
      jest.spyOn(console, 'log').mockImplementationOnce(() => {
        throw new Error('Cleanup failed')
      })

      const deletedCount = await service.cleanupOldRecords(30)

      expect(deletedCount).toBe(0)
      expect(console.error).toHaveBeenCalledWith(
        'Failed to cleanup old AI records:',
        expect.any(Error)
      )

      console.log = originalLog
    })
  })

  describe('Utility Functions', () => {
    it('should create content hash', () => {
      const hash = createContentHash('test content')
      expect(hash).toBe('mocked-hash-value')

      const mockCreateHash = require('crypto').createHash
      expect(mockCreateHash).toHaveBeenCalledWith('sha256')
    })
  })

  describe('Singleton Instance', () => {
    it('should export singleton aiDatabase instance', () => {
      expect(aiDatabase).toBeInstanceOf(AIDatabaseService)
    })
  })
})
