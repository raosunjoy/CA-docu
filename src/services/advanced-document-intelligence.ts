import { documentIntelligenceService, DocumentIntelligenceService, IntelligentDocument, DocumentProcessingRequest, DocumentProcessingResult } from './document-intelligence'
import { openaiService, DocumentAnalysisRequest } from './openai-service'
import { vectorService, SemanticSearchQuery } from './vector-service'
import { analyticsService } from './analytics-service'

export interface DocumentComparison {
  sourceDocument: IntelligentDocument
  targetDocument: IntelligentDocument
  similarityScore: number
  comparisonResults: ComparisonResult[]
  recommendations: ComparisonRecommendation[]
  processingTime: number
}

export interface ComparisonResult {
  category: 'CONTENT' | 'STRUCTURE' | 'ENTITIES' | 'FINANCIAL' | 'COMPLIANCE'
  similarity: number
  differences: ComparisonDifference[]
  insights: string[]
}

export interface ComparisonDifference {
  type: 'ADDITION' | 'DELETION' | 'MODIFICATION' | 'STRUCTURAL'
  field: string
  sourceValue?: any
  targetValue?: any
  significance: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
}

export interface ComparisonRecommendation {
  type: 'MERGE' | 'RECONCILE' | 'FLAG_DISCREPANCY' | 'UPDATE_MASTER' | 'CREATE_VERSION'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  automationPossible: boolean
  estimatedEffort: string
}

export interface SimilarityDetectionRequest {
  targetDocument: IntelligentDocument
  searchCriteria: {
    organizationId: string
    clientId?: string
    documentTypes?: string[]
    dateRange?: { start: Date; end: Date }
    minSimilarity?: number
    maxResults?: number
  }
}

export interface SimilarDocumentResult {
  document: IntelligentDocument
  similarityScore: number
  matchingFeatures: MatchingFeature[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  recommendation: string
}

export interface MatchingFeature {
  type: 'CONTENT_SIMILARITY' | 'ENTITY_MATCH' | 'FINANCIAL_PATTERN' | 'STRUCTURE_MATCH'
  score: number
  details: string
  evidence: string[]
}

export interface AutoCategorization {
  categories: CategoryPrediction[]
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  reasoningChain: ReasoningStep[]
  suggestedWorkflow: WorkflowRecommendation
  alternativeCategories: CategoryPrediction[]
}

export interface CategoryPrediction {
  category: string
  subcategory?: string
  confidence: number
  reasoning: string
  evidence: string[]
  metadata: Record<string, any>
}

export interface ReasoningStep {
  step: number
  process: string
  input: string
  output: string
  confidence: number
}

export interface WorkflowRecommendation {
  recommendedStage: 'IMMEDIATE_REVIEW' | 'STANDARD_PROCESS' | 'AUTOMATED_APPROVAL' | 'EXCEPTION_HANDLING'
  nextActions: WorkflowAction[]
  estimatedProcessingTime: number
  requiredApprovals: string[]
  automationLevel: number // 0-100%
}

export interface WorkflowAction {
  action: string
  assignee?: string
  dueDate?: Date
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  automated: boolean
  dependencies?: string[]
}

export interface DocumentIntelligenceAnalytics {
  processingVolume: VolumeMetrics
  accuracyMetrics: AccuracyMetrics
  performanceMetrics: PerformanceMetrics
  trendAnalysis: TrendAnalysis
  riskAssessment: IntelligenceRiskAssessment
}

export interface VolumeMetrics {
  totalProcessed: number
  dailyAverage: number
  peakProcessingHours: number[]
  documentTypeDistribution: Record<string, number>
  processingStatusDistribution: Record<string, number>
}

export interface AccuracyMetrics {
  overallAccuracy: number
  categoryAccuracy: Record<string, number>
  entityExtractionAccuracy: number
  complianceDetectionAccuracy: number
  falsePositiveRate: number
  falseNegativeRate: number
}

export interface PerformanceMetrics {
  averageProcessingTime: number
  processingTimeByType: Record<string, number>
  throughput: number
  errorRate: number
  automationRate: number
}

export interface TrendAnalysis {
  volumeTrends: Trend[]
  accuracyTrends: Trend[]
  processingTimeTrends: Trend[]
  errorPatterns: ErrorPattern[]
}

export interface Trend {
  period: string
  metric: string
  value: number
  change: number
  direction: 'UP' | 'DOWN' | 'STABLE'
}

export interface ErrorPattern {
  errorType: string
  frequency: number
  commonCauses: string[]
  suggestedFixes: string[]
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface IntelligenceRiskAssessment {
  dataQualityRisk: number
  processingRisk: number
  complianceRisk: number
  operationalRisk: number
  recommendedActions: string[]
}

export class AdvancedDocumentIntelligenceService extends DocumentIntelligenceService {
  
