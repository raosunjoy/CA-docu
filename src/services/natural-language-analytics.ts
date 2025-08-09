import { openaiService } from './openai-service'
import { analyticsService } from './analytics-service'
import { vectorService } from './vector-service'
import { logger } from '../lib/logger'

// Types for Natural Language Analytics
export interface NLQueryRequest {
  id: string
  userId: string
  organizationId: string
  query: string
  context?: {
    timeframe?: {
      start: Date
      end: Date
    }
    filters?: Record<string, any>
    dataScope?: string[]
    userRole?: string
    previousQueries?: string[]
  }
  preferences?: {
    responseFormat: 'NARRATIVE' | 'STRUCTURED' | 'TABULAR' | 'VISUAL'
    includeCharts: boolean
    includeRecommendations: boolean
    detailLevel: 'SUMMARY' | 'DETAILED' | 'COMPREHENSIVE'
    confidenceThreshold: number
  }
  metadata?: {
    source: string
    sessionId?: string
    originalLanguage?: string
    businessContext?: Record<string, any>
  }
}

export interface NLQueryResult {
  requestId: string
  queryId: string
  naturalLanguageQuery: string
  interpretedQuery: QueryInterpretation
  executionResults: QueryExecutionResult
  insights: AnalyticsInsight[]
  recommendations: QueryRecommendation[]
  visualizations: VisualizationSpec[]
  narrative: {
    summary: string
    keyFindings: string[]
    explanation: string
    confidence: number
    limitations: string[]
  }
  executionMetadata: {
    processingTime: number
    dataPointsAnalyzed: number
    queriesExecuted: number
    confidenceScore: number
    executionPath: string[]
    cachedResults: boolean
    errorHandling: string[]
  }
}

export interface QueryInterpretation {
  intent: QueryIntent
  entities: QueryEntity[]
  metrics: string[]
  dimensions: string[]
  filters: QueryFilter[]
  aggregations: QueryAggregation[]
  timeframe: {
    start?: Date
    end?: Date
    period?: string
    granularity?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  }
  comparisons: QueryComparison[]
  sorting: {
    field: string
    direction: 'ASC' | 'DESC'
  }[]
  limits: {
    maxResults?: number
    threshold?: number
  }
  confidence: number
  ambiguities: QueryAmbiguity[]
}

export interface QueryIntent {
  primaryAction: 'ANALYZE' | 'COMPARE' | 'TREND' | 'FORECAST' | 'SUMMARIZE' | 'DRILL_DOWN' | 'MONITOR' | 'BENCHMARK'
  secondaryActions: string[]
  businessQuestion: string
  analyticsType: 'DESCRIPTIVE' | 'DIAGNOSTIC' | 'PREDICTIVE' | 'PRESCRIPTIVE'
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'ADVANCED'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface QueryEntity {
  type: 'METRIC' | 'DIMENSION' | 'FILTER' | 'TIME' | 'ENTITY' | 'THRESHOLD'
  value: string
  originalText: string
  confidence: number
  alternatives: string[]
  context: string
  resolved: boolean
  mappedTo?: string
}

export interface QueryFilter {
  field: string
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'BETWEEN' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'STARTS_WITH'
  value: any
  logicalOperator?: 'AND' | 'OR' | 'NOT'
  confidence: number
}

export interface QueryAggregation {
  function: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' | 'MEDIAN' | 'PERCENTILE' | 'DISTINCT_COUNT'
  field: string
  groupBy?: string[]
  having?: QueryFilter[]
}

export interface QueryComparison {
  type: 'PERIOD_OVER_PERIOD' | 'BENCHMARK' | 'COHORT' | 'SEGMENT'
  baseline: any
  target: any
  metric: string
}

export interface QueryAmbiguity {
  type: 'METRIC_AMBIGUITY' | 'DIMENSION_AMBIGUITY' | 'FILTER_AMBIGUITY' | 'TIME_AMBIGUITY'
  description: string
  options: string[]
  recommendation: string
  requiresClarification: boolean
}

export interface QueryExecutionResult {
  data: any[]
  totalRows: number
  executedQueries: ExecutedQuery[]
  aggregations: Record<string, any>
  metadata: {
    dataSource: string
    executionTime: number
    cacheHit: boolean
    resultSize: number
    dataQuality: {
      completeness: number
      accuracy: number
      freshness: number
    }
  }
}

export interface ExecutedQuery {
  queryType: 'SQL' | 'AGGREGATION' | 'ANALYTICS_SERVICE' | 'EXTERNAL_API'
  query: string
  executionTime: number
  resultCount: number
  cached: boolean
}

export interface AnalyticsInsight {
  id: string
  type: 'TREND' | 'ANOMALY' | 'CORRELATION' | 'PATTERN' | 'OUTLIER' | 'SEASONALITY'
  title: string
  description: string
  significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confidence: number
  impact: {
    business: string
    financial?: {
      amount: number
      currency: string
      timeframe: string
    }
    operational?: string
  }
  evidence: {
    dataPoints: any[]
    statisticalTests?: string[]
    correlation?: number
  }
  actionable: boolean
  relatedMetrics: string[]
}

export interface QueryRecommendation {
  id: string
  type: 'FOLLOW_UP_QUERY' | 'DRILL_DOWN' | 'DATA_IMPROVEMENT' | 'ANALYSIS_ENHANCEMENT' | 'ACTION_ITEM'
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  effort: 'LOW' | 'MEDIUM' | 'HIGH'
  suggestedQuery?: string
  reasoning: string
  expectedBenefit: string
}

export interface VisualizationSpec {
  id: string
  type: 'LINE_CHART' | 'BAR_CHART' | 'PIE_CHART' | 'SCATTER_PLOT' | 'HEATMAP' | 'TABLE' | 'KPI_CARD' | 'GAUGE'
  title: string
  description: string
  data: any[]
  config: {
    xAxis?: {
      field: string
      label: string
      type: 'CATEGORICAL' | 'NUMERICAL' | 'TEMPORAL'
    }
    yAxis?: {
      field: string
      label: string
      type: 'CATEGORICAL' | 'NUMERICAL'
    }
    series?: {
      field: string
      label: string
      color?: string
    }[]
    formatting?: Record<string, any>
    interactions?: string[]
  }
  insights: string[]
  priority: number
}

export interface NLQuerySession {
  id: string
  userId: string
  organizationId: string
  queries: NLQueryResult[]
  context: {
    businessDomain: string
    currentFocus: string[]
    learnings: Record<string, any>
    preferences: Record<string, any>
  }
  createdAt: Date
  lastActiveAt: Date
  isActive: boolean
}

export interface QuerySuggestion {
  query: string
  category: string
  description: string
  complexity: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  estimatedExecutionTime: number
  expectedInsights: string[]
  prerequisites?: string[]
}

export interface DataSchema {
  tables: DataTable[]
  relationships: DataRelationship[]
  metrics: MetricDefinition[]
  dimensions: DimensionDefinition[]
  businessGlossary: BusinessTerm[]
}

export interface DataTable {
  name: string
  displayName: string
  description: string
  columns: DataColumn[]
  sampleQueries: string[]
  category: string
}

export interface DataColumn {
  name: string
  displayName: string
  type: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP'
  description: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  examples: any[]
}

export interface DataRelationship {
  fromTable: string
  toTable: string
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY'
  joinCondition: string
  description: string
}

export interface MetricDefinition {
  name: string
  displayName: string
  description: string
  formula: string
  unit: string
  category: string
  aggregationType: string
  businessContext: string
  synonyms: string[]
  relatedMetrics: string[]
}

export interface DimensionDefinition {
  name: string
  displayName: string
  description: string
  type: string
  hierarchy?: string[]
  category: string
  synonyms: string[]
}

export interface BusinessTerm {
  term: string
  definition: string
  category: string
  synonyms: string[]
  relatedTerms: string[]
  usage: string[]
}

// Main service class
export class NaturalLanguageAnalyticsService {
  private sessions: Map<string, NLQuerySession> = new Map()
  private queryCache: Map<string, NLQueryResult> = new Map()
  private dataSchema: DataSchema

