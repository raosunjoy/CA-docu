import { EventEmitter } from 'events'

export interface DataModule {
  id: string
  name: string
  version: string
  endpoints: ModuleEndpoint[]
  schemas: DataSchema[]
  dependencies: string[]
  capabilities: ModuleCapability[]
  status: 'active' | 'inactive' | 'error'
}

export interface ModuleEndpoint {
  id: string
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  description: string
  parameters: EndpointParameter[]
  response: ResponseSchema
  authentication: boolean
  rateLimit?: RateLimitConfig
}

export interface EndpointParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  validation?: ValidationRule[]
}

export interface ResponseSchema {
  type: string
  properties: Record<string, SchemaProperty>
  examples?: any[]
}

export interface SchemaProperty {
  type: string
  description: string
  format?: string
  enum?: any[]
}

export interface ValidationRule {
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom'
  value: any
  message?: string
}

export interface RateLimitConfig {
  requests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
}

export interface ModuleCapability {
  type: 'read' | 'write' | 'compute' | 'notify' | 'transform'
  resources: string[]
  permissions: string[]
}

export interface DataSchema {
  id: string
  name: string
  version: string
  type: 'entity' | 'event' | 'aggregate' | 'view'
  fields: SchemaField[]
  relationships: SchemaRelationship[]
  indexes: SchemaIndex[]
  constraints: SchemaConstraint[]
}

export interface SchemaField {
  name: string
  type: string
  required: boolean
  unique?: boolean
  description: string
  format?: string
  validation?: ValidationRule[]
}

export interface SchemaRelationship {
  name: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
  targetSchema: string
  foreignKey: string
  cascade?: boolean
}

export interface SchemaIndex {
  name: string
  fields: string[]
  unique: boolean
  type: 'btree' | 'hash' | 'gist' | 'gin'
}

export interface SchemaConstraint {
  name: string
  type: 'check' | 'unique' | 'foreign_key' | 'not_null'
  definition: string
}

export interface DataFlow {
  id: string
  name: string
  source: DataFlowNode
  target: DataFlowNode
  transformations: DataTransformation[]
  triggers: FlowTrigger[]
  status: 'active' | 'paused' | 'error'
  lastRun?: Date
  nextRun?: Date
}

export interface DataFlowNode {
  moduleId: string
  endpointId: string
  parameters: Record<string, any>
  filters?: DataFilter[]
}

export interface DataTransformation {
  id: string
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'compute' | 'validate'
  configuration: TransformationConfig
  order: number
}

export interface TransformationConfig {
  rules: TransformationRule[]
  errorHandling: 'skip' | 'fail' | 'default'
  outputSchema?: string
}

export interface TransformationRule {
  field: string
  operation: string
  parameters: Record<string, any>
  condition?: string
}

export interface FlowTrigger {
  type: 'schedule' | 'event' | 'webhook' | 'manual'
  configuration: TriggerConfig
}

export interface TriggerConfig {
  expression?: string // cron for schedule, event name for event
  conditions?: TriggerCondition[]
  retries?: number
  timeout?: number
}

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'
  value: any
}

export interface DataFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between' | 'like'
  value: any
}

export interface IntegrationEvent {
  id: string
  type: string
  source: string
  timestamp: Date
  payload: any
  metadata: EventMetadata
  processed: boolean
}

export interface EventMetadata {
  correlationId?: string
  causationId?: string
  userId?: string
  organizationId?: string
  version?: string
}

export interface DataQuality {
  score: number
  checks: QualityCheck[]
  issues: QualityIssue[]
  lastAssessment: Date
}

export interface QualityCheck {
  name: string
  type: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity'
  passed: boolean
  score: number
  threshold: number
}

export interface QualityIssue {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  field?: string
  count: number
  examples: any[]
}

export interface IntegrationMetrics {
  totalModules: number
  activeFlows: number
  eventsProcessed: number
  errorRate: number
  averageLatency: number
  dataQualityScore: number
  throughputPerMinute: number
}

export class CrossModuleDataIntegration extends EventEmitter {
  private modules: Map<string, DataModule> = new Map()
  private dataFlows: Map<string, DataFlow> = new Map()
  private schemas: Map<string, DataSchema> = new Map()
  private eventQueue: IntegrationEvent[] = []
  private metrics: IntegrationMetrics
  private isProcessing = false

