import { OpenAI } from 'openai'

export interface ReportTemplate {
  id: string
  name: string
  category: 'financial' | 'compliance' | 'performance' | 'operational' | 'audit'
  description: string
  requiredData: string[]
  outputFormat: 'pdf' | 'excel' | 'dashboard' | 'presentation'
  sections: ReportSection[]
  aiEnhanced: boolean
  customizable: boolean
  scheduling: ReportScheduling
}

export interface ReportSection {
  id: string
  title: string
  type: 'chart' | 'table' | 'text' | 'kpi' | 'analysis' | 'recommendation'
  required: boolean
  dataSource: string
  visualization?: VisualizationConfig
  aiInsights: boolean
  customization?: SectionCustomization
}

export interface VisualizationConfig {
  chartType: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap'
  interactive: boolean
  realTime: boolean
  aiOptimized: boolean
  responsive: boolean
}

export interface ReportScheduling {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  recipients: string[]
  autoGeneration: boolean
  smartTiming: boolean
}

export interface SectionCustomization {
  allowReorder: boolean
  allowResize: boolean
  allowHide: boolean
  allowDataFilter: boolean
  allowVisualizationChange: boolean
}

export interface ReportGenerationRequest {
  templateId: string
  organizationId: string
  userId: string
  parameters: ReportParameters
  customizations?: ReportCustomization[]
  outputFormat: 'pdf' | 'excel' | 'dashboard' | 'json'
  aiEnhancement: boolean
}

export interface ReportParameters {
  dateRange: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
  audience: 'executive' | 'manager' | 'analyst' | 'client' | 'regulator'
  purpose: 'review' | 'compliance' | 'audit' | 'presentation' | 'analysis'
  detailLevel: 'summary' | 'detailed' | 'comprehensive'
}

export interface ReportCustomization {
  sectionId: string
  position?: number
  visible: boolean
  size?: 'small' | 'medium' | 'large' | 'full'
  customTitle?: string
  customVisualization?: VisualizationConfig
}

export interface GeneratedReport {
  id: string
  templateId: string
  generatedAt: Date
  generatedBy: string
  parameters: ReportParameters
  sections: GeneratedSection[]
  insights: AIInsight[]
  recommendations: AIRecommendation[]
  metadata: ReportMetadata
  exportUrls: Record<string, string>
}

export interface GeneratedSection {
  id: string
  title: string
  type: string
  content: any
  visualizations: any[]
  insights: AIInsight[]
  dataQuality: DataQualityMetrics
}

export interface AIInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'forecast' | 'comparison'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  supportingData?: any
}

export interface AIRecommendation {
  id: string
  category: 'operational' | 'financial' | 'compliance' | 'performance'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  impact: string
  effort: 'low' | 'medium' | 'high'
  timeline: string
  roi?: number
}

export interface DataQualityMetrics {
  completeness: number
  accuracy: number
  timeliness: number
  consistency: number
  overall: number
}

export interface ReportMetadata {
  generationTime: number
  dataPoints: number
  insightsGenerated: number
  recommendationsGenerated: number
  aiConfidence: number
  version: string
}

export class IntelligentReportGenerator {
  private openai: OpenAI
  private organizationId: string
  private templates: Map<string, ReportTemplate> = new Map()

