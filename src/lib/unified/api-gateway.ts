import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { serviceOrchestrator } from './service-orchestrator'
import { unifiedMonitoring } from './monitoring'

export type UserRole = 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN' | 'ADMIN' | 'CLIENT'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  permissions: string[]
  sessionId: string
  tokenVersion: number
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface SecurityPolicy {
  requireAuth: boolean
  allowedRoles: UserRole[]
  requiredPermissions: string[]
  rateLimit?: RateLimitConfig
  auditLog: boolean
  encryptResponse?: boolean
}

export interface RouteMapping {
  pattern: string
  serviceName: string
  method: string
  security: SecurityPolicy
  transformRequest?: (request: any) => any
  transformResponse?: (response: any) => any
}

export class UnifiedAPIGateway {
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map()
  private auditLog: Array<{
    timestamp: Date
    userId?: string
    path: string
    method: string
    statusCode: number
    responseTime: number
    userAgent?: string
    ip?: string
  }> = []

  private routes: RouteMapping[] = [
    // AI Service Routes
    {
      pattern: '/api/ai/document',
      serviceName: 'document-intelligence',
      method: 'POST',
      security: {
        requireAuth: true,
        allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE'],
        requiredPermissions: ['document:process'],
        rateLimit: { windowMs: 60000, maxRequests: 30 },
        auditLog: true
      }
    },
    {
      pattern: '/api/ai/task',
      serviceName: 'task-intelligence',
      method: 'POST',
      security: {
        requireAuth: true,
        allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE'],
        requiredPermissions: ['task:create', 'task:update'],
        rateLimit: { windowMs: 60000, maxRequests: 50 },
        auditLog: true
      }
    },
    {
      pattern: '/api/ai/chat',
      serviceName: 'conversational-ai',
      method: 'POST',
      security: {
        requireAuth: true,
        allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE', 'INTERN'],
        requiredPermissions: ['chat:use'],
        rateLimit: { windowMs: 60000, maxRequests: 100 },
        auditLog: false
      }
    },
    // Analytics Service Routes
    {
      pattern: '/api/analytics/performance',
      serviceName: 'performance-analytics',
      method: 'GET',
      security: {
        requireAuth: true,
        allowedRoles: ['PARTNER', 'MANAGER'],
        requiredPermissions: ['analytics:view'],
        rateLimit: { windowMs: 60000, maxRequests: 20 },
        auditLog: true
      }
    },
    {
      pattern: '/api/analytics/client',
      serviceName: 'client-analytics',
      method: 'GET',
      security: {
        requireAuth: true,
        allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE'],
        requiredPermissions: ['client:view', 'analytics:view'],
        rateLimit: { windowMs: 60000, maxRequests: 25 },
        auditLog: true
      }
    },
    // Hybrid Service Routes
    {
      pattern: '/api/hybrid/insights',
      serviceName: 'insight-fusion',
      method: 'POST',
      security: {
        requireAuth: true,
        allowedRoles: ['PARTNER', 'MANAGER'],
        requiredPermissions: ['insights:generate'],
        rateLimit: { windowMs: 300000, maxRequests: 10 }, // 10 requests per 5 minutes
        auditLog: true,
        encryptResponse: true
      }
    }
  ]

