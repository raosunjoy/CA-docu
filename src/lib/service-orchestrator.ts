// Zetra Platform - Service Orchestrator
// Intelligent routing and load balancing for AI and backend services

import { unifiedDataLayer } from './unified/data-layer'
import { AnalyticsEngine } from './analytics-engine'

export interface ServiceConfig {
  id: string
  name: string
  type: 'ai' | 'analytics' | 'document' | 'email' | 'task' | 'client'
  endpoint: string
  healthCheck: string
  priority: number
  maxConcurrency: number
  timeout: number
  retryAttempts: number
  circuitBreakerThreshold: number
  isActive: boolean
  metadata: Record<string, any>
}

export interface ServiceMetrics {
  serviceId: string
  requestCount: number
  successCount: number
  errorCount: number
  averageResponseTime: number
  lastHealthCheck: Date
  status: 'healthy' | 'degraded' | 'unhealthy'
  circuitBreakerOpen: boolean
}

export interface ServiceRequest {
  id: string
  serviceType: string
  operation: string
  payload: any
  priority: 'low' | 'medium' | 'high' | 'critical'
  timeout?: number
  retryPolicy?: {
    maxAttempts: number
    backoffMultiplier: number
    maxDelay: number
  }
}

export interface ServiceResponse {
  requestId: string
  serviceId: string
  success: boolean
  data?: any
  error?: string
  responseTime: number
  timestamp: Date
  metadata?: Record<string, any>
}

export class ServiceOrchestrator {
  private services: Map<string, ServiceConfig> = new Map()
  private metrics: Map<string, ServiceMetrics> = new Map()
  private circuitBreakers: Map<string, { failures: number; lastFailure: Date; isOpen: boolean }> = new Map()
  private requestQueue: ServiceRequest[] = []
  private activeRequests: Map<string, Promise<ServiceResponse>> = new Map()

  constructor() {
    this.initializeDefaultServices()
    this.startHealthCheckInterval()
    this.startMetricsCollection()
  }

  // Service Registration and Discovery
  registerService(config: ServiceConfig): void {
    this.services.set(config.id, config)
    this.metrics.set(config.id, {
      serviceId: config.id,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastHealthCheck: new Date(),
      status: 'healthy',
      circuitBreakerOpen: false
    })
    this.circuitBreakers.set(config.id, {
      failures: 0,
      lastFailure: new Date(0),
      isOpen: false
    })
    console.log(`✅ Service registered: ${config.name} (${config.id})`)
  }

  unregisterService(serviceId: string): void {
    this.services.delete(serviceId)
    this.metrics.delete(serviceId)
    this.circuitBreakers.delete(serviceId)
    console.log(`❌ Service unregistered: ${serviceId}`)
  }

  getService(serviceId: string): ServiceConfig | undefined {
    return this.services.get(serviceId)
  }

  getServicesByType(type: string): ServiceConfig[] {
    return Array.from(this.services.values()).filter(service => service.type === type)
  }

  // Intelligent Service Selection
  selectBestService(serviceType: string, operation: string): ServiceConfig | null {
    const candidates = this.getServicesByType(serviceType)
      .filter(service => service.isActive)
      .filter(service => !this.isCircuitBreakerOpen(service.id))

    if (candidates.length === 0) {
      console.warn(`No available services for type: ${serviceType}`)
      return null
    }

    // Sort by priority and performance metrics
    candidates.sort((a, b) => {
      const metricsA = this.metrics.get(a.id)!
      const metricsB = this.metrics.get(b.id)!
      
      // Primary: Priority (higher is better)
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      
      // Secondary: Success rate (higher is better)
      const successRateA = metricsA.requestCount > 0 ? metricsA.successCount / metricsA.requestCount : 1
      const successRateB = metricsB.requestCount > 0 ? metricsB.successCount / metricsB.requestCount : 1
      
      if (successRateA !== successRateB) {
        return successRateB - successRateA
      }
      
      // Tertiary: Response time (lower is better)
      return metricsA.averageResponseTime - metricsB.averageResponseTime
    })

    return candidates[0]
  }

  // Request Processing
  async processRequest(request: ServiceRequest): Promise<ServiceResponse> {
    const startTime = Date.now()
    
    try {
      // Select best service for the request
      const service = this.selectBestService(request.serviceType, request.operation)
      if (!service) {
        throw new Error(`No available service for type: ${request.serviceType}`)
      }

      // Check if we're already processing this request
      if (this.activeRequests.has(request.id)) {
        return await this.activeRequests.get(request.id)!
      }

      // Create and track the request promise
      const requestPromise = this.executeRequest(service, request)
      this.activeRequests.set(request.id, requestPromise)

      try {
        const response = await requestPromise
        this.recordSuccess(service.id, Date.now() - startTime)
        return response
      } finally {
        this.activeRequests.delete(request.id)
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        requestId: request.id,
        serviceId: 'unknown',
        success: false,
        error: errorMessage,
        responseTime,
        timestamp: new Date()
      }
    }
  }