  constructor() {
    super()
  }

  /**
   * Enhanced document processing with advanced intelligence features
   */
  async processDocumentAdvanced(request: DocumentProcessingRequest): Promise<DocumentProcessingResult & {
    similarDocuments: SimilarDocumentResult[]
    categorization: AutoCategorization
    workflowRecommendations: WorkflowRecommendation
  }> {
    // First, run the standard processing
    const baseResult = await this.processDocument(request)
    
    // Then add advanced intelligence features
    const [similarDocuments, categorization] = await Promise.all([
      this.detectSimilarDocuments({
        targetDocument: baseResult.document,
        searchCriteria: {
          organizationId: request.organizationId,
          clientId: request.clientId,
          minSimilarity: 0.7,
          maxResults: 5
        }
      }),
      this.performAutoCategorization(baseResult.document)
    ])

    return {
      ...baseResult,
      similarDocuments,
      categorization,
      workflowRecommendations: categorization.suggestedWorkflow
    }
  }

  /**
   * Compare two documents for similarities and differences
   */
  async compareDocuments(
    sourceDocumentId: string, 
    targetDocumentId: string
  ): Promise<DocumentComparison> {
    const startTime = Date.now()

    // In a real implementation, retrieve documents from database
    const sourceDocument = await this.getDocumentById(sourceDocumentId)
    const targetDocument = await this.getDocumentById(targetDocumentId)

    if (!sourceDocument || !targetDocument) {
      throw new Error('One or both documents not found')
    }

    const comparisonResults: ComparisonResult[] = []

    // Content comparison
    const contentComparison = await this.compareContent(sourceDocument, targetDocument)
    comparisonResults.push(contentComparison)

    // Structure comparison
    const structureComparison = this.compareStructure(sourceDocument, targetDocument)
    comparisonResults.push(structureComparison)

    // Entity comparison
    const entityComparison = this.compareEntities(sourceDocument, targetDocument)
    comparisonResults.push(entityComparison)

    // Financial comparison
    const financialComparison = this.compareFinancialData(sourceDocument, targetDocument)
    comparisonResults.push(financialComparison)

    // Compliance comparison
    const complianceComparison = this.compareCompliance(sourceDocument, targetDocument)
    comparisonResults.push(complianceComparison)

    // Calculate overall similarity score
    const similarityScore = this.calculateOverallSimilarity(comparisonResults)

    // Generate recommendations
    const recommendations = this.generateComparisonRecommendations(
      sourceDocument, 
      targetDocument, 
      comparisonResults
    )

    return {
      sourceDocument,
      targetDocument,
      similarityScore,
      comparisonResults,
      recommendations,
      processingTime: Date.now() - startTime
    }
  }

  /**
   * Detect similar documents in the database
   */
  async detectSimilarDocuments(request: SimilarityDetectionRequest): Promise<SimilarDocumentResult[]> {
    try {
      // Use vector search to find similar documents
      const searchQuery: SemanticSearchQuery = {
        query: request.targetDocument.content.substring(0, 1000), // Use first 1000 chars for search
        filters: {
          organizationId: request.searchCriteria.organizationId,
          clientId: request.searchCriteria.clientId,
          category: request.searchCriteria.documentTypes,
          status: ['ACTIVE']
        },
        limit: request.searchCriteria.maxResults || 10
      }

      const searchResults = await vectorService.semanticSearch(searchQuery)
      const minSimilarity = request.searchCriteria.minSimilarity || 0.6

      const similarDocuments: SimilarDocumentResult[] = []

      for (const result of searchResults.results) {
        if (result.relevanceScore >= minSimilarity && 
            result.document.id !== request.targetDocument.id) {
          
          // Perform detailed comparison
          const matchingFeatures = await this.identifyMatchingFeatures(
            request.targetDocument,
            result.document as any
          )

          const riskLevel = this.assessSimilarityRisk(result.relevanceScore, matchingFeatures)
          const recommendation = this.generateSimilarityRecommendation(
            request.targetDocument,
            result.document as any,
            matchingFeatures
          )

          similarDocuments.push({
            document: result.document as any,
            similarityScore: result.relevanceScore,
            matchingFeatures,
            riskLevel,
            recommendation
          })
        }
      }

      return similarDocuments.sort((a, b) => b.similarityScore - a.similarityScore)
    } catch (error) {
      console.error('Similar document detection failed:', error)
      return []
    }
  }

