import { unifiedDataLayer, DataLayerTier } from './data-layer'
import { unifiedMonitoring } from './monitoring'

export interface ProcessingRule {
  id: string
  name: string
  type: 'cleaning' | 'transformation' | 'aggregation' | 'ai-enhancement'
  input: DataLayerTier
  output: DataLayerTier
  condition?: (data: Record<string, unknown>) => boolean
  processor: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  priority: number
  enabled: boolean
}

export interface StreamProcessor {
  id: string
  name: string
  source: string
  batchSize: number
  processor: (batch: Record<string, unknown>[]) => Promise<void>
  enabled: boolean
}

export interface DataQualityCheck {
  name: string
  check: (data: Record<string, unknown>) => { passed: boolean; score: number; issues: string[] }
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export class UnifiedDataProcessingPipeline {
  private processingRules: ProcessingRule[] = []
  private streamProcessors: StreamProcessor[] = []
  private qualityChecks: DataQualityCheck[] = []
  private processingQueue: Array<{
    id: string
    data: Record<string, unknown>
    tier: DataLayerTier
    timestamp: Date
    retryCount: number
  }> = []
  private isProcessing = false

  constructor() {
    this.initializeDefaultRules()
    this.initializeQualityChecks()
    this.startProcessing()
  }

  // Real-time stream processing
  async processStreamData(source: string, data: Record<string, unknown>): Promise<void> {
    const timestamp = Date.now()
    
    unifiedMonitoring.recordMetric('stream_data_received', 1, { source })
    unifiedMonitoring.log('info', 'data-pipeline', `Processing stream data from ${source}`)

    try {
      // Ingest to bronze layer
      const bronzeId = await unifiedDataLayer.ingestRawData(source, data)
      
      // Apply quality checks
      const qualityResults = await this.runQualityChecks(data)
      if (qualityResults.overallScore < 0.5) {
        unifiedMonitoring.log('warn', 'data-pipeline', 
          `Low quality data detected: ${qualityResults.overallScore}`, 
          { bronzeId, issues: qualityResults.issues }
        )
      }

      // Queue for processing
      this.processingQueue.push({
        id: bronzeId,
        data,
        tier: 'bronze',
        timestamp: new Date(),
        retryCount: 0
      })

      unifiedMonitoring.recordMetric('stream_processing_time', Date.now() - timestamp, { source })
      
    } catch (error) {
      unifiedMonitoring.log('error', 'data-pipeline', 
        `Stream processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { source, error }
      )
      throw error
    }
  }

  // Batch processing engine
  async processBatch(data: Record<string, unknown>[], source: string): Promise<string[]> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    
    unifiedMonitoring.log('info', 'data-pipeline', 
      `Starting batch processing: ${data.length} records from ${source}`, 
      { batchId }
    )

    const processedIds: string[] = []

    try {
      for (const record of data) {
        const recordId = await this.processStreamData(source, record)
        processedIds.push(recordId as string)
      }

      const processingTime = Date.now() - startTime
      unifiedMonitoring.recordMetric('batch_processing_time', processingTime, { source })
      unifiedMonitoring.recordMetric('batch_size', data.length, { source })

      unifiedMonitoring.log('info', 'data-pipeline', 
        `Batch processing completed: ${processedIds.length} records in ${processingTime}ms`,
        { batchId, source, recordCount: processedIds.length }
      )

      return processedIds
      
    } catch (error) {
      unifiedMonitoring.log('error', 'data-pipeline', 
        `Batch processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { batchId, source, error }
      )
      throw error
    }
  }

  // Data preprocessing with AI enhancement
  async preprocessForAI(data: Record<string, unknown>, targetModel: string): Promise<Record<string, unknown>> {
    unifiedMonitoring.log('debug', 'data-pipeline', `Preprocessing data for AI model: ${targetModel}`)

    let processed = { ...data }

    // Apply model-specific preprocessing
    switch (targetModel) {
      case 'document-classifier':
        processed = await this.preprocessForDocumentClassification(processed)
        break
      case 'financial-analyzer':
        processed = await this.preprocessForFinancialAnalysis(processed)
        break
      case 'task-predictor':
        processed = await this.preprocessForTaskPrediction(processed)
        break
      default:
        processed = await this.preprocessGeneral(processed)
    }

    unifiedMonitoring.recordMetric('ai_preprocessing_completed', 1, { model: targetModel })
    return processed
  }

  // Data preparation for analytics
  async prepareForAnalytics(data: Record<string, unknown>[], analysisType: string): Promise<Record<string, unknown>[]> {
    unifiedMonitoring.log('debug', 'data-pipeline', `Preparing data for analytics: ${analysisType}`)

    let prepared = [...data]

    // Apply analysis-specific preparation
    switch (analysisType) {
      case 'performance-analysis':
        prepared = await this.prepareForPerformanceAnalysis(prepared)
        break
      case 'client-analysis':
        prepared = await this.prepareForClientAnalysis(prepared)
        break
      case 'financial-analysis':
        prepared = await this.prepareForFinancialAnalysis(prepared)
        break
      default:
        prepared = await this.prepareGeneral(prepared)
    }

    unifiedMonitoring.recordMetric('analytics_preparation_completed', 1, { type: analysisType })
    return prepared
  }

  // Quality engine with AI enhancement
  async runQualityChecks(data: Record<string, unknown>): Promise<{
    overallScore: number
    issues: string[]
    checkResults: Array<{ name: string; passed: boolean; score: number; issues: string[] }>
  }> {
    const results = []
    let totalScore = 0
    const allIssues: string[] = []

    for (const check of this.qualityChecks) {
      const result = check.check(data)
      results.push({ name: check.name, ...result })
      totalScore += result.score
      allIssues.push(...result.issues)

      if (!result.passed) {
        unifiedMonitoring.log(
          check.severity === 'critical' ? 'error' : 'warn',
          'data-pipeline',
          `Quality check failed: ${check.name}`,
          { issues: result.issues, severity: check.severity }
        )
      }
    }

    const overallScore = this.qualityChecks.length > 0 ? totalScore / this.qualityChecks.length : 1

    unifiedMonitoring.recordMetric('data_quality_score', overallScore)
    
    return {
      overallScore,
      issues: allIssues,
      checkResults: results
    }
  }

  // Processing rule management
  addProcessingRule(rule: ProcessingRule): void {
    this.processingRules.push(rule)
    this.processingRules.sort((a, b) => b.priority - a.priority)
    
    unifiedMonitoring.log('info', 'data-pipeline', `Added processing rule: ${rule.name}`, { ruleId: rule.id })
  }

  removeProcessingRule(ruleId: string): boolean {
    const index = this.processingRules.findIndex(rule => rule.id === ruleId)
    if (index !== -1) {
      const rule = this.processingRules.splice(index, 1)[0]
      unifiedMonitoring.log('info', 'data-pipeline', `Removed processing rule: ${rule.name}`, { ruleId })
      return true
    }
    return false
  }

  // Stream processor management
  addStreamProcessor(processor: StreamProcessor): void {
    this.streamProcessors.push(processor)
    unifiedMonitoring.log('info', 'data-pipeline', `Added stream processor: ${processor.name}`, { processorId: processor.id })
  }

  removeStreamProcessor(processorId: string): boolean {
    const index = this.streamProcessors.findIndex(p => p.id === processorId)
    if (index !== -1) {
      const processor = this.streamProcessors.splice(index, 1)[0]
      unifiedMonitoring.log('info', 'data-pipeline', `Removed stream processor: ${processor.name}`, { processorId })
      return true
    }
    return false
  }

  // Processing queue management
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    const processQueue = async () => {
      while (this.processingQueue.length > 0) {
        const item = this.processingQueue.shift()
        if (!item) continue

        try {
          await this.processQueueItem(item)
        } catch (error) {
          unifiedMonitoring.log('error', 'data-pipeline', 
            `Queue item processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { itemId: item.id, retryCount: item.retryCount }
          )

          // Retry logic
          if (item.retryCount < 3) {
            item.retryCount++
            this.processingQueue.push(item) // Re-queue for retry
          }
        }
      }

      // Continue processing after a brief pause
      setTimeout(processQueue, 1000)
    }

    processQueue()
  }

  private async processQueueItem(item: {
    id: string
    data: Record<string, unknown>
    tier: DataLayerTier
    timestamp: Date
    retryCount: number
  }): Promise<void> {
    const applicableRules = this.processingRules.filter(rule => 
      rule.enabled &&
      rule.input === item.tier &&
      (!rule.condition || rule.condition(item.data))
    )

    for (const rule of applicableRules) {
      try {
        const processedData = await rule.processor(item.data)
        
        // Promote to next tier based on rule output
        switch (rule.output) {
          case 'silver':
            await unifiedDataLayer.promoteToSilver(item.id, [])
            break
          case 'gold':
            // This would need silver records to aggregate
            break
          case 'platinum':
            // This would need gold records to enhance
            break
        }

        unifiedMonitoring.recordMetric('rule_processing_completed', 1, { 
          rule: rule.name,
          inputTier: rule.input,
          outputTier: rule.output
        })
        
      } catch (error) {
        unifiedMonitoring.log('error', 'data-pipeline',
          `Rule processing failed: ${rule.name}`,
          { ruleId: rule.id, itemId: item.id, error }
        )
      }
    }
  }

  private initializeDefaultRules(): void {
    // Bronze to Silver cleaning rule
    this.addProcessingRule({
      id: 'bronze-to-silver-cleaning',
      name: 'Bronze to Silver Data Cleaning',
      type: 'cleaning',
      input: 'bronze',
      output: 'silver',
      processor: async (data) => {
        // Basic data cleaning
        const cleaned = { ...data }
        
        // Remove null/undefined values
        Object.keys(cleaned).forEach(key => {
          if (cleaned[key] === null || cleaned[key] === undefined) {
            delete cleaned[key]
          }
        })
        
        // Normalize string values
        Object.keys(cleaned).forEach(key => {
          if (typeof cleaned[key] === 'string') {
            cleaned[key] = (cleaned[key] as string).trim()
          }
        })
        
        return cleaned
      },
      priority: 10,
      enabled: true
    })

    // Silver to Gold aggregation rule
    this.addProcessingRule({
      id: 'silver-to-gold-aggregation',
      name: 'Silver to Gold Data Aggregation',
      type: 'aggregation',
      input: 'silver',
      output: 'gold',
      processor: async (data) => {
        // Basic aggregation logic
        return {
          ...data,
          processed_at: new Date().toISOString(),
          quality_score: 0.8
        }
      },
      priority: 8,
      enabled: true
    })
  }

  private initializeQualityChecks(): void {
    this.qualityChecks = [
      {
        name: 'Required Fields Check',
        check: (data) => {
          const requiredFields = ['id', 'timestamp']
          const missing = requiredFields.filter(field => !(field in data))
          return {
            passed: missing.length === 0,
            score: missing.length === 0 ? 1 : 0.5,
            issues: missing.map(field => `Missing required field: ${field}`)
          }
        },
        severity: 'high'
      },
      {
        name: 'Data Type Validation',
        check: (data) => {
          const issues: string[] = []
          let score = 1

          Object.entries(data).forEach(([key, value]) => {
            if (key.includes('date') || key.includes('timestamp')) {
              if (typeof value !== 'string' && !(value instanceof Date)) {
                issues.push(`${key} should be a date/string`)
                score -= 0.1
              }
            }
          })

          return {
            passed: issues.length === 0,
            score: Math.max(0, score),
            issues
          }
        },
        severity: 'medium'
      }
    ]
  }

  private async preprocessForDocumentClassification(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...data,
      preprocessed_for: 'document-classifier',
      features: ['text_length', 'word_count', 'sentence_count']
    }
  }

  private async preprocessForFinancialAnalysis(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...data,
      preprocessed_for: 'financial-analyzer',
      normalized_amounts: true,
      currency_converted: true
    }
  }

  private async preprocessForTaskPrediction(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...data,
      preprocessed_for: 'task-predictor',
      temporal_features: true,
      user_context: true
    }
  }

  private async preprocessGeneral(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      ...data,
      preprocessed: true,
      preprocessing_timestamp: new Date().toISOString()
    }
  }

  private async prepareForPerformanceAnalysis(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    return data.map(record => ({
      ...record,
      prepared_for: 'performance-analysis'
    }))
  }

  private async prepareForClientAnalysis(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    return data.map(record => ({
      ...record,
      prepared_for: 'client-analysis'
    }))
  }

  private async prepareForFinancialAnalysis(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    return data.map(record => ({
      ...record,
      prepared_for: 'financial-analysis'
    }))
  }

  private async prepareGeneral(data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    return data.map(record => ({
      ...record,
      prepared: true
    }))
  }

  // Status and monitoring
  getStatus(): {
    isProcessing: boolean
    queueLength: number
    activeRules: number
    activeProcessors: number
    qualityChecks: number
  } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
      activeRules: this.processingRules.filter(r => r.enabled).length,
      activeProcessors: this.streamProcessors.filter(p => p.enabled).length,
      qualityChecks: this.qualityChecks.length
    }
  }

  getProcessingRules(): ProcessingRule[] {
    return [...this.processingRules]
  }

  getStreamProcessors(): StreamProcessor[] {
    return [...this.streamProcessors]
  }

  getQualityChecks(): DataQualityCheck[] {
    return [...this.qualityChecks]
  }
}

export const unifiedDataPipeline = new UnifiedDataProcessingPipeline()