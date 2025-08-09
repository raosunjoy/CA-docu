import { OpenAI } from 'openai'
import { EventEmitter } from 'events'

export interface CollaborationContext {
  id: string
  type: 'project' | 'task' | 'client' | 'document' | 'discussion'
  title: string
  description: string
  participants: Participant[]
  createdBy: string
  createdAt: Date
  lastActivity: Date
  status: 'active' | 'paused' | 'completed' | 'archived'
  aiInsights: CollaborationInsight[]
  metadata: CollaborationMetadata
}

export interface Participant {
  userId: string
  name: string
  role: 'lead' | 'contributor' | 'reviewer' | 'observer' | 'ai_assistant'
  expertise: string[]
  availability: AvailabilityStatus
  contributionScore: number
  joinedAt: Date
  lastActive: Date
  permissions: ParticipantPermissions
}

export interface AvailabilityStatus {
  status: 'available' | 'busy' | 'away' | 'offline'
  until?: Date
  reason?: string
  workingHours?: WorkingHours
}

export interface WorkingHours {
  timezone: string
  schedule: DaySchedule[]
  holidays: Date[]
}

export interface DaySchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  startTime: string
  endTime: string
  breaks?: TimeSlot[]
}

export interface TimeSlot {
  startTime: string
  endTime: string
  description?: string
}

export interface ParticipantPermissions {
  canEdit: boolean
  canComment: boolean
  canInvite: boolean
  canRemove: boolean
  canViewSensitive: boolean
  canAssignTasks: boolean
  canApprove: boolean
}

export interface CollaborationInsight {
  id: string
  type: 'bottleneck' | 'opportunity' | 'risk' | 'suggestion' | 'pattern' | 'prediction'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  evidence: InsightEvidence[]
  recommendations: string[]
  createdAt: Date
  actionable: boolean
  isResolved: boolean
}

export interface InsightEvidence {
  type: 'data' | 'pattern' | 'trend' | 'anomaly'
  description: string
  value: any
  source: string
  timestamp: Date
}

export interface CollaborationMetadata {
  organizationId: string
  projectId?: string
  clientId?: string
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedEffort: number
  actualEffort: number
  complexity: 'simple' | 'moderate' | 'complex' | 'expert'
  requiredSkills: string[]
  deliverables: string[]
}

export interface SmartSuggestion {
  id: string
  type: 'task_assignment' | 'resource_allocation' | 'timeline_adjustment' | 'team_composition' | 'process_improvement'
  title: string
  description: string
  rationale: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  effort: 'minimal' | 'moderate' | 'significant'
  participants: string[]
  estimatedBenefit: string
  implementationSteps: string[]
  createdAt: Date
}

export interface TeamDynamics {
  contextId: string
  overallHealth: number
  communicationScore: number
  collaborationScore: number
  productivityScore: number
  satisfactionScore: number
  dynamics: DynamicAnalysis[]
  recommendations: TeamRecommendation[]
  lastAnalyzed: Date
}

export interface DynamicAnalysis {
  type: 'communication_pattern' | 'work_distribution' | 'response_time' | 'conflict_indicator' | 'engagement_level'
  score: number
  trend: 'improving' | 'stable' | 'declining'
  description: string
  affectedParticipants: string[]
  suggestions: string[]
}

export interface TeamRecommendation {
  category: 'communication' | 'workload' | 'skills' | 'process' | 'tools'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  expectedImpact: string
  implementationGuide: string[]
  successMetrics: string[]
}

export interface KnowledgeSharing {
  id: string
  contextId: string
  type: 'expertise' | 'experience' | 'best_practice' | 'lesson_learned' | 'resource'
  title: string
  content: string
  author: string
  relevance: string[]
  tags: string[]
  accessibilityScore: number
  usageCount: number
  rating: number
  comments: KnowledgeComment[]
  createdAt: Date
  lastUpdated: Date
}

export interface KnowledgeComment {
  id: string
  authorId: string
  content: string
  rating: number
  timestamp: Date
  helpful: number
}

export interface CollaborationEvent {
  id: string
  contextId: string
  type: 'participant_joined' | 'participant_left' | 'task_completed' | 'milestone_reached' | 'issue_raised' | 'decision_made'
  timestamp: Date
  initiator: string
  details: EventDetails
  impact: 'none' | 'low' | 'medium' | 'high'
  aiAnalysis?: EventAIAnalysis
}