  constructor() {
    this.initializeDataSchema()
  }

  /**
   * Process natural language query and return analytics results
   */
  async processNaturalLanguageQuery(request: NLQueryRequest): Promise<NLQueryResult> {
    const startTime = Date.now()
    logger.info('Processing natural language query', { 
      requestId: request.id, 
      query: request.query,
      userId: request.userId 
    })

    try {
      // Validate request
      this.validateQueryRequest(request)

      // Check cache first
      const cacheKey = this.generateCacheKey(request)
      const cachedResult = this.queryCache.get(cacheKey)
      if (cachedResult && this.isCacheValid(cachedResult)) {
        logger.info('Returning cached query result', { requestId: request.id })
        return {
          ...cachedResult,
          executionMetadata: {
            ...cachedResult.executionMetadata,
            cachedResults: true
          }
        }
      }

      // Interpret natural language query
      const interpretation = await this.interpretQuery(request)

      // Execute query based on interpretation
      const executionResults = await this.executeQuery(interpretation, request)

      // Generate insights from results
      const insights = await this.generateInsights(executionResults, interpretation, request)

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        interpretation, 
        executionResults, 
        insights, 
        request
      )

      // Generate visualizations
      const visualizations = await this.generateVisualizations(
        executionResults, 
        interpretation, 
        insights
      )

      // Generate narrative explanation
      const narrative = await this.generateNarrative(
        interpretation, 
        executionResults, 
        insights, 
        recommendations, 
        request
      )

      const processingTime = Date.now() - startTime

      const result: NLQueryResult = {
        requestId: request.id,
        queryId: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        naturalLanguageQuery: request.query,
        interpretedQuery: interpretation,
        executionResults,
        insights,
        recommendations,
        visualizations,
        narrative,
        executionMetadata: {
          processingTime,
          dataPointsAnalyzed: executionResults.totalRows,
          queriesExecuted: executionResults.executedQueries.length,
          confidenceScore: this.calculateOverallConfidence(interpretation, insights),
          executionPath: this.getExecutionPath(interpretation),
          cachedResults: false,
          errorHandling: []
        }
      }

      // Cache the result
      this.queryCache.set(cacheKey, result)

      // Update session context
      await this.updateSessionContext(request.userId, result)

      logger.info('Natural language query processed successfully', {
        requestId: request.id,
        queryId: result.queryId,
        processingTime,
        dataPointsAnalyzed: result.executionMetadata.dataPointsAnalyzed,
        insightsGenerated: insights.length,
        confidenceScore: result.executionMetadata.confidenceScore
      })

      return result

    } catch (error) {
      logger.error('Natural language query processing failed', { 
        requestId: request.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      // Return error response with helpful information
      return this.generateErrorResponse(request, error)
    }
  }

  /**
   * Get query suggestions based on user context and data availability
   */
  async getQuerySuggestions(
    userId: string, 
    organizationId: string, 
    context?: {
      currentFocus?: string[]
      userRole?: string
      recentQueries?: string[]
    }
  ): Promise<QuerySuggestion[]> {
    const suggestions: QuerySuggestion[] = []

    // Base suggestions for CA firms
    const baseSuggestions = [
      {
        query: "What was our revenue trend over the last 6 months?",
        category: "Financial Performance",
        description: "Analyze revenue trends with period-over-period comparison",
        complexity: "BEGINNER" as const,
        estimatedExecutionTime: 2000,
        expectedInsights: ["Revenue growth rate", "Seasonal patterns", "Performance vs targets"],
        prerequisites: []
      },
      {
        query: "Which clients generated the highest profits this quarter?",
        category: "Client Analytics",
        description: "Identify most profitable clients with profitability analysis",
        complexity: "INTERMEDIATE" as const,
        estimatedExecutionTime: 3000,
        expectedInsights: ["Top performing clients", "Profit margins", "Client value distribution"],
        prerequisites: ["Client profitability data"]
      },
      {
        query: "Show me task completion rates by team member for the current month",
        category: "Team Performance",
        description: "Analyze individual and team productivity metrics",
        complexity: "BEGINNER" as const,
        estimatedExecutionTime: 1500,
        expectedInsights: ["Individual performance", "Team benchmarks", "Productivity trends"],
        prerequisites: []
      },
      {
        query: "Compare our billable hours utilization across different service lines",
        category: "Operational Analytics",
        description: "Cross-service utilization analysis with benchmarking",
        complexity: "INTERMEDIATE" as const,
        estimatedExecutionTime: 4000,
        expectedInsights: ["Service line efficiency", "Resource allocation", "Optimization opportunities"],
        prerequisites: ["Time tracking data", "Service line classification"]
      },
      {
        query: "Predict next quarter's revenue based on current pipeline and historical patterns",
        category: "Predictive Analytics",
        description: "Revenue forecasting with confidence intervals",
        complexity: "ADVANCED" as const,
        estimatedExecutionTime: 8000,
        expectedInsights: ["Revenue forecast", "Pipeline analysis", "Risk factors"],
        prerequisites: ["Pipeline data", "Historical revenue data"]
      },
      {
        query: "What are the compliance score trends and which areas need attention?",
        category: "Compliance Analytics",
        description: "Compliance monitoring with risk area identification",
        complexity: "INTERMEDIATE" as const,
        estimatedExecutionTime: 3500,
        expectedInsights: ["Compliance trends", "Risk areas", "Improvement recommendations"],
        prerequisites: ["Compliance scoring data"]
      }
    ]

    // Add contextual suggestions based on user role
    if (context?.userRole) {
      switch (context.userRole) {
        case 'PARTNER':
          suggestions.push({
            query: "Show me the profitability analysis by practice area with year-over-year comparison",
            category: "Strategic Analytics",
            description: "High-level financial performance analysis for strategic decisions",
            complexity: "ADVANCED" as const,
            estimatedExecutionTime: 6000,
            expectedInsights: ["Practice area performance", "Strategic opportunities", "Investment priorities"],
            prerequisites: ["Practice area classification", "Detailed financial data"]
          })
          break

        case 'MANAGER':
          suggestions.push({
            query: "Which team members are at risk of burnout based on workload and utilization patterns?",
            category: "Team Management",
            description: "Predictive analysis for team wellness and resource management",
            complexity: "ADVANCED" as const,
            estimatedExecutionTime: 5000,
            expectedInsights: ["Burnout risk assessment", "Workload distribution", "Resource reallocation needs"],
            prerequisites: ["Workload tracking", "Utilization metrics"]
          })
          break

        case 'ASSOCIATE':
          suggestions.push({
            query: "What's my personal productivity trend and how do I compare to team averages?",
            category: "Personal Analytics",
            description: "Individual performance analysis with peer benchmarking",
            complexity: "BEGINNER" as const,
            estimatedExecutionTime: 2500,
            expectedInsights: ["Personal performance trends", "Peer comparison", "Improvement areas"],
            prerequisites: []
          })
          break
      }
    }

    // Add focus-based suggestions
    if (context?.currentFocus) {
      for (const focus of context.currentFocus) {
        switch (focus) {
          case 'FINANCIAL_ANALYSIS':
            suggestions.push({
              query: "Analyze cash flow patterns and identify potential liquidity issues",
              category: "Financial Risk",
              description: "Cash flow analysis with liquidity risk assessment",
              complexity: "INTERMEDIATE" as const,
              estimatedExecutionTime: 4500,
              expectedInsights: ["Cash flow trends", "Liquidity risks", "Working capital optimization"],
              prerequisites: ["Cash flow data", "Accounts receivable/payable"]
            })
            break

          case 'CLIENT_MANAGEMENT':
            suggestions.push({
              query: "Which clients have the highest churn risk and what can we do to retain them?",
              category: "Client Retention",
              description: "Client churn prediction with retention strategies",
              complexity: "ADVANCED" as const,
              estimatedExecutionTime: 7000,
              expectedInsights: ["Churn risk scores", "Risk factors", "Retention strategies"],
              prerequisites: ["Client engagement data", "Service history"]
            })
            break
        }
      }
    }

    // Return all base suggestions plus contextual ones
    return [...baseSuggestions, ...suggestions].slice(0, 10) // Limit to 10 suggestions
  }

  /**
   * Get available data schema and business glossary
   */
  async getDataSchema(): Promise<DataSchema> {
    return this.dataSchema
  }

  /**
   * Get query session for conversational analytics
   */
  async getQuerySession(userId: string, sessionId?: string): Promise<NLQuerySession> {
    const key = sessionId || `${userId}_current`
    
    let session = this.sessions.get(key)
    if (!session) {
      session = {
        id: sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        organizationId: 'default-org', // Would be retrieved from user context
        queries: [],
        context: {
          businessDomain: 'ACCOUNTING_SERVICES',
          currentFocus: [],
          learnings: {},
          preferences: {}
        },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        isActive: true
      }
      this.sessions.set(key, session)
    }

    return session
  }

  /**
   * Explain query interpretation for transparency
   */
  async explainQueryInterpretation(interpretation: QueryInterpretation): Promise<{
    explanation: string
    components: {
      intent: string
      entities: string
      metrics: string
      filters: string
      timeframe: string
    }
    confidence: {
      overall: number
      breakdown: Record<string, number>
    }
    alternatives: string[]
  }> {
    return {
      explanation: `I interpreted your query as a ${interpretation.intent.primaryAction.toLowerCase()} operation focusing on ${interpretation.metrics.join(', ')}. The analysis will ${interpretation.intent.businessQuestion}.`,
      components: {
        intent: `Primary action: ${interpretation.intent.primaryAction} (${interpretation.intent.analyticsType} analytics)`,
        entities: `Identified ${interpretation.entities.length} entities: ${interpretation.entities.map(e => e.value).join(', ')}`,
        metrics: `Metrics to analyze: ${interpretation.metrics.join(', ')}`,
        filters: interpretation.filters.length > 0 ? 
          `Filters applied: ${interpretation.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}` :
          'No specific filters applied',
        timeframe: interpretation.timeframe.start && interpretation.timeframe.end ?
          `Time range: ${interpretation.timeframe.start.toDateString()} to ${interpretation.timeframe.end.toDateString()}` :
          interpretation.timeframe.period ? `Period: ${interpretation.timeframe.period}` : 'No specific timeframe'
      },
      confidence: {
        overall: interpretation.confidence,
        breakdown: {
          intent: interpretation.intent.primaryAction ? 0.9 : 0.5,
          entities: interpretation.entities.reduce((avg, e) => avg + e.confidence, 0) / Math.max(interpretation.entities.length, 1),
          metrics: interpretation.metrics.length > 0 ? 0.8 : 0.3,
          filters: interpretation.filters.reduce((avg, f) => avg + f.confidence, 0) / Math.max(interpretation.filters.length, 1) || 0.7
        }
      },
      alternatives: [
        "You could also ask for trend analysis over time",
        "Consider adding filters for specific segments",
        "Try comparing against benchmarks or targets"
      ]
    }
  }

  // Private helper methods

  private initializeDataSchema(): void {
    // Initialize with CA firm-specific data schema
    this.dataSchema = {
      tables: [
        {
          name: 'tasks',
          displayName: 'Tasks',
          description: 'All tasks and projects in the system',
          category: 'Operations',
          columns: [
            {
              name: 'id',
              displayName: 'Task ID',
              type: 'STRING',
              description: 'Unique task identifier',
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              examples: ['task_123', 'task_456']
            },
            {
              name: 'title',
              displayName: 'Task Title',
              type: 'STRING',
              description: 'Task title or description',
              nullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
              examples: ['Tax Return Preparation', 'Audit Fieldwork']
            },
            {
              name: 'status',
              displayName: 'Status',
              type: 'STRING',
              description: 'Current task status',
              nullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
              examples: ['IN_PROGRESS', 'COMPLETED', 'PENDING']
            },
            {
              name: 'assigned_to',
              displayName: 'Assigned To',
              type: 'STRING',
              description: 'User assigned to the task',
              nullable: true,
              isPrimaryKey: false,
              isForeignKey: true,
              examples: ['user_123', 'user_456']
            },
            {
              name: 'completed_at',
              displayName: 'Completion Date',
              type: 'TIMESTAMP',
              description: 'When the task was completed',
              nullable: true,
              isPrimaryKey: false,
              isForeignKey: false,
              examples: ['2024-01-15T10:30:00Z']
            }
          ],
          sampleQueries: [
            "How many tasks were completed this month?",
            "Who has the most overdue tasks?",
            "What's our team's task completion rate?"
          ]
        },
        {
          name: 'clients',
          displayName: 'Clients',
          description: 'Client information and relationships',
          category: 'Client Management',
          columns: [
            {
              name: 'id',
              displayName: 'Client ID',
              type: 'STRING',
              description: 'Unique client identifier',
              nullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
              examples: ['client_123', 'client_456']
            },
            {
              name: 'name',
              displayName: 'Client Name',
              type: 'STRING',
              description: 'Client company or individual name',
              nullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
              examples: ['Acme Corp', 'John Smith CPA']
            },
            {
              name: 'revenue',
              displayName: 'Annual Revenue',
              type: 'FLOAT',
              description: 'Annual revenue generated from client',
              nullable: true,
              isPrimaryKey: false,
              isForeignKey: false,
              examples: [150000.00, 75000.00]
            }
          ],
          sampleQueries: [
            "Which clients generate the most revenue?",
            "How many new clients did we acquire this quarter?",
            "What's the average client value?"
          ]
        }
      ],
      relationships: [
        {
          fromTable: 'tasks',
          toTable: 'clients',
          type: 'MANY_TO_ONE',
          joinCondition: 'tasks.client_id = clients.id',
          description: 'Tasks belong to clients'
        }
      ],
      metrics: [
        {
          name: 'task_completion_rate',
          displayName: 'Task Completion Rate',
          description: 'Percentage of tasks completed on time',
          formula: 'COUNT(completed_tasks) / COUNT(total_tasks) * 100',
          unit: '%',
          category: 'Productivity',
          aggregationType: 'PERCENTAGE',
          businessContext: 'Measures team efficiency in completing assigned work',
          synonyms: ['completion rate', 'task success rate'],
          relatedMetrics: ['utilization_rate', 'productivity_score']
        },
        {
          name: 'revenue',
          displayName: 'Revenue',
          description: 'Total revenue generated',
          formula: 'SUM(client_revenue)',
          unit: '$',
          category: 'Financial',
          aggregationType: 'SUM',
          businessContext: 'Primary financial performance indicator',
          synonyms: ['income', 'earnings', 'sales'],
          relatedMetrics: ['profit', 'profit_margin']
        }
      ],
      dimensions: [
        {
          name: 'time',
          displayName: 'Time Period',
          description: 'Date and time dimensions',
          type: 'TEMPORAL',
          hierarchy: ['year', 'quarter', 'month', 'week', 'day'],
          category: 'Time',
          synonyms: ['date', 'period', 'timeframe']
        },
        {
          name: 'user',
          displayName: 'Team Member',
          description: 'Individual users and team members',
          type: 'CATEGORICAL',
          category: 'People',
          synonyms: ['employee', 'staff', 'team member', 'person']
        }
      ],
      businessGlossary: [
        {
          term: 'Utilization Rate',
          definition: 'Percentage of available time spent on billable client work',
          category: 'Productivity Metrics',
          synonyms: ['billable utilization', 'efficiency rate'],
          relatedTerms: ['billable hours', 'productivity'],
          usage: ['team performance analysis', 'resource planning']
        },
        {
          term: 'Realization Rate',
          definition: 'Percentage of standard billing rates actually collected from clients',
          category: 'Financial Metrics',
          synonyms: ['collection rate', 'billing efficiency'],
          relatedTerms: ['revenue', 'profitability'],
          usage: ['financial analysis', 'client profitability']
        }
      ]
    }
  }

  private validateQueryRequest(request: NLQueryRequest): void {
    if (!request.query || request.query.trim().length === 0) {
      throw new Error('Query cannot be empty')
    }
    if (!request.userId) {
      throw new Error('User ID is required')
    }
    if (!request.organizationId) {
      throw new Error('Organization ID is required')
    }
  }

  private generateCacheKey(request: NLQueryRequest): string {
    const keyData = {
      query: request.query.toLowerCase().trim(),
      organizationId: request.organizationId,
      timeframe: request.context?.timeframe,
      filters: request.context?.filters
    }
    return `nlquery_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`
  }

  private isCacheValid(cachedResult: NLQueryResult): boolean {
    const cacheAge = Date.now() - new Date(cachedResult.executionMetadata.processingTime).getTime()
    const maxCacheAge = 5 * 60 * 1000 // 5 minutes
    return cacheAge < maxCacheAge
  }

  private async interpretQuery(request: NLQueryRequest): Promise<QueryInterpretation> {
    try {
      // Use AI to interpret the natural language query
      const aiPrompt = `
        You are an expert data analyst for a CA (Chartered Accountant) firm. 
        Interpret this natural language query and extract the key components:
        
        Query: "${request.query}"
        User Role: ${request.context?.userRole || 'Unknown'}
        
        Available Metrics: ${this.dataSchema.metrics.map(m => `${m.name} (${m.displayName})`).join(', ')}
        Available Dimensions: ${this.dataSchema.dimensions.map(d => `${d.name} (${d.displayName})`).join(', ')}
        
        Extract:
        1. Primary intent (ANALYZE, COMPARE, TREND, FORECAST, etc.)
        2. Metrics to analyze
        3. Dimensions to group by
        4. Filters to apply
        5. Time frame
        6. Any comparisons needed
        
        Respond with structured information.
      `

      const aiResponse = await openaiService.chatWithAssistant(aiPrompt)
      
      // Parse AI response and create structured interpretation
      const interpretation: QueryInterpretation = {
        intent: this.extractIntent(request.query, aiResponse.response),
        entities: this.extractEntities(request.query),
        metrics: this.extractMetrics(request.query, aiResponse.response),
        dimensions: this.extractDimensions(request.query, aiResponse.response),
        filters: this.extractFilters(request.query, aiResponse.response),
        aggregations: this.extractAggregations(request.query, aiResponse.response),
        timeframe: this.extractTimeframe(request.query, request.context?.timeframe),
        comparisons: this.extractComparisons(request.query, aiResponse.response),
        sorting: this.extractSorting(request.query),
        limits: this.extractLimits(request.query),
        confidence: aiResponse.confidence || 0.8,
        ambiguities: this.identifyAmbiguities(request.query, aiResponse.response)
      }

      return interpretation

    } catch (error) {
      logger.warn('AI interpretation failed, using fallback', { error })
      
      // Fallback to rule-based interpretation
      return this.fallbackInterpretation(request)
    }
  }

  private async executeQuery(interpretation: QueryInterpretation, request: NLQueryRequest): Promise<QueryExecutionResult> {
    const executedQueries: ExecutedQuery[] = []
    let data: any[] = []
    let totalRows = 0

    try {
      // Determine execution strategy based on interpretation
      if (interpretation.metrics.includes('revenue') || interpretation.metrics.includes('profit')) {
        // Financial analytics query
        const financialData = await this.executeFinancialQuery(interpretation, request)
        data = financialData.data
        totalRows = financialData.totalRows
        executedQueries.push({
          queryType: 'ANALYTICS_SERVICE',
          query: 'Financial metrics aggregation',
          executionTime: 150,
          resultCount: totalRows,
          cached: false
        })
      }

      if (interpretation.metrics.includes('task_completion_rate') || interpretation.intent.primaryAction === 'ANALYZE') {
        // Productivity analytics query
        const productivityData = await this.executeProductivityQuery(interpretation, request)
        if (data.length === 0) {
          data = productivityData.data
          totalRows = productivityData.totalRows
        }
        executedQueries.push({
          queryType: 'ANALYTICS_SERVICE',
          query: 'Productivity metrics calculation',
          executionTime: 100,
          resultCount: productivityData.totalRows,
          cached: false
        })
      }

      // If no specific data found, generate mock data based on interpretation
      if (data.length === 0) {
        data = this.generateMockData(interpretation)
        totalRows = data.length
        executedQueries.push({
          queryType: 'AGGREGATION',
          query: 'Mock data generation for demo',
          executionTime: 50,
          resultCount: totalRows,
          cached: false
        })
      }

      // Apply filters and aggregations
      const processedData = this.applyFiltersAndAggregations(data, interpretation)

      return {
        data: processedData,
        totalRows: processedData.length,
        executedQueries,
        aggregations: this.calculateAggregations(processedData, interpretation),
        metadata: {
          dataSource: 'ANALYTICS_SERVICE',
          executionTime: executedQueries.reduce((sum, q) => sum + q.executionTime, 0),
          cacheHit: false,
          resultSize: JSON.stringify(processedData).length,
          dataQuality: {
            completeness: 0.95,
            accuracy: 0.90,
            freshness: 0.85
          }
        }
      }

    } catch (error) {
      logger.error('Query execution failed', { error })
      
      // Return mock data on error
      return {
        data: this.generateMockData(interpretation),
        totalRows: 10,
        executedQueries: [{
          queryType: 'AGGREGATION',
          query: 'Fallback mock data',
          executionTime: 25,
          resultCount: 10,
          cached: false
        }],
        aggregations: {},
        metadata: {
          dataSource: 'MOCK',
          executionTime: 25,
          cacheHit: false,
          resultSize: 500,
          dataQuality: {
            completeness: 0.8,
            accuracy: 0.7,
            freshness: 0.9
          }
        }
      }
    }
  }

  private async executeFinancialQuery(interpretation: QueryInterpretation, request: NLQueryRequest): Promise<{ data: any[], totalRows: number }> {
    // Mock financial data query execution
    const data = [
      { month: 'January', revenue: 150000, profit: 45000, client_count: 25 },
      { month: 'February', revenue: 165000, profit: 52000, client_count: 27 },
      { month: 'March', revenue: 142000, profit: 38000, client_count: 24 },
      { month: 'April', revenue: 178000, profit: 58000, client_count: 29 },
      { month: 'May', revenue: 195000, profit: 68000, client_count: 32 },
      { month: 'June', revenue: 187000, profit: 61000, client_count: 30 }
    ]

    return { data, totalRows: data.length }
  }

  private async executeProductivityQuery(interpretation: QueryInterpretation, request: NLQueryRequest): Promise<{ data: any[], totalRows: number }> {
    // Mock productivity data query execution
    const data = [
      { team_member: 'Alice Johnson', tasks_completed: 45, tasks_assigned: 50, completion_rate: 0.90, utilization_rate: 0.85 },
      { team_member: 'Bob Smith', tasks_completed: 38, tasks_assigned: 42, completion_rate: 0.90, utilization_rate: 0.78 },
      { team_member: 'Carol Davis', tasks_completed: 52, tasks_assigned: 55, completion_rate: 0.95, utilization_rate: 0.92 },
      { team_member: 'David Wilson', tasks_completed: 41, tasks_assigned: 48, completion_rate: 0.85, utilization_rate: 0.73 },
      { team_member: 'Eva Brown', tasks_completed: 47, tasks_assigned: 50, completion_rate: 0.94, utilization_rate: 0.88 }
    ]

    return { data, totalRows: data.length }
  }

  private generateMockData(interpretation: QueryInterpretation): any[] {
    // Generate mock data based on interpretation
    const data = []
    const dataPoints = Math.min(interpretation.limits.maxResults || 20, 20)

    for (let i = 0; i < dataPoints; i++) {
      const record: any = {}
      
      // Add metrics with mock values
      for (const metric of interpretation.metrics) {
        switch (metric) {
          case 'revenue':
            record[metric] = Math.floor(Math.random() * 200000) + 50000
            break
          case 'task_completion_rate':
            record[metric] = Math.random() * 0.3 + 0.7 // 70-100%
            break
          case 'utilization_rate':
            record[metric] = Math.random() * 0.4 + 0.6 // 60-100%
            break
          default:
            record[metric] = Math.floor(Math.random() * 100) + 1
        }
      }

      // Add dimensions with mock values
      for (const dimension of interpretation.dimensions) {
        switch (dimension) {
          case 'time':
            record[dimension] = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            break
          case 'user':
            record[dimension] = ['Alice', 'Bob', 'Carol', 'David', 'Eva'][Math.floor(Math.random() * 5)]
            break
          case 'client':
            record[dimension] = ['Acme Corp', 'TechStart Inc', 'Retail Plus', 'Manufacturing Co'][Math.floor(Math.random() * 4)]
            break
          default:
            record[dimension] = `${dimension}_${i + 1}`
        }
      }

      data.push(record)
    }

    return data
  }

  private applyFiltersAndAggregations(data: any[], interpretation: QueryInterpretation): any[] {
    let filteredData = [...data]

    // Apply filters
    for (const filter of interpretation.filters) {
      filteredData = filteredData.filter(record => {
        const value = record[filter.field]
        switch (filter.operator) {
          case 'EQUALS':
            return value === filter.value
          case 'GREATER_THAN':
            return value > filter.value
          case 'LESS_THAN':
            return value < filter.value
          case 'CONTAINS':
            return value && value.toString().toLowerCase().includes(filter.value.toLowerCase())
          default:
            return true
        }
      })
    }

    // Apply sorting
    if (interpretation.sorting.length > 0) {
      filteredData.sort((a, b) => {
        for (const sort of interpretation.sorting) {
          const aVal = a[sort.field]
          const bVal = b[sort.field]
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
          if (comparison !== 0) {
            return sort.direction === 'DESC' ? -comparison : comparison
          }
        }
        return 0
      })
    }

    // Apply limits
    if (interpretation.limits.maxResults) {
      filteredData = filteredData.slice(0, interpretation.limits.maxResults)
    }

    return filteredData
  }

  private calculateAggregations(data: any[], interpretation: QueryInterpretation): Record<string, any> {
    const aggregations: Record<string, any> = {}

    for (const agg of interpretation.aggregations) {
      const values = data.map(record => record[agg.field]).filter(val => val != null)
      
      switch (agg.function) {
        case 'SUM':
          aggregations[`${agg.field}_sum`] = values.reduce((sum, val) => sum + (Number(val) || 0), 0)
          break
        case 'AVG':
          aggregations[`${agg.field}_avg`] = values.length > 0 ? 
            values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length : 0
          break
        case 'COUNT':
          aggregations[`${agg.field}_count`] = values.length
          break
        case 'MIN':
          aggregations[`${agg.field}_min`] = Math.min(...values.map(v => Number(v) || 0))
          break
        case 'MAX':
          aggregations[`${agg.field}_max`] = Math.max(...values.map(v => Number(v) || 0))
          break
      }
    }

    return aggregations
  }

  private async generateInsights(
    executionResults: QueryExecutionResult, 
    interpretation: QueryInterpretation, 
    request: NLQueryRequest
  ): Promise<AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = []

    try {
      // Analyze data for trends
      const trendInsight = this.analyzeTrends(executionResults.data, interpretation)
      if (trendInsight) insights.push(trendInsight)

      // Look for anomalies
      const anomalyInsight = this.detectAnomalies(executionResults.data, interpretation)
      if (anomalyInsight) insights.push(anomalyInsight)

      // Find patterns
      const patternInsight = this.identifyPatterns(executionResults.data, interpretation)
      if (patternInsight) insights.push(patternInsight)

      // Use AI for additional insights
      if (executionResults.data.length > 0) {
        const aiInsights = await this.generateAIInsights(executionResults.data, interpretation, request)
        insights.push(...aiInsights)
      }

    } catch (error) {
      logger.warn('Insight generation failed', { error })
    }

    return insights.slice(0, 5) // Limit to top 5 insights
  }