  private async executeRequest(service: ServiceConfig, request: ServiceRequest): Promise<ServiceResponse> {
    const startTime = Date.now()
    
    try {
      // Route to appropriate service handler
      let result: any
      
      switch (service.type) {
        case 'ai':
          result = await this.handleAIRequest(service, request)
          break
        case 'analytics':
          result = await this.handleAnalyticsRequest(service, request)
          break
        case 'document':
          result = await this.handleDocumentRequest(service, request)
          break
        case 'email':
          result = await this.handleEmailRequest(service, request)
          break
        case 'task':
          result = await this.handleTaskRequest(service, request)
          break
        case 'client':
          result = await this.handleClientRequest(service, request)
          break
        default:
          throw new Error(`Unsupported service type: ${service.type}`)
      }

      return {
        requestId: request.id,
        serviceId: service.id,
        success: true,
        data: result,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      }

    } catch (error) {
      this.recordFailure(service.id, Date.now() - startTime)
      throw error
    }
  }

  // Service-specific handlers
  private async handleAIRequest(service: ServiceConfig, request: ServiceRequest): Promise<any> {
    switch (request.operation) {
      case 'analyze_document':
        return await this.analyzeDocument(request.payload)
      case 'categorize_email':
        return await this.categorizeEmail(request.payload)
      case 'generate_insights':
        return await this.generateInsights(request.payload)
      case 'extract_data':
        return await this.extractData(request.payload)
      default:
        throw new Error(`Unsupported AI operation: ${request.operation}`)
    }
  }

  private async handleAnalyticsRequest(service: ServiceConfig, request: ServiceRequest): Promise<any> {
    switch (request.operation) {
      case 'calculate_kpi':
        return await AnalyticsEngine.calculateKPI(
          request.payload.organizationId,
          request.payload.kpiType,
          request.payload.userId,
          request.payload.role
        )
      case 'get_performance_analytics':
        return await AnalyticsEngine.getPerformanceAnalytics(
          request.payload.organizationId,
          request.payload.userId,
          request.payload.role,
          request.payload.period,
          request.payload.startDate,
          request.payload.endDate
        )
      case 'get_compliance_metrics':
        return await AnalyticsEngine.getComplianceMetrics(
          request.payload.organizationId,
          request.payload.role
        )
      default:
        throw new Error(`Unsupported analytics operation: ${request.operation}`)
    }
  }

  private async handleDocumentRequest(service: ServiceConfig, request: ServiceRequest): Promise<any> {
    switch (request.operation) {
      case 'store_bronze':
        return await unifiedDataLayer.ingestRawData(
          request.payload.source,
          request.payload.data,
          request.payload.metadata
        )
      case 'promote_to_silver':
        return await unifiedDataLayer.promoteToSilver(
          request.payload.bronzeId,
          request.payload.cleaningRules
        )
      case 'search_documents':
        return await unifiedDataLayer.queryData(request.payload.query)
      default:
        throw new Error(`Unsupported document operation: ${request.operation}`)
    }
  }

  private async handleEmailRequest(service: ServiceConfig, request: ServiceRequest): Promise<any> {
    // Mock email service operations
    switch (request.operation) {
      case 'sync_emails':
        return { synced: 25, errors: 0, duration: 1200 }
      case 'send_email':
        return { messageId: 'msg_' + Math.random().toString(36).substr(2, 9), sent: true }
      case 'search_emails':
        return { results: [], total: 0 }
      default:
        throw new Error(`Unsupported email operation: ${request.operation}`)
    }
  }

  private async handleTaskRequest(service: ServiceConfig, request: ServiceRequest): Promise<any> {
    // Mock task service operations
    switch (request.operation) {
      case 'create_task':
        return { 
          id: 'task_' + Math.random().toString(36).substr(2, 9),
          ...request.payload,
          createdAt: new Date()
        }
      case 'update_task':
        return { ...request.payload, updatedAt: new Date() }
      case 'search_tasks':
        return { results: [], total: 0 }
      default:
        throw new Error(`Unsupported task operation: ${request.operation}`)
    }
  }

  private async handleClientRequest(service: ServiceConfig, request: ServiceRequest): Promise<any> {
    // Mock client service operations
    switch (request.operation) {
      case 'create_client':
        return {
          id: 'client_' + Math.random().toString(36).substr(2, 9),
          ...request.payload,
          createdAt: new Date()
        }
      case 'search_clients':
        return { results: [], total: 0 }
      case 'get_analytics':
        return { totalClients: 150, activeEngagements: 45, revenue: 2500000 }
      default:
        throw new Error(`Unsupported client operation: ${request.operation}`)
    }
  }

