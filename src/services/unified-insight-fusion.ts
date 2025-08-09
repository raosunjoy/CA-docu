import { aiOrchestrator, UnifiedResponse } from './ai-orchestrator'
import { analyticsService, AnalyticsQuery } from './analytics-service'
import { advancedDocumentIntelligence } from './advanced-document-intelligence'
import { conversationalAI } from './conversational-ai-service'
import { openaiService } from './openai-service'

export interface FusionInsightRequest {
  id: string
  userId: string
  organizationId: string
  context: BusinessContext
  sources: InsightSource[]
  preferences: FusionPreferences
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface BusinessContext {
  userRole: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN'
  currentProjects: string[]
  activeClients: string[]
  timeframe: { start: Date; end: Date }
  businessObjectives: BusinessObjective[]
  contextualFactors: ContextualFactor[]
}

export interface BusinessObjective {
  type: 'REVENUE_GROWTH' | 'COST_REDUCTION' | 'EFFICIENCY' | 'COMPLIANCE' | 'RISK_MITIGATION'
  priority: number
  target?: number
  deadline?: Date
  description: string
}

export interface ContextualFactor {
  category: 'MARKET' | 'REGULATORY' | 'OPERATIONAL' | 'FINANCIAL' | 'COMPETITIVE'
  factor: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  trend: 'INCREASING' | 'DECREASING' | 'STABLE'
  description: string
}

export interface InsightSource {
  type: 'ANALYTICS' | 'AI_DOCUMENT' | 'AI_CONVERSATION' | 'EXTERNAL_DATA' | 'HISTORICAL_PATTERN'
  sourceId: string
  data: any
  weight: number // 0-1, importance in fusion
  reliability: number // 0-1, data quality score
  timestamp: Date
}

export interface FusionPreferences {
  insightDepth: 'SUMMARY' | 'DETAILED' | 'COMPREHENSIVE'
  includeRecommendations: boolean
  includePredictions: boolean
  includeRiskAssessment: boolean
  focusAreas: FocusArea[]
  outputFormat: 'NARRATIVE' | 'STRUCTURED' | 'EXECUTIVE_SUMMARY'
}

export interface FocusArea {
  area: 'FINANCIAL_PERFORMANCE' | 'OPERATIONAL_EFFICIENCY' | 'COMPLIANCE_STATUS' | 'CLIENT_SATISFACTION' | 'TEAM_PRODUCTIVITY'
  priority: number
  specificMetrics?: string[]
}

export interface UnifiedInsight {
  id: string
  title: string
  type: 'STRATEGIC' | 'OPERATIONAL' | 'TACTICAL' | 'IMMEDIATE_ACTION'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  confidence: number
  impact: InsightImpact
  evidence: Evidence[]
  correlations: InsightCorrelation[]
  recommendations: ActionableRecommendation[]
  predictions: PredictiveInsight[]
  contextualRelevance: number
  businessValue: number
  timestamp: Date
}

export interface InsightImpact {
  category: 'FINANCIAL' | 'OPERATIONAL' | 'STRATEGIC' | 'COMPLIANCE' | 'REPUTATION'
  magnitude: 'TRANSFORMATIONAL' | 'SIGNIFICANT' | 'MODERATE' | 'MINOR'
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM'
  quantifiableImpact?: {
    metric: string
    estimatedValue: number
    unit: string
    confidenceInterval?: { min: number; max: number }
  }
}

export interface Evidence {
  sourceType: 'ANALYTICS' | 'AI_ANALYSIS' | 'HISTORICAL_DATA' | 'EXTERNAL_BENCHMARK'
  sourceId: string
  dataPoint: string
  value: any
  reliability: number
  supportingData?: any
}

export interface InsightCorrelation {
  type: 'CAUSAL' | 'CORRELATIONAL' | 'TEMPORAL' | 'SPATIAL'
  strength: number // -1 to 1
  description: string
  relatedInsights: string[]
  statisticalSignificance?: number
}

export interface ActionableRecommendation {
  id: string
  type: 'IMMEDIATE_ACTION' | 'STRATEGIC_INITIATIVE' | 'PROCESS_IMPROVEMENT' | 'RISK_MITIGATION'
  title: string
  description: string
  rationale: string
  expectedOutcome: string
  effort: 'LOW' | 'MEDIUM' | 'HIGH'
  roi: number
  timeframe: string
  dependencies: string[]
  resources: RequiredResource[]
  successMetrics: SuccessMetric[]
}

export interface RequiredResource {
  type: 'HUMAN' | 'FINANCIAL' | 'TECHNICAL' | 'EXTERNAL'
  description: string
  quantity?: number
  cost?: number
}

export interface SuccessMetric {
  metric: string
  baseline: number
  target: number
  measurementPeriod: string
  method: string
}

export interface PredictiveInsight {
  type: 'TREND_FORECAST' | 'OUTCOME_PREDICTION' | 'SCENARIO_ANALYSIS' | 'RISK_PROBABILITY'
  description: string
  prediction: any
  confidence: number
  timeHorizon: string
  scenarios?: PredictionScenario[]
  assumptions: string[]
  limitations: string[]
}

export interface PredictionScenario {
  name: string
  probability: number
  outcome: any
  factors: string[]
}

export interface FusionResult {
  requestId: string
  insights: UnifiedInsight[]
  executiveSummary: ExecutiveSummary
  keyFindingsHighlights: KeyFinding[]
  actionPriorities: ActionPriority[]
  riskAlerts: RiskAlert[]
  performanceIndicators: PerformanceIndicator[]
  crossFunctionalCorrelations: CrossFunctionalCorrelation[]
  strategicImplications: StrategicImplication[]
  fusionMetadata: FusionMetadata
}

export interface ExecutiveSummary {
  overview: string
  keyInsights: string[]
  criticalActions: string[]
  majorRisks: string[]
  opportunities: string[]
  bottomLine: string
}

export interface KeyFinding {
  category: string
  finding: string
  significance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  supportingEvidence: string[]
  businessImplication: string
}

export interface ActionPriority {
  rank: number
  action: string
  rationale: string
  urgency: 'IMMEDIATE' | 'WITHIN_WEEK' | 'WITHIN_MONTH' | 'QUARTERLY'
  expectedImpact: string
  resources: string[]
}

export interface RiskAlert {
  type: 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE' | 'STRATEGIC' | 'REPUTATIONAL'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  probability: number
  impact: string
  mitigation: string[]
  owner?: string
  deadline?: Date
}

export interface PerformanceIndicator {
  metric: string
  currentValue: number
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'VOLATILE'
  benchmark: number
  target?: number
  insight: string
}

export interface CrossFunctionalCorrelation {
  areas: string[]
  correlation: string
  strength: number
  businessImplication: string
  actionableInsight: string
}

export interface StrategicImplication {
  implication: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  timeframe: string
  considerations: string[]
  recommendations: string[]
}

export interface FusionMetadata {
  processingTime: number
  sourceCount: number
  confidenceScore: number
  qualityScore: number
  freshnessScore: number
  correlationStrength: number
  completeness: number
}

export class UnifiedInsightFusionEngine {
  
