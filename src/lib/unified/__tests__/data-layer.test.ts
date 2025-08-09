import { UnifiedDataLayer, DataLayerTier } from '../data-layer'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $disconnect: jest.fn()
  }))
}))

describe('UnifiedDataLayer', () => {
  let dataLayer: UnifiedDataLayer

  beforeEach(() => {
    dataLayer = new UnifiedDataLayer()
  })

  afterEach(async () => {
    await dataLayer.cleanup()
  })

  describe('Bronze Layer - Raw Data Ingestion', () => {
    it('should ingest raw data successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      const testData = {
        clientName: 'ABC Corp',
        revenue: 100000,
        documents: ['file1.pdf', 'file2.xlsx']
      }

      const recordId = await dataLayer.ingestRawData('client-system', testData)
      
      expect(recordId).toMatch(/^bronze_\d+_[a-z0-9]+$/)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Storing bronze record: bronze_\d+_[a-z0-9]+/)
      )
      
      consoleSpy.mockRestore()
    })

    it('should include metadata in raw data ingestion', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      const testData = { test: 'data' }
      const metadata = {
        tags: ['test', 'demo'],
        version: '2.0'
      }

      const recordId = await dataLayer.ingestRawData('test-source', testData, metadata)
      
      expect(recordId).toMatch(/^bronze_\d+_[a-z0-9]+$/)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Silver Layer - Data Cleaning', () => {
    it('should promote bronze data to silver with cleaning rules', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      // Mock the getRecord method to return a bronze record
      jest.spyOn(dataLayer as any, 'getRecord').mockResolvedValue({
        id: 'bronze_123',
        tier: 'bronze',
        source: 'test-source',
        timestamp: new Date(),
        data: { rawValue: '100.50' },
        metadata: {
          schema: 'raw',
          version: '1.0',
          quality: 0.3,
          lineage: ['test-source'],
          tags: []
        },
        relationships: []
      })

      const cleaningRules = [
        { field: 'rawValue', rule: 'normalize' as const },
        { field: 'rawValue', rule: 'validate' as const }
      ]

      const silverRecordId = await dataLayer.promoteToSilver('bronze_123', cleaningRules)
      
      expect(silverRecordId).toMatch(/^silver_\d+_[a-z0-9]+$/)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Storing silver record: silver_\d+_[a-z0-9]+/)
      )
      
      consoleSpy.mockRestore()
    })

    it('should throw error for invalid bronze record', async () => {
      jest.spyOn(dataLayer as any, 'getRecord').mockResolvedValue(null)

      await expect(
        dataLayer.promoteToSilver('invalid_id', [])
      ).rejects.toThrow('Bronze record not found or invalid tier')
    })
  })

  describe('Gold Layer - Data Aggregation', () => {
    it('should promote silver data to gold with aggregation rules', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      const mockSilverRecord = {
        id: 'silver_123',
        tier: 'silver' as DataLayerTier,
        source: 'test-source',
        timestamp: new Date(),
        data: { value: 100, category: 'A' },
        metadata: {
          schema: 'cleaned',
          version: '1.0',
          quality: 0.7,
          lineage: ['test-source', 'bronze_123'],
          tags: ['test']
        },
        relationships: []
      }

      jest.spyOn(dataLayer as any, 'getRecord').mockResolvedValue(mockSilverRecord)

      const aggregationRules = [
        { type: 'sum' as const, field: 'value' },
        { type: 'count' as const }
      ]

      const goldRecordId = await dataLayer.promoteToGold(['silver_123'], aggregationRules)
      
      expect(goldRecordId).toMatch(/^gold_\d+_[a-z0-9]+$/)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Storing gold record: gold_\d+_[a-z0-9]+/)
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle multiple silver records for aggregation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      const mockSilverRecord1 = {
        id: 'silver_123',
        tier: 'silver' as DataLayerTier,
        source: 'test-source',
        data: { value: 100 },
        metadata: { lineage: ['bronze_123'], tags: ['tag1'], schema: 'cleaned', version: '1.0', quality: 0.7 }
      }

      const mockSilverRecord2 = {
        id: 'silver_456',
        tier: 'silver' as DataLayerTier,
        source: 'test-source',
        data: { value: 200 },
        metadata: { lineage: ['bronze_456'], tags: ['tag2'], schema: 'cleaned', version: '1.0', quality: 0.7 }
      }

      jest.spyOn(dataLayer as any, 'getRecord')
        .mockImplementation((id: string) => {
          if (id === 'silver_123') return Promise.resolve(mockSilverRecord1)
          if (id === 'silver_456') return Promise.resolve(mockSilverRecord2)
          return Promise.resolve(null)
        })

      const goldRecordId = await dataLayer.promoteToGold(
        ['silver_123', 'silver_456'],
        [{ type: 'sum', field: 'value' }]
      )
      
      expect(goldRecordId).toMatch(/^gold_\d+_[a-z0-9]+$/)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Platinum Layer - AI Enhancement', () => {
    it('should promote gold data to platinum with AI enhancements', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      const mockGoldRecord = {
        id: 'gold_123',
        tier: 'gold' as DataLayerTier,
        source: 'aggregated',
        data: { total_value: 300, count: 2 },
        metadata: {
          lineage: ['bronze_123', 'bronze_456'],
          tags: ['tag1', 'tag2'],
          schema: 'aggregated',
          version: '1.0',
          quality: 0.9
        }
      }

      jest.spyOn(dataLayer as any, 'getRecord').mockResolvedValue(mockGoldRecord)

      const aiEnhancements = [
        { type: 'prediction' as const, model: 'revenue-forecast' },
        { type: 'insight' as const }
      ]

      const platinumRecordId = await dataLayer.promoteToplatinum(['gold_123'], aiEnhancements)
      
      expect(platinumRecordId).toMatch(/^platinum_\d+_[a-z0-9]+$/)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Storing platinum record: platinum_\d+_[a-z0-9]+/)
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Vector Database', () => {
    it('should store and search vector data', async () => {
      const vectorData = {
        id: 'vector_1',
        content: 'Test document content',
        embedding: [0.1, 0.2, 0.3, 0.4],
        metadata: { type: 'document' },
        tier: 'silver' as DataLayerTier
      }

      await dataLayer.storeVectorData(vectorData)

      const queryEmbedding = [0.15, 0.25, 0.35, 0.45]
      const results = await dataLayer.searchVectorData(queryEmbedding, 'silver', 5)

      expect(results).toHaveLength(1)
      expect(results[0].data).toEqual(vectorData)
      expect(results[0].similarity).toBeGreaterThan(0)
      expect(results[0].similarity).toBeLessThanOrEqual(1)
    })

    it('should filter vector search by tier', async () => {
      const bronzeVector = {
        id: 'vector_bronze',
        content: 'Bronze content',
        embedding: [0.1, 0.2],
        metadata: {},
        tier: 'bronze' as DataLayerTier
      }

      const silverVector = {
        id: 'vector_silver',
        content: 'Silver content',
        embedding: [0.3, 0.4],
        metadata: {},
        tier: 'silver' as DataLayerTier
      }

      await dataLayer.storeVectorData(bronzeVector)
      await dataLayer.storeVectorData(silverVector)

      const results = await dataLayer.searchVectorData([0.1, 0.2], 'bronze')
      
      expect(results).toHaveLength(1)
      expect(results[0].data.tier).toBe('bronze')
    })
  })

  describe('Time Series Database', () => {
    it('should store and retrieve time series data', async () => {
      const now = new Date()
      const timeSeriesData = {
        timestamp: now,
        metric: 'cpu_usage',
        value: 75.5,
        tags: { server: 'web-01' },
        tier: 'silver' as DataLayerTier
      }

      await dataLayer.storeTimeSeriesData(timeSeriesData)

      const retrieved = await dataLayer.getTimeSeriesData('cpu_usage')
      
      expect(retrieved).toHaveLength(1)
      expect(retrieved[0]).toEqual(timeSeriesData)
    })

    it('should filter time series data by date range', async () => {
      const baseTime = new Date('2024-01-01')
      
      const data1 = {
        timestamp: new Date(baseTime.getTime() - 1000),
        metric: 'test_metric',
        value: 1,
        tags: {},
        tier: 'silver' as DataLayerTier
      }
      
      const data2 = {
        timestamp: baseTime,
        metric: 'test_metric',
        value: 2,
        tags: {},
        tier: 'silver' as DataLayerTier
      }

      await dataLayer.storeTimeSeriesData(data1)
      await dataLayer.storeTimeSeriesData(data2)

      const filtered = await dataLayer.getTimeSeriesData('test_metric', {
        start: baseTime,
        end: new Date(baseTime.getTime() + 1000)
      })

      expect(filtered).toHaveLength(1)
      expect(filtered[0].value).toBe(2)
    })
  })

  describe('Knowledge Graph', () => {
    it('should store and retrieve knowledge relations', async () => {
      await dataLayer.addKnowledgeRelation('Client_ABC', 'Document_123', 'owns')
      await dataLayer.addKnowledgeRelation('Client_ABC', 'Task_456', 'requires')

      const owned = await dataLayer.getKnowledgeRelations('Client_ABC', 'owns')
      expect(owned).toEqual(['Document_123'])

      const allRelations = await dataLayer.getKnowledgeRelations('Client_ABC')
      expect(allRelations).toEqual(expect.arrayContaining(['Document_123', 'Task_456']))
    })

    it('should handle multiple entities for same relation', async () => {
      await dataLayer.addKnowledgeRelation('Client_ABC', 'Doc_1', 'owns')
      await dataLayer.addKnowledgeRelation('Client_ABC', 'Doc_2', 'owns')

      const owned = await dataLayer.getKnowledgeRelations('Client_ABC', 'owns')
      expect(owned).toEqual(expect.arrayContaining(['Doc_1', 'Doc_2']))
      expect(owned).toHaveLength(2)
    })
  })

  describe('Feature Store', () => {
    it('should store and retrieve features', async () => {
      const feature = { 
        client_score: 0.85, 
        risk_level: 'low',
        features: [1, 2, 3, 4, 5] 
      }

      await dataLayer.storeFeature('client_abc_features', feature)

      const retrieved = await dataLayer.getFeature('client_abc_features')
      expect(retrieved).toEqual(feature)
    })

    it('should retrieve multiple features at once', async () => {
      await dataLayer.storeFeature('feature_1', { value: 1 })
      await dataLayer.storeFeature('feature_2', { value: 2 })

      const features = await dataLayer.getFeatures(['feature_1', 'feature_2', 'feature_3'])
      
      expect(features).toEqual({
        feature_1: { value: 1 },
        feature_2: { value: 2 },
        feature_3: undefined
      })
    })
  })
})