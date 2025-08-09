import { UnifiedInsightFusionEngine, unifiedInsightFusion, FusionInsightRequest, InsightSource } from '../unified-insight-fusion'
import { openaiService } from '../openai-service'
import { analyticsService } from '../analytics-service'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../analytics-service')
jest.mock('../ai-orchestrator')
jest.mock('../advanced-document-intelligence')
jest.mock('../conversational-ai-service')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>

describe('UnifiedInsightFusionEngine', () => {
  let service: UnifiedInsightFusionEngine
  
  const mockBusinessContext = {
    userRole: 'MANAGER' as const,
    currentProjects: ['Project Alpha', 'Project Beta'],
    activeClients: ['Client A', 'Client B'],
    timeframe: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    businessObjectives: [
      {
        type: 'EFFICIENCY' as const,
        priority: 1,
        target: 85,
        description: 'Improve operational efficiency to 85%'
      },
      {
        type: 'REVENUE_GROWTH' as const,
        priority: 2,
        target: 120000,
        description: 'Increase monthly revenue to $120,000'
      }
    ],
    contextualFactors: [
      {
        category: 'MARKET' as const,
        factor: 'Economic uncertainty',
        impact: 'MEDIUM' as const,
        trend: 'STABLE' as const,
        description: 'Market showing signs of stabilization'
      }
    ]
  }

  const mockAnalyticsSource: InsightSource = {
    type: 'ANALYTICS',
    sourceId: 'monthly_analytics_2024_01',
    data: {
      kpis: [
        { metric: 'task_completion_rate', value: 82, trend: 'UP', benchmark: 80 },
        { metric: 'client_satisfaction', value: 4.3, trend: 'UP', benchmark: 4.0 },
        { metric: 'utilization_rate', value: 76, trend: 'STABLE', benchmark: 75 }
      ],
      trends: [
        { pattern: 'productivity', direction: 'INCREASING', strength: 0.8 },
        { pattern: 'efficiency', direction: 'STABLE', strength: 0.6 }
      ]
    },
    weight: 0.9,
    reliability: 0.95,
    timestamp: new Date('2024-01-31T10:00:00Z')
  }

  const mockDocumentSource: InsightSource = {
    type: 'AI_DOCUMENT',
    sourceId: 'contract_doc_456',
    data: {
      document: {
        id: 'doc_456',
        metadata: {
          classification: {
            primaryType: 'CONTRACT',
            confidence: 0.89
          },
          risks: [
            {
              category: 'FINANCIAL',
              level: 'MEDIUM',
              description: 'Payment terms may need review',
              impact: 'Potential cash flow impact',
              probability: 0.4
            }
          ],
          compliance: {
            complianceStatus: 'COMPLIANT',
            issues: [],
            recommendations: ['Regular compliance review recommended']
          },
          financial: {
            totalAmounts: { USD: 75000 },
            keyMetrics: [
              { name: 'Contract Value', value: 75000, currency: 'USD' }
            ]
          }
        }
      }
    },
    weight: 0.8,
    reliability: 0.85,
    timestamp: new Date('2024-01-30T14:30:00Z')
  }

  const mockConversationSource: InsightSource = {
    type: 'AI_CONVERSATION',
    sourceId: 'client_meeting_789',
    data: {
      insights: [
        {
          title: 'Client Satisfaction High',
          description: 'Client expressed high satisfaction with current services',
          confidence: 0.92
        },
        {
          title: 'Process Improvement Opportunity',
          description: 'Client suggested streamlining the reporting process',
          confidence: 0.78
        }
      ],
      recommendations: [
        {
          title: 'Implement Automated Reporting',
          description: 'Set up automated monthly reporting to improve efficiency',
          priority: 'MEDIUM'
        }
      ]
    },
    weight: 0.7,
    reliability: 0.8,
    timestamp: new Date('2024-01-29T16:00:00Z')
  }

  const mockFusionRequest: FusionInsightRequest = {
    id: 'fusion_test_123',
    userId: 'user_456',
    organizationId: 'org_789',
    context: mockBusinessContext,
    sources: [mockAnalyticsSource, mockDocumentSource, mockConversationSource],
    preferences: {
      insightDepth: 'DETAILED',
      includeRecommendations: true,
      includePredictions: true,
      includeRiskAssessment: true,
      focusAreas: [
        { area: 'FINANCIAL_PERFORMANCE', priority: 1 },
        { area: 'OPERATIONAL_EFFICIENCY', priority: 2 }
      ],
      outputFormat: 'STRUCTURED'
    },
    priority: 'HIGH'
  }

  beforeEach(() => {
    service = new UnifiedInsightFusionEngine()
    jest.clearAllMocks()

    // Setup default AI response
    mockedOpenAIService.chatWithAssistant.mockResolvedValue({
      response: `Title: Strategic Operational Improvement
      
Based on the analyzed data, there are significant opportunities for operational enhancement:

1. Task completion rate is above benchmark at 82%
2. Client satisfaction scores are strong at 4.3/5
3. Identified medium-level financial risk requires attention
4. Process automation opportunities exist

Business Implications:
- Current performance indicates strong operational foundation
- Client feedback suggests process improvement potential
- Financial risk management needs focus

Recommended Actions:
- Implement automated reporting systems
- Review and update payment terms
- Continue monitoring client satisfaction trends`,
      confidence: 0.87
    })
  })

  describe('generateFusedInsights', () => {
    it('should generate comprehensive fused insights from multiple sources', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(mockFusionRequest.id)
      expect(result.insights).toBeDefined()
      expect(result.insights.length).toBeGreaterThan(0)
      expect(result.executiveSummary).toBeDefined()
      expect(result.keyFindingsHighlights).toBeDefined()
      expect(result.actionPriorities).toBeDefined()
      expect(result.riskAlerts).toBeDefined()
      expect(result.performanceIndicators).toBeDefined()
      expect(result.crossFunctionalCorrelations).toBeDefined()
      expect(result.strategicImplications).toBeDefined()
      expect(result.fusionMetadata).toBeDefined()

      // Check metadata
      expect(result.fusionMetadata.processingTime).toBeGreaterThan(0)
      expect(result.fusionMetadata.sourceCount).toBe(3)
      expect(result.fusionMetadata.confidenceScore).toBeGreaterThan(0)
      expect(result.fusionMetadata.qualityScore).toBeGreaterThan(0)
    })

    it('should validate and enrich sources during processing', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      expect(result.fusionMetadata.sourceCount).toBe(3)
      expect(result.fusionMetadata.qualityScore).toBeGreaterThan(0.7) // High quality sources
    })

    it('should generate unified insights with proper structure', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      result.insights.forEach(insight => {
        expect(insight.id).toBeDefined()
        expect(insight.title).toBeDefined()
        expect(insight.type).toMatch(/STRATEGIC|OPERATIONAL|TACTICAL|IMMEDIATE_ACTION/)
        expect(insight.priority).toMatch(/CRITICAL|HIGH|MEDIUM|LOW/)
        expect(insight.confidence).toBeGreaterThanOrEqual(0)
        expect(insight.confidence).toBeLessThanOrEqual(1)
        expect(insight.impact).toBeDefined()
        expect(insight.evidence).toBeDefined()
        expect(insight.recommendations).toBeDefined()
        expect(insight.contextualRelevance).toBeGreaterThanOrEqual(0)
        expect(insight.businessValue).toBeGreaterThanOrEqual(0)
      })
    })

    it('should generate actionable recommendations', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      expect(result.actionPriorities).toBeDefined()
      expect(result.actionPriorities.length).toBeGreaterThan(0)

      result.actionPriorities.forEach(action => {
        expect(action.rank).toBeGreaterThan(0)
        expect(action.action).toBeDefined()
        expect(action.rationale).toBeDefined()
        expect(action.urgency).toMatch(/IMMEDIATE|WITHIN_WEEK|WITHIN_MONTH|QUARTERLY/)
        expect(action.expectedImpact).toBeDefined()
      })
    })

    it('should identify risk alerts from high-priority insights', async () => {
      // Add a high-risk source
      const riskSource: InsightSource = {
        type: 'AI_DOCUMENT',
        sourceId: 'risk_doc_999',
        data: {
          document: {
            metadata: {
              risks: [
                {
                  category: 'COMPLIANCE',
                  level: 'HIGH',
                  description: 'Critical compliance violation detected',
                  impact: 'Potential regulatory action',
                  probability: 0.8
                }
              ]
            }
          }
        },
        weight: 1.0,
        reliability: 0.9,
        timestamp: new Date()
      }

      const riskRequest = {
        ...mockFusionRequest,
        sources: [...mockFusionRequest.sources, riskSource]
      }

      const result = await service.generateFusedInsights(riskRequest)

      expect(result.riskAlerts).toBeDefined()
      expect(result.riskAlerts.length).toBeGreaterThan(0)

      const highRiskAlert = result.riskAlerts.find(alert => alert.severity === 'HIGH')
      if (highRiskAlert) {
        expect(highRiskAlert.type).toBeDefined()
        expect(highRiskAlert.description).toBeDefined()
        expect(highRiskAlert.probability).toBeGreaterThan(0)
        expect(highRiskAlert.mitigation).toBeDefined()
      }
    })

    it('should generate executive summary with key information', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      expect(result.executiveSummary.overview).toBeDefined()
      expect(result.executiveSummary.keyInsights).toBeDefined()
      expect(result.executiveSummary.keyInsights.length).toBeGreaterThan(0)
      expect(result.executiveSummary.bottomLine).toBeDefined()

      if (result.executiveSummary.criticalActions) {
        expect(Array.isArray(result.executiveSummary.criticalActions)).toBe(true)
      }
      if (result.executiveSummary.majorRisks) {
        expect(Array.isArray(result.executiveSummary.majorRisks)).toBe(true)
      }
      if (result.executiveSummary.opportunities) {
        expect(Array.isArray(result.executiveSummary.opportunities)).toBe(true)
      }
    })

    it('should calculate appropriate fusion metadata scores', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      const metadata = result.fusionMetadata
      expect(metadata.confidenceScore).toBeGreaterThanOrEqual(0)
      expect(metadata.confidenceScore).toBeLessThanOrEqual(1)
      expect(metadata.qualityScore).toBeGreaterThanOrEqual(0)
      expect(metadata.qualityScore).toBeLessThanOrEqual(1)
      expect(metadata.freshnessScore).toBeGreaterThanOrEqual(0)
      expect(metadata.freshnessScore).toBeLessThanOrEqual(1)
      expect(metadata.completeness).toBeGreaterThanOrEqual(0)
      expect(metadata.completeness).toBeLessThanOrEqual(1)
    })

    it('should handle different insight depths appropriately', async () => {
      // Test SUMMARY depth
      const summaryRequest = {
        ...mockFusionRequest,
        preferences: {
          ...mockFusionRequest.preferences,
          insightDepth: 'SUMMARY' as const
        }
      }

      const summaryResult = await service.generateFusedInsights(summaryRequest)
      expect(summaryResult.insights).toBeDefined()

      // Test COMPREHENSIVE depth
      const comprehensiveRequest = {
        ...mockFusionRequest,
        preferences: {
          ...mockFusionRequest.preferences,
          insightDepth: 'COMPREHENSIVE' as const
        }
      }

      const comprehensiveResult = await service.generateFusedInsights(comprehensiveRequest)
      expect(comprehensiveResult.insights).toBeDefined()
      
      // Comprehensive should potentially have more detailed insights
      expect(comprehensiveResult.insights.length).toBeGreaterThanOrEqual(summaryResult.insights.length)
    })

    it('should handle role-specific context appropriately', async () => {
      // Test Partner role
      const partnerRequest = {
        ...mockFusionRequest,
        context: {
          ...mockFusionRequest.context,
          userRole: 'PARTNER' as const
        }
      }

      const partnerResult = await service.generateFusedInsights(partnerRequest)
      expect(partnerResult.insights).toBeDefined()

      // Test Associate role
      const associateRequest = {
        ...mockFusionRequest,
        context: {
          ...mockFusionRequest.context,
          userRole: 'ASSOCIATE' as const
        }
      }

      const associateResult = await service.generateFusedInsights(associateRequest)
      expect(associateResult.insights).toBeDefined()

      // Both should generate insights, but potentially with different priorities
      expect(partnerResult.insights.length).toBeGreaterThan(0)
      expect(associateResult.insights.length).toBeGreaterThan(0)
    })

    it('should handle empty or invalid sources gracefully', async () => {
      const emptySourcesRequest = {
        ...mockFusionRequest,
        sources: []
      }

      await expect(
        service.generateFusedInsights(emptySourcesRequest)
      ).resolves.toBeDefined()
    })

    it('should handle AI service errors gracefully', async () => {
      mockedOpenAIService.chatWithAssistant.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.generateFusedInsights(mockFusionRequest)
      
      // Should still generate insights even with AI errors
      expect(result.insights).toBeDefined()
      expect(result.fusionMetadata.confidenceScore).toBeLessThan(0.9) // Lower confidence due to AI failure
    })
  })

  describe('source validation and enrichment', () => {
    it('should validate analytics sources correctly', async () => {
      const validAnalyticsSource = {
        type: 'ANALYTICS',
        sourceId: 'test_analytics',
        data: {
          kpis: [{ metric: 'test', value: 100 }]
        },
        weight: 1.0,
        reliability: 0.9,
        timestamp: new Date()
      }

      const invalidAnalyticsSource = {
        type: 'ANALYTICS',
        sourceId: 'invalid_analytics',
        data: {}, // Missing kpis/metrics
        weight: 1.0,
        reliability: 0.9,
        timestamp: new Date()
      }

      const requestWithValid = {
        ...mockFusionRequest,
        sources: [validAnalyticsSource]
      }

      const requestWithInvalid = {
        ...mockFusionRequest,
        sources: [invalidAnalyticsSource]
      }

      // Both should complete, but invalid source should be filtered out
      const validResult = await service.generateFusedInsights(requestWithValid)
      const invalidResult = await service.generateFusedInsights(requestWithInvalid)

      expect(validResult.fusionMetadata.sourceCount).toBe(1)
      expect(invalidResult.fusionMetadata.sourceCount).toBe(0)
    })

    it('should validate document sources correctly', async () => {
      const validDocSource = {
        type: 'AI_DOCUMENT',
        sourceId: 'test_doc',
        data: {
          document: { metadata: {} }
        },
        weight: 1.0,
        reliability: 0.9,
        timestamp: new Date()
      }

      const invalidDocSource = {
        type: 'AI_DOCUMENT',
        sourceId: 'invalid_doc',
        data: {}, // Missing document
        weight: 1.0,
        reliability: 0.9,
        timestamp: new Date()
      }

      const requestWithValid = {
        ...mockFusionRequest,
        sources: [validDocSource]
      }

      const requestWithInvalid = {
        ...mockFusionRequest,
        sources: [invalidDocSource]
      }

      const validResult = await service.generateFusedInsights(requestWithValid)
      const invalidResult = await service.generateFusedInsights(requestWithInvalid)

      expect(validResult.fusionMetadata.sourceCount).toBe(1)
      expect(invalidResult.fusionMetadata.sourceCount).toBe(0)
    })

    it('should calculate source reliability correctly', async () => {
      const freshSource = {
        ...mockAnalyticsSource,
        timestamp: new Date() // Fresh timestamp
      }

      const oldSource = {
        ...mockAnalyticsSource,
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days old
      }

      const requestWithFresh = {
        ...mockFusionRequest,
        sources: [freshSource]
      }

      const requestWithOld = {
        ...mockFusionRequest,
        sources: [oldSource]
      }

      const freshResult = await service.generateFusedInsights(requestWithFresh)
      const oldResult = await service.generateFusedInsights(requestWithOld)

      // Fresh source should have higher quality score
      expect(freshResult.fusionMetadata.qualityScore).toBeGreaterThanOrEqual(oldResult.fusionMetadata.qualityScore)
    })
  })

  describe('cross-source correlations', () => {
    it('should identify correlations between different source types', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      expect(result.crossFunctionalCorrelations).toBeDefined()
      
      if (result.crossFunctionalCorrelations.length > 0) {
        result.crossFunctionalCorrelations.forEach(correlation => {
          expect(correlation.areas).toBeDefined()
          expect(correlation.areas.length).toBe(2)
          expect(correlation.correlation).toBeDefined()
          expect(correlation.strength).toBeGreaterThanOrEqual(0)
          expect(correlation.strength).toBeLessThanOrEqual(1)
          expect(correlation.businessImplication).toBeDefined()
          expect(correlation.actionableInsight).toBeDefined()
        })
      }
    })

    it('should only include significant correlations', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      // All correlations should have strength > 0.3 (as per implementation)
      result.crossFunctionalCorrelations.forEach(correlation => {
        expect(correlation.strength).toBeGreaterThan(0.3)
      })
    })
  })

  describe('business value calculation', () => {
    it('should calculate business value based on context alignment', async () => {
      // Create request with objectives that align with source data
      const alignedRequest = {
        ...mockFusionRequest,
        context: {
          ...mockFusionRequest.context,
          businessObjectives: [
            {
              type: 'EFFICIENCY' as const,
              priority: 1,
              description: 'Improve task completion rate' // Aligns with analytics source
            }
          ]
        }
      }

      const result = await service.generateFusedInsights(alignedRequest)

      // Should have insights with high business value due to alignment
      const highValueInsights = result.insights.filter(insight => insight.businessValue > 0.7)
      expect(highValueInsights.length).toBeGreaterThan(0)
    })

    it('should prioritize insights based on business value and priority', async () => {
      const result = await service.generateFusedInsights(mockFusionRequest)

      // Insights should be sorted by priority, then business value
      for (let i = 0; i < result.insights.length - 1; i++) {
        const current = result.insights[i]
        const next = result.insights[i + 1]

        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
        const currentPriority = priorityOrder[current.priority]
        const nextPriority = priorityOrder[next.priority]

        if (currentPriority === nextPriority) {
          // If same priority, should be sorted by business value
          expect(current.businessValue).toBeGreaterThanOrEqual(next.businessValue)
        } else {
          // Should be sorted by priority
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority)
        }
      }
    })
  })

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Create a malformed request
      const malformedRequest = {
        ...mockFusionRequest,
        sources: [
          {
            type: 'INVALID_TYPE',
            sourceId: 'malformed',
            data: null,
            weight: 'invalid',
            reliability: 'invalid',
            timestamp: 'invalid'
          } as any
        ]
      }

      await expect(
        service.generateFusedInsights(malformedRequest)
      ).resolves.toBeDefined()
      
      // Should complete despite errors, with appropriate metadata
    })

    it('should continue processing when individual sources fail', async () => {
      // Mock one source to cause processing errors
      const problematicSource = {
        type: 'AI_DOCUMENT',
        sourceId: 'problematic',
        data: {
          document: {
            metadata: {
              // Malformed metadata that might cause processing issues
              risks: 'invalid_format'
            }
          }
        },
        weight: 1.0,
        reliability: 0.8,
        timestamp: new Date()
      }

      const mixedRequest = {
        ...mockFusionRequest,
        sources: [mockAnalyticsSource, problematicSource]
      }

      const result = await service.generateFusedInsights(mixedRequest)
      
      // Should still process the valid source
      expect(result.fusionMetadata.sourceCount).toBeGreaterThan(0)
      expect(result.insights).toBeDefined()
    })
  })
})