  async handleRequest(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now()
    const path = new URL(request.url).pathname
    const method = request.method

    try {
      // Find matching route
      const route = this.findMatchingRoute(path, method)
      if (!route) {
        return this.createErrorResponse('Route not found', 404, startTime, path, method)
      }

      // Apply security policies
      const securityResult = await this.applySecurity(request, route.security)
      if (!securityResult.success) {
        return this.createErrorResponse(
          securityResult.error || 'Security check failed',
          securityResult.statusCode || 403,
          startTime,
          path,
          method,
          securityResult.user?.id
        )
      }

      // Transform request if needed
      let requestData = await this.extractRequestData(request)
      if (route.transformRequest) {
        requestData = route.transformRequest(requestData)
      }

      // Create request context
      const requestContext = {
        requestId: this.generateRequestId(),
        userId: securityResult.user?.id || 'anonymous',
        sessionId: securityResult.user?.sessionId || 'no-session',
        timestamp: new Date(),
        priority: this.determinePriority(securityResult.user?.role),
        metadata: {
          path,
          method,
          userAgent: request.headers.get('user-agent') || 'unknown',
          ip: this.extractClientIP(request)
        }
      }

      // Route to service
      const serviceResponse = await serviceOrchestrator.routeRequest(
        route.serviceName,
        requestData,
        requestContext
      )

      if (!serviceResponse.success) {
        return this.createErrorResponse(
          serviceResponse.error || 'Service error',
          500,
          startTime,
          path,
          method,
          securityResult.user?.id
        )
      }

      // Transform response if needed
      let responseData = serviceResponse.data
      if (route.transformResponse) {
        responseData = route.transformResponse(responseData)
      }

      // Encrypt response if required
      if (route.security.encryptResponse && responseData) {
        responseData = await this.encryptResponse(responseData)
      }

      // Create success response
      const response = NextResponse.json({
        success: true,
        data: responseData,
        requestId: requestContext.requestId,
        executionTime: serviceResponse.executionTime
      })

      // Add security headers
      this.addSecurityHeaders(response)

      // Log request
      this.logRequest(startTime, path, method, 200, securityResult.user?.id, request)

      // Record metrics
      unifiedMonitoring.recordMetric('api_requests_total', 1, {
        service: route.serviceName,
        method,
        status: '200'
      })

      return response

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'
      return this.createErrorResponse(errorMessage, 500, startTime, path, method)
    }
  }

