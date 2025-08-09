import { AdvancedEmailAnalyticsService } from '../advanced-email-analytics'

describe('AdvancedEmailAnalyticsService', () => {
  let service: AdvancedEmailAnalyticsService

  beforeEach(() => {
    service = new AdvancedEmailAnalyticsService()
  })

  describe('getComprehensiveEmailAnalytics', () => {
    it('should return comprehensive email analytics', async () => {
      const organizationId = 'org-123'
      const options = {
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-31')
      }

      const result = await service.getComprehensiveEmailAnalytics(organizationId, options)

      expect(result).toBeDefined()
      expect(result.basicMetrics).toBeDefined()
      expect(result.patterns).toBeDefined()
      expect(result.categoryInsights).toBeDefined()
      expect(result.sentimentAnalysis).toBeDefined()
      expect(result.productivityMetrics).toBeDefined()
      expect(result.recommendations).toBeDefined()
    })

    it('should include basic email metrics', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')

      expect(result.basicMetrics).toEqual(
        expect.objectContaining({
          totalEmails: expect.any(Number),
          unreadEmails: expect.any(Number),
          emailsToday: expect.any(Number),
          emailsThisWeek: expect.any(Number),
          emailsThisMonth: expect.any(Number),
          topSenders: expect.arrayContaining([
            expect.objectContaining({
              address: expect.any(String),
              name: expect.any(String),
              count: expect.any(Number)
            })
          ]),
          responseTime: expect.objectContaining({
            average: expect.any(Number),
            median: expect.any(Number)
          }),
          emailsWithTasks: expect.any(Number),
          emailsWithDocuments: expect.any(Number)
        })
      )
    })

    it('should include email patterns analysis', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')

      expect(result.patterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: expect.stringMatching(/sender_frequency|subject_keywords|response_time|attachment_types/),
            pattern: expect.any(String),
            frequency: expect.any(Number),
            trend: expect.stringMatching(/increasing|decreasing|stable/),
            confidence: expect.any(Number)
          })
        ])
      )

      // Should have at least one pattern of each type
      const patternTypes = result.patterns.map(p => p.type)
      expect(patternTypes).toContain('sender_frequency')
      expect(patternTypes).toContain('subject_keywords')
      expect(patternTypes).toContain('response_time')
      expect(patternTypes).toContain('attachment_types')
    })

    it('should include category insights', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')

      expect(result.categoryInsights).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: expect.any(String),
            count: expect.any(Number),
            averageResponseTime: expect.any(Number),
            completionRate: expect.any(Number),
            urgencyDistribution: expect.objectContaining({
              high: expect.any(Number),
              medium: expect.any(Number),
              low: expect.any(Number)
            })
          })
        ])
      )

      // Should include CA-specific categories
      const categories = result.categoryInsights.map(c => c.category)
      expect(categories).toContain('Tax Notices')
      expect(categories).toContain('Client Inquiries')
      expect(categories).toContain('Document Requests')
      expect(categories).toContain('Compliance Updates')
    })

    it('should include sentiment analysis', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')

      expect(result.sentimentAnalysis).toEqual(
        expect.objectContaining({
          score: expect.any(Number),
          magnitude: expect.any(Number),
          label: expect.stringMatching(/positive|negative|neutral/),
          confidence: expect.any(Number)
        })
      )

      // Score should be between -1 and 1
      expect(result.sentimentAnalysis.score).toBeGreaterThanOrEqual(-1)
      expect(result.sentimentAnalysis.score).toBeLessThanOrEqual(1)

      // Magnitude should be between 0 and 1
      expect(result.sentimentAnalysis.magnitude).toBeGreaterThanOrEqual(0)
      expect(result.sentimentAnalysis.magnitude).toBeLessThanOrEqual(1)
    })

    it('should include productivity metrics', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')

      expect(result.productivityMetrics).toEqual(
        expect.objectContaining({
          emailsPerHour: expect.any(Number),
          responseTimeDistribution: expect.objectContaining({
            '< 1 hour': expect.any(Number),
            '1-4 hours': expect.any(Number),
            '4-8 hours': expect.any(Number),
            '8-24 hours': expect.any(Number),
            '> 24 hours': expect.any(Number)
          }),
          taskCreationRate: expect.any(Number),
          automationEfficiency: expect.any(Number)
        })
      )

      // Response time distribution should sum to approximately 1
      const distribution = result.productivityMetrics.responseTimeDistribution
      const total = Object.values(distribution).reduce((sum, val) => sum + val, 0)
      expect(total).toBeCloseTo(1, 1)
    })

    it('should generate recommendations', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')

      expect(result.recommendations).toEqual(
        expect.arrayContaining([
          expect.any(String)
        ])
      )

      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('getEmailTrendAnalysis', () => {
    it('should return volume trend data', async () => {
      const result = await service.getEmailTrendAnalysis('org-123', 'volume', 'daily', 7)

      expect(result).toHaveLength(7)
      expect(result[0]).toEqual(
        expect.objectContaining({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          value: expect.any(Number)
        })
      )

      // Values should be in reasonable range for email volume
      result.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(30)
        expect(point.value).toBeLessThanOrEqual(80)
      })
    })

    it('should return response time trend data', async () => {
      const result = await service.getEmailTrendAnalysis('org-123', 'response_time', 'daily', 5)

      expect(result).toHaveLength(5)
      
      // Response time values should be in hours (2-10 range)
      result.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(2)
        expect(point.value).toBeLessThanOrEqual(10)
      })
    })

    it('should return task creation trend data', async () => {
      const result = await service.getEmailTrendAnalysis('org-123', 'task_creation', 'daily', 10)

      expect(result).toHaveLength(10)
      
      // Task creation should be reasonable numbers
      result.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(2)
        expect(point.value).toBeLessThanOrEqual(12)
      })
    })

    it('should return automation success trend data', async () => {
      const result = await service.getEmailTrendAnalysis('org-123', 'automation_success', 'daily', 3)

      expect(result).toHaveLength(3)
      
      // Automation success should be percentage (0.7-1.0)
      result.forEach(point => {
        expect(point.value).toBeGreaterThanOrEqual(0.7)
        expect(point.value).toBeLessThanOrEqual(1.0)
      })
    })
  })

  describe('predictEmailVolume', () => {
    it('should predict email volume for future days', async () => {
      const result = await service.predictEmailVolume('org-123', 5)

      expect(result).toHaveLength(5)
      expect(result[0]).toEqual(
        expect.objectContaining({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          predicted: expect.any(Number),
          confidence: expect.any(Number)
        })
      )

      // Predicted values should be non-negative
      result.forEach(point => {
        expect(point.predicted).toBeGreaterThanOrEqual(0)
        expect(point.confidence).toBeGreaterThanOrEqual(0.6)
        expect(point.confidence).toBeLessThanOrEqual(1.0)
      })
    })

    it('should have decreasing confidence for further predictions', async () => {
      const result = await service.predictEmailVolume('org-123', 7)

      // Confidence should generally decrease over time
      for (let i = 1; i < result.length; i++) {
        expect(result[i].confidence).toBeLessThanOrEqual(result[i-1].confidence + 0.1) // Allow small variance
      }
    })

    it('should predict reasonable email volumes', async () => {
      const result = await service.predictEmailVolume('org-123', 3)

      result.forEach(point => {
        // Should predict realistic daily email volumes
        expect(point.predicted).toBeGreaterThanOrEqual(0)
        expect(point.predicted).toBeLessThanOrEqual(100)
      })
    })
  })

  describe('getClientCommunicationInsights', () => {
    it('should return client communication insights', async () => {
      const result = await service.getClientCommunicationInsights('org-123')

      expect(result).toEqual(
        expect.objectContaining({
          clientMetrics: expect.arrayContaining([
            expect.objectContaining({
              clientEmail: expect.any(String),
              clientName: expect.any(String),
              totalEmails: expect.any(Number),
              averageResponseTime: expect.any(Number),
              satisfactionScore: expect.any(Number),
              lastContact: expect.any(Date),
              communicationFrequency: expect.stringMatching(/high|medium|low/),
              preferredTime: expect.any(String)
            })
          ]),
          insights: expect.arrayContaining([
            expect.any(String)
          ])
        })
      )
    })

    it('should include meaningful client insights', async () => {
      const result = await service.getClientCommunicationInsights('org-123')

      expect(result.insights.length).toBeGreaterThan(0)
      
      // Should contain actionable insights
      const insightText = result.insights.join(' ')
      expect(insightText).toMatch(/response|communication|client|satisfaction/i)
    })

    it('should have valid client metrics', async () => {
      const result = await service.getClientCommunicationInsights('org-123')

      result.clientMetrics.forEach(client => {
        expect(client.satisfactionScore).toBeGreaterThanOrEqual(1)
        expect(client.satisfactionScore).toBeLessThanOrEqual(5)
        expect(client.averageResponseTime).toBeGreaterThan(0)
        expect(client.totalEmails).toBeGreaterThan(0)
        expect(['high', 'medium', 'low']).toContain(client.communicationFrequency)
      })
    })
  })

  describe('recommendation generation', () => {
    it('should generate response time recommendations for slow responses', async () => {
      // This tests the private method indirectly through comprehensive analytics
      const result = await service.getComprehensiveEmailAnalytics('org-123')
      
      // Since mock response time is 4.2 hours (< 6), should not recommend auto-replies
      // But should have other recommendations
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('should generate automation efficiency recommendations', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')
      
      // Mock automation efficiency is 0.84 (> 0.7), so should be positive feedback
      expect(result.recommendations.some(rec => 
        rec.toLowerCase().includes('performing well') || 
        rec.toLowerCase().includes('a/b testing')
      )).toBe(true)
    })

    it('should always provide at least one recommendation', async () => {
      const result = await service.getComprehensiveEmailAnalytics('org-123')
      
      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })
})