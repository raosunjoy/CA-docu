import { OpenAI } from 'openai'
import { EventEmitter } from 'events'

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  version: string
  category: 'tax' | 'audit' | 'compliance' | 'consultation' | 'general'
  trigger: WorkflowTrigger
  steps: WorkflowStep[]
  variables: WorkflowVariable[]
  settings: WorkflowSettings
  metadata: WorkflowMetadata
  isActive: boolean
  createdBy: string
  createdAt: Date
  lastModified: Date
}

export interface WorkflowTrigger {
  type: 'manual' | 'email' | 'task_created' | 'task_completed' | 'deadline' | 'client_action' | 'document_uploaded'
  conditions: TriggerCondition[]
  schedule?: WorkflowSchedule
}

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array'
}

export interface WorkflowSchedule {
  type: 'once' | 'recurring'
  startDate?: Date
  endDate?: Date
  cronExpression?: string
  timezone: string
}

export interface WorkflowStep {
  id: string
  name: string
  type: WorkflowStepType
  configuration: StepConfiguration
  conditions?: StepCondition[]
  onSuccess?: string // next step id
  onFailure?: string // next step id
  onSkip?: string // next step id
  timeout?: number
  retryConfig?: RetryConfiguration
  order: number
}

export type WorkflowStepType = 
  | 'task_creation'
  | 'email_send'
  | 'notification'
  | 'approval_request'
  | 'document_generation'
  | 'data_validation'
  | 'calculation'
  | 'ai_analysis'
  | 'wait'
  | 'conditional'
  | 'loop'
  | 'parallel'
  | 'webhook'
  | 'integration'

export interface StepConfiguration {
  [key: string]: any
  templateId?: string
  recipients?: string[]
  assignee?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string // expression or fixed date
  variables?: Record<string, any>
}

export interface StepCondition {
  expression: string
  description: string
}

export interface RetryConfiguration {
  maxAttempts: number
  backoffStrategy: 'fixed' | 'exponential' | 'linear'
  initialDelay: number
  maxDelay: number
}

export interface WorkflowVariable {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array'
  defaultValue?: any
  description: string
  required: boolean
  source?: 'input' | 'calculated' | 'external'
}

export interface WorkflowSettings {
  timeout: number
  maxRetries: number
  enableLogging: boolean
  enableAudit: boolean
  notifyOnFailure: boolean
  failureRecipients: string[]
  enableParallelExecution: boolean
  maxParallelSteps: number
}

export interface WorkflowMetadata {
  organizationId: string
  tags: string[]
  usageCount: number
  successRate: number
  averageExecutionTime: number
  lastUsed?: Date
  isTemplate: boolean
  templateCategory?: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  workflowVersion: string
  triggeredBy: string
  triggeredAt: Date
  status: WorkflowStatus
  currentStepId?: string
  variables: Record<string, any>
  stepResults: StepResult[]
  logs: WorkflowLog[]
  startTime: Date
  endTime?: Date
  duration?: number
  error?: string
  metadata: ExecutionMetadata
}

export type WorkflowStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'waiting'

export interface StepResult {
  stepId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime: Date
  endTime?: Date
  duration?: number
  input: any
  output?: any
  error?: string
  retryCount: number
}

export interface WorkflowLog {
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'debug'
  stepId?: string
  message: string
  data?: any
}

export interface ExecutionMetadata {
  source: string
  context: Record<string, any>
  clientId?: string
  projectId?: string
  taskId?: string
  userId: string
  organizationId: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  industry: 'ca_firm' | 'tax_consultancy' | 'audit_firm' | 'generic'
  complexity: 'simple' | 'moderate' | 'complex'
  estimatedTime: string
  requiredSkills: string[]
  workflowDefinition: Omit<WorkflowDefinition, 'id' | 'createdBy' | 'createdAt' | 'lastModified'>
  usageStats: TemplateUsageStats
}

export interface TemplateUsageStats {
  adoptionCount: number
  successRate: number
  userRating: number
  feedbackCount: number
  lastUpdated: Date
}

export interface WorkflowAnalytics {
  workflowId: string
  executionCount: number
  successRate: number
  failureRate: number
  averageExecutionTime: number
  stepPerformance: StepPerformance[]
  commonFailurePoints: FailurePoint[]
  usagePatterns: UsagePattern[]
  resourceUtilization: ResourceUtilization
}