  private findMatchingRoute(path: string, method: string): RouteMapping | null {
    return this.routes.find(route => 
      this.matchesPattern(path, route.pattern) && 
      route.method === method
    ) || null
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\[([^\]]+)\]/g, '([^/]+)') // Convert [id] to capture group
      .replace(/\*/g, '.*') // Convert * to match anything
    
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(path)
  }

  private async applySecurity(
    request: NextRequest,
    policy: SecurityPolicy
  ): Promise<{
    success: boolean
    user?: AuthenticatedUser
    error?: string
    statusCode?: number
  }> {
    // Authentication check
    if (policy.requireAuth) {
      const authResult = await this.authenticateRequest(request)
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error,
          statusCode: 401
        }
      }

      const user = authResult.user!

      // Role authorization
      if (!policy.allowedRoles.includes(user.role)) {
        return {
          success: false,
          error: 'Insufficient role permissions',
          statusCode: 403,
          user
        }
      }

      // Permission authorization
      const hasRequiredPermissions = policy.requiredPermissions.every(
        permission => user.permissions.includes(permission)
      )

      if (!hasRequiredPermissions) {
        return {
          success: false,
          error: 'Insufficient permissions',
          statusCode: 403,
          user
        }
      }

      // Rate limiting
      if (policy.rateLimit) {
        const rateLimitResult = this.checkRateLimit(user.id, policy.rateLimit)
        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: `Rate limit exceeded. Try again in ${rateLimitResult.resetIn}ms`,
            statusCode: 429,
            user
          }
        }
      }

      return { success: true, user }
    }

    return { success: true }
  }

  private async authenticateRequest(request: NextRequest): Promise<{
    success: boolean
    user?: AuthenticatedUser
    error?: string
  }> {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      }
    }

    const token = authHeader.slice(7) // Remove 'Bearer '
    
    try {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
      const decoded = jwt.verify(token, jwtSecret) as any

      // In a real implementation, you would validate the token against a database
      const user: AuthenticatedUser = {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId,
        tokenVersion: decoded.tokenVersion || 1
      }

      return { success: true, user }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    }
  }

  private checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): { allowed: boolean; resetIn?: number } {
    const now = Date.now()
    const key = identifier
    const existing = this.rateLimitStore.get(key)

    if (!existing || now > existing.resetTime) {
      // First request or window expired
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return { allowed: true }
    }

    if (existing.count >= config.maxRequests) {
      return {
        allowed: false,
        resetIn: existing.resetTime - now
      }
    }

    existing.count++
    return { allowed: true }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private determinePriority(role?: UserRole): 'low' | 'normal' | 'high' | 'critical' {
    switch (role) {
      case 'PARTNER':
        return 'critical'
      case 'MANAGER':
        return 'high'
      case 'ASSOCIATE':
        return 'normal'
      default:
        return 'low'
    }
  }

  private extractClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           'unknown'
  }

  private async extractRequestData(request: NextRequest): Promise<any> {
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const params: Record<string, string> = {}
      url.searchParams.forEach((value, key) => {
        params[key] = value
      })
      return params
    }

    if (request.headers.get('content-type')?.includes('application/json')) {
      return await request.json()
    }

    return {}
  }

  private async encryptResponse(data: any): Promise<string> {
    // In a real implementation, this would use proper encryption
    const jsonString = JSON.stringify(data)
    return Buffer.from(jsonString).toString('base64')
  }

  private addSecurityHeaders(response: NextResponse): void {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }

  private createErrorResponse(
    error: string,
    statusCode: number,
    startTime: number,
    path: string,
    method: string,
    userId?: string
  ): NextResponse {
    const response = NextResponse.json(
      {
        success: false,
        error,
        statusCode,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )

    this.addSecurityHeaders(response)
    this.logRequest(startTime, path, method, statusCode, userId)

    // Record error metrics
    unifiedMonitoring.recordMetric('api_errors_total', 1, {
      status: statusCode.toString(),
      method
    })

    return response
  }

  private logRequest(
    startTime: number,
    path: string,
    method: string,
    statusCode: number,
    userId?: string,
    request?: NextRequest
  ): void {
    const responseTime = Date.now() - startTime
    
    const logEntry = {
      timestamp: new Date(),
      userId,
      path,
      method,
      statusCode,
      responseTime,
      userAgent: request?.headers.get('user-agent'),
      ip: request ? this.extractClientIP(request) : undefined
    }

    this.auditLog.push(logEntry)

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog.shift()
    }

    // Log to monitoring system
    unifiedMonitoring.log('info', 'api-gateway', 
      `${method} ${path} ${statusCode} ${responseTime}ms`, 
      { userId, responseTime, statusCode }
    )

    // Record response time metric
    unifiedMonitoring.recordMetric('response_time_ms', responseTime, {
      service: 'api-gateway',
      method,
      status: statusCode.toString()
    })
  }

  // Administrative methods
  getAuditLog(filters?: {
    userId?: string
    path?: string
    method?: string
    statusCode?: number
    timeRange?: { start: Date; end: Date }
  }): typeof this.auditLog {
    let filtered = this.auditLog

    if (filters?.userId) {
      filtered = filtered.filter(entry => entry.userId === filters.userId)
    }

    if (filters?.path) {
      filtered = filtered.filter(entry => entry.path.includes(filters.path!))
    }

    if (filters?.method) {
      filtered = filtered.filter(entry => entry.method === filters.method)
    }

    if (filters?.statusCode) {
      filtered = filtered.filter(entry => entry.statusCode === filters.statusCode)
    }

    if (filters?.timeRange) {
      filtered = filtered.filter(entry =>
        entry.timestamp >= filters.timeRange!.start &&
        entry.timestamp <= filters.timeRange!.end
      )
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getRateLimitStatus(identifier?: string): Map<string, { count: number; resetTime: number }> | { count: number; resetTime: number } | undefined {
    if (identifier) {
      return this.rateLimitStore.get(identifier)
    }
    return this.rateLimitStore
  }

  addRoute(route: RouteMapping): void {
    this.routes.push(route)
  }

  removeRoute(pattern: string, method: string): boolean {
    const index = this.routes.findIndex(r => r.pattern === pattern && r.method === method)
    if (index !== -1) {
      this.routes.splice(index, 1)
      return true
    }
    return false
  }

  getRoutes(): RouteMapping[] {
    return [...this.routes]
  }
}

export const unifiedAPIGateway = new UnifiedAPIGateway()