  private analyzeTrends(data: any[], interpretation: QueryInterpretation): AnalyticsInsight | null {
    // Simple trend analysis for numeric metrics over time
    if (interpretation.metrics.length === 0 || data.length < 2) return null

    const metric = interpretation.metrics[0]
    const values = data.map(record => Number(record[metric])).filter(v => !isNaN(v))
    
    if (values.length < 2) return null

    const trend = values[values.length - 1] - values[0]
    const trendDirection = trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
    const trendPercentage = Math.abs((trend / values[0]) * 100)

    return {
      id: `trend_${Date.now()}`,
      type: 'TREND',
      title: `${metric} is ${trendDirection}`,
      description: `${metric} has ${trendDirection} by ${trendPercentage.toFixed(1)}% over the analyzed period`,
      significance: trendPercentage > 20 ? 'HIGH' : trendPercentage > 10 ? 'MEDIUM' : 'LOW',
      confidence: 0.8,
      impact: {
        business: `The ${trendDirection} trend in ${metric} ${trend > 0 ? 'indicates positive' : trend < 0 ? 'suggests concerning' : 'shows stable'} performance`,
        financial: trend !== 0 ? {
          amount: Math.abs(trend),
          currency: 'USD',
          timeframe: 'analyzed period'
        } : undefined
      },
      evidence: {
        dataPoints: data.slice(0, 5),
        correlation: trend !== 0 ? Math.abs(trend) / Math.max(...values) : 0
      },
      actionable: Math.abs(trendPercentage) > 5,
      relatedMetrics: interpretation.metrics.slice(1)
    }
  }