export interface StepPerformance {
  stepId: string
  stepName: string
  averageExecutionTime: number
  successRate: number
  mostCommonErrors: string[]
}

export interface FailurePoint {
  stepId: string
  stepName: string
  failureRate: number
  commonErrors: string[]
  suggestedFixes: string[]
}

export interface UsagePattern {
  triggerType: string
  frequency: number
  timeOfDay: number[]
  dayOfWeek: number[]
  seasonality: Record<string, number>
}

export interface ResourceUtilization {
  averageCpuUsage: number
  averageMemoryUsage: number
  averageNetworkUsage: number
  peakExecutionTimes: Date[]
}

export class WorkflowAutomationEngine extends EventEmitter {
  private openai: OpenAI
  private workflows: Map<string, WorkflowDefinition> = new Map()
  private executions: Map<string, WorkflowExecution> = new Map()
  private templates: Map<string, WorkflowTemplate> = new Map()
  private activeExecutions: Set<string> = new Set()
  private stepExecutors: Map<WorkflowStepType, (step: WorkflowStep, execution: WorkflowExecution) => Promise<any>> = new Map()

  constructor(config: { openaiApiKey: string }) {
    super()
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.initializeStepExecutors()
    this.initializeDefaultWorkflows()
    this.initializeWorkflowTemplates()
  }

  /**
   * Creates a new workflow definition
   */
  async createWorkflow(
    definition: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'lastModified' | 'metadata'>
  ): Promise<string> {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const workflow: WorkflowDefinition = {
      id: workflowId,
      createdAt: new Date(),
      lastModified: new Date(),
      metadata: {
        organizationId: 'default',
        tags: [],
        usageCount: 0,
        successRate: 0,
        averageExecutionTime: 0,
        isTemplate: false
      },
      ...definition
    }

    // Validate workflow definition
    this.validateWorkflow(workflow)
    
    this.workflows.set(workflowId, workflow)
    this.emit('workflow_created', workflow)
    
    return workflowId
  }

  /**
   * Triggers a workflow execution
   */
  async triggerWorkflow(
    workflowId: string,
    triggeredBy: string,
    context: Record<string, any> = {},
    variables: Record<string, any> = {}
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    if (!workflow.isActive) {
      throw new Error(`Workflow ${workflowId} is not active`)
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      triggeredBy,
      triggeredAt: new Date(),
      status: 'pending',
      variables: { ...this.getDefaultVariables(workflow), ...variables },
      stepResults: [],
      logs: [],
      startTime: new Date(),
      metadata: {
        source: 'manual',
        context,
        userId: triggeredBy,
        organizationId: workflow.metadata.organizationId
      }
    }

    this.executions.set(executionId, execution)
    this.activeExecutions.add(executionId)
    
    // Start execution asynchronously
    this.executeWorkflow(execution).catch(error => {
      console.error(`Workflow execution ${executionId} failed:`, error)
      execution.status = 'failed'
      execution.error = error.message
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
      this.activeExecutions.delete(executionId)
    })

    this.emit('workflow_triggered', execution)
    return executionId
  }

