/**
 * Load Balancer and Health Check Service
 * Implements load balancing, health checks, and failover capabilities
 */

import { EventEmitter } from 'events'
import http from 'http'
import https from 'https'

// Server Instance Configuration
interface ServerInstance {
  id: string
  host: string
  port: number
  protocol: 'http' | 'https'
  weight: number
  maxConnections: number
  currentConnections: number
  isHealthy: boolean
  lastHealthCheck: Date
  responseTime: number
  errorCount: number
  metadata: Record<string, any>
}

// Load Balancing Strategies
type LoadBalancingStrategy = 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'ip-hash' | 'random'

// Health Check Configuration
interface HealthCheckConfig {
  enabled: boolean
  interval: number // milliseconds
  timeout: number // milliseconds
  retries: number
  path: string
  expectedStatus: number[]
  expectedResponse?: string
  headers?: Record<string, string>
}

// Load Balancer Configuration
interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy
  healthCheck: HealthCheckConfig
  failover: {
    enabled: boolean
    maxFailures: number
    recoveryTime: number // milliseconds
  }
  sticky: {
    enabled: boolean
    cookieName: string
    ttl: number
  }
  rateLimit: {
    enabled: boolean
    maxRequestsPerMinute: number
    windowSize: number
  }
}

// Request Context
interface RequestContext {
  id: string
  clientIP: string
  userAgent?: string
  sessionId?: string
  timestamp: Date
  headers: Record<string, string>
}

// Load Balancer Metrics
interface LoadBalancerMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  activeConnections: number
  serverMetrics: Map<string, {
    requests: number
    errors: number
    responseTime: number
    uptime: number
  }>
}

class LoadBalancerService extends EventEmitter {
  private servers: Map<string, ServerInstance> = new Map()
  private config: LoadBalancerConfig
  private currentIndex: number = 0
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map()
  private metrics: LoadBalancerMetrics
  private stickySessionMap: Map<string, string> = new Map()
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map()