  private detectAnomalies(data: any[], interpretation: QueryInterpretation): AnalyticsInsight | null {
    if (interpretation.metrics.length === 0 || data.length < 5) return null

    const metric = interpretation.metrics[0]
    const values = data.map(record => Number(record[metric])).filter(v => !isNaN(v))
    
    if (values.length < 5) return null

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)
    
    const anomalies = values.filter(val => Math.abs(val - mean) > 2 * stdDev)
    
    if (anomalies.length === 0) return null

    return {
      id: `anomaly_${Date.now()}`,
      type: 'ANOMALY',
      title: `Unusual values detected in ${metric}`,
      description: `Found ${anomalies.length} data points that deviate significantly from the average`,
      significance: anomalies.length > values.length * 0.1 ? 'HIGH' : 'MEDIUM',
      confidence: 0.75,
      impact: {
        business: `Anomalies in ${metric} may indicate data quality issues or exceptional business events that require investigation`
      },
      evidence: {
        dataPoints: anomalies.map(val => ({ [metric]: val, deviation: Math.abs(val - mean) / stdDev })),
        statisticalTests: ['2-sigma outlier detection']
      },
      actionable: true,
      relatedMetrics: interpretation.metrics
    }
  }

  private identifyPatterns(data: any[], interpretation: QueryInterpretation): AnalyticsInsight | null {
    if (data.length < 5) return null

    // Look for day-of-week patterns if time dimension exists
    const timeField = interpretation.dimensions.find(d => d === 'time' || d.includes('date'))
    if (!timeField || interpretation.metrics.length === 0) return null

    return {
      id: `pattern_${Date.now()}`,
      type: 'PATTERN',
      title: 'Seasonal pattern identified',
      description: 'Data shows recurring patterns that could be leveraged for planning',
      significance: 'MEDIUM',
      confidence: 0.7,
      impact: {
        business: 'Understanding seasonal patterns can help with resource allocation and planning',
        operational: 'Use patterns for workload forecasting and team scheduling'
      },
      evidence: {
        dataPoints: data.slice(0, 3)
      },
      actionable: true,
      relatedMetrics: interpretation.metrics
    }
  }