  async generateFusedInsights(request: FusionInsightRequest): Promise<FusionResult> {
    const startTime = Date.now()

    try {
      // Step 1: Collect and validate insight sources
      const validatedSources = await this.validateAndEnrichSources(request.sources)
      
      // Step 2: Extract raw insights from each source
      const rawInsights = await this.extractInsightsFromSources(validatedSources, request.context)
      
      // Step 3: Perform cross-source correlation analysis
      const correlations = await this.analyzeCrossSourceCorrelations(rawInsights, validatedSources)
      
      // Step 4: Generate unified insights with fusion intelligence
      const unifiedInsights = await this.generateUnifiedInsights(
        rawInsights,
        correlations,
        request.context,
        request.preferences
      )
      
      // Step 5: Prioritize and rank insights based on business value
      const prioritizedInsights = this.prioritizeInsights(unifiedInsights, request.context)
      
      // Step 6: Generate actionable recommendations
      const recommendations = await this.generateFusedRecommendations(
        prioritizedInsights,
        request.context
      )
      
      // Step 7: Create predictive insights
      const predictions = await this.generatePredictiveInsights(
        prioritizedInsights,
        validatedSources,
        request.context
      )
      
      // Step 8: Generate executive summary and key findings
      const executiveSummary = await this.generateExecutiveSummary(
        prioritizedInsights,
        recommendations,
        predictions,
        request.context,
        request.preferences
      )
      
      // Step 9: Create comprehensive result
      const result: FusionResult = {
        requestId: request.id,
        insights: prioritizedInsights,
        executiveSummary,
        keyFindingsHighlights: this.extractKeyFindings(prioritizedInsights),
        actionPriorities: this.createActionPriorities(recommendations),
        riskAlerts: this.identifyRiskAlerts(prioritizedInsights),
        performanceIndicators: this.generatePerformanceIndicators(prioritizedInsights, validatedSources),
        crossFunctionalCorrelations: correlations,
        strategicImplications: this.generateStrategicImplications(prioritizedInsights, request.context),
        fusionMetadata: {
          processingTime: Date.now() - startTime,
          sourceCount: validatedSources.length,
          confidenceScore: this.calculateOverallConfidence(prioritizedInsights),
          qualityScore: this.calculateQualityScore(validatedSources),
          freshnessScore: this.calculateFreshnessScore(validatedSources),
          correlationStrength: this.calculateCorrelationStrength(correlations),
          completeness: this.calculateCompleteness(request, prioritizedInsights)
        }
      }
      
      return result

    } catch (error) {
      console.error('Unified Insight Fusion error:', error)
      throw new Error(`Fusion processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async validateAndEnrichSources(sources: InsightSource[]): Promise<InsightSource[]> {
    const validatedSources: InsightSource[] = []

    for (const source of sources) {
      try {
        // Validate source data integrity
        if (this.validateSourceData(source)) {
          // Enrich with metadata and quality scores
          const enrichedSource = await this.enrichSourceWithMetadata(source)
          validatedSources.push(enrichedSource)
        } else {
          console.warn(`Invalid source data for ${source.sourceId}`)
        }
      } catch (error) {
        console.error(`Source validation failed for ${source.sourceId}:`, error)
      }
    }

    return validatedSources
  }

  private validateSourceData(source: InsightSource): boolean {
    if (!source.data || !source.sourceId || !source.type) {
      return false
    }

    // Type-specific validation
    switch (source.type) {
      case 'ANALYTICS':
        return this.validateAnalyticsSource(source)
      case 'AI_DOCUMENT':
        return this.validateAIDocumentSource(source)
      case 'AI_CONVERSATION':
        return this.validateConversationSource(source)
      default:
        return true
    }
  }

  private validateAnalyticsSource(source: InsightSource): boolean {
    const data = source.data
    return data && (data.metrics || data.kpis || data.trends)
  }

  private validateAIDocumentSource(source: InsightSource): boolean {
    const data = source.data
    return data && (data.document || data.analysis || data.insights)
  }

  private validateConversationSource(source: InsightSource): boolean {
    const data = source.data
    return data && (data.messages || data.insights || data.recommendations)
  }

  private async enrichSourceWithMetadata(source: InsightSource): Promise<InsightSource> {
    // Calculate reliability score based on source type and data quality
    const reliability = this.calculateSourceReliability(source)
    
    // Enrich with contextual metadata
    const enrichedData = await this.addContextualMetadata(source.data, source.type)
    
    return {
      ...source,
      data: enrichedData,
      reliability,
      timestamp: source.timestamp || new Date()
    }
  }

  private calculateSourceReliability(source: InsightSource): number {
    let reliability = 0.5 // Base reliability

    // Adjust based on source type
    switch (source.type) {
      case 'ANALYTICS':
        reliability = 0.9 // High reliability for analytics
        break
      case 'AI_DOCUMENT':
        reliability = 0.8 // Good reliability for AI analysis
        break
      case 'AI_CONVERSATION':
        reliability = 0.7 // Moderate reliability for conversation insights
        break
      case 'EXTERNAL_DATA':
        reliability = 0.6 // Lower reliability for external sources
        break
    }

    // Adjust based on data freshness
    const ageInHours = (Date.now() - source.timestamp.getTime()) / (1000 * 60 * 60)
    if (ageInHours > 24) {
      reliability *= 0.9 // Reduce reliability for older data
    }
    if (ageInHours > 168) { // 1 week
      reliability *= 0.8
    }

    return Math.min(1, Math.max(0, reliability))
  }

  private async addContextualMetadata(data: any, sourceType: string): Promise<any> {
    const metadata = {
      sourceType,
      processingTimestamp: new Date(),
      dataHash: this.generateDataHash(data),
      qualityIndicators: this.assessDataQuality(data)
    }

    return {
      ...data,
      __metadata: metadata
    }
  }

  private generateDataHash(data: any): string {
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16)
  }

  private assessDataQuality(data: any): any {
    return {
      completeness: this.assessCompleteness(data),
      consistency: this.assessConsistency(data),
      accuracy: this.assessAccuracy(data)
    }
  }

  private assessCompleteness(data: any): number {
    // Simple completeness check - could be more sophisticated
    const expectedFields = ['timestamp', 'value', 'context']
    const presentFields = expectedFields.filter(field => data[field] != null)
    return presentFields.length / expectedFields.length
  }

  private assessConsistency(data: any): number {
    // Basic consistency check
    return 0.8 // Placeholder
  }

  private assessAccuracy(data: any): number {
    // Basic accuracy assessment
    return 0.85 // Placeholder
  }

  private async extractInsightsFromSources(
    sources: InsightSource[],
    context: BusinessContext
  ): Promise<any[]> {
    const extractedInsights: any[] = []

    for (const source of sources) {
      try {
        let insights: any[] = []

        switch (source.type) {
          case 'ANALYTICS':
            insights = await this.extractAnalyticsInsights(source, context)
            break
          case 'AI_DOCUMENT':
            insights = await this.extractDocumentInsights(source, context)
            break
          case 'AI_CONVERSATION':
            insights = await this.extractConversationInsights(source, context)
            break
          case 'HISTORICAL_PATTERN':
            insights = await this.extractHistoricalInsights(source, context)
            break
        }

        extractedInsights.push(...insights.map(insight => ({
          ...insight,
          sourceId: source.sourceId,
          sourceType: source.type,
          reliability: source.reliability,
          weight: source.weight
        })))

      } catch (error) {
        console.error(`Insight extraction failed for source ${source.sourceId}:`, error)
      }
    }

    return extractedInsights
  }

  private async extractAnalyticsInsights(source: InsightSource, context: BusinessContext): Promise<any[]> {
    const insights: any[] = []
    const data = source.data

    // Extract KPI insights
    if (data.kpis) {
      data.kpis.forEach((kpi: any) => {
        insights.push({
          type: 'KPI_INSIGHT',
          metric: kpi.metric,
          value: kpi.value,
          trend: kpi.trend,
          benchmark: kpi.benchmark,
          insight: `${kpi.metric} is ${kpi.trend === 'UP' ? 'improving' : kpi.trend === 'DOWN' ? 'declining' : 'stable'}`,
          businessRelevance: this.assessBusinessRelevance(kpi.metric, context)
        })
      })
    }

    // Extract trend insights
    if (data.trends) {
      data.trends.forEach((trend: any) => {
        insights.push({
          type: 'TREND_INSIGHT',
          pattern: trend.pattern,
          direction: trend.direction,
          strength: trend.strength,
          insight: `Identified ${trend.strength} ${trend.direction} trend in ${trend.pattern}`,
          businessRelevance: this.assessTrendRelevance(trend, context)
        })
      })
    }

    return insights
  }

  private async extractDocumentInsights(source: InsightSource, context: BusinessContext): Promise<any[]> {
    const insights: any[] = []
    const data = source.data

    // Extract document intelligence insights
    if (data.document) {
      const doc = data.document
      
      // Classification insights
      if (doc.metadata?.classification) {
        insights.push({
          type: 'CLASSIFICATION_INSIGHT',
          category: doc.metadata.classification.primaryType,
          confidence: doc.metadata.classification.confidence,
          insight: `Document classified as ${doc.metadata.classification.primaryType}`,
          businessRelevance: this.assessDocumentRelevance(doc, context)
        })
      }

      // Risk insights
      if (doc.metadata?.risks) {
        doc.metadata.risks.forEach((risk: any) => {
          insights.push({
            type: 'RISK_INSIGHT',
            riskCategory: risk.category,
            riskLevel: risk.level,
            description: risk.description,
            insight: `${risk.level} ${risk.category} risk identified: ${risk.description}`,
            businessRelevance: this.assessRiskRelevance(risk, context)
          })
        })
      }

      // Compliance insights
      if (doc.metadata?.compliance) {
        insights.push({
          type: 'COMPLIANCE_INSIGHT',
          status: doc.metadata.compliance.complianceStatus,
          issues: doc.metadata.compliance.issues.length,
          insight: `Compliance status: ${doc.metadata.compliance.complianceStatus}`,
          businessRelevance: this.assessComplianceRelevance(doc.metadata.compliance, context)
        })
      }
    }

    return insights
  }

  private async extractConversationInsights(source: InsightSource, context: BusinessContext): Promise<any[]> {
    const insights: any[] = []
    const data = source.data

    // Extract conversation AI insights
    if (data.insights) {
      data.insights.forEach((aiInsight: any) => {
        insights.push({
          type: 'CONVERSATION_INSIGHT',
          title: aiInsight.title,
          description: aiInsight.description,
          confidence: aiInsight.confidence,
          insight: `AI conversation insight: ${aiInsight.description}`,
          businessRelevance: this.assessConversationRelevance(aiInsight, context)
        })
      })
    }

    // Extract recommendations
    if (data.recommendations) {
      data.recommendations.forEach((rec: any) => {
        insights.push({
          type: 'RECOMMENDATION_INSIGHT',
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          insight: `AI recommendation: ${rec.title}`,
          businessRelevance: this.assessRecommendationRelevance(rec, context)
        })
      })
    }

    return insights
  }

  private async extractHistoricalInsights(source: InsightSource, context: BusinessContext): Promise<any[]> {
    const insights: any[] = []
    const data = source.data

    // Extract historical patterns
    if (data.patterns) {
      data.patterns.forEach((pattern: any) => {
        insights.push({
          type: 'HISTORICAL_PATTERN',
          pattern: pattern.name,
          frequency: pattern.frequency,
          impact: pattern.impact,
          insight: `Historical pattern identified: ${pattern.name} occurs ${pattern.frequency}`,
          businessRelevance: this.assessHistoricalRelevance(pattern, context)
        })
      })
    }

    return insights
  }

  private assessBusinessRelevance(metric: string, context: BusinessContext): number {
    // Check if metric aligns with business objectives
    const relevantObjectives = context.businessObjectives.filter(obj => 
      metric.toLowerCase().includes(obj.type.toLowerCase().replace('_', ''))
    )
    
    if (relevantObjectives.length > 0) {
      return 0.9
    }

    // Check role-specific relevance
    switch (context.userRole) {
      case 'PARTNER':
        return metric.includes('revenue') || metric.includes('profit') ? 0.9 : 0.6
      case 'MANAGER':
        return metric.includes('team') || metric.includes('efficiency') ? 0.8 : 0.6
      default:
        return 0.5
    }
  }

  private assessTrendRelevance(trend: any, context: BusinessContext): number {
    // Assess based on trend strength and business context
    let relevance = trend.strength * 0.8

    // Boost relevance for trends aligned with objectives
    const alignedObjectives = context.businessObjectives.filter(obj =>
      trend.pattern.toLowerCase().includes(obj.type.toLowerCase().replace('_', ''))
    )

    if (alignedObjectives.length > 0) {
      relevance = Math.min(1, relevance + 0.2)
    }

    return relevance
  }

  private assessDocumentRelevance(doc: any, context: BusinessContext): number {
    // Higher relevance for documents related to current projects or clients
    const isProjectRelated = context.currentProjects.some(project =>
      doc.content?.toLowerCase().includes(project.toLowerCase())
    )
    
    const isClientRelated = context.activeClients.some(client =>
      doc.content?.toLowerCase().includes(client.toLowerCase())
    )

    if (isProjectRelated || isClientRelated) {
      return 0.9
    }

    return 0.6
  }

  private assessRiskRelevance(risk: any, context: BusinessContext): number {
    // High relevance for high-level risks
    const riskLevelWeight = {
      'CRITICAL': 1.0,
      'HIGH': 0.9,
      'MEDIUM': 0.7,
      'LOW': 0.5
    }

    return riskLevelWeight[risk.level] || 0.5
  }

  private assessComplianceRelevance(compliance: any, context: BusinessContext): number {
    // High relevance for non-compliant status
    const statusWeight = {
      'NON_COMPLIANT': 1.0,
      'REVIEW_REQUIRED': 0.9,
      'COMPLIANT': 0.6,
      'UNKNOWN': 0.4
    }

    return statusWeight[compliance.complianceStatus] || 0.5
  }

  private assessConversationRelevance(insight: any, context: BusinessContext): number {
    return insight.confidence * 0.8 // Base on AI confidence
  }

  private assessRecommendationRelevance(recommendation: any, context: BusinessContext): number {
    const priorityWeight = {
      'HIGH': 0.9,
      'MEDIUM': 0.7,
      'LOW': 0.5
    }

    return priorityWeight[recommendation.priority] || 0.5
  }

  private assessHistoricalRelevance(pattern: any, context: BusinessContext): number {
    // Higher relevance for recent patterns with high impact
    return pattern.impact * 0.8
  }

  private async analyzeCrossSourceCorrelations(
    rawInsights: any[],
    sources: InsightSource[]
  ): Promise<CrossFunctionalCorrelation[]> {
    const correlations: CrossFunctionalCorrelation[] = []

    // Group insights by categories for correlation analysis
    const insightsByCategory = this.groupInsightsByCategory(rawInsights)
    
    // Analyze correlations between categories
    const categories = Object.keys(insightsByCategory)
    
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const cat1 = categories[i]
        const cat2 = categories[j]
        
        const correlation = await this.calculateCategoryCorrelation(
          insightsByCategory[cat1],
          insightsByCategory[cat2]
        )
        
        if (correlation.strength > 0.3) { // Only include significant correlations
          correlations.push({
            areas: [cat1, cat2],
            correlation: correlation.description,
            strength: correlation.strength,
            businessImplication: correlation.businessImplication,
            actionableInsight: correlation.actionableInsight
          })
        }
      }
    }

    return correlations
  }

  private groupInsightsByCategory(insights: any[]): Record<string, any[]> {
    return insights.reduce((groups, insight) => {
      const category = this.categorizeInsight(insight)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(insight)
      return groups
    }, {} as Record<string, any[]>)
  }

  private categorizeInsight(insight: any): string {
    if (insight.type?.includes('KPI') || insight.type?.includes('TREND')) {
      return 'PERFORMANCE'
    }
    if (insight.type?.includes('RISK')) {
      return 'RISK'
    }
    if (insight.type?.includes('COMPLIANCE')) {
      return 'COMPLIANCE'
    }
    if (insight.type?.includes('FINANCIAL')) {
      return 'FINANCIAL'
    }
    return 'OPERATIONAL'
  }

  private async calculateCategoryCorrelation(
    category1Insights: any[],
    category2Insights: any[]
  ): Promise<{
    strength: number
    description: string
    businessImplication: string
    actionableInsight: string
  }> {
    // Simplified correlation calculation - in production, this would be more sophisticated
    const strength = Math.random() * 0.8 + 0.2 // Mock correlation strength
    
    return {
      strength,
      description: `Correlation identified between insight categories`,
      businessImplication: `Changes in one area may impact the other`,
      actionableInsight: `Monitor both areas for coordinated improvements`
    }
  }

  private async generateUnifiedInsights(
    rawInsights: any[],
    correlations: CrossFunctionalCorrelation[],
    context: BusinessContext,
    preferences: FusionPreferences
  ): Promise<UnifiedInsight[]> {
    const unifiedInsights: UnifiedInsight[] = []

    // Group and synthesize related insights
    const insightClusters = this.clusterRelatedInsights(rawInsights, correlations)
    
    for (const cluster of insightClusters) {
      try {
        // Generate unified insight from cluster
        const unifiedInsight = await this.synthesizeInsightCluster(cluster, context, preferences)
        unifiedInsights.push(unifiedInsight)
      } catch (error) {
        console.error('Failed to synthesize insight cluster:', error)
      }
    }

    return unifiedInsights
  }

  private clusterRelatedInsights(
    rawInsights: any[],
    correlations: CrossFunctionalCorrelation[]
  ): any[][] {
    // Simple clustering based on similarity and correlations
    const clusters: any[][] = []
    const processed = new Set<number>()

    for (let i = 0; i < rawInsights.length; i++) {
      if (processed.has(i)) continue

      const cluster = [rawInsights[i]]
      processed.add(i)

      // Find related insights
      for (let j = i + 1; j < rawInsights.length; j++) {
        if (processed.has(j)) continue

        if (this.areInsightsRelated(rawInsights[i], rawInsights[j], correlations)) {
          cluster.push(rawInsights[j])
          processed.add(j)
        }
      }

      clusters.push(cluster)
    }

    return clusters
  }

  private areInsightsRelated(insight1: any, insight2: any, correlations: CrossFunctionalCorrelation[]): boolean {
    // Check if insights share categories or are part of correlations
    const cat1 = this.categorizeInsight(insight1)
    const cat2 = this.categorizeInsight(insight2)
    
    if (cat1 === cat2) return true

    // Check correlations
    return correlations.some(corr => 
      corr.areas.includes(cat1) && corr.areas.includes(cat2)
    )
  }

  private async synthesizeInsightCluster(
    cluster: any[],
    context: BusinessContext,
    preferences: FusionPreferences
  ): Promise<UnifiedInsight> {
    // Use AI to synthesize cluster into unified insight
    const clusterSummary = cluster.map(insight => insight.insight).join('; ')
    
    // Generate unified insight with AI assistance
    const aiSynthesis = await this.generateAISynthesis(clusterSummary, context, preferences)
    
    return {
      id: `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: aiSynthesis.title || 'Unified Business Insight',
      type: this.determineInsightType(cluster),
      priority: this.calculateInsightPriority(cluster, context),
      confidence: this.calculateClusterConfidence(cluster),
      impact: this.assessInsightImpact(cluster, context),
      evidence: this.extractEvidence(cluster),
      correlations: this.mapClusterCorrelations(cluster),
      recommendations: await this.generateClusterRecommendations(cluster, context),
      predictions: await this.generateClusterPredictions(cluster, context),
      contextualRelevance: this.calculateContextualRelevance(cluster, context),
      businessValue: this.calculateBusinessValue(cluster, context),
      timestamp: new Date()
    }
  }

  private async generateAISynthesis(
    clusterSummary: string,
    context: BusinessContext,
    preferences: FusionPreferences
  ): Promise<{ title: string; synthesis: string }> {
    try {
      const response = await openaiService.chatWithAssistant({
        message: `Synthesize the following business insights into a unified, actionable insight for a ${context.userRole} at a CA firm:

Insights: ${clusterSummary}

Business Context:
- Role: ${context.userRole}
- Active Projects: ${context.currentProjects.join(', ')}
- Business Objectives: ${context.businessObjectives.map(obj => obj.type).join(', ')}

Please provide:
1. A clear, compelling title
2. A synthesized insight that connects the patterns
3. Business implications
4. Recommended actions

Format as professional business insight.`,
        context: {
          userRole: context.userRole,
          businessContext: 'Unified insight synthesis'
        }
      })

      // Parse AI response for title and synthesis
      const lines = response.response.split('\n')
      const title = lines.find(line => line.includes('Title:') || line.includes('TITLE:'))?.replace(/.*Title:\s*/i, '') || 'Business Insight'
      
      return {
        title,
        synthesis: response.response
      }
    } catch (error) {
      console.error('AI synthesis failed:', error)
      return {
        title: 'Business Insight',
        synthesis: 'Multiple related insights identified requiring attention.'
      }
    }
  }

  private determineInsightType(cluster: any[]): UnifiedInsight['type'] {
    // Determine type based on cluster characteristics
    const hasRisk = cluster.some(insight => insight.type?.includes('RISK'))
    const hasImmediate = cluster.some(insight => insight.priority === 'HIGH')
    
    if (hasRisk) return 'IMMEDIATE_ACTION'
    if (hasImmediate) return 'TACTICAL'
    return 'OPERATIONAL'
  }

  private calculateInsightPriority(cluster: any[], context: BusinessContext): UnifiedInsight['priority'] {
    // Calculate priority based on cluster insights and business context
    const highPriorityCount = cluster.filter(insight => 
      insight.businessRelevance > 0.8 || insight.riskLevel === 'HIGH' || insight.riskLevel === 'CRITICAL'
    ).length

    if (highPriorityCount > cluster.length / 2) return 'HIGH'
    if (highPriorityCount > 0) return 'MEDIUM'
    return 'LOW'
  }

  private calculateClusterConfidence(cluster: any[]): number {
    const confidences = cluster
      .map(insight => insight.confidence || insight.reliability || 0.5)
      .filter(c => c > 0)
    
    if (confidences.length === 0) return 0.5
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
  }

  private assessInsightImpact(cluster: any[], context: BusinessContext): InsightImpact {
    // Assess impact based on cluster contents and business context
    const hasFinancialImpact = cluster.some(insight => 
      insight.type?.includes('FINANCIAL') || insight.metric?.includes('revenue') || insight.metric?.includes('cost')
    )
    
    const hasStrategicImpact = cluster.some(insight => 
      insight.type?.includes('STRATEGIC') || insight.businessRelevance > 0.8
    )

    return {
      category: hasFinancialImpact ? 'FINANCIAL' : hasStrategicImpact ? 'STRATEGIC' : 'OPERATIONAL',
      magnitude: 'MODERATE',
      timeframe: 'SHORT_TERM',
      quantifiableImpact: this.estimateQuantifiableImpact(cluster)
    }
  }

  private estimateQuantifiableImpact(cluster: any[]): InsightImpact['quantifiableImpact'] {
    // Estimate quantifiable impact from cluster data
    const financialInsights = cluster.filter(insight => 
      insight.value && typeof insight.value === 'number'
    )
    
    if (financialInsights.length > 0) {
      const avgValue = financialInsights.reduce((sum, insight) => sum + insight.value, 0) / financialInsights.length
      
      return {
        metric: 'Estimated Financial Impact',
        estimatedValue: Math.round(avgValue),
        unit: 'USD',
        confidenceInterval: {
          min: Math.round(avgValue * 0.8),
          max: Math.round(avgValue * 1.2)
        }
      }
    }

    return undefined
  }

  private extractEvidence(cluster: any[]): Evidence[] {
    return cluster.map(insight => ({
      sourceType: insight.sourceType as Evidence['sourceType'],
      sourceId: insight.sourceId,
      dataPoint: insight.metric || insight.type || 'Business insight',
      value: insight.value || insight.insight,
      reliability: insight.reliability || 0.8,
      supportingData: insight
    }))
  }

  private mapClusterCorrelations(cluster: any[]): InsightCorrelation[] {
    // Map correlations within cluster
    const correlations: InsightCorrelation[] = []
    
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        if (this.areInsightsCorrelated(cluster[i], cluster[j])) {
          correlations.push({
            type: 'CORRELATIONAL',
            strength: 0.7,
            description: `Related insights from ${cluster[i].sourceType} and ${cluster[j].sourceType}`,
            relatedInsights: [cluster[i].sourceId, cluster[j].sourceId]
          })
        }
      }
    }