  /**
   * Executes a workflow
   */
  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId)!
    
    try {
      execution.status = 'running'
      this.logExecution(execution, 'info', 'Workflow execution started')
      
      // Sort steps by order
      const orderedSteps = [...workflow.steps].sort((a, b) => a.order - b.order)
      
      for (const step of orderedSteps) {
        // Check if execution was cancelled
        if (!this.activeExecutions.has(execution.id)) {
          execution.status = 'cancelled'
          return
        }

        // Execute step
        await this.executeStep(step, execution, workflow)
        
        // Check step result
        const stepResult = execution.stepResults.find(r => r.stepId === step.id)
        if (stepResult?.status === 'failed' && !step.onFailure) {
          // Workflow failed
          execution.status = 'failed'
          execution.error = `Step ${step.name} failed: ${stepResult.error}`
          break
        }
        
        // Handle conditional flow
        let nextStepId: string | undefined
        if (stepResult?.status === 'completed' && step.onSuccess) {
          nextStepId = step.onSuccess
        } else if (stepResult?.status === 'failed' && step.onFailure) {
          nextStepId = step.onFailure
        } else if (stepResult?.status === 'skipped' && step.onSkip) {
          nextStepId = step.onSkip
        }
        
        if (nextStepId) {
          const nextStep = orderedSteps.find(s => s.id === nextStepId)
          if (nextStep) {
            execution.currentStepId = nextStepId
          }
        }
      }
      
      if (execution.status === 'running') {
        execution.status = 'completed'
        this.logExecution(execution, 'info', 'Workflow execution completed successfully')
      }
      
    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : 'Unknown error'
      this.logExecution(execution, 'error', `Workflow execution failed: ${execution.error}`)
    } finally {
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
      this.activeExecutions.delete(execution.id)
      
      // Update workflow metadata
      workflow.metadata.usageCount++
      workflow.metadata.lastUsed = new Date()
      
      this.emit('workflow_completed', execution)
    }
  }

  /**
   * Executes a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    workflow: WorkflowDefinition
  ): Promise<void> {
    const stepResult: StepResult = {
      stepId: step.id,
      status: 'pending',
      startTime: new Date(),
      input: step.configuration,
      retryCount: 0
    }

    execution.stepResults.push(stepResult)
    execution.currentStepId = step.id

    try {
      stepResult.status = 'running'
      this.logExecution(execution, 'info', `Starting step: ${step.name}`, { stepId: step.id })

      // Check step conditions
      if (step.conditions && !this.evaluateStepConditions(step.conditions, execution)) {
        stepResult.status = 'skipped'
        this.logExecution(execution, 'info', `Step skipped due to conditions: ${step.name}`)
        return
      }

      // Execute step with retry logic
      const result = await this.executeStepWithRetry(step, execution)
      
      stepResult.output = result
      stepResult.status = 'completed'
      stepResult.endTime = new Date()
      stepResult.duration = stepResult.endTime.getTime() - stepResult.startTime.getTime()
      
      this.logExecution(execution, 'info', `Step completed: ${step.name}`, { result })

    } catch (error) {
      stepResult.status = 'failed'
      stepResult.error = error instanceof Error ? error.message : 'Unknown error'
      stepResult.endTime = new Date()
      stepResult.duration = stepResult.endTime!.getTime() - stepResult.startTime.getTime()
      
      this.logExecution(execution, 'error', `Step failed: ${step.name}`, { error: stepResult.error })
      
      if (workflow.settings.notifyOnFailure) {
        await this.notifyStepFailure(step, execution, stepResult.error)
      }
    }
  }

  /**
   * Executes a step with retry logic
   */
  private async executeStepWithRetry(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const maxRetries = step.retryConfig?.maxAttempts || 0
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(step.retryConfig!, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
          this.logExecution(execution, 'info', `Retrying step ${step.name} (attempt ${attempt + 1})`)
        }

        const executor = this.stepExecutors.get(step.type)
        if (!executor) {
          throw new Error(`No executor found for step type: ${step.type}`)
        }

        return await executor(step, execution)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        this.logExecution(execution, 'warning', `Step attempt ${attempt + 1} failed: ${lastError.message}`)
      }
    }

    throw lastError
  }

  /**
   * Creates a workflow from a template
   */
  async createWorkflowFromTemplate(
    templateId: string,
    customizations: {
      name?: string
      variables?: Record<string, any>
      settings?: Partial<WorkflowSettings>
      createdBy: string
    }
  ): Promise<string> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const workflowDefinition: WorkflowDefinition = {
      ...template.workflowDefinition,
      id: '',
      name: customizations.name || template.name,
      createdBy: customizations.createdBy,
      createdAt: new Date(),
      lastModified: new Date(),
      variables: template.workflowDefinition.variables.map(variable => ({
        ...variable,
        defaultValue: customizations.variables?.[variable.name] ?? variable.defaultValue
      })),
      settings: {
        ...template.workflowDefinition.settings,
        ...customizations.settings
      }
    }

    const workflowId = await this.createWorkflow(workflowDefinition)
    
    // Update template usage stats
    template.usageStats.adoptionCount++
    template.usageStats.lastUpdated = new Date()
    
    return workflowId
  }

  /**
   * Generates workflow suggestions using AI
   */
  async suggestWorkflow(context: {
    category: string
    description: string
    existingProcesses?: string[]
    requirements?: string[]
    constraints?: string[]
  }): Promise<{
    suggestion: Partial<WorkflowDefinition>
    confidence: number
    reasoning: string
  }> {
    try {
      const suggestionPrompt = `
        Create a workflow suggestion for a CA firm based on this context:
        
        Category: ${context.category}
        Description: ${context.description}
        Existing Processes: ${context.existingProcesses?.join(', ') || 'None specified'}
        Requirements: ${context.requirements?.join(', ') || 'None specified'}
        Constraints: ${context.constraints?.join(', ') || 'None specified'}
        
        Generate a comprehensive workflow with:
        1. Appropriate trigger conditions
        2. Sequential steps for CA operations
        3. Error handling and retries
        4. Compliance checkpoints
        5. Notification and approval steps
        6. Variable definitions
        
        Focus on CA-specific tasks like tax preparation, audit procedures, 
        compliance checks, client communication, and document management.
        
        Return as structured JSON with confidence score and reasoning.
      `

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert workflow designer for CA firms. Create efficient, 
            compliant, and practical workflows that improve operational efficiency.`
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        temperature: 0.3
      })

      return this.parseWorkflowSuggestion(response.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Workflow suggestion failed:', error)
      return {
        suggestion: {},
        confidence: 0,
        reasoning: 'Failed to generate suggestion'
      }
    }
  }

  /**
   * Gets workflow analytics
   */
  getWorkflowAnalytics(workflowId: string): WorkflowAnalytics {
    const executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === workflowId)

    const successfulExecutions = executions.filter(e => e.status === 'completed')
    const failedExecutions = executions.filter(e => e.status === 'failed')

    const stepPerformance = this.calculateStepPerformance(executions)
    const commonFailurePoints = this.identifyFailurePoints(failedExecutions)

    return {
      workflowId,
      executionCount: executions.length,
      successRate: executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0,
      failureRate: executions.length > 0 ? (failedExecutions.length / executions.length) * 100 : 0,
      averageExecutionTime: this.calculateAverageExecutionTime(executions),
      stepPerformance,
      commonFailurePoints,
      usagePatterns: [],
      resourceUtilization: {
        averageCpuUsage: 15,
        averageMemoryUsage: 256,
        averageNetworkUsage: 128,
        peakExecutionTimes: []
      }
    }
  }

  /**
   * Gets all workflows
   */
  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Gets workflow execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null
  }

  /**
   * Gets available workflow templates
   */
  getWorkflowTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Private helper methods
   */
  private initializeStepExecutors(): void {
    this.stepExecutors.set('task_creation', this.executeTaskCreation.bind(this))
    this.stepExecutors.set('email_send', this.executeEmailSend.bind(this))
    this.stepExecutors.set('notification', this.executeNotification.bind(this))
    this.stepExecutors.set('approval_request', this.executeApprovalRequest.bind(this))
    this.stepExecutors.set('document_generation', this.executeDocumentGeneration.bind(this))
    this.stepExecutors.set('ai_analysis', this.executeAIAnalysis.bind(this))
    this.stepExecutors.set('wait', this.executeWait.bind(this))
    this.stepExecutors.set('conditional', this.executeConditional.bind(this))
    this.stepExecutors.set('calculation', this.executeCalculation.bind(this))
  }

  private async executeTaskCreation(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    
    // Create task using configuration
    const taskData = {
      title: this.interpolateVariables(config.title || 'Workflow Task', execution.variables),
      description: this.interpolateVariables(config.description || '', execution.variables),
      assignee: config.assignee,
      priority: config.priority || 'medium',
      dueDate: config.dueDate ? new Date(config.dueDate) : undefined,
      category: config.category || 'general',
      workflowExecutionId: execution.id
    }

    // Emit task creation event
    this.emit('task_create_requested', taskData)
    
    return { taskId: `task_${Date.now()}`, ...taskData }
  }

  private async executeEmailSend(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    
    const emailData = {
      to: config.recipients || [],
      subject: this.interpolateVariables(config.subject || 'Workflow Notification', execution.variables),
      body: this.interpolateVariables(config.body || '', execution.variables),
      templateId: config.templateId
    }

    // Emit email send event
    this.emit('email_send_requested', emailData)
    
    return { emailId: `email_${Date.now()}`, ...emailData }
  }

  private async executeNotification(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    
    const notificationData = {
      recipients: config.recipients || [],
      title: this.interpolateVariables(config.title || 'Workflow Notification', execution.variables),
      message: this.interpolateVariables(config.message || '', execution.variables),
      type: config.type || 'info',
      actionUrl: config.actionUrl
    }

    // Emit notification event
    this.emit('notification_requested', notificationData)
    
    return notificationData
  }

  private async executeApprovalRequest(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    
    const approvalData = {
      approver: config.approver,
      title: this.interpolateVariables(config.title || 'Approval Required', execution.variables),
      description: this.interpolateVariables(config.description || '', execution.variables),
      dueDate: config.dueDate ? new Date(config.dueDate) : undefined,
      workflowExecutionId: execution.id,
      stepId: step.id
    }

    // Emit approval request event
    this.emit('approval_requested', approvalData)
    
    return { approvalId: `approval_${Date.now()}`, ...approvalData }
  }

  private async executeDocumentGeneration(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    
    // Generate document using template and variables
    const documentData = {
      templateId: config.templateId,
      variables: execution.variables,
      format: config.format || 'pdf',
      name: this.interpolateVariables(config.name || 'Generated Document', execution.variables)
    }

    // Emit document generation event
    this.emit('document_generation_requested', documentData)
    
    return { documentId: `doc_${Date.now()}`, ...documentData }
  }

  private async executeAIAnalysis(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    
    const analysisPrompt = this.interpolateVariables(
      config.prompt || 'Analyze the provided data',
      execution.variables
    )

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI analyst for CA firm workflows. Provide structured analysis.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3
    })

    const analysis = response.choices[0].message.content || ''
    
    // Store analysis result in execution variables
    execution.variables[`ai_analysis_${step.id}`] = analysis
    
    return { analysis, confidence: 0.8 }
  }

  private async executeWait(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    const waitTime = config.duration || 1000 // Default 1 second
    
    await new Promise(resolve => setTimeout(resolve, waitTime))
    
    return { waited: waitTime }
  }

  private async executeConditional(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    const condition = config.condition || 'true'
    
    const result = this.evaluateExpression(condition, execution.variables)
    
    return { conditionResult: result, condition }
  }

  private async executeCalculation(step: WorkflowStep, execution: WorkflowExecution): Promise<any> {
    const config = step.configuration
    const expression = config.expression || '0'
    
    const result = this.evaluateExpression(expression, execution.variables)
    
    // Store calculation result in variables
    if (config.outputVariable) {
      execution.variables[config.outputVariable] = result
    }
    
    return { calculationResult: result, expression }
  }

  private initializeDefaultWorkflows(): void {
    // Tax Return Processing Workflow
    this.createWorkflow({
      name: 'Tax Return Processing',
      description: 'Complete workflow for processing client tax returns',
      version: '1.0',
      category: 'tax',
      trigger: {
        type: 'email',
        conditions: [
          {
            field: 'subject',
            operator: 'contains',
            value: 'tax return',
            dataType: 'string'
          }
        ]
      },
      steps: [
        {
          id: 'create_task',
          name: 'Create Tax Return Task',
          type: 'task_creation',
          configuration: {
            title: 'Process Tax Return for ${client_name}',
            description: 'Complete tax return preparation and filing',
            category: 'tax',
            priority: 'high'
          },
          order: 1
        },
        {
          id: 'notify_team',
          name: 'Notify Tax Team',
          type: 'notification',
          configuration: {
            recipients: ['tax_team'],
            title: 'New Tax Return Request',
            message: 'Tax return task created for ${client_name}'
          },
          order: 2
        },
        {
          id: 'request_documents',
          name: 'Request Client Documents',
          type: 'email_send',
          configuration: {
            recipients: ['${client_email}'],
            subject: 'Tax Return Document Request',
            templateId: 'tax_document_request'
          },
          order: 3
        }
      ],
      variables: [
        {
          name: 'client_name',
          type: 'string',
          description: 'Client name',
          required: true,
          source: 'input'
        },
        {
          name: 'client_email',
          type: 'string',
          description: 'Client email address',
          required: true,
          source: 'input'
        }
      ],
      settings: {
        timeout: 3600000, // 1 hour
        maxRetries: 3,
        enableLogging: true,
        enableAudit: true,
        notifyOnFailure: true,
        failureRecipients: ['admin'],
        enableParallelExecution: false,
        maxParallelSteps: 1
      },
      isActive: true,
      createdBy: 'system'
    })
  }

  private initializeWorkflowTemplates(): void {
    // CA-specific workflow templates would be loaded here
    const taxReturnTemplate: WorkflowTemplate = {
      id: 'tax_return_template',
      name: 'Tax Return Processing Template',
      description: 'Standard template for processing individual and corporate tax returns',
      category: 'tax',
      industry: 'ca_firm',
      complexity: 'moderate',
      estimatedTime: '2-4 hours',
      requiredSkills: ['tax_preparation', 'client_communication'],
      workflowDefinition: {
        name: 'Tax Return Processing',
        description: 'Process tax returns from client request to filing',
        version: '1.0',
        category: 'tax',
        trigger: {
          type: 'email',
          conditions: []
        },
        steps: [],
        variables: [],
        settings: {
          timeout: 7200000,
          maxRetries: 3,
          enableLogging: true,
          enableAudit: true,
          notifyOnFailure: true,
          failureRecipients: [],
          enableParallelExecution: false,
          maxParallelSteps: 1
        },
        isActive: true
      },
      usageStats: {
        adoptionCount: 0,
        successRate: 0,
        userRating: 0,
        feedbackCount: 0,
        lastUpdated: new Date()
      }
    }

    this.templates.set(taxReturnTemplate.id, taxReturnTemplate)
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.name || !workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have a name and at least one step')
    }

    // Validate step IDs are unique
    const stepIds = workflow.steps.map(s => s.id)
    const uniqueStepIds = new Set(stepIds)
    if (stepIds.length !== uniqueStepIds.size) {
      throw new Error('Workflow steps must have unique IDs')
    }

    // Validate step references
    for (const step of workflow.steps) {
      if (step.onSuccess && !stepIds.includes(step.onSuccess)) {
        throw new Error(`Step ${step.id} references non-existent success step: ${step.onSuccess}`)
      }
      if (step.onFailure && !stepIds.includes(step.onFailure)) {
        throw new Error(`Step ${step.id} references non-existent failure step: ${step.onFailure}`)
      }
    }
  }

  private getDefaultVariables(workflow: WorkflowDefinition): Record<string, any> {
    const defaults: Record<string, any> = {}
    
    workflow.variables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        defaults[variable.name] = variable.defaultValue
      }
    })
    
    return defaults
  }

  private evaluateStepConditions(conditions: StepCondition[], execution: WorkflowExecution): boolean {
    return conditions.every(condition => 
      this.evaluateExpression(condition.expression, execution.variables)
    )
  }

  private evaluateExpression(expression: string, variables: Record<string, any>): any {
    try {
      // Simple expression evaluation - in production, use a proper expression parser
      let evaluatedExpression = expression
      
      // Replace variables
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
        evaluatedExpression = evaluatedExpression.replace(regex, String(value))
      })
      
      // Simple boolean evaluation
      if (evaluatedExpression === 'true') return true
      if (evaluatedExpression === 'false') return false
      
      // Simple numeric evaluation
      if (/^[\d\+\-\*\/\.\s]+$/.test(evaluatedExpression)) {
        // eslint-disable-next-line no-new-func
        return Function(`"use strict"; return (${evaluatedExpression})`)()
      }
      
      return evaluatedExpression
    } catch {
      return false
    }
  }

  private interpolateVariables(template: string, variables: Record<string, any>): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g')
      result = result.replace(regex, String(value))
    })
    
    return result
  }

  private calculateRetryDelay(retryConfig: RetryConfiguration, attempt: number): number {
    switch (retryConfig.backoffStrategy) {
      case 'exponential':
        return Math.min(
          retryConfig.initialDelay * Math.pow(2, attempt - 1),
          retryConfig.maxDelay
        )
      case 'linear':
        return Math.min(
          retryConfig.initialDelay * attempt,
          retryConfig.maxDelay
        )
      case 'fixed':
      default:
        return retryConfig.initialDelay
    }
  }

  private logExecution(
    execution: WorkflowExecution,
    level: WorkflowLog['level'],
    message: string,
    data?: any
  ): void {
    const log: WorkflowLog = {
      timestamp: new Date(),
      level,
      stepId: execution.currentStepId,
      message,
      data
    }
    
    execution.logs.push(log)
    
    if (level === 'error') {
      console.error(`[Workflow ${execution.workflowId}] ${message}`, data)
    }
  }

  private async notifyStepFailure(
    step: WorkflowStep,
    execution: WorkflowExecution,
    error: string
  ): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId)!
    
    if (workflow.settings.failureRecipients.length > 0) {
      this.emit('notification_requested', {
        recipients: workflow.settings.failureRecipients,
        title: `Workflow Step Failed: ${step.name}`,
        message: `Step "${step.name}" in workflow "${workflow.name}" failed with error: ${error}`,
        type: 'error',
        actionUrl: `/workflows/executions/${execution.id}`
      })
    }
  }

  private parseWorkflowSuggestion(aiResponse: string): {
    suggestion: Partial<WorkflowDefinition>
    confidence: number
    reasoning: string
  } {
    try {
      const parsed = JSON.parse(aiResponse)
      
      return {
        suggestion: parsed.workflow || {},
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'AI suggestion generated'
      }
    } catch {
      return {
        suggestion: {},
        confidence: 0,
        reasoning: 'Failed to parse AI suggestion'
      }
    }
  }

  private calculateStepPerformance(executions: WorkflowExecution[]): StepPerformance[] {
    const stepStats: Map<string, {
      name: string
      times: number[]
      successes: number
      failures: number
      errors: string[]
    }> = new Map()

    executions.forEach(execution => {
      execution.stepResults.forEach(result => {
        if (!stepStats.has(result.stepId)) {
          stepStats.set(result.stepId, {
            name: result.stepId,
            times: [],
            successes: 0,
            failures: 0,
            errors: []
          })
        }

        const stats = stepStats.get(result.stepId)!
        
        if (result.duration) {
          stats.times.push(result.duration)
        }

        if (result.status === 'completed') {
          stats.successes++
        } else if (result.status === 'failed') {
          stats.failures++
          if (result.error) {
            stats.errors.push(result.error)
          }
        }
      })
    })

    return Array.from(stepStats.entries()).map(([stepId, stats]) => ({
      stepId,
      stepName: stats.name,
      averageExecutionTime: stats.times.length > 0 
        ? stats.times.reduce((sum, time) => sum + time, 0) / stats.times.length 
        : 0,
      successRate: (stats.successes + stats.failures) > 0 
        ? (stats.successes / (stats.successes + stats.failures)) * 100 
        : 0,
      mostCommonErrors: this.getMostCommonErrors(stats.errors)
    }))
  }

  private identifyFailurePoints(failedExecutions: WorkflowExecution[]): FailurePoint[] {
    const failureStats: Map<string, {
      name: string
      failures: number
      errors: string[]
    }> = new Map()

    failedExecutions.forEach(execution => {
      execution.stepResults
        .filter(result => result.status === 'failed')
        .forEach(result => {
          if (!failureStats.has(result.stepId)) {
            failureStats.set(result.stepId, {
              name: result.stepId,
              failures: 0,
              errors: []
            })
          }

          const stats = failureStats.get(result.stepId)!
          stats.failures++
          if (result.error) {
            stats.errors.push(result.error)
          }
        })
    })

    return Array.from(failureStats.entries())
      .map(([stepId, stats]) => ({
        stepId,
        stepName: stats.name,
        failureRate: stats.failures,
        commonErrors: this.getMostCommonErrors(stats.errors),
        suggestedFixes: [] // Could be enhanced with AI suggestions
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
  }

  private calculateAverageExecutionTime(executions: WorkflowExecution[]): number {
    const completedExecutions = executions.filter(e => e.duration)
    
    if (completedExecutions.length === 0) return 0
    
    return completedExecutions.reduce((sum, exec) => sum + exec.duration!, 0) / completedExecutions.length
  }

  private getMostCommonErrors(errors: string[]): string[] {
    const errorCounts = new Map<string, number>()
    
    errors.forEach(error => {
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1)
    })
    
    return Array.from(errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error)
  }
}