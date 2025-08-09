import { AnomalyDetectionService, anomalyDetectionService, AnomalyDetectionRequest, AnomalySubscription } from '../anomaly-detection-service'
import { openaiService } from '../openai-service'
import { analyticsService } from '../analytics-service'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../analytics-service')
jest.mock('../email-service')
jest.mock('../notification-service')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService
  
  const mockDataPoints = [
    { metric: 'revenue', value: 10000, timestamp: new Date('2024-01-01T00:00:00Z'), context: { source: 'sales' } },
    { metric: 'revenue', value: 10500, timestamp: new Date('2024-01-02T00:00:00Z'), context: { source: 'sales' } },
    { metric: 'revenue', value: 9800, timestamp: new Date('2024-01-03T00:00:00Z'), context: { source: 'sales' } },
    { metric: 'revenue', value: 10200, timestamp: new Date('2024-01-04T00:00:00Z'), context: { source: 'sales' } },
    { metric: 'revenue', value: 15000, timestamp: new Date('2024-01-05T00:00:00Z'), context: { source: 'sales' } }, // Anomaly
    { metric: 'revenue', value: 10100, timestamp: new Date('2024-01-06T00:00:00Z'), context: { source: 'sales' } },
    { metric: 'revenue', value: 9900, timestamp: new Date('2024-01-07T00:00:00Z'), context: { source: 'sales' } }
  ]

  const mockDetectionRequest: AnomalyDetectionRequest = {
    id: 'detection_test_123',
    userId: 'user_456',
    organizationId: 'org_789',
    data: mockDataPoints,
    algorithms: ['STATISTICAL', 'ISOLATION_FOREST'],
    thresholds: {
      sensitivity: 0.05,
      minAnomalyScore: 0.7,
      maxFalsePositiveRate: 0.1,
      businessImpactThreshold: 'MEDIUM'
    },
    metadata: {
      dataSource: 'FINANCIAL_SYSTEM',
      businessContext: {
        department: 'finance',
        processType: 'revenue_tracking'
      },
      expectedPatterns: ['daily_variation'],
      customTags: ['revenue', 'financial']
    }
  }

  const mockSubscription: AnomalySubscription = {
    id: 'sub_123',
    userId: 'user_456',
    organizationId: 'org_789',
    name: 'Revenue Anomaly Detection',
    description: 'Monitor daily revenue for unusual patterns',
    dataSource: 'FINANCIAL_SYSTEM',
    metrics: ['revenue', 'profit_margin'],
    algorithms: ['STATISTICAL', 'ISOLATION_FOREST'],
    thresholds: {
      sensitivity: 0.05,
      minAnomalyScore: 0.7,
      maxFalsePositiveRate: 0.1,
      businessImpactThreshold: 'HIGH'
    },
    alertSettings: {
      enabled: true,
      channels: ['EMAIL', 'SLACK'],
      recipients: ['manager@company.com', 'finance@company.com'],
      escalationRules: [
        { severity: 'HIGH', delayMinutes: 15, escalateTo: ['cto@company.com'] }
      ],
      throttling: {
        maxAlertsPerHour: 5,
        cooldownPeriodMinutes: 30,
        groupSimilarAlerts: true
      },
      customTemplates: {
        email: 'Revenue anomaly detected: {{anomaly.description}}'
      }
    },
    schedule: {
      enabled: true,
      frequency: 'HOURLY',
      timezone: 'UTC'
    },
    metadata: {
      businessContext: { department: 'finance' },
      expectedPatterns: ['daily_variation'],
      customTags: ['revenue', 'critical']
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  beforeEach(() => {
    service = new AnomalyDetectionService()
    jest.clearAllMocks()

    // Setup default AI response
    mockedOpenAIService.analyzeText.mockResolvedValue({
      summary: 'Anomaly analysis completed',
      sentiment: 'NEUTRAL',
      keyPoints: ['Unusual revenue spike detected', 'Pattern deviation from normal range'],
      confidence: 0.85
    })

    // Setup analytics service
    mockedAnalyticsService.calculateKPI.mockResolvedValue({
      value: 10150,
      trend: 'UP',
      changePercentage: 1.5,
      benchmark: 10000,
      status: 'ABOVE_TARGET',
      metadata: {}
    })
  })

  describe('detectAnomalies', () => {
    it('should detect anomalies using statistical methods', async () => {
      const request = {
        ...mockDetectionRequest,
        algorithms: ['STATISTICAL']
      }

      const result = await service.detectAnomalies(request)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(request.id)
      expect(result.anomalies).toBeDefined()
      expect(result.anomalies.length).toBeGreaterThan(0)
      expect(result.processingMetadata).toBeDefined()
      expect(result.modelPerformance).toBeDefined()

      // Check that statistical anomaly was detected (the 15000 value)
      const statisticalAnomalies = result.anomalies.filter(a => a.detectionMethod === 'STATISTICAL')
      expect(statisticalAnomalies.length).toBeGreaterThan(0)

      // Verify anomaly properties
      result.anomalies.forEach(anomaly => {
        expect(anomaly.id).toBeDefined()
        expect(anomaly.metric).toBe('revenue')
        expect(anomaly.anomalyScore).toBeGreaterThanOrEqual(0)
        expect(anomaly.anomalyScore).toBeLessThanOrEqual(1)
        expect(anomaly.severity).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
        expect(anomaly.detectionMethod).toMatch(/STATISTICAL|ISOLATION_FOREST|ONE_CLASS_SVM|ENSEMBLE/)
        expect(anomaly.timestamp).toBeInstanceOf(Date)
        expect(anomaly.businessImpact).toBeDefined()
        expect(anomaly.explanation).toBeDefined()
      })
    })

    it('should detect anomalies using isolation forest', async () => {
      const request = {
        ...mockDetectionRequest,
        algorithms: ['ISOLATION_FOREST']
      }

      const result = await service.detectAnomalies(request)

      expect(result.anomalies).toBeDefined()
      expect(result.anomalies.length).toBeGreaterThan(0)

      const isolationAnomalies = result.anomalies.filter(a => a.detectionMethod === 'ISOLATION_FOREST')
      expect(isolationAnomalies.length).toBeGreaterThan(0)
    })

    it('should use ensemble method when multiple algorithms are specified', async () => {
      const request = {
        ...mockDetectionRequest,
        algorithms: ['STATISTICAL', 'ISOLATION_FOREST', 'ONE_CLASS_SVM']
      }

      const result = await service.detectAnomalies(request)

      expect(result.anomalies).toBeDefined()
      expect(result.processingMetadata.algorithmsUsed).toContain('ENSEMBLE')

      // Should have anomalies from multiple methods or ensemble
      const methods = [...new Set(result.anomalies.map(a => a.detectionMethod))]
      expect(methods.length).toBeGreaterThan(0)
    })

    it('should apply sensitivity thresholds correctly', async () => {
      const highSensitivityRequest = {
        ...mockDetectionRequest,
        thresholds: {
          ...mockDetectionRequest.thresholds,
          sensitivity: 0.01 // Very sensitive
        }
      }

      const lowSensitivityRequest = {
        ...mockDetectionRequest,
        thresholds: {
          ...mockDetectionRequest.thresholds,
          sensitivity: 0.1 // Less sensitive
        }
      }

      const highSensResult = await service.detectAnomalies(highSensitivityRequest)
      const lowSensResult = await service.detectAnomalies(lowSensitivityRequest)

      // High sensitivity should detect more anomalies (or at least same amount)
      expect(highSensResult.anomalies.length).toBeGreaterThanOrEqual(lowSensResult.anomalies.length)
    })

    it('should generate appropriate business impact assessments', async () => {
      const result = await service.detectAnomalies(mockDetectionRequest)

      const highImpactAnomalies = result.anomalies.filter(a => 
        a.businessImpact.impactLevel === 'HIGH' || a.businessImpact.impactLevel === 'CRITICAL'
      )

      if (highImpactAnomalies.length > 0) {
        highImpactAnomalies.forEach(anomaly => {
          expect(anomaly.businessImpact.description).toBeDefined()
          expect(anomaly.businessImpact.affectedAreas).toBeDefined()
          expect(anomaly.businessImpact.affectedAreas.length).toBeGreaterThan(0)
          expect(anomaly.businessImpact.financialImpact).toBeDefined()
          expect(anomaly.businessImpact.recommendedActions).toBeDefined()
          expect(anomaly.businessImpact.urgency).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
        })
      }
    })

    it('should handle edge cases gracefully', async () => {
      // Test with minimal data
      const minimalRequest = {
        ...mockDetectionRequest,
        data: [
          { metric: 'test', value: 100, timestamp: new Date(), context: {} }
        ]
      }

      const result = await service.detectAnomalies(minimalRequest)
      expect(result.anomalies).toBeDefined()
      expect(result.processingMetadata.warnings).toContain('Insufficient data points for reliable anomaly detection')

      // Test with all same values (no variation)
      const constantRequest = {
        ...mockDetectionRequest,
        data: Array(10).fill(null).map((_, i) => ({
          metric: 'constant',
          value: 100,
          timestamp: new Date(Date.now() + i * 1000),
          context: {}
        }))
      }

      const constantResult = await service.detectAnomalies(constantRequest)
      expect(constantResult.anomalies).toBeDefined()
    })

    it('should include proper metadata in results', async () => {
      const result = await service.detectAnomalies(mockDetectionRequest)

      expect(result.processingMetadata.processingTime).toBeGreaterThan(0)
      expect(result.processingMetadata.dataPointsProcessed).toBe(mockDataPoints.length)
      expect(result.processingMetadata.algorithmsUsed).toBeDefined()
      expect(result.processingMetadata.algorithmsUsed.length).toBeGreaterThan(0)
      expect(result.processingMetadata.baselineCalculated).toBe(true)
      expect(result.processingMetadata.confidence).toBeGreaterThan(0)
      expect(result.processingMetadata.confidence).toBeLessThanOrEqual(1)

      expect(result.modelPerformance.accuracy).toBeGreaterThan(0)
      expect(result.modelPerformance.accuracy).toBeLessThanOrEqual(1)
      expect(result.modelPerformance.precision).toBeGreaterThan(0)
      expect(result.modelPerformance.precision).toBeLessThanOrEqual(1)
      expect(result.modelPerformance.recall).toBeGreaterThan(0)
      expect(result.modelPerformance.recall).toBeLessThanOrEqual(1)
    })

    it('should handle processing errors gracefully', async () => {
      // Mock an error in AI analysis
      mockedOpenAIService.analyzeText.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.detectAnomalies(mockDetectionRequest)

      // Should still complete detection, but with lower confidence
      expect(result.anomalies).toBeDefined()
      expect(result.processingMetadata.warnings).toContain('AI explanation generation failed')
      expect(result.processingMetadata.confidence).toBeLessThan(0.8)
    })
  })

  describe('subscription management', () => {
    it('should create anomaly subscription', async () => {
      const subscription = await service.createAnomalySubscription(mockSubscription)

      expect(subscription.id).toBe(mockSubscription.id)
      expect(subscription.name).toBe(mockSubscription.name)
      expect(subscription.algorithms).toEqual(mockSubscription.algorithms)
      expect(subscription.alertSettings.enabled).toBe(true)
      expect(subscription.isActive).toBe(true)
    })

    it('should retrieve anomaly subscription', async () => {
      // First create the subscription
      await service.createAnomalySubscription(mockSubscription)

      const retrieved = await service.getAnomalySubscription(mockSubscription.id)

      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe(mockSubscription.id)
      expect(retrieved!.name).toBe(mockSubscription.name)
    })

    it('should update anomaly subscription', async () => {
      // Create initial subscription
      await service.createAnomalySubscription(mockSubscription)

      const updates = {
        name: 'Updated Revenue Detection',
        thresholds: {
          ...mockSubscription.thresholds,
          sensitivity: 0.03
        }
      }

      const updatedSubscription = {
        ...mockSubscription,
        ...updates,
        updatedAt: new Date()
      }

      const result = await service.updateAnomalySubscription(updatedSubscription)

      expect(result.name).toBe('Updated Revenue Detection')
      expect(result.thresholds.sensitivity).toBe(0.03)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should delete anomaly subscription', async () => {
      // Create subscription first
      await service.createAnomalySubscription(mockSubscription)

      await service.deleteAnomalySubscription(mockSubscription.id)

      const retrieved = await service.getAnomalySubscription(mockSubscription.id)
      expect(retrieved).toBeNull()
    })

    it('should get organization subscriptions', async () => {
      // Create multiple subscriptions
      await service.createAnomalySubscription(mockSubscription)
      await service.createAnomalySubscription({
        ...mockSubscription,
        id: 'sub_456',
        name: 'Profit Anomaly Detection',
        metrics: ['profit']
      })

      const orgSubscriptions = await service.getAnomalySubscriptions('org_789')

      expect(orgSubscriptions.length).toBe(2)
      expect(orgSubscriptions.every(sub => sub.organizationId === 'org_789')).toBe(true)
    })
  })

  describe('alert system', () => {
    it('should generate alerts for high severity anomalies', async () => {
      const highImpactData = [
        ...mockDataPoints,
        { metric: 'revenue', value: 50000, timestamp: new Date(), context: { source: 'sales' } } // Very high anomaly
      ]

      const request = {
        ...mockDetectionRequest,
        data: highImpactData
      }

      const result = await service.detectAnomalies(request)
      const highSeverityAnomalies = result.anomalies.filter(a => 
        a.severity === 'HIGH' || a.severity === 'CRITICAL'
      )

      if (highSeverityAnomalies.length > 0) {
        const alertsGenerated = await service.generateAlertsForAnomalies(
          highSeverityAnomalies,
          mockSubscription
        )

        expect(alertsGenerated).toBeDefined()
        expect(alertsGenerated.length).toBeGreaterThan(0)
        
        alertsGenerated.forEach(alert => {
          expect(alert.id).toBeDefined()
          expect(alert.subscriptionId).toBe(mockSubscription.id)
          expect(alert.anomalyId).toBeDefined()
          expect(alert.severity).toMatch(/MEDIUM|HIGH|CRITICAL/)
          expect(alert.message).toBeDefined()
          expect(alert.channels).toBeDefined()
          expect(alert.recipients).toBeDefined()
          expect(alert.createdAt).toBeInstanceOf(Date)
        })
      }
    })

    it('should respect alert throttling settings', async () => {
      const throttledSubscription = {
        ...mockSubscription,
        alertSettings: {
          ...mockSubscription.alertSettings,
          throttling: {
            maxAlertsPerHour: 1,
            cooldownPeriodMinutes: 60,
            groupSimilarAlerts: true
          }
        }
      }

      // Simulate multiple anomalies
      const multipleAnomalies = Array(5).fill(null).map((_, i) => ({
        id: `anomaly_${i}`,
        metric: 'revenue',
        value: 15000,
        expectedValue: 10000,
        anomalyScore: 0.8,
        severity: 'HIGH' as const,
        detectionMethod: 'STATISTICAL' as const,
        timestamp: new Date(Date.now() + i * 1000),
        businessImpact: {
          impactLevel: 'HIGH' as const,
          description: 'High revenue anomaly',
          affectedAreas: ['finance'],
          financialImpact: { estimated: 5000, currency: 'USD' },
          recommendedActions: ['Investigate revenue source'],
          urgency: 'HIGH' as const
        },
        explanation: {
          humanReadable: 'Revenue spike detected',
          technicalDetails: 'Value exceeds 2 standard deviations',
          aiGenerated: 'Unusual revenue pattern detected',
          confidence: 0.8
        },
        context: { source: 'sales' }
      }))

      const alerts = await service.generateAlertsForAnomalies(multipleAnomalies, throttledSubscription)

      // Should be throttled to max 1 alert due to throttling settings
      expect(alerts.length).toBeLessThanOrEqual(1)
    })

    it('should handle alert generation errors gracefully', async () => {
      const invalidSubscription = {
        ...mockSubscription,
        alertSettings: {
          ...mockSubscription.alertSettings,
          recipients: [] // No recipients
        }
      }

      const mockAnomaly = {
        id: 'test_anomaly',
        metric: 'revenue',
        value: 15000,
        expectedValue: 10000,
        anomalyScore: 0.8,
        severity: 'HIGH' as const,
        detectionMethod: 'STATISTICAL' as const,
        timestamp: new Date(),
        businessImpact: {
          impactLevel: 'HIGH' as const,
          description: 'High revenue anomaly',
          affectedAreas: ['finance'],
          financialImpact: { estimated: 5000, currency: 'USD' },
          recommendedActions: ['Investigate revenue source'],
          urgency: 'HIGH' as const
        },
        explanation: {
          humanReadable: 'Revenue spike detected',
          technicalDetails: 'Value exceeds 2 standard deviations',
          aiGenerated: 'Unusual revenue pattern detected',
          confidence: 0.8
        },
        context: { source: 'sales' }
      }

      const alerts = await service.generateAlertsForAnomalies([mockAnomaly], invalidSubscription)

      // Should handle gracefully and return empty array or error alerts
      expect(alerts).toBeDefined()
    })
  })

  describe('model performance tracking', () => {
    it('should track and return model performance metrics', async () => {
      const organizationId = 'org_789'
      const performance = await service.getModelPerformance(organizationId)

      expect(performance).toBeDefined()
      expect(performance.organizationId).toBe(organizationId)
      expect(performance.overallAccuracy).toBeGreaterThan(0)
      expect(performance.overallAccuracy).toBeLessThanOrEqual(1)
      expect(performance.algorithmPerformance).toBeDefined()
      expect(performance.algorithmPerformance.length).toBeGreaterThan(0)

      performance.algorithmPerformance.forEach(algPerf => {
        expect(algPerf.algorithm).toMatch(/STATISTICAL|ISOLATION_FOREST|ONE_CLASS_SVM|ENSEMBLE/)
        expect(algPerf.accuracy).toBeGreaterThanOrEqual(0)
        expect(algPerf.accuracy).toBeLessThanOrEqual(1)
        expect(algPerf.precision).toBeGreaterThanOrEqual(0)
        expect(algPerf.precision).toBeLessThanOrEqual(1)
        expect(algPerf.recall).toBeGreaterThanOrEqual(0)
        expect(algPerf.recall).toBeLessThanOrEqual(1)
        expect(algPerf.executionsCount).toBeGreaterThanOrEqual(0)
      })

      expect(performance.recentTrends).toBeDefined()
      expect(performance.recentTrends.accuracyTrend).toMatch(/IMPROVING|STABLE|DECLINING/)
      expect(performance.recentTrends.falsePositiveRate).toBeGreaterThanOrEqual(0)
      expect(performance.recentTrends.falsePositiveRate).toBeLessThanOrEqual(1)

      expect(performance.recommendations).toBeDefined()
      expect(Array.isArray(performance.recommendations)).toBe(true)
    })

    it('should provide algorithm-specific performance insights', async () => {
      const performance = await service.getModelPerformance('org_789')

      // Should have performance data for supported algorithms
      const algorithmNames = performance.algorithmPerformance.map(p => p.algorithm)
      expect(algorithmNames).toContain('STATISTICAL')
      expect(algorithmNames).toContain('ISOLATION_FOREST')

      // Each algorithm should have comprehensive metrics
      performance.algorithmPerformance.forEach(algPerf => {
        expect(algPerf.lastUpdated).toBeInstanceOf(Date)
        expect(typeof algPerf.averageProcessingTime).toBe('number')
        expect(algPerf.averageProcessingTime).toBeGreaterThan(0)
      })
    })
  })

  describe('baseline management', () => {
    it('should calculate and update baseline correctly', async () => {
      const baselineData = mockDataPoints.slice(0, 5) // First 5 points as baseline
      const baseline = await service.calculateBaseline(baselineData)

      expect(baseline.metric).toBe('revenue')
      expect(baseline.mean).toBeCloseTo(10120, 0) // Approximate mean of first 5 points
      expect(baseline.standardDeviation).toBeGreaterThan(0)
      expect(baseline.min).toBeLessThanOrEqual(baseline.max)
      expect(baseline.dataPoints).toBe(5)
      expect(baseline.calculatedAt).toBeInstanceOf(Date)

      // Confidence should be reasonable
      expect(baseline.confidence).toBeGreaterThan(0.5)
      expect(baseline.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle insufficient baseline data', async () => {
      const insufficientData = [mockDataPoints[0]] // Only 1 data point
      const baseline = await service.calculateBaseline(insufficientData)

      expect(baseline.confidence).toBeLessThan(0.5)
      expect(baseline.standardDeviation).toBe(0) // No variation with single point
      expect(baseline.recommendations).toContain('Collect more data points for reliable baseline')
    })
  })

  describe('utility functions', () => {
    it('should classify anomaly severity correctly', async () => {
      const lowScore = 0.6
      const mediumScore = 0.75
      const highScore = 0.9
      const criticalScore = 0.95

      expect(service['classifySeverity'](lowScore)).toBe('LOW')
      expect(service['classifySeverity'](mediumScore)).toBe('MEDIUM')
      expect(service['classifySeverity'](highScore)).toBe('HIGH')
      expect(service['classifySeverity'](criticalScore)).toBe('CRITICAL')
    })

    it('should calculate business impact correctly', async () => {
      const highImpactAnomaly = {
        metric: 'revenue',
        value: 20000,
        expectedValue: 10000,
        anomalyScore: 0.9,
        context: { source: 'sales', department: 'finance' }
      }

      const businessImpact = await service['assessBusinessImpact'](highImpactAnomaly, mockDetectionRequest.metadata)

      expect(businessImpact.impactLevel).toMatch(/MEDIUM|HIGH|CRITICAL/)
      expect(businessImpact.description).toBeDefined()
      expect(businessImpact.affectedAreas.length).toBeGreaterThan(0)
      expect(businessImpact.financialImpact).toBeDefined()
      expect(businessImpact.recommendedActions.length).toBeGreaterThan(0)
      expect(businessImpact.urgency).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
    })

    it('should validate detection request properly', async () => {
      const validRequest = mockDetectionRequest
      expect(() => service['validateRequest'](validRequest)).not.toThrow()

      const invalidRequest = {
        ...mockDetectionRequest,
        data: [] // Empty data
      }
      expect(() => service['validateRequest'](invalidRequest)).toThrow('Data array cannot be empty')

      const invalidThresholds = {
        ...mockDetectionRequest,
        thresholds: {
          ...mockDetectionRequest.thresholds,
          sensitivity: 1.5 // Invalid value
        }
      }
      expect(() => service['validateRequest'](invalidThresholds)).toThrow('Sensitivity must be between 0 and 1')
    })
  })
})