  /**
   * Perform advanced automatic categorization
   */
  async performAutoCategorization(document: IntelligentDocument): Promise<AutoCategorization> {
    const reasoningChain: ReasoningStep[] = []
    
    try {
      // Step 1: AI-powered classification
      reasoningChain.push({
        step: 1,
        process: 'AI Classification',
        input: `Document content (${document.content.length} chars)`,
        output: `Primary: ${document.metadata.classification.primaryType}`,
        confidence: document.metadata.classification.confidence
      })

      // Step 2: Content analysis
      const contentAnalysis = await this.performAdvancedContentAnalysis(document)
      reasoningChain.push({
        step: 2,
        process: 'Content Analysis',
        input: 'Document text patterns and keywords',
        output: `${contentAnalysis.patterns.length} patterns identified`,
        confidence: contentAnalysis.confidence
      })

      // Step 3: Entity-based categorization
      const entityCategories = this.categorizeByEntities(document)
      reasoningChain.push({
        step: 3,
        process: 'Entity Classification',
        input: `${document.metadata.entities.length} entities`,
        output: `${entityCategories.length} category suggestions`,
        confidence: entityCategories.length > 0 ? 0.8 : 0.4
      })

      // Step 4: Compliance-based categorization
      const complianceCategories = this.categorizeByCompliance(document)
      reasoningChain.push({
        step: 4,
        process: 'Compliance Classification',
        input: `${document.metadata.compliance.applicableRegulations.length} regulations`,
        output: `${complianceCategories.length} compliance categories`,
        confidence: complianceCategories.length > 0 ? 0.9 : 0.3
      })

      // Combine all categorization results
      const allCategories = [
        ...this.getBaseCategoryPredictions(document),
        ...entityCategories,
        ...complianceCategories,
        ...contentAnalysis.categories
      ]

      // Rank and deduplicate categories
      const rankedCategories = this.rankCategoryPredictions(allCategories)
      const topCategory = rankedCategories[0]
      const alternativeCategories = rankedCategories.slice(1, 4)

      // Generate workflow recommendation
      const suggestedWorkflow = this.generateWorkflowRecommendation(document, topCategory)

      // Determine overall confidence level
      const confidenceLevel = topCategory.confidence > 0.8 ? 'HIGH' : 
                             topCategory.confidence > 0.6 ? 'MEDIUM' : 'LOW'

      return {
        categories: rankedCategories,
        confidenceLevel,
        reasoningChain,
        suggestedWorkflow,
        alternativeCategories
      }

    } catch (error) {
      console.error('Auto-categorization failed:', error)
      
      return {
        categories: this.getBaseCategoryPredictions(document),
        confidenceLevel: 'LOW',
        reasoningChain,
        suggestedWorkflow: this.getDefaultWorkflow(),
        alternativeCategories: []
      }
    }
  }

