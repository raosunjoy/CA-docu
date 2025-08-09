import { NaturalLanguageAnalyticsService, naturalLanguageAnalytics, NLQueryRequest, QuerySuggestion } from '../natural-language-analytics'
import { openaiService } from '../openai-service'
import { analyticsService } from '../analytics-service'
import { vectorService } from '../vector-service'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../analytics-service')
jest.mock('../vector-service')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>
const mockedVectorService = vectorService as jest.Mocked<typeof vectorService>

describe('NaturalLanguageAnalyticsService', () => {
  let service: NaturalLanguageAnalyticsService
  
  const mockQueryRequest: NLQueryRequest = {
    id: 'nlquery_test_123',
    userId: 'user_456',
    organizationId: 'org_789',
    query: 'What was our revenue trend over the last 6 months?',
    context: {
      timeframe: {
        start: new Date('2024-01-01'),
        end: new Date('2024-06-30')
      },
      userRole: 'MANAGER',
      dataScope: ['financial', 'operational'],
      previousQueries: []
    },
    preferences: {
      responseFormat: 'STRUCTURED',
      includeCharts: true,
      includeRecommendations: true,
      detailLevel: 'DETAILED',
      confidenceThreshold: 0.7
    },
    metadata: {
      source: 'WEB_UI',
      sessionId: 'session_123',
      originalLanguage: 'en',
      businessContext: {
        department: 'finance'
      }
    }
  }

  beforeEach(() => {
    service = new NaturalLanguageAnalyticsService()
    jest.clearAllMocks()

    // Setup default AI response
    mockedOpenAIService.chatWithAssistant.mockResolvedValue({
      response: `Analysis indicates strong revenue performance with steady growth trajectory. Key findings include:
        
        1. Monthly revenue shows 12% growth over the 6-month period
        2. Seasonal patterns evident with peaks in March and June
        3. Client acquisition driving 60% of growth
        4. Service line diversification contributing to stability
        
        Recommendations:
        - Continue current client acquisition strategies
        - Investigate seasonal demand patterns for capacity planning
        - Monitor service line performance for optimization opportunities`,
      confidence: 0.85
    })

    // Setup analytics service
    mockedAnalyticsService.calculateKPI.mockResolvedValue({
      value: 180000,
      trend: 'UP',
      changePercentage: 12.5,
      benchmark: 160000,
      status: 'ABOVE_TARGET',
      metadata: {
        period: '6_months',
        dataPoints: 6
      }
    })
  })

  describe('processNaturalLanguageQuery', () => {
    it('should process natural language query successfully', async () => {
      const result = await service.processNaturalLanguageQuery(mockQueryRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(mockQueryRequest.id)
      expect(result.queryId).toBeDefined()
      expect(result.naturalLanguageQuery).toBe(mockQueryRequest.query)
      expect(result.interpretedQuery).toBeDefined()
      expect(result.executionResults).toBeDefined()
      expect(result.insights).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.visualizations).toBeDefined()
      expect(result.narrative).toBeDefined()
      expect(result.executionMetadata).toBeDefined()

      // Check interpreted query structure
      expect(result.interpretedQuery.intent).toBeDefined()
      expect(result.interpretedQuery.intent.primaryAction).toBeDefined()
      expect(result.interpretedQuery.metrics).toBeDefined()
      expect(result.interpretedQuery.metrics.length).toBeGreaterThan(0)
      expect(result.interpretedQuery.confidence).toBeGreaterThan(0)

      // Check execution results structure
      expect(result.executionResults.data).toBeDefined()
      expect(Array.isArray(result.executionResults.data)).toBe(true)
      expect(result.executionResults.totalRows).toBeGreaterThanOrEqual(0)
      expect(result.executionResults.executedQueries).toBeDefined()
      expect(result.executionResults.metadata).toBeDefined()

      // Check insights structure
      expect(Array.isArray(result.insights)).toBe(true)
      result.insights.forEach(insight => {
        expect(insight.id).toBeDefined()
        expect(insight.type).toMatch(/TREND|ANOMALY|CORRELATION|PATTERN|OUTLIER|SEASONALITY/)
        expect(insight.title).toBeDefined()
        expect(insight.description).toBeDefined()
        expect(insight.significance).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
        expect(insight.confidence).toBeGreaterThanOrEqual(0)
        expect(insight.confidence).toBeLessThanOrEqual(1)
      })

      // Check narrative structure
      expect(result.narrative.summary).toBeDefined()
      expect(result.narrative.keyFindings).toBeDefined()
      expect(result.narrative.explanation).toBeDefined()
      expect(result.narrative.confidence).toBeGreaterThanOrEqual(0)
      expect(result.narrative.confidence).toBeLessThanOrEqual(1)

      // Check metadata
      expect(result.executionMetadata.processingTime).toBeGreaterThan(0)
      expect(result.executionMetadata.confidenceScore).toBeGreaterThan(0)
      expect(result.executionMetadata.confidenceScore).toBeLessThanOrEqual(1)
    })

    it('should validate query request properly', async () => {
      // Test empty query
      const emptyQueryRequest = {
        ...mockQueryRequest,
        query: ''
      }

      await expect(
        service.processNaturalLanguageQuery(emptyQueryRequest)
      ).rejects.toThrow('Query cannot be empty')

      // Test missing user ID
      const noUserRequest = {
        ...mockQueryRequest,
        userId: ''
      }

      await expect(
        service.processNaturalLanguageQuery(noUserRequest)
      ).rejects.toThrow('User ID is required')

      // Test missing organization ID
      const noOrgRequest = {
        ...mockQueryRequest,
        organizationId: ''
      }

      await expect(
        service.processNaturalLanguageQuery(noOrgRequest)
      ).rejects.toThrow('Organization ID is required')
    })

    it('should interpret different types of queries correctly', async () => {
      // Trend analysis query
      const trendQuery = {
        ...mockQueryRequest,
        query: 'Show me the revenue trend over the last year'
      }

      const trendResult = await service.processNaturalLanguageQuery(trendQuery)
      expect(trendResult.interpretedQuery.intent.primaryAction).toBe('TREND')
      expect(trendResult.interpretedQuery.metrics).toContain('revenue')

      // Comparison query
      const comparisonQuery = {
        ...mockQueryRequest,
        query: 'Compare team productivity this month versus last month'
      }

      const comparisonResult = await service.processNaturalLanguageQuery(comparisonQuery)
      expect(comparisonResult.interpretedQuery.intent.primaryAction).toBe('COMPARE')

      // Forecasting query
      const forecastQuery = {
        ...mockQueryRequest,
        query: 'Predict next quarter revenue based on current trends'
      }

      const forecastResult = await service.processNaturalLanguageQuery(forecastQuery)
      expect(forecastResult.interpretedQuery.intent.primaryAction).toBe('FORECAST')
    })

    it('should handle different response formats', async () => {
      // Structured format
      const structuredRequest = {
        ...mockQueryRequest,
        preferences: {
          ...mockQueryRequest.preferences,
          responseFormat: 'STRUCTURED' as const
        }
      }

      const structuredResult = await service.processNaturalLanguageQuery(structuredRequest)
      expect(structuredResult.visualizations).toBeDefined()
      expect(structuredResult.recommendations).toBeDefined()

      // Narrative format
      const narrativeRequest = {
        ...mockQueryRequest,
        preferences: {
          ...mockQueryRequest.preferences,
          responseFormat: 'NARRATIVE' as const
        }
      }

      const narrativeResult = await service.processNaturalLanguageQuery(narrativeRequest)
      expect(narrativeResult.narrative.explanation).toBeDefined()
    })

    it('should generate appropriate visualizations', async () => {
      const result = await service.processNaturalLanguageQuery(mockQueryRequest)

      expect(result.visualizations).toBeDefined()
      expect(Array.isArray(result.visualizations)).toBe(true)

      result.visualizations.forEach(viz => {
        expect(viz.id).toBeDefined()
        expect(viz.type).toMatch(/LINE_CHART|BAR_CHART|PIE_CHART|SCATTER_PLOT|HEATMAP|TABLE|KPI_CARD|GAUGE/)
        expect(viz.title).toBeDefined()
        expect(viz.description).toBeDefined()
        expect(viz.data).toBeDefined()
        expect(Array.isArray(viz.data)).toBe(true)
        expect(viz.config).toBeDefined()
        expect(viz.priority).toBeGreaterThan(0)
      })
    })

    it('should detect and handle query ambiguities', async () => {
      const ambiguousQuery = {
        ...mockQueryRequest,
        query: 'Show me performance recently for the team'
      }

      const result = await service.processNaturalLanguageQuery(ambiguousQuery)
      
      expect(result.interpretedQuery.ambiguities).toBeDefined()
      if (result.interpretedQuery.ambiguities.length > 0) {
        result.interpretedQuery.ambiguities.forEach(ambiguity => {
          expect(ambiguity.type).toMatch(/METRIC_AMBIGUITY|DIMENSION_AMBIGUITY|FILTER_AMBIGUITY|TIME_AMBIGUITY/)
          expect(ambiguity.description).toBeDefined()
          expect(ambiguity.options).toBeDefined()
          expect(ambiguity.recommendation).toBeDefined()
        })
      }
    })

    it('should use cache when available', async () => {
      // First query - should not be cached
      const result1 = await service.processNaturalLanguageQuery(mockQueryRequest)
      expect(result1.executionMetadata.cachedResults).toBe(false)

      // Second identical query - should be cached
      const result2 = await service.processNaturalLanguageQuery(mockQueryRequest)
      expect(result2.executionMetadata.cachedResults).toBe(true)
    })

    it('should handle AI service failures gracefully', async () => {
      mockedOpenAIService.chatWithAssistant.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.processNaturalLanguageQuery(mockQueryRequest)
      
      // Should still complete processing with fallback interpretation
      expect(result).toBeDefined()
      expect(result.interpretedQuery.confidence).toBeLessThan(0.8) // Lower confidence due to fallback
      expect(result.narrative.explanation).toBeDefined() // Should have fallback narrative
    })

    it('should generate error response for invalid queries', async () => {
      // Force an error by making the query processing fail
      jest.spyOn(service as any, 'interpretQuery').mockRejectedValue(new Error('Processing failed'))

      const result = await service.processNaturalLanguageQuery(mockQueryRequest)
      
      expect(result.executionMetadata.confidenceScore).toBe(0)
      expect(result.narrative.summary).toContain('Unable to process query')
      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('getQuerySuggestions', () => {
    it('should return appropriate suggestions for different user roles', async () => {
      // Partner role suggestions
      const partnerSuggestions = await service.getQuerySuggestions(
        'user_123',
        'org_456',
        { userRole: 'PARTNER' }
      )

      expect(partnerSuggestions).toBeDefined()
      expect(Array.isArray(partnerSuggestions)).toBe(true)
      expect(partnerSuggestions.length).toBeGreaterThan(0)

      partnerSuggestions.forEach(suggestion => {
        expect(suggestion.query).toBeDefined()
        expect(suggestion.category).toBeDefined()
        expect(suggestion.description).toBeDefined()
        expect(suggestion.complexity).toMatch(/BEGINNER|INTERMEDIATE|ADVANCED/)
        expect(suggestion.estimatedExecutionTime).toBeGreaterThan(0)
        expect(suggestion.expectedInsights).toBeDefined()
        expect(Array.isArray(suggestion.expectedInsights)).toBe(true)
      })

      // Check for partner-specific suggestions
      const strategicSuggestions = partnerSuggestions.filter(s => 
        s.category.includes('Strategic') || s.complexity === 'ADVANCED'
      )
      expect(strategicSuggestions.length).toBeGreaterThan(0)

      // Manager role suggestions
      const managerSuggestions = await service.getQuerySuggestions(
        'user_456',
        'org_456',
        { userRole: 'MANAGER' }
      )

      expect(managerSuggestions).toBeDefined()
      const teamManagementSuggestions = managerSuggestions.filter(s => 
        s.category.includes('Team') || s.query.includes('team')
      )
      expect(teamManagementSuggestions.length).toBeGreaterThan(0)

      // Associate role suggestions
      const associateSuggestions = await service.getQuerySuggestions(
        'user_789',
        'org_456',
        { userRole: 'ASSOCIATE' }
      )

      expect(associateSuggestions).toBeDefined()
      const personalSuggestions = associateSuggestions.filter(s => 
        s.category.includes('Personal') || s.query.includes('my ')
      )
      expect(personalSuggestions.length).toBeGreaterThan(0)
    })

    it('should provide context-based suggestions', async () => {
      const financialFocusSuggestions = await service.getQuerySuggestions(
        'user_123',
        'org_456',
        { 
          currentFocus: ['FINANCIAL_ANALYSIS'],
          userRole: 'MANAGER'
        }
      )

      expect(financialFocusSuggestions).toBeDefined()
      const financialSuggestions = financialFocusSuggestions.filter(s => 
        s.category.includes('Financial') || s.query.includes('revenue') || s.query.includes('cash flow')
      )
      expect(financialSuggestions.length).toBeGreaterThan(0)

      const clientFocusSuggestions = await service.getQuerySuggestions(
        'user_456',
        'org_456',
        { 
          currentFocus: ['CLIENT_MANAGEMENT'],
          userRole: 'PARTNER'
        }
      )

      expect(clientFocusSuggestions).toBeDefined()
      const clientSuggestions = clientFocusSuggestions.filter(s => 
        s.category.includes('Client') || s.query.includes('client')
      )
      expect(clientSuggestions.length).toBeGreaterThan(0)
    })

    it('should limit suggestions appropriately', async () => {
      const suggestions = await service.getQuerySuggestions('user_123', 'org_456')

      expect(suggestions.length).toBeLessThanOrEqual(10) // Should be limited to 10
      expect(suggestions.length).toBeGreaterThan(0)

      // Check suggestion quality
      suggestions.forEach(suggestion => {
        expect(suggestion.query.length).toBeGreaterThan(10) // Should be meaningful queries
        expect(suggestion.expectedInsights.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getDataSchema', () => {
    it('should return comprehensive data schema', async () => {
      const dataSchema = await service.getDataSchema()

      expect(dataSchema).toBeDefined()
      expect(dataSchema.tables).toBeDefined()
      expect(dataSchema.relationships).toBeDefined()
      expect(dataSchema.metrics).toBeDefined()
      expect(dataSchema.dimensions).toBeDefined()
      expect(dataSchema.businessGlossary).toBeDefined()

      // Check tables structure
      expect(Array.isArray(dataSchema.tables)).toBe(true)
      dataSchema.tables.forEach(table => {
        expect(table.name).toBeDefined()
        expect(table.displayName).toBeDefined()
        expect(table.description).toBeDefined()
        expect(table.columns).toBeDefined()
        expect(Array.isArray(table.columns)).toBe(true)
        expect(table.sampleQueries).toBeDefined()
        expect(Array.isArray(table.sampleQueries)).toBe(true)

        // Check columns structure
        table.columns.forEach(column => {
          expect(column.name).toBeDefined()
          expect(column.displayName).toBeDefined()
          expect(column.type).toMatch(/STRING|INTEGER|FLOAT|BOOLEAN|DATE|TIMESTAMP/)
          expect(column.description).toBeDefined()
          expect(typeof column.nullable).toBe('boolean')
          expect(typeof column.isPrimaryKey).toBe('boolean')
          expect(typeof column.isForeignKey).toBe('boolean')
          expect(Array.isArray(column.examples)).toBe(true)
        })
      })

      // Check metrics structure
      expect(Array.isArray(dataSchema.metrics)).toBe(true)
      dataSchema.metrics.forEach(metric => {
        expect(metric.name).toBeDefined()
        expect(metric.displayName).toBeDefined()
        expect(metric.description).toBeDefined()
        expect(metric.formula).toBeDefined()
        expect(metric.unit).toBeDefined()
        expect(metric.category).toBeDefined()
        expect(metric.synonyms).toBeDefined()
        expect(Array.isArray(metric.synonyms)).toBe(true)
      })

      // Check business glossary structure
      expect(Array.isArray(dataSchema.businessGlossary)).toBe(true)
      dataSchema.businessGlossary.forEach(term => {
        expect(term.term).toBeDefined()
        expect(term.definition).toBeDefined()
        expect(term.category).toBeDefined()
        expect(term.synonyms).toBeDefined()
        expect(Array.isArray(term.synonyms)).toBe(true)
      })
    })

    it('should include CA firm-specific schema elements', async () => {
      const dataSchema = await service.getDataSchema()

      // Should have CA firm-specific tables
      const caRelevantTables = dataSchema.tables.filter(table => 
        ['tasks', 'clients', 'projects', 'users'].some(keyword => 
          table.name.toLowerCase().includes(keyword)
        )
      )
      expect(caRelevantTables.length).toBeGreaterThan(0)

      // Should have CA firm-specific metrics
      const caRelevantMetrics = dataSchema.metrics.filter(metric => 
        ['utilization', 'realization', 'completion', 'revenue'].some(keyword => 
          metric.name.toLowerCase().includes(keyword)
        )
      )
      expect(caRelevantMetrics.length).toBeGreaterThan(0)

      // Should have business glossary with CA terms
      const caTerms = dataSchema.businessGlossary.filter(term => 
        ['utilization', 'realization', 'billable'].some(keyword => 
          term.term.toLowerCase().includes(keyword)
        )
      )
      expect(caTerms.length).toBeGreaterThan(0)
    })
  })

  describe('getQuerySession', () => {
    it('should create new session when none exists', async () => {
      const session = await service.getQuerySession('new_user_123')

      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.userId).toBe('new_user_123')
      expect(session.organizationId).toBeDefined()
      expect(session.queries).toBeDefined()
      expect(Array.isArray(session.queries)).toBe(true)
      expect(session.queries.length).toBe(0) // New session should be empty
      expect(session.context).toBeDefined()
      expect(session.createdAt).toBeInstanceOf(Date)
      expect(session.lastActiveAt).toBeInstanceOf(Date)
      expect(session.isActive).toBe(true)

      // Check context structure
      expect(session.context.businessDomain).toBeDefined()
      expect(session.context.currentFocus).toBeDefined()
      expect(Array.isArray(session.context.currentFocus)).toBe(true)
      expect(session.context.learnings).toBeDefined()
      expect(session.context.preferences).toBeDefined()
    })

    it('should retrieve existing session', async () => {
      const userId = 'existing_user_456'
      
      // Create first session
      const session1 = await service.getQuerySession(userId)
      const originalId = session1.id

      // Retrieve same session
      const session2 = await service.getQuerySession(userId)
      
      expect(session2.id).toBe(originalId)
      expect(session2.userId).toBe(userId)
    })

    it('should handle specific session ID', async () => {
      const userId = 'user_789'
      const specificSessionId = 'custom_session_123'
      
      const session = await service.getQuerySession(userId, specificSessionId)
      
      expect(session.id).toBe(specificSessionId)
      expect(session.userId).toBe(userId)
    })
  })

  describe('explainQueryInterpretation', () => {
    it('should provide detailed explanation of interpretation', async () => {
      // First create an interpretation
      const result = await service.processNaturalLanguageQuery(mockQueryRequest)
      const interpretation = result.interpretedQuery

      const explanation = await service.explainQueryInterpretation(interpretation)

      expect(explanation).toBeDefined()
      expect(explanation.explanation).toBeDefined()
      expect(explanation.components).toBeDefined()
      expect(explanation.confidence).toBeDefined()
      expect(explanation.alternatives).toBeDefined()

      // Check components breakdown
      expect(explanation.components.intent).toBeDefined()
      expect(explanation.components.entities).toBeDefined()
      expect(explanation.components.metrics).toBeDefined()
      expect(explanation.components.filters).toBeDefined()
      expect(explanation.components.timeframe).toBeDefined()

      // Check confidence breakdown
      expect(explanation.confidence.overall).toBeDefined()
      expect(explanation.confidence.overall).toBeGreaterThanOrEqual(0)
      expect(explanation.confidence.overall).toBeLessThanOrEqual(1)
      expect(explanation.confidence.breakdown).toBeDefined()
      expect(typeof explanation.confidence.breakdown).toBe('object')

      // Check alternatives
      expect(Array.isArray(explanation.alternatives)).toBe(true)
      expect(explanation.alternatives.length).toBeGreaterThan(0)
    })
  })

  describe('query execution and data processing', () => {
    it('should execute financial queries correctly', async () => {
      const financialQuery = {
        ...mockQueryRequest,
        query: 'What was our total revenue last quarter?'
      }

      const result = await service.processNaturalLanguageQuery(financialQuery)

      expect(result.executionResults.data).toBeDefined()
      expect(result.executionResults.data.length).toBeGreaterThan(0)

      // Check for financial data fields
      const hasRevenueData = result.executionResults.data.some(record => 
        'revenue' in record || 'profit' in record
      )
      expect(hasRevenueData).toBe(true)

      // Check executed queries include financial query
      const hasFinancialQuery = result.executionResults.executedQueries.some(query => 
        query.queryType === 'ANALYTICS_SERVICE' || query.query.includes('Financial')
      )
      expect(hasFinancialQuery).toBe(true)
    })

    it('should execute productivity queries correctly', async () => {
      const productivityQuery = {
        ...mockQueryRequest,
        query: 'Show me team task completion rates for this month'
      }

      const result = await service.processNaturalLanguageQuery(productivityQuery)

      expect(result.executionResults.data).toBeDefined()
      expect(result.executionResults.data.length).toBeGreaterThan(0)

      // Check for productivity data fields
      const hasProductivityData = result.executionResults.data.some(record => 
        'completion_rate' in record || 'utilization_rate' in record || 'tasks_completed' in record
      )
      expect(hasProductivityData).toBe(true)
    })

    it('should apply filters and aggregations correctly', async () => {
      const filteredQuery = {
        ...mockQueryRequest,
        query: 'Show me top 5 clients by revenue'
      }

      const result = await service.processNaturalLanguageQuery(filteredQuery)

      // Should have sorting applied
      expect(result.interpretedQuery.sorting).toBeDefined()
      if (result.interpretedQuery.sorting.length > 0) {
        expect(result.interpretedQuery.sorting[0].direction).toBe('DESC')
      }

      // Should have limits applied
      expect(result.interpretedQuery.limits).toBeDefined()
      expect(result.interpretedQuery.limits.maxResults).toBeDefined()
      expect(result.interpretedQuery.limits.maxResults).toBeLessThanOrEqual(10) // Reasonable limit
    })

    it('should generate appropriate aggregations', async () => {
      const aggregationQuery = {
        ...mockQueryRequest,
        query: 'What is the average revenue per client?'
      }

      const result = await service.processNaturalLanguageQuery(aggregationQuery)

      expect(result.executionResults.aggregations).toBeDefined()
      expect(typeof result.executionResults.aggregations).toBe('object')

      // Should have calculated aggregations
      if (Object.keys(result.executionResults.aggregations).length > 0) {
        const aggregationKeys = Object.keys(result.executionResults.aggregations)
        const hasRevenueAggregation = aggregationKeys.some(key => 
          key.includes('revenue') && (key.includes('avg') || key.includes('average'))
        )
        expect(hasRevenueAggregation || aggregationKeys.length > 0).toBe(true)
      }
    })
  })

  describe('insight generation', () => {
    it('should generate trend insights for time series data', async () => {
      const trendQuery = {
        ...mockQueryRequest,
        query: 'Show me revenue trends over the last 12 months'
      }

      const result = await service.processNaturalLanguageQuery(trendQuery)

      expect(result.insights).toBeDefined()
      
      // Should have trend insights
      const trendInsights = result.insights.filter(insight => insight.type === 'TREND')
      expect(trendInsights.length).toBeGreaterThan(0)

      trendInsights.forEach(insight => {
        expect(insight.title).toBeDefined()
        expect(insight.description).toBeDefined()
        expect(insight.confidence).toBeGreaterThan(0)
        expect(insight.impact).toBeDefined()
        expect(insight.evidence).toBeDefined()
        expect(typeof insight.actionable).toBe('boolean')
      })
    })

    it('should detect anomalies in data', async () => {
      // Create a query that should trigger anomaly detection
      const anomalyQuery = {
        ...mockQueryRequest,
        query: 'Analyze daily revenue for unusual patterns'
      }

      const result = await service.processNaturalLanguageQuery(anomalyQuery)

      expect(result.insights).toBeDefined()
      
      // May or may not have anomaly insights depending on data
      const anomalyInsights = result.insights.filter(insight => insight.type === 'ANOMALY')
      anomalyInsights.forEach(insight => {
        expect(insight.title).toBeDefined()
        expect(insight.description).toContain('unusual') // Should mention unusual patterns
        expect(insight.significance).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
        expect(insight.evidence.statisticalTests).toBeDefined()
      })
    })

    it('should identify patterns in data', async () => {
      const patternQuery = {
        ...mockQueryRequest,
        query: 'Find patterns in client billing cycles'
      }

      const result = await service.processNaturalLanguageQuery(patternQuery)

      expect(result.insights).toBeDefined()
      
      const patternInsights = result.insights.filter(insight => insight.type === 'PATTERN')
      if (patternInsights.length > 0) {
        patternInsights.forEach(insight => {
          expect(insight.title).toBeDefined()
          expect(insight.description).toBeDefined()
          expect(insight.impact).toBeDefined()
          expect(insight.impact.business).toBeDefined()
        })
      }
    })
  })

  describe('recommendation generation', () => {
    it('should generate follow-up query recommendations', async () => {
      const result = await service.processNaturalLanguageQuery(mockQueryRequest)

      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
      
      const followUpRecs = result.recommendations.filter(rec => rec.type === 'FOLLOW_UP_QUERY')
      if (followUpRecs.length > 0) {
        followUpRecs.forEach(rec => {
          expect(rec.title).toBeDefined()
          expect(rec.description).toBeDefined()
          expect(rec.suggestedQuery).toBeDefined()
          expect(rec.priority).toMatch(/LOW|MEDIUM|HIGH/)
          expect(rec.effort).toMatch(/LOW|MEDIUM|HIGH/)
          expect(rec.reasoning).toBeDefined()
          expect(rec.expectedBenefit).toBeDefined()
        })
      }
    })

    it('should generate data improvement recommendations', async () => {
      // Mock low data quality to trigger improvement recommendations
      const lowQualityQuery = {
        ...mockQueryRequest,
        query: 'Analyze team performance with incomplete data'
      }

      const result = await service.processNaturalLanguageQuery(lowQualityQuery)

      const dataImprovementRecs = result.recommendations.filter(rec => rec.type === 'DATA_IMPROVEMENT')
      if (dataImprovementRecs.length > 0) {
        dataImprovementRecs.forEach(rec => {
          expect(rec.title).toBeDefined()
          expect(rec.description).toBeDefined()
          expect(rec.reasoning).toBeDefined()
          expect(rec.expectedBenefit).toBeDefined()
        })
      }
    })

    it('should generate actionable recommendations', async () => {
      const result = await service.processNaturalLanguageQuery(mockQueryRequest)

      const actionRecs = result.recommendations.filter(rec => rec.type === 'ACTION_ITEM')
      actionRecs.forEach(rec => {
        expect(rec.title).toBeDefined()
        expect(rec.description).toBeDefined()
        expect(rec.reasoning).toBeDefined()
        expect(rec.expectedBenefit).toBeDefined()
        expect(rec.priority).toMatch(/LOW|MEDIUM|HIGH/)
        expect(rec.effort).toMatch(/LOW|MEDIUM|HIGH/)
      })
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle queries with no results', async () => {
      const noResultsQuery = {
        ...mockQueryRequest,
        query: 'Show me data for non-existent metric'
      }

      const result = await service.processNaturalLanguageQuery(noResultsQuery)

      expect(result).toBeDefined()
      expect(result.executionResults.data).toBeDefined()
      expect(result.narrative.summary).toBeDefined()
      expect(result.recommendations.length).toBeGreaterThan(0) // Should have suggestions
    })

    it('should handle very complex queries gracefully', async () => {
      const complexQuery = {
        ...mockQueryRequest,
        query: 'Analyze the correlation between client satisfaction scores, team utilization rates, project completion times, and revenue per engagement across different service lines, broken down by partner, manager, and associate levels, with seasonal adjustments and peer benchmarking against industry standards'
      }

      const result = await service.processNaturalLanguageQuery(complexQuery)

      expect(result).toBeDefined()
      expect(result.interpretedQuery.intent.complexity).toBe('COMPLEX')
      expect(result.narrative.limitations.length).toBeGreaterThan(0) // Should acknowledge complexity
    })

    it('should handle queries in different phrasings', async () => {
      const queries = [
        'What was our revenue last month?',
        'How much money did we make in the previous month?',
        'Show me last month\'s earnings',
        'Revenue for the month before this one'
      ]

      for (const query of queries) {
        const result = await service.processNaturalLanguageQuery({
          ...mockQueryRequest,
          query
        })

        expect(result).toBeDefined()
        expect(result.interpretedQuery.metrics).toContain('revenue')
        expect(result.executionResults.data).toBeDefined()
      }
    })

    it('should maintain session context across queries', async () => {
      const sessionId = 'test_session_123'
      
      // First query
      const firstResult = await service.processNaturalLanguageQuery({
        ...mockQueryRequest,
        query: 'What is our revenue?',
        metadata: {
          ...mockQueryRequest.metadata,
          sessionId
        }
      })

      expect(firstResult).toBeDefined()

      // Second query in same session
      const secondResult = await service.processNaturalLanguageQuery({
        ...mockQueryRequest,
        query: 'Show me trends for that metric',
        metadata: {
          ...mockQueryRequest.metadata,
          sessionId
        }
      })

      expect(secondResult).toBeDefined()
      
      // Check session was updated
      const session = await service.getQuerySession('user_456', sessionId)
      expect(session.queries.length).toBe(2)
      expect(session.context.learnings).toBeDefined()
    })
  })
})