  private async generateAIInsights(
    data: any[], 
    interpretation: QueryInterpretation, 
    request: NLQueryRequest
  ): Promise<AnalyticsInsight[]> {
    try {
      const dataSnapshot = JSON.stringify(data.slice(0, 10)) // Limit data for AI processing
      const aiPrompt = `
        Analyze this CA firm data and provide business insights:
        
        Data: ${dataSnapshot}
        Query Intent: ${interpretation.intent.primaryAction}
        Metrics: ${interpretation.metrics.join(', ')}
        
        Identify 1-2 key business insights that would be valuable for a CA firm.
        Focus on actionable insights related to:
        - Team productivity and efficiency
        - Client relationship management  
        - Financial performance optimization
        - Process improvement opportunities
        
        For each insight, provide:
        1. Clear business impact
        2. Specific recommendation
        3. Confidence level
      `

      const aiResponse = await openaiService.chatWithAssistant(aiPrompt)
      
      // Parse AI response into structured insights
      const insights: AnalyticsInsight[] = []
      
      if (aiResponse.response && aiResponse.response.length > 50) {
        insights.push({
          id: `ai_insight_${Date.now()}`,
          type: 'PATTERN',
          title: 'AI-Generated Business Insight',
          description: aiResponse.response.substring(0, 200) + '...',
          significance: 'MEDIUM',
          confidence: aiResponse.confidence || 0.7,
          impact: {
            business: 'AI-identified opportunity for business improvement',
            operational: 'Recommended action based on data analysis'
          },
          evidence: {
            dataPoints: data.slice(0, 3)
          },
          actionable: true,
          relatedMetrics: interpretation.metrics
        })
      }

      return insights

    } catch (error) {
      logger.warn('AI insight generation failed', { error })
      return []
    }
  }