  /**
   * Get comprehensive analytics about document intelligence performance
   */
  async getDocumentIntelligenceAnalytics(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<DocumentIntelligenceAnalytics> {
    try {
      // In a real implementation, query from analytics database
      const mockAnalytics: DocumentIntelligenceAnalytics = {
        processingVolume: {
          totalProcessed: 1250,
          dailyAverage: 42,
          peakProcessingHours: [9, 10, 14, 15],
          documentTypeDistribution: {
            'FINANCIAL_STATEMENT': 320,
            'TAX_DOCUMENT': 280,
            'COMPLIANCE_FILING': 200,
            'INVOICE': 180,
            'CONTRACT': 150,
            'OTHER': 120
          },
          processingStatusDistribution: {
            'COMPLETED': 1150,
            'PROCESSING': 45,
            'FAILED': 35,
            'PENDING': 20
          }
        },
        accuracyMetrics: {
          overallAccuracy: 0.92,
          categoryAccuracy: {
            'FINANCIAL_STATEMENT': 0.95,
            'TAX_DOCUMENT': 0.94,
            'COMPLIANCE_FILING': 0.89,
            'INVOICE': 0.97,
            'CONTRACT': 0.88,
            'OTHER': 0.78
          },
          entityExtractionAccuracy: 0.91,
          complianceDetectionAccuracy: 0.87,
          falsePositiveRate: 0.08,
          falseNegativeRate: 0.05
        },
        performanceMetrics: {
          averageProcessingTime: 3200, // ms
          processingTimeByType: {
            'FINANCIAL_STATEMENT': 4500,
            'TAX_DOCUMENT': 3800,
            'COMPLIANCE_FILING': 3200,
            'INVOICE': 2100,
            'CONTRACT': 3900,
            'OTHER': 2800
          },
          throughput: 45.2, // docs per hour
          errorRate: 0.06,
          automationRate: 0.83
        },
        trendAnalysis: {
          volumeTrends: [
            { period: 'Last 7 days', metric: 'volume', value: 294, change: 8.2, direction: 'UP' },
            { period: 'Last 30 days', metric: 'volume', value: 1250, change: 15.6, direction: 'UP' }
          ],
          accuracyTrends: [
            { period: 'Last 7 days', metric: 'accuracy', value: 0.93, change: 0.02, direction: 'UP' },
            { period: 'Last 30 days', metric: 'accuracy', value: 0.92, change: 0.01, direction: 'UP' }
          ],
          processingTimeTrends: [
            { period: 'Last 7 days', metric: 'processing_time', value: 3100, change: -200, direction: 'DOWN' },
            { period: 'Last 30 days', metric: 'processing_time', value: 3200, change: -150, direction: 'DOWN' }
          ],
          errorPatterns: [
            {
              errorType: 'Entity Extraction Failure',
              frequency: 23,
              commonCauses: ['Poor scan quality', 'Unusual document format'],
              suggestedFixes: ['Improve preprocessing', 'Add format detection'],
              impact: 'MEDIUM'
            }
          ]
        },
        riskAssessment: {
          dataQualityRisk: 0.15,
          processingRisk: 0.08,
          complianceRisk: 0.12,
          operationalRisk: 0.06,
          recommendedActions: [
            'Implement quality gates for input documents',
            'Add manual review for low-confidence predictions',
            'Increase compliance training data'
          ]
        }
      }

      return mockAnalytics
    } catch (error) {
      console.error('Failed to get document intelligence analytics:', error)
      throw error
    }
  }

  // Private helper methods for advanced features

  private async compareContent(doc1: IntelligentDocument, doc2: IntelligentDocument): Promise<ComparisonResult> {
    try {
      // Use AI to compare content semantically
      const comparisonRequest: DocumentAnalysisRequest = {
        content: `Document 1:\n${doc1.content.substring(0, 2000)}\n\nDocument 2:\n${doc2.content.substring(0, 2000)}`,
        documentType: 'GENERAL',
        context: {
          purpose: 'document_comparison'
        }
      }

      const aiResult = await openaiService.analyzeDocument(comparisonRequest)
      
      return {
        category: 'CONTENT',
        similarity: aiResult.confidence,
        differences: [
          {
            type: 'MODIFICATION',
            field: 'content',
            significance: 'MEDIUM',
            description: aiResult.summary || 'Content differences detected'
          }
        ],
        insights: aiResult.keyInsights || ['Content comparison completed']
      }
    } catch (error) {
      return {
        category: 'CONTENT',
        similarity: 0.5,
        differences: [],
        insights: ['Content comparison failed']
      }
    }
  }

  private compareStructure(doc1: IntelligentDocument, doc2: IntelligentDocument): ComparisonResult {
    const differences: ComparisonDifference[] = []
    
    // Compare document properties
    if (doc1.contentType !== doc2.contentType) {
      differences.push({
        type: 'STRUCTURAL',
        field: 'contentType',
        sourceValue: doc1.contentType,
        targetValue: doc2.contentType,
        significance: 'HIGH',
        description: 'Document types differ'
      })
    }

    if (Math.abs(doc1.content.length - doc2.content.length) > doc1.content.length * 0.2) {
      differences.push({
        type: 'STRUCTURAL',
        field: 'size',
        sourceValue: doc1.content.length,
        targetValue: doc2.content.length,
        significance: 'MEDIUM',
        description: 'Significant size difference'
      })
    }

    const similarity = differences.length === 0 ? 1.0 : Math.max(0.3, 1 - (differences.length * 0.2))

    return {
      category: 'STRUCTURE',
      similarity,
      differences,
      insights: [`${differences.length} structural differences found`]
    }
  }

  private compareEntities(doc1: IntelligentDocument, doc2: IntelligentDocument): ComparisonResult {
    const entities1 = doc1.metadata.entities
    const entities2 = doc2.metadata.entities
    const differences: ComparisonDifference[] = []
    
    // Find matching entities
    const matches = entities1.filter(e1 => 
      entities2.some(e2 => e1.type === e2.type && e1.value === e2.value)
    )

    const unmatchedFromDoc1 = entities1.filter(e1 => 
      !entities2.some(e2 => e1.type === e2.type && e1.value === e2.value)
    )

    const unmatchedFromDoc2 = entities2.filter(e2 => 
      !entities1.some(e1 => e1.type === e2.type && e1.value === e2.value)
    )

    // Add differences
    unmatchedFromDoc1.forEach(entity => {
      differences.push({
        type: 'DELETION',
        field: `entity_${entity.type}`,
        sourceValue: entity.value,
        significance: 'MEDIUM',
        description: `Entity ${entity.type}: ${entity.value} only in source document`
      })
    })

    unmatchedFromDoc2.forEach(entity => {
      differences.push({
        type: 'ADDITION',
        field: `entity_${entity.type}`,
        targetValue: entity.value,
        significance: 'MEDIUM',
        description: `Entity ${entity.type}: ${entity.value} only in target document`
      })
    })

    const totalEntities = Math.max(entities1.length, entities2.length)
    const similarity = totalEntities === 0 ? 1.0 : matches.length / totalEntities

    return {
      category: 'ENTITIES',
      similarity,
      differences,
      insights: [
        `${matches.length} matching entities`,
        `${unmatchedFromDoc1.length} entities only in source`,
        `${unmatchedFromDoc2.length} entities only in target`
      ]
    }
  }

  private compareFinancialData(doc1: IntelligentDocument, doc2: IntelligentDocument): ComparisonResult {
    const fin1 = doc1.metadata.financial
    const fin2 = doc2.metadata.financial
    const differences: ComparisonDifference[] = []

    // Compare total amounts
    Object.keys({...fin1.totalAmounts, ...fin2.totalAmounts}).forEach(currency => {
      const amount1 = fin1.totalAmounts[currency] || 0
      const amount2 = fin2.totalAmounts[currency] || 0
      
      if (Math.abs(amount1 - amount2) > Math.max(amount1, amount2) * 0.05) { // 5% threshold
        differences.push({
          type: 'MODIFICATION',
          field: `totalAmount_${currency}`,
          sourceValue: amount1,
          targetValue: amount2,
          significance: 'HIGH',
          description: `Significant difference in ${currency} amounts`
        })
      }
    })

    // Compare key metrics
    const allMetricNames = new Set([
      ...fin1.keyMetrics.map(m => m.name),
      ...fin2.keyMetrics.map(m => m.name)
    ])

    allMetricNames.forEach(metricName => {
      const metric1 = fin1.keyMetrics.find(m => m.name === metricName)
      const metric2 = fin2.keyMetrics.find(m => m.name === metricName)

      if (metric1 && !metric2) {
        differences.push({
          type: 'DELETION',
          field: `metric_${metricName}`,
          sourceValue: metric1.value,
          significance: 'MEDIUM',
          description: `Metric ${metricName} only in source`
        })
      } else if (!metric1 && metric2) {
        differences.push({
          type: 'ADDITION',
          field: `metric_${metricName}`,
          targetValue: metric2.value,
          significance: 'MEDIUM',
          description: `Metric ${metricName} only in target`
        })
      } else if (metric1 && metric2 && Math.abs(metric1.value - metric2.value) > Math.max(metric1.value, metric2.value) * 0.1) {
        differences.push({
          type: 'MODIFICATION',
          field: `metric_${metricName}`,
          sourceValue: metric1.value,
          targetValue: metric2.value,
          significance: 'HIGH',
          description: `Significant difference in ${metricName}`
        })
      }
    })

    const similarity = differences.length === 0 ? 1.0 : Math.max(0.2, 1 - (differences.length * 0.15))

    return {
      category: 'FINANCIAL',
      similarity,
      differences,
      insights: [`${differences.length} financial differences identified`]
    }
  }

  private compareCompliance(doc1: IntelligentDocument, doc2: IntelligentDocument): ComparisonResult {
    const comp1 = doc1.metadata.compliance
    const comp2 = doc2.metadata.compliance
    const differences: ComparisonDifference[] = []

    // Compare compliance status
    if (comp1.complianceStatus !== comp2.complianceStatus) {
      differences.push({
        type: 'MODIFICATION',
        field: 'complianceStatus',
        sourceValue: comp1.complianceStatus,
        targetValue: comp2.complianceStatus,
        significance: 'HIGH',
        description: 'Compliance status differs'
      })
    }

    // Compare applicable regulations
    const regs1 = new Set(comp1.applicableRegulations)
    const regs2 = new Set(comp2.applicableRegulations)
    const commonRegs = new Set([...regs1].filter(r => regs2.has(r)))
    const uniqueToDoc1 = new Set([...regs1].filter(r => !regs2.has(r)))
    const uniqueToDoc2 = new Set([...regs2].filter(r => !regs1.has(r)))

    uniqueToDoc1.forEach(reg => {
      differences.push({
        type: 'DELETION',
        field: 'applicableRegulations',
        sourceValue: reg,
        significance: 'MEDIUM',
        description: `Regulation ${reg} only applicable to source`
      })
    })

    uniqueToDoc2.forEach(reg => {
      differences.push({
        type: 'ADDITION',
        field: 'applicableRegulations',
        targetValue: reg,
        significance: 'MEDIUM',
        description: `Regulation ${reg} only applicable to target`
      })
    })

    const totalRegs = Math.max(regs1.size, regs2.size)
    const similarity = totalRegs === 0 ? 1.0 : commonRegs.size / totalRegs

    return {
      category: 'COMPLIANCE',
      similarity,
      differences,
      insights: [
        `${commonRegs.size} common regulations`,
        `${uniqueToDoc1.size} regulations unique to source`,
        `${uniqueToDoc2.size} regulations unique to target`
      ]
    }
  }

  private calculateOverallSimilarity(results: ComparisonResult[]): number {
    if (results.length === 0) return 0
    
    const weights = {
      'CONTENT': 0.4,
      'STRUCTURE': 0.1,
      'ENTITIES': 0.2,
      'FINANCIAL': 0.2,
      'COMPLIANCE': 0.1
    }

    let weightedSum = 0
    let totalWeight = 0

    results.forEach(result => {
      const weight = weights[result.category] || 0.1
      weightedSum += result.similarity * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  private generateComparisonRecommendations(
    source: IntelligentDocument,
    target: IntelligentDocument,
    results: ComparisonResult[]
  ): ComparisonRecommendation[] {
    const recommendations: ComparisonRecommendation[] = []
    
    const overallSimilarity = this.calculateOverallSimilarity(results)
    
    if (overallSimilarity > 0.9) {
      recommendations.push({
        type: 'MERGE',
        priority: 'HIGH',
        title: 'Potential Duplicate Documents',
        description: 'These documents are highly similar and may be duplicates',
        automationPossible: true,
        estimatedEffort: '15 minutes'
      })
    } else if (overallSimilarity > 0.7) {
      recommendations.push({
        type: 'RECONCILE',
        priority: 'MEDIUM',
        title: 'Document Reconciliation Required',
        description: 'Documents have significant similarities but key differences need reconciliation',
        automationPossible: false,
        estimatedEffort: '45 minutes'
      })
    }

    // Check for financial discrepancies
    const financialResult = results.find(r => r.category === 'FINANCIAL')
    if (financialResult && financialResult.differences.some(d => d.significance === 'HIGH')) {
      recommendations.push({
        type: 'FLAG_DISCREPANCY',
        priority: 'HIGH',
        title: 'Financial Discrepancy Alert',
        description: 'Significant financial differences detected requiring immediate review',
        automationPossible: false,
        estimatedEffort: '1-2 hours'
      })
    }

    return recommendations
  }

  private async identifyMatchingFeatures(
    targetDoc: IntelligentDocument,
    candidateDoc: IntelligentDocument
  ): Promise<MatchingFeature[]> {
    const features: MatchingFeature[] = []

    // Content similarity (already calculated by vector search)
    features.push({
      type: 'CONTENT_SIMILARITY',
      score: 0.85, // Would come from vector search
      details: 'High semantic similarity in document content',
      evidence: ['Similar terminology', 'Matching document structure']
    })

    // Entity matches
    const entityMatches = targetDoc.metadata.entities.filter(e1 =>
      candidateDoc.metadata.entities.some(e2 => e1.type === e2.type && e1.value === e2.value)
    )

    if (entityMatches.length > 0) {
      features.push({
        type: 'ENTITY_MATCH',
        score: entityMatches.length / Math.max(targetDoc.metadata.entities.length, candidateDoc.metadata.entities.length),
        details: `${entityMatches.length} matching entities found`,
        evidence: entityMatches.map(e => `${e.type}: ${e.value}`)
      })
    }

    // Financial pattern similarity
    const targetFinancial = targetDoc.metadata.financial
    const candidateFinancial = candidateDoc.metadata.financial
    
    if (Object.keys(targetFinancial.totalAmounts).length > 0 && Object.keys(candidateFinancial.totalAmounts).length > 0) {
      const amountSimilarity = this.calculateAmountSimilarity(targetFinancial, candidateFinancial)
      
      features.push({
        type: 'FINANCIAL_PATTERN',
        score: amountSimilarity,
        details: 'Similar financial amount patterns',
        evidence: ['Comparable financial figures', 'Similar metric structures']
      })
    }

    return features
  }

  private assessSimilarityRisk(similarity: number, features: MatchingFeature[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (similarity > 0.95 && features.some(f => f.type === 'ENTITY_MATCH' && f.score > 0.8)) {
      return 'HIGH' // Potential duplicate
    } else if (similarity > 0.8) {
      return 'MEDIUM' // Significant similarity
    } else {
      return 'LOW' // Normal similarity
    }
  }

  private generateSimilarityRecommendation(
    target: IntelligentDocument,
    candidate: IntelligentDocument,
    features: MatchingFeature[]
  ): string {
    const entityMatch = features.find(f => f.type === 'ENTITY_MATCH')
    const financialMatch = features.find(f => f.type === 'FINANCIAL_PATTERN')
    
    if (entityMatch && entityMatch.score > 0.8 && financialMatch && financialMatch.score > 0.9) {
      return 'High probability of duplicate - recommend immediate review for potential merge'
    } else if (entityMatch && entityMatch.score > 0.6) {
      return 'Documents share common entities - may be related transactions or versions'
    } else {
      return 'Documents have content similarity - review for potential relationship or workflow optimization'
    }
  }

  private async performAdvancedContentAnalysis(document: IntelligentDocument): Promise<{
    patterns: string[]
    confidence: number
    categories: CategoryPrediction[]
  }> {
    const content = document.content.toLowerCase()
    const patterns: string[] = []
    const categories: CategoryPrediction[] = []

    // Identify content patterns
    if (/\b(balance\s+sheet|assets|liabilities|equity)\b/.test(content)) {
      patterns.push('balance_sheet_structure')
      categories.push({
        category: 'FINANCIAL_STATEMENT',
        subcategory: 'BALANCE_SHEET',
        confidence: 0.9,
        reasoning: 'Contains balance sheet terminology',
        evidence: ['balance sheet', 'assets', 'liabilities'],
        metadata: { documentType: 'financial' }
      })
    }

    if (/\b(profit|loss|revenue|expenses|net\s+income)\b/.test(content)) {
      patterns.push('income_statement_structure')
      categories.push({
        category: 'FINANCIAL_STATEMENT',
        subcategory: 'INCOME_STATEMENT',
        confidence: 0.88,
        reasoning: 'Contains profit & loss terminology',
        evidence: ['profit', 'loss', 'revenue'],
        metadata: { documentType: 'financial' }
      })
    }

    if (/\b(gst|vat|tax|tds|income\s+tax)\b/.test(content)) {
      patterns.push('tax_document_pattern')
      categories.push({
        category: 'TAX_DOCUMENT',
        confidence: 0.92,
        reasoning: 'Contains tax-related terminology',
        evidence: ['tax', 'gst', 'tds'],
        metadata: { documentType: 'tax' }
      })
    }

    const confidence = patterns.length > 0 ? 0.85 : 0.4

    return { patterns, confidence, categories }
  }

  private categorizeByEntities(document: IntelligentDocument): CategoryPrediction[] {
    const entities = document.metadata.entities
    const categories: CategoryPrediction[] = []

    // Count entity types
    const entityCounts = entities.reduce((acc, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Financial document indicators
    if (entityCounts.AMOUNT && entityCounts.AMOUNT >= 3) {
      categories.push({
        category: 'FINANCIAL_DOCUMENT',
        confidence: Math.min(0.95, 0.6 + (entityCounts.AMOUNT * 0.1)),
        reasoning: 'Multiple financial amounts detected',
        evidence: [`${entityCounts.AMOUNT} amount entities`],
        metadata: { entityBasedClassification: true }
      })
    }

    // Contract indicators
    if (entityCounts.PERSON && entityCounts.DATE && entityCounts.COMPANY) {
      categories.push({
        category: 'CONTRACT',
        confidence: 0.8,
        reasoning: 'Contains persons, dates, and companies typical of contracts',
        evidence: ['person entities', 'date entities', 'company entities'],
        metadata: { entityBasedClassification: true }
      })
    }

    return categories
  }

  private categorizeByCompliance(document: IntelligentDocument): CategoryPrediction[] {
    const compliance = document.metadata.compliance
    const categories: CategoryPrediction[] = []

    // Compliance-based categorization
    compliance.applicableRegulations.forEach(regulation => {
      if (regulation.includes('Income Tax')) {
        categories.push({
          category: 'TAX_COMPLIANCE',
          confidence: 0.9,
          reasoning: `Subject to ${regulation}`,
          evidence: [regulation],
          metadata: { complianceBasedClassification: true }
        })
      } else if (regulation.includes('GST') || regulation.includes('CGST')) {
        categories.push({
          category: 'GST_COMPLIANCE',
          confidence: 0.92,
          reasoning: `Subject to ${regulation}`,
          evidence: [regulation],
          metadata: { complianceBasedClassification: true }
        })
      } else if (regulation.includes('Companies Act')) {
        categories.push({
          category: 'CORPORATE_COMPLIANCE',
          confidence: 0.88,
          reasoning: `Subject to ${regulation}`,
          evidence: [regulation],
          metadata: { complianceBasedClassification: true }
        })
      }
    })

    return categories
  }

  private getBaseCategoryPredictions(document: IntelligentDocument): CategoryPrediction[] {
    return [{
      category: document.metadata.classification.primaryType,
      confidence: document.metadata.classification.confidence,
      reasoning: document.metadata.classification.reasoning,
      evidence: ['AI classification'],
      metadata: { source: 'base_classification' }
    }]
  }

  private rankCategoryPredictions(categories: CategoryPrediction[]): CategoryPrediction[] {
    // Merge similar categories and rank by confidence
    const categoryMap = new Map<string, CategoryPrediction>()
    
    categories.forEach(cat => {
      const existing = categoryMap.get(cat.category)
      if (existing) {
        // Merge with higher confidence
        if (cat.confidence > existing.confidence) {
          categoryMap.set(cat.category, {
            ...cat,
            evidence: [...existing.evidence, ...cat.evidence],
            reasoning: `${existing.reasoning}; ${cat.reasoning}`
          })
        }
      } else {
        categoryMap.set(cat.category, cat)
      }
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.confidence - a.confidence)
  }

  private generateWorkflowRecommendation(
    document: IntelligentDocument,
    category: CategoryPrediction
  ): WorkflowRecommendation {
    const actions: WorkflowAction[] = []
    let recommendedStage: WorkflowRecommendation['recommendedStage'] = 'STANDARD_PROCESS'
    let automationLevel = 60

    // High confidence and low risk
    if (category.confidence > 0.9 && document.metadata.risks.length === 0) {
      recommendedStage = 'AUTOMATED_APPROVAL'
      automationLevel = 90
    } 
    // High risk or low confidence
    else if (document.metadata.risks.some(r => r.level === 'HIGH' || r.level === 'CRITICAL') || 
             category.confidence < 0.6) {
      recommendedStage = 'IMMEDIATE_REVIEW'
      automationLevel = 20
      
      actions.push({
        action: 'Manual review by senior associate',
        priority: 'HIGH',
        automated: false,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
      })
    }

    // Add category-specific actions
    if (category.category.includes('TAX')) {
      actions.push({
        action: 'Verify tax compliance requirements',
        priority: 'MEDIUM',
        automated: false
      })
    }

    if (category.category.includes('FINANCIAL')) {
      actions.push({
        action: 'Cross-reference with accounting records',
        priority: 'MEDIUM',
        automated: true
      })
    }

    return {
      recommendedStage,
      nextActions: actions,
      estimatedProcessingTime: this.calculateProcessingTime(document, category),
      requiredApprovals: this.determineRequiredApprovals(document, category),
      automationLevel
    }
  }

  private getDefaultWorkflow(): WorkflowRecommendation {
    return {
      recommendedStage: 'STANDARD_PROCESS',
      nextActions: [{
        action: 'Standard document review',
        priority: 'MEDIUM',
        automated: false
      }],
      estimatedProcessingTime: 1800000, // 30 minutes
      requiredApprovals: ['Associate'],
      automationLevel: 40
    }
  }

  private calculateAmountSimilarity(
    financial1: IntelligentDocument['metadata']['financial'],
    financial2: IntelligentDocument['metadata']['financial']
  ): number {
    const amounts1 = Object.values(financial1.totalAmounts)
    const amounts2 = Object.values(financial2.totalAmounts)
    
    if (amounts1.length === 0 || amounts2.length === 0) return 0
    
    // Simple similarity based on magnitude comparison
    const avg1 = amounts1.reduce((a, b) => a + b, 0) / amounts1.length
    const avg2 = amounts2.reduce((a, b) => a + b, 0) / amounts2.length
    
    const ratio = Math.min(avg1, avg2) / Math.max(avg1, avg2)
    return ratio
  }

  private calculateProcessingTime(document: IntelligentDocument, category: CategoryPrediction): number {
    let baseTime = 1800000 // 30 minutes base
    
    // Adjust based on category confidence
    if (category.confidence < 0.6) baseTime *= 2
    
    // Adjust based on document complexity
    if (document.metadata.entities.length > 20) baseTime *= 1.5
    if (document.metadata.risks.length > 3) baseTime *= 1.3
    
    return Math.round(baseTime)
  }

  private determineRequiredApprovals(document: IntelligentDocument, category: CategoryPrediction): string[] {
    const approvals: string[] = []
    
    if (document.metadata.risks.some(r => r.level === 'HIGH' || r.level === 'CRITICAL')) {
      approvals.push('Manager', 'Partner')
    } else if (category.confidence < 0.7) {
      approvals.push('Senior Associate')
    } else {
      approvals.push('Associate')
    }
    
    return approvals
  }
}

// Export singleton instance
export const advancedDocumentIntelligence = new AdvancedDocumentIntelligenceService()