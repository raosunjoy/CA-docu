import { AdvancedDocumentIntelligenceService, advancedDocumentIntelligence } from '../advanced-document-intelligence'
import { openaiService } from '../openai-service'
import { vectorService } from '../vector-service'
import { analyticsService } from '../analytics-service'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../vector-service')
jest.mock('../analytics-service')
jest.mock('../document-intelligence')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedVectorService = vectorService as jest.Mocked<typeof vectorService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>

describe('AdvancedDocumentIntelligenceService', () => {
  let service: AdvancedDocumentIntelligenceService
  
  const mockDocument = {
    id: 'doc_123',
    filename: 'test_contract.pdf',
    content: 'This is a service agreement between Acme Corp and Client XYZ. The total amount is $50,000 due on March 15, 2024.',
    contentType: 'PDF' as const,
    size: 2048,
    uploadedAt: new Date(),
    processedAt: new Date(),
    organizationId: 'org_456',
    userId: 'user_789',
    metadata: {
      classification: {
        primaryType: 'CONTRACT' as const,
        confidence: 0.89,
        reasoning: 'Contains agreement terminology and parties'
      },
      entities: [
        { type: 'COMPANY', value: 'Acme Corp', confidence: 0.95, context: 'service provider' },
        { type: 'COMPANY', value: 'Client XYZ', confidence: 0.92, context: 'client' },
        { type: 'AMOUNT', value: '$50,000', confidence: 0.98, context: 'total amount' },
        { type: 'DATE', value: 'March 15, 2024', confidence: 0.94, context: 'due date' }
      ],
      compliance: {
        applicableRegulations: ['Contract Law', 'Consumer Protection'],
        complianceStatus: 'COMPLIANT' as const,
        issues: [],
        deadlines: [],
        recommendations: ['Ensure proper contract execution']
      },
      financial: {
        totalAmounts: { USD: 50000 },
        keyMetrics: [
          { name: 'Contract Value', value: 50000, currency: 'USD' }
        ],
        anomalies: [],
        trends: []
      },
      risks: [],
      processingStatus: 'COMPLETED' as const,
      aiConfidence: 0.89,
      processingTime: 3200,
      relatedDocuments: [],
      tags: ['CONTRACT', 'COMPANY', 'AMOUNT'],
      keywords: ['agreement', 'service', 'amount', 'client'],
      workflowStage: 'UPLOADED' as const
    }
  }

  beforeEach(() => {
    service = new AdvancedDocumentIntelligenceService()
    jest.clearAllMocks()

    // Setup default mocks
    mockedOpenAIService.analyzeDocument.mockResolvedValue({
      summary: 'Contract analysis completed',
      keyInsights: ['Valid contract structure', 'Clear payment terms'],
      entities: mockDocument.metadata.entities,
      riskIndicators: [],
      confidence: 0.89
    })

    mockedVectorService.semanticSearch.mockResolvedValue({
      results: [],
      totalResults: 0,
      processingTime: 150
    })
  })

  describe('processDocumentAdvanced', () => {
    const processingRequest = {
      filename: 'test_contract.pdf',
      content: 'This is a service agreement between Acme Corp and Client XYZ. The total amount is $50,000 due on March 15, 2024.',
      contentType: 'PDF' as const,
      organizationId: 'org_456',
      userId: 'user_789'
    }

    it('should process document with advanced intelligence features', async () => {
      // Mock vector search for similar documents
      mockedVectorService.semanticSearch.mockResolvedValue({
        results: [
          {
            document: {
              id: 'similar_doc_1',
              content: 'Another service agreement...',
              metadata: {
                title: 'Similar Contract',
                category: 'CONTRACT'
              }
            },
            relevanceScore: 0.85,
            relevantSections: ['Payment terms', 'Service scope']
          }
        ],
        totalResults: 1,
        processingTime: 200
      })

      const result = await service.processDocumentAdvanced(processingRequest)

      expect(result.document).toBeDefined()
      expect(result.similarDocuments).toBeDefined()
      expect(result.categorization).toBeDefined()
      expect(result.workflowRecommendations).toBeDefined()

      // Verify similar documents detection was called
      expect(mockedVectorService.semanticSearch).toHaveBeenCalled()

      // Check similar documents results
      expect(result.similarDocuments).toHaveLength(1)
      expect(result.similarDocuments[0].similarityScore).toBe(0.85)

      // Check categorization
      expect(result.categorization.categories).toBeDefined()
      expect(result.categorization.confidenceLevel).toMatch(/HIGH|MEDIUM|LOW/)
      expect(result.categorization.reasoningChain).toBeDefined()
      expect(result.categorization.suggestedWorkflow).toBeDefined()
    })

    it('should handle processing errors gracefully', async () => {
      // Mock error in vector service
      mockedVectorService.semanticSearch.mockRejectedValue(new Error('Vector search failed'))

      const result = await service.processDocumentAdvanced(processingRequest)

      // Should still return result with empty similar documents
      expect(result.document).toBeDefined()
      expect(result.similarDocuments).toEqual([])
      expect(result.categorization).toBeDefined()
    })
  })

  describe('compareDocuments', () => {
    const sourceDocId = 'doc_1'
    const targetDocId = 'doc_2'

    const targetDocument = {
      ...mockDocument,
      id: 'doc_2',
      content: 'This is a different service agreement between Acme Corp and Another Client. The total amount is $75,000 due on April 20, 2024.',
      metadata: {
        ...mockDocument.metadata,
        entities: [
          { type: 'COMPANY', value: 'Acme Corp', confidence: 0.95, context: 'service provider' },
          { type: 'COMPANY', value: 'Another Client', confidence: 0.90, context: 'client' },
          { type: 'AMOUNT', value: '$75,000', confidence: 0.97, context: 'total amount' },
          { type: 'DATE', value: 'April 20, 2024', confidence: 0.93, context: 'due date' }
        ],
        financial: {
          totalAmounts: { USD: 75000 },
          keyMetrics: [
            { name: 'Contract Value', value: 75000, currency: 'USD' }
          ],
          anomalies: [],
          trends: []
        }
      }
    }

    beforeEach(() => {
      // Mock document retrieval
      jest.spyOn(service, 'getDocumentById')
        .mockImplementation(async (id) => {
          if (id === sourceDocId) return mockDocument
          if (id === targetDocId) return targetDocument
          return null
        })

      // Mock AI content comparison
      mockedOpenAIService.analyzeDocument.mockResolvedValue({
        summary: 'Documents have similar structure with different amounts and clients',
        keyInsights: ['Both are service agreements', 'Different monetary values'],
        entities: [],
        riskIndicators: [],
        confidence: 0.78
      })
    })

    it('should compare two documents successfully', async () => {
      const comparison = await service.compareDocuments(sourceDocId, targetDocId)

      expect(comparison.sourceDocument).toEqual(mockDocument)
      expect(comparison.targetDocument).toEqual(targetDocument)
      expect(comparison.similarityScore).toBeGreaterThan(0)
      expect(comparison.comparisonResults).toBeDefined()
      expect(comparison.comparisonResults).toHaveLength(5) // CONTENT, STRUCTURE, ENTITIES, FINANCIAL, COMPLIANCE
      expect(comparison.recommendations).toBeDefined()
      expect(comparison.processingTime).toBeGreaterThan(0)

      // Check specific comparison categories
      const categories = comparison.comparisonResults.map(r => r.category)
      expect(categories).toContain('CONTENT')
      expect(categories).toContain('STRUCTURE')
      expect(categories).toContain('ENTITIES')
      expect(categories).toContain('FINANCIAL')
      expect(categories).toContain('COMPLIANCE')
    })

    it('should identify entity differences', async () => {
      const comparison = await service.compareDocuments(sourceDocId, targetDocId)

      const entityComparison = comparison.comparisonResults.find(r => r.category === 'ENTITIES')
      expect(entityComparison).toBeDefined()
      expect(entityComparison!.differences.length).toBeGreaterThan(0)

      // Should detect client name change
      const clientDifference = entityComparison!.differences.find(
        d => d.field.includes('entity_COMPANY') && d.description.includes('Client XYZ')
      )
      expect(clientDifference).toBeDefined()
    })

    it('should identify financial differences', async () => {
      const comparison = await service.compareDocuments(sourceDocId, targetDocId)

      const financialComparison = comparison.comparisonResults.find(r => r.category === 'FINANCIAL')
      expect(financialComparison).toBeDefined()
      expect(financialComparison!.differences.length).toBeGreaterThan(0)

      // Should detect amount difference
      const amountDifference = financialComparison!.differences.find(
        d => d.field.includes('totalAmount_USD')
      )
      expect(amountDifference).toBeDefined()
      expect(amountDifference!.sourceValue).toBe(50000)
      expect(amountDifference!.targetValue).toBe(75000)
    })

    it('should generate appropriate recommendations', async () => {
      const comparison = await service.compareDocuments(sourceDocId, targetDocId)

      expect(comparison.recommendations).toBeDefined()
      expect(comparison.recommendations.length).toBeGreaterThan(0)

      // Should have financial discrepancy recommendation due to different amounts
      const financialRec = comparison.recommendations.find(
        r => r.title.includes('Financial')
      )
      expect(financialRec).toBeDefined()
    })

    it('should throw error for non-existent documents', async () => {
      await expect(
        service.compareDocuments('invalid_id', targetDocId)
      ).rejects.toThrow('One or both documents not found')
    })
  })

  describe('detectSimilarDocuments', () => {
    const similarityRequest = {
      targetDocument: mockDocument,
      searchCriteria: {
        organizationId: 'org_456',
        minSimilarity: 0.7,
        maxResults: 5
      }
    }

    it('should detect similar documents', async () => {
      mockedVectorService.semanticSearch.mockResolvedValue({
        results: [
          {
            document: {
              id: 'similar_doc_1',
              content: 'Another service agreement with similar terms...',
              metadata: {
                title: 'Service Agreement v2',
                category: 'CONTRACT'
              }
            },
            relevanceScore: 0.85,
            relevantSections: ['Terms and conditions', 'Payment schedule']
          },
          {
            document: {
              id: 'similar_doc_2', 
              content: 'Yet another contract...',
              metadata: {
                title: 'Master Service Agreement',
                category: 'CONTRACT'
              }
            },
            relevanceScore: 0.78,
            relevantSections: ['Service scope', 'Deliverables']
          }
        ],
        totalResults: 2,
        processingTime: 180
      })

      const results = await service.detectSimilarDocuments(similarityRequest)

      expect(results).toHaveLength(2)
      expect(results[0].similarityScore).toBe(0.85)
      expect(results[1].similarityScore).toBe(0.78)
      expect(results[0].matchingFeatures).toBeDefined()
      expect(results[0].riskLevel).toMatch(/LOW|MEDIUM|HIGH/)
      expect(results[0].recommendation).toBeDefined()

      // Should be sorted by similarity score (highest first)
      expect(results[0].similarityScore).toBeGreaterThanOrEqual(results[1].similarityScore)
    })

    it('should filter out documents below similarity threshold', async () => {
      mockedVectorService.semanticSearch.mockResolvedValue({
        results: [
          {
            document: { id: 'high_similarity', metadata: { title: 'High Sim Doc' } } as any,
            relevanceScore: 0.85
          },
          {
            document: { id: 'low_similarity', metadata: { title: 'Low Sim Doc' } } as any,
            relevanceScore: 0.5 // Below threshold
          }
        ],
        totalResults: 2,
        processingTime: 150
      })

      const results = await service.detectSimilarDocuments(similarityRequest)

      // Should only return documents above threshold
      expect(results).toHaveLength(1)
      expect(results[0].document.id).toBe('high_similarity')
    })

    it('should exclude the target document itself', async () => {
      mockedVectorService.semanticSearch.mockResolvedValue({
        results: [
          {
            document: { id: mockDocument.id, metadata: { title: 'Same Doc' } } as any,
            relevanceScore: 1.0 // Perfect match (same document)
          },
          {
            document: { id: 'different_doc', metadata: { title: 'Different Doc' } } as any,
            relevanceScore: 0.8
          }
        ],
        totalResults: 2,
        processingTime: 120
      })

      const results = await service.detectSimilarDocuments(similarityRequest)

      // Should exclude the target document itself
      expect(results).toHaveLength(1)
      expect(results[0].document.id).toBe('different_doc')
    })

    it('should handle vector search errors gracefully', async () => {
      mockedVectorService.semanticSearch.mockRejectedValue(new Error('Vector search failed'))

      const results = await service.detectSimilarDocuments(similarityRequest)

      expect(results).toEqual([])
    })
  })

  describe('performAutoCategorization', () => {
    it('should perform comprehensive auto-categorization', async () => {
      const categorization = await service.performAutoCategorization(mockDocument)

      expect(categorization.categories).toBeDefined()
      expect(categorization.categories.length).toBeGreaterThan(0)
      expect(categorization.confidenceLevel).toMatch(/HIGH|MEDIUM|LOW/)
      expect(categorization.reasoningChain).toBeDefined()
      expect(categorization.reasoningChain.length).toBeGreaterThan(0)
      expect(categorization.suggestedWorkflow).toBeDefined()
      expect(categorization.alternativeCategories).toBeDefined()

      // Check reasoning chain steps
      const reasoningSteps = categorization.reasoningChain
      expect(reasoningSteps[0].process).toBe('AI Classification')
      expect(reasoningSteps.every(step => step.confidence >= 0 && step.confidence <= 1)).toBe(true)
    })

    it('should generate workflow recommendations based on confidence and risks', async () => {
      const highRiskDocument = {
        ...mockDocument,
        metadata: {
          ...mockDocument.metadata,
          risks: [
            {
              category: 'FINANCIAL' as const,
              level: 'HIGH' as const,
              description: 'High financial risk detected',
              impact: 'Potential revenue loss',
              probability: 0.8,
              mitigation: ['Review terms', 'Negotiate better conditions']
            }
          ],
          aiConfidence: 0.5 // Low confidence
        }
      }

      const categorization = await service.performAutoCategorization(highRiskDocument)

      expect(categorization.suggestedWorkflow.recommendedStage).toBe('IMMEDIATE_REVIEW')
      expect(categorization.suggestedWorkflow.automationLevel).toBeLessThan(50)
      expect(categorization.suggestedWorkflow.nextActions).toBeDefined()
      expect(categorization.suggestedWorkflow.nextActions.length).toBeGreaterThan(0)
    })

    it('should recommend automated approval for high confidence, low risk documents', async () => {
      const lowRiskDocument = {
        ...mockDocument,
        metadata: {
          ...mockDocument.metadata,
          classification: {
            ...mockDocument.metadata.classification,
            confidence: 0.95
          },
          risks: [], // No risks
          aiConfidence: 0.95
        }
      }

      const categorization = await service.performAutoCategorization(lowRiskDocument)

      expect(categorization.suggestedWorkflow.recommendedStage).toBe('AUTOMATED_APPROVAL')
      expect(categorization.suggestedWorkflow.automationLevel).toBeGreaterThan(80)
    })

    it('should handle categorization errors gracefully', async () => {
      // Create a document that might cause processing errors
      const problematicDocument = {
        ...mockDocument,
        content: '', // Empty content
        metadata: {
          ...mockDocument.metadata,
          entities: [], // No entities
          classification: {
            primaryType: 'OTHER' as const,
            confidence: 0,
            reasoning: 'Unable to classify'
          }
        }
      }

      const categorization = await service.performAutoCategorization(problematicDocument)

      expect(categorization.categories).toBeDefined()
      expect(categorization.confidenceLevel).toBe('LOW')
      expect(categorization.reasoningChain).toBeDefined()
      expect(categorization.suggestedWorkflow).toBeDefined()
    })
  })

  describe('getDocumentIntelligenceAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const organizationId = 'org_456'
      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      const analytics = await service.getDocumentIntelligenceAnalytics(organizationId, period)

      expect(analytics.processingVolume).toBeDefined()
      expect(analytics.processingVolume.totalProcessed).toBeGreaterThan(0)
      expect(analytics.processingVolume.documentTypeDistribution).toBeDefined()

      expect(analytics.accuracyMetrics).toBeDefined()
      expect(analytics.accuracyMetrics.overallAccuracy).toBeGreaterThan(0)
      expect(analytics.accuracyMetrics.overallAccuracy).toBeLessThanOrEqual(1)

      expect(analytics.performanceMetrics).toBeDefined()
      expect(analytics.performanceMetrics.averageProcessingTime).toBeGreaterThan(0)

      expect(analytics.trendAnalysis).toBeDefined()
      expect(analytics.trendAnalysis.volumeTrends).toBeDefined()
      expect(analytics.trendAnalysis.accuracyTrends).toBeDefined()

      expect(analytics.riskAssessment).toBeDefined()
      expect(analytics.riskAssessment.recommendedActions).toBeDefined()
    })

    it('should handle analytics errors gracefully', async () => {
      const organizationId = 'invalid_org'
      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      // Even with invalid org, should return mock analytics
      const analytics = await service.getDocumentIntelligenceAnalytics(organizationId, period)
      expect(analytics).toBeDefined()
    })
  })

  describe('utility and helper methods', () => {
    it('should calculate overall similarity correctly', async () => {
      const doc1 = mockDocument
      const doc2 = {
        ...mockDocument,
        id: 'doc_2',
        content: 'Similar but different content',
        metadata: {
          ...mockDocument.metadata,
          entities: [
            { type: 'COMPANY', value: 'Different Corp', confidence: 0.90, context: 'provider' }
          ]
        }
      }

      jest.spyOn(service, 'getDocumentById')
        .mockImplementation(async (id) => {
          if (id === 'doc_1') return doc1
          if (id === 'doc_2') return doc2
          return null
        })

      mockedOpenAIService.analyzeDocument.mockResolvedValue({
        summary: 'Content comparison',
        keyInsights: [],
        entities: [],
        riskIndicators: [],
        confidence: 0.7
      })

      const comparison = await service.compareDocuments('doc_1', 'doc_2')
      
      expect(comparison.similarityScore).toBeGreaterThan(0)
      expect(comparison.similarityScore).toBeLessThanOrEqual(1)
    })

    it('should assess similarity risk levels correctly', async () => {
      // Test high similarity risk
      mockedVectorService.semanticSearch.mockResolvedValue({
        results: [
          {
            document: { id: 'very_similar_doc', metadata: { title: 'Almost identical' } } as any,
            relevanceScore: 0.98 // Very high similarity
          }
        ],
        totalResults: 1,
        processingTime: 100
      })

      const request = {
        targetDocument: mockDocument,
        searchCriteria: {
          organizationId: 'org_456',
          minSimilarity: 0.7
        }
      }

      const results = await service.detectSimilarDocuments(request)
      
      expect(results).toHaveLength(1)
      expect(results[0].riskLevel).toBe('HIGH') // Should be high risk due to very high similarity
    })
  })
})