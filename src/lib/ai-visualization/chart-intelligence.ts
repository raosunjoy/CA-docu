import { OpenAI } from 'openai'

export interface DataPoint {
  [key: string]: string | number | Date
}

export interface ChartRecommendation {
  chartType: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap' | 'treemap'
  confidence: number
  reasoning: string
  configuration: ChartConfiguration
  insights: string[]
  alternatives: Array<{
    chartType: string
    confidence: number
    reasoning: string
  }>
}

export interface ChartConfiguration {
  xKey?: string
  yKeys?: string[]
  colorKey?: string
  groupKey?: string
  aggregation?: 'sum' | 'average' | 'count' | 'max' | 'min'
  timeFormat?: string
  numberFormat?: string
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
  stackedData?: boolean
  smoothCurve?: boolean
  showDataLabels?: boolean
  threshold?: number
  trendLine?: boolean
}

export interface VisualizationContext {
  title?: string
  purpose: 'comparison' | 'trend' | 'distribution' | 'relationship' | 'composition' | 'performance'
  audience: 'executive' | 'manager' | 'analyst' | 'client' | 'general'
  emphasis?: 'accuracy' | 'clarity' | 'impact' | 'detail'
  constraints?: {
    maxComplexity?: 'simple' | 'moderate' | 'complex'
    colorBlindSafe?: boolean
    printFriendly?: boolean
    mobileOptimized?: boolean
  }
}

export class ChartIntelligenceService {
  private openai: OpenAI
  private organizationId: string

