import { OpenAI } from 'openai'

export interface DashboardWidget {
  id: string
  name: string
  type: 'kpi' | 'chart' | 'table' | 'metric' | 'progress' | 'alert' | 'activity' | 'insight'
  category: 'financial' | 'operational' | 'compliance' | 'performance' | 'communication'
  position: WidgetPosition
  size: WidgetSize
  config: WidgetConfig
  dataSource: string
  refreshInterval: number
  permissions: WidgetPermissions
  aiEnhanced: boolean
  customizable: boolean
}

export interface WidgetPosition {
  x: number
  y: number
  zIndex?: number
}

export interface WidgetSize {
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

export interface WidgetConfig {
  title: string
  subtitle?: string
  showHeader: boolean
  showBorder: boolean
  backgroundColor?: string
  textColor?: string
  visualization?: VisualizationConfig
  filters?: WidgetFilter[]
  aggregation?: AggregationConfig
  alerts?: AlertConfig[]
}

export interface VisualizationConfig {
  chartType: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'gauge' | 'number' | 'progress'
  colorScheme: string[]
  interactive: boolean
  animations: boolean
  responsive: boolean
  aiOptimized: boolean
}

export interface WidgetFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between'
  value: any
  label: string
}

export interface AggregationConfig {
  groupBy?: string[]
  aggregateBy: string
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median'
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'
}

export interface AlertConfig {
  id: string
  name: string
  condition: AlertCondition
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  notification: boolean
  emailRecipients?: string[]
}

export interface AlertCondition {
  metric: string
  operator: 'greater_than' | 'less_than' | 'equals' | 'change_percentage'
  value: number
  timeframe?: string
}

export interface WidgetPermissions {
  view: string[]
  edit: string[]
  configure: string[]
  delete: string[]
}

export interface DashboardLayout {
  id: string
  name: string
  userId: string
  organizationId: string
  roleId: string
  widgets: DashboardWidget[]
  grid: GridConfig
  theme: ThemeConfig
  lastModified: Date
  isDefault: boolean
}

export interface GridConfig {
  columns: number
  rows: number
  cellWidth: number
  cellHeight: number
  padding: number
  margin: number
}

export interface ThemeConfig {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  cardColor: string
  textColor: string
  borderColor: string
  accentColor: string
}

export interface WidgetData {
  id: string
  widgetId: string
  data: any
  metadata: DataMetadata
  lastUpdated: Date
  cacheExpiry: Date
  insights?: AIInsight[]
}

export interface DataMetadata {
  source: string
  recordCount: number
  dateRange: {
    start: Date
    end: Date
  }
  quality: number
  freshness: number
}

export interface AIInsight {
  type: 'trend' | 'anomaly' | 'forecast' | 'recommendation' | 'alert'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  suggestedActions?: string[]
}

export interface WidgetTemplate {
  id: string
  name: string
  description: string
  category: string
  type: DashboardWidget['type']
  defaultConfig: WidgetConfig
  requiredFields: string[]
  compatibleDataSources: string[]
  previewImage?: string
}

export interface DashboardAnalytics {
  widgetUsage: Record<string, number>
  interactionHeatmap: Record<string, number>
  loadTimes: Record<string, number>
  errorRates: Record<string, number>
  userPreferences: Record<string, any>
}

export class IntelligentDashboardWidgetSystem {
  private openai: OpenAI
  private organizationId: string
  private widgets: Map<string, DashboardWidget> = new Map()
  private templates: Map<string, WidgetTemplate> = new Map()
  private layouts: Map<string, DashboardLayout> = new Map()

