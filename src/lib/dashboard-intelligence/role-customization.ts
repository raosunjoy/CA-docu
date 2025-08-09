import { OpenAI } from 'openai'
import { DashboardLayout, DashboardWidget, WidgetTemplate } from './widget-system'

export interface RoleProfile {
  id: string
  name: string
  level: 'intern' | 'associate' | 'manager' | 'partner' | 'admin'
  permissions: RolePermissions
  focusAreas: string[]
  dataAccess: DataAccessLevel
  workflowPatterns: WorkflowPattern[]
  kpiPriorities: string[]
  decisionMaking: DecisionMakingLevel
}

export interface RolePermissions {
  widgets: {
    create: boolean
    edit: boolean
    delete: boolean
    configure: boolean
  }
  data: {
    view: string[]
    export: string[]
    sensitive: boolean
  }
  dashboards: {
    personal: boolean
    team: boolean
    organizational: boolean
  }
  alerts: {
    receive: boolean
    configure: boolean
    escalate: boolean
  }
}

export interface DataAccessLevel {
  scope: 'personal' | 'team' | 'department' | 'organization'
  granularity: 'summary' | 'detailed' | 'raw'
  temporal: {
    historical: boolean
    realTime: boolean
    forecasting: boolean
  }
  financial: {
    revenue: boolean
    costs: boolean
    profitability: boolean
    budgets: boolean
  }
  operational: {
    tasks: boolean
    resources: boolean
    performance: boolean
    compliance: boolean
  }
}

export interface WorkflowPattern {
  name: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'ad-hoc'
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible'
  duration: number
  dataNeeds: string[]
  outputs: string[]
  stakeholders: string[]
}

export interface DecisionMakingLevel {
  scope: 'tactical' | 'operational' | 'strategic'
  timeHorizon: 'immediate' | 'short-term' | 'medium-term' | 'long-term'
  impactLevel: 'individual' | 'team' | 'department' | 'organization'
  approvalRequired: boolean
}

export interface CustomizationRule {
  id: string
  name: string
  roleLevel: RoleProfile['level']
  condition: RuleCondition
  action: RuleAction
  priority: number
  active: boolean
}

export interface RuleCondition {
  type: 'user_property' | 'data_context' | 'time_based' | 'performance_metric'
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
}

export interface RuleAction {
  type: 'show_widget' | 'hide_widget' | 'modify_widget' | 'set_theme' | 'adjust_layout' | 'send_alert'
  target: string
  parameters: Record<string, any>
}

export interface PersonalizationContext {
  userId: string
  roleId: string
  preferences: UserPreferences
  behavior: UserBehavior
  performance: PerformanceMetrics
  workSchedule: WorkSchedule
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  density: 'compact' | 'comfortable' | 'spacious'
  chartTypes: string[]
  colorPreferences: string[]
  notificationSettings: NotificationSettings
  languages: string[]
  timezone: string
}

export interface UserBehavior {
  loginPatterns: Record<string, number>
  widgetInteractions: Record<string, number>
  pageViews: Record<string, number>
  searchQueries: string[]
  reportDownloads: Record<string, number>
  averageSessionDuration: number
}

export interface PerformanceMetrics {
  tasksCompleted: number
  onTimeDelivery: number
  qualityScore: number
  clientSatisfaction: number
  teamCollaboration: number
  knowledgeGaps: string[]
}

export interface WorkSchedule {
  workingHours: {
    start: string
    end: string
  }
  workingDays: string[]
  timezone: string
  peakProductivityHours: string[]
  meetingPreferences: {
    preferredTime: string
    duration: number
    frequency: string
  }
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  inApp: boolean
  sms: boolean
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  priorities: ('low' | 'medium' | 'high' | 'critical')[]
}

export interface DashboardPersonalization {
  userId: string
  adaptiveLayouts: Record<string, DashboardLayout>
  learningHistory: LearningRecord[]
  recommendationEngine: RecommendationEngine
  lastUpdated: Date
}

export interface LearningRecord {
  timestamp: Date
  action: string
  context: Record<string, any>
  feedback: 'positive' | 'negative' | 'neutral'
  impact: number
}

