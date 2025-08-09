import { analyticsService } from './analytics-service'
import { openaiService } from './openai-service'

export interface AnomalyDetectionRequest {
  id: string
  organizationId: string
  userId: string
  dataSource: DataSource
  detectionConfig: DetectionConfiguration
  alertConfig: AlertConfiguration
  context: DetectionContext
}

export interface DataSource {
  type: 'FINANCIAL_TRANSACTIONS' | 'PERFORMANCE_METRICS' | 'COMPLIANCE_DATA' | 'OPERATIONAL_DATA' | 'CLIENT_BEHAVIOR'
  sourceId: string
  data: any[]
  metadata: DataSourceMetadata
  timeRange: { start: Date; end: Date }
  samplingRate?: number
}

export interface DataSourceMetadata {
  schema: Record<string, string> // field_name -> data_type
  primaryKey: string
  timestampField: string
  valueFields: string[]
  categoricalFields?: string[]
  expectedFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
  qualityScore: number
}

export interface DetectionConfiguration {
  algorithms: AnomalyAlgorithm[]
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CUSTOM'
  customThresholds?: CustomThresholds
  aggregationWindow: string // e.g., '1h', '1d', '1w'
  minimumSamples: number
  seasonalityAware: boolean
  contextualDetection: boolean
  multiVariateAnalysis: boolean
}

export interface AnomalyAlgorithm {
  type: 'STATISTICAL' | 'ML_ISOLATION_FOREST' | 'ML_ONE_CLASS_SVM' | 'LSTM_AUTOENCODER' | 'ENSEMBLE'
  parameters: Record<string, any>
  weight: number // 0-1, for ensemble methods
}

export interface CustomThresholds {
  statisticalThreshold: number // z-score threshold
  percentileThreshold: number // percentile threshold (e.g., 95th percentile)
  absoluteThreshold?: number
  relativeChangeThreshold?: number
}

export interface AlertConfiguration {
  severity: SeverityConfiguration
  channels: AlertChannel[]
  escalation: EscalationRule[]
  suppressionRules: SuppressionRule[]
  businessHours: BusinessHoursConfig
}

export interface SeverityConfiguration {
  critical: { threshold: number; conditions: string[] }
  high: { threshold: number; conditions: string[] }
  medium: { threshold: number; conditions: string[] }
  low: { threshold: number; conditions: string[] }
}

export interface AlertChannel {
  type: 'EMAIL' | 'SMS' | 'SLACK' | 'WEBHOOK' | 'IN_APP'
  config: Record<string, any>
  recipients: string[]
  template?: string
}

export interface EscalationRule {
  condition: string
  delayMinutes: number
  escalateTo: string[]
  maxEscalations: number
}

export interface SuppressionRule {
  condition: string
  duration: string // e.g., '30m', '2h', '1d'
  maxOccurrences: number
}

export interface BusinessHoursConfig {
  timezone: string
  workingHours: { start: string; end: string }
  workingDays: number[] // 0=Sunday, 6=Saturday
  holidays: Date[]
}

export interface DetectionContext {
  userRole: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN'
  businessUnit?: string
  clientContext?: string[]
  seasonalFactors?: SeasonalFactor[]
  externalFactors?: ExternalFactor[]
  historicalBaseline?: HistoricalBaseline
}

export interface SeasonalFactor {
  type: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'DAY_OF_WEEK' | 'HOLIDAY'
  pattern: any
  impact: number // -1 to 1
}

export interface ExternalFactor {
  type: 'MARKET_CONDITION' | 'REGULATORY_CHANGE' | 'ECONOMIC_INDICATOR' | 'INDUSTRY_TREND'
  description: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  startDate: Date
  endDate?: Date
}

export interface HistoricalBaseline {
  period: string
  metrics: BaselineMetric[]
  patterns: BaselinePattern[]
  lastUpdated: Date
}

export interface BaselineMetric {
  field: string
  mean: number
  std: number
  min: number
  max: number
  percentiles: Record<string, number>
}

export interface BaselinePattern {
  pattern: string
  frequency: number
  strength: number
  lastSeen: Date
}

export interface AnomalyDetectionResult {
  requestId: string
  detectionTimestamp: Date
  anomalies: DetectedAnomaly[]
  summary: DetectionSummary
  recommendations: AnomalyRecommendation[]
  modelPerformance: ModelPerformance
  alerts: GeneratedAlert[]
  processingTime: number
}

export interface DetectedAnomaly {
  id: string
  type: 'POINT_ANOMALY' | 'CONTEXTUAL_ANOMALY' | 'COLLECTIVE_ANOMALY' | 'TREND_ANOMALY'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  anomalyScore: number
  timestamp: Date
  affectedFields: AffectedField[]
  context: AnomalyContext
  explanation: AnomalyExplanation
  businessImpact: BusinessImpact
  similarHistoricalAnomalies: HistoricalAnomalyReference[]
}