  constructor() {
    super()
    this.metrics = {
      totalModules: 0,
      activeFlows: 0,
      eventsProcessed: 0,
      errorRate: 0,
      averageLatency: 0,
      dataQualityScore: 0,
      throughputPerMinute: 0
    }
    
    this.initializeCoreModules()
    this.startEventProcessor()
  }

  /**
   * Registers a new data module
   */
  registerModule(module: DataModule): void {
    // Validate module configuration
    this.validateModule(module)
    
    // Register schemas
    module.schemas.forEach(schema => {
      this.schemas.set(schema.id, schema)
    })
    
    // Store module
    this.modules.set(module.id, module)
    this.metrics.totalModules++
    
    this.emit('module_registered', module)
  }

  /**
   * Creates a data flow between modules
   */
  createDataFlow(
    name: string,
    source: DataFlowNode,
    target: DataFlowNode,
    transformations: DataTransformation[] = [],
    triggers: FlowTrigger[] = []
  ): string {
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Validate source and target
    this.validateFlowNodes(source, target)
    
    const dataFlow: DataFlow = {
      id: flowId,
      name,
      source,
      target,
      transformations: transformations.sort((a, b) => a.order - b.order),
      triggers,
      status: 'active'
    }
    
    this.dataFlows.set(flowId, dataFlow)
    this.metrics.activeFlows++
    
    // Schedule flow if it has time-based triggers
    this.scheduleFlow(dataFlow)
    
    this.emit('flow_created', dataFlow)
    return flowId
  }

  /**
   * Executes a data flow
   */
  async executeFlow(flowId: string, context: Record<string, any> = {}): Promise<any> {
    const flow = this.dataFlows.get(flowId)
    if (!flow) {
      throw new Error(`Data flow ${flowId} not found`)
    }

    if (flow.status !== 'active') {
      throw new Error(`Data flow ${flowId} is not active`)
    }

    const startTime = Date.now()
    
    try {
      // Fetch data from source
      const sourceData = await this.fetchFromNode(flow.source, context)
      
      // Apply transformations
      let transformedData = sourceData
      for (const transformation of flow.transformations) {
        transformedData = await this.applyTransformation(transformedData, transformation)
      }
      
      // Send data to target
      const result = await this.sendToNode(flow.target, transformedData, context)
      
      // Update metrics
      const executionTime = Date.now() - startTime
      this.updateFlowMetrics(flowId, executionTime, true)
      
      flow.lastRun = new Date()
      this.emit('flow_executed', { flowId, executionTime, dataSize: this.getDataSize(result) })
      
      return result
    } catch (error) {
      flow.status = 'error'
      this.updateFlowMetrics(flowId, Date.now() - startTime, false)
      this.emit('flow_error', { flowId, error })
      throw error
    }
  }

  /**
   * Queries data across multiple modules
   */
  async queryData(query: CrossModuleQuery): Promise<any> {
    const results: Record<string, any> = {}
    
    try {
      // Execute queries in parallel where possible
      const queryPromises = query.sources.map(async source => {
        const module = this.modules.get(source.moduleId)
        if (!module) {
          throw new Error(`Module ${source.moduleId} not found`)
        }
        
        const data = await this.executeModuleQuery(module, source.query, source.parameters)
        return { sourceId: source.id, data }
      })
      
      const queryResults = await Promise.all(queryPromises)
      
      // Organize results by source
      queryResults.forEach(result => {
        results[result.sourceId] = result.data
      })
      
      // Apply cross-module joins and aggregations
      if (query.joins && query.joins.length > 0) {
        return this.applyJoins(results, query.joins)
      }
      
      // Apply aggregations
      if (query.aggregations && query.aggregations.length > 0) {
        return this.applyAggregations(results, query.aggregations)
      }
      
      return results
    } catch (error) {
      this.emit('query_error', { query, error })
      throw error
    }
  }

