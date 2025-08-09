import { EventEmitter } from 'events'

export interface ServiceDefinition {
  name: string
  type: 'ai' | 'analytics' | 'hybrid'
  version: string
  healthCheckEndpoint: string
  baseUrl: string
  priority: number
  capabilities: string[]
  dependencies: string[]
  maxConcurrentRequests: number
  timeout: number
  retryAttempts: number
}

export interface ServiceRegistry {
  [serviceName: string]: ServiceDefinition
}

export interface RequestContext {
  requestId: string
  userId: string
  sessionId: string
  timestamp: Date
  priority: 'low' | 'normal' | 'high' | 'critical'
  metadata: Record<string, unknown>
}

export interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  serviceName: string
  executionTime: number
  requestId: string
}

export class UnifiedServiceOrchestrator extends EventEmitter {
  private services: ServiceRegistry = {}
  private requestQueue: Map<string, RequestContext[]> = new Map()
  private activeRequests: Map<string, number> = new Map()
  private healthStatus: Map<string, boolean> = new Map()
  
  constructor() {
    super()
    this.startHealthMonitoring()
  }

  registerService(service: ServiceDefinition): void {
    this.services[service.name] = service
    this.activeRequests.set(service.name, 0)
    this.healthStatus.set(service.name, true)
    this.requestQueue.set(service.name, [])
    
    this.emit('serviceRegistered', service)
    console.log(`Service registered: ${service.name} (${service.type})`)
  }

  async routeRequest<T>(
    serviceName: string,
    request: unknown,
    context: RequestContext
  ): Promise<ServiceResponse<T>> {
    const service = this.services[serviceName]
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`)
    }

    if (!this.healthStatus.get(serviceName)) {
      throw new Error(`Service unhealthy: ${serviceName}`)
    }

    if (this.getActiveRequestCount(serviceName) >= service.maxConcurrentRequests) {
      await this.queueRequest(serviceName, context)
    }

    return this.executeRequest<T>(service, request, context)
  }

  private async executeRequest<T>(
    service: ServiceDefinition,
    request: unknown,
    context: RequestContext
  ): Promise<ServiceResponse<T>> {
    const startTime = Date.now()
    this.incrementActiveRequests(service.name)

    try {
      const response = await this.makeServiceCall<T>(service, request, context)
      const executionTime = Date.now() - startTime
      
      this.emit('requestCompleted', {
        serviceName: service.name,
        requestId: context.requestId,
        executionTime,
        success: true
      })

      return {
        success: true,
        data: response,
        serviceName: service.name,
        executionTime,
        requestId: context.requestId
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      
      this.emit('requestFailed', {
        serviceName: service.name,
        requestId: context.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        serviceName: service.name,
        executionTime,
        requestId: context.requestId
      }
    } finally {
      this.decrementActiveRequests(service.name)
      this.processQueue(service.name)
    }
  }

  private async makeServiceCall<T>(
    service: ServiceDefinition,
    request: unknown,
    context: RequestContext
  ): Promise<T> {
    // Simulated service call - in real implementation, this would make HTTP requests
    await new Promise(resolve => setTimeout(resolve, 100))
    return request as T
  }

  private async queueRequest(serviceName: string, context: RequestContext): Promise<void> {
    const queue = this.requestQueue.get(serviceName) || []
    queue.push(context)
    this.requestQueue.set(serviceName, queue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }))

    return new Promise((resolve) => {
      const checkQueue = () => {
        const currentQueue = this.requestQueue.get(serviceName) || []
        const index = currentQueue.findIndex(req => req.requestId === context.requestId)
        if (index === -1) {
          resolve()
        } else {
          setTimeout(checkQueue, 100)
        }
      }
      checkQueue()
    })
  }

  private processQueue(serviceName: string): void {
    const service = this.services[serviceName]
    const queue = this.requestQueue.get(serviceName) || []
    
    if (queue.length > 0 && this.getActiveRequestCount(serviceName) < service.maxConcurrentRequests) {
      const nextRequest = queue.shift()
      if (nextRequest) {
        this.requestQueue.set(serviceName, queue)
      }
    }
  }

  private getActiveRequestCount(serviceName: string): number {
    return this.activeRequests.get(serviceName) || 0
  }

  private incrementActiveRequests(serviceName: string): void {
    const current = this.activeRequests.get(serviceName) || 0
    this.activeRequests.set(serviceName, current + 1)
  }

  private decrementActiveRequests(serviceName: string): void {
    const current = this.activeRequests.get(serviceName) || 0
    this.activeRequests.set(serviceName, Math.max(0, current - 1))
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkServicesHealth()
    }, 30000) // Check every 30 seconds
  }

  private async checkServicesHealth(): Promise<void> {
    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        // Simulated health check - in real implementation, this would ping the service
        const isHealthy = Math.random() > 0.1 // 90% uptime simulation
        this.healthStatus.set(serviceName, isHealthy)
        
        if (!isHealthy) {
          this.emit('serviceUnhealthy', { serviceName, service })
        }
      } catch (error) {
        this.healthStatus.set(serviceName, false)
        this.emit('serviceUnhealthy', { 
          serviceName, 
          service, 
          error: error instanceof Error ? error.message : 'Health check failed' 
        })
      }
    }
  }

  getServiceStatus(): Record<string, { 
    healthy: boolean
    activeRequests: number
    queueLength: number
  }> {
    const status: Record<string, { healthy: boolean; activeRequests: number; queueLength: number }> = {}
    
    for (const serviceName of Object.keys(this.services)) {
      status[serviceName] = {
        healthy: this.healthStatus.get(serviceName) || false,
        activeRequests: this.activeRequests.get(serviceName) || 0,
        queueLength: (this.requestQueue.get(serviceName) || []).length
      }
    }
    
    return status
  }

  discoverServices(): ServiceDefinition[] {
    return Object.values(this.services)
  }

  async gracefulShutdown(): Promise<void> {
    this.emit('shutdownStarted')
    
    // Wait for active requests to complete
    while (Array.from(this.activeRequests.values()).some(count => count > 0)) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    this.emit('shutdownCompleted')
  }
}

export const serviceOrchestrator = new UnifiedServiceOrchestrator()