  constructor(config: LoadBalancerConfig) {
    super()
    this.config = config
    this.initializeMetrics()
    this.startHealthChecks()
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      serverMetrics: new Map()
    }
  }

  // Server Management
  addServer(server: Omit<ServerInstance, 'currentConnections' | 'isHealthy' | 'lastHealthCheck' | 'responseTime' | 'errorCount'>): void {
    const serverInstance: ServerInstance = {
      ...server,
      currentConnections: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorCount: 0
    }

    this.servers.set(server.id, serverInstance)
    this.metrics.serverMetrics.set(server.id, {
      requests: 0,
      errors: 0,
      responseTime: 0,
      uptime: 100
    })

    if (this.config.healthCheck.enabled) {
      this.startHealthCheckForServer(server.id)
    }

    this.emit('serverAdded', serverInstance)
  }

  removeServer(serverId: string): void {
    const server = this.servers.get(serverId)
    if (server) {
      this.servers.delete(serverId)
      this.metrics.serverMetrics.delete(serverId)
      
      const interval = this.healthCheckIntervals.get(serverId)
      if (interval) {
        clearInterval(interval)
        this.healthCheckIntervals.delete(serverId)
      }

      this.emit('serverRemoved', server)
    }
  }

  updateServerWeight(serverId: string, weight: number): void {
    const server = this.servers.get(serverId)
    if (server) {
      server.weight = weight
      this.emit('serverUpdated', server)
    }
  }

  // Load Balancing
  async selectServer(context: RequestContext): Promise<ServerInstance | null> {
    // Apply rate limiting
    if (this.config.rateLimit.enabled && !this.checkRateLimit(context.clientIP)) {
      throw new Error('Rate limit exceeded')
    }

    // Get healthy servers
    const healthyServers = Array.from(this.servers.values()).filter(server => server.isHealthy)
    
    if (healthyServers.length === 0) {
      this.emit('noHealthyServers')
      return null
    }

    // Check for sticky sessions
    if (this.config.sticky.enabled && context.sessionId) {
      const stickyServerId = this.stickySessionMap.get(context.sessionId)
      if (stickyServerId) {
        const stickyServer = this.servers.get(stickyServerId)
        if (stickyServer && stickyServer.isHealthy) {
          return stickyServer
        }
      }
    }

    // Select server based on strategy
    let selectedServer: ServerInstance | null = null

    switch (this.config.strategy) {
      case 'round-robin':
        selectedServer = this.selectRoundRobin(healthyServers)
        break
      
      case 'weighted-round-robin':
        selectedServer = this.selectWeightedRoundRobin(healthyServers)
        break
      
      case 'least-connections':
        selectedServer = this.selectLeastConnections(healthyServers)
        break
      
      case 'ip-hash':
        selectedServer = this.selectIPHash(healthyServers, context.clientIP)
        break
      
      case 'random':
        selectedServer = this.selectRandom(healthyServers)
        break
      
      default:
        selectedServer = this.selectRoundRobin(healthyServers)
    }

    // Update sticky session mapping
    if (selectedServer && this.config.sticky.enabled && context.sessionId) {
      this.stickySessionMap.set(context.sessionId, selectedServer.id)
      
      // Clean up expired sticky sessions
      setTimeout(() => {
        this.stickySessionMap.delete(context.sessionId!)
      }, this.config.sticky.ttl)
    }

    return selectedServer
  }

  private selectRoundRobin(servers: ServerInstance[]): ServerInstance {
    const server = servers[this.currentIndex % servers.length]
    this.currentIndex = (this.currentIndex + 1) % servers.length
    return server
  }

  private selectWeightedRoundRobin(servers: ServerInstance[]): ServerInstance {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0)
    let randomWeight = Math.random() * totalWeight
    
    for (const server of servers) {
      randomWeight -= server.weight
      if (randomWeight <= 0) {
        return server
      }
    }
    
    return servers[0] // Fallback
  }

  private selectLeastConnections(servers: ServerInstance[]): ServerInstance {
    return servers.reduce((min, server) => 
      server.currentConnections < min.currentConnections ? server : min
    )
  }

  private selectIPHash(servers: ServerInstance[], clientIP: string): ServerInstance {
    const hash = this.hashString(clientIP)
    const index = hash % servers.length
    return servers[index]
  }

  private selectRandom(servers: ServerInstance[]): ServerInstance {
    const index = Math.floor(Math.random() * servers.length)
    return servers[index]
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  // Health Checks
  private startHealthChecks(): void {
    if (!this.config.healthCheck.enabled) return

    for (const serverId of this.servers.keys()) {
      this.startHealthCheckForServer(serverId)
    }
  }

  private startHealthCheckForServer(serverId: string): void {
    const interval = setInterval(async () => {
      await this.performHealthCheck(serverId)
    }, this.config.healthCheck.interval)

    this.healthCheckIntervals.set(serverId, interval)
  }

  private async performHealthCheck(serverId: string): Promise<void> {
    const server = this.servers.get(serverId)
    if (!server) return

    const startTime = Date.now()
    let isHealthy = false
    let responseTime = 0

    try {
      const url = `${server.protocol}://${server.host}:${server.port}${this.config.healthCheck.path}`
      
      const response = await this.makeHealthCheckRequest(url)
      responseTime = Date.now() - startTime
      
      isHealthy = this.config.healthCheck.expectedStatus.includes(response.statusCode)
      
      if (this.config.healthCheck.expectedResponse) {
        isHealthy = isHealthy && response.body.includes(this.config.healthCheck.expectedResponse)
      }

      if (isHealthy) {
        server.errorCount = 0
      }

    } catch (error) {
      server.errorCount++
      responseTime = Date.now() - startTime
      
      console.error(`Health check failed for server ${serverId}:`, error)
    }

    // Update server status
    const wasHealthy = server.isHealthy
    server.isHealthy = isHealthy && server.errorCount < this.config.failover.maxFailures
    server.lastHealthCheck = new Date()
    server.responseTime = responseTime

    // Emit events for status changes
    if (wasHealthy && !server.isHealthy) {
      this.emit('serverUnhealthy', server)
    } else if (!wasHealthy && server.isHealthy) {
      this.emit('serverHealthy', server)
    }

    // Update metrics
    const serverMetrics = this.metrics.serverMetrics.get(serverId)
    if (serverMetrics) {
      serverMetrics.responseTime = responseTime
      serverMetrics.uptime = server.isHealthy ? 100 : 0
      if (!isHealthy) {
        serverMetrics.errors++
      }
    }
  }

  private async makeHealthCheckRequest(url: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'))
      }, this.config.healthCheck.timeout)

      const req = client.get(url, {
        headers: this.config.healthCheck.headers || {},
        timeout: this.config.healthCheck.timeout
      }, (res) => {
        clearTimeout(timeout)
        
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            body
          })
        })
      })

      req.on('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })

      req.on('timeout', () => {
        clearTimeout(timeout)
        req.destroy()
        reject(new Error('Health check timeout'))
      })
    })
  }

  // Rate Limiting
  private checkRateLimit(clientIP: string): boolean {
    const now = Date.now()
    const windowStart = now - this.config.rateLimit.windowSize
    
    let rateLimitData = this.rateLimitMap.get(clientIP)
    
    if (!rateLimitData || rateLimitData.resetTime < windowStart) {
      rateLimitData = { count: 0, resetTime: now + this.config.rateLimit.windowSize }
      this.rateLimitMap.set(clientIP, rateLimitData)
    }

    rateLimitData.count++
    
    return rateLimitData.count <= this.config.rateLimit.maxRequestsPerMinute
  }

  // Connection Management
  incrementConnections(serverId: string): void {
    const server = this.servers.get(serverId)
    if (server) {
      server.currentConnections++
      this.metrics.activeConnections++
    }
  }

  decrementConnections(serverId: string): void {
    const server = this.servers.get(serverId)
    if (server && server.currentConnections > 0) {
      server.currentConnections--
      this.metrics.activeConnections--
    }
  }

  // Request Tracking
  recordRequest(serverId: string, responseTime: number, success: boolean): void {
    this.metrics.totalRequests++
    
    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.totalRequests

    // Update server metrics
    const serverMetrics = this.metrics.serverMetrics.get(serverId)
    if (serverMetrics) {
      serverMetrics.requests++
      if (!success) {
        serverMetrics.errors++
      }
      
      // Update server average response time
      const serverTotalResponseTime = serverMetrics.responseTime * (serverMetrics.requests - 1) + responseTime
      serverMetrics.responseTime = serverTotalResponseTime / serverMetrics.requests
    }
  }

  // Metrics and Monitoring
  getMetrics(): LoadBalancerMetrics {
    return { ...this.metrics }
  }

  getServerStatus(): ServerInstance[] {
    return Array.from(this.servers.values())
  }

  getHealthyServers(): ServerInstance[] {
    return Array.from(this.servers.values()).filter(server => server.isHealthy)
  }

  getUnhealthyServers(): ServerInstance[] {
    return Array.from(this.servers.values()).filter(server => !server.isHealthy)
  }

  // Auto-scaling Integration
  async checkScalingNeeds(): Promise<{
    scaleUp: boolean
    scaleDown: boolean
    reason: string
    metrics: any
  }> {
    const healthyServers = this.getHealthyServers()
    const totalConnections = healthyServers.reduce((sum, server) => sum + server.currentConnections, 0)
    const totalCapacity = healthyServers.reduce((sum, server) => sum + server.maxConnections, 0)
    
    const utilizationRate = totalCapacity > 0 ? totalConnections / totalCapacity : 0
    const averageResponseTime = this.metrics.averageResponseTime
    const errorRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0

    let scaleUp = false
    let scaleDown = false
    let reason = ''

    // Scale up conditions
    if (utilizationRate > 0.8) {
      scaleUp = true
      reason = 'High utilization rate'
    } else if (averageResponseTime > 2000) {
      scaleUp = true
      reason = 'High response time'
    } else if (errorRate > 0.05) {
      scaleUp = true
      reason = 'High error rate'
    }

    // Scale down conditions
    if (!scaleUp && utilizationRate < 0.3 && healthyServers.length > 1) {
      scaleDown = true
      reason = 'Low utilization rate'
    }

    return {
      scaleUp,
      scaleDown,
      reason,
      metrics: {
        utilizationRate,
        averageResponseTime,
        errorRate,
        healthyServers: healthyServers.length,
        totalConnections
      }
    }
  }

  // Cleanup
  cleanup(): void {
    // Clear all health check intervals
    for (const interval of this.healthCheckIntervals.values()) {
      clearInterval(interval)
    }
    this.healthCheckIntervals.clear()

    // Clear rate limit map
    this.rateLimitMap.clear()

    // Clear sticky session map
    this.stickySessionMap.clear()

    // Remove all event listeners
    this.removeAllListeners()
  }
}