  /**
   * Validates data quality across modules
   */
  async validateDataQuality(moduleId: string, schemaId: string, data: any[]): Promise<DataQuality> {
    const schema = this.schemas.get(schemaId)
    if (!schema) {
      throw new Error(`Schema ${schemaId} not found`)
    }

    const checks: QualityCheck[] = []
    const issues: QualityIssue[] = []
    
    // Completeness check
    const completenessCheck = this.checkCompleteness(data, schema)
    checks.push(completenessCheck)
    if (!completenessCheck.passed) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: 'Missing required fields detected',
        count: data.length - Math.floor(data.length * completenessCheck.score / 100),
        examples: []
      })
    }
    
    // Validity check
    const validityCheck = this.checkValidity(data, schema)
    checks.push(validityCheck)
    if (!validityCheck.passed) {
      issues.push({
        type: 'validity',
        severity: 'high',
        description: 'Invalid data format detected',
        count: Math.floor(data.length * (1 - validityCheck.score / 100)),
        examples: []
      })
    }
    
    // Consistency check
    const consistencyCheck = this.checkConsistency(data, schema)
    checks.push(consistencyCheck)
    
    const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length
    
    return {
      score: overallScore,
      checks,
      issues,
      lastAssessment: new Date()
    }
  }

  /**
   * Publishes an integration event
   */
  publishEvent(
    type: string,
    source: string,
    payload: any,
    metadata: Partial<EventMetadata> = {}
  ): void {
    const event: IntegrationEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      timestamp: new Date(),
      payload,
      metadata: {
        correlationId: metadata.correlationId || this.generateCorrelationId(),
        causationId: metadata.causationId,
        userId: metadata.userId,
        organizationId: metadata.organizationId,
        version: metadata.version || '1.0'
      },
      processed: false
    }
    
    this.eventQueue.push(event)
    this.emit('event_published', event)
  }

  /**
   * Gets integration metrics
   */
  getMetrics(): IntegrationMetrics {
    return { ...this.metrics }
  }

  /**
   * Gets available modules
   */
  getModules(): DataModule[] {
    return Array.from(this.modules.values())
  }

  /**
   * Gets active data flows
   */
  getDataFlows(): DataFlow[] {
    return Array.from(this.dataFlows.values())
  }

  /**
   * Gets registered schemas
   */
  getSchemas(): DataSchema[] {
    return Array.from(this.schemas.values())
  }

  /**
   * Private helper methods
   */
  private initializeCoreModules(): void {
    // Register core CA firm modules
    const coreModules: DataModule[] = [
      {
        id: 'tasks',
        name: 'Task Management',
        version: '1.0',
        endpoints: [
          {
            id: 'get_tasks',
            path: '/api/tasks',
            method: 'GET',
            description: 'Get tasks with filters',
            parameters: [
              {
                name: 'userId',
                type: 'string',
                required: false,
                description: 'Filter by user ID'
              },
              {
                name: 'status',
                type: 'string',
                required: false,
                description: 'Filter by status'
              }
            ],
            response: {
              type: 'object',
              properties: {
                tasks: { type: 'array', description: 'List of tasks' },
                total: { type: 'number', description: 'Total count' }
              }
            },
            authentication: true
          }
        ],
        schemas: [
          {
            id: 'task',
            name: 'Task',
            version: '1.0',
            type: 'entity',
            fields: [
              { name: 'id', type: 'string', required: true, description: 'Task ID' },
              { name: 'title', type: 'string', required: true, description: 'Task title' },
              { name: 'status', type: 'string', required: true, description: 'Task status' },
              { name: 'assignedTo', type: 'string', required: false, description: 'Assigned user ID' }
            ],
            relationships: [],
            indexes: [{ name: 'idx_status', fields: ['status'], unique: false, type: 'btree' }],
            constraints: []
          }
        ],
        dependencies: [],
        capabilities: [
          {
            type: 'read',
            resources: ['tasks'],
            permissions: ['read:tasks']
          },
          {
            type: 'write',
            resources: ['tasks'],
            permissions: ['write:tasks']
          }
        ],
        status: 'active'
      },
      {
        id: 'documents',
        name: 'Document Management',
        version: '1.0',
        endpoints: [
          {
            id: 'get_documents',
            path: '/api/documents',
            method: 'GET',
            description: 'Get documents with filters',
            parameters: [
              {
                name: 'type',
                type: 'string',
                required: false,
                description: 'Document type filter'
              }
            ],
            response: {
              type: 'object',
              properties: {
                documents: { type: 'array', description: 'List of documents' }
              }
            },
            authentication: true
          }
        ],
        schemas: [
          {
            id: 'document',
            name: 'Document',
            version: '1.0',
            type: 'entity',
            fields: [
              { name: 'id', type: 'string', required: true, description: 'Document ID' },
              { name: 'name', type: 'string', required: true, description: 'Document name' },
              { name: 'type', type: 'string', required: true, description: 'Document type' }
            ],
            relationships: [],
            indexes: [],
            constraints: []
          }
        ],
        dependencies: [],
        capabilities: [
          {
            type: 'read',
            resources: ['documents'],
            permissions: ['read:documents']
          }
        ],
        status: 'active'
      }
    ]

    coreModules.forEach(module => {
      this.registerModule(module)
    })
  }

  private validateModule(module: DataModule): void {
    if (!module.id || !module.name || !module.version) {
      throw new Error('Module must have id, name, and version')
    }

    // Validate endpoints
    module.endpoints.forEach(endpoint => {
      if (!endpoint.id || !endpoint.path || !endpoint.method) {
        throw new Error(`Endpoint in module ${module.id} must have id, path, and method`)
      }
    })

    // Validate schemas
    module.schemas.forEach(schema => {
      if (!schema.id || !schema.name || !schema.fields) {
        throw new Error(`Schema in module ${module.id} must have id, name, and fields`)
      }
    })
  }

  private validateFlowNodes(source: DataFlowNode, target: DataFlowNode): void {
    const sourceModule = this.modules.get(source.moduleId)
    const targetModule = this.modules.get(target.moduleId)

    if (!sourceModule) {
      throw new Error(`Source module ${source.moduleId} not found`)
    }

    if (!targetModule) {
      throw new Error(`Target module ${target.moduleId} not found`)
    }

    const sourceEndpoint = sourceModule.endpoints.find(e => e.id === source.endpointId)
    const targetEndpoint = targetModule.endpoints.find(e => e.id === target.endpointId)

    if (!sourceEndpoint) {
      throw new Error(`Source endpoint ${source.endpointId} not found`)
    }

    if (!targetEndpoint) {
      throw new Error(`Target endpoint ${target.endpointId} not found`)
    }
  }

  private scheduleFlow(flow: DataFlow): void {
    const scheduleTrigglers = flow.triggers.filter(t => t.type === 'schedule')
    
    scheduleTrigglers.forEach(trigger => {
      if (trigger.configuration.expression) {
        // In production, use a proper cron library
        const nextRun = new Date(Date.now() + 3600000) // Default 1 hour
        flow.nextRun = nextRun
        
        setTimeout(() => {
          this.executeFlow(flow.id).catch(error => {
            console.error(`Scheduled flow ${flow.id} failed:`, error)
          })
        }, nextRun.getTime() - Date.now())
      }
    })
  }

  private async fetchFromNode(node: DataFlowNode, context: Record<string, any>): Promise<any> {
    const module = this.modules.get(node.moduleId)
    if (!module) {
      throw new Error(`Module ${node.moduleId} not found`)
    }

    const endpoint = module.endpoints.find(e => e.id === node.endpointId)
    if (!endpoint) {
      throw new Error(`Endpoint ${node.endpointId} not found`)
    }

    // Simulate API call - in production, make actual HTTP requests
    return this.simulateAPICall(endpoint, { ...node.parameters, ...context })
  }

  private async sendToNode(node: DataFlowNode, data: any, context: Record<string, any>): Promise<any> {
    const module = this.modules.get(node.moduleId)
    if (!module) {
      throw new Error(`Module ${node.moduleId} not found`)
    }

    const endpoint = module.endpoints.find(e => e.id === node.endpointId)
    if (!endpoint) {
      throw new Error(`Endpoint ${node.endpointId} not found`)
    }

    // Simulate sending data - in production, make actual HTTP requests
    return this.simulateAPICall(endpoint, { data, ...node.parameters, ...context })
  }

  private async applyTransformation(data: any, transformation: DataTransformation): Promise<any> {
    switch (transformation.type) {
      case 'map':
        return this.mapData(data, transformation.configuration)
      case 'filter':
        return this.filterData(data, transformation.configuration)
      case 'aggregate':
        return this.aggregateData(data, transformation.configuration)
      case 'join':
        return this.joinData(data, transformation.configuration)
      case 'compute':
        return this.computeData(data, transformation.configuration)
      case 'validate':
        return this.validateData(data, transformation.configuration)
      default:
        return data
    }
  }

  private mapData(data: any, config: TransformationConfig): any {
    if (!Array.isArray(data)) return data
    
    return data.map(item => {
      const mapped: any = {}
      config.rules.forEach(rule => {
        mapped[rule.field] = this.applyMappingRule(item, rule)
      })
      return mapped
    })
  }

  private filterData(data: any, config: TransformationConfig): any {
    if (!Array.isArray(data)) return data
    
    return data.filter(item => {
      return config.rules.every(rule => this.evaluateFilterRule(item, rule))
    })
  }

  private aggregateData(data: any, config: TransformationConfig): any {
    if (!Array.isArray(data)) return data
    
    // Simple aggregation implementation
    const result: any = {}
    config.rules.forEach(rule => {
      switch (rule.operation) {
        case 'count':
          result[rule.field] = data.length
          break
        case 'sum':
          result[rule.field] = data.reduce((sum, item) => sum + (item[rule.field] || 0), 0)
          break
        case 'avg':
          result[rule.field] = data.reduce((sum, item) => sum + (item[rule.field] || 0), 0) / data.length
          break
      }
    })
    
    return result
  }

  private joinData(data: any, config: TransformationConfig): any {
    // Join implementation placeholder
    return data
  }

  private computeData(data: any, config: TransformationConfig): any {
    // Computation implementation placeholder
    return data
  }

  private validateData(data: any, config: TransformationConfig): any {
    // Validation implementation placeholder
    return data
  }

  private applyMappingRule(item: any, rule: TransformationRule): any {
    switch (rule.operation) {
      case 'copy':
        return item[rule.parameters.sourceField || rule.field]
      case 'transform':
        return this.transformValue(item[rule.field], rule.parameters.transformation)
      case 'combine':
        return rule.parameters.fields.map((f: string) => item[f]).join(rule.parameters.separator || ' ')
      default:
        return item[rule.field]
    }
  }

  private evaluateFilterRule(item: any, rule: TransformationRule): boolean {
    const value = item[rule.field]
    const compareValue = rule.parameters.value
    
    switch (rule.operation) {
      case 'equals':
        return value === compareValue
      case 'not_equals':
        return value !== compareValue
      case 'greater_than':
        return value > compareValue
      case 'less_than':
        return value < compareValue
      case 'contains':
        return String(value).includes(compareValue)
      default:
        return true
    }
  }

  private transformValue(value: any, transformation: string): any {
    switch (transformation) {
      case 'uppercase':
        return String(value).toUpperCase()
      case 'lowercase':
        return String(value).toLowerCase()
      case 'trim':
        return String(value).trim()
      case 'number':
        return Number(value)
      default:
        return value
    }
  }

  private async executeModuleQuery(module: DataModule, query: string, parameters: any): Promise<any> {
    // Simulate module query execution
    return this.simulateAPICall(module.endpoints[0], parameters)
  }

  private async simulateAPICall(endpoint: ModuleEndpoint, parameters: any): Promise<any> {
    // Simulate API response based on endpoint
    await new Promise(resolve => setTimeout(resolve, 10)) // Simulate latency
    
    switch (endpoint.id) {
      case 'get_tasks':
        return {
          tasks: [
            { id: '1', title: 'Review audit documents', status: 'in_progress' },
            { id: '2', title: 'Prepare tax return', status: 'pending' }
          ],
          total: 2
        }
      case 'get_documents':
        return {
          documents: [
            { id: '1', name: 'Financial Statement 2024', type: 'PDF' },
            { id: '2', name: 'Tax Return Draft', type: 'EXCEL' }
          ]
        }
      default:
        return { success: true, data: parameters }
    }
  }

  private checkCompleteness(data: any[], schema: DataSchema): QualityCheck {
    const requiredFields = schema.fields.filter(f => f.required).map(f => f.name)
    let completeRecords = 0
    
    data.forEach(record => {
      const hasAllRequired = requiredFields.every(field => 
        record[field] !== null && record[field] !== undefined && record[field] !== ''
      )
      if (hasAllRequired) completeRecords++
    })
    
    const score = data.length > 0 ? (completeRecords / data.length) * 100 : 100
    
    return {
      name: 'completeness',
      type: 'completeness',
      passed: score >= 95,
      score,
      threshold: 95
    }
  }

  private checkValidity(data: any[], schema: DataSchema): QualityCheck {
    let validRecords = 0
    
    data.forEach(record => {
      let isValid = true
      
      schema.fields.forEach(field => {
        const value = record[field.name]
        if (value !== null && value !== undefined) {
          if (!this.validateFieldType(value, field.type)) {
            isValid = false
          }
        }
      })
      
      if (isValid) validRecords++
    })
    
    const score = data.length > 0 ? (validRecords / data.length) * 100 : 100
    
    return {
      name: 'validity',
      type: 'validity',
      passed: score >= 90,
      score,
      threshold: 90
    }
  }

  private checkConsistency(data: any[], schema: DataSchema): QualityCheck {
    // Simple consistency check - could be expanded
    const score = 95 // Placeholder
    
    return {
      name: 'consistency',
      type: 'consistency',
      passed: score >= 90,
      score,
      threshold: 90
    }
  }

  private validateFieldType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return typeof value === 'object' && value !== null
      case 'array':
        return Array.isArray(value)
      default:
        return true
    }
  }

  private applyJoins(results: Record<string, any>, joins: any[]): any {
    // Join implementation placeholder
    return results
  }

  private applyAggregations(results: Record<string, any>, aggregations: any[]): any {
    // Aggregation implementation placeholder
    return results
  }

  private updateFlowMetrics(flowId: string, executionTime: number, success: boolean): void {
    // Update latency
    this.metrics.averageLatency = (this.metrics.averageLatency + executionTime) / 2
    
    // Update error rate
    this.metrics.eventsProcessed++
    if (!success) {
      this.metrics.errorRate = (this.metrics.errorRate + 1) / this.metrics.eventsProcessed
    }
  }

  private getDataSize(data: any): number {
    return JSON.stringify(data).length
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startEventProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        this.processEvents()
      }
    }, 1000)
  }

  private async processEvents(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    const batchSize = 10
    const eventsToProcess = this.eventQueue.splice(0, batchSize)
    
    try {
      for (const event of eventsToProcess) {
        await this.processEvent(event)
        event.processed = true
        this.metrics.eventsProcessed++
      }
    } catch (error) {
      console.error('Error processing events:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processEvent(event: IntegrationEvent): Promise<void> {
    this.emit('event_processed', event)
    
    // Find flows triggered by this event
    const triggeredFlows = Array.from(this.dataFlows.values()).filter(flow => 
      flow.triggers.some(trigger => 
        trigger.type === 'event' && 
        trigger.configuration.expression === event.type
      )
    )
    
    // Execute triggered flows
    for (const flow of triggeredFlows) {
      try {
        await this.executeFlow(flow.id, { event })
      } catch (error) {
        console.error(`Event-triggered flow ${flow.id} failed:`, error)
      }
    }
  }
}

export interface CrossModuleQuery {
  id: string
  name: string
  sources: QuerySource[]
  joins?: QueryJoin[]
  aggregations?: QueryAggregation[]
  filters?: QueryFilter[]
}

export interface QuerySource {
  id: string
  moduleId: string
  query: string
  parameters: Record<string, any>
}

export interface QueryJoin {
  leftSource: string
  rightSource: string
  leftField: string
  rightField: string
  type: 'inner' | 'left' | 'right' | 'full'
}

export interface QueryAggregation {
  field: string
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  groupBy?: string[]
}

export interface QueryFilter {
  source: string
  field: string
  operator: string
  value: any
}