export interface EventDetails {
  action: string
  target?: string
  data: Record<string, any>
  context: string
}

export interface EventAIAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative'
  significance: number
  patterns: string[]
  predictions: string[]
  recommendations: string[]
}

export interface ConflictResolution {
  id: string
  contextId: string
  type: 'disagreement' | 'resource_conflict' | 'priority_conflict' | 'communication_breakdown'
  status: 'detected' | 'acknowledged' | 'in_progress' | 'resolved'
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  involvedParticipants: string[]
  description: string
  timeline: ConflictTimeline[]
  resolutionSteps: ResolutionStep[]
  outcome?: ConflictOutcome
  aiMediation?: AIMediationSuggestion[]
}

export interface ConflictTimeline {
  timestamp: Date
  event: string
  participant?: string
  description: string
}

export interface ResolutionStep {
  id: string
  description: string
  assignedTo: string
  dueDate: Date
  status: 'pending' | 'in_progress' | 'completed'
  outcome?: string
}

export interface ConflictOutcome {
  resolution: string
  satisfaction: Record<string, number>
  lessonsLearned: string[]
  preventiveMeasures: string[]
}

export interface AIMediationSuggestion {
  type: 'communication_style' | 'compromise_option' | 'alternative_approach' | 'external_mediation'
  suggestion: string
  rationale: string
  confidence: number
  steps: string[]
}

export interface ProductivityMetrics {
  contextId: string
  period: { start: Date; end: Date }
  overallProductivity: number
  participantMetrics: ParticipantProductivity[]
  teamVelocity: number
  qualityScore: number
  collaborationEfficiency: number
  communicationEffectiveness: number
  trends: ProductivityTrend[]
  bottlenecks: ProductivityBottleneck[]
}

export interface ParticipantProductivity {
  userId: string
  productivityScore: number
  contributionValue: number
  responsiveness: number
  qualityRating: number
  collaborationRating: number
  workloadBalance: number
  strengths: string[]
  improvementAreas: string[]
}

export interface ProductivityTrend {
  metric: string
  direction: 'up' | 'down' | 'stable'
  magnitude: number
  timeframe: string
  confidence: number
}

export interface ProductivityBottleneck {
  type: 'process' | 'resource' | 'skill' | 'communication' | 'tools'
  description: string
  impact: number
  affectedParticipants: string[]
  suggestedSolutions: string[]
}

export class CollaborativeIntelligence extends EventEmitter {
  private openai: OpenAI
  private contexts: Map<string, CollaborationContext> = new Map()
  private events: Map<string, CollaborationEvent[]> = new Map()
  private knowledge: Map<string, KnowledgeSharing[]> = new Map()
  private conflicts: Map<string, ConflictResolution[]> = new Map()
  private teamDynamics: Map<string, TeamDynamics> = new Map()
  private analysisInterval?: NodeJS.Timeout

  constructor(config: { openaiApiKey: string }) {
    super()
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.startContinuousAnalysis()
  }

  /**
   * Creates a new collaboration context
   */
  async createCollaborationContext(
    type: CollaborationContext['type'],
    title: string,
    description: string,
    createdBy: string,
    initialParticipants: string[] = []
  ): Promise<string> {
    const contextId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const context: CollaborationContext = {
      id: contextId,
      type,
      title,
      description,
      participants: initialParticipants.map(userId => ({
        userId,
        name: this.getUserName(userId),
        role: userId === createdBy ? 'lead' : 'contributor',
        expertise: [],
        availability: {
          status: 'available',
          workingHours: this.getDefaultWorkingHours()
        },
        contributionScore: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
        permissions: this.getDefaultPermissions(userId === createdBy)
      })),
      createdBy,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active',
      aiInsights: [],
      metadata: {
        organizationId: 'default',
        tags: [],
        priority: 'medium',
        estimatedEffort: 0,
        actualEffort: 0,
        complexity: 'moderate',
        requiredSkills: [],
        deliverables: []
      }
    }

    this.contexts.set(contextId, context)
    this.events.set(contextId, [])
    this.knowledge.set(contextId, [])
    this.conflicts.set(contextId, [])

    // Generate initial AI insights
    await this.analyzeCollaborationContext(contextId)

    this.emit('context_created', context)
    return contextId
  }