// Auto-scaling Manager
class AutoScalingManager {
  private loadBalancer: LoadBalancerService
  private scalingConfig: {
    minInstances: number
    maxInstances: number
    scaleUpThreshold: number
    scaleDownThreshold: number
    cooldownPeriod: number
  }
  private lastScalingAction: Date = new Date(0)

  constructor(
    loadBalancer: LoadBalancerService,
    scalingConfig: {
      minInstances: number
      maxInstances: number
      scaleUpThreshold: number
      scaleDownThreshold: number
      cooldownPeriod: number
    }
  ) {
    this.loadBalancer = loadBalancer
    this.scalingConfig = scalingConfig
  }

  async evaluateScaling(): Promise<{
    action: 'scale-up' | 'scale-down' | 'none'
    reason: string
    newInstanceCount?: number
  }> {
    const now = new Date()
    const timeSinceLastAction = now.getTime() - this.lastScalingAction.getTime()
    
    // Check cooldown period
    if (timeSinceLastAction < this.scalingConfig.cooldownPeriod) {
      return { action: 'none', reason: 'Cooldown period active' }
    }

    const scalingNeeds = await this.loadBalancer.checkScalingNeeds()
    const currentInstances = this.loadBalancer.getHealthyServers().length

    if (scalingNeeds.scaleUp && currentInstances < this.scalingConfig.maxInstances) {
      this.lastScalingAction = now
      return {
        action: 'scale-up',
        reason: scalingNeeds.reason,
        newInstanceCount: Math.min(currentInstances + 1, this.scalingConfig.maxInstances)
      }
    }

    if (scalingNeeds.scaleDown && currentInstances > this.scalingConfig.minInstances) {
      this.lastScalingAction = now
      return {
        action: 'scale-down',
        reason: scalingNeeds.reason,
        newInstanceCount: Math.max(currentInstances - 1, this.scalingConfig.minInstances)
      }
    }

    return { action: 'none', reason: 'No scaling needed' }
  }
}

export {
  LoadBalancerService,
  AutoScalingManager,
  ServerInstance,
  LoadBalancerConfig,
  HealthCheckConfig,
  RequestContext,
  LoadBalancerMetrics
}