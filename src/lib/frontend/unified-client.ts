import { UserRole } from '../unified/api-gateway'

export interface UnifiedSystemStatus {
  timestamp: string
  version: string
  phase: string
  status: string
  serviceOrchestrator: {
    totalServices: number
    serviceStatus: Record<string, { healthy: boolean; activeRequests: number; queueLength: number }>
    aiServices: number
    analyticsServices: number
    hybridServices: number
  }
  dataLayer: {
    status: string
    tiers: string[]
    stores: string[]
  }
  monitoring: {
    totalServices: number
    healthyServices: number
    activeAlerts: number
    totalRequests: number
    avgResponseTime: number
    errorRate: number
  }
  dependencies: {
    valid: boolean
    issues: string[]
  }
  apiGateway: {
    status: string
    securityEnabled: boolean
    rateLimitingEnabled: boolean
    auditLoggingEnabled: boolean
  }
  capabilities: Record<string, boolean>
  implementation: Record<string, string>
}

export interface ServiceRequest {
  serviceName: string
  data: unknown
  context?: {
    priority?: 'low' | 'normal' | 'high' | 'critical'
    metadata?: Record<string, unknown>
  }
}

export interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requestId: string
  executionTime: number
}

export class UnifiedFrontendClient {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string): void {
    this.authToken = token
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // System Status Methods
  async getSystemStatus(): Promise<UnifiedSystemStatus> {
    return this.makeRequest<UnifiedSystemStatus>('/unified/status')
  }

  async getServiceHealth(serviceName?: string): Promise<Record<string, { healthy: boolean; activeRequests: number; queueLength: number }> | { healthy: boolean; activeRequests: number; queueLength: number }> {
    const endpoint = serviceName 
      ? `/unified/health/${serviceName}`
      : '/unified/health'
    return this.makeRequest(endpoint)
  }