  /**
   * Analyzes collaboration context and generates insights
   */
  async analyzeCollaborationContext(contextId: string): Promise<void> {
    const context = this.contexts.get(contextId)
    if (!context) return

    try {
      const analysisPrompt = `
        Analyze this collaboration context for a CA firm:
        
        Type: ${context.type}
        Title: ${context.title}
        Participants: ${context.participants.length}
        Duration: ${this.calculateContextDuration(context)} days
        Current Status: ${context.status}
        
        Recent Events: ${this.getRecentEventsDescription(contextId)}
        
        Analyze for:
        1. Team composition effectiveness
        2. Communication patterns and gaps
        3. Potential bottlenecks or risks
        4. Optimization opportunities
        5. Skill gaps or expertise overlaps
        6. Workload distribution
        
        Provide actionable insights with confidence scores.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert collaboration analyst for CA firms. 
            Identify patterns, risks, and opportunities to improve team effectiveness.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3
      })

      const insights = this.parseCollaborationInsights(response.choices[0].message.content || '[]')
      context.aiInsights = insights

      // Generate smart suggestions
      const suggestions = await this.generateSmartSuggestions(context)
      
      this.emit('insights_generated', { contextId, insights, suggestions })
    } catch (error) {
      console.error(`Collaboration analysis failed for context ${contextId}:`, error)
    }
  }

  /**
   * Generates smart suggestions for improving collaboration
   */
  async generateSmartSuggestions(context: CollaborationContext): Promise<SmartSuggestion[]> {
    try {
      const suggestionPrompt = `
        Generate smart collaboration suggestions for this CA firm context:
        
        Context: ${context.title} (${context.type})
        Team Size: ${context.participants.length}
        Complexity: ${context.metadata.complexity}
        Priority: ${context.metadata.priority}
        
        Current Insights: ${context.aiInsights.map(i => i.title).join(', ')}
        
        Generate 3-5 specific, actionable suggestions for:
        1. Task assignment optimization
        2. Resource allocation improvements
        3. Timeline adjustments
        4. Team composition enhancements
        5. Process improvements
        
        Focus on CA-specific workflows and requirements.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in CA firm team optimization and collaborative efficiency.'
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        temperature: 0.4
      })