    return correlations
  }

  private areInsightsCorrelated(insight1: any, insight2: any): boolean {
    // Simple correlation check
    return insight1.sourceType === insight2.sourceType || 
           this.categorizeInsight(insight1) === this.categorizeInsight(insight2)
  }

  private async generateClusterRecommendations(
    cluster: any[],
    context: BusinessContext
  ): Promise<ActionableRecommendation[]> {
    const recommendations: ActionableRecommendation[] = []

    // Generate recommendations based on cluster insights
    const riskInsights = cluster.filter(insight => insight.type?.includes('RISK'))
    const performanceInsights = cluster.filter(insight => insight.type?.includes('KPI') || insight.type?.includes('PERFORMANCE'))

    if (riskInsights.length > 0) {
      recommendations.push({
        id: `rec_risk_${Date.now()}`,
        type: 'RISK_MITIGATION',
        title: 'Address Identified Risks',
        description: 'Take immediate action to mitigate identified risks',
        rationale: 'Risk insights indicate potential business impact',
        expectedOutcome: 'Reduced risk exposure and improved compliance',
        effort: 'MEDIUM',
        roi: 2.5,
        timeframe: 'Immediate to 30 days',
        dependencies: ['Management approval', 'Resource allocation'],
        resources: [
          { type: 'HUMAN', description: 'Risk management team', quantity: 2 }
        ],
        successMetrics: [
          { metric: 'Risk Score Reduction', baseline: 100, target: 70, measurementPeriod: '30 days', method: 'Risk assessment' }
        ]
      })
    }

    if (performanceInsights.length > 0) {
      recommendations.push({
        id: `rec_perf_${Date.now()}`,
        type: 'PROCESS_IMPROVEMENT',
        title: 'Optimize Performance Metrics',
        description: 'Focus on improving key performance indicators',
        rationale: 'Performance analysis shows improvement opportunities',
        expectedOutcome: 'Enhanced operational efficiency and results',
        effort: 'MEDIUM',
        roi: 3.0,
        timeframe: '30-90 days',
        dependencies: ['Process analysis', 'Team training'],
        resources: [
          { type: 'HUMAN', description: 'Process improvement team', quantity: 3 },
          { type: 'FINANCIAL', description: 'Training budget', cost: 15000 }
        ],
        successMetrics: [
          { metric: 'Performance Score', baseline: 75, target: 90, measurementPeriod: '90 days', method: 'KPI tracking' }
        ]
      })
    }

    return recommendations
  }