  // AI Service Methods
  async processDocument(data: {
    content: string
    type: string
    metadata?: Record<string, unknown>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/ai/document', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async generateTaskIntelligence(data: {
    context: string
    requirements: string[]
    priority?: string
    metadata?: Record<string, unknown>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/ai/task', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async chatWithAI(data: {
    message: string
    context?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async runQualityAssurance(data: {
    workItem: unknown
    checkTypes: string[]
    standards?: Record<string, unknown>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/ai/quality', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Analytics Service Methods
  async getPerformanceAnalytics(filters?: {
    dateRange?: { start: string; end: string }
    team?: string
    metric?: string
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams()
    if (filters?.dateRange) {
      queryParams.set('startDate', filters.dateRange.start)
      queryParams.set('endDate', filters.dateRange.end)
    }
    if (filters?.team) queryParams.set('team', filters.team)
    if (filters?.metric) queryParams.set('metric', filters.metric)

    const endpoint = `/unified/gateway/analytics/performance${queryParams.toString() ? `?${queryParams}` : ''}`
    return this.makeRequest(endpoint)
  }

  async getClientAnalytics(filters?: {
    clientId?: string
    dateRange?: { start: string; end: string }
    analysisType?: string
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams()
    if (filters?.clientId) queryParams.set('clientId', filters.clientId)
    if (filters?.dateRange) {
      queryParams.set('startDate', filters.dateRange.start)
      queryParams.set('endDate', filters.dateRange.end)
    }
    if (filters?.analysisType) queryParams.set('type', filters.analysisType)

    const endpoint = `/unified/gateway/analytics/client${queryParams.toString() ? `?${queryParams}` : ''}`
    return this.makeRequest(endpoint)
  }

  async getComplianceAnalytics(filters?: {
    dateRange?: { start: string; end: string }
    complianceType?: string
    riskLevel?: string
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams()
    if (filters?.dateRange) {
      queryParams.set('startDate', filters.dateRange.start)
      queryParams.set('endDate', filters.dateRange.end)
    }
    if (filters?.complianceType) queryParams.set('type', filters.complianceType)
    if (filters?.riskLevel) queryParams.set('risk', filters.riskLevel)

    const endpoint = `/unified/gateway/analytics/compliance${queryParams.toString() ? `?${queryParams}` : ''}`
    return this.makeRequest(endpoint)
  }

  async getFinancialAnalytics(filters?: {
    dateRange?: { start: string; end: string }
    analysisType?: string
    clientId?: string
  }): Promise<ServiceResponse> {
    const queryParams = new URLSearchParams()
    if (filters?.dateRange) {
      queryParams.set('startDate', filters.dateRange.start)
      queryParams.set('endDate', filters.dateRange.end)
    }
    if (filters?.analysisType) queryParams.set('type', filters.analysisType)
    if (filters?.clientId) queryParams.set('clientId', filters.clientId)

    const endpoint = `/unified/gateway/analytics/financial${queryParams.toString() ? `?${queryParams}` : ''}`
    return this.makeRequest(endpoint)
  }

  // Hybrid Service Methods
  async generateUnifiedInsights(data: {
    dataSources: string[]
    analysisType: string
    context: Record<string, unknown>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/hybrid/insights', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async generateIntelligentReport(data: {
    reportType: string
    dataSources: string[]
    audience: UserRole
    parameters: Record<string, unknown>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/hybrid/reporting', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getPredictiveIntelligence(data: {
    predictionType: string
    historicalData: unknown[]
    context: Record<string, unknown>
  }): Promise<ServiceResponse> {
    return this.makeRequest('/unified/gateway/hybrid/predictive', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // Data Layer Methods
  async ingestData(data: {
    source: string
    payload: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): Promise<{ recordId: string }> {
    return this.makeRequest('/unified/data/ingest', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async queryData(query: {
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
    source?: string
    dateRange?: { start: string; end: string }
    tags?: string[]
    limit?: number
    offset?: number
  }): Promise<{ results: unknown[]; total: number }> {
    return this.makeRequest('/unified/data/query', {
      method: 'POST',
      body: JSON.stringify(query)
    })
  }

  async searchVectors(query: {
    embedding?: number[]
    content?: string
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
    limit?: number
  }): Promise<{ results: Array<{ data: unknown; similarity: number }> }> {
    return this.makeRequest('/unified/data/vectors/search', {
      method: 'POST',
      body: JSON.stringify(query)
    })
  }

  // Monitoring Methods
  async getMetrics(filters?: {
    metric?: string
    timeRange?: { start: string; end: string }
    tags?: Record<string, string>
  }): Promise<{
    metrics: Array<{ timestamp: string; value: number; tags: Record<string, string> }>
  }> {
    const queryParams = new URLSearchParams()
    if (filters?.metric) queryParams.set('metric', filters.metric)
    if (filters?.timeRange) {
      queryParams.set('startTime', filters.timeRange.start)
      queryParams.set('endTime', filters.timeRange.end)
    }
    if (filters?.tags) {
      Object.entries(filters.tags).forEach(([key, value]) => {
        queryParams.set(`tag_${key}`, value)
      })
    }

    const endpoint = `/unified/metrics${queryParams.toString() ? `?${queryParams}` : ''}`
    return this.makeRequest(endpoint)
  }

  async getLogs(filters?: {
    service?: string
    level?: 'info' | 'warn' | 'error' | 'debug'
    timeRange?: { start: string; end: string }
    limit?: number
  }): Promise<{
    logs: Array<{
      timestamp: string
      level: string
      service: string
      message: string
      metadata?: Record<string, unknown>
    }>
  }> {
    const queryParams = new URLSearchParams()
    if (filters?.service) queryParams.set('service', filters.service)
    if (filters?.level) queryParams.set('level', filters.level)
    if (filters?.timeRange) {
      queryParams.set('startTime', filters.timeRange.start)
      queryParams.set('endTime', filters.timeRange.end)
    }
    if (filters?.limit) queryParams.set('limit', filters.limit.toString())

    const endpoint = `/unified/logs${queryParams.toString() ? `?${queryParams}` : ''}`
    return this.makeRequest(endpoint)
  }

  async getAlerts(resolved = false): Promise<{
    alerts: Array<{
      id: string
      service: string
      severity: string
      message: string
      timestamp: string
      resolved: boolean
    }>
  }> {
    const endpoint = `/unified/alerts${resolved ? '?resolved=true' : ''}`
    return this.makeRequest(endpoint)
  }

  // Authentication-aware methods
  async initializeForUser(user: { id: string; role: UserRole; token: string }): Promise<void> {
    this.setAuthToken(user.token)
    
    // Pre-fetch user-specific data based on role
    try {
      await this.getSystemStatus()
      
      // Role-specific initialization
      switch (user.role) {
        case 'PARTNER':
          // Pre-load partner-level analytics
          await Promise.all([
            this.getPerformanceAnalytics(),
            this.getComplianceAnalytics(),
            this.getFinancialAnalytics()
          ])
          break
        case 'MANAGER':
          // Pre-load manager-level data
          await Promise.all([
            this.getPerformanceAnalytics(),
            this.getClientAnalytics()
          ])
          break
        case 'ASSOCIATE':
        case 'INTERN':
          // Pre-load basic dashboard data
          await this.getPerformanceAnalytics({ team: user.id })
          break
      }
    } catch (error) {
      console.warn('Non-critical initialization error:', error)
    }
  }

  // Real-time subscriptions (WebSocket-like functionality)
  subscribeToSystemStatus(callback: (status: UnifiedSystemStatus) => void): () => void {
    const interval = setInterval(async () => {
      try {
        const status = await this.getSystemStatus()
        callback(status)
      } catch (error) {
        console.error('System status subscription error:', error)
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }

  subscribeToMetrics(metricName: string, callback: (metrics: unknown[]) => void): () => void {
    const interval = setInterval(async () => {
      try {
        const result = await this.getMetrics({ metric: metricName })
        callback(result.metrics)
      } catch (error) {
        console.error(`Metrics subscription error for ${metricName}:`, error)
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }
}

// Singleton instance
export const unifiedClient = new UnifiedFrontendClient()