  // AI Service Implementations
  private async analyzeDocument(payload: any): Promise<any> {
    // Simulate AI document analysis
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    return {
      documentType: 'Invoice',
      confidence: 0.92,
      extractedData: {
        amount: '$2,450.00',
        vendor: 'ABC Supplies Inc.',
        invoiceNumber: 'INV-2024-001',
        dueDate: '2024-02-15'
      },
      suggestedTags: ['Invoice', 'Financial', 'Accounts Payable'],
      riskLevel: 'low'
    }
  }

  private async categorizeEmail(payload: any): Promise<any> {
    // Simulate AI email categorization
    await new Promise(resolve => setTimeout(resolve, 800))
    
    return {
      categories: [
        { name: 'client-request', confidence: 0.88 },
        { name: 'urgent', confidence: 0.75 }
      ],
      priority: 'high',
      suggestedActions: ['create_task', 'notify_manager'],
      estimatedResponseTime: '2 hours'
    }
  }

  private async generateInsights(payload: any): Promise<any> {
    // Simulate AI insight generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return {
      insights: [
        'Client satisfaction has improved by 15% this quarter',
        'Task completion rate is 8% above target',
        'Revenue per client has increased by 12%'
      ],
      recommendations: [
        'Consider expanding services to high-value clients',
        'Implement automated follow-up for overdue tasks'
      ],
      confidence: 0.85
    }
  }

  private async extractData(payload: any): Promise<any> {
    // Simulate AI data extraction
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    return {
      extractedFields: {
        companyName: 'Tech Corp Inc.',
        registrationNumber: 'U72900DL2020PTC123456',
        address: '123 Business Park, New Delhi',
        contactPerson: 'John Smith',
        email: 'john@techcorp.com'
      },
      confidence: 0.91,
      fieldsFound: 5,
      totalFields: 8
    }
  }

  // Circuit Breaker Implementation
  private isCircuitBreakerOpen(serviceId: string): boolean {
    const breaker = this.circuitBreakers.get(serviceId)
    if (!breaker) return false

    const service = this.services.get(serviceId)
    if (!service) return true

    // Check if circuit breaker should be opened
    if (breaker.failures >= service.circuitBreakerThreshold) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure.getTime()
      const cooldownPeriod = 60000 // 1 minute

      if (timeSinceLastFailure < cooldownPeriod) {
        breaker.isOpen = true
        return true
      } else {
        // Reset circuit breaker after cooldown
        breaker.failures = 0
        breaker.isOpen = false
        return false
      }
    }

    return breaker.isOpen
  }

  private recordSuccess(serviceId: string, responseTime: number): void {
    const metrics = this.metrics.get(serviceId)
    if (!metrics) return

    metrics.requestCount++
    metrics.successCount++
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.requestCount - 1)) + responseTime
    ) / metrics.requestCount
    metrics.status = 'healthy'

    // Reset circuit breaker on success
    const breaker = this.circuitBreakers.get(serviceId)
    if (breaker) {
      breaker.failures = Math.max(0, breaker.failures - 1)
      breaker.isOpen = false
    }
  }

  private recordFailure(serviceId: string, responseTime: number): void {
    const metrics = this.metrics.get(serviceId)
    if (!metrics) return

    metrics.requestCount++
    metrics.errorCount++
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.requestCount - 1)) + responseTime
    ) / metrics.requestCount

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(serviceId)
    if (breaker) {
      breaker.failures++
      breaker.lastFailure = new Date()
    }

    // Update service status
    const errorRate = metrics.errorCount / metrics.requestCount
    if (errorRate > 0.5) {
      metrics.status = 'unhealthy'
    } else if (errorRate > 0.2) {
      metrics.status = 'degraded'
    }
  }

  // Health Monitoring
  private async performHealthCheck(service: ServiceConfig): Promise<boolean> {
    try {
      // Simulate health check
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Mock health check logic
      const isHealthy = Math.random() > 0.05 // 95% success rate
      
      const metrics = this.metrics.get(service.id)
      if (metrics) {
        metrics.lastHealthCheck = new Date()
        if (isHealthy) {
          metrics.status = 'healthy'
        } else {
          metrics.status = 'unhealthy'
        }
      }

      return isHealthy
    } catch (error) {
      console.error(`Health check failed for service ${service.id}:`, error)
      return false
    }
  }

  private startHealthCheckInterval(): void {
    setInterval(async () => {
      for (const service of this.services.values()) {
        if (service.isActive) {
          await this.performHealthCheck(service)
        }
      }
    }, 30000) // Every 30 seconds
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Store metrics to data layer
      for (const [serviceId, metrics] of this.metrics.entries()) {
        unifiedDataLayer.storeTimeSeriesData({
          timestamp: new Date(),
          metric: `service.${serviceId}.requests`,
          value: metrics.requestCount,
          tags: { serviceId, type: 'requests' },
          tier: 'silver'
        })

        unifiedDataLayer.storeTimeSeriesData({
          timestamp: new Date(),
          metric: `service.${serviceId}.response_time`,
          value: metrics.averageResponseTime,
          tags: { serviceId, type: 'performance' },
          tier: 'silver'
        })
      }
    }, 60000) // Every minute
  }

  // Service Management
  getServiceMetrics(serviceId?: string): ServiceMetrics[] {
    if (serviceId) {
      const metrics = this.metrics.get(serviceId)
      return metrics ? [metrics] : []
    }
    return Array.from(this.metrics.values())
  }

  getServiceHealth(): { healthy: number; degraded: number; unhealthy: number } {
    const metrics = Array.from(this.metrics.values())
    return {
      healthy: metrics.filter(m => m.status === 'healthy').length,
      degraded: metrics.filter(m => m.status === 'degraded').length,
      unhealthy: metrics.filter(m => m.status === 'unhealthy').length
    }
  }

  // Initialize default services
  private initializeDefaultServices(): void {
    const defaultServices: ServiceConfig[] = [
      {
        id: 'ai-document-analyzer',
        name: 'AI Document Analyzer',
        type: 'ai',
        endpoint: '/api/ai/document-analysis',
        healthCheck: '/api/ai/health',
        priority: 10,
        maxConcurrency: 5,
        timeout: 30000,
        retryAttempts: 3,
        circuitBreakerThreshold: 5,
        isActive: true,
        metadata: { version: '1.0', capabilities: ['ocr', 'classification', 'extraction'] }
      },
      {
        id: 'ai-email-categorizer',
        name: 'AI Email Categorizer',
        type: 'ai',
        endpoint: '/api/ai/email-categorization',
        healthCheck: '/api/ai/health',
        priority: 8,
        maxConcurrency: 10,
        timeout: 10000,
        retryAttempts: 2,
        circuitBreakerThreshold: 3,
        isActive: true,
        metadata: { version: '1.0', capabilities: ['categorization', 'sentiment', 'priority'] }
      },
      {
        id: 'analytics-engine',
        name: 'Analytics Engine',
        type: 'analytics',
        endpoint: '/api/analytics',
        healthCheck: '/api/analytics/health',
        priority: 7,
        maxConcurrency: 8,
        timeout: 15000,
        retryAttempts: 2,
        circuitBreakerThreshold: 4,
        isActive: true,
        metadata: { version: '1.0', capabilities: ['kpi', 'reporting', 'forecasting'] }
      },
      {
        id: 'document-service',
        name: 'Document Management Service',
        type: 'document',
        endpoint: '/api/documents',
        healthCheck: '/api/documents/health',
        priority: 9,
        maxConcurrency: 15,
        timeout: 20000,
        retryAttempts: 3,
        circuitBreakerThreshold: 5,
        isActive: true,
        metadata: { version: '1.0', capabilities: ['storage', 'versioning', 'search'] }
      },
      {
        id: 'email-service',
        name: 'Email Integration Service',
        type: 'email',
        endpoint: '/api/emails',
        healthCheck: '/api/emails/health',
        priority: 6,
        maxConcurrency: 12,
        timeout: 25000,
        retryAttempts: 3,
        circuitBreakerThreshold: 4,
        isActive: true,
        metadata: { version: '1.0', capabilities: ['sync', 'send', 'search'] }
      }
    ]

    defaultServices.forEach(service => this.registerService(service))
    console.log(`✅ Service Orchestrator initialized with ${defaultServices.length} services`)
  }

  // Cleanup
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Service Orchestrator...')
    
    // Wait for active requests to complete
    const activePromises = Array.from(this.activeRequests.values())
    if (activePromises.length > 0) {
      console.log(`⏳ Waiting for ${activePromises.length} active requests to complete...`)
      await Promise.allSettled(activePromises)
    }

    // Clear all data
    this.services.clear()
    this.metrics.clear()
    this.circuitBreakers.clear()
    this.requestQueue.length = 0
    this.activeRequests.clear()

    console.log('✅ Service Orchestrator shutdown complete')
  }
}

// Export singleton instance
export const serviceOrchestrator = new ServiceOrchestrator()

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await serviceOrchestrator.shutdown()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    await serviceOrchestrator.shutdown()
    process.exit(0)
  })
}