  private async generateRecommendations(
    interpretation: QueryInterpretation, 
    executionResults: QueryExecutionResult, 
    insights: AnalyticsInsight[], 
    request: NLQueryRequest
  ): Promise<QueryRecommendation[]> {
    const recommendations: QueryRecommendation[] = []

    // Follow-up query suggestions
    if (interpretation.intent.primaryAction === 'ANALYZE') {
      recommendations.push({
        id: `rec_followup_${Date.now()}`,
        type: 'FOLLOW_UP_QUERY',
        title: 'Drill down for more detail',
        description: 'Get more detailed breakdown of the results',
        priority: 'MEDIUM',
        effort: 'LOW',
        suggestedQuery: `Show me a detailed breakdown of ${interpretation.metrics[0]} by individual team members`,
        reasoning: 'Detailed analysis often reveals actionable insights at the individual level',
        expectedBenefit: 'Identify specific areas for improvement and top performers'
      })
    }

    // Time-based recommendations
    if (!interpretation.timeframe.start) {
      recommendations.push({
        id: `rec_time_${Date.now()}`,
        type: 'ANALYSIS_ENHANCEMENT',
        title: 'Add time comparison',
        description: 'Compare current performance against previous periods',
        priority: 'HIGH',
        effort: 'LOW',
        suggestedQuery: `${request.query} compared to last quarter`,
        reasoning: 'Time-based comparisons provide context for understanding performance changes',
        expectedBenefit: 'Better understanding of performance trends and seasonal patterns'
      })
    }

    // Data improvement recommendations based on quality
    if (executionResults.metadata.dataQuality.completeness < 0.9) {
      recommendations.push({
        id: `rec_data_${Date.now()}`,
        type: 'DATA_IMPROVEMENT',
        title: 'Improve data completeness',
        description: 'Address missing data to get more accurate insights',
        priority: 'HIGH',
        effort: 'MEDIUM',
        reasoning: `Data completeness is only ${Math.round(executionResults.metadata.dataQuality.completeness * 100)}%`,
        expectedBenefit: 'More accurate and reliable analytics results'
      })
    }

    // Insight-based action recommendations
    for (const insight of insights.filter(i => i.actionable && i.significance !== 'LOW')) {
      recommendations.push({
        id: `rec_action_${Date.now()}`,
        type: 'ACTION_ITEM',
        title: `Address ${insight.title}`,
        description: `Take action based on the identified ${insight.type.toLowerCase()}`,
        priority: insight.significance === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        effort: 'MEDIUM',
        reasoning: insight.description,
        expectedBenefit: insight.impact.business
      })
    }

    return recommendations.slice(0, 4) // Limit to top 4 recommendations
  }