      return this.parseSmartSuggestions(response.choices[0].message.content || '[]')
    } catch (error) {
      console.error('Smart suggestion generation failed:', error)
      return []
    }
  }

  /**
   * Analyzes team dynamics and health
   */
  async analyzeTeamDynamics(contextId: string): Promise<TeamDynamics> {
    const context = this.contexts.get(contextId)
    const events = this.events.get(contextId) || []
    
    if (!context) {
      throw new Error(`Context ${contextId} not found`)
    }

    try {
      // Calculate various metrics
      const communicationScore = this.calculateCommunicationScore(events, context)
      const collaborationScore = this.calculateCollaborationScore(events, context)
      const productivityScore = this.calculateProductivityScore(context)
      const satisfactionScore = this.calculateSatisfactionScore(context)

      const overallHealth = (communicationScore + collaborationScore + productivityScore + satisfactionScore) / 4

      const dynamics: DynamicAnalysis[] = [
        {
          type: 'communication_pattern',
          score: communicationScore,
          trend: this.calculateTrend(contextId, 'communication'),
          description: this.describeCommunicationPattern(communicationScore),
          affectedParticipants: context.participants.map(p => p.userId),
          suggestions: this.getCommunicationSuggestions(communicationScore)
        },
        {
          type: 'work_distribution',
          score: collaborationScore,
          trend: this.calculateTrend(contextId, 'collaboration'),
          description: this.describeWorkDistribution(context),
          affectedParticipants: this.getOverloadedParticipants(context),
          suggestions: this.getWorkDistributionSuggestions(context)
        }
      ]

      const recommendations = await this.generateTeamRecommendations(context, dynamics)

      const teamDynamics: TeamDynamics = {
        contextId,
        overallHealth,
        communicationScore,
        collaborationScore,
        productivityScore,
        satisfactionScore,
        dynamics,
        recommendations,
        lastAnalyzed: new Date()
      }

      this.teamDynamics.set(contextId, teamDynamics)
      return teamDynamics
    } catch (error) {
      console.error(`Team dynamics analysis failed for context ${contextId}:`, error)
      throw error
    }
  }

  /**
   * Detects and analyzes potential conflicts
   */
  async detectConflicts(contextId: string): Promise<ConflictResolution[]> {
    const context = this.contexts.get(contextId)
    const events = this.events.get(contextId) || []
    
    if (!context) return []

    try {
      const conflictAnalysisPrompt = `
        Analyze these collaboration events for potential conflicts:
        
        Context: ${context.title}
        Recent Events: ${events.slice(-20).map(e => 
          `${e.timestamp.toISOString()}: ${e.type} by ${e.initiator} - ${e.details.action}`
        ).join('\n')}
        
        Team Participants: ${context.participants.map(p => 
          `${p.name} (${p.role}) - Last active: ${p.lastActive.toISOString()}`
        ).join('\n')}
        
        Look for patterns indicating:
        1. Communication breakdowns
        2. Resource conflicts
        3. Priority disagreements
        4. Workload imbalances
        5. Deadline pressures
        6. Quality concerns
        
        Return detailed conflict analysis with severity and resolution suggestions.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in identifying and resolving team conflicts in professional CA firm environments.'
          },
          {
            role: 'user',
            content: conflictAnalysisPrompt
          }
        ],
        temperature: 0.2
      })

      const detectedConflicts = this.parseConflictAnalysis(
        response.choices[0].message.content || '[]',
        contextId
      )

      // Store detected conflicts
      const existingConflicts = this.conflicts.get(contextId) || []
      existingConflicts.push(...detectedConflicts)
      this.conflicts.set(contextId, existingConflicts)

      // Generate AI mediation suggestions for active conflicts
      for (const conflict of detectedConflicts) {
        if (conflict.severity === 'major' || conflict.severity === 'critical') {
          conflict.aiMediation = await this.generateMediationSuggestions(conflict)
        }
      }

      return detectedConflicts
    } catch (error) {
      console.error(`Conflict detection failed for context ${contextId}:`, error)
      return []
    }
  }

  /**
   * Facilitates knowledge sharing within the collaboration
   */
  async shareKnowledge(
    contextId: string,
    authorId: string,
    type: KnowledgeSharing['type'],
    title: string,
    content: string,
    tags: string[] = []
  ): Promise<string> {
    const knowledgeId = `knowledge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Analyze content relevance using AI
    const relevanceAnalysis = await this.analyzeKnowledgeRelevance(content, contextId)
    
    const knowledge: KnowledgeSharing = {
      id: knowledgeId,
      contextId,
      type,
      title,
      content,
      author: authorId,
      relevance: relevanceAnalysis.relevantAreas,
      tags: [...tags, ...relevanceAnalysis.suggestedTags],
      accessibilityScore: relevanceAnalysis.accessibilityScore,
      usageCount: 0,
      rating: 0,
      comments: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    }

    const contextKnowledge = this.knowledge.get(contextId) || []
    contextKnowledge.push(knowledge)
    this.knowledge.set(contextId, contextKnowledge)

    // Record knowledge sharing event
    this.recordEvent(contextId, {
      type: 'decision_made',
      initiator: authorId,
      details: {
        action: 'knowledge_shared',
        target: knowledgeId,
        data: { title, type, tags },
        context: 'knowledge_sharing'
      },
      impact: 'medium'
    })

    this.emit('knowledge_shared', knowledge)
    return knowledgeId
  }

  /**
   * Records a collaboration event
   */
  recordEvent(contextId: string, eventData: Omit<CollaborationEvent, 'id' | 'contextId' | 'timestamp'>): void {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const event: CollaborationEvent = {
      id: eventId,
      contextId,
      timestamp: new Date(),
      ...eventData
    }

    const contextEvents = this.events.get(contextId) || []
    contextEvents.push(event)
    this.events.set(contextId, contextEvents)

    // Update context activity
    const context = this.contexts.get(contextId)
    if (context) {
      context.lastActivity = new Date()
      
      // Update participant activity
      const participant = context.participants.find(p => p.userId === event.initiator)
      if (participant) {
        participant.lastActive = new Date()
      }
    }

    this.emit('event_recorded', event)
  }

  /**
   * Gets productivity metrics for a context
   */
  getProductivityMetrics(contextId: string, period: { start: Date; end: Date }): ProductivityMetrics {
    const context = this.contexts.get(contextId)
    const events = this.events.get(contextId) || []
    
    if (!context) {
      throw new Error(`Context ${contextId} not found`)
    }

    const relevantEvents = events.filter(e => 
      e.timestamp >= period.start && e.timestamp <= period.end
    )

    // Calculate various productivity metrics
    const participantMetrics = context.participants.map(participant => 
      this.calculateParticipantProductivity(participant, relevantEvents)
    )

    const overallProductivity = participantMetrics.length > 0
      ? participantMetrics.reduce((sum, pm) => sum + pm.productivityScore, 0) / participantMetrics.length
      : 0

    return {
      contextId,
      period,
      overallProductivity,
      participantMetrics,
      teamVelocity: this.calculateTeamVelocity(relevantEvents),
      qualityScore: this.calculateQualityScore(context, relevantEvents),
      collaborationEfficiency: this.calculateCollaborationEfficiency(relevantEvents),
      communicationEffectiveness: this.calculateCommunicationEffectiveness(relevantEvents),
      trends: this.calculateProductivityTrends(contextId, period),
      bottlenecks: this.identifyProductivityBottlenecks(context, relevantEvents)
    }
  }

  /**
   * Gets collaboration contexts for a user
   */
  getUserContexts(userId: string): CollaborationContext[] {
    return Array.from(this.contexts.values()).filter(context =>
      context.participants.some(p => p.userId === userId)
    )
  }

  /**
   * Gets team dynamics for a context
   */
  getTeamDynamics(contextId: string): TeamDynamics | null {
    return this.teamDynamics.get(contextId) || null
  }

  /**
   * Gets knowledge shared in a context
   */
  getContextKnowledge(contextId: string): KnowledgeSharing[] {
    return this.knowledge.get(contextId) || []
  }

  /**
   * Private helper methods
   */
  private startContinuousAnalysis(): void {
    // Analyze all contexts every 30 minutes
    this.analysisInterval = setInterval(async () => {
      for (const contextId of this.contexts.keys()) {
        await this.analyzeCollaborationContext(contextId)
        await this.analyzeTeamDynamics(contextId)
        await this.detectConflicts(contextId)
      }
    }, 30 * 60 * 1000)
  }

  private getUserName(userId: string): string {
    // In production, lookup from user service
    return userId
  }

  private getDefaultWorkingHours(): WorkingHours {
    return {
      timezone: 'Asia/Kolkata',
      schedule: [
        { day: 'monday', startTime: '09:00', endTime: '18:00' },
        { day: 'tuesday', startTime: '09:00', endTime: '18:00' },
        { day: 'wednesday', startTime: '09:00', endTime: '18:00' },
        { day: 'thursday', startTime: '09:00', endTime: '18:00' },
        { day: 'friday', startTime: '09:00', endTime: '18:00' }
      ],
      holidays: []
    }
  }

  private getDefaultPermissions(isLead: boolean): ParticipantPermissions {
    return {
      canEdit: isLead,
      canComment: true,
      canInvite: isLead,
      canRemove: isLead,
      canViewSensitive: isLead,
      canAssignTasks: isLead,
      canApprove: isLead
    }
  }

  private calculateContextDuration(context: CollaborationContext): number {
    const now = new Date()
    return Math.ceil((now.getTime() - context.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  }

  private getRecentEventsDescription(contextId: string): string {
    const events = this.events.get(contextId) || []
    return events.slice(-5).map(e => 
      `${e.type} by ${e.initiator}: ${e.details.action}`
    ).join('; ')
  }

  private parseCollaborationInsights(aiResponse: string): CollaborationInsight[] {
    try {
      const parsed = JSON.parse(aiResponse)
      return Array.isArray(parsed) ? parsed.map(insight => ({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: insight.type || 'suggestion',
        title: insight.title || 'AI Insight',
        description: insight.description || '',
        severity: insight.severity || 'medium',
        confidence: insight.confidence || 0.5,
        evidence: insight.evidence || [],
        recommendations: insight.recommendations || [],
        createdAt: new Date(),
        actionable: insight.actionable !== false,
        isResolved: false
      })) : []
    } catch {
      return []
    }
  }

  private parseSmartSuggestions(aiResponse: string): SmartSuggestion[] {
    try {
      const parsed = JSON.parse(aiResponse)
      return Array.isArray(parsed) ? parsed.map(suggestion => ({
        id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: suggestion.type || 'process_improvement',
        title: suggestion.title || 'Smart Suggestion',
        description: suggestion.description || '',
        rationale: suggestion.rationale || '',
        confidence: suggestion.confidence || 0.5,
        impact: suggestion.impact || 'medium',
        effort: suggestion.effort || 'moderate',
        participants: suggestion.participants || [],
        estimatedBenefit: suggestion.estimatedBenefit || '',
        implementationSteps: suggestion.implementationSteps || [],
        createdAt: new Date()
      })) : []
    } catch {
      return []
    }
  }

  private calculateCommunicationScore(events: CollaborationEvent[], context: CollaborationContext): number {
    const communicationEvents = events.filter(e => 
      ['decision_made', 'issue_raised'].includes(e.type)
    ).length
    
    const participantCount = context.participants.length
    return Math.min(100, (communicationEvents / Math.max(1, participantCount)) * 20)
  }

  private calculateCollaborationScore(events: CollaborationEvent[], context: CollaborationContext): number {
    const collaborativeEvents = events.filter(e => 
      ['task_completed', 'milestone_reached'].includes(e.type)
    ).length
    
    return Math.min(100, collaborativeEvents * 10)
  }

  private calculateProductivityScore(context: CollaborationContext): number {
    const totalContribution = context.participants.reduce((sum, p) => sum + p.contributionScore, 0)
    return Math.min(100, totalContribution / Math.max(1, context.participants.length))
  }

  private calculateSatisfactionScore(context: CollaborationContext): number {
    // Mock satisfaction score - in production, collect from surveys
    return 75
  }

  private calculateTrend(contextId: string, metric: string): 'improving' | 'stable' | 'declining' {
    // Mock trend calculation - in production, analyze historical data
    return 'stable'
  }

  private describeCommunicationPattern(score: number): string {
    if (score >= 80) return 'Excellent communication patterns with regular updates and clear information flow'
    if (score >= 60) return 'Good communication with occasional gaps that could be improved'
    if (score >= 40) return 'Moderate communication with some delays and unclear messaging'
    return 'Poor communication patterns requiring immediate attention'
  }

  private getCommunicationSuggestions(score: number): string[] {
    if (score < 60) {
      return [
        'Schedule regular check-in meetings',
        'Implement structured status updates',
        'Use collaborative tools for transparency',
        'Encourage active participation from all members'
      ]
    }
    return ['Maintain current communication practices', 'Consider peer feedback sessions']
  }

  private describeWorkDistribution(context: CollaborationContext): string {
    const avgContribution = context.participants.reduce((sum, p) => sum + p.contributionScore, 0) / context.participants.length
    return `Average contribution score: ${avgContribution.toFixed(1)}`
  }

  private getOverloadedParticipants(context: CollaborationContext): string[] {
    const avgContribution = context.participants.reduce((sum, p) => sum + p.contributionScore, 0) / context.participants.length
    return context.participants
      .filter(p => p.contributionScore > avgContribution * 1.5)
      .map(p => p.userId)
  }

  private getWorkDistributionSuggestions(context: CollaborationContext): string[] {
    return [
      'Review task assignments for balance',
      'Consider redistributing workload among team members',
      'Identify opportunities for parallel work',
      'Provide additional support to overloaded members'
    ]
  }

  private async generateTeamRecommendations(
    context: CollaborationContext,
    dynamics: DynamicAnalysis[]
  ): Promise<TeamRecommendation[]> {
    // Generate basic recommendations based on analysis
    const recommendations: TeamRecommendation[] = []

    if (dynamics.some(d => d.score < 60)) {
      recommendations.push({
        category: 'communication',
        priority: 'high',
        title: 'Improve Team Communication',
        description: 'Communication patterns show room for improvement',
        expectedImpact: 'Better coordination and reduced misunderstandings',
        implementationGuide: [
          'Schedule daily standup meetings',
          'Use structured communication templates',
          'Implement feedback loops'
        ],
        successMetrics: ['Increased communication frequency', 'Faster response times']
      })
    }

    return recommendations
  }

  private parseConflictAnalysis(aiResponse: string, contextId: string): ConflictResolution[] {
    try {
      const parsed = JSON.parse(aiResponse)
      return Array.isArray(parsed) ? parsed.map(conflict => ({
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contextId,
        type: conflict.type || 'disagreement',
        status: 'detected',
        severity: conflict.severity || 'minor',
        involvedParticipants: conflict.participants || [],
        description: conflict.description || '',
        timeline: [],
        resolutionSteps: [],
        aiMediation: []
      })) : []
    } catch {
      return []
    }
  }

  private async generateMediationSuggestions(conflict: ConflictResolution): Promise<AIMediationSuggestion[]> {
    try {
      const mediationPrompt = `
        Generate mediation suggestions for this CA firm conflict:
        
        Type: ${conflict.type}
        Severity: ${conflict.severity}
        Description: ${conflict.description}
        Involved: ${conflict.involvedParticipants.join(', ')}
        
        Provide professional mediation strategies suitable for a CA firm environment.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional mediator specializing in workplace conflicts in professional services firms.'
          },
          {
            role: 'user',
            content: mediationPrompt
          }
        ],
        temperature: 0.3
      })

      return this.parseMediationSuggestions(response.choices[0].message.content || '[]')
    } catch (error) {
      console.error('Mediation suggestion generation failed:', error)
      return []
    }
  }

  private parseMediationSuggestions(aiResponse: string): AIMediationSuggestion[] {
    try {
      const parsed = JSON.parse(aiResponse)
      return Array.isArray(parsed) ? parsed.map(suggestion => ({
        type: suggestion.type || 'communication_style',
        suggestion: suggestion.suggestion || '',
        rationale: suggestion.rationale || '',
        confidence: suggestion.confidence || 0.5,
        steps: suggestion.steps || []
      })) : []
    } catch {
      return []
    }
  }

  private async analyzeKnowledgeRelevance(content: string, contextId: string): Promise<{
    relevantAreas: string[]
    suggestedTags: string[]
    accessibilityScore: number
  }> {
    try {
      const analysisPrompt = `
        Analyze this knowledge content for relevance in a CA firm context:
        
        Content: ${content.substring(0, 1000)}
        
        Determine:
        1. Relevant practice areas (tax, audit, compliance, etc.)
        2. Suggested tags for categorization
        3. Accessibility score (0-100) based on clarity and usefulness
        
        Return structured analysis.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledge management expert for CA firms.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3
      })

      const analysis = JSON.parse(response.choices[0].message.content || '{}')
      
      return {
        relevantAreas: analysis.relevantAreas || [],
        suggestedTags: analysis.suggestedTags || [],
        accessibilityScore: analysis.accessibilityScore || 50
      }
    } catch {
      return {
        relevantAreas: [],
        suggestedTags: [],
        accessibilityScore: 50
      }
    }
  }

  private calculateParticipantProductivity(participant: Participant, events: CollaborationEvent[]): ParticipantProductivity {
    const participantEvents = events.filter(e => e.initiator === participant.userId)
    
    return {
      userId: participant.userId,
      productivityScore: Math.min(100, participantEvents.length * 10),
      contributionValue: participant.contributionScore,
      responsiveness: this.calculateResponsiveness(participant, events),
      qualityRating: 80, // Mock rating
      collaborationRating: 75, // Mock rating
      workloadBalance: this.calculateWorkloadBalance(participant, events),
      strengths: ['communication', 'technical_skills'],
      improvementAreas: ['time_management']
    }
  }

  private calculateResponsiveness(participant: Participant, events: CollaborationEvent[]): number {
    // Mock responsiveness calculation
    return 85
  }

  private calculateWorkloadBalance(participant: Participant, events: CollaborationEvent[]): number {
    // Mock workload balance calculation
    return 70
  }

  private calculateTeamVelocity(events: CollaborationEvent[]): number {
    const completionEvents = events.filter(e => e.type === 'task_completed').length
    return completionEvents
  }

  private calculateQualityScore(context: CollaborationContext, events: CollaborationEvent[]): number {
    // Mock quality score
    return 85
  }

  private calculateCollaborationEfficiency(events: CollaborationEvent[]): number {
    // Mock collaboration efficiency
    return 78
  }

  private calculateCommunicationEffectiveness(events: CollaborationEvent[]): number {
    // Mock communication effectiveness
    return 82
  }

  private calculateProductivityTrends(contextId: string, period: { start: Date; end: Date }): ProductivityTrend[] {
    // Mock productivity trends
    return [
      {
        metric: 'overall_productivity',
        direction: 'up',
        magnitude: 15,
        timeframe: 'last_week',
        confidence: 0.8
      }
    ]
  }

  private identifyProductivityBottlenecks(context: CollaborationContext, events: CollaborationEvent[]): ProductivityBottleneck[] {
    // Mock bottleneck identification
    return [
      {
        type: 'communication',
        description: 'Delayed responses affecting project timelines',
        impact: 0.6,
        affectedParticipants: context.participants.slice(0, 2).map(p => p.userId),
        suggestedSolutions: [
          'Implement faster communication channels',
          'Set response time expectations',
          'Use automated status updates'
        ]
      }
    ]
  }
}