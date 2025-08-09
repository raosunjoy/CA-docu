import { PrismaClient } from '@prisma/client'

export type DataLayerTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface DataRecord {
  id: string
  tier: DataLayerTier
  source: string
  timestamp: Date
  data: Record<string, unknown>
  metadata: {
    schema: string
    version: string
    quality: number
    lineage: string[]
    tags: string[]
  }
  relationships: Array<{
    type: 'parent' | 'child' | 'sibling'
    targetId: string
    relationship: string
  }>
}

export interface DataQuery {
  tier?: DataLayerTier
  source?: string
  dateRange?: { start: Date; end: Date }
  tags?: string[]
  quality?: { min: number; max?: number }
  limit?: number
  offset?: number
  orderBy?: { field: string; direction: 'asc' | 'desc' }
}

export interface VectorData {
  id: string
  content: string
  embedding: number[]
  metadata: Record<string, unknown>
  tier: DataLayerTier
}

export interface TimeSeriesData {
  timestamp: Date
  metric: string
  value: number
  tags: Record<string, string>
  tier: DataLayerTier
}

export class UnifiedDataLayer {
  private prisma: PrismaClient

  constructor() {
    // Initialize Prisma Client with proper error handling
    try {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
        errorFormat: 'pretty'
      })
      
      // Test connection on initialization
      this.testConnection()
    } catch (error) {
      console.error('Failed to initialize Prisma client:', error)
      throw error
    }
  }

  private async testConnection(): Promise<void> {
    try {
      await this.prisma.$connect()
      console.log('✅ UnifiedDataLayer: Database connection established')
    } catch (error) {
      console.error('❌ UnifiedDataLayer: Failed to connect to database:', error)
      // Don't throw here to avoid breaking the app initialization
    }
  }

  // Bronze Layer: Raw data ingestion
  async ingestRawData(
    source: string,
    data: Record<string, unknown>,
    metadata?: Partial<DataRecord['metadata']>,
    organizationId = 'demo-org' // TODO: Get from context
  ): Promise<string> {
    // Validate input data
    if (!source || typeof source !== 'string') {
      throw new Error('Source is required and must be a string')
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('Data is required and must be an object')
    }

    // Validate data size (prevent extremely large payloads)
    const dataSize = JSON.stringify(data).length
    if (dataSize > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Data payload too large. Maximum size: 10MB')
    }

    // Calculate quality score based on data completeness
    const qualityScore = this.calculateDataQuality(data)

    const record: DataRecord = {
      id: `bronze_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier: 'bronze',
      source,
      timestamp: new Date(),
      data,
      metadata: {
        schema: metadata?.schema || 'raw',
        version: metadata?.version || '1.0',
        quality: qualityScore,
        lineage: [source],
        tags: metadata?.tags || [],
        validation: {
          validated: true,
          size: dataSize,
          fields: Object.keys(data).length
        },
        ...metadata
      },
      relationships: []
    }

    await this.storeRecord(record, organizationId)
    return record.id
  }

  private calculateDataQuality(data: Record<string, unknown>): number {
    const fields = Object.keys(data)
    const nonNullFields = fields.filter(key => data[key] !== null && data[key] !== undefined && data[key] !== '')
    const completeness = fields.length > 0 ? nonNullFields.length / fields.length : 0
    
    // Base quality score for bronze tier (0.3) + completeness bonus (up to 0.4)
    return Math.min(0.3 + (completeness * 0.4), 0.7)
  }

  // Silver Layer: Cleaned and validated data
  async promoteToSilver(
    bronzeId: string,
    cleaningRules: Array<{
      field: string
      rule: 'normalize' | 'validate' | 'transform' | 'enrich'
      parameters?: Record<string, unknown>
    }>
  ): Promise<string> {
    const bronzeRecord = await this.getRecord(bronzeId)
    if (!bronzeRecord || bronzeRecord.tier !== 'bronze') {
      throw new Error('Bronze record not found or invalid tier')
    }

    const cleanedData = await this.applyCleaningRules(bronzeRecord.data, cleaningRules)
    
    const silverRecord: DataRecord = {
      id: `silver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier: 'silver',
      source: bronzeRecord.source,
      timestamp: new Date(),
      data: cleanedData,
      metadata: {
        ...bronzeRecord.metadata,
        schema: 'cleaned',
        quality: 0.7, // Cleaned data has higher quality
        lineage: [...bronzeRecord.metadata.lineage, bronzeId]
      },
      relationships: [{
        type: 'parent',
        targetId: bronzeId,
        relationship: 'cleaned_from'
      }]
    }

    await this.storeRecord(silverRecord)
    return silverRecord.id
  }

  // Gold Layer: Aggregated and analyzed data
  async promoteToGold(
    silverIds: string[],
    aggregationRules: Array<{
      type: 'sum' | 'avg' | 'count' | 'group' | 'join'
      field?: string
      groupBy?: string
      joinKey?: string
      customFunction?: (data: Record<string, unknown>[]) => Record<string, unknown>
    }>
  ): Promise<string> {
    const silverRecords = await Promise.all(
      silverIds.map(id => this.getRecord(id))
    )

    const validRecords = silverRecords.filter(
      (record): record is DataRecord => 
        record !== null && record.tier === 'silver'
    )

    if (validRecords.length !== silverIds.length) {
      throw new Error('Some silver records not found or invalid tier')
    }

    const aggregatedData = await this.applyAggregationRules(
      validRecords.map(r => r.data),
      aggregationRules
    )

    const goldRecord: DataRecord = {
      id: `gold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier: 'gold',
      source: 'aggregated',
      timestamp: new Date(),
      data: aggregatedData,
      metadata: {
        schema: 'aggregated',
        version: '1.0',
        quality: 0.9, // Aggregated data has high quality
        lineage: validRecords.flatMap(r => r.metadata.lineage),
        tags: Array.from(new Set(validRecords.flatMap(r => r.metadata.tags)))
      },
      relationships: silverIds.map(id => ({
        type: 'parent' as const,
        targetId: id,
        relationship: 'aggregated_from'
      }))
    }

    await this.storeRecord(goldRecord)
    return goldRecord.id
  }

  // Platinum Layer: AI-enhanced intelligent insights
  async promoteToplatinum(
    goldIds: string[],
    aiEnhancements: Array<{
      type: 'prediction' | 'classification' | 'clustering' | 'insight' | 'recommendation'
      model?: string
      parameters?: Record<string, unknown>
      confidence?: number
    }>
  ): Promise<string> {
    const goldRecords = await Promise.all(
      goldIds.map(id => this.getRecord(id))
    )

    const validRecords = goldRecords.filter(
      (record): record is DataRecord => 
        record !== null && record.tier === 'gold'
    )

    if (validRecords.length !== goldIds.length) {
      throw new Error('Some gold records not found or invalid tier')
    }

    const enhancedData = await this.applyAIEnhancements(
      validRecords.map(r => r.data),
      aiEnhancements
    )

    const platinumRecord: DataRecord = {
      id: `platinum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier: 'platinum',
      source: 'ai_enhanced',
      timestamp: new Date(),
      data: enhancedData,
      metadata: {
        schema: 'ai_enhanced',
        version: '1.0',
        quality: 1.0, // AI-enhanced data has maximum quality
        lineage: validRecords.flatMap(r => r.metadata.lineage),
        tags: Array.from(new Set(validRecords.flatMap(r => r.metadata.tags)))
      },
      relationships: goldIds.map(id => ({
        type: 'parent' as const,
        targetId: id,
        relationship: 'ai_enhanced_from'
      }))
    }

    await this.storeRecord(platinumRecord)
    return platinumRecord.id
  }

  // Vector Database for AI embeddings
  async storeVectorData(vectorData: VectorData): Promise<void> {
    try {
      await this.prisma.vectorDataStore.upsert({
        where: {
          organizationId_contentId: {
            organizationId: 'demo-org', // TODO: Get from context
            contentId: vectorData.id
          }
        },
        update: {
          content: vectorData.content,
          embedding: vectorData.embedding,
          tier: vectorData.tier.toUpperCase() as any,
          metadata: vectorData.metadata
        },
        create: {
          organizationId: 'demo-org', // TODO: Get from context
          contentId: vectorData.id,
          content: vectorData.content,
          embedding: vectorData.embedding,
          tier: vectorData.tier.toUpperCase() as any,
          metadata: vectorData.metadata
        }
      })
      console.log(`Stored vector data: ${vectorData.id}`)
    } catch (error) {
      console.error(`Failed to store vector data:`, error)
      throw error
    }
  }

  async searchVectorData(
    queryEmbedding: number[],
    tier?: DataLayerTier,
    limit = 10
  ): Promise<Array<{ data: VectorData; similarity: number }>> {
    try {
      const candidates = await this.prisma.vectorDataStore.findMany({
        where: {
          organizationId: 'demo-org', // TODO: Get from context
          ...(tier && { tier: tier.toUpperCase() as any })
        },
        take: Math.min(limit * 5, 100) // Get more candidates for better similarity search
      })
      
      const results = candidates
        .map(record => {
          const vectorData: VectorData = {
            id: record.contentId,
            content: record.content,
            embedding: record.embedding as number[],
            metadata: record.metadata as Record<string, unknown>,
            tier: record.tier.toLowerCase() as DataLayerTier
          }
          
          return {
            data: vectorData,
            similarity: this.calculateCosineSimilarity(queryEmbedding, vectorData.embedding)
          }
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)

      return results
    } catch (error) {
      console.error('Failed to search vector data:', error)
      return []
    }
  }

  // Time Series Database
  async storeTimeSeriesData(data: TimeSeriesData): Promise<void> {
    try {
      await this.prisma.timeSeriesDataStore.upsert({
        where: {
          organizationId_metric_timestamp: {
            organizationId: 'demo-org', // TODO: Get from context
            metric: data.metric,
            timestamp: data.timestamp
          }
        },
        update: {
          value: data.value,
          tags: data.tags,
          tier: data.tier.toUpperCase() as any,
          metadata: { updated: true }
        },
        create: {
          organizationId: 'demo-org', // TODO: Get from context
          metric: data.metric,
          timestamp: data.timestamp,
          value: data.value,
          tags: data.tags,
          tier: data.tier.toUpperCase() as any,
          metadata: { created: true }
        }
      })
      console.log(`Stored time series data: ${data.metric} at ${data.timestamp.toISOString()}`)
    } catch (error) {
      console.error('Failed to store time series data:', error)
      throw error
    }
  }

  async getTimeSeriesData(
    metric: string,
    dateRange?: { start: Date; end: Date },
    tier?: DataLayerTier
  ): Promise<TimeSeriesData[]> {
    try {
      const records = await this.prisma.timeSeriesDataStore.findMany({
        where: {
          organizationId: 'demo-org', // TODO: Get from context
          metric,
          ...(tier && { tier: tier.toUpperCase() as any }),
          ...(dateRange && {
            timestamp: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          })
        },
        orderBy: {
          timestamp: 'asc'
        }
      })

      return records.map(record => ({
        timestamp: record.timestamp,
        metric: record.metric,
        value: Number(record.value),
        tags: record.tags as Record<string, string>,
        tier: record.tier.toLowerCase() as DataLayerTier
      }))
    } catch (error) {
      console.error('Failed to get time series data:', error)
      return []
    }
  }

  // Knowledge Graph
  async addKnowledgeRelation(fromEntity: string, toEntity: string, relation: string, weight = 1.0): Promise<void> {
    try {
      await this.prisma.knowledgeGraphEdge.upsert({
        where: {
          organizationId_fromEntity_toEntity_relationship: {
            organizationId: 'demo-org', // TODO: Get from context
            fromEntity,
            toEntity,
            relationship: relation
          }
        },
        update: {
          weight: weight,
          metadata: { updated: true }
        },
        create: {
          organizationId: 'demo-org', // TODO: Get from context
          fromEntity,
          toEntity,
          relationship: relation,
          weight: weight,
          metadata: { created: true }
        }
      })
      console.log(`Added knowledge relation: ${fromEntity} -[${relation}]-> ${toEntity}`)
    } catch (error) {
      console.error('Failed to add knowledge relation:', error)
      throw error
    }
  }

  async getKnowledgeRelations(entity: string, relation?: string): Promise<string[]> {
    try {
      const edges = await this.prisma.knowledgeGraphEdge.findMany({
        where: {
          organizationId: 'demo-org', // TODO: Get from context
          fromEntity: entity,
          ...(relation && { relationship: relation })
        },
        orderBy: {
          weight: 'desc'
        }
      })

      return edges.map(edge => edge.toEntity)
    } catch (error) {
      console.error('Failed to get knowledge relations:', error)
      return []
    }
  }

  // Feature Store for ML models
  async storeFeature(key: string, value: unknown, dataType = 'object'): Promise<void> {
    try {
      await this.prisma.featureStore.upsert({
        where: {
          organizationId_featureKey_version: {
            organizationId: 'demo-org', // TODO: Get from context
            featureKey: key,
            version: 1
          }
        },
        update: {
          featureValue: value,
          dataType,
          metadata: { updated: new Date().toISOString() }
        },
        create: {
          organizationId: 'demo-org', // TODO: Get from context
          featureKey: key,
          featureValue: value,
          dataType,
          version: 1,
          metadata: { created: new Date().toISOString() }
        }
      })
      console.log(`Stored feature: ${key}`)
    } catch (error) {
      console.error('Failed to store feature:', error)
      throw error
    }
  }

  async getFeature(key: string): Promise<unknown> {
    try {
      const feature = await this.prisma.featureStore.findFirst({
        where: {
          organizationId: 'demo-org', // TODO: Get from context
          featureKey: key
        },
        orderBy: {
          version: 'desc'
        }
      })
      
      return feature?.featureValue || null
    } catch (error) {
      console.error('Failed to get feature:', error)
      return null
    }
  }

  async getFeatures(keys: string[]): Promise<Record<string, unknown>> {
    try {
      const features = await this.prisma.featureStore.findMany({
        where: {
          organizationId: 'demo-org', // TODO: Get from context
          featureKey: { in: keys }
        },
        orderBy: {
          version: 'desc'
        }
      })

      const result: Record<string, unknown> = {}
      for (const feature of features) {
        if (!result[feature.featureKey]) {
          result[feature.featureKey] = feature.featureValue
        }
      }
      
      // Ensure all requested keys are present
      for (const key of keys) {
        if (!(key in result)) {
          result[key] = null
        }
      }
      
      return result
    } catch (error) {
      console.error('Failed to get features:', error)
      return Object.fromEntries(keys.map(key => [key, null]))
    }
  }

  // Query Interface
  async queryData(query: DataQuery): Promise<DataRecord[]> {
    try {
      const dbRecords = await this.prisma.unifiedDataRecord.findMany({
        where: {
          organizationId: 'demo-org', // TODO: Get from context
          ...(query.tier && { tier: query.tier.toUpperCase() as any }),
          ...(query.source && { source: query.source }),
          ...(query.dateRange && {
            timestamp: {
              gte: query.dateRange.start,
              lte: query.dateRange.end
            }
          }),
          ...(query.tags && query.tags.length > 0 && {
            metadata: {
              path: ['tags'],
              array_contains: query.tags
            }
          }),
          ...(query.quality && {
            metadata: {
              path: ['quality'],
              gte: query.quality.min,
              ...(query.quality.max && { lte: query.quality.max })
            }
          })
        },
        orderBy: query.orderBy ? {
          [query.orderBy.field]: query.orderBy.direction
        } : {
          timestamp: 'desc'
        },
        skip: query.offset || 0,
        take: query.limit || 50
      })

      return dbRecords.map(record => ({
        id: record.id,
        tier: record.tier.toLowerCase() as DataLayerTier,
        source: record.source,
        timestamp: record.timestamp,
        data: record.data as Record<string, unknown>,
        metadata: record.metadata as any,
        relationships: record.relationships as any
      }))
    } catch (error) {
      console.error('Failed to query data:', error)
      return []
    }
  }

  // Metadata Management
  async getDataLineage(recordId: string): Promise<string[]> {
    const record = await this.getRecord(recordId)
    return record?.metadata.lineage || []
  }

  async getDataQuality(recordId: string): Promise<number> {
    const record = await this.getRecord(recordId)
    return record?.metadata.quality || 0
  }

  // Private helper methods
  private async storeRecord(record: DataRecord, organizationId = 'demo-org'): Promise<void> {
    try {
      await this.prisma.unifiedDataRecord.create({
        data: {
          id: record.id,
          organizationId,
          tier: record.tier.toUpperCase() as any,
          source: record.source,
          timestamp: record.timestamp,
          data: record.data,
          metadata: record.metadata,
          relationships: record.relationships,
          checksum: this.calculateChecksum(JSON.stringify(record.data))
        }
      })
      console.log(`✅ Stored ${record.tier} record: ${record.id}`)
    } catch (error) {
      console.error(`❌ Failed to store ${record.tier} record:`, error)
      throw error
    }
  }

  private async getRecord(id: string): Promise<DataRecord | null> {
    try {
      const dbRecord = await this.prisma.unifiedDataRecord.findUnique({
        where: { id }
      })
      
      if (!dbRecord) return null

      return {
        id: dbRecord.id,
        tier: dbRecord.tier.toLowerCase() as DataLayerTier,
        source: dbRecord.source,
        timestamp: dbRecord.timestamp,
        data: dbRecord.data as Record<string, unknown>,
        metadata: dbRecord.metadata as any,
        relationships: dbRecord.relationships as any
      }
    } catch (error) {
      console.error(`Failed to retrieve record ${id}:`, error)
      return null
    }
  }

  private calculateChecksum(data: string): string {
    // Simple checksum using Node.js crypto
    const crypto = require('crypto')
    return crypto.createHash('md5').update(data).digest('hex')
  }

  private async applyCleaningRules(
    data: Record<string, unknown>,
    rules: Array<{
      field: string
      rule: 'normalize' | 'validate' | 'transform' | 'enrich'
      parameters?: Record<string, unknown>
    }>
  ): Promise<Record<string, unknown>> {
    const cleanedData = { ...data }
    
    for (const rule of rules) {
      switch (rule.rule) {
        case 'normalize':
          // Normalize data format
          break
        case 'validate':
          // Validate data integrity
          break
        case 'transform':
          // Transform data structure
          break
        case 'enrich':
          // Enrich with additional data
          break
      }
    }
    
    return cleanedData
  }

  private async applyAggregationRules(
    dataArray: Record<string, unknown>[],
    rules: Array<{
      type: 'sum' | 'avg' | 'count' | 'group' | 'join'
      field?: string
      groupBy?: string
      joinKey?: string
      customFunction?: (data: Record<string, unknown>[]) => Record<string, unknown>
    }>
  ): Promise<Record<string, unknown>> {
    let result: Record<string, unknown> = {}
    
    for (const rule of rules) {
      switch (rule.type) {
        case 'sum':
          if (rule.field) {
            result[`${rule.field}_sum`] = dataArray
              .reduce((sum, item) => sum + (Number(item[rule.field]) || 0), 0)
          }
          break
        case 'avg':
          if (rule.field) {
            const values = dataArray.map(item => Number(item[rule.field]) || 0)
            result[`${rule.field}_avg`] = values.reduce((sum, val) => sum + val, 0) / values.length
          }
          break
        case 'count':
          result.count = dataArray.length
          break
        case 'customFunction':
          if (rule.customFunction) {
            result = { ...result, ...rule.customFunction(dataArray) }
          }
          break
      }
    }
    
    return result
  }

  private async applyAIEnhancements(
    dataArray: Record<string, unknown>[],
    enhancements: Array<{
      type: 'prediction' | 'classification' | 'clustering' | 'insight' | 'recommendation'
      model?: string
      parameters?: Record<string, unknown>
      confidence?: number
    }>
  ): Promise<Record<string, unknown>> {
    const enhanced: Record<string, unknown> = {
      original_data: dataArray
    }
    
    for (const enhancement of enhancements) {
      switch (enhancement.type) {
        case 'prediction':
          enhanced.predictions = await this.generatePredictions(dataArray)
          break
        case 'classification':
          enhanced.classifications = await this.generateClassifications(dataArray)
          break
        case 'clustering':
          enhanced.clusters = await this.generateClusters(dataArray)
          break
        case 'insight':
          enhanced.insights = await this.generateInsights(dataArray)
          break
        case 'recommendation':
          enhanced.recommendations = await this.generateRecommendations(dataArray)
          break
      }
    }
    
    return enhanced
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  private async generatePredictions(data: Record<string, unknown>[]): Promise<unknown> {
    // Placeholder for AI prediction logic
    return { predictions: 'generated' }
  }

  private async generateClassifications(data: Record<string, unknown>[]): Promise<unknown> {
    // Placeholder for AI classification logic
    return { classifications: 'generated' }
  }

  private async generateClusters(data: Record<string, unknown>[]): Promise<unknown> {
    // Placeholder for AI clustering logic
    return { clusters: 'generated' }
  }

  private async generateInsights(data: Record<string, unknown>[]): Promise<unknown> {
    // Placeholder for AI insight generation
    return { insights: 'generated' }
  }

  private async generateRecommendations(data: Record<string, unknown>[]): Promise<unknown> {
    // Placeholder for AI recommendation logic
    return { recommendations: 'generated' }
  }

  async cleanup(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

export const unifiedDataLayer = new UnifiedDataLayer()