export interface AffectedField {
  fieldName: string
  expectedValue: number | string
  actualValue: number | string
  deviationScore: number
  contributionToAnomaly: number
}

export interface AnomalyContext {
  dataPoint: any
  surroundingData: any[]
  timeWindow: { start: Date; end: Date }
  relatedEntities: string[]
  contextualFactors: string[]
}

export interface AnomalyExplanation {
  primaryCause: string
  contributingFactors: string[]
  possibleReasons: string[]
  rulesBroken: string[]
  statisticalEvidence: StatisticalEvidence
  patternAnalysis: PatternAnalysis
}

export interface StatisticalEvidence {
  zScore: number
  percentile: number
  probabilityOfOccurrence: number
  confidenceInterval: { lower: number; upper: number }
}

export interface PatternAnalysis {
  expectedPattern: string
  observedPattern: string
  patternDeviation: number
  seasonalityImpact: number
}

export interface BusinessImpact {
  category: 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE' | 'REPUTATIONAL' | 'STRATEGIC'
  estimatedImpact: 'NEGLIGIBLE' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE'
  potentialLoss?: number
  affectedProcesses: string[]
  stakeholders: string[]
  urgency: 'IMMEDIATE' | 'URGENT' | 'STANDARD' | 'LOW'
}

export interface HistoricalAnomalyReference {
  anomalyId: string
  similarity: number
  date: Date
  resolution: string
  outcome: string
}

export interface DetectionSummary {
  totalAnomalies: number
  severityBreakdown: Record<string, number>
  typeBreakdown: Record<string, number>
  timeRange: { start: Date; end: Date }
  coveragePercentage: number
  dataQualityIssues: string[]
  processingStats: ProcessingStats
}

export interface ProcessingStats {
  recordsProcessed: number
  processingRate: number // records per second
  memoryUsage: number // MB
  cpuUsage: number // percentage
  algorithmsUsed: string[]
}

export interface AnomalyRecommendation {
  type: 'IMMEDIATE_ACTION' | 'INVESTIGATION' | 'PROCESS_IMPROVEMENT' | 'MONITORING_ENHANCEMENT'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  actionSteps: string[]
  expectedOutcome: string
  resources: string[]
  timeline: string
  successCriteria: string[]
}

export interface ModelPerformance {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  falsePositiveRate: number
  falseNegativeRate: number
  algorithmPerformance: AlgorithmPerformance[]
  lastTraining: Date
  modelVersion: string
}

export interface AlgorithmPerformance {
  algorithm: string
  weight: number
  contribution: number
  accuracy: number
  processingTime: number
}

export interface GeneratedAlert {
  id: string
  anomalyId: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  message: string
  timestamp: Date
  channels: string[]
  recipients: string[]
  status: 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED'
  escalationLevel: number
  businessContext: string
}

export interface RealTimeProcessor {
  start(): Promise<void>
  stop(): Promise<void>
  processDataStream(data: any[]): Promise<DetectedAnomaly[]>
  updateBaseline(data: any[]): Promise<void>
  getStatus(): ProcessorStatus
}

export interface ProcessorStatus {
  isRunning: boolean
  lastProcessed: Date
  totalProcessed: number
  errorRate: number
  latency: number
  queueSize: number
}

export class AnomalyDetectionService {
  private activeProcessors = new Map<string, RealTimeProcessor>()
  private detectionModels = new Map<string, any>()
  private baselineCache = new Map<string, HistoricalBaseline>()

  constructor() {
    // Initialize detection models and processors
    this.initializeDetectionModels()
  }