  constructor(config: {
    openaiApiKey: string
    organizationId: string
  }) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    })
    this.organizationId = config.organizationId
  }

  /**
   * Analyzes data and context to recommend optimal chart type and configuration
   */
  async recommendChart(
    data: DataPoint[],
    context: VisualizationContext
  ): Promise<ChartRecommendation> {
    try {
      const dataAnalysis = this.analyzeDataStructure(data)
      const systemPrompt = this.buildChartRecommendationPrompt(dataAnalysis, context)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Analyze this data and recommend the best chart type:\n\n${JSON.stringify({
              dataStructure: dataAnalysis,
              context,
              sampleData: data.slice(0, 3)
            }, null, 2)}`
          }
        ],
        temperature: 0.3
      })

      const recommendation = this.parseChartRecommendation(response.choices[0].message.content || '')
      
      // Enhance with additional AI insights
      const insights = await this.generateDataInsights(data, recommendation.chartType)
      
      return {
        ...recommendation,
        insights,
        configuration: this.optimizeConfiguration(recommendation.configuration, dataAnalysis, context)
      }
    } catch (error) {
      console.error('Error generating chart recommendation:', error)
      return this.getFallbackRecommendation(data, context)
    }
  }

  /**
   * Automatically selects optimal colors based on data and context
   */
  async optimizeColors(
    data: DataPoint[],
    chartType: string,
    context: VisualizationContext
  ): Promise<string[]> {
    try {
      const dataCategories = this.extractCategories(data)
      const colorPrompt = `
        You are a data visualization expert specializing in color theory and accessibility.
        
        Task: Select optimal colors for a ${chartType} chart.
        
        Data context:
        - Number of categories: ${dataCategories.length}
        - Categories: ${dataCategories.slice(0, 10).join(', ')}${dataCategories.length > 10 ? '...' : ''}
        - Purpose: ${context.purpose}
        - Audience: ${context.audience}
        - Constraints: ${JSON.stringify(context.constraints || {})}
        
        Requirements:
        1. Colors must be accessible (WCAG AA compliant)
        2. Colors should be semantically appropriate
        3. Consider color-blind users if specified
        4. Maintain good contrast and readability
        5. Follow data visualization best practices
        
        Return exactly ${Math.min(dataCategories.length, 12)} hex color codes as a JSON array.
        Example: ["#1f77b4", "#ff7f0e", "#2ca02c"]
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: colorPrompt }],
        temperature: 0.2
      })

      try {
        return JSON.parse(response.choices[0].message.content || '[]')
      } catch {
        return this.getDefaultColors(dataCategories.length)
      }
    } catch (error) {
      console.error('Error optimizing colors:', error)
      return this.getDefaultColors(data.length)
    }
  }

  /**
   * Generates intelligent annotations and callouts for charts
   */
  async generateAnnotations(
    data: DataPoint[],
    chartType: string,
    insights: string[]
  ): Promise<Array<{
    type: 'callout' | 'trend' | 'outlier' | 'threshold' | 'annotation'
    position: { x: string | number; y: string | number }
    text: string
    style: 'info' | 'warning' | 'success' | 'error'
  }>> {
    try {
      const annotationPrompt = `
        You are a data visualization expert. Generate intelligent annotations for a ${chartType} chart.
        
        Data insights: ${insights.join('. ')}
        Sample data points: ${JSON.stringify(data.slice(0, 5))}
        
        Generate 2-4 strategic annotations that:
        1. Highlight key insights
        2. Explain trends or patterns  
        3. Call out important data points
        4. Provide context for stakeholders
        
        Return as JSON array with format:
        [{
          "type": "callout",
          "position": {"x": "dataKey", "y": 100},
          "text": "Key insight text",
          "style": "info"
        }]
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: annotationPrompt }],
        temperature: 0.4
      })

      return JSON.parse(response.choices[0].message.content || '[]')
    } catch (error) {
      console.error('Error generating annotations:', error)
      return []
    }
  }

  /**
   * Optimizes chart configuration based on data characteristics
   */
  private optimizeConfiguration(
    baseConfig: ChartConfiguration,
    dataAnalysis: any,
    context: VisualizationContext
  ): ChartConfiguration {
    const optimized = { ...baseConfig }

    // Auto-detect optimal aggregation
    if (dataAnalysis.hasTimeData && context.purpose === 'trend') {
      optimized.smoothCurve = true
      optimized.trendLine = true
    }

    // Optimize for audience
    switch (context.audience) {
      case 'executive':
        optimized.showDataLabels = true
        optimized.showGrid = false
        break
      case 'analyst':
        optimized.showGrid = true
        optimized.showDataLabels = true
        break
      case 'client':
        optimized.showLegend = true
        optimized.showDataLabels = false
        break
    }

    // Mobile optimization
    if (context.constraints?.mobileOptimized) {
      optimized.showLegend = dataAnalysis.categoryCount <= 4
      optimized.showDataLabels = dataAnalysis.dataPointCount <= 10
    }

    return optimized
  }

  /**
   * Analyzes data structure to understand characteristics
   */
  private analyzeDataStructure(data: DataPoint[]) {
    if (!data || data.length === 0) {
      return {
        dataPointCount: 0,
        columns: [],
        numericColumns: [],
        categoricalColumns: [],
        timeColumns: [],
        hasTimeData: false,
        categoryCount: 0,
        dataRange: null
      }
    }

    const firstRow = data[0]
    const columns = Object.keys(firstRow)
    
    const numericColumns = columns.filter(col => 
      data.every(row => typeof row[col] === 'number')
    )
    
    const categoricalColumns = columns.filter(col =>
      data.every(row => typeof row[col] === 'string') &&
      new Set(data.map(row => row[col])).size < data.length * 0.8
    )
    
    const timeColumns = columns.filter(col =>
      data.every(row => {
        const value = row[col]
        return value instanceof Date || 
               (typeof value === 'string' && !isNaN(Date.parse(value)))
      })
    )

    const categoryCount = categoricalColumns.length > 0 
      ? Math.max(...categoricalColumns.map(col => new Set(data.map(row => row[col])).size))
      : 0

    return {
      dataPointCount: data.length,
      columns,
      numericColumns,
      categoricalColumns, 
      timeColumns,
      hasTimeData: timeColumns.length > 0,
      categoryCount,
      dataRange: numericColumns.length > 0 ? {
        min: Math.min(...numericColumns.flatMap(col => data.map(row => Number(row[col])))),
        max: Math.max(...numericColumns.flatMap(col => data.map(row => Number(row[col]))))
      } : null
    }
  }

  /**
   * Builds system prompt for chart recommendation
   */
  private buildChartRecommendationPrompt(dataAnalysis: any, context: VisualizationContext): string {
    return `
      You are a world-class data visualization expert with deep expertise in choosing optimal chart types.
      
      Your task: Recommend the best chart type and configuration for the given data and context.
      
      Chart Type Guidelines:
      - Line charts: Time series, trends, continuous data
      - Bar charts: Comparisons, categorical data, rankings
      - Pie/Donut charts: Parts of a whole, proportions (max 6-8 categories)
      - Area charts: Cumulative data, stacked comparisons
      - Scatter plots: Relationships, correlations
      - Heatmaps: Patterns in 2D data
      - Treemaps: Hierarchical data, nested proportions
      
      Context Considerations:
      - Purpose: ${context.purpose}
      - Audience: ${context.audience}  
      - Emphasis: ${context.emphasis || 'clarity'}
      - Constraints: ${JSON.stringify(context.constraints || {})}
      
      Data Characteristics:
      - Data points: ${dataAnalysis.dataPointCount}
      - Numeric columns: ${dataAnalysis.numericColumns?.length || 0}
      - Categorical columns: ${dataAnalysis.categoricalColumns?.length || 0}
      - Has time data: ${dataAnalysis.hasTimeData}
      - Categories: ${dataAnalysis.categoryCount}
      
      Return response as JSON:
      {
        "chartType": "line|bar|pie|donut|area|scatter|heatmap|treemap",
        "confidence": 0-100,
        "reasoning": "Detailed explanation",
        "configuration": {
          "xKey": "column name",
          "yKeys": ["column names"],
          "showLegend": boolean,
          "showGrid": boolean,
          "stackedData": boolean
        },
        "alternatives": [
          {"chartType": "type", "confidence": 0-100, "reasoning": "why"}
        ]
      }
    `
  }

  /**
   * Parses AI response into structured recommendation
   */
  private parseChartRecommendation(response: string): ChartRecommendation {
    try {
      const parsed = JSON.parse(response)
      return {
        chartType: parsed.chartType || 'bar',
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || 'Default recommendation',
        configuration: parsed.configuration || {},
        insights: [],
        alternatives: parsed.alternatives || []
      }
    } catch {
      return this.getFallbackRecommendation([], { purpose: 'comparison', audience: 'general' })
    }
  }

  /**
   * Generates data insights using AI
   */
  private async generateDataInsights(data: DataPoint[], chartType: string): Promise<string[]> {
    try {
      const insightPrompt = `
        Analyze this data and generate 3-5 key business insights for a ${chartType} chart:
        
        Sample data: ${JSON.stringify(data.slice(0, 10), null, 2)}
        
        Focus on:
        1. Key trends and patterns
        2. Notable outliers or anomalies  
        3. Business implications
        4. Actionable recommendations
        5. Performance indicators
        
        Return as JSON array of insight strings.
        Example: ["Revenue grew 15% QoQ", "Q3 shows seasonal peak", "Customer acquisition costs are rising"]
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: insightPrompt }],
        temperature: 0.4
      })

      return JSON.parse(response.choices[0].message.content || '[]')
    } catch {
      return ['Data analysis available', 'Chart optimized for clarity', 'Insights generated automatically']
    }
  }

  /**
   * Extracts unique categories from data
   */
  private extractCategories(data: DataPoint[]): string[] {
    const categories = new Set<string>()
    
    data.forEach(row => {
      Object.values(row).forEach(value => {
        if (typeof value === 'string' && value.length < 50) {
          categories.add(value)
        }
      })
    })
    
    return Array.from(categories)
  }

  /**
   * Returns default color palette
   */
  private getDefaultColors(count: number): string[] {
    const defaultPalette = [
      '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
      '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
      '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
    ]
    
    return defaultPalette.slice(0, count)
  }

  /**
   * Fallback recommendation when AI fails
   */
  private getFallbackRecommendation(data: DataPoint[], context: VisualizationContext): ChartRecommendation {
    const hasTimeData = data.some(row => 
      Object.values(row).some(val => 
        val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)))
      )
    )

    let chartType: ChartRecommendation['chartType'] = 'bar'
    
    if (hasTimeData) {
      chartType = 'line'
    } else if (context.purpose === 'composition') {
      chartType = 'pie'
    } else if (context.purpose === 'trend') {
      chartType = 'line'
    }

    return {
      chartType,
      confidence: 60,
      reasoning: 'Fallback recommendation based on basic heuristics',
      configuration: {
        showLegend: true,
        showGrid: chartType === 'line'
      },
      insights: ['Using fallback chart recommendation', 'Consider providing more context for better results'],
      alternatives: []
    }
  }
}