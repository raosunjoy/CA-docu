import { openaiService } from './openai-service'
import { analyticsService } from './analytics-service'
import { logger } from '../lib/logger'

// Types for Predictive Forecasting
export interface ForecastRequest {
  id: string
  userId: string
  organizationId: string
  forecastType: 'REVENUE' | 'DEMAND' | 'CAPACITY' | 'CHURN' | 'UTILIZATION' | 'CUSTOM'
  targetMetric: string
  historicalData: DataPoint[]
  forecastHorizon: {
    periods: number
    unit: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
    endDate?: Date
  }
  modelConfiguration: {
    algorithms: ForecastAlgorithm[]
    confidence: number
    seasonality: 'AUTO' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'NONE'
    externalFactors?: ExternalFactor[]
    businessRules?: BusinessRule[]
  }
  contextualData?: {
    economic: EconomicIndicators
    business: BusinessContext
    market: MarketConditions
    historical: HistoricalPatterns
  }
  preferences: {
    includeConfidenceIntervals: boolean
    includePredictiveInsights: boolean
    includeScenarioAnalysis: boolean
    includeRecommendations: boolean
    granularity: 'SUMMARY' | 'DETAILED' | 'COMPREHENSIVE'
  }
  metadata: {
    requestReason: string
    stakeholders: string[]
    decisionContext: string
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
}

export interface DataPoint {
  timestamp: Date
  value: number
  metadata?: {
    source: string
    confidence: number
    adjustments?: string[]
    externalEvents?: string[]
  }
}

export interface ForecastAlgorithm {
  name: 'LINEAR_REGRESSION' | 'ARIMA' | 'EXPONENTIAL_SMOOTHING' | 'PROPHET' | 'NEURAL_NETWORK' | 'ENSEMBLE'
  weight: number
  parameters?: Record<string, any>
  enabled: boolean
}

export interface ExternalFactor {
  name: string
  type: 'ECONOMIC' | 'SEASONAL' | 'MARKET' | 'REGULATORY' | 'COMPETITIVE' | 'INTERNAL'
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  strength: number // 0-1
  lag: number // periods
  data?: DataPoint[]
}

export interface BusinessRule {
  id: string
  name: string
  type: 'MIN_VALUE' | 'MAX_VALUE' | 'GROWTH_LIMIT' | 'SEASONAL_ADJUSTMENT' | 'CUSTOM'
  condition: string
  action: string
  priority: number
  enabled: boolean
}

export interface EconomicIndicators {
  gdpGrowth?: number
  inflation?: number
  interestRates?: number
  unemployment?: number
  consumerConfidence?: number
  businessSentiment?: number
}

export interface BusinessContext {
  fiscalYear: {
    start: Date
    end: Date
  }
  businessCycle: 'GROWTH' | 'MATURITY' | 'DECLINE' | 'RECOVERY'
  strategicInitiatives: string[]
  marketPosition: 'LEADER' | 'CHALLENGER' | 'FOLLOWER' | 'NICHE'
  competitiveAdvantages: string[]
}

export interface MarketConditions {
  marketSize: number
  marketGrowthRate: number
  competitorCount: number
  marketConcentration: 'HIGH' | 'MEDIUM' | 'LOW'
  barriers: string[]
  opportunities: string[]
  threats: string[]
}

export interface HistoricalPatterns {
  seasonality: {
    detected: boolean
    strength: number
    period: string
    peaks: string[]
    troughs: string[]
  }
  trends: {
    longTerm: 'INCREASING' | 'DECREASING' | 'STABLE'
    shortTerm: 'INCREASING' | 'DECREASING' | 'STABLE'
    changePoints: Date[]
  }
  volatility: {
    level: 'HIGH' | 'MEDIUM' | 'LOW'
    periods: Date[]
  }
  cyclical: {
    detected: boolean
    period: number
    amplitude: number
  }
}

export interface ForecastResult {
  requestId: string
  forecastId: string
  targetMetric: string
  forecastType: string
  predictions: ForecastPrediction[]
  modelPerformance: ModelPerformance
  insights: ForecastInsight[]
  recommendations: ForecastRecommendation[]
  scenarios: ScenarioAnalysis[]
  confidenceMetrics: ConfidenceMetrics
  riskAssessment: RiskAssessment
  executiveSummary: {
    keyPredictions: string[]
    confidenceLevel: string
    criticalInsights: string[]
    actionPriorities: string[]
    riskFactors: string[]
  }
  forecastMetadata: {
    modelUsed: string[]
    dataQuality: number
    forecastReliability: number
    processedDataPoints: number
    forecastAccuracy: number
    processingTime: number
    lastUpdated: Date
    nextUpdateDue: Date
  }
}

export interface ForecastPrediction {
  period: Date
  predictedValue: number
  confidenceInterval: {
    lower: number
    upper: number
    confidence: number
  }
  contributing_factors: {
    trend: number
    seasonality: number
    externalFactors: number
    randomVariation: number
  }
  qualitativeFactors: {
    businessEvents: string[]
    marketConditions: string[]
    assumptions: string[]
  }
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reliability: number
}

export interface ModelPerformance {
  algorithm: string
  accuracy: {
    mape: number // Mean Absolute Percentage Error
    mae: number  // Mean Absolute Error
    rmse: number // Root Mean Square Error
    r2: number   // R-squared
  }
  backtestResults: {
    periods: number
    averageError: number
    maxError: number
    consistency: number
  }
  validationMetrics: {
    crossValidationScore: number
    outOfSampleAccuracy: number
    residualAnalysis: string
  }
  algorithmComparison: {
    bestPerforming: string
    ensembleWeight: Record<string, number>
    improvementOverBaseline: number
  }
}

export interface ForecastInsight {
  id: string
  type: 'TREND' | 'SEASONALITY' | 'CYCLICAL' | 'ANOMALY' | 'INFLECTION_POINT' | 'EXTERNAL_IMPACT'
  title: string
  description: string
  significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: number
  timeframe: {
    start: Date
    end: Date
    duration: string
  }
  impact: {
    direction: 'POSITIVE' | 'NEGATIVE' | 'MIXED'
    magnitude: 'SMALL' | 'MODERATE' | 'LARGE' | 'EXTREME'
    businessImplication: string
    financialImpact?: {
      amount: number
      currency: string
      probability: number
    }
  }
  evidence: {
    dataPoints: DataPoint[]
    statisticalSignificance: number
    supportingAnalysis: string[]
  }
  actionability: {
    isActionable: boolean
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'IMMEDIATE'
    suggestedActions: string[]
    timeline: string
  }
}

export interface ForecastRecommendation {
  id: string
  type: 'STRATEGIC' | 'OPERATIONAL' | 'TACTICAL' | 'MONITORING' | 'RISK_MITIGATION'
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  rationale: string
  expectedOutcome: string
  implementationPlan: {
    timeline: string
    effort: 'LOW' | 'MEDIUM' | 'HIGH'
    cost: 'LOW' | 'MEDIUM' | 'HIGH'
    resources: string[]
    dependencies: string[]
    milestones: string[]
  }
  successMetrics: {
    kpis: string[]
    targets: Record<string, number>
    monitoringFrequency: string
  }
  riskMitigation: {
    identifiedRisks: string[]
    mitigationStrategies: string[]
    contingencyPlans: string[]
  }
}

export interface ScenarioAnalysis {
  name: string
  description: string
  probability: number
  assumptions: string[]
  predictions: ForecastPrediction[]
  impact: {
    revenueImpact: number
    operationalImpact: string
    strategicImplication: string
  }
  triggers: {
    leadingIndicators: string[]
    warningSignals: string[]
    monitoringPoints: string[]
  }
}

export interface ConfidenceMetrics {
  overallConfidence: number
  temporalConfidence: {
    nearTerm: number    // 0-3 months
    mediumTerm: number  // 3-12 months
    longTerm: number    // 12+ months
  }
  factorContribution: {
    historicalData: number
    trendAnalysis: number
    seasonalPatterns: number
    externalFactors: number
    businessIntelligence: number
  }
  uncertaintyFactors: {
    dataQuality: number
    modelComplexity: number
    externalVolatility: number
    businessChanges: number
  }
}

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskFactors: RiskFactor[]
  sensitivityAnalysis: SensitivityResult[]
  monteCarloResults?: {
    simulations: number
    confidenceIntervals: Record<number, { lower: number; upper: number }>
    worstCase: number
    bestCase: number
    mostLikely: number
  }
  earlyWarningIndicators: EarlyWarning[]
}

export interface RiskFactor {
  name: string
  type: 'DATA' | 'MODEL' | 'MARKET' | 'BUSINESS' | 'EXTERNAL'
  probability: number
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  mitigation: string[]
  monitoring: string[]
}