  constructor(config: {
    openaiApiKey: string
    organizationId: string
  }) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    })
    this.organizationId = config.organizationId
    this.initializeTemplates()
  }

  /**
   * Generates an intelligent report with AI-powered insights
   */
  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    try {
      const template = this.templates.get(request.templateId)
      if (!template) {
        throw new Error(`Report template ${request.templateId} not found`)
      }

      const startTime = Date.now()
      
      // Gather data for all sections
      const sectionData = await this.gatherSectionData(template, request.parameters)
      
      // Generate AI insights if enabled
      const insights = request.aiEnhancement 
        ? await this.generateAIInsights(sectionData, request.parameters)
        : []
        
      // Generate AI recommendations
      const recommendations = request.aiEnhancement
        ? await this.generateAIRecommendations(sectionData, insights, request.parameters)
        : []
        
      // Process sections with customizations
      const processedSections = await this.processSections(
        template.sections,
        sectionData,
        request.customizations,
        request.aiEnhancement
      )
      
      const generationTime = Date.now() - startTime
      
      const report: GeneratedReport = {
        id: `report_${Date.now()}`,
        templateId: request.templateId,
        generatedAt: new Date(),
        generatedBy: request.userId,
        parameters: request.parameters,
        sections: processedSections,
        insights,
        recommendations,
        metadata: {
          generationTime,
          dataPoints: this.countDataPoints(sectionData),
          insightsGenerated: insights.length,
          recommendationsGenerated: recommendations.length,
          aiConfidence: this.calculateOverallConfidence(insights),
          version: '1.0'
        },
        exportUrls: await this.generateExportUrls(request)
      }
      
      return report
    } catch (error) {
      console.error('Error generating report:', error)
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generates AI-powered insights from data
   */
  async generateAIInsights(
    sectionData: Record<string, any>,
    parameters: ReportParameters
  ): Promise<AIInsight[]> {
    try {
      const insightPrompt = this.buildInsightPrompt(sectionData, parameters)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert business analyst specializing in CA firms and financial data analysis.
            Generate actionable insights from the provided data. Focus on:
            1. Key trends and patterns
            2. Performance indicators
            3. Risk factors and opportunities
            4. Comparative analysis
            5. Predictive insights`
          },
          {
            role: 'user',
            content: insightPrompt
          }
        ],
        temperature: 0.3
      })

      const aiResponse = response.choices[0].message.content || '[]'
      return this.parseInsights(aiResponse)
    } catch (error) {
      console.error('Error generating AI insights:', error)
      return []
    }
  }

  /**
   * Generates AI-powered recommendations
   */
  async generateAIRecommendations(
    sectionData: Record<string, any>,
    insights: AIInsight[],
    parameters: ReportParameters
  ): Promise<AIRecommendation[]> {
    try {
      const recommendationPrompt = this.buildRecommendationPrompt(sectionData, insights, parameters)
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a strategic business consultant for CA firms.
            Generate specific, actionable recommendations based on the data and insights.
            Each recommendation should include:
            1. Clear action items
            2. Expected impact
            3. Implementation effort
            4. Timeline
            5. ROI estimation where applicable`
          },
          {
            role: 'user',
            content: recommendationPrompt
          }
        ],
        temperature: 0.4
      })

      const aiResponse = response.choices[0].message.content || '[]'
      return this.parseRecommendations(aiResponse)
    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      return []
    }
  }

  /**
   * Creates intelligent report templates based on user needs
   */
  async createIntelligentTemplate(
    name: string,
    category: ReportTemplate['category'],
    requirements: {
      dataTypes: string[]
      audience: string
      purpose: string
      frequency: string
    }
  ): Promise<ReportTemplate> {
    try {
      const templatePrompt = `
        Create a comprehensive report template for a CA firm with the following requirements:
        
        Name: ${name}
        Category: ${category}
        Data Types: ${requirements.dataTypes.join(', ')}
        Audience: ${requirements.audience}
        Purpose: ${requirements.purpose}
        Frequency: ${requirements.frequency}
        
        Generate a structured template with:
        1. Relevant sections for the category and purpose
        2. Appropriate visualization types
        3. AI insight opportunities
        4. Scheduling configuration
        5. Customization options
        
        Return as JSON with the ReportTemplate interface structure.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in CA firm reporting and data visualization. Create comprehensive, practical report templates.'
          },
          {
            role: 'user',
            content: templatePrompt
          }
        ],
        temperature: 0.3
      })

      const templateJson = response.choices[0].message.content || '{}'
      const template = JSON.parse(templateJson) as ReportTemplate
      
      // Add generated template to cache
      this.templates.set(template.id, template)
      
      return template
    } catch (error) {
      console.error('Error creating intelligent template:', error)
      throw new Error('Failed to create intelligent template')
    }
  }

  /**
   * Optimizes existing report templates based on usage patterns
   */
  async optimizeTemplate(
    templateId: string,
    usageData: {
      viewedSections: string[]
      hiddenSections: string[]
      customizations: ReportCustomization[]
      userFeedback: any[]
    }
  ): Promise<ReportTemplate> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    try {
      const optimizationPrompt = `
        Optimize this report template based on usage patterns:
        
        Current Template: ${JSON.stringify(template, null, 2)}
        
        Usage Data:
        - Most viewed sections: ${usageData.viewedSections.join(', ')}
        - Often hidden sections: ${usageData.hiddenSections.join(', ')}
        - Common customizations: ${JSON.stringify(usageData.customizations)}
        - User feedback: ${JSON.stringify(usageData.userFeedback)}
        
        Suggest optimizations for:
        1. Section ordering
        2. Default visibility
        3. Visualization types
        4. AI enhancement areas
        5. New sections to add
        
        Return the optimized template as JSON.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in report optimization and user experience for CA firm software.'
          },
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
        temperature: 0.2
      })

      const optimizedJson = response.choices[0].message.content || '{}'
      const optimizedTemplate = JSON.parse(optimizedJson) as ReportTemplate
      
      // Update template in cache
      this.templates.set(templateId, optimizedTemplate)
      
      return optimizedTemplate
    } catch (error) {
      console.error('Error optimizing template:', error)
      throw new Error('Failed to optimize template')
    }
  }

  /**
   * Gets available report templates for an organization
   */
  getAvailableTemplates(category?: ReportTemplate['category']): ReportTemplate[] {
    const templates = Array.from(this.templates.values())
    return category 
      ? templates.filter(t => t.category === category)
      : templates
  }

  /**
   * Private helper methods
   */
  private initializeTemplates(): void {
    // Initialize with default CA firm report templates
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'monthly-financial',
        name: 'Monthly Financial Performance',
        category: 'financial',
        description: 'Comprehensive monthly financial analysis with AI insights',
        requiredData: ['revenue', 'expenses', 'profit_margins', 'cash_flow'],
        outputFormat: 'dashboard',
        sections: [
          {
            id: 'revenue-analysis',
            title: 'Revenue Analysis',
            type: 'chart',
            required: true,
            dataSource: 'financial_data',
            visualization: {
              chartType: 'line',
              interactive: true,
              realTime: true,
              aiOptimized: true,
              responsive: true
            },
            aiInsights: true
          },
          {
            id: 'profitability',
            title: 'Profitability Metrics',
            type: 'kpi',
            required: true,
            dataSource: 'financial_metrics',
            aiInsights: true
          }
        ],
        aiEnhanced: true,
        customizable: true,
        scheduling: {
          enabled: true,
          frequency: 'monthly',
          recipients: [],
          autoGeneration: true,
          smartTiming: true
        }
      },
      {
        id: 'compliance-status',
        name: 'Compliance Status Report',
        category: 'compliance',
        description: 'Real-time compliance monitoring with risk assessment',
        requiredData: ['compliance_scores', 'deadlines', 'regulatory_updates'],
        outputFormat: 'pdf',
        sections: [
          {
            id: 'compliance-overview',
            title: 'Compliance Overview',
            type: 'kpi',
            required: true,
            dataSource: 'compliance_data',
            aiInsights: true
          },
          {
            id: 'risk-assessment',
            title: 'Risk Assessment',
            type: 'analysis',
            required: true,
            dataSource: 'risk_data',
            aiInsights: true
          }
        ],
        aiEnhanced: true,
        customizable: true,
        scheduling: {
          enabled: true,
          frequency: 'weekly',
          recipients: [],
          autoGeneration: true,
          smartTiming: true
        }
      }
    ]

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  private async gatherSectionData(
    template: ReportTemplate,
    parameters: ReportParameters
  ): Promise<Record<string, any>> {
    // Mock implementation - in production, this would fetch actual data
    const sectionData: Record<string, any> = {}
    
    for (const section of template.sections) {
      sectionData[section.id] = {
        // Mock data structure
        data: [],
        metadata: {
          lastUpdated: new Date(),
          source: section.dataSource,
          quality: 0.95
        }
      }
    }
    
    return sectionData
  }

  private async processSections(
    sections: ReportSection[],
    sectionData: Record<string, any>,
    customizations?: ReportCustomization[],
    aiEnhancement?: boolean
  ): Promise<GeneratedSection[]> {
    const processedSections: GeneratedSection[] = []
    
    for (const section of sections) {
      const customization = customizations?.find(c => c.sectionId === section.id)
      
      if (customization && !customization.visible) {
        continue // Skip hidden sections
      }
      
      const data = sectionData[section.id]
      const insights = aiEnhancement && section.aiInsights 
        ? await this.generateSectionInsights(section, data)
        : []
      
      processedSections.push({
        id: section.id,
        title: customization?.customTitle || section.title,
        type: section.type,
        content: data?.data || [],
        visualizations: section.visualization ? [section.visualization] : [],
        insights,
        dataQuality: {
          completeness: 0.95,
          accuracy: 0.98,
          timeliness: 0.92,
          consistency: 0.96,
          overall: 0.95
        }
      })
    }
    
    return processedSections
  }

  private async generateSectionInsights(section: ReportSection, data: any): Promise<AIInsight[]> {
    // Mock implementation for section-specific insights
    return [
      {
        type: 'trend',
        title: `${section.title} Trend Analysis`,
        description: 'Positive trend observed in recent data',
        confidence: 0.87,
        impact: 'medium',
        actionable: true
      }
    ]
  }

  private buildInsightPrompt(sectionData: Record<string, any>, parameters: ReportParameters): string {
    return `
      Analyze the following business data for a CA firm:
      
      Date Range: ${parameters.dateRange.start.toISOString()} to ${parameters.dateRange.end.toISOString()}
      Audience: ${parameters.audience}
      Purpose: ${parameters.purpose}
      Detail Level: ${parameters.detailLevel}
      
      Data Summary: ${JSON.stringify(Object.keys(sectionData))}
      
      Generate 3-5 key insights focusing on business performance, trends, and opportunities.
      Return as JSON array with AIInsight interface structure.
    `
  }

  private buildRecommendationPrompt(
    sectionData: Record<string, any>,
    insights: AIInsight[],
    parameters: ReportParameters
  ): string {
    return `
      Based on the data analysis and insights, generate actionable recommendations:
      
      Key Insights: ${insights.map(i => i.title).join(', ')}
      Business Context: CA firm operations, ${parameters.audience} audience
      
      Generate 2-4 specific recommendations with clear action items.
      Return as JSON array with AIRecommendation interface structure.
    `
  }

  private parseInsights(aiResponse: string): AIInsight[] {
    try {
      return JSON.parse(aiResponse)
    } catch {
      return []
    }
  }

  private parseRecommendations(aiResponse: string): AIRecommendation[] {
    try {
      return JSON.parse(aiResponse)
    } catch {
      return []
    }
  }

  private countDataPoints(sectionData: Record<string, any>): number {
    return Object.values(sectionData).reduce((count, section: any) => {
      return count + (section.data?.length || 0)
    }, 0)
  }

  private calculateOverallConfidence(insights: AIInsight[]): number {
    if (insights.length === 0) return 0
    return insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length
  }

  private async generateExportUrls(request: ReportGenerationRequest): Promise<Record<string, string>> {
    // Mock implementation - in production, generate actual export URLs
    return {
      pdf: `/api/reports/export/${Date.now()}.pdf`,
      excel: `/api/reports/export/${Date.now()}.xlsx`,
      json: `/api/reports/export/${Date.now()}.json`
    }
  }
}