  async createAnomalyDetection(request: AnomalyDetectionRequest): Promise<AnomalyDetectionResult> {
    const startTime = Date.now()

    try {
      // Validate request
      this.validateDetectionRequest(request)

      // Prepare data for analysis
      const preparedData = await this.prepareData(request.dataSource)

      // Get or create baseline
      const baseline = await this.getOrCreateBaseline(request)

      // Run anomaly detection algorithms
      const anomalies = await this.runDetectionAlgorithms(
        preparedData,
        baseline,
        request.detectionConfig,
        request.context
      )

      // Analyze and enrich anomalies
      const enrichedAnomalies = await this.enrichAnomalies(anomalies, request)

      // Generate recommendations
      const recommendations = await this.generateRecommendations(enrichedAnomalies, request)

      // Calculate model performance
      const modelPerformance = await this.calculateModelPerformance(
        enrichedAnomalies,
        request.detectionConfig
      )

      // Generate alerts
      const alerts = await this.generateAlerts(enrichedAnomalies, request.alertConfig)

      // Create detection summary
      const summary = this.createDetectionSummary(
        enrichedAnomalies,
        preparedData,
        startTime
      )

      const result: AnomalyDetectionResult = {
        requestId: request.id,
        detectionTimestamp: new Date(),
        anomalies: enrichedAnomalies,
        summary,
        recommendations,
        modelPerformance,
        alerts,
        processingTime: Date.now() - startTime
      }

      // Store results for future reference
      await this.storeDetectionResults(result)

      return result

    } catch (error) {
      console.error('Anomaly detection failed:', error)
      throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async startRealTimeDetection(request: AnomalyDetectionRequest): Promise<string> {
    const processorId = `processor_${request.organizationId}_${Date.now()}`

    try {
      // Create real-time processor
      const processor = await this.createRealTimeProcessor(request)

      // Start the processor
      await processor.start()

      // Store processor reference
      this.activeProcessors.set(processorId, processor)

      console.log(`Real-time anomaly detection started: ${processorId}`)
      return processorId

    } catch (error) {
      console.error('Failed to start real-time detection:', error)
      throw error
    }
  }

  async stopRealTimeDetection(processorId: string): Promise<void> {
    const processor = this.activeProcessors.get(processorId)
    if (processor) {
      await processor.stop()
      this.activeProcessors.delete(processorId)
      console.log(`Real-time anomaly detection stopped: ${processorId}`)
    }
  }

  async getDetectionStatus(processorId: string): Promise<ProcessorStatus | null> {
    const processor = this.activeProcessors.get(processorId)
    return processor ? processor.getStatus() : null
  }

  private initializeDetectionModels(): void {
    // Initialize statistical models
    this.detectionModels.set('statistical', {
      type: 'STATISTICAL',
      calculateZScore: (value: number, mean: number, std: number) => {
        return std > 0 ? (value - mean) / std : 0
      },
      calculatePercentile: (value: number, data: number[]) => {
        const sorted = data.slice().sort((a, b) => a - b)
        const index = sorted.findIndex(x => x >= value)
        return index === -1 ? 100 : (index / sorted.length) * 100
      }
    })

    // Initialize ML models (simplified implementations)
    this.detectionModels.set('isolation_forest', {
      type: 'ML_ISOLATION_FOREST',
      fit: async (data: number[][]): Promise<any> => {
        // Simplified isolation forest implementation
        return {
          anomalyScores: data.map(() => Math.random() * 0.5 + 0.5) // Mock scores
        }
      },
      predict: async (model: any, data: number[][]): Promise<number[]> => {
        return data.map(() => Math.random() > 0.9 ? 1 : 0) // Mock predictions
      }
    })

    // Initialize ensemble model
    this.detectionModels.set('ensemble', {
      type: 'ENSEMBLE',
      combine: (predictions: Record<string, number[]>): number[] => {
        const algorithms = Object.keys(predictions)
        const length = predictions[algorithms[0]].length
        const result: number[] = []

        for (let i = 0; i < length; i++) {
          let weightedSum = 0
          let totalWeight = 0

          algorithms.forEach(algo => {
            const weight = 1.0 / algorithms.length // Equal weights for simplicity
            weightedSum += predictions[algo][i] * weight
            totalWeight += weight
          })

          result[i] = totalWeight > 0 ? weightedSum / totalWeight : 0
        }

        return result
      }
    })
  }

  private validateDetectionRequest(request: AnomalyDetectionRequest): void {
    if (!request.dataSource || !request.dataSource.data || request.dataSource.data.length === 0) {
      throw new Error('Data source is required and must contain data')
    }

    if (!request.detectionConfig || !request.detectionConfig.algorithms || request.detectionConfig.algorithms.length === 0) {
      throw new Error('Detection configuration with algorithms is required')
    }

    if (!request.alertConfig) {
      throw new Error('Alert configuration is required')
    }
  }

  private async prepareData(dataSource: DataSource): Promise<any[]> {
    let data = dataSource.data

    // Basic data validation
    if (!Array.isArray(data)) {
      throw new Error('Data source must be an array')
    }

    // Remove invalid records
    data = data.filter(record => record && typeof record === 'object')

    // Sort by timestamp if available
    const timestampField = dataSource.metadata.timestampField
    if (timestampField) {
      data = data.sort((a, b) => {
        const timeA = new Date(a[timestampField]).getTime()
        const timeB = new Date(b[timestampField]).getTime()
        return timeA - timeB
      })
    }

    // Handle missing values
    data = this.handleMissingValues(data, dataSource.metadata)

    // Normalize numerical fields if needed
    data = this.normalizeData(data, dataSource.metadata)

    return data
  }

  private handleMissingValues(data: any[], metadata: DataSourceMetadata): any[] {
    return data.map(record => {
      const cleanRecord = { ...record }

      metadata.valueFields.forEach(field => {
        if (cleanRecord[field] === null || cleanRecord[field] === undefined) {
          // Use previous value or 0 for missing numerical values
          cleanRecord[field] = 0
        }
      })

      return cleanRecord
    })
  }

  private normalizeData(data: any[], metadata: DataSourceMetadata): any[] {
    // Calculate statistics for each value field
    const fieldStats: Record<string, { mean: number; std: number }> = {}

    metadata.valueFields.forEach(field => {
      const values = data.map(record => parseFloat(record[field]) || 0)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      const std = Math.sqrt(variance)

      fieldStats[field] = { mean, std }
    })

    // Normalize data
    return data.map(record => {
      const normalizedRecord = { ...record }

      metadata.valueFields.forEach(field => {
        const value = parseFloat(record[field]) || 0
        const stats = fieldStats[field]
        
        if (stats.std > 0) {
          normalizedRecord[`${field}_normalized`] = (value - stats.mean) / stats.std
        } else {
          normalizedRecord[`${field}_normalized`] = 0
        }
      })

      return normalizedRecord
    })
  }

  private async getOrCreateBaseline(request: AnomalyDetectionRequest): Promise<HistoricalBaseline> {
    const cacheKey = `baseline_${request.organizationId}_${request.dataSource.sourceId}`
    
    // Check cache first
    let baseline = this.baselineCache.get(cacheKey)
    
    if (!baseline) {
      // Create new baseline
      baseline = await this.createBaseline(request.dataSource)
      this.baselineCache.set(cacheKey, baseline)
    }

    return baseline
  }

  private async createBaseline(dataSource: DataSource): Promise<HistoricalBaseline> {
    const data = dataSource.data
    const metrics: BaselineMetric[] = []

    // Calculate baseline metrics for each value field
    dataSource.metadata.valueFields.forEach(field => {
      const values = data.map(record => parseFloat(record[field]) || 0)
      
      if (values.length > 0) {
        values.sort((a, b) => a - b)
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
        const std = Math.sqrt(variance)
        
        const percentiles: Record<string, number> = {}
        ;[25, 50, 75, 90, 95, 99].forEach(p => {
          const index = Math.floor((p / 100) * values.length)
          percentiles[`p${p}`] = values[Math.min(index, values.length - 1)]
        })

        metrics.push({
          field,
          mean,
          std,
          min: values[0],
          max: values[values.length - 1],
          percentiles
        })
      }
    })

    // Identify patterns (simplified implementation)
    const patterns: BaselinePattern[] = [
      {
        pattern: 'daily_pattern',
        frequency: 24, // hours
        strength: 0.7,
        lastSeen: new Date()
      }
    ]

    return {
      period: `${dataSource.timeRange.start.toISOString()}_${dataSource.timeRange.end.toISOString()}`,
      metrics,
      patterns,
      lastUpdated: new Date()
    }
  }

  private async runDetectionAlgorithms(
    data: any[],
    baseline: HistoricalBaseline,
    config: DetectionConfiguration,
    context: DetectionContext
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    const algorithmResults: Record<string, any[]> = {}

    // Run each configured algorithm
    for (const algorithm of config.algorithms) {
      try {
        const result = await this.runSingleAlgorithm(algorithm, data, baseline, config, context)
        algorithmResults[algorithm.type] = result
      } catch (error) {
        console.error(`Algorithm ${algorithm.type} failed:`, error)
      }
    }

    // Combine results if using ensemble
    if (config.algorithms.length > 1) {
      const combinedResults = await this.combineAlgorithmResults(algorithmResults, config.algorithms)
      anomalies.push(...combinedResults)
    } else {
      // Single algorithm results
      const singleResult = Object.values(algorithmResults)[0] || []
      anomalies.push(...singleResult)
    }

    return anomalies
  }

  private async runSingleAlgorithm(
    algorithm: AnomalyAlgorithm,
    data: any[],
    baseline: HistoricalBaseline,
    config: DetectionConfiguration,
    context: DetectionContext
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []

    switch (algorithm.type) {
      case 'STATISTICAL':
        return this.runStatisticalDetection(data, baseline, config, context)
      
      case 'ML_ISOLATION_FOREST':
        return this.runIsolationForestDetection(data, baseline, config, context)
      
      case 'ML_ONE_CLASS_SVM':
        return this.runOneClassSVMDetection(data, baseline, config, context)
      
      default:
        console.warn(`Unknown algorithm type: ${algorithm.type}`)
        return []
    }
  }

  private async runStatisticalDetection(
    data: any[],
    baseline: HistoricalBaseline,
    config: DetectionConfiguration,
    context: DetectionContext
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    const model = this.detectionModels.get('statistical')
    
    // Sensitivity thresholds
    const thresholds = {
      'LOW': 3.0,
      'MEDIUM': 2.5,
      'HIGH': 2.0
    }
    
    const threshold = config.customThresholds?.statisticalThreshold || 
                     thresholds[config.sensitivity as keyof typeof thresholds] || 2.5

    data.forEach((record, index) => {
      baseline.metrics.forEach(metric => {
        const value = parseFloat(record[metric.field]) || 0
        const zScore = model.calculateZScore(value, metric.mean, metric.std)
        
        if (Math.abs(zScore) > threshold) {
          const severity = this.calculateSeverity(Math.abs(zScore), threshold)
          
          anomalies.push({
            id: `stat_${Date.now()}_${index}_${metric.field}`,
            type: 'POINT_ANOMALY',
            severity,
            confidence: Math.min(0.95, Math.abs(zScore) / threshold * 0.8),
            anomalyScore: Math.abs(zScore),
            timestamp: new Date(record[data[0].timestamp] || new Date()),
            affectedFields: [{
              fieldName: metric.field,
              expectedValue: metric.mean,
              actualValue: value,
              deviationScore: Math.abs(zScore),
              contributionToAnomaly: 1.0
            }],
            context: {
              dataPoint: record,
              surroundingData: this.getSurroundingData(data, index, 5),
              timeWindow: {
                start: new Date(Date.now() - 60 * 60 * 1000), // 1 hour window
                end: new Date()
              },
              relatedEntities: [],
              contextualFactors: []
            },
            explanation: {
              primaryCause: `Statistical outlier detected`,
              contributingFactors: [`Z-score: ${zScore.toFixed(2)}`],
              possibleReasons: [
                'Data entry error',
                'System malfunction',
                'Unusual business activity'
              ],
              rulesBroken: [`Z-score threshold: ${threshold}`],
              statisticalEvidence: {
                zScore,
                percentile: model.calculatePercentile(value, baseline.metrics.map(m => m.mean)),
                probabilityOfOccurrence: this.calculateProbability(Math.abs(zScore)),
                confidenceInterval: {
                  lower: metric.mean - 2 * metric.std,
                  upper: metric.mean + 2 * metric.std
                }
              },
              patternAnalysis: {
                expectedPattern: 'Normal distribution',
                observedPattern: 'Outlier',
                patternDeviation: Math.abs(zScore),
                seasonalityImpact: 0
              }
            },
            businessImpact: await this.assessBusinessImpact(record, metric.field, context),
            similarHistoricalAnomalies: []
          })
        }
      })
    })

    return anomalies
  }

  private async runIsolationForestDetection(
    data: any[],
    baseline: HistoricalBaseline,
    config: DetectionConfiguration,
    context: DetectionContext
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = []
    const model = this.detectionModels.get('isolation_forest')

    // Prepare feature matrix
    const features = data.map(record => {
      return baseline.metrics.map(metric => parseFloat(record[metric.field]) || 0)
    })

    // Train and predict (simplified)
    const trainedModel = await model.fit(features)
    const predictions = await model.predict(trainedModel, features)

    predictions.forEach((prediction, index) => {
      if (prediction === 1) { // Anomaly detected
        anomalies.push({
          id: `if_${Date.now()}_${index}`,
          type: 'POINT_ANOMALY',
          severity: 'MEDIUM',
          confidence: 0.8,
          anomalyScore: 0.8,
          timestamp: new Date(data[index].timestamp || new Date()),
          affectedFields: baseline.metrics.map(metric => ({
            fieldName: metric.field,
            expectedValue: metric.mean,
            actualValue: parseFloat(data[index][metric.field]) || 0,
            deviationScore: 0.8,
            contributionToAnomaly: 1.0 / baseline.metrics.length
          })),
          context: {
            dataPoint: data[index],
            surroundingData: this.getSurroundingData(data, index, 5),
            timeWindow: {
              start: new Date(Date.now() - 60 * 60 * 1000),
              end: new Date()
            },
            relatedEntities: [],
            contextualFactors: []
          },
          explanation: {
            primaryCause: 'Isolation Forest algorithm detected anomaly',
            contributingFactors: ['Multivariate analysis'],
            possibleReasons: ['Unusual combination of feature values'],
            rulesBroken: ['Isolation threshold'],
            statisticalEvidence: {
              zScore: 0,
              percentile: 95,
              probabilityOfOccurrence: 0.05,
              confidenceInterval: { lower: 0, upper: 1 }
            },
            patternAnalysis: {
              expectedPattern: 'Typical feature combination',
              observedPattern: 'Unusual feature combination',
              patternDeviation: 0.8,
              seasonalityImpact: 0
            }
          },
          businessImpact: await this.assessBusinessImpact(data[index], 'multivariate', context),
          similarHistoricalAnomalies: []
        })
      }
    })

    return anomalies
  }

  private async runOneClassSVMDetection(
    data: any[],
    baseline: HistoricalBaseline,
    config: DetectionConfiguration,
    context: DetectionContext
  ): Promise<DetectedAnomaly[]> {
    // Simplified One-Class SVM implementation
    // In production, this would use a proper ML library
    return this.runIsolationForestDetection(data, baseline, config, context)
  }

  private async combineAlgorithmResults(
    algorithmResults: Record<string, DetectedAnomaly[]>,
    algorithms: AnomalyAlgorithm[]
  ): Promise<DetectedAnomaly[]> {
    const combinedAnomalies: DetectedAnomaly[] = []
    const ensembleModel = this.detectionModels.get('ensemble')

    // Simple ensemble approach - combine overlapping detections
    const allAnomalies = Object.values(algorithmResults).flat()
    
    // Group by timestamp and affected fields
    const anomalyGroups = new Map<string, DetectedAnomaly[]>()
    
    allAnomalies.forEach(anomaly => {
      const key = `${anomaly.timestamp.getTime()}_${anomaly.affectedFields.map(f => f.fieldName).join('_')}`
      if (!anomalyGroups.has(key)) {
        anomalyGroups.set(key, [])
      }
      anomalyGroups.get(key)!.push(anomaly)
    })

    // Combine grouped anomalies
    anomalyGroups.forEach((group, key) => {
      if (group.length === 1) {
        combinedAnomalies.push(group[0])
      } else {
        // Combine multiple detections into one with higher confidence
        const combined = this.combineAnomalies(group)
        combinedAnomalies.push(combined)
      }
    })

    return combinedAnomalies
  }

  private combineAnomalies(anomalies: DetectedAnomaly[]): DetectedAnomaly {
    const first = anomalies[0]
    const avgConfidence = anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length
    const maxScore = Math.max(...anomalies.map(a => a.anomalyScore))
    
    return {
      ...first,
      id: `ensemble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      confidence: Math.min(0.95, avgConfidence + 0.1), // Boost ensemble confidence
      anomalyScore: maxScore,
      explanation: {
        ...first.explanation,
        primaryCause: 'Multiple algorithms detected anomaly',
        contributingFactors: [
          ...first.explanation.contributingFactors,
          `Detected by ${anomalies.length} algorithms`
        ]
      }
    }
  }

  private getSurroundingData(data: any[], index: number, windowSize: number): any[] {
    const start = Math.max(0, index - windowSize)
    const end = Math.min(data.length, index + windowSize + 1)
    return data.slice(start, end)
  }

  private calculateSeverity(score: number, threshold: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score > threshold * 2) return 'CRITICAL'
    if (score > threshold * 1.5) return 'HIGH'
    if (score > threshold * 1.2) return 'MEDIUM'
    return 'LOW'
  }

  private calculateProbability(zScore: number): number {
    // Approximate probability from z-score
    return Math.max(0.001, 1 - (zScore / 10))
  }

  private async assessBusinessImpact(
    record: any,
    field: string,
    context: DetectionContext
  ): Promise<BusinessImpact> {
    // Simplified business impact assessment
    let category: BusinessImpact['category'] = 'OPERATIONAL'
    let estimatedImpact: BusinessImpact['estimatedImpact'] = 'MINOR'
    let urgency: BusinessImpact['urgency'] = 'STANDARD'

    // Determine category based on field and context
    if (field.includes('revenue') || field.includes('cost') || field.includes('amount')) {
      category = 'FINANCIAL'
      estimatedImpact = 'MODERATE'
      urgency = 'URGENT'
    } else if (field.includes('compliance') || field.includes('regulatory')) {
      category = 'COMPLIANCE'
      estimatedImpact = 'MAJOR'
      urgency = 'IMMEDIATE'
    }

    return {
      category,
      estimatedImpact,
      potentialLoss: category === 'FINANCIAL' ? 10000 : undefined,
      affectedProcesses: ['Data processing', 'Reporting'],
      stakeholders: [context.userRole],
      urgency
    }
  }

  private async enrichAnomalies(
    anomalies: DetectedAnomaly[],
    request: AnomalyDetectionRequest
  ): Promise<DetectedAnomaly[]> {
    // Enrich anomalies with additional context using AI
    for (const anomaly of anomalies) {
      try {
        // Get AI explanation
        const aiExplanation = await this.getAIExplanation(anomaly, request.context)
        
        // Enhance explanation with AI insights
        anomaly.explanation.possibleReasons = [
          ...anomaly.explanation.possibleReasons,
          ...aiExplanation.reasons
        ]
        anomaly.explanation.contributingFactors = [
          ...anomaly.explanation.contributingFactors,
          ...aiExplanation.factors
        ]
        
      } catch (error) {
        console.error('Failed to enrich anomaly with AI:', error)
      }
    }

    return anomalies
  }

  private async getAIExplanation(
    anomaly: DetectedAnomaly,
    context: DetectionContext
  ): Promise<{ reasons: string[]; factors: string[] }> {
    try {
      const response = await openaiService.chatWithAssistant({
        message: `Analyze this anomaly in a CA firm context:
        
Anomaly Details:
- Type: ${anomaly.type}
- Severity: ${anomaly.severity}
- Affected Fields: ${anomaly.affectedFields.map(f => `${f.fieldName}: expected ${f.expectedValue}, got ${f.actualValue}`).join(', ')}
- Business Impact: ${anomaly.businessImpact.category}
- User Role: ${context.userRole}

Please provide:
1. Possible business reasons for this anomaly
2. Contributing factors specific to CA operations
3. Recommended investigation steps

Focus on CA industry context (compliance, financial reporting, audit requirements).`,
        context: {
          userRole: context.userRole,
          businessContext: 'Anomaly analysis for CA firm'
        }
      })

      // Parse AI response for structured insights
      const reasons = this.extractListFromResponse(response.response, 'reasons')
      const factors = this.extractListFromResponse(response.response, 'factors')

      return { reasons, factors }
    } catch (error) {
      console.error('AI explanation failed:', error)
      return {
        reasons: ['Unusual data pattern detected'],
        factors: ['Statistical deviation from baseline']
      }
    }
  }

  private extractListFromResponse(response: string, type: string): string[] {
    // Simple extraction logic - in production would be more sophisticated
    const lines = response.split('\n').filter(line => line.trim().length > 0)
    const extracted: string[] = []
    
    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.match(/^\d+\./)) {
        const cleaned = line.replace(/^[•\-\d\.\s]+/, '').trim()
        if (cleaned.length > 0) {
          extracted.push(cleaned)
        }
      }
    })

    return extracted.slice(0, 3) // Limit to top 3
  }

  private async generateRecommendations(
    anomalies: DetectedAnomaly[],
    request: AnomalyDetectionRequest
  ): Promise<AnomalyRecommendation[]> {
    const recommendations: AnomalyRecommendation[] = []

    // Critical anomalies require immediate action
    const criticalAnomalies = anomalies.filter(a => a.severity === 'CRITICAL')
    if (criticalAnomalies.length > 0) {
      recommendations.push({
        type: 'IMMEDIATE_ACTION',
        priority: 'HIGH',
        title: 'Address Critical Anomalies',
        description: `${criticalAnomalies.length} critical anomalies detected requiring immediate attention`,
        actionSteps: [
          'Review critical anomaly details',
          'Verify data accuracy',
          'Check system integrity',
          'Implement corrective measures',
          'Monitor for recurrence'
        ],
        expectedOutcome: 'Resolution of critical issues and prevention of business impact',
        resources: ['Data analyst', 'System administrator', 'Business stakeholder'],
        timeline: 'Immediate (within 1 hour)',
        successCriteria: ['All critical anomalies resolved', 'Root cause identified', 'Prevention measures in place']
      })
    }

    // High-frequency anomalies suggest systematic issues
    if (anomalies.length > 10) {
      recommendations.push({
        type: 'PROCESS_IMPROVEMENT',
        priority: 'MEDIUM',
        title: 'Investigate Systematic Issues',
        description: 'High number of anomalies suggests potential systematic problems',
        actionSteps: [
          'Analyze anomaly patterns',
          'Review data collection processes',
          'Validate system configurations',
          'Consider baseline updates'
        ],
        expectedOutcome: 'Improved data quality and reduced false positives',
        resources: ['Process analyst', 'Quality assurance team'],
        timeline: '1-2 weeks',
        successCriteria: ['Anomaly rate reduced by 50%', 'Process improvements documented']
      })
    }

    // Financial anomalies need special attention
    const financialAnomalies = anomalies.filter(a => a.businessImpact.category === 'FINANCIAL')
    if (financialAnomalies.length > 0) {
      recommendations.push({
        type: 'INVESTIGATION',
        priority: 'HIGH',
        title: 'Financial Data Investigation',
        description: `${financialAnomalies.length} financial anomalies require investigation`,
        actionSteps: [
          'Review financial transactions',
          'Verify account balances',
          'Check for data entry errors',
          'Validate calculation logic'
        ],
        expectedOutcome: 'Accurate financial reporting and compliance',
        resources: ['Financial analyst', 'Accounting team'],
        timeline: '2-3 days',
        successCriteria: ['Financial accuracy verified', 'Discrepancies resolved']
      })
    }

    return recommendations
  }

  private async calculateModelPerformance(
    anomalies: DetectedAnomaly[],
    config: DetectionConfiguration
  ): Promise<ModelPerformance> {
    // Simplified performance calculation
    // In production, this would use actual validation data
    return {
      accuracy: 0.85,
      precision: 0.78,
      recall: 0.82,
      f1Score: 0.80,
      falsePositiveRate: 0.15,
      falseNegativeRate: 0.18,
      algorithmPerformance: config.algorithms.map(algo => ({
        algorithm: algo.type,
        weight: algo.weight,
        contribution: algo.weight / config.algorithms.reduce((sum, a) => sum + a.weight, 0),
        accuracy: 0.8 + Math.random() * 0.1, // Mock accuracy
        processingTime: Math.random() * 1000 + 500 // Mock processing time
      })),
      lastTraining: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      modelVersion: '1.0.0'
    }
  }

  private async generateAlerts(
    anomalies: DetectedAnomaly[],
    alertConfig: AlertConfiguration
  ): Promise<GeneratedAlert[]> {
    const alerts: GeneratedAlert[] = []

    for (const anomaly of anomalies) {
      // Check if anomaly meets alert criteria
      const severityConfig = alertConfig.severity[anomaly.severity.toLowerCase() as keyof typeof alertConfig.severity]
      
      if (severityConfig && anomaly.anomalyScore >= severityConfig.threshold) {
        const alert: GeneratedAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          anomalyId: anomaly.id,
          severity: anomaly.severity,
          title: `${anomaly.severity} Anomaly Detected`,
          message: this.formatAlertMessage(anomaly),
          timestamp: new Date(),
          channels: alertConfig.channels.map(c => c.type),
          recipients: alertConfig.channels.flatMap(c => c.recipients),
          status: 'PENDING',
          escalationLevel: 0,
          businessContext: `${anomaly.businessImpact.category} impact - ${anomaly.businessImpact.urgency} urgency`
        }

        alerts.push(alert)
      }
    }

    return alerts
  }

  private formatAlertMessage(anomaly: DetectedAnomaly): string {
    const affectedFields = anomaly.affectedFields.map(f => f.fieldName).join(', ')
    return `${anomaly.severity} anomaly detected in ${affectedFields}. ` +
           `Score: ${anomaly.anomalyScore.toFixed(2)}, ` +
           `Confidence: ${(anomaly.confidence * 100).toFixed(1)}%. ` +
           `Primary cause: ${anomaly.explanation.primaryCause}`
  }

  private createDetectionSummary(
    anomalies: DetectedAnomaly[],
    data: any[],
    startTime: number
  ): DetectionSummary {
    const severityBreakdown: Record<string, number> = {}
    const typeBreakdown: Record<string, number> = {}

    anomalies.forEach(anomaly => {
      severityBreakdown[anomaly.severity] = (severityBreakdown[anomaly.severity] || 0) + 1
      typeBreakdown[anomaly.type] = (typeBreakdown[anomaly.type] || 0) + 1
    })

    return {
      totalAnomalies: anomalies.length,
      severityBreakdown,
      typeBreakdown,
      timeRange: {
        start: new Date(Math.min(...data.map(d => new Date(d.timestamp || Date.now()).getTime()))),
        end: new Date(Math.max(...data.map(d => new Date(d.timestamp || Date.now()).getTime())))
      },
      coveragePercentage: 100, // Assuming full coverage
      dataQualityIssues: [],
      processingStats: {
        recordsProcessed: data.length,
        processingRate: data.length / ((Date.now() - startTime) / 1000),
        memoryUsage: 50, // Mock value
        cpuUsage: 25, // Mock value
        algorithmsUsed: ['statistical', 'isolation_forest']
      }
    }
  }

  private async storeDetectionResults(result: AnomalyDetectionResult): Promise<void> {
    // In production, store results in database
    console.log(`Stored detection results: ${result.requestId}`)
  }

  private async createRealTimeProcessor(request: AnomalyDetectionRequest): Promise<RealTimeProcessor> {
    // Create a simplified real-time processor
    return {
      start: async () => {
        console.log('Real-time processor started')
      },
      stop: async () => {
        console.log('Real-time processor stopped')
      },
      processDataStream: async (data: any[]) => {
        // Process streaming data
        const baseline = await this.getOrCreateBaseline(request)
        return this.runDetectionAlgorithms(data, baseline, request.detectionConfig, request.context)
      },
      updateBaseline: async (data: any[]) => {
        // Update baseline with new data
        const baseline = await this.createBaseline(request.dataSource)
        const cacheKey = `baseline_${request.organizationId}_${request.dataSource.sourceId}`
        this.baselineCache.set(cacheKey, baseline)
      },
      getStatus: () => ({
        isRunning: true,
        lastProcessed: new Date(),
        totalProcessed: 0,
        errorRate: 0.02,
        latency: 50,
        queueSize: 0
      })
    }
  }
}

// Export singleton instance
export const anomalyDetectionService = new AnomalyDetectionService()