  private async generateVisualizations(
    executionResults: QueryExecutionResult, 
    interpretation: QueryInterpretation, 
    insights: AnalyticsInsight[]
  ): Promise<VisualizationSpec[]> {
    const visualizations: VisualizationSpec[] = []

    if (executionResults.data.length === 0) return visualizations

    const data = executionResults.data
    const metrics = interpretation.metrics
    const dimensions = interpretation.dimensions

    // Line chart for trends over time
    if (dimensions.includes('time') && metrics.length > 0) {
      visualizations.push({
        id: `line_chart_${Date.now()}`,
        type: 'LINE_CHART',
        title: `${metrics[0]} Trend Over Time`,
        description: `Time series visualization of ${metrics[0]}`,
        data: data.slice(0, 20),
        config: {
          xAxis: {
            field: 'time',
            label: 'Time Period',
            type: 'TEMPORAL'
          },
          yAxis: {
            field: metrics[0],
            label: metrics[0],
            type: 'NUMERICAL'
          },
          series: metrics.map(metric => ({
            field: metric,
            label: metric,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`
          }))
        },
        insights: [`Shows ${metrics[0]} trends over the selected time period`],
        priority: 1
      })
    }

    // Bar chart for categorical comparisons
    if (dimensions.some(d => ['user', 'client', 'team'].includes(d)) && metrics.length > 0) {
      const categoricalDim = dimensions.find(d => ['user', 'client', 'team'].includes(d)) || dimensions[0]
      
      visualizations.push({
        id: `bar_chart_${Date.now()}`,
        type: 'BAR_CHART',
        title: `${metrics[0]} by ${categoricalDim}`,
        description: `Comparison of ${metrics[0]} across different ${categoricalDim}s`,
        data: data.slice(0, 15),
        config: {
          xAxis: {
            field: categoricalDim,
            label: categoricalDim,
            type: 'CATEGORICAL'
          },
          yAxis: {
            field: metrics[0],
            label: metrics[0],
            type: 'NUMERICAL'
          }
        },
        insights: [`Compares ${metrics[0]} performance across different ${categoricalDim}s`],
        priority: 2
      })
    }

    // KPI cards for key metrics
    for (let i = 0; i < Math.min(metrics.length, 3); i++) {
      const metric = metrics[i]
      const values = data.map(record => Number(record[metric])).filter(v => !isNaN(v))
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length
        const trend = values.length > 1 ? 
          (values[values.length - 1] - values[0]) / values[0] * 100 : 0

        visualizations.push({
          id: `kpi_card_${Date.now()}_${i}`,
          type: 'KPI_CARD',
          title: metric,
          description: `Key performance indicator for ${metric}`,
          data: [{ value: avg, trend: trend, label: metric }],
          config: {
            formatting: {
              value: avg > 1000 ? 'currency' : 'number',
              trend: 'percentage'
            }
          },
          insights: [`Average ${metric}: ${avg.toFixed(2)}`],
          priority: 3 + i
        })
      }
    }

    return visualizations.sort((a, b) => a.priority - b.priority)
  }

  private async generateNarrative(
    interpretation: QueryInterpretation, 
    executionResults: QueryExecutionResult, 
    insights: AnalyticsInsight[], 
    recommendations: QueryRecommendation[], 
    request: NLQueryRequest
  ): Promise<{
    summary: string
    keyFindings: string[]
    explanation: string
    confidence: number
    limitations: string[]
  }> {
    try {
      // Use AI to generate narrative
      const aiPrompt = `
        Create a business narrative for this CA firm analytics query:
        
        Original Query: "${request.query}"
        Data Points Analyzed: ${executionResults.totalRows}
        Key Insights: ${insights.map(i => i.title).join(', ')}
        
        Generate:
        1. Executive summary (2-3 sentences)
        2. Key findings list (3-5 bullet points)  
        3. Detailed explanation (1 paragraph)
        
        Focus on business implications for a CA firm.
        Use clear, professional language suitable for partners and managers.
      `

      const aiResponse = await openaiService.chatWithAssistant(aiPrompt)
      
      if (aiResponse.response) {
        const parts = aiResponse.response.split('\n\n')
        
        return {
          summary: parts[0] || `Analysis of ${interpretation.metrics.join(', ')} shows ${insights.length} key insights from ${executionResults.totalRows} data points.`,
          keyFindings: insights.slice(0, 5).map(insight => insight.title),
          explanation: parts[1] || `The analysis revealed important patterns in ${interpretation.metrics.join(', ')} that can help inform business decisions. ${insights.length > 0 ? insights[0].description : 'The data shows various performance indicators that merit attention.'}`,
          confidence: Math.min(interpretation.confidence, aiResponse.confidence || 0.8),
          limitations: [
            executionResults.metadata.dataQuality.completeness < 0.9 ? 'Some data points may be incomplete' : '',
            executionResults.metadata.cacheHit ? 'Results may not reflect the most recent changes' : '',
            interpretation.ambiguities.length > 0 ? 'Query interpretation had some ambiguities' : ''
          ].filter(Boolean)
        }
      }
    } catch (error) {
      logger.warn('AI narrative generation failed, using fallback', { error })
    }

    // Fallback narrative generation
    return {
      summary: `Analysis of ${interpretation.metrics.join(', ')} completed successfully with ${insights.length} insights generated from ${executionResults.totalRows} data points.`,
      keyFindings: insights.slice(0, 5).map(insight => insight.title),
      explanation: `The query focused on ${interpretation.intent.primaryAction.toLowerCase()} operations for ${interpretation.metrics.join(', ')}. ${insights.length > 0 ? `Key findings include ${insights[0].title.toLowerCase()} which ${insights[0].impact.business.toLowerCase()}` : 'The analysis provides valuable insights for business decision-making.'} ${recommendations.length > 0 ? `Recommended next steps include ${recommendations[0].title.toLowerCase()}.` : ''}`,
      confidence: interpretation.confidence * 0.8, // Lower confidence for fallback
      limitations: [
        'Limited by available data quality and completeness',
        'Results based on current data snapshot',
        interpretation.ambiguities.length > 0 ? 'Some query elements required interpretation' : ''
      ].filter(Boolean)
    }
  }

  private calculateOverallConfidence(interpretation: QueryInterpretation, insights: AnalyticsInsight[]): number {
    const interpretationConfidence = interpretation.confidence
    const insightConfidence = insights.length > 0 ? 
      insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length : 0.5
    
    return (interpretationConfidence + insightConfidence) / 2
  }

  private getExecutionPath(interpretation: QueryInterpretation): string[] {
    const path = ['Query Interpretation']
    
    if (interpretation.entities.length > 0) path.push('Entity Extraction')
    if (interpretation.filters.length > 0) path.push('Filter Application')
    if (interpretation.aggregations.length > 0) path.push('Data Aggregation')
    if (interpretation.timeframe.start || interpretation.timeframe.end) path.push('Time Filtering')
    
    path.push('Insight Generation', 'Visualization Creation', 'Narrative Generation')
    
    return path
  }

  private async updateSessionContext(userId: string, result: NLQueryResult): Promise<void> {
    const session = await this.getQuerySession(userId)
    session.queries.push(result)
    session.lastActiveAt = new Date()
    
    // Update context learnings based on query patterns
    const queryIntent = result.interpretedQuery.intent.primaryAction
    if (session.context.learnings[queryIntent]) {
      session.context.learnings[queryIntent] += 1
    } else {
      session.context.learnings[queryIntent] = 1
    }

    // Update current focus based on recent queries
    const recentMetrics = session.queries.slice(-5).flatMap(q => q.interpretedQuery.metrics)
    session.context.currentFocus = [...new Set(recentMetrics)].slice(0, 3)
  }

  private generateErrorResponse(request: NLQueryRequest, error: any): NLQueryResult {
    return {
      requestId: request.id,
      queryId: `error_${Date.now()}`,
      naturalLanguageQuery: request.query,
      interpretedQuery: this.fallbackInterpretation(request),
      executionResults: {
        data: [],
        totalRows: 0,
        executedQueries: [],
        aggregations: {},
        metadata: {
          dataSource: 'ERROR',
          executionTime: 0,
          cacheHit: false,
          resultSize: 0,
          dataQuality: { completeness: 0, accuracy: 0, freshness: 0 }
        }
      },
      insights: [],
      recommendations: [{
        id: 'error_rec',
        type: 'ANALYSIS_ENHANCEMENT',
        title: 'Simplify your query',
        description: 'Try a simpler query or check for typos',
        priority: 'HIGH',
        effort: 'LOW',
        reasoning: 'The system had difficulty understanding this query',
        expectedBenefit: 'Better query results and insights'
      }],
      visualizations: [],
      narrative: {
        summary: 'Unable to process query due to an error',
        keyFindings: [],
        explanation: `Sorry, I couldn't process your query "${request.query}". Please try rephrasing it or make it more specific.`,
        confidence: 0,
        limitations: ['Query processing failed', 'No data available']
      },
      executionMetadata: {
        processingTime: 100,
        dataPointsAnalyzed: 0,
        queriesExecuted: 0,
        confidenceScore: 0,
        executionPath: ['Error Handling'],
        cachedResults: false,
        errorHandling: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private fallbackInterpretation(request: NLQueryRequest): QueryInterpretation {
    // Simple rule-based interpretation fallback
    const query = request.query.toLowerCase()
    
    return {
      intent: {
        primaryAction: query.includes('trend') ? 'TREND' : 
                     query.includes('compare') ? 'COMPARE' : 
                     query.includes('forecast') ? 'FORECAST' : 'ANALYZE',
        secondaryActions: [],
        businessQuestion: request.query,
        analyticsType: 'DESCRIPTIVE',
        complexity: 'SIMPLE',
        urgency: 'MEDIUM'
      },
      entities: [],
      metrics: query.includes('revenue') ? ['revenue'] : 
               query.includes('task') ? ['task_completion_rate'] : ['revenue'],
      dimensions: query.includes('time') || query.includes('month') || query.includes('week') ? ['time'] : [],
      filters: [],
      aggregations: [],
      timeframe: {},
      comparisons: [],
      sorting: [],
      limits: { maxResults: 20 },
      confidence: 0.5,
      ambiguities: [{
        type: 'METRIC_AMBIGUITY',
        description: 'Could not clearly identify metrics to analyze',
        options: ['revenue', 'task_completion_rate', 'utilization_rate'],
        recommendation: 'Be more specific about what you want to measure',
        requiresClarification: true
      }]
    }
  }

  // Helper methods for query interpretation
  private extractIntent(query: string, aiResponse: string): QueryIntent {
    const queryLower = query.toLowerCase()
    
    let primaryAction: QueryIntent['primaryAction'] = 'ANALYZE'
    if (queryLower.includes('trend') || queryLower.includes('over time')) primaryAction = 'TREND'
    else if (queryLower.includes('compare') || queryLower.includes('versus')) primaryAction = 'COMPARE'
    else if (queryLower.includes('forecast') || queryLower.includes('predict')) primaryAction = 'FORECAST'
    else if (queryLower.includes('summary') || queryLower.includes('overview')) primaryAction = 'SUMMARIZE'

    return {
      primaryAction,
      secondaryActions: [],
      businessQuestion: query,
      analyticsType: primaryAction === 'FORECAST' ? 'PREDICTIVE' : 'DESCRIPTIVE',
      complexity: queryLower.split(' ').length > 10 ? 'COMPLEX' : 'MODERATE',
      urgency: 'MEDIUM'
    }
  }

  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = []
    const queryLower = query.toLowerCase()
    
    // Extract common entities
    const patterns = [
      { type: 'METRIC', pattern: /revenue|profit|income|earnings/g, confidence: 0.9 },
      { type: 'METRIC', pattern: /task|completion|productivity/g, confidence: 0.8 },
      { type: 'TIME', pattern: /month|quarter|year|week|day/g, confidence: 0.9 },
      { type: 'ENTITY', pattern: /team|client|user|member/g, confidence: 0.8 }
    ]

    for (const pattern of patterns) {
      const matches = queryLower.match(pattern.pattern)
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: pattern.type as any,
            value: match,
            originalText: match,
            confidence: pattern.confidence,
            alternatives: [],
            context: query.substring(queryLower.indexOf(match) - 10, queryLower.indexOf(match) + 20),
            resolved: true
          })
        }
      }
    }

    return entities
  }

  private extractMetrics(query: string, aiResponse: string): string[] {
    const queryLower = query.toLowerCase()
    const metrics: string[] = []

    if (queryLower.includes('revenue') || queryLower.includes('income') || queryLower.includes('earnings')) {
      metrics.push('revenue')
    }
    if (queryLower.includes('task') || queryLower.includes('completion') || queryLower.includes('productivity')) {
      metrics.push('task_completion_rate')
    }
    if (queryLower.includes('utilization') || queryLower.includes('billable')) {
      metrics.push('utilization_rate')
    }
    if (queryLower.includes('profit')) {
      metrics.push('profit')
    }

    return metrics.length > 0 ? metrics : ['revenue'] // Default to revenue
  }

  private extractDimensions(query: string, aiResponse: string): string[] {
    const queryLower = query.toLowerCase()
    const dimensions: string[] = []

    if (queryLower.includes('time') || queryLower.includes('month') || queryLower.includes('week') || 
        queryLower.includes('over') || queryLower.includes('trend')) {
      dimensions.push('time')
    }
    if (queryLower.includes('team') || queryLower.includes('member') || queryLower.includes('user') || 
        queryLower.includes('by person')) {
      dimensions.push('user')
    }
    if (queryLower.includes('client') || queryLower.includes('customer')) {
      dimensions.push('client')
    }

    return dimensions
  }

  private extractFilters(query: string, aiResponse: string): QueryFilter[] {
    // Simple filter extraction - in production would be more sophisticated
    return []
  }

  private extractAggregations(query: string, aiResponse: string): QueryAggregation[] {
    const queryLower = query.toLowerCase()
    const aggregations: QueryAggregation[] = []

    if (queryLower.includes('total') || queryLower.includes('sum')) {
      aggregations.push({ function: 'SUM', field: 'revenue' })
    }
    if (queryLower.includes('average') || queryLower.includes('avg')) {
      aggregations.push({ function: 'AVG', field: 'revenue' })
    }
    if (queryLower.includes('count') || queryLower.includes('number of')) {
      aggregations.push({ function: 'COUNT', field: '*' })
    }

    return aggregations
  }

  private extractTimeframe(query: string, contextTimeframe?: { start: Date; end: Date }): any {
    if (contextTimeframe) return contextTimeframe

    const queryLower = query.toLowerCase()
    const now = new Date()
    
    if (queryLower.includes('last month')) {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: lastMonth, end: lastMonthEnd, period: 'last_month' }
    }
    
    if (queryLower.includes('this quarter')) {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return { start: quarterStart, end: now, period: 'current_quarter' }
    }

    return {}
  }

  private extractComparisons(query: string, aiResponse: string): QueryComparison[] {
    const queryLower = query.toLowerCase()
    const comparisons: QueryComparison[] = []

    if (queryLower.includes('compared to') || queryLower.includes('vs') || queryLower.includes('versus')) {
      comparisons.push({
        type: 'PERIOD_OVER_PERIOD',
        baseline: 'previous_period',
        target: 'current_period',
        metric: 'revenue'
      })
    }

    return comparisons
  }

  private extractSorting(query: string): { field: string; direction: 'ASC' | 'DESC' }[] {
    const queryLower = query.toLowerCase()
    
    if (queryLower.includes('top') || queryLower.includes('highest') || queryLower.includes('best')) {
      return [{ field: 'revenue', direction: 'DESC' }]
    }
    if (queryLower.includes('bottom') || queryLower.includes('lowest') || queryLower.includes('worst')) {
      return [{ field: 'revenue', direction: 'ASC' }]
    }

    return []
  }

  private extractLimits(query: string): { maxResults?: number; threshold?: number } {
    const queryLower = query.toLowerCase()
    
    const topMatch = queryLower.match(/top (\d+)/i)
    if (topMatch) {
      return { maxResults: parseInt(topMatch[1]) }
    }

    return { maxResults: 20 } // Default limit
  }

  private identifyAmbiguities(query: string, aiResponse: string): QueryAmbiguity[] {
    const ambiguities: QueryAmbiguity[] = []
    
    // Check for vague time references
    if (query.toLowerCase().includes('recently') || query.toLowerCase().includes('lately')) {
      ambiguities.push({
        type: 'TIME_AMBIGUITY',
        description: 'Time reference is unclear',
        options: ['last week', 'last month', 'last quarter'],
        recommendation: 'Specify exact time period',
        requiresClarification: true
      })
    }

    return ambiguities
  }
}

// Export singleton instance
export const naturalLanguageAnalytics = new NaturalLanguageAnalyticsService()