  private async generateClusterPredictions(
    cluster: any[],
    context: BusinessContext
  ): Promise<PredictiveInsight[]> {
    const predictions: PredictiveInsight[] = []

    // Generate predictions based on trends in cluster
    const trendInsights = cluster.filter(insight => insight.type?.includes('TREND'))
    
    if (trendInsights.length > 0) {
      predictions.push({
        type: 'TREND_FORECAST',
        description: 'Based on current trends, performance is expected to continue in the identified direction',
        prediction: 'Performance improvement expected',
        confidence: 0.75,
        timeHorizon: '3-6 months',
        scenarios: [
          {
            name: 'Optimistic',
            probability: 0.3,
            outcome: '20% improvement',
            factors: ['Continued positive trends', 'No external disruptions']
          },
          {
            name: 'Most Likely',
            probability: 0.5,
            outcome: '10% improvement',
            factors: ['Stable conditions', 'Gradual improvement']
          },
          {
            name: 'Conservative',
            probability: 0.2,
            outcome: '5% improvement',
            factors: ['Market challenges', 'Resource constraints']
          }
        ],
        assumptions: ['Current trends continue', 'No major business disruptions'],
        limitations: ['Based on historical data', 'External factors not fully considered']
      })
    }

    return predictions
  }

  private calculateContextualRelevance(cluster: any[], context: BusinessContext): number {
    const relevances = cluster.map(insight => insight.businessRelevance || 0.5)
    return relevances.reduce((sum, rel) => sum + rel, 0) / relevances.length
  }