export interface RecommendationEngine {
  model: 'collaborative' | 'content_based' | 'hybrid'
  confidence: number
  lastTraining: Date
  recommendations: Recommendation[]
}

export interface Recommendation {
  type: 'widget' | 'layout' | 'feature' | 'workflow'
  item: string
  confidence: number
  reasoning: string
  expectedBenefit: string
}

export class RoleBasedDashboardCustomization {
  private openai: OpenAI
  private organizationId: string
  private roleProfiles: Map<string, RoleProfile> = new Map()
  private customizationRules: Map<string, CustomizationRule[]> = new Map()
  private personalizationData: Map<string, DashboardPersonalization> = new Map()

  constructor(config: {
    openaiApiKey: string
    organizationId: string
  }) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    })
    this.organizationId = config.organizationId
    this.initializeDefaultRoles()
  }

  /**
   * Creates a personalized dashboard based on role and context
   */
  async createPersonalizedDashboard(
    context: PersonalizationContext,
    dataAvailability: string[]
  ): Promise<DashboardLayout> {
    try {
      const role = this.roleProfiles.get(context.roleId)
      if (!role) {
        throw new Error(`Role profile ${context.roleId} not found`)
      }

      const personalizationPrompt = `
        Create a highly personalized dashboard for a CA firm user:
        
        Role: ${role.name} (${role.level})
        Focus Areas: ${role.focusAreas.join(', ')}
        KPI Priorities: ${role.kpiPriorities.join(', ')}
        Decision Making: ${role.decisionMaking.scope} level
        
        User Context:
        - Preferences: ${JSON.stringify(context.preferences)}
        - Behavior Patterns: ${JSON.stringify(context.behavior)}
        - Performance: ${JSON.stringify(context.performance)}
        - Work Schedule: ${JSON.stringify(context.workSchedule)}
        
        Available Data: ${dataAvailability.join(', ')}
        
        Design a dashboard that:
        1. Matches the user's role responsibilities
        2. Adapts to their work patterns and preferences
        3. Addresses performance gaps with relevant widgets
        4. Optimizes for their peak productivity hours
        5. Provides role-appropriate insights and alerts
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert in personalized dashboard design for CA firms. 
            Create dashboards that adapt to individual user needs, work patterns, and role requirements.`
          },
          {
            role: 'user',
            content: personalizationPrompt
          }
        ],
        temperature: 0.3
      })

      const aiResponse = response.choices[0].message.content || '{}'
      return this.processPersonalizedDashboard(context, aiResponse, role)
    } catch (error) {
      console.error('Error creating personalized dashboard:', error)
      return this.createDefaultRoleDashboard(context.userId, context.roleId)
    }
  }

  /**
   * Applies dynamic customization rules based on context
   */
  async applyDynamicCustomization(
    layout: DashboardLayout,
    context: PersonalizationContext
  ): Promise<DashboardLayout> {
    const role = this.roleProfiles.get(context.roleId)
    if (!role) return layout

    const rules = this.customizationRules.get(context.roleId) || []
    const customizedLayout = { ...layout }

    for (const rule of rules) {
      if (rule.active && this.evaluateRule(rule, context)) {
        customizedLayout.widgets = await this.applyRuleAction(
          customizedLayout.widgets,
          rule.action,
          context
        )
      }
    }

    return customizedLayout
  }

  /**
   * Generates adaptive recommendations based on user behavior
   */
  async generateAdaptiveRecommendations(
    userId: string,
    behaviorData: UserBehavior,
    performanceData: PerformanceMetrics
  ): Promise<Recommendation[]> {
    try {
      const recommendationPrompt = `
        Generate personalized dashboard recommendations based on user analytics:
        
        User Behavior:
        - Widget Interactions: ${JSON.stringify(behaviorData.widgetInteractions)}
        - Page Views: ${JSON.stringify(behaviorData.pageViews)}
        - Search Queries: ${behaviorData.searchQueries.slice(-10).join(', ')}
        - Session Duration: ${behaviorData.averageSessionDuration}
        
        Performance Metrics:
        - Tasks Completed: ${performanceData.tasksCompleted}
        - On-Time Delivery: ${performanceData.onTimeDelivery}%
        - Quality Score: ${performanceData.qualityScore}
        - Knowledge Gaps: ${performanceData.knowledgeGaps.join(', ')}
        
        Provide 3-5 specific recommendations to:
        1. Improve productivity based on usage patterns
        2. Address performance gaps
        3. Enhance workflow efficiency
        4. Support professional development
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a productivity consultant specializing in CA firm operations and personal efficiency optimization.'
          },
          {
            role: 'user',
            content: recommendationPrompt
          }
        ],
        temperature: 0.4
      })

      const recommendations = response.choices[0].message.content || '[]'
      return this.parseRecommendations(recommendations)
    } catch (error) {
      console.error('Error generating adaptive recommendations:', error)
      return []
    }
  }

  /**
   * Updates role profile based on organizational changes
   */
  async updateRoleProfile(
    roleId: string,
    updates: {
      responsibilities?: string[]
      permissions?: Partial<RolePermissions>
      focusAreas?: string[]
      kpiPriorities?: string[]
    }
  ): Promise<RoleProfile> {
    const role = this.roleProfiles.get(roleId)
    if (!role) {
      throw new Error(`Role profile ${roleId} not found`)
    }

    const updatedRole: RoleProfile = {
      ...role,
      focusAreas: updates.focusAreas || role.focusAreas,
      kpiPriorities: updates.kpiPriorities || role.kpiPriorities,
      permissions: { ...role.permissions, ...updates.permissions }
    }

    this.roleProfiles.set(roleId, updatedRole)
    return updatedRole
  }

  /**
   * Creates customization rules for specific roles
   */
  createCustomizationRule(
    roleId: string,
    name: string,
    condition: RuleCondition,
    action: RuleAction,
    priority = 1
  ): CustomizationRule {
    const rule: CustomizationRule = {
      id: `rule_${Date.now()}`,
      name,
      roleLevel: this.roleProfiles.get(roleId)?.level || 'associate',
      condition,
      action,
      priority,
      active: true
    }

    const existingRules = this.customizationRules.get(roleId) || []
    existingRules.push(rule)
    this.customizationRules.set(roleId, existingRules.sort((a, b) => b.priority - a.priority))

    return rule
  }

  /**
   * Learns from user interactions to improve personalization
   */
  async learnFromInteraction(
    userId: string,
    interaction: {
      action: string
      context: Record<string, any>
      outcome: 'positive' | 'negative' | 'neutral'
      timestamp?: Date
    }
  ): Promise<void> {
    let personalization = this.personalizationData.get(userId)
    
    if (!personalization) {
      personalization = {
        userId,
        adaptiveLayouts: {},
        learningHistory: [],
        recommendationEngine: {
          model: 'hybrid',
          confidence: 0.5,
          lastTraining: new Date(),
          recommendations: []
        },
        lastUpdated: new Date()
      }
    }

    const learningRecord: LearningRecord = {
      timestamp: interaction.timestamp || new Date(),
      action: interaction.action,
      context: interaction.context,
      feedback: interaction.outcome,
      impact: this.calculateInteractionImpact(interaction)
    }

    personalization.learningHistory.push(learningRecord)
    personalization.lastUpdated = new Date()

    // Keep only recent learning history (last 1000 interactions)
    if (personalization.learningHistory.length > 1000) {
      personalization.learningHistory = personalization.learningHistory.slice(-1000)
    }

    this.personalizationData.set(userId, personalization)

    // Retrain recommendations if enough new data
    if (personalization.learningHistory.length % 50 === 0) {
      await this.retrainRecommendationEngine(userId)
    }
  }

  /**
   * Gets available role profiles
   */
  getRoleProfiles(): RoleProfile[] {
    return Array.from(this.roleProfiles.values())
  }

  /**
   * Gets customization rules for a role
   */
  getCustomizationRules(roleId: string): CustomizationRule[] {
    return this.customizationRules.get(roleId) || []
  }

  /**
   * Private helper methods
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: RoleProfile[] = [
      {
        id: 'intern',
        name: 'Intern',
        level: 'intern',
        permissions: {
          widgets: { create: false, edit: false, delete: false, configure: false },
          data: { view: ['personal', 'assigned_tasks'], export: [], sensitive: false },
          dashboards: { personal: true, team: false, organizational: false },
          alerts: { receive: true, configure: false, escalate: false }
        },
        focusAreas: ['learning', 'task_completion', 'basic_compliance'],
        dataAccess: {
          scope: 'personal',
          granularity: 'summary',
          temporal: { historical: false, realTime: true, forecasting: false },
          financial: { revenue: false, costs: false, profitability: false, budgets: false },
          operational: { tasks: true, resources: false, performance: true, compliance: true }
        },
        workflowPatterns: [
          {
            name: 'Daily Task Review',
            frequency: 'daily',
            timeOfDay: 'morning',
            duration: 30,
            dataNeeds: ['assigned_tasks', 'deadlines'],
            outputs: ['task_updates'],
            stakeholders: ['supervisor']
          }
        ],
        kpiPriorities: ['task_completion_rate', 'learning_progress', 'quality_score'],
        decisionMaking: {
          scope: 'tactical',
          timeHorizon: 'immediate',
          impactLevel: 'individual',
          approvalRequired: true
        }
      },
      {
        id: 'associate',
        name: 'Associate',
        level: 'associate',
        permissions: {
          widgets: { create: true, edit: true, delete: false, configure: true },
          data: { view: ['personal', 'team', 'client_data'], export: ['basic_reports'], sensitive: false },
          dashboards: { personal: true, team: true, organizational: false },
          alerts: { receive: true, configure: true, escalate: false }
        },
        focusAreas: ['client_work', 'efficiency', 'quality_delivery', 'team_collaboration'],
        dataAccess: {
          scope: 'team',
          granularity: 'detailed',
          temporal: { historical: true, realTime: true, forecasting: false },
          financial: { revenue: false, costs: false, profitability: false, budgets: true },
          operational: { tasks: true, resources: true, performance: true, compliance: true }
        },
        workflowPatterns: [
          {
            name: 'Client Work Execution',
            frequency: 'daily',
            timeOfDay: 'morning',
            duration: 240,
            dataNeeds: ['client_data', 'task_requirements', 'compliance_rules'],
            outputs: ['deliverables', 'progress_reports'],
            stakeholders: ['manager', 'client']
          }
        ],
        kpiPriorities: ['billable_hours', 'client_satisfaction', 'quality_score', 'deadline_adherence'],
        decisionMaking: {
          scope: 'operational',
          timeHorizon: 'short-term',
          impactLevel: 'team',
          approvalRequired: false
        }
      },
      {
        id: 'manager',
        name: 'Manager',
        level: 'manager',
        permissions: {
          widgets: { create: true, edit: true, delete: true, configure: true },
          data: { view: ['team', 'department', 'financial'], export: ['detailed_reports'], sensitive: true },
          dashboards: { personal: true, team: true, organizational: true },
          alerts: { receive: true, configure: true, escalate: true }
        },
        focusAreas: ['team_performance', 'resource_optimization', 'client_relationships', 'business_growth'],
        dataAccess: {
          scope: 'department',
          granularity: 'detailed',
          temporal: { historical: true, realTime: true, forecasting: true },
          financial: { revenue: true, costs: true, profitability: true, budgets: true },
          operational: { tasks: true, resources: true, performance: true, compliance: true }
        },
        workflowPatterns: [
          {
            name: 'Team Performance Review',
            frequency: 'weekly',
            timeOfDay: 'morning',
            duration: 120,
            dataNeeds: ['team_metrics', 'client_feedback', 'financial_performance'],
            outputs: ['performance_reports', 'improvement_plans'],
            stakeholders: ['team', 'partners', 'clients']
          }
        ],
        kpiPriorities: ['team_utilization', 'client_retention', 'revenue_growth', 'quality_metrics'],
        decisionMaking: {
          scope: 'operational',
          timeHorizon: 'medium-term',
          impactLevel: 'department',
          approvalRequired: false
        }
      },
      {
        id: 'partner',
        name: 'Partner',
        level: 'partner',
        permissions: {
          widgets: { create: true, edit: true, delete: true, configure: true },
          data: { view: ['all'], export: ['all'], sensitive: true },
          dashboards: { personal: true, team: true, organizational: true },
          alerts: { receive: true, configure: true, escalate: true }
        },
        focusAreas: ['strategic_planning', 'firm_growth', 'risk_management', 'stakeholder_relations'],
        dataAccess: {
          scope: 'organization',
          granularity: 'raw',
          temporal: { historical: true, realTime: true, forecasting: true },
          financial: { revenue: true, costs: true, profitability: true, budgets: true },
          operational: { tasks: true, resources: true, performance: true, compliance: true }
        },
        workflowPatterns: [
          {
            name: 'Strategic Review',
            frequency: 'monthly',
            timeOfDay: 'morning',
            duration: 180,
            dataNeeds: ['firm_metrics', 'market_data', 'competitive_analysis'],
            outputs: ['strategic_decisions', 'investment_plans'],
            stakeholders: ['all_partners', 'board', 'key_clients']
          }
        ],
        kpiPriorities: ['firm_profitability', 'market_share', 'client_portfolio', 'risk_indicators'],
        decisionMaking: {
          scope: 'strategic',
          timeHorizon: 'long-term',
          impactLevel: 'organization',
          approvalRequired: false
        }
      }
    ]

    defaultRoles.forEach(role => {
      this.roleProfiles.set(role.id, role)
    })
  }

  private async processPersonalizedDashboard(
    context: PersonalizationContext,
    aiResponse: string,
    role: RoleProfile
  ): Promise<DashboardLayout> {
    try {
      const dashboardConfig = JSON.parse(aiResponse)
      
      const layout: DashboardLayout = {
        id: `personalized_${context.userId}_${Date.now()}`,
        name: `Personalized Dashboard - ${role.name}`,
        userId: context.userId,
        organizationId: this.organizationId,
        roleId: context.roleId,
        widgets: [],
        grid: dashboardConfig.grid || {
          columns: 12,
          rows: 8,
          cellWidth: 100,
          cellHeight: 100,
          padding: 10,
          margin: 20
        },
        theme: this.getPersonalizedTheme(context.preferences, role),
        lastModified: new Date(),
        isDefault: false
      }

      // Process AI-generated widgets
      if (dashboardConfig.widgets) {
        for (const widgetConfig of dashboardConfig.widgets) {
          const widget = await this.createPersonalizedWidget(widgetConfig, role, context)
          layout.widgets.push(widget)
        }
      }

      return layout
    } catch (error) {
      console.error('Error processing personalized dashboard:', error)
      return this.createDefaultRoleDashboard(context.userId, context.roleId)
    }
  }

  private createDefaultRoleDashboard(userId: string, roleId: string): DashboardLayout {
    const role = this.roleProfiles.get(roleId)
    
    return {
      id: `default_${userId}`,
      name: `Default ${role?.name || 'User'} Dashboard`,
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
      theme: this.getPersonalizedTheme({ theme: 'light' } as UserPreferences, role!),
      lastModified: new Date(),
      isDefault: true
    }
  }

  private getPersonalizedTheme(preferences: UserPreferences, role: RoleProfile): any {
    const baseTheme = {
      primaryColor: '#3B82F6',
      secondaryColor: '#6B7280',
      backgroundColor: '#F9FAFB',
      cardColor: '#FFFFFF',
      textColor: '#111827',
      borderColor: '#E5E7EB',
      accentColor: '#10B981'
    }

    // Apply user preferences
    if (preferences.theme === 'dark') {
      return {
        ...baseTheme,
        backgroundColor: '#111827',
        cardColor: '#1F2937',
        textColor: '#F9FAFB',
        borderColor: '#374151'
      }
    }

    // Apply role-based colors if no specific preference
    const roleColors = {
      intern: '#8B5CF6',
      associate: '#10B981',
      manager: '#F59E0B',
      partner: '#DC2626'
    }

    return {
      ...baseTheme,
      accentColor: roleColors[role.level] || baseTheme.accentColor
    }
  }

  private async createPersonalizedWidget(
    config: any,
    role: RoleProfile,
    context: PersonalizationContext
  ): Promise<DashboardWidget> {
    return {
      id: `personalized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || 'Personalized Widget',
      type: config.type || 'metric',
      category: config.category || 'operational',
      position: config.position || { x: 0, y: 0 },
      size: config.size || { width: 2, height: 2 },
      config: {
        title: config.name,
        showHeader: true,
        showBorder: true,
        ...config.styling
      },
      dataSource: config.dataSource || 'default',
      refreshInterval: config.refreshInterval || 300000,
      permissions: role.permissions.widgets,
      aiEnhanced: true,
      customizable: true
    }
  }

  private evaluateRule(rule: CustomizationRule, context: PersonalizationContext): boolean {
    const { condition } = rule
    
    switch (condition.type) {
      case 'user_property':
        return this.evaluateUserProperty(condition, context)
      case 'performance_metric':
        return this.evaluatePerformanceMetric(condition, context)
      case 'time_based':
        return this.evaluateTimeCondition(condition)
      default:
        return false
    }
  }

  private evaluateUserProperty(condition: RuleCondition, context: PersonalizationContext): boolean {
    const value = this.getNestedValue(context, condition.field)
    return this.compareValues(value, condition.operator, condition.value)
  }

  private evaluatePerformanceMetric(condition: RuleCondition, context: PersonalizationContext): boolean {
    const value = this.getNestedValue(context.performance, condition.field)
    return this.compareValues(value, condition.operator, condition.value)
  }

  private evaluateTimeCondition(condition: RuleCondition): boolean {
    const now = new Date()
    const currentHour = now.getHours()
    
    switch (condition.field) {
      case 'hour':
        return this.compareValues(currentHour, condition.operator, condition.value)
      case 'day_of_week':
        return this.compareValues(now.getDay(), condition.operator, condition.value)
      default:
        return false
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected
      case 'not_equals':
        return actual !== expected
      case 'greater_than':
        return actual > expected
      case 'less_than':
        return actual < expected
      case 'contains':
        return Array.isArray(actual) ? actual.includes(expected) : String(actual).includes(expected)
      case 'in':
        return Array.isArray(expected) ? expected.includes(actual) : false
      default:
        return false
    }
  }

  private async applyRuleAction(
    widgets: DashboardWidget[],
    action: RuleAction,
    context: PersonalizationContext
  ): Promise<DashboardWidget[]> {
    switch (action.type) {
      case 'show_widget':
        // Logic to show specific widget
        return widgets
      case 'hide_widget':
        return widgets.filter(w => w.id !== action.target)
      case 'modify_widget':
        return widgets.map(w => 
          w.id === action.target 
            ? { ...w, config: { ...w.config, ...action.parameters } }
            : w
        )
      default:
        return widgets
    }
  }

  private parseRecommendations(recommendations: string): Recommendation[] {
    try {
      return JSON.parse(recommendations)
    } catch {
      return []
    }
  }

  private calculateInteractionImpact(interaction: any): number {
    // Simple impact calculation based on action type and outcome
    const baseImpact = interaction.outcome === 'positive' ? 1 : 
                      interaction.outcome === 'negative' ? -1 : 0
    
    const actionMultiplier = interaction.action.includes('widget') ? 1.2 : 
                            interaction.action.includes('dashboard') ? 1.5 : 1.0
    
    return baseImpact * actionMultiplier
  }

  private async retrainRecommendationEngine(userId: string): Promise<void> {
    const personalization = this.personalizationData.get(userId)
    if (!personalization) return

    // Update recommendation engine confidence based on recent interactions
    const recentInteractions = personalization.learningHistory.slice(-100)
    const positiveRate = recentInteractions.filter(r => r.feedback === 'positive').length / recentInteractions.length
    
    personalization.recommendationEngine.confidence = Math.min(0.95, positiveRate * 1.2)
    personalization.recommendationEngine.lastTraining = new Date()
    
    this.personalizationData.set(userId, personalization)
  }
}