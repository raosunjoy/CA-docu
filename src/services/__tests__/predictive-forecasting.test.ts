import { PredictiveForecastingService, predictiveForecasting, ForecastRequest, ScenarioAnalysisRequest, ModelCalibrationRequest, ForecastDataPoint } from '../predictive-forecasting'
import { openaiService } from '../openai-service'
import { analyticsService } from '../analytics-service'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../analytics-service')
jest.mock('../../lib/caching-service')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>

describe('PredictiveForecastingService', () => {
  let service: PredictiveForecastingService
  
  const mockHistoricalData: ForecastDataPoint[] = [
    { date: new Date('2023-01-01'), value: 100000, metadata: {} },
    { date: new Date('2023-02-01'), value: 105000, metadata: {} },
    { date: new Date('2023-03-01'), value: 110000, metadata: {} },
    { date: new Date('2023-04-01'), value: 108000, metadata: {} },
    { date: new Date('2023-05-01'), value: 115000, metadata: {} },
    { date: new Date('2023-06-01'), value: 120000, metadata: {} },
    { date: new Date('2023-07-01'), value: 118000, metadata: {} },
    { date: new Date('2023-08-01'), value: 125000, metadata: {} },
    { date: new Date('2023-09-01'), value: 130000, metadata: {} },
    { date: new Date('2023-10-01'), value: 135000, metadata: {} },
    { date: new Date('2023-11-01'), value: 128000, metadata: {} },
    { date: new Date('2023-12-01'), value: 140000, metadata: {} }
  ]

  const mockForecastRequest: ForecastRequest = {
    id: 'forecast_test_123',
    userId: 'user_456',
    organizationId: 'org_789',
    metricType: 'REVENUE',
    historicalData: mockHistoricalData,
    forecastHorizon: 6,
    confidence: 0.95,
    modelPreferences: {
      modelType: 'AUTO',
      seasonality: 'AUTO',
      includeConfidenceIntervals: true,
      customParameters: {}
    },
    includeScenarios: true,
    businessRules: [],
    metadata: {
      requestedBy: 'user_456',
      requestedAt: new Date(),
      source: 'TEST'
    }
  }

  const mockScenarioAnalysisRequest: ScenarioAnalysisRequest = {
    id: 'scenario_test_456',
    userId: 'user_456',
    organizationId: 'org_789',
    metricType: 'REVENUE',
    baseHistoricalData: mockHistoricalData,
    scenarios: [
      {
        id: 'optimistic',
        name: 'Optimistic Growth',
        description: 'Market expansion and new client acquisition',
        assumptions: ['20% market growth', 'New service line launch'],
        parameters: { growthMultiplier: 1.2, marketExpansion: 0.15 },
        probability: 0.3,
        impact: 'HIGH',
        timeframe: {
          start: new Date('2024-01-01'),
          end: new Date('2024-06-30')
        }
      },
      {
        id: 'pessimistic',
        name: 'Economic Downturn',
        description: 'Market contraction and reduced client spending',
        assumptions: ['10% market decline', 'Client budget cuts'],
        parameters: { growthMultiplier: 0.85, marketContraction: -0.1 },
        probability: 0.2,
        impact: 'HIGH',
        timeframe: {
          start: new Date('2024-01-01'),
          end: new Date('2024-06-30')
        }
      }
    ],
    analysisDepth: 'COMPREHENSIVE',
    includeRiskAssessment: true,
    metadata: {
      requestedBy: 'user_456',
      requestedAt: new Date(),
      businessContext: {}
    }
  }

  const mockCalibrationRequest: ModelCalibrationRequest = {
    id: 'calibration_test_789',
    userId: 'user_456',
    organizationId: 'org_789',
    modelType: 'ARIMA',
    calibrationData: [
      { date: new Date('2024-01-01'), actualValue: 145000, predictedValue: 142000, metadata: {} },
      { date: new Date('2024-02-01'), actualValue: 148000, predictedValue: 150000, metadata: {} },
      { date: new Date('2024-03-01'), actualValue: 152000, predictedValue: 149000, metadata: {} },
      { date: new Date('2024-04-01'), actualValue: 147000, predictedValue: 145000, metadata: {} },
      { date: new Date('2024-05-01'), actualValue: 155000, predictedValue: 153000, metadata: {} },
      { date: new Date('2024-06-01'), actualValue: 158000, predictedValue: 160000, metadata: {} }
    ],
    targetMetrics: ['mape', 'rmse', 'mae'],
    optimizationGoal: 'MINIMIZE_ERROR',
    metadata: {
      requestedBy: 'user_456',
      requestedAt: new Date()
    }
  }

  beforeEach(() => {
    service = new PredictiveForecastingService()
    jest.clearAllMocks()

    // Setup default AI response
    mockedOpenAIService.analyzeText.mockResolvedValue({
      summary: 'Comprehensive forecast analysis completed with high confidence',
      sentiment: 'POSITIVE',
      keyPoints: [
        'Strong upward trend identified in historical data',
        'Seasonal patterns detected with Q4 peaks',
        'Model confidence is high based on data consistency'
      ],
      confidence: 0.88
    })

    // Setup analytics service
    mockedAnalyticsService.calculateKPI.mockResolvedValue({
      value: 125000,
      trend: 'UP',
      changePercentage: 15.5,
      benchmark: 110000,
      status: 'ABOVE_TARGET',
      metadata: {
        period: '12_months',
        dataPoints: 12
      }
    })
  })

  describe('generateForecast', () => {
    it('should generate comprehensive forecast with all components', async () => {
      const result = await service.generateForecast(mockForecastRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(mockForecastRequest.id)
      expect(result.forecastId).toBeDefined()
      expect(result.metricType).toBe(mockForecastRequest.metricType)
      expect(result.forecastedValues).toBeDefined()
      expect(result.forecastedValues.length).toBe(mockForecastRequest.forecastHorizon)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(result.modelMetadata).toBeDefined()
      expect(result.scenarios).toBeDefined()
      expect(result.riskAssessment).toBeDefined()
      expect(result.insights).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.executiveSummary).toBeDefined()
      expect(result.metadata).toBeDefined()

      // Check forecasted values structure
      result.forecastedValues.forEach((value, index) => {
        expect(value.date).toBeInstanceOf(Date)
        expect(value.predictedValue).toBeGreaterThan(0)
        expect(value.confidenceInterval).toBeDefined()
        expect(value.confidenceInterval.lower).toBeLessThan(value.predictedValue)
        expect(value.confidenceInterval.upper).toBeGreaterThan(value.predictedValue)
        expect(value.period).toBe(index + 1)
      })

      // Check model metadata
      expect(result.modelMetadata.primaryModel).toMatch(/ARIMA|PROPHET|EXPONENTIAL_SMOOTHING|LINEAR_REGRESSION|ENSEMBLE/)
      expect(result.modelMetadata.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.modelMetadata.accuracy).toBeLessThanOrEqual(1)
      expect(result.modelMetadata.parameters).toBeDefined()
      expect(result.modelMetadata.trainingDataPoints).toBe(mockHistoricalData.length)

      // Check scenarios
      expect(result.scenarios.baseCase).toBeDefined()
      expect(result.scenarios.optimistic).toBeDefined()
      expect(result.scenarios.pessimistic).toBeDefined()

      // Check risk assessment
      expect(result.riskAssessment.overallRisk.level).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
      expect(result.riskAssessment.overallRisk.score).toBeGreaterThanOrEqual(0)
      expect(result.riskAssessment.overallRisk.score).toBeLessThanOrEqual(1)

      // Check executive summary
      expect(result.executiveSummary.keyFindings).toBeDefined()
      expect(result.executiveSummary.confidenceLevel).toBeDefined()
      expect(result.executiveSummary.primaryTrend).toBeDefined()
      expect(result.executiveSummary.recommendations).toBeDefined()
    })

    it('should validate forecast request properly', async () => {
      // Test empty historical data
      const emptyDataRequest = {
        ...mockForecastRequest,
        historicalData: []
      }

      await expect(
        service.generateForecast(emptyDataRequest)
      ).rejects.toThrow('Insufficient historical data')

      // Test invalid forecast horizon
      const invalidHorizonRequest = {
        ...mockForecastRequest,
        forecastHorizon: 0
      }

      await expect(
        service.generateForecast(invalidHorizonRequest)
      ).rejects.toThrow('Forecast horizon must be at least 1')

      // Test missing user ID
      const noUserRequest = {
        ...mockForecastRequest,
        userId: ''
      }

      await expect(
        service.generateForecast(noUserRequest)
      ).rejects.toThrow('User ID is required')

      // Test missing organization ID
      const noOrgRequest = {
        ...mockForecastRequest,
        organizationId: ''
      }

      await expect(
        service.generateForecast(noOrgRequest)
      ).rejects.toThrow('Organization ID is required')
    })

    it('should handle different model types correctly', async () => {
      const modelTypes = ['ARIMA', 'PROPHET', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION', 'ENSEMBLE']

      for (const modelType of modelTypes) {
        const modelRequest = {
          ...mockForecastRequest,
          modelPreferences: {
            ...mockForecastRequest.modelPreferences,
            modelType: modelType as any
          }
        }

        const result = await service.generateForecast(modelRequest)
        expect(result.modelMetadata.primaryModel).toBeDefined()
        expect(result.forecastedValues.length).toBe(mockForecastRequest.forecastHorizon)
      }
    })

    it('should apply business rules correctly', async () => {
      const businessRulesRequest = {
        ...mockForecastRequest,
        businessRules: [
          {
            id: 'max_growth',
            name: 'Maximum Growth Rate',
            description: 'Revenue growth should not exceed 30% per month',
            ruleType: 'RANGE_CONSTRAINT' as const,
            conditions: [{
              field: 'growth_rate',
              operator: 'LESS_THAN_OR_EQUAL',
              value: 0.3,
              severity: 'HIGH' as const
            }],
            isActive: true
          }
        ]
      }

      const result = await service.generateForecast(businessRulesRequest)
      
      // Check that business rules were applied
      expect(result.metadata.businessRulesApplied).toBe(true)
      expect(result.metadata.rulesAppliedCount).toBeGreaterThan(0)

      // Verify growth rate constraint
      for (let i = 1; i < result.forecastedValues.length; i++) {
        const previousValue = result.forecastedValues[i - 1].predictedValue
        const currentValue = result.forecastedValues[i].predictedValue
        const growthRate = (currentValue - previousValue) / previousValue
        expect(growthRate).toBeLessThanOrEqual(0.31) // Allow small margin for rounding
      }
    })

    it('should detect and handle seasonality', async () => {
      // Create seasonal data pattern (higher in Q4)
      const seasonalData: ForecastDataPoint[] = [
        { date: new Date('2023-01-01'), value: 100000, metadata: {} },
        { date: new Date('2023-02-01'), value: 105000, metadata: {} },
        { date: new Date('2023-03-01'), value: 110000, metadata: {} },
        { date: new Date('2023-04-01'), value: 115000, metadata: {} },
        { date: new Date('2023-05-01'), value: 112000, metadata: {} },
        { date: new Date('2023-06-01'), value: 118000, metadata: {} },
        { date: new Date('2023-07-01'), value: 120000, metadata: {} },
        { date: new Date('2023-08-01'), value: 125000, metadata: {} },
        { date: new Date('2023-09-01'), value: 122000, metadata: {} },
        { date: new Date('2023-10-01'), value: 135000, metadata: {} }, // Q4 spike
        { date: new Date('2023-11-01'), value: 140000, metadata: {} }, // Q4 spike
        { date: new Date('2023-12-01'), value: 150000, metadata: {} }  // Q4 spike
      ]

      const seasonalRequest = {
        ...mockForecastRequest,
        historicalData: seasonalData,
        modelPreferences: {
          ...mockForecastRequest.modelPreferences,
          seasonality: 'DETECT' as const
        }
      }

      const result = await service.generateForecast(seasonalRequest)

      expect(result.modelMetadata.seasonalityDetected).toBe(true)
      expect(result.patternAnalysis.seasonality).toBeDefined()
      expect(result.patternAnalysis.seasonality.strength).toBeGreaterThan(0)
      expect(result.patternAnalysis.seasonality.period).toBeDefined()
    })

    it('should handle data quality issues gracefully', async () => {
      // Create data with quality issues (missing values, outliers)
      const poorQualityData: ForecastDataPoint[] = [
        { date: new Date('2023-01-01'), value: 100000, metadata: {} },
        { date: new Date('2023-02-01'), value: 500000, metadata: {} }, // Outlier
        { date: new Date('2023-03-01'), value: 110000, metadata: {} },
        { date: new Date('2023-04-01'), value: 0, metadata: {} }, // Missing/zero value
        { date: new Date('2023-05-01'), value: 115000, metadata: {} },
        { date: new Date('2023-06-01'), value: 120000, metadata: {} }
      ]

      const poorQualityRequest = {
        ...mockForecastRequest,
        historicalData: poorQualityData
      }

      const result = await service.generateForecast(poorQualityRequest)

      // Should still generate forecast but with lower confidence
      expect(result.confidence).toBeLessThan(0.8)
      expect(result.qualityAssessment.overallScore).toBeLessThan(0.8)
      expect(result.qualityAssessment.issues.length).toBeGreaterThan(0)
      expect(result.recommendations.some(r => 
        r.category === 'DATA_QUALITY' || r.title.toLowerCase().includes('quality')
      )).toBe(true)
    })

    it('should use caching for repeated requests', async () => {
      // First request - should not be cached
      const result1 = await service.generateForecast(mockForecastRequest)
      expect(result1.metadata.cached).toBe(false)

      // Second identical request - should be cached
      const result2 = await service.generateForecast(mockForecastRequest)
      expect(result2.metadata.cached).toBe(true)
      expect(result2.metadata.processingTime).toBeLessThan(result1.metadata.processingTime)
    })

    it('should handle AI service failures gracefully', async () => {
      mockedOpenAIService.analyzeText.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.generateForecast(mockForecastRequest)
      
      // Should still complete forecast with fallback insights
      expect(result).toBeDefined()
      expect(result.confidence).toBeLessThan(0.9) // Lower confidence due to AI failure
      expect(result.insights.length).toBeGreaterThan(0) // Should have fallback insights
      expect(result.executiveSummary.keyFindings.length).toBeGreaterThan(0)
    })
  })

  describe('performScenarioAnalysis', () => {
    it('should perform comprehensive scenario analysis', async () => {
      const result = await service.performScenarioAnalysis(mockScenarioAnalysisRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(mockScenarioAnalysisRequest.id)
      expect(result.analysisId).toBeDefined()
      expect(result.metricType).toBe(mockScenarioAnalysisRequest.metricType)
      expect(result.scenarioResults).toBeDefined()
      expect(result.scenarioResults.length).toBe(mockScenarioAnalysisRequest.scenarios.length)
      expect(result.comparativeAnalysis).toBeDefined()
      expect(result.riskAssessment).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.executiveSummary).toBeDefined()
      expect(result.metadata).toBeDefined()

      // Check scenario results structure
      result.scenarioResults.forEach((scenario, index) => {
        const originalScenario = mockScenarioAnalysisRequest.scenarios[index]
        expect(scenario.scenarioId).toBe(originalScenario.id)
        expect(scenario.scenarioName).toBe(originalScenario.name)
        expect(scenario.probability).toBe(originalScenario.probability)
        expect(scenario.forecastedValues).toBeDefined()
        expect(scenario.forecastedValues.length).toBeGreaterThan(0)
        expect(scenario.impactAssessment).toBeDefined()
        expect(scenario.confidence).toBeGreaterThanOrEqual(0)
        expect(scenario.confidence).toBeLessThanOrEqual(1)
      })

      // Check comparative analysis
      expect(result.comparativeAnalysis.bestCaseScenario).toBeDefined()
      expect(result.comparativeAnalysis.worstCaseScenario).toBeDefined()
      expect(result.comparativeAnalysis.mostLikelyScenario).toBeDefined()
      expect(result.comparativeAnalysis.impactRange).toBeDefined()
      expect(result.comparativeAnalysis.impactRange.min).toBeLessThan(result.comparativeAnalysis.impactRange.max)

      // Check risk assessment
      expect(result.riskAssessment.overallRisk).toBeDefined()
      expect(result.riskAssessment.scenarioRisks).toBeDefined()
      expect(result.riskAssessment.scenarioRisks.length).toBe(mockScenarioAnalysisRequest.scenarios.length)
    })

    it('should validate scenario analysis request', async () => {
      const noScenariosRequest = {
        ...mockScenarioAnalysisRequest,
        scenarios: []
      }

      await expect(
        service.performScenarioAnalysis(noScenariosRequest)
      ).rejects.toThrow('At least one scenario is required')

      const invalidScenarioRequest = {
        ...mockScenarioAnalysisRequest,
        scenarios: [{
          id: '',
          name: '',
          description: '',
          assumptions: [],
          parameters: {},
          probability: 1.5, // Invalid probability
          impact: 'MEDIUM' as const
        }]
      }

      await expect(
        service.performScenarioAnalysis(invalidScenarioRequest)
      ).rejects.toThrow('Scenario probability must be between 0 and 1')
    })

    it('should normalize scenario probabilities', async () => {
      const unnormalizedRequest = {
        ...mockScenarioAnalysisRequest,
        scenarios: [
          {
            id: 'scenario1',
            name: 'Scenario 1',
            description: 'Test scenario',
            assumptions: [],
            parameters: {},
            probability: 0.6,
            impact: 'HIGH' as const
          },
          {
            id: 'scenario2',
            name: 'Scenario 2',
            description: 'Test scenario',
            assumptions: [],
            parameters: {},
            probability: 0.8, // Total > 1
            impact: 'MEDIUM' as const
          }
        ]
      }

      const result = await service.performScenarioAnalysis(unnormalizedRequest)
      
      const totalProbability = result.scenarioResults.reduce((sum, s) => sum + s.probability, 0)
      expect(totalProbability).toBeCloseTo(1.0, 2)
    })

    it('should identify best and worst case scenarios', async () => {
      const result = await service.performScenarioAnalysis(mockScenarioAnalysisRequest)

      const bestCase = result.comparativeAnalysis.bestCaseScenario
      const worstCase = result.comparativeAnalysis.worstCaseScenario

      expect(bestCase.scenarioId).toBeDefined()
      expect(worstCase.scenarioId).toBeDefined()
      expect(bestCase.scenarioId).not.toBe(worstCase.scenarioId)

      // Best case should have higher projected values than worst case
      const bestCaseTotal = bestCase.projectedImpact.totalValue
      const worstCaseTotal = worstCase.projectedImpact.totalValue
      expect(bestCaseTotal).toBeGreaterThan(worstCaseTotal)
    })
  })

  describe('assessRisks', () => {
    it('should perform comprehensive risk assessment', async () => {
      const result = await service.assessRisks(
        'REVENUE',
        mockHistoricalData,
        'org_789'
      )

      expect(result).toBeDefined()
      expect(result.assessmentId).toBeDefined()
      expect(result.metricType).toBe('REVENUE')
      expect(result.overallRisk).toBeDefined()
      expect(result.overallRisk.level).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
      expect(result.overallRisk.score).toBeGreaterThanOrEqual(0)
      expect(result.overallRisk.score).toBeLessThanOrEqual(1)
      expect(result.riskFactors).toBeDefined()
      expect(result.earlyWarningIndicators).toBeDefined()
      expect(result.mitigationStrategies).toBeDefined()
      expect(result.sensitivityAnalysis).toBeDefined()
      expect(result.recommendations).toBeDefined()

      // Check risk factors
      expect(Array.isArray(result.riskFactors)).toBe(true)
      result.riskFactors.forEach(factor => {
        expect(factor.factor).toBeDefined()
        expect(factor.impact).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
        expect(factor.probability).toBeGreaterThanOrEqual(0)
        expect(factor.probability).toBeLessThanOrEqual(1)
        expect(factor.description).toBeDefined()
      })

      // Check early warning indicators
      expect(Array.isArray(result.earlyWarningIndicators)).toBe(true)
      result.earlyWarningIndicators.forEach(indicator => {
        expect(indicator.indicator).toBeDefined()
        expect(indicator.currentStatus).toMatch(/GREEN|YELLOW|RED/)
        expect(indicator.threshold).toBeDefined()
        expect(indicator.description).toBeDefined()
      })

      // Check sensitivity analysis
      expect(result.sensitivityAnalysis.keyDrivers).toBeDefined()
      expect(Array.isArray(result.sensitivityAnalysis.keyDrivers)).toBe(true)
      expect(result.sensitivityAnalysis.impactRanges).toBeDefined()
    })

    it('should identify volatility risks', async () => {
      // Create volatile data
      const volatileData: ForecastDataPoint[] = [
        { date: new Date('2023-01-01'), value: 100000, metadata: {} },
        { date: new Date('2023-02-01'), value: 150000, metadata: {} }, // +50%
        { date: new Date('2023-03-01'), value: 80000, metadata: {} },  // -47%
        { date: new Date('2023-04-01'), value: 130000, metadata: {} }, // +63%
        { date: new Date('2023-05-01'), value: 90000, metadata: {} },  // -31%
        { date: new Date('2023-06-01'), value: 140000, metadata: {} }  // +56%
      ]

      const result = await service.assessRisks('REVENUE', volatileData, 'org_789')
      
      expect(result.overallRisk.level).toMatch(/HIGH|CRITICAL/)
      expect(result.riskFactors.some(f => 
        f.factor.toLowerCase().includes('volatility') || 
        f.factor.toLowerCase().includes('instability')
      )).toBe(true)
    })

    it('should identify trend reversal risks', async () => {
      // Create declining trend data
      const decliningData: ForecastDataPoint[] = [
        { date: new Date('2023-01-01'), value: 150000, metadata: {} },
        { date: new Date('2023-02-01'), value: 145000, metadata: {} },
        { date: new Date('2023-03-01'), value: 140000, metadata: {} },
        { date: new Date('2023-04-01'), value: 135000, metadata: {} },
        { date: new Date('2023-05-01'), value: 130000, metadata: {} },
        { date: new Date('2023-06-01'), value: 125000, metadata: {} }
      ]

      const result = await service.assessRisks('REVENUE', decliningData, 'org_789')
      
      expect(result.riskFactors.some(f => 
        f.factor.toLowerCase().includes('decline') || 
        f.factor.toLowerCase().includes('trend')
      )).toBe(true)
    })
  })

  describe('calibrateModel', () => {
    it('should calibrate model and improve performance', async () => {
      const result = await service.calibrateModel(mockCalibrationRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(mockCalibrationRequest.id)
      expect(result.calibrationId).toBeDefined()
      expect(result.modelType).toBe(mockCalibrationRequest.modelType)
      expect(result.baselineMetrics).toBeDefined()
      expect(result.performanceMetrics).toBeDefined()
      expect(result.calibratedParameters).toBeDefined()
      expect(result.improvementSummary).toBeDefined()
      expect(result.recommendations).toBeDefined()

      // Check baseline metrics
      expect(result.baselineMetrics.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.baselineMetrics.accuracy).toBeLessThanOrEqual(1)
      expect(result.baselineMetrics.mape).toBeGreaterThanOrEqual(0)
      expect(result.baselineMetrics.rmse).toBeGreaterThanOrEqual(0)
      expect(result.baselineMetrics.mae).toBeGreaterThanOrEqual(0)

      // Check performance metrics (should be better than baseline)
      expect(result.performanceMetrics.accuracy).toBeGreaterThanOrEqual(result.baselineMetrics.accuracy)
      expect(result.performanceMetrics.mape).toBeLessThanOrEqual(result.baselineMetrics.mape)

      // Check improvement summary
      expect(result.improvementSummary.accuracyImprovement).toBeDefined()
      expect(result.improvementSummary.errorReduction).toBeDefined()
      expect(result.improvementSummary.significantlyImproved).toBeDefined()
    })

    it('should validate calibration request', async () => {
      const invalidRequest = {
        ...mockCalibrationRequest,
        calibrationData: [] // Empty calibration data
      }

      await expect(
        service.calibrateModel(invalidRequest)
      ).rejects.toThrow('Insufficient calibration data')

      const mismatchedDataRequest = {
        ...mockCalibrationRequest,
        calibrationData: [
          { date: new Date('2024-01-01'), actualValue: 100, predictedValue: -10, metadata: {} } // Negative predicted value
        ]
      }

      await expect(
        service.calibrateModel(mismatchedDataRequest)
      ).rejects.toThrow('Calibration data contains invalid values')
    })

    it('should optimize for different target metrics', async () => {
      const mapeOptimizationRequest = {
        ...mockCalibrationRequest,
        targetMetrics: ['mape'],
        optimizationGoal: 'MINIMIZE_ERROR' as const
      }

      const result = await service.calibrateModel(mapeOptimizationRequest)
      expect(result.performanceMetrics.mape).toBeLessThan(result.baselineMetrics.mape)

      const accuracyOptimizationRequest = {
        ...mockCalibrationRequest,
        targetMetrics: ['accuracy'],
        optimizationGoal: 'MAXIMIZE_ACCURACY' as const
      }

      const accuracyResult = await service.calibrateModel(accuracyOptimizationRequest)
      expect(accuracyResult.performanceMetrics.accuracy).toBeGreaterThan(accuracyResult.baselineMetrics.accuracy)
    })
  })

  describe('validateModel', () => {
    it('should validate model performance', async () => {
      const result = await service.validateModel('model_123', 'org_789')

      expect(result).toBeDefined()
      expect(result.modelId).toBe('model_123')
      expect(result.validationResults).toBeDefined()
      expect(result.performanceMetrics).toBeDefined()
      expect(result.validationStatus).toMatch(/PASSED|FAILED|WARNING/)
      expect(result.issues).toBeDefined()
      expect(result.recommendations).toBeDefined()

      // Check validation results
      expect(result.validationResults.accuracyCheck).toBeDefined()
      expect(result.validationResults.biasCheck).toBeDefined()
      expect(result.validationResults.stabilityCheck).toBeDefined()
      expect(result.validationResults.robustnessCheck).toBeDefined()

      // Check performance metrics
      expect(result.performanceMetrics.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.performanceMetrics.accuracy).toBeLessThanOrEqual(1)
      expect(result.performanceMetrics.reliability).toBeGreaterThanOrEqual(0)
      expect(result.performanceMetrics.reliability).toBeLessThanOrEqual(1)
    })

    it('should handle non-existent model', async () => {
      await expect(
        service.validateModel('non_existent_model', 'org_789')
      ).rejects.toThrow('Model not found')
    })
  })

  describe('pattern detection and analysis', () => {
    it('should detect various patterns in data', async () => {
      const result = await service.generateForecast(mockForecastRequest)

      expect(result.patternAnalysis).toBeDefined()
      expect(result.patternAnalysis.trend).toBeDefined()
      expect(result.patternAnalysis.trend.direction).toMatch(/UPWARD|DOWNWARD|STABLE|VOLATILE/)
      expect(result.patternAnalysis.trend.strength).toBeGreaterThanOrEqual(0)
      expect(result.patternAnalysis.trend.strength).toBeLessThanOrEqual(1)

      if (result.patternAnalysis.seasonality) {
        expect(result.patternAnalysis.seasonality.detected).toBeDefined()
        expect(result.patternAnalysis.seasonality.strength).toBeGreaterThanOrEqual(0)
        expect(result.patternAnalysis.seasonality.strength).toBeLessThanOrEqual(1)
      }

      if (result.patternAnalysis.cyclical) {
        expect(result.patternAnalysis.cyclical.detected).toBeDefined()
        expect(result.patternAnalysis.cyclical.period).toBeGreaterThan(0)
      }
    })

    it('should detect anomalies in historical data', async () => {
      const anomalousData: ForecastDataPoint[] = [
        { date: new Date('2023-01-01'), value: 100000, metadata: {} },
        { date: new Date('2023-02-01'), value: 105000, metadata: {} },
        { date: new Date('2023-03-01'), value: 1000000, metadata: {} }, // Anomaly
        { date: new Date('2023-04-01'), value: 108000, metadata: {} },
        { date: new Date('2023-05-01'), value: 110000, metadata: {} }
      ]

      const anomalousRequest = {
        ...mockForecastRequest,
        historicalData: anomalousData
      }

      const result = await service.generateForecast(anomalousRequest)
      
      expect(result.qualityAssessment.anomaliesDetected).toBeGreaterThan(0)
      expect(result.qualityAssessment.issues.some(issue => 
        issue.type === 'OUTLIER' || issue.description.toLowerCase().includes('anomaly')
      )).toBe(true)
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle insufficient data gracefully', async () => {
      const insufficientDataRequest = {
        ...mockForecastRequest,
        historicalData: [
          { date: new Date('2023-01-01'), value: 100000, metadata: {} }
        ]
      }

      await expect(
        service.generateForecast(insufficientDataRequest)
      ).rejects.toThrow('Insufficient historical data')
    })

    it('should handle extreme forecast horizons', async () => {
      const extremeHorizonRequest = {
        ...mockForecastRequest,
        forecastHorizon: 100 // Very long horizon
      }

      const result = await service.generateForecast(extremeHorizonRequest)
      
      expect(result.confidence).toBeLessThan(0.7) // Lower confidence for long horizons
      expect(result.recommendations.some(r => 
        r.title.toLowerCase().includes('horizon') || r.description.toLowerCase().includes('long-term')
      )).toBe(true)
    })

    it('should handle missing or invalid dates', async () => {
      const invalidDateData = mockHistoricalData.map((item, index) => ({
        ...item,
        date: index === 2 ? new Date('invalid') : item.date
      }))

      const invalidDateRequest = {
        ...mockForecastRequest,
        historicalData: invalidDateData
      }

      // Should handle invalid dates gracefully
      const result = await service.generateForecast(invalidDateRequest)
      expect(result.qualityAssessment.issues.some(issue => 
        issue.type === 'INVALID_DATE' || issue.description.toLowerCase().includes('date')
      )).toBe(true)
    })

    it('should handle zero or negative values appropriately', async () => {
      const negativeValueData: ForecastDataPoint[] = [
        { date: new Date('2023-01-01'), value: 100000, metadata: {} },
        { date: new Date('2023-02-01'), value: -10000, metadata: {} }, // Negative
        { date: new Date('2023-03-01'), value: 0, metadata: {} },       // Zero
        { date: new Date('2023-04-01'), value: 105000, metadata: {} },
        { date: new Date('2023-05-01'), value: 110000, metadata: {} }
      ]

      const negativeValueRequest = {
        ...mockForecastRequest,
        historicalData: negativeValueData
      }

      const result = await service.generateForecast(negativeValueRequest)
      
      // Should flag data quality issues
      expect(result.qualityAssessment.issues.some(issue => 
        issue.type === 'NEGATIVE_VALUE' || issue.type === 'ZERO_VALUE'
      )).toBe(true)
    })

    it('should handle model training failures', async () => {
      // Force a scenario that would cause model training to fail
      const problematicData: ForecastDataPoint[] = Array(10).fill(null).map((_, i) => ({
        date: new Date(`2023-${String(i + 1).padStart(2, '0')}-01`),
        value: 100000, // All same values - no variation
        metadata: {}
      }))

      const problematicRequest = {
        ...mockForecastRequest,
        historicalData: problematicData
      }

      const result = await service.generateForecast(problematicRequest)
      
      // Should fallback to simpler model or linear extrapolation
      expect(result.modelMetadata.fallbackUsed).toBe(true)
      expect(result.confidence).toBeLessThan(0.6)
      expect(result.recommendations.some(r => 
        r.category === 'DATA_QUALITY' || r.title.toLowerCase().includes('variation')
      )).toBe(true)
    })
  })

  describe('performance and caching', () => {
    it('should complete forecasting within reasonable time', async () => {
      const startTime = Date.now()
      const result = await service.generateForecast(mockForecastRequest)
      const endTime = Date.now()
      
      const processingTime = endTime - startTime
      expect(processingTime).toBeLessThan(30000) // Should complete within 30 seconds
      expect(result.metadata.processingTime).toBeLessThan(processingTime)
    })

    it('should handle concurrent forecast requests', async () => {
      const requests = Array(3).fill(null).map((_, i) => ({
        ...mockForecastRequest,
        id: `concurrent_forecast_${i}`,
        metricType: ['REVENUE', 'CASH_FLOW', 'CLIENT_ACQUISITION'][i] as any
      }))

      const promises = requests.map(request => service.generateForecast(request))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.requestId).toBe(requests[index].id)
        expect(result.metricType).toBe(requests[index].metricType)
      })
    })

    it('should handle memory efficiently for large datasets', async () => {
      // Create large dataset (2 years of daily data)
      const largeDataset: ForecastDataPoint[] = Array(730).fill(null).map((_, i) => {
        const date = new Date('2022-01-01')
        date.setDate(date.getDate() + i)
        return {
          date,
          value: 100000 + Math.random() * 10000 + i * 100, // Trend with noise
          metadata: {}
        }
      })

      const largeDataRequest = {
        ...mockForecastRequest,
        historicalData: largeDataset
      }

      const result = await service.generateForecast(largeDataRequest)
      
      expect(result).toBeDefined()
      expect(result.modelMetadata.trainingDataPoints).toBe(730)
      expect(result.metadata.processingTime).toBeLessThan(60000) // Within 1 minute
    })
  })
})