  private calculateBusinessValue(cluster: any[], context: BusinessContext): number {
    // Calculate business value based on potential impact and relevance
    let value = 0

    cluster.forEach(insight => {
      const relevanceWeight = insight.businessRelevance || 0.5
      const confidenceWeight = insight.confidence || insight.reliability || 0.5
      const impactWeight = insight.riskLevel === 'HIGH' ? 0.9 : 0.6

      value += relevanceWeight * confidenceWeight * impactWeight
    })

    return Math.min(1, value / cluster.length)
  }

  private prioritizeInsights(insights: UnifiedInsight[], context: BusinessContext): UnifiedInsight[] {
    return insights.sort((a, b) => {
      // Sort by priority, then by business value, then by confidence
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      
      if (a.businessValue !== b.businessValue) {
        return b.businessValue - a.businessValue
      }
      
      return b.confidence - a.confidence
    })
  }

  // Additional helper methods for generating final result components...

  private async generateFusedRecommendations(
    insights: UnifiedInsight[],
    context: BusinessContext
  ): Promise<ActionableRecommendation[]> {
    const allRecommendations = insights.flatMap(insight => insight.recommendations)
    
    // Deduplicate and prioritize recommendations
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations)
    
    return uniqueRecommendations.sort((a, b) => b.roi - a.roi)
  }

  private deduplicateRecommendations(recommendations: ActionableRecommendation[]): ActionableRecommendation[] {
    const seen = new Set<string>()
    return recommendations.filter(rec => {
      const key = `${rec.type}_${rec.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private async generatePredictiveInsights(
    insights: UnifiedInsight[],
    sources: InsightSource[],
    context: BusinessContext
  ): Promise<PredictiveInsight[]> {
    return insights.flatMap(insight => insight.predictions)
  }

  private async generateExecutiveSummary(
    insights: UnifiedInsight[],
    recommendations: ActionableRecommendation[],
    predictions: PredictiveInsight[],
    context: BusinessContext,
    preferences: FusionPreferences
  ): Promise<ExecutiveSummary> {
    const topInsights = insights.slice(0, 3)
    const criticalRecommendations = recommendations.filter(rec => rec.type === 'IMMEDIATE_ACTION')
    const majorRisks = insights
      .filter(insight => insight.priority === 'HIGH' || insight.priority === 'CRITICAL')
      .map(insight => insight.title)

    return {
      overview: `Analysis of ${insights.length} unified insights reveals key patterns and opportunities for your organization.`,
      keyInsights: topInsights.map(insight => insight.title),
      criticalActions: criticalRecommendations.slice(0, 3).map(rec => rec.title),
      majorRisks: majorRisks.slice(0, 3),
      opportunities: insights
        .filter(insight => insight.impact.magnitude === 'SIGNIFICANT')
        .slice(0, 3)
        .map(insight => insight.title),
      bottomLine: this.generateBottomLineMessage(insights, recommendations, context)
    }
  }

  private generateBottomLineMessage(
    insights: UnifiedInsight[],
    recommendations: ActionableRecommendation[],
    context: BusinessContext
  ): string {
    const highPriorityCount = insights.filter(i => i.priority === 'HIGH' || i.priority === 'CRITICAL').length
    const avgROI = recommendations.reduce((sum, rec) => sum + rec.roi, 0) / recommendations.length
    
    return `${highPriorityCount} high-priority insights identified with average ROI potential of ${avgROI.toFixed(1)}x. Immediate action recommended on top priorities.`
  }

  private extractKeyFindings(insights: UnifiedInsight[]): KeyFinding[] {
    return insights.slice(0, 5).map(insight => ({
      category: insight.impact.category,
      finding: insight.title,
      significance: insight.priority as KeyFinding['significance'],
      supportingEvidence: insight.evidence.map(e => e.dataPoint),
      businessImplication: `Impact: ${insight.impact.magnitude} ${insight.impact.timeframe}`
    }))
  }

  private createActionPriorities(recommendations: ActionableRecommendation[]): ActionPriority[] {
    return recommendations.slice(0, 10).map((rec, index) => ({
      rank: index + 1,
      action: rec.title,
      rationale: rec.rationale,
      urgency: rec.timeframe.includes('Immediate') ? 'IMMEDIATE' : 
               rec.timeframe.includes('week') ? 'WITHIN_WEEK' :
               rec.timeframe.includes('month') ? 'WITHIN_MONTH' : 'QUARTERLY',
      expectedImpact: rec.expectedOutcome,
      resources: rec.resources.map(r => r.description)
    }))
  }

  private identifyRiskAlerts(insights: UnifiedInsight[]): RiskAlert[] {
    const riskInsights = insights.filter(insight => 
      insight.type === 'IMMEDIATE_ACTION' || insight.priority === 'HIGH' || insight.priority === 'CRITICAL'
    )

    return riskInsights.map(insight => ({
      type: insight.impact.category as RiskAlert['type'],
      severity: insight.priority as RiskAlert['severity'],
      description: insight.title,
      probability: insight.confidence,
      impact: insight.impact.magnitude,
      mitigation: insight.recommendations.map(rec => rec.title)
    }))
  }

  private generatePerformanceIndicators(
    insights: UnifiedInsight[],
    sources: InsightSource[]
  ): PerformanceIndicator[] {
    const performanceInsights = insights.filter(insight => 
      insight.evidence.some(e => e.sourceType === 'ANALYTICS')
    )

    return performanceInsights.map(insight => {
      const evidence = insight.evidence.find(e => e.sourceType === 'ANALYTICS')
      return {
        metric: evidence?.dataPoint || insight.title,
        currentValue: evidence?.value || 0,
        trend: 'STABLE' as const,
        benchmark: 100,
        insight: insight.title
      }
    })
  }

  private generateStrategicImplications(
    insights: UnifiedInsight[],
    context: BusinessContext
  ): StrategicImplication[] {
    const strategicInsights = insights.filter(insight => insight.type === 'STRATEGIC')

    return strategicInsights.map(insight => ({
      implication: insight.title,
      impact: insight.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
      timeframe: insight.impact.timeframe.toLowerCase().replace('_', ' '),
      considerations: insight.evidence.map(e => e.dataPoint),
      recommendations: insight.recommendations.map(rec => rec.title)
    }))
  }

  // Metadata calculation methods
  private calculateOverallConfidence(insights: UnifiedInsight[]): number {
    if (insights.length === 0) return 0
    return insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
  }

  private calculateQualityScore(sources: InsightSource[]): number {
    if (sources.length === 0) return 0
    return sources.reduce((sum, source) => sum + source.reliability, 0) / sources.length
  }

  private calculateFreshnessScore(sources: InsightSource[]): number {
    if (sources.length === 0) return 0
    
    const now = Date.now()
    const avgAge = sources.reduce((sum, source) => {
      const ageInHours = (now - source.timestamp.getTime()) / (1000 * 60 * 60)
      return sum + ageInHours
    }, 0) / sources.length

    // Convert age to freshness score (0-1, where 1 is very fresh)
    return Math.max(0, 1 - (avgAge / 168)) // 168 hours = 1 week
  }

  private calculateCorrelationStrength(correlations: CrossFunctionalCorrelation[]): number {
    if (correlations.length === 0) return 0
    return correlations.reduce((sum, corr) => sum + corr.strength, 0) / correlations.length
  }

  private calculateCompleteness(request: FusionInsightRequest, insights: UnifiedInsight[]): number {
    // Calculate how complete the fusion result is based on request preferences
    let completeness = 0.8 // Base completeness

    if (request.preferences.includeRecommendations && insights.some(i => i.recommendations.length > 0)) {
      completeness += 0.1
    }

    if (request.preferences.includePredictions && insights.some(i => i.predictions.length > 0)) {
      completeness += 0.1
    }

    return Math.min(1, completeness)
  }
}

// Export singleton instance
export const unifiedInsightFusion = new UnifiedInsightFusionEngine()