export interface SensitivityResult {
  variable: string
  impactOnForecast: number
  criticalThresholds: number[]
  elasticity: number
  businessRelevance: string
}

export interface EarlyWarning {
  indicator: string
  currentValue: number
  thresholds: {
    yellow: number
    red: number
  }
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING'
  actionRequired: boolean
  recommendedResponse: string[]
}

export interface ForecastModel {
  id: string
  name: string
  type: string
  version: string
  trainedAt: Date
  performance: ModelPerformance
  parameters: Record<string, any>
  isActive: boolean
}

export interface ModelCalibration {
  recalibrationNeeded: boolean
  lastCalibration: Date
  nextCalibration: Date
  performanceDrift: number
  calibrationTriggers: string[]
  recommendedActions: string[]
}

// Main service class
export class PredictiveForecastingService {
  private models: Map<string, ForecastModel> = new Map()
  private forecastCache: Map<string, ForecastResult> = new Map()

  constructor() {
    this.initializeForecastingModels()
  }

  /**
   * Generate comprehensive predictive forecast
   */
  async generateForecast(request: ForecastRequest): Promise<ForecastResult> {
    const startTime = Date.now()
    logger.info('Starting predictive forecast generation', { 
      requestId: request.id, 
      forecastType: request.forecastType,
      targetMetric: request.targetMetric,
      periods: request.forecastHorizon.periods
    })

    try {
      // Validate request
      this.validateForecastRequest(request)

      // Check cache first
      const cacheKey = this.generateCacheKey(request)
      const cachedResult = this.forecastCache.get(cacheKey)
      if (cachedResult && this.isCacheValid(cachedResult)) {
        logger.info('Returning cached forecast result', { requestId: request.id })
        return cachedResult
      }

      // Prepare and analyze historical data
      const preparedData = await this.prepareHistoricalData(request.historicalData, request)

      // Detect patterns and seasonality
      const patterns = await this.analyzeHistoricalPatterns(preparedData, request)

      // Select and configure forecasting models
      const selectedModels = this.selectForecastingModels(request, patterns)

      // Generate base predictions using multiple algorithms
      const predictions = await this.generatePredictions(preparedData, selectedModels, request)

      // Apply business rules and constraints
      const adjustedPredictions = this.applyBusinessRules(predictions, request)

      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(
        adjustedPredictions, 
        patterns, 
        request
      )

      // Generate insights from forecast
      const insights = await this.generateForecastInsights(
        adjustedPredictions, 
        patterns, 
        request
      )

      // Create scenario analyses
      const scenarios = await this.generateScenarioAnalysis(
        adjustedPredictions, 
        request,
        insights
      )

      // Assess forecast risks
      const riskAssessment = await this.assessForecastRisks(
        adjustedPredictions, 
        patterns, 
        request
      )

      // Generate actionable recommendations
      const recommendations = await this.generateForecastRecommendations(
        adjustedPredictions,
        insights,
        scenarios,
        request
      )

      // Evaluate model performance
      const modelPerformance = await this.evaluateModelPerformance(
        selectedModels,
        preparedData,
        request
      )

      // Calculate overall confidence metrics
      const confidenceMetrics = this.calculateConfidenceMetrics(
        predictions,
        patterns,
        modelPerformance,
        request
      )

      // Generate executive summary
      const executiveSummary = await this.generateExecutiveSummary(
        adjustedPredictions,
        insights,
        recommendations,
        confidenceMetrics,
        request
      )

      const processingTime = Date.now() - startTime

      const result: ForecastResult = {
        requestId: request.id,
        forecastId: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetMetric: request.targetMetric,
        forecastType: request.forecastType,
        predictions: adjustedPredictions,
        modelPerformance,
        insights,
        recommendations,
        scenarios,
        confidenceMetrics,
        riskAssessment,
        executiveSummary,
        forecastMetadata: {
          modelUsed: selectedModels.map(m => m.name),
          dataQuality: this.calculateDataQuality(preparedData),
          forecastReliability: confidenceMetrics.overallConfidence,
          processedDataPoints: preparedData.length,
          forecastAccuracy: modelPerformance.accuracy.mape,
          processingTime,
          lastUpdated: new Date(),
          nextUpdateDue: this.calculateNextUpdateDate(request)
        }
      }

      // Cache the result
      this.forecastCache.set(cacheKey, result)

      logger.info('Predictive forecast generated successfully', {
        requestId: request.id,
        forecastId: result.forecastId,
        predictionsGenerated: result.predictions.length,
        insightsGenerated: result.insights.length,
        overallConfidence: result.confidenceMetrics.overallConfidence,
        processingTime
      })

      return result

    } catch (error) {
      logger.error('Predictive forecast generation failed', { 
        requestId: request.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Calibrate and update forecasting models
   */
  async calibrateModels(organizationId: string): Promise<ModelCalibration> {
    logger.info('Starting model calibration', { organizationId })

    try {
      const calibrationResults: ModelCalibration = {
        recalibrationNeeded: false,
        lastCalibration: new Date(),
        nextCalibration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        performanceDrift: 0,
        calibrationTriggers: [],
        recommendedActions: []
      }

      // Check each model for performance drift
      for (const [modelId, model] of this.models) {
        const performanceDrift = await this.detectPerformanceDrift(model)
        
        if (performanceDrift > 0.1) { // 10% drift threshold
          calibrationResults.recalibrationNeeded = true
          calibrationResults.performanceDrift = Math.max(
            calibrationResults.performanceDrift, 
            performanceDrift
          )
          calibrationResults.calibrationTriggers.push(
            `${model.name} shows ${(performanceDrift * 100).toFixed(1)}% performance drift`
          )
        }
      }

      // Generate recommendations based on calibration needs
      if (calibrationResults.recalibrationNeeded) {
        calibrationResults.recommendedActions.push(
          'Retrain models with recent data',
          'Update feature engineering pipeline',
          'Review and adjust hyperparameters',
          'Validate model assumptions against current market conditions'
        )
      } else {
        calibrationResults.recommendedActions.push(
          'Continue monitoring model performance',
          'Schedule next calibration check in 30 days'
        )
      }

      return calibrationResults

    } catch (error) {
      logger.error('Model calibration failed', { organizationId, error })
      throw error
    }
  }

  /**
   * Get available forecasting capabilities and supported metrics
   */
  async getForecastingCapabilities(): Promise<{
    supportedMetrics: string[]
    forecastTypes: string[]
    algorithms: ForecastAlgorithm[]
    maxHorizon: Record<string, number>
    minimumDataPoints: Record<string, number>
    supportedFrequencies: string[]
  }> {
    return {
      supportedMetrics: [
        'revenue',
        'client_demand',
        'team_utilization',
        'task_completion',
        'client_satisfaction',
        'profit_margin',
        'cash_flow',
        'new_client_acquisition',
        'employee_retention',
        'compliance_score'
      ],
      forecastTypes: [
        'REVENUE',
        'DEMAND', 
        'CAPACITY',
        'CHURN',
        'UTILIZATION',
        'CUSTOM'
      ],
      algorithms: [
        { name: 'LINEAR_REGRESSION', weight: 0.2, enabled: true, parameters: {} },
        { name: 'ARIMA', weight: 0.25, enabled: true, parameters: { p: 2, d: 1, q: 2 } },
        { name: 'EXPONENTIAL_SMOOTHING', weight: 0.25, enabled: true, parameters: { alpha: 0.3, beta: 0.3, gamma: 0.3 } },
        { name: 'PROPHET', weight: 0.3, enabled: true, parameters: { changepoint_prior_scale: 0.05 } }
      ],
      maxHorizon: {
        DAY: 365,
        WEEK: 104,
        MONTH: 36,
        QUARTER: 12,
        YEAR: 5
      },
      minimumDataPoints: {
        DAY: 90,
        WEEK: 26,
        MONTH: 12,
        QUARTER: 8,
        YEAR: 3
      },
      supportedFrequencies: [
        'DAY',
        'WEEK', 
        'MONTH',
        'QUARTER',
        'YEAR'
      ]
    }
  }

  // Private helper methods

  private initializeForecastingModels(): void {
    // Initialize built-in forecasting models for CA firms
    const models = [
      {
        id: 'revenue_arima',
        name: 'Revenue ARIMA Model',
        type: 'ARIMA',
        version: '1.0',
        trainedAt: new Date(),
        performance: this.createMockPerformance('ARIMA', 0.15),
        parameters: { p: 2, d: 1, q: 2, seasonal: true },
        isActive: true
      },
      {
        id: 'utilization_prophet',
        name: 'Team Utilization Prophet Model',
        type: 'PROPHET',
        version: '1.0', 
        trainedAt: new Date(),
        performance: this.createMockPerformance('PROPHET', 0.12),
        parameters: { changepoint_prior_scale: 0.05, seasonality_mode: 'additive' },
        isActive: true
      },
      {
        id: 'demand_ensemble',
        name: 'Client Demand Ensemble Model',
        type: 'ENSEMBLE',
        version: '1.0',
        trainedAt: new Date(),
        performance: this.createMockPerformance('ENSEMBLE', 0.10),
        parameters: { algorithms: ['ARIMA', 'PROPHET', 'EXPONENTIAL_SMOOTHING'] },
        isActive: true
      }
    ]

    models.forEach(model => {
      this.models.set(model.id, model)
    })

    logger.info(`Initialized ${models.length} forecasting models`)
  }

  private createMockPerformance(algorithm: string, mape: number): ModelPerformance {
    return {
      algorithm,
      accuracy: {
        mape,
        mae: mape * 1000,
        rmse: mape * 1200,
        r2: 1 - (mape * 2)
      },
      backtestResults: {
        periods: 12,
        averageError: mape,
        maxError: mape * 3,
        consistency: 1 - (mape / 2)
      },
      validationMetrics: {
        crossValidationScore: 1 - mape,
        outOfSampleAccuracy: 1 - (mape * 1.2),
        residualAnalysis: 'Normal distribution with minimal autocorrelation'
      },
      algorithmComparison: {
        bestPerforming: algorithm,
        ensembleWeight: { [algorithm]: 1.0 },
        improvementOverBaseline: 0.25
      }
    }
  }

  private validateForecastRequest(request: ForecastRequest): void {
    if (!request.targetMetric) {
      throw new Error('Target metric is required')
    }
    if (!request.historicalData || request.historicalData.length < 3) {
      throw new Error('At least 3 historical data points are required')
    }
    if (request.forecastHorizon.periods <= 0) {
      throw new Error('Forecast horizon must be positive')
    }
    if (!request.organizationId) {
      throw new Error('Organization ID is required')
    }
  }

  private generateCacheKey(request: ForecastRequest): string {
    const keyData = {
      targetMetric: request.targetMetric,
      forecastType: request.forecastType,
      organizationId: request.organizationId,
      dataHash: this.hashHistoricalData(request.historicalData),
      horizon: request.forecastHorizon
    }
    return `forecast_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`
  }

  private isCacheValid(cachedResult: ForecastResult): boolean {
    const cacheAge = Date.now() - cachedResult.forecastMetadata.lastUpdated.getTime()
    const maxCacheAge = 24 * 60 * 60 * 1000 // 24 hours
    return cacheAge < maxCacheAge
  }

  private hashHistoricalData(data: DataPoint[]): string {
    const dataString = data.map(d => `${d.timestamp.toISOString()}_${d.value}`).join('|')
    return Buffer.from(dataString).toString('base64').substring(0, 16)
  }

  private async prepareHistoricalData(data: DataPoint[], request: ForecastRequest): Promise<DataPoint[]> {
    // Sort by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Remove outliers (simple IQR method)
    const values = sortedData.map(d => d.value)
    const q1 = this.percentile(values, 0.25)
    const q3 = this.percentile(values, 0.75)
    const iqr = q3 - q1
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr

    // Filter extreme outliers but keep moderate ones for business context
    const filteredData = sortedData.filter(d => d.value >= lowerBound && d.value <= upperBound)

    // Fill missing values if needed
    const filledData = this.fillMissingValues(filteredData, request.forecastHorizon.unit)

    return filledData
  }

  private percentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const index = percentile * (sorted.length - 1)
    const floor = Math.floor(index)
    const ceil = Math.ceil(index)
    
    if (floor === ceil) {
      return sorted[floor]
    }
    
    const lower = sorted[floor]
    const upper = sorted[ceil]
    return lower + (upper - lower) * (index - floor)
  }

  private fillMissingValues(data: DataPoint[], unit: string): DataPoint[] {
    // Simple forward fill for missing values
    const filled = [...data]
    
    for (let i = 1; i < filled.length; i++) {
      const prev = filled[i - 1]
      const curr = filled[i]
      
      // If there's a significant gap, interpolate
      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime()
      const expectedInterval = this.getExpectedInterval(unit)
      
      if (timeDiff > expectedInterval * 1.5) {
        // Add interpolated point
        const interpolatedValue = (prev.value + curr.value) / 2
        const interpolatedTime = new Date((prev.timestamp.getTime() + curr.timestamp.getTime()) / 2)
        
        filled.splice(i, 0, {
          timestamp: interpolatedTime,
          value: interpolatedValue,
          metadata: { source: 'INTERPOLATED', confidence: 0.7 }
        })
      }
    }
    
    return filled
  }

  private getExpectedInterval(unit: string): number {
    switch (unit) {
      case 'DAY': return 24 * 60 * 60 * 1000
      case 'WEEK': return 7 * 24 * 60 * 60 * 1000
      case 'MONTH': return 30 * 24 * 60 * 60 * 1000
      case 'QUARTER': return 90 * 24 * 60 * 60 * 1000
      case 'YEAR': return 365 * 24 * 60 * 60 * 1000
      default: return 24 * 60 * 60 * 1000
    }
  }

  private async analyzeHistoricalPatterns(data: DataPoint[], request: ForecastRequest): Promise<HistoricalPatterns> {
    const values = data.map(d => d.value)
    
    // Detect trend
    const trendAnalysis = this.detectTrend(values)
    
    // Detect seasonality
    const seasonalityAnalysis = this.detectSeasonality(data, request.forecastHorizon.unit)
    
    // Calculate volatility
    const volatilityAnalysis = this.calculateVolatility(values)
    
    // Detect cyclical patterns
    const cyclicalAnalysis = this.detectCyclicalPatterns(data)

    return {
      seasonality: seasonalityAnalysis,
      trends: trendAnalysis,
      volatility: volatilityAnalysis,
      cyclical: cyclicalAnalysis
    }
  }

  private detectTrend(values: number[]): HistoricalPatterns['trends'] {
    if (values.length < 3) {
      return {
        longTerm: 'STABLE',
        shortTerm: 'STABLE',
        changePoints: []
      }
    }

    // Simple linear regression for trend detection
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    // Classify trend based on slope
    const longTerm = slope > 0.1 ? 'INCREASING' : slope < -0.1 ? 'DECREASING' : 'STABLE'
    
    // Short-term trend (last quarter of data)
    const shortTermStart = Math.floor(n * 0.75)
    const shortTermValues = values.slice(shortTermStart)
    const shortTermSlope = shortTermValues.length > 1 ? 
      (shortTermValues[shortTermValues.length - 1] - shortTermValues[0]) / shortTermValues.length : 0
    const shortTerm = shortTermSlope > 0.1 ? 'INCREASING' : shortTermSlope < -0.1 ? 'DECREASING' : 'STABLE'

    return {
      longTerm,
      shortTerm,
      changePoints: this.detectChangePoints(values)
    }
  }

  private detectChangePoints(values: number[]): Date[] {
    // Simple change point detection using moving averages
    const changePoints: Date[] = []
    const windowSize = Math.max(3, Math.floor(values.length / 10))
    
    for (let i = windowSize; i < values.length - windowSize; i++) {
      const leftMean = values.slice(i - windowSize, i).reduce((a, b) => a + b, 0) / windowSize
      const rightMean = values.slice(i, i + windowSize).reduce((a, b) => a + b, 0) / windowSize
      
      if (Math.abs(rightMean - leftMean) / leftMean > 0.2) { // 20% change threshold
        changePoints.push(new Date(Date.now() - (values.length - i) * 24 * 60 * 60 * 1000))
      }
    }
    
    return changePoints
  }

  private detectSeasonality(data: DataPoint[], unit: string): HistoricalPatterns['seasonality'] {
    if (data.length < 12) {
      return {
        detected: false,
        strength: 0,
        period: 'NONE',
        peaks: [],
        troughs: []
      }
    }

    // Simple seasonality detection based on data frequency
    const values = data.map(d => d.value)
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length
    
    // Calculate seasonal strength (simplified)
    let seasonalStrength = 0
    let period = 'MONTHLY'
    
    if (unit === 'MONTH' && data.length >= 24) {
      // Check for annual seasonality in monthly data
      const monthlyAverages = Array(12).fill(0)
      const monthCounts = Array(12).fill(0)
      
      data.forEach(point => {
        const month = point.timestamp.getMonth()
        monthlyAverages[month] += point.value
        monthCounts[month]++
      })
      
      // Calculate average for each month
      monthlyAverages.forEach((sum, i) => {
        if (monthCounts[i] > 0) {
          monthlyAverages[i] = sum / monthCounts[i]
        }
      })
      
      // Calculate seasonal strength
      const monthlyVariance = monthlyAverages.reduce((sum, val) => 
        sum + Math.pow(val - avgValue, 2), 0) / 12
      const totalVariance = values.reduce((sum, val) => 
        sum + Math.pow(val - avgValue, 2), 0) / values.length
      
      seasonalStrength = totalVariance > 0 ? monthlyVariance / totalVariance : 0
      period = 'YEARLY'
    }

    return {
      detected: seasonalStrength > 0.1,
      strength: Math.min(seasonalStrength, 1),
      period,
      peaks: seasonalStrength > 0.1 ? ['Q1', 'Q4'] : [],
      troughs: seasonalStrength > 0.1 ? ['Q2', 'Q3'] : []
    }
  }

  private calculateVolatility(values: number[]): HistoricalPatterns['volatility'] {
    if (values.length < 2) {
      return { level: 'LOW', periods: [] }
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = standardDeviation / mean

    let level: 'HIGH' | 'MEDIUM' | 'LOW'
    if (coefficientOfVariation > 0.3) level = 'HIGH'
    else if (coefficientOfVariation > 0.1) level = 'MEDIUM'
    else level = 'LOW'

    // Identify high volatility periods (periods with values > 2 standard deviations from mean)
    const volatilePeriods: Date[] = []
    values.forEach((value, index) => {
      if (Math.abs(value - mean) > 2 * standardDeviation) {
        volatilePeriods.push(new Date(Date.now() - (values.length - index) * 24 * 60 * 60 * 1000))
      }
    })

    return { level, periods: volatilePeriods }
  }

  private detectCyclicalPatterns(data: DataPoint[]): HistoricalPatterns['cyclical'] {
    if (data.length < 20) {
      return { detected: false, period: 0, amplitude: 0 }
    }

    // Simple cyclical detection using autocorrelation
    const values = data.map(d => d.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    
    let maxCorrelation = 0
    let bestPeriod = 0
    
    // Check for cycles between 4 and length/4 periods
    for (let period = 4; period < values.length / 4; period++) {
      let correlation = 0
      let count = 0
      
      for (let i = 0; i < values.length - period; i++) {
        correlation += (values[i] - mean) * (values[i + period] - mean)
        count++
      }
      
      if (count > 0) {
        correlation /= count
        if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
          maxCorrelation = correlation
          bestPeriod = period
        }
      }
    }

    const detected = Math.abs(maxCorrelation) > 0.3 // Threshold for significant cyclical pattern
    const amplitude = detected ? Math.abs(maxCorrelation) : 0

    return { detected, period: bestPeriod, amplitude }
  }

  private selectForecastingModels(
    request: ForecastRequest, 
    patterns: HistoricalPatterns
  ): ForecastModel[] {
    const availableModels = Array.from(this.models.values()).filter(m => m.isActive)
    
    // Select models based on patterns and request characteristics
    const selectedModels: ForecastModel[] = []
    
    // If seasonal patterns detected, prefer Prophet or ARIMA with seasonal components
    if (patterns.seasonality.detected) {
      const prophet = availableModels.find(m => m.type === 'PROPHET')
      if (prophet) selectedModels.push(prophet)
      
      const seasonalARIMA = availableModels.find(m => 
        m.type === 'ARIMA' && m.parameters.seasonal
      )
      if (seasonalARIMA) selectedModels.push(seasonalARIMA)
    }
    
    // If strong trend, prefer trend-capturing models
    if (patterns.trends.longTerm !== 'STABLE') {
      const trendModels = availableModels.filter(m => 
        ['PROPHET', 'LINEAR_REGRESSION'].includes(m.type)
      )
      selectedModels.push(...trendModels)
    }
    
    // Always include ensemble if available
    const ensemble = availableModels.find(m => m.type === 'ENSEMBLE')
    if (ensemble) selectedModels.push(ensemble)
    
    // If no specific models selected, use default set
    if (selectedModels.length === 0) {
      selectedModels.push(...availableModels.slice(0, 3))
    }
    
    return [...new Set(selectedModels)] // Remove duplicates
  }

  private async generatePredictions(
    data: DataPoint[],
    models: ForecastModel[],
    request: ForecastRequest
  ): Promise<ForecastPrediction[]> {
    const predictions: ForecastPrediction[] = []
    
    // Generate predictions for each period in the forecast horizon
    for (let i = 0; i < request.forecastHorizon.periods; i++) {
      const predictionDate = this.calculatePredictionDate(data, i, request.forecastHorizon.unit)
      
      // Generate predictions from each model
      const modelPredictions = await Promise.all(
        models.map(model => this.generateSinglePrediction(data, model, predictionDate, request))
      )
      
      // Combine predictions (ensemble approach)
      const combinedPrediction = this.combineModelPredictions(modelPredictions, models)
      
      predictions.push({
        period: predictionDate,
        predictedValue: combinedPrediction.value,
        confidenceInterval: combinedPrediction.confidenceInterval,
        contributing_factors: combinedPrediction.factors,
        qualitativeFactors: {
          businessEvents: [],
          marketConditions: [],
          assumptions: ['Historical patterns continue', 'No major market disruptions']
        },
        riskLevel: this.assessPredictionRisk(combinedPrediction.value, data, request),
        reliability: combinedPrediction.reliability
      })
    }
    
    return predictions
  }

  private calculatePredictionDate(data: DataPoint[], periodOffset: number, unit: string): Date {
    const lastDate = data[data.length - 1].timestamp
    const interval = this.getExpectedInterval(unit)
    return new Date(lastDate.getTime() + (periodOffset + 1) * interval)
  }

  private async generateSinglePrediction(
    data: DataPoint[],
    model: ForecastModel,
    targetDate: Date,
    request: ForecastRequest
  ): Promise<{ value: number; confidence: number }> {
    // Simplified prediction generation - in production would use actual ML models
    const values = data.map(d => d.value)
    const lastValue = values[values.length - 1]
    
    switch (model.type) {
      case 'LINEAR_REGRESSION':
        return this.linearRegressionPredict(values, targetDate, data[data.length - 1].timestamp)
      
      case 'ARIMA':
        return this.arimaPredict(values, model.parameters)
      
      case 'PROPHET':
        return this.prophetPredict(data, targetDate, model.parameters)
      
      case 'EXPONENTIAL_SMOOTHING':
        return this.exponentialSmoothingPredict(values, model.parameters)
      
      case 'ENSEMBLE':
        return this.ensemblePredict(data, targetDate, request)
      
      default:
        return { value: lastValue * (1 + (Math.random() - 0.5) * 0.1), confidence: 0.7 }
    }
  }

  private linearRegressionPredict(values: number[], targetDate: Date, lastDate: Date): { value: number; confidence: number } {
    if (values.length < 2) return { value: values[0] || 0, confidence: 0.5 }
    
    // Simple linear trend extrapolation
    const n = values.length
    const x = Array.from({ length: n }, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    const nextX = n // Next time point
    const predictedValue = intercept + slope * nextX
    
    // Calculate confidence based on R-squared
    const yMean = sumY / n
    const ssRes = values.reduce((sum, yi, i) => {
      const predicted = intercept + slope * x[i]
      return sum + Math.pow(yi - predicted, 2)
    }, 0)
    const ssTot = values.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const rSquared = 1 - (ssRes / ssTot)
    
    return { value: Math.max(0, predictedValue), confidence: Math.max(0.3, rSquared) }
  }

  private arimaPredict(values: number[], parameters: any): { value: number; confidence: number } {
    // Simplified ARIMA prediction - in production would use proper ARIMA implementation
    const { p = 1, d = 1, q = 1 } = parameters
    
    // Apply differencing
    let diffValues = [...values]
    for (let i = 0; i < d; i++) {
      diffValues = diffValues.slice(1).map((val, idx) => val - diffValues[idx])
    }
    
    if (diffValues.length === 0) return { value: values[values.length - 1] || 0, confidence: 0.5 }
    
    // Simple autoregressive prediction
    const lastValues = diffValues.slice(-p)
    const prediction = lastValues.reduce((sum, val, idx) => 
      sum + val * (0.5 + 0.3 * idx / p), 0) / p
    
    // Add back the differenced values
    let finalPrediction = prediction
    if (d > 0) {
      finalPrediction += values[values.length - 1]
    }
    
    return { value: Math.max(0, finalPrediction), confidence: 0.75 }
  }

  private prophetPredict(data: DataPoint[], targetDate: Date, parameters: any): { value: number; confidence: number } {
    // Simplified Prophet-like prediction with trend and seasonality
    const values = data.map(d => d.value)
    const timestamps = data.map(d => d.timestamp.getTime())
    
    // Linear trend
    const trendPrediction = this.linearRegressionPredict(values, targetDate, data[data.length - 1].timestamp)
    
    // Add seasonal component (simplified)
    const targetMonth = targetDate.getMonth()
    const seasonalMultiplier = 1 + 0.1 * Math.sin(2 * Math.PI * targetMonth / 12)
    
    const finalValue = trendPrediction.value * seasonalMultiplier
    
    return { value: Math.max(0, finalValue), confidence: 0.8 }
  }

  private exponentialSmoothingPredict(values: number[], parameters: any): { value: number; confidence: number } {
    const { alpha = 0.3 } = parameters
    
    if (values.length === 0) return { value: 0, confidence: 0.5 }
    
    // Simple exponential smoothing
    let smoothedValue = values[0]
    for (let i = 1; i < values.length; i++) {
      smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue
    }
    
    return { value: Math.max(0, smoothedValue), confidence: 0.7 }
  }

  private ensemblePredict(data: DataPoint[], targetDate: Date, request: ForecastRequest): { value: number; confidence: number } {
    // Simple ensemble - average of available methods
    const methods = [
      this.linearRegressionPredict(data.map(d => d.value), targetDate, data[data.length - 1].timestamp),
      this.arimaPredict(data.map(d => d.value), { p: 1, d: 1, q: 1 }),
      this.exponentialSmoothingPredict(data.map(d => d.value), { alpha: 0.3 })
    ]
    
    const avgValue = methods.reduce((sum, pred) => sum + pred.value, 0) / methods.length
    const avgConfidence = methods.reduce((sum, pred) => sum + pred.confidence, 0) / methods.length
    
    return { value: Math.max(0, avgValue), confidence: Math.min(0.9, avgConfidence + 0.1) }
  }

  private combineModelPredictions(
    predictions: { value: number; confidence: number }[],
    models: ForecastModel[]
  ): {
    value: number
    confidenceInterval: { lower: number; upper: number; confidence: number }
    factors: { trend: number; seasonality: number; externalFactors: number; randomVariation: number }
    reliability: number
  } {
    if (predictions.length === 0) {
      return {
        value: 0,
        confidenceInterval: { lower: 0, upper: 0, confidence: 0.5 },
        factors: { trend: 0.4, seasonality: 0.2, externalFactors: 0.1, randomVariation: 0.3 },
        reliability: 0.5
      }
    }

    // Weighted average based on model performance
    const totalWeight = models.reduce((sum, model) => sum + (1 - model.performance.accuracy.mape), 0)
    let weightedValue = 0
    let weightedConfidence = 0

    predictions.forEach((pred, index) => {
      const weight = (1 - models[index].performance.accuracy.mape) / totalWeight
      weightedValue += pred.value * weight
      weightedConfidence += pred.confidence * weight
    })

    // Calculate confidence intervals (simplified)
    const standardError = Math.sqrt(predictions.reduce((sum, pred) => 
      sum + Math.pow(pred.value - weightedValue, 2), 0) / predictions.length)
    
    const confidenceInterval = {
      lower: Math.max(0, weightedValue - 1.96 * standardError),
      upper: weightedValue + 1.96 * standardError,
      confidence: 0.95
    }

    return {
      value: Math.max(0, weightedValue),
      confidenceInterval,
      factors: {
        trend: 0.4,
        seasonality: 0.25,
        externalFactors: 0.15,
        randomVariation: 0.2
      },
      reliability: Math.min(0.95, weightedConfidence)
    }
  }

  private assessPredictionRisk(
    predictedValue: number, 
    historicalData: DataPoint[], 
    request: ForecastRequest
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const historicalValues = historicalData.map(d => d.value)
    const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length
    const stdDev = Math.sqrt(
      historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length
    )

    const zScore = Math.abs((predictedValue - mean) / stdDev)

    if (zScore > 3) return 'CRITICAL'
    if (zScore > 2) return 'HIGH'
    if (zScore > 1) return 'MEDIUM'
    return 'LOW'
  }

  private applyBusinessRules(
    predictions: ForecastPrediction[], 
    request: ForecastRequest
  ): ForecastPrediction[] {
    if (!request.modelConfiguration.businessRules) return predictions

    return predictions.map(prediction => {
      let adjustedValue = prediction.predictedValue

      for (const rule of request.modelConfiguration.businessRules) {
        if (!rule.enabled) continue

        switch (rule.type) {
          case 'MIN_VALUE':
            const minValue = parseFloat(rule.condition)
            if (adjustedValue < minValue) {
              adjustedValue = minValue
            }
            break

          case 'MAX_VALUE':
            const maxValue = parseFloat(rule.condition)
            if (adjustedValue > maxValue) {
              adjustedValue = maxValue
            }
            break

          case 'GROWTH_LIMIT':
            const growthLimit = parseFloat(rule.condition)
            // Apply growth limit logic here
            break
        }
      }

      return {
        ...prediction,
        predictedValue: adjustedValue,
        confidenceInterval: {
          ...prediction.confidenceInterval,
          lower: Math.max(0, prediction.confidenceInterval.lower),
          upper: Math.max(adjustedValue, prediction.confidenceInterval.upper)
        }
      }
    })
  }

  private calculateConfidenceIntervals(
    predictions: ForecastPrediction[], 
    patterns: HistoricalPatterns, 
    request: ForecastRequest
  ): ForecastPrediction[] {
    // Confidence intervals are already calculated in combineModelPredictions
    // This method could enhance them further based on patterns
    return predictions.map((prediction, index) => {
      // Decrease confidence for longer forecast horizons
      const horizonFactor = Math.max(0.3, 1 - (index * 0.05))
      
      // Adjust confidence based on historical volatility
      const volatilityFactor = patterns.volatility.level === 'HIGH' ? 0.8 : 
                              patterns.volatility.level === 'MEDIUM' ? 0.9 : 1.0

      const adjustedConfidence = prediction.confidenceInterval.confidence * horizonFactor * volatilityFactor

      return {
        ...prediction,
        confidenceInterval: {
          ...prediction.confidenceInterval,
          confidence: adjustedConfidence
        },
        reliability: prediction.reliability * horizonFactor * volatilityFactor
      }
    })
  }

  private async generateForecastInsights(
    predictions: ForecastPrediction[], 
    patterns: HistoricalPatterns, 
    request: ForecastRequest
  ): Promise<ForecastInsight[]> {
    const insights: ForecastInsight[] = []

    // Trend insights
    if (patterns.trends.longTerm !== 'STABLE') {
      insights.push({
        id: `trend_insight_${Date.now()}`,
        type: 'TREND',
        title: `${patterns.trends.longTerm.toLowerCase()} trend detected`,
        description: `The forecast shows a ${patterns.trends.longTerm.toLowerCase()} trend in ${request.targetMetric} over the forecast period`,
        significance: patterns.trends.longTerm === 'INCREASING' ? 'HIGH' : 'MEDIUM',
        confidence: 0.8,
        timeframe: {
          start: predictions[0].period,
          end: predictions[predictions.length - 1].period,
          duration: `${request.forecastHorizon.periods} ${request.forecastHorizon.unit.toLowerCase()}s`
        },
        impact: {
          direction: patterns.trends.longTerm === 'INCREASING' ? 'POSITIVE' : 'NEGATIVE',
          magnitude: 'MODERATE',
          businessImplication: `${patterns.trends.longTerm === 'INCREASING' ? 'Growth' : 'Decline'} in ${request.targetMetric} expected`
        },
        evidence: {
          dataPoints: [],
          statisticalSignificance: 0.85,
          supportingAnalysis: ['Historical trend analysis', 'Linear regression modeling']
        },
        actionability: {
          isActionable: true,
          urgency: patterns.trends.longTerm === 'DECREASING' ? 'HIGH' : 'MEDIUM',
          suggestedActions: patterns.trends.longTerm === 'INCREASING' ? 
            ['Plan for capacity expansion', 'Prepare resource allocation'] :
            ['Investigate decline factors', 'Develop improvement strategies'],
          timeline: '1-3 months'
        }
      })
    }

    // Seasonality insights
    if (patterns.seasonality.detected) {
      insights.push({
        id: `seasonality_insight_${Date.now()}`,
        type: 'SEASONALITY',
        title: 'Seasonal patterns identified',
        description: `Strong ${patterns.seasonality.period.toLowerCase()} seasonality detected with ${(patterns.seasonality.strength * 100).toFixed(1)}% strength`,
        significance: patterns.seasonality.strength > 0.3 ? 'HIGH' : 'MEDIUM',
        confidence: patterns.seasonality.strength,
        timeframe: {
          start: predictions[0].period,
          end: predictions[predictions.length - 1].period,
          duration: 'Recurring pattern'
        },
        impact: {
          direction: 'MIXED',
          magnitude: patterns.seasonality.strength > 0.3 ? 'LARGE' : 'MODERATE',
          businessImplication: 'Predictable seasonal variations in performance'
        },
        evidence: {
          dataPoints: [],
          statisticalSignificance: patterns.seasonality.strength,
          supportingAnalysis: ['Seasonal decomposition analysis']
        },
        actionability: {
          isActionable: true,
          urgency: 'MEDIUM',
          suggestedActions: [
            'Plan seasonal resource allocation',
            'Develop seasonal marketing strategies',
            'Prepare for peak/trough periods'
          ],
          timeline: 'Ongoing seasonal planning'
        }
      })
    }

    // Volatility insights
    if (patterns.volatility.level === 'HIGH') {
      insights.push({
        id: `volatility_insight_${Date.now()}`,
        type: 'ANOMALY',
        title: 'High volatility detected',
        description: `${request.targetMetric} shows high volatility, increasing forecast uncertainty`,
        significance: 'HIGH',
        confidence: 0.75,
        timeframe: {
          start: predictions[0].period,
          end: predictions[predictions.length - 1].period,
          duration: 'Ongoing concern'
        },
        impact: {
          direction: 'NEGATIVE',
          magnitude: 'LARGE',
          businessImplication: 'Increased difficulty in planning and resource allocation'
        },
        evidence: {
          dataPoints: [],
          statisticalSignificance: 0.8,
          supportingAnalysis: ['Volatility analysis', 'Standard deviation calculation']
        },
        actionability: {
          isActionable: true,
          urgency: 'HIGH',
          suggestedActions: [
            'Investigate volatility causes',
            'Implement risk management strategies',
            'Consider scenario planning'
          ],
          timeline: 'Immediate attention required'
        }
      })
    }

    // Use AI for additional insights
    try {
      const aiInsights = await this.generateAIForecastInsights(predictions, patterns, request)
      insights.push(...aiInsights)
    } catch (error) {
      logger.warn('AI insight generation failed for forecast', { error })
    }

    return insights.slice(0, 5) // Limit to top 5 insights
  }

  private async generateAIForecastInsights(
    predictions: ForecastPrediction[], 
    patterns: HistoricalPatterns, 
    request: ForecastRequest
  ): Promise<ForecastInsight[]> {
    const predictionSummary = {
      averagePrediction: predictions.reduce((sum, p) => sum + p.predictedValue, 0) / predictions.length,
      trend: patterns.trends.longTerm,
      seasonality: patterns.seasonality.detected,
      volatility: patterns.volatility.level
    }

    const aiPrompt = `
      Analyze this CA firm forecast and provide business insights:
      
      Target Metric: ${request.targetMetric}
      Forecast Type: ${request.forecastType}
      Average Prediction: ${predictionSummary.averagePrediction.toFixed(2)}
      Trend: ${predictionSummary.trend}
      Seasonality: ${predictionSummary.seasonality ? 'Yes' : 'No'}
      Volatility: ${predictionSummary.volatility}
      
      Provide 1-2 key business insights that would be valuable for CA firm management.
      Focus on:
      - Strategic implications
      - Operational considerations
      - Risk factors
      - Opportunities
    `

    const aiResponse = await openaiService.chatWithAssistant(aiPrompt)

    const insights: ForecastInsight[] = []
    
    if (aiResponse.response && aiResponse.response.length > 50) {
      insights.push({
        id: `ai_forecast_insight_${Date.now()}`,
        type: 'EXTERNAL_IMPACT',
        title: 'AI-Generated Strategic Insight',
        description: aiResponse.response.substring(0, 200) + '...',
        significance: 'MEDIUM',
        confidence: aiResponse.confidence || 0.7,
        timeframe: {
          start: predictions[0].period,
          end: predictions[predictions.length - 1].period,
          duration: 'Forecast period'
        },
        impact: {
          direction: 'MIXED',
          magnitude: 'MODERATE',
          businessImplication: 'Strategic considerations for forecast period'
        },
        evidence: {
          dataPoints: [],
          statisticalSignificance: aiResponse.confidence || 0.7,
          supportingAnalysis: ['AI analysis of forecast patterns']
        },
        actionability: {
          isActionable: true,
          urgency: 'MEDIUM',
          suggestedActions: ['Review strategic plan', 'Assess operational readiness'],
          timeline: 'Next planning cycle'
        }
      })
    }

    return insights
  }

  private async generateScenarioAnalysis(
    predictions: ForecastPrediction[], 
    request: ForecastRequest,
    insights: ForecastInsight[]
  ): Promise<ScenarioAnalysis[]> {
    if (!request.preferences.includeScenarioAnalysis) return []

    const scenarios: ScenarioAnalysis[] = []

    // Base scenario (current predictions)
    scenarios.push({
      name: 'Base Case',
      description: 'Most likely scenario based on current trends and patterns',
      probability: 0.6,
      assumptions: [
        'Current trends continue',
        'No major market disruptions',
        'Existing business model unchanged'
      ],
      predictions: predictions,
      impact: {
        revenueImpact: 0,
        operationalImpact: 'Normal operations expected',
        strategicImplication: 'Continue current strategy'
      },
      triggers: {
        leadingIndicators: ['Monthly performance metrics', 'Market indicators'],
        warningSignals: ['Trend deviations', 'External shocks'],
        monitoringPoints: ['Quarterly reviews', 'Market assessments']
      }
    })

    // Optimistic scenario
    const optimisticPredictions = predictions.map(p => ({
      ...p,
      predictedValue: p.predictedValue * 1.2,
      confidenceInterval: {
        ...p.confidenceInterval,
        lower: p.confidenceInterval.lower * 1.1,
        upper: p.confidenceInterval.upper * 1.3
      }
    }))

    scenarios.push({
      name: 'Optimistic Case',
      description: 'Favorable conditions lead to better than expected performance',
      probability: 0.2,
      assumptions: [
        'Market expansion opportunities',
        'Successful strategic initiatives',
        'Improved operational efficiency'
      ],
      predictions: optimisticPredictions,
      impact: {
        revenueImpact: 0.2,
        operationalImpact: 'Capacity constraints possible',
        strategicImplication: 'Accelerate growth investments'
      },
      triggers: {
        leadingIndicators: ['Market growth signals', 'Client acquisition rate'],
        warningSignals: ['Resource constraints', 'Quality concerns'],
        monitoringPoints: ['Monthly growth metrics', 'Capacity utilization']
      }
    })

    // Pessimistic scenario
    const pessimisticPredictions = predictions.map(p => ({
      ...p,
      predictedValue: p.predictedValue * 0.8,
      confidenceInterval: {
        ...p.confidenceInterval,
        lower: p.confidenceInterval.lower * 0.7,
        upper: p.confidenceInterval.upper * 0.9
      }
    }))

    scenarios.push({
      name: 'Pessimistic Case',
      description: 'Challenging conditions lead to underperformance',
      probability: 0.2,
      assumptions: [
        'Economic downturn',
        'Increased competition',
        'Operational challenges'
      ],
      predictions: pessimisticPredictions,
      impact: {
        revenueImpact: -0.2,
        operationalImpact: 'Cost reduction measures needed',
        strategicImplication: 'Focus on efficiency and retention'
      },
      triggers: {
        leadingIndicators: ['Economic indicators', 'Client satisfaction scores'],
        warningSignals: ['Revenue decline', 'Client churn increase'],
        monitoringPoints: ['Weekly performance reviews', 'Cost monitoring']
      }
    })

    return scenarios
  }

  private async assessForecastRisks(
    predictions: ForecastPrediction[], 
    patterns: HistoricalPatterns, 
    request: ForecastRequest
  ): Promise<RiskAssessment> {
    const riskFactors: RiskFactor[] = []

    // Data quality risk
    const dataQuality = this.calculateDataQuality(request.historicalData)
    if (dataQuality < 0.8) {
      riskFactors.push({
        name: 'Data Quality Risk',
        type: 'DATA',
        probability: 1 - dataQuality,
        impact: 'HIGH',
        description: 'Historical data quality may affect forecast accuracy',
        mitigation: ['Improve data collection processes', 'Validate data sources'],
        monitoring: ['Data quality metrics', 'Source verification']
      })
    }

    // Volatility risk
    if (patterns.volatility.level === 'HIGH') {
      riskFactors.push({
        name: 'High Volatility Risk',
        type: 'MARKET',
        probability: 0.7,
        impact: 'HIGH',
        description: 'High historical volatility increases forecast uncertainty',
        mitigation: ['Scenario planning', 'Regular forecast updates'],
        monitoring: ['Volatility metrics', 'Deviation tracking']
      })
    }

    // Model risk
    const modelComplexity = request.modelConfiguration.algorithms.length
    if (modelComplexity > 3) {
      riskFactors.push({
        name: 'Model Complexity Risk',
        type: 'MODEL',
        probability: 0.4,
        impact: 'MEDIUM',
        description: 'Complex models may overfit to historical data',
        mitigation: ['Cross-validation', 'Ensemble methods', 'Regular recalibration'],
        monitoring: ['Model performance metrics', 'Prediction accuracy']
      })
    }

    // External risk
    if (request.contextualData?.market?.threats?.length || 0 > 0) {
      riskFactors.push({
        name: 'External Market Risk',
        type: 'EXTERNAL',
        probability: 0.5,
        impact: 'HIGH',
        description: 'External market factors may disrupt predictions',
        mitigation: ['Market monitoring', 'Contingency planning'],
        monitoring: ['Market indicators', 'Competitor analysis']
      })
    }

    // Calculate overall risk
    const overallRisk = riskFactors.length === 0 ? 'LOW' :
                       riskFactors.filter(r => r.impact === 'HIGH').length > 1 ? 'HIGH' :
                       riskFactors.filter(r => r.impact === 'HIGH').length > 0 ? 'MEDIUM' : 'LOW'

    // Sensitivity analysis
    const sensitivityResults: SensitivityResult[] = [
      {
        variable: 'Historical Trend',
        impactOnForecast: 0.3,
        criticalThresholds: [-0.1, 0.1],
        elasticity: 1.2,
        businessRelevance: 'Core driver of forecast accuracy'
      },
      {
        variable: 'Seasonality Strength',
        impactOnForecast: patterns.seasonality.strength,
        criticalThresholds: [0.1, 0.3],
        elasticity: 0.8,
        businessRelevance: 'Important for resource planning'
      }
    ]

    // Early warning indicators
    const earlyWarnings: EarlyWarning[] = [
      {
        indicator: 'Forecast Accuracy',
        currentValue: 0.85,
        thresholds: { yellow: 0.8, red: 0.7 },
        trend: 'STABLE',
        actionRequired: false,
        recommendedResponse: ['Monitor closely', 'Update if accuracy drops']
      },
      {
        indicator: 'Data Quality Score',
        currentValue: dataQuality,
        thresholds: { yellow: 0.8, red: 0.6 },
        trend: dataQuality > 0.8 ? 'STABLE' : 'DETERIORATING',
        actionRequired: dataQuality < 0.8,
        recommendedResponse: dataQuality < 0.8 ? 
          ['Improve data collection', 'Validate sources'] : 
          ['Maintain current processes']
      }
    ]

    return {
      overallRisk: overallRisk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      riskFactors,
      sensitivityAnalysis: sensitivityResults,
      earlyWarningIndicators: earlyWarnings
    }
  }

  private async generateForecastRecommendations(
    predictions: ForecastPrediction[],
    insights: ForecastInsight[],
    scenarios: ScenarioAnalysis[],
    request: ForecastRequest
  ): Promise<ForecastRecommendation[]> {
    const recommendations: ForecastRecommendation[] = []

    // Strategic recommendations based on trend
    const avgPrediction = predictions.reduce((sum, p) => sum + p.predictedValue, 0) / predictions.length
    const firstPrediction = predictions[0].predictedValue
    const lastPrediction = predictions[predictions.length - 1].predictedValue
    const overallTrend = (lastPrediction - firstPrediction) / firstPrediction

    if (overallTrend > 0.1) {
      recommendations.push({
        id: `growth_strategy_${Date.now()}`,
        type: 'STRATEGIC',
        title: 'Prepare for Growth',
        description: 'Forecast indicates significant growth - prepare for increased demand',
        priority: 'HIGH',
        category: 'Growth Management',
        rationale: `Forecast shows ${(overallTrend * 100).toFixed(1)}% growth over the period`,
        expectedOutcome: 'Better prepared to handle growth without service quality issues',
        implementationPlan: {
          timeline: '3-6 months',
          effort: 'HIGH',
          cost: 'HIGH',
          resources: ['HR team', 'Operations team', 'Finance team'],
          dependencies: ['Budget approval', 'Market analysis'],
          milestones: [
            'Capacity assessment complete',
            'Hiring plan finalized',
            'Resource allocation approved'
          ]
        },
        successMetrics: {
          kpis: ['Team utilization', 'Client satisfaction', 'Revenue per employee'],
          targets: { 'team_utilization': 85, 'client_satisfaction': 4.5 },
          monitoringFrequency: 'Monthly'
        },
        riskMitigation: {
          identifiedRisks: ['Over-hiring', 'Quality degradation', 'Cash flow strain'],
          mitigationStrategies: [
            'Phased hiring approach',
            'Quality monitoring systems',
            'Cash flow forecasting'
          ],
          contingencyPlans: ['Contractor utilization', 'Service prioritization']
        }
      })
    } else if (overallTrend < -0.1) {
      recommendations.push({
        id: `efficiency_focus_${Date.now()}`,
        type: 'OPERATIONAL',
        title: 'Focus on Efficiency',
        description: 'Forecast indicates decline - focus on operational efficiency',
        priority: 'HIGH',
        category: 'Cost Management',
        rationale: `Forecast shows ${Math.abs(overallTrend * 100).toFixed(1)}% decline over the period`,
        expectedOutcome: 'Maintained profitability despite revenue challenges',
        implementationPlan: {
          timeline: '1-3 months',
          effort: 'MEDIUM',
          cost: 'LOW',
          resources: ['Operations team', 'Process improvement team'],
          dependencies: ['Management approval', 'Team cooperation'],
          milestones: [
            'Process analysis complete',
            'Efficiency improvements identified',
            'Implementation plan approved'
          ]
        },
        successMetrics: {
          kpis: ['Cost per delivery', 'Process efficiency', 'Profit margin'],
          targets: { 'profit_margin': 20, 'cost_reduction': 15 },
          monitoringFrequency: 'Weekly'
        },
        riskMitigation: {
          identifiedRisks: ['Team morale impact', 'Quality reduction', 'Client dissatisfaction'],
          mitigationStrategies: [
            'Clear communication',
            'Quality standards maintenance',
            'Client relationship management'
          ],
          contingencyPlans: ['Selective service reduction', 'Strategic partnerships']
        }
      })
    }

    // Monitoring recommendations
    recommendations.push({
      id: `monitoring_system_${Date.now()}`,
      type: 'MONITORING',
      title: 'Implement Forecast Monitoring',
      description: 'Set up systematic monitoring to track forecast accuracy and triggers',
      priority: 'MEDIUM',
      category: 'Performance Management',
      rationale: 'Regular monitoring enables early detection of forecast deviations',
      expectedOutcome: 'Improved forecast accuracy and faster response to changes',
      implementationPlan: {
        timeline: '1-2 months',
        effort: 'LOW',
        cost: 'LOW',
        resources: ['Analytics team', 'IT support'],
        dependencies: ['Data infrastructure', 'Reporting tools'],
        milestones: [
          'Monitoring framework designed',
          'Dashboard implemented',
          'Alert system activated'
        ]
      },
      successMetrics: {
        kpis: ['Forecast accuracy', 'Response time to deviations'],
        targets: { 'forecast_accuracy': 85, 'response_time_hours': 24 },
        monitoringFrequency: 'Weekly'
      },
      riskMitigation: {
        identifiedRisks: ['Information overload', 'False alerts', 'Resource overhead'],
        mitigationStrategies: [
          'Focused KPI selection',
          'Threshold calibration',
          'Automated reporting'
        ],
        contingencyPlans: ['Manual monitoring backup', 'Simplified metrics']
      }
    })

    // Risk mitigation recommendations based on high-severity insights
    const highRiskInsights = insights.filter(i => 
      i.significance === 'HIGH' || i.significance === 'CRITICAL'
    )

    for (const insight of highRiskInsights.slice(0, 2)) { // Limit to top 2
      if (insight.actionability.isActionable) {
        recommendations.push({
          id: `risk_mitigation_${insight.id}`,
          type: 'RISK_MITIGATION',
          title: `Address ${insight.title}`,
          description: `Mitigate risks identified in forecast analysis: ${insight.title}`,
          priority: insight.actionability.urgency === 'IMMEDIATE' ? 'CRITICAL' : 'HIGH',
          category: 'Risk Management',
          rationale: insight.description,
          expectedOutcome: 'Reduced forecast risk and improved business stability',
          implementationPlan: {
            timeline: insight.actionability.timeline,
            effort: 'MEDIUM',
            cost: 'MEDIUM',
            resources: ['Risk management team', 'Relevant business units'],
            dependencies: ['Risk assessment', 'Management approval'],
            milestones: insight.actionability.suggestedActions.slice(0, 3)
          },
          successMetrics: {
            kpis: ['Risk indicator metrics', 'Mitigation effectiveness'],
            targets: { 'risk_score_reduction': 50 },
            monitoringFrequency: 'Monthly'
          },
          riskMitigation: {
            identifiedRisks: ['Implementation delays', 'Resource constraints'],
            mitigationStrategies: ['Phased implementation', 'Resource prioritization'],
            contingencyPlans: ['Alternative approaches', 'External support']
          }
        })
      }
    }

    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }

  private async evaluateModelPerformance(
    models: ForecastModel[],
    data: DataPoint[],
    request: ForecastRequest
  ): Promise<ModelPerformance> {
    // For demonstration, use the best performing model
    const bestModel = models.reduce((best, current) => 
      current.performance.accuracy.mape < best.performance.accuracy.mape ? current : best
    )

    // Enhance with ensemble information if multiple models used
    const ensembleWeight: Record<string, number> = {}
    const totalWeight = models.reduce((sum, model) => sum + (1 - model.performance.accuracy.mape), 0)
    
    models.forEach(model => {
      ensembleWeight[model.name] = (1 - model.performance.accuracy.mape) / totalWeight
    })

    return {
      ...bestModel.performance,
      algorithmComparison: {
        bestPerforming: bestModel.name,
        ensembleWeight,
        improvementOverBaseline: 0.25
      }
    }
  }

  private calculateConfidenceMetrics(
    predictions: ForecastPrediction[],
    patterns: HistoricalPatterns,
    modelPerformance: ModelPerformance,
    request: ForecastRequest
  ): ConfidenceMetrics {
    // Overall confidence based on model performance and data characteristics
    const modelConfidence = 1 - modelPerformance.accuracy.mape
    const dataQualityConfidence = this.calculateDataQuality(request.historicalData)
    const patternConfidence = patterns.seasonality.detected ? 0.9 : 0.7
    
    const overallConfidence = (modelConfidence + dataQualityConfidence + patternConfidence) / 3

    // Temporal confidence (decreases with time)
    const nearTermConfidence = Math.min(0.95, overallConfidence + 0.1)
    const mediumTermConfidence = overallConfidence
    const longTermConfidence = Math.max(0.3, overallConfidence - 0.2)

    return {
      overallConfidence: Math.min(0.95, overallConfidence),
      temporalConfidence: {
        nearTerm: nearTermConfidence,
        mediumTerm: mediumTermConfidence,
        longTerm: longTermConfidence
      },
      factorContribution: {
        historicalData: dataQualityConfidence,
        trendAnalysis: patterns.trends.longTerm !== 'STABLE' ? 0.8 : 0.6,
        seasonalPatterns: patterns.seasonality.strength,
        externalFactors: request.contextualData ? 0.7 : 0.4,
        businessIntelligence: 0.6
      },
      uncertaintyFactors: {
        dataQuality: 1 - dataQualityConfidence,
        modelComplexity: Math.min(0.3, request.modelConfiguration.algorithms.length * 0.05),
        externalVolatility: patterns.volatility.level === 'HIGH' ? 0.4 : 
                           patterns.volatility.level === 'MEDIUM' ? 0.2 : 0.1,
        businessChanges: 0.2
      }
    }
  }

  private calculateDataQuality(data: DataPoint[]): number {
    if (data.length === 0) return 0

    let qualityScore = 1.0

    // Check for missing values (none in this case since data is provided)
    
    // Check for outliers
    const values = data.map(d => d.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
    const outliers = values.filter(val => Math.abs(val - mean) > 3 * stdDev).length
    const outlierRatio = outliers / values.length
    qualityScore -= outlierRatio * 0.2 // Reduce score for outliers

    // Check temporal consistency (gaps in time series)
    const timestamps = data.map(d => d.timestamp.getTime()).sort((a, b) => a - b)
    let gaps = 0
    for (let i = 1; i < timestamps.length; i++) {
      const expectedInterval = this.getExpectedInterval('DAY') // Default to daily
      if (timestamps[i] - timestamps[i-1] > expectedInterval * 2) {
        gaps++
      }
    }
    const gapRatio = gaps / Math.max(1, timestamps.length - 1)
    qualityScore -= gapRatio * 0.3 // Reduce score for temporal gaps

    // Check data recency
    const latestTimestamp = Math.max(...timestamps)
    const daysSinceLatest = (Date.now() - latestTimestamp) / (24 * 60 * 60 * 1000)
    if (daysSinceLatest > 30) {
      qualityScore -= 0.1 // Reduce score for stale data
    }

    return Math.max(0.3, qualityScore) // Minimum quality score of 0.3
  }

  private calculateNextUpdateDate(request: ForecastRequest): Date {
    const now = new Date()
    
    // Update frequency based on forecast horizon unit
    switch (request.forecastHorizon.unit) {
      case 'DAY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Weekly updates
      case 'WEEK':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // Bi-weekly updates
      case 'MONTH':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // Monthly updates
      case 'QUARTER':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // Quarterly updates
      case 'YEAR':
        return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000) // Semi-annual updates
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    }
  }

  private async generateExecutiveSummary(
    predictions: ForecastPrediction[],
    insights: ForecastInsight[],
    recommendations: ForecastRecommendation[],
    confidenceMetrics: ConfidenceMetrics,
    request: ForecastRequest
  ): Promise<{
    keyPredictions: string[]
    confidenceLevel: string
    criticalInsights: string[]
    actionPriorities: string[]
    riskFactors: string[]
  }> {
    try {
      const avgPrediction = predictions.reduce((sum, p) => sum + p.predictedValue, 0) / predictions.length
      const trendDirection = predictions[predictions.length - 1].predictedValue > predictions[0].predictedValue ? 'increasing' : 'decreasing'
      
      const aiPrompt = `
        Generate an executive summary for this CA firm forecast:
        
        Target Metric: ${request.targetMetric}
        Forecast Type: ${request.forecastType}
        Average Prediction: ${avgPrediction.toFixed(2)}
        Trend Direction: ${trendDirection}
        Overall Confidence: ${(confidenceMetrics.overallConfidence * 100).toFixed(1)}%
        Horizon: ${request.forecastHorizon.periods} ${request.forecastHorizon.unit}
        
        Key Insights: ${insights.slice(0, 3).map(i => i.title).join(', ')}
        Top Recommendations: ${recommendations.slice(0, 3).map(r => r.title).join(', ')}
        
        Provide a concise executive summary with:
        1. 3 key predictions
        2. 3 critical insights  
        3. 3 action priorities
        4. 3 risk factors
        
        Focus on strategic business implications for CA firm leadership.
      `

      const aiResponse = await openaiService.chatWithAssistant(aiPrompt)
      
      if (aiResponse.response) {
        // Parse AI response (simplified)
        return {
          keyPredictions: [
            `${request.targetMetric} forecast shows ${trendDirection} trend`,
            `Average predicted value: ${avgPrediction.toFixed(2)}`,
            `Forecast confidence: ${(confidenceMetrics.overallConfidence * 100).toFixed(1)}%`
          ],
          confidenceLevel: confidenceMetrics.overallConfidence > 0.8 ? 'HIGH' :
                          confidenceMetrics.overallConfidence > 0.6 ? 'MEDIUM' : 'LOW',
          criticalInsights: insights.slice(0, 3).map(i => i.title),
          actionPriorities: recommendations.slice(0, 3).map(r => r.title),
          riskFactors: [
            confidenceMetrics.uncertaintyFactors.dataQuality > 0.3 ? 'Data quality concerns' : '',
            confidenceMetrics.uncertaintyFactors.externalVolatility > 0.3 ? 'High market volatility' : '',
            confidenceMetrics.uncertaintyFactors.modelComplexity > 0.2 ? 'Model complexity risks' : ''
          ].filter(Boolean)
        }
      }
    } catch (error) {
      logger.warn('AI executive summary generation failed, using fallback', { error })
    }

    // Fallback summary
    return {
      keyPredictions: [
        `${request.targetMetric} forecast generated for ${request.forecastHorizon.periods} ${request.forecastHorizon.unit}`,
        `${predictions.length} predictions with varying confidence levels`,
        `${insights.length} key insights identified from analysis`
      ],
      confidenceLevel: confidenceMetrics.overallConfidence > 0.8 ? 'HIGH' :
                      confidenceMetrics.overallConfidence > 0.6 ? 'MEDIUM' : 'LOW',
      criticalInsights: insights.slice(0, 3).map(i => i.title),
      actionPriorities: recommendations.slice(0, 3).map(r => r.title),
      riskFactors: [
        'Model limitations',
        'Data quality variations',
        'External market factors'
      ]
    }
  }

  private async detectPerformanceDrift(model: ForecastModel): Promise<number> {
    // Simplified drift detection - in production would use actual performance metrics
    const baselinePerformance = model.performance.accuracy.mape
    const currentPerformance = baselinePerformance + (Math.random() - 0.5) * 0.1 // Simulated drift
    
    return Math.abs(currentPerformance - baselinePerformance) / baselinePerformance
  }
}

// Export singleton instance
export const predictiveForecasting = new PredictiveForecastingService()