  constructor(config: {
    openaiApiKey: string
    organizationId: string
  }) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    })
    this.organizationId = config.organizationId
    this.initializeDefaultTemplates()
  }

  /**
   * Creates an intelligent dashboard layout based on user role and preferences
   */
  async createIntelligentLayout(
    userId: string,
    roleId: string,
    preferences: {
      focusAreas: string[]
      dataFrequency: string
      complexity: 'simple' | 'moderate' | 'complex'
      priorities: string[]
    }
  ): Promise<DashboardLayout> {
    try {
      const layoutPrompt = `
        Create an optimized dashboard layout for a CA firm user with the following profile:
        
        Role: ${roleId}
        Focus Areas: ${preferences.focusAreas.join(', ')}
        Data Frequency: ${preferences.dataFrequency}
        Complexity Level: ${preferences.complexity}
        Priorities: ${preferences.priorities.join(', ')}
        
        Consider:
        1. Role-appropriate widgets and metrics
        2. Logical positioning based on importance
        3. Appropriate widget sizes for data density
        4. Color scheme and theme preferences
        5. Real-time vs batch data requirements
        
        Return a structured dashboard configuration with widget recommendations.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert dashboard designer for CA firm management systems. 
            Create layouts that maximize productivity and data accessibility based on user roles and preferences.`
          },
          {
            role: 'user',
            content: layoutPrompt
          }
        ],
        temperature: 0.3
      })

      const aiRecommendations = response.choices[0].message.content || '{}'
      return this.processAILayoutRecommendations(userId, roleId, aiRecommendations, preferences)
    } catch (error) {
      console.error('Error creating intelligent layout:', error)
      return this.createDefaultLayout(userId, roleId)
    }
  }

  /**
   * Generates AI-powered widget suggestions based on data patterns
   */
  async suggestWidgets(
    dataContext: {
      availableData: string[]
      userBehavior: Record<string, number>
      businessMetrics: Record<string, any>
      timeframe: string
    }
  ): Promise<WidgetTemplate[]> {
    try {
      const suggestionPrompt = `
        Analyze the following data context and suggest optimal dashboard widgets:
        
        Available Data: ${dataContext.availableData.join(', ')}
        User Behavior Patterns: ${JSON.stringify(dataContext.userBehavior)}
        Key Business Metrics: ${JSON.stringify(dataContext.businessMetrics)}
        Analysis Timeframe: ${dataContext.timeframe}
        
        Suggest 5-8 high-value widgets that would provide the most business insight.
        Focus on:
        1. Actionable metrics
        2. Early warning indicators
        3. Performance trends
        4. Operational efficiency
        5. Compliance status
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business intelligence analyst specializing in CA firm operations and dashboard design.'
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        temperature: 0.4
      })

      const suggestions = response.choices[0].message.content || '[]'
      return this.parseWidgetSuggestions(suggestions)
    } catch (error) {
      console.error('Error generating widget suggestions:', error)
      return this.getDefaultWidgetTemplates()
    }
  }

  /**
   * Optimizes widget performance and positioning using AI analysis
   */
  async optimizeDashboard(
    layoutId: string,
    analytics: DashboardAnalytics,
    userFeedback: any[]
  ): Promise<DashboardLayout> {
    const layout = this.layouts.get(layoutId)
    if (!layout) {
      throw new Error(`Dashboard layout ${layoutId} not found`)
    }

    try {
      const optimizationPrompt = `
        Optimize this dashboard layout based on usage analytics and user feedback:
        
        Current Layout: ${JSON.stringify(layout, null, 2)}
        
        Usage Analytics:
        - Widget Usage: ${JSON.stringify(analytics.widgetUsage)}
        - Interaction Patterns: ${JSON.stringify(analytics.interactionHeatmap)}
        - Performance Issues: ${JSON.stringify(analytics.loadTimes)}
        - Error Rates: ${JSON.stringify(analytics.errorRates)}
        
        User Feedback: ${JSON.stringify(userFeedback)}
        
        Provide optimizations for:
        1. Widget positioning based on usage patterns
        2. Size adjustments for better visibility
        3. Performance improvements
        4. User experience enhancements
        5. Data refresh optimization
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a UX optimization expert specializing in business dashboard design and user experience analytics.'
          },
          {
            role: 'user',
            content: optimizationPrompt
          }
        ],
        temperature: 0.2
      })

      const optimizations = response.choices[0].message.content || '{}'
      return this.applyLayoutOptimizations(layout, optimizations, analytics)
    } catch (error) {
      console.error('Error optimizing dashboard:', error)
      return layout
    }
  }

  /**
   * Creates dynamic widget configurations based on data analysis
   */
  async createDynamicWidget(
    type: DashboardWidget['type'],
    dataSource: string,
    requirements: {
      purpose: string
      audience: string
      timeframe: string
      keyMetrics: string[]
    }
  ): Promise<DashboardWidget> {
    try {
      const widgetPrompt = `
        Create a dynamic dashboard widget configuration:
        
        Widget Type: ${type}
        Data Source: ${dataSource}
        Purpose: ${requirements.purpose}
        Target Audience: ${requirements.audience}
        Timeframe: ${requirements.timeframe}
        Key Metrics: ${requirements.keyMetrics.join(', ')}
        
        Generate optimal configuration including:
        1. Appropriate visualization type
        2. Color scheme and styling
        3. Data filters and aggregations
        4. Alert thresholds
        5. Interaction capabilities
        6. AI enhancement opportunities
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert data visualization designer with deep knowledge of business intelligence and dashboard widgets.'
          },
          {
            role: 'user',
            content: widgetPrompt
          }
        ],
        temperature: 0.3
      })

      const widgetConfig = response.choices[0].message.content || '{}'
      return this.processDynamicWidgetConfig(type, dataSource, widgetConfig, requirements)
    } catch (error) {
      console.error('Error creating dynamic widget:', error)
      return this.createDefaultWidget(type, dataSource)
    }
  }

  /**
   * Analyzes widget data and generates insights
   */
  async generateWidgetInsights(
    widgetId: string,
    data: any,
    context: {
      historical: any[]
      benchmarks: Record<string, number>
      businessContext: string
    }
  ): Promise<AIInsight[]> {
    try {
      const insightPrompt = `
        Analyze this widget data and generate business insights:
        
        Widget Data: ${JSON.stringify(data)}
        Historical Context: ${JSON.stringify(context.historical.slice(-10))}
        Industry Benchmarks: ${JSON.stringify(context.benchmarks)}
        Business Context: ${context.businessContext}
        
        Generate 2-4 actionable insights focusing on:
        1. Significant trends or patterns
        2. Performance against benchmarks
        3. Potential issues or opportunities
        4. Recommended actions
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst expert in CA firm operations, financial metrics, and performance optimization.'
          },
          {
            role: 'user',
            content: insightPrompt
          }
        ],
        temperature: 0.4
      })

      const insights = response.choices[0].message.content || '[]'
      return this.parseInsights(insights)
    } catch (error) {
      console.error('Error generating widget insights:', error)
      return []
    }
  }

  /**
   * Gets available widget templates
   */
  getWidgetTemplates(category?: string): WidgetTemplate[] {
    const templates = Array.from(this.templates.values())
    return category 
      ? templates.filter(t => t.category === category)
      : templates
  }

  /**
   * Saves a dashboard layout
   */
  async saveDashboardLayout(layout: DashboardLayout): Promise<void> {
    layout.lastModified = new Date()
    this.layouts.set(layout.id, layout)
  }

  /**
   * Gets a dashboard layout
   */
  getDashboardLayout(layoutId: string): DashboardLayout | undefined {
    return this.layouts.get(layoutId)
  }

  /**
   * Private helper methods
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: WidgetTemplate[] = [
      {
        id: 'revenue-kpi',
        name: 'Revenue KPI',
        description: 'Key revenue metrics with trend analysis',
        category: 'financial',
        type: 'kpi',
        defaultConfig: {
          title: 'Revenue Performance',
          showHeader: true,
          showBorder: true,
          visualization: {
            chartType: 'number',
            colorScheme: ['#10B981', '#EF4444'],
            interactive: false,
            animations: true,
            responsive: true,
            aiOptimized: true
          }
        },
        requiredFields: ['revenue', 'period'],
        compatibleDataSources: ['financial_data', 'revenue_analytics']
      },
      {
        id: 'task-progress',
        name: 'Task Progress Tracker',
        description: 'Real-time task completion and workflow status',
        category: 'operational',
        type: 'progress',
        defaultConfig: {
          title: 'Task Progress',
          showHeader: true,
          showBorder: true,
          visualization: {
            chartType: 'progress',
            colorScheme: ['#3B82F6', '#10B981', '#F59E0B'],
            interactive: true,
            animations: true,
            responsive: true,
            aiOptimized: false
          }
        },
        requiredFields: ['completed_tasks', 'total_tasks'],
        compatibleDataSources: ['task_data', 'workflow_analytics']
      },
      {
        id: 'compliance-alert',
        name: 'Compliance Alerts',
        description: 'Critical compliance deadlines and status alerts',
        category: 'compliance',
        type: 'alert',
        defaultConfig: {
          title: 'Compliance Status',
          showHeader: true,
          showBorder: true,
          backgroundColor: '#FEF2F2',
          visualization: {
            chartType: 'gauge',
            colorScheme: ['#EF4444', '#F59E0B', '#10B981'],
            interactive: false,
            animations: false,
            responsive: true,
            aiOptimized: true
          },
          alerts: [
            {
              id: 'deadline-warning',
              name: 'Deadline Warning',
              condition: {
                metric: 'days_until_deadline',
                operator: 'less_than',
                value: 7
              },
              threshold: 7,
              severity: 'high',
              notification: true
            }
          ]
        },
        requiredFields: ['compliance_score', 'deadlines'],
        compatibleDataSources: ['compliance_data', 'regulatory_calendar']
      }
    ]

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  private async processAILayoutRecommendations(
    userId: string,
    roleId: string,
    aiResponse: string,
    preferences: any
  ): Promise<DashboardLayout> {
    try {
      const recommendations = JSON.parse(aiResponse)
      
      const layout: DashboardLayout = {
        id: `layout_${Date.now()}`,
        name: `AI-Optimized Dashboard - ${roleId}`,
        userId,
        organizationId: this.organizationId,
        roleId,
        widgets: [],
        grid: {
          columns: 12,
          rows: 8,
          cellWidth: 100,
          cellHeight: 100,
          padding: 10,
          margin: 20
        },
        theme: this.getThemeForRole(roleId),
        lastModified: new Date(),
        isDefault: false
      }

      // Process AI recommendations into actual widgets
      if (recommendations.widgets) {
        for (const widgetRec of recommendations.widgets) {
          const widget = await this.createWidgetFromRecommendation(widgetRec)
          layout.widgets.push(widget)
        }
      }

      this.layouts.set(layout.id, layout)
      return layout
    } catch (error) {
      console.error('Error processing AI layout recommendations:', error)
      return this.createDefaultLayout(userId, roleId)
    }
  }

  private createDefaultLayout(userId: string, roleId: string): DashboardLayout {
    return {
      id: `default_${userId}`,
      name: `Default Dashboard - ${roleId}`,
      userId,
      organizationId: this.organizationId,
      roleId,
      widgets: [],
      grid: {
        columns: 12,
        rows: 8,
        cellWidth: 100,
        cellHeight: 100,
        padding: 10,
        margin: 20
      },
      theme: this.getThemeForRole(roleId),
      lastModified: new Date(),
      isDefault: true
    }
  }

  private getThemeForRole(roleId: string): ThemeConfig {
    const themes: Record<string, ThemeConfig> = {
      partner: {
        primaryColor: '#1F2937',
        secondaryColor: '#6B7280',
        backgroundColor: '#F9FAFB',
        cardColor: '#FFFFFF',
        textColor: '#111827',
        borderColor: '#E5E7EB',
        accentColor: '#3B82F6'
      },
      manager: {
        primaryColor: '#059669',
        secondaryColor: '#6B7280',
        backgroundColor: '#F0FDF4',
        cardColor: '#FFFFFF',
        textColor: '#111827',
        borderColor: '#D1FAE5',
        accentColor: '#10B981'
      },
      associate: {
        primaryColor: '#7C3AED',
        secondaryColor: '#6B7280',
        backgroundColor: '#FAF5FF',
        cardColor: '#FFFFFF',
        textColor: '#111827',
        borderColor: '#E9D5FF',
        accentColor: '#8B5CF6'
      }
    }

    return themes[roleId] || themes.associate
  }

  private async createWidgetFromRecommendation(recommendation: any): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: recommendation.name || 'Untitled Widget',
      type: recommendation.type || 'metric',
      category: recommendation.category || 'operational',
      position: recommendation.position || { x: 0, y: 0 },
      size: recommendation.size || { width: 2, height: 2 },
      config: {
        title: recommendation.name || 'Untitled Widget',
        showHeader: true,
        showBorder: true,
        ...recommendation.config
      },
      dataSource: recommendation.dataSource || 'default',
      refreshInterval: recommendation.refreshInterval || 300000,
      permissions: {
        view: ['all'],
        edit: ['admin', 'manager'],
        configure: ['admin'],
        delete: ['admin']
      },
      aiEnhanced: recommendation.aiEnhanced || false,
      customizable: true
    }

    return widget
  }

  private parseWidgetSuggestions(suggestions: string): WidgetTemplate[] {
    try {
      return JSON.parse(suggestions)
    } catch {
      return this.getDefaultWidgetTemplates()
    }
  }

  private getDefaultWidgetTemplates(): WidgetTemplate[] {
    return Array.from(this.templates.values()).slice(0, 5)
  }

  private applyLayoutOptimizations(
    layout: DashboardLayout,
    optimizations: string,
    analytics: DashboardAnalytics
  ): DashboardLayout {
    try {
      const opts = JSON.parse(optimizations)
      
      // Apply positioning optimizations
      if (opts.positioning) {
        layout.widgets.forEach(widget => {
          const widgetOpt = opts.positioning[widget.id]
          if (widgetOpt) {
            widget.position = { ...widget.position, ...widgetOpt.position }
            widget.size = { ...widget.size, ...widgetOpt.size }
          }
        })
      }

      // Apply performance optimizations
      if (opts.performance) {
        layout.widgets.forEach(widget => {
          const perfOpt = opts.performance[widget.id]
          if (perfOpt?.refreshInterval) {
            widget.refreshInterval = perfOpt.refreshInterval
          }
        })
      }

      layout.lastModified = new Date()
      return layout
    } catch {
      return layout
    }
  }

  private processDynamicWidgetConfig(
    type: DashboardWidget['type'],
    dataSource: string,
    config: string,
    requirements: any
  ): DashboardWidget {
    try {
      const widgetConfig = JSON.parse(config)
      
      return {
        id: `dynamic_${Date.now()}`,
        name: widgetConfig.name || `Dynamic ${type} Widget`,
        type,
        category: widgetConfig.category || 'operational',
        position: { x: 0, y: 0 },
        size: { width: 2, height: 2 },
        config: {
          title: widgetConfig.title || requirements.purpose,
          showHeader: true,
          showBorder: true,
          ...widgetConfig.styling,
          visualization: widgetConfig.visualization
        },
        dataSource,
        refreshInterval: widgetConfig.refreshInterval || 300000,
        permissions: {
          view: ['all'],
          edit: ['admin', 'manager'],
          configure: ['admin'],
          delete: ['admin']
        },
        aiEnhanced: true,
        customizable: true
      }
    } catch {
      return this.createDefaultWidget(type, dataSource)
    }
  }

  private createDefaultWidget(
    type: DashboardWidget['type'],
    dataSource: string
  ): DashboardWidget {
    return {
      id: `default_${Date.now()}`,
      name: `Default ${type} Widget`,
      type,
      category: 'operational',
      position: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      config: {
        title: `${type} Widget`,
        showHeader: true,
        showBorder: true
      },
      dataSource,
      refreshInterval: 300000,
      permissions: {
        view: ['all'],
        edit: ['admin'],
        configure: ['admin'],
        delete: ['admin']
      },
      aiEnhanced: false,
      customizable: true
    }
  }

  private parseInsights(insights: string): AIInsight[] {
    try {
      return JSON.parse(insights)
    } catch {
      return []
    }
  }
}