// AI Security Middleware - Rate limiting, authentication, and input validation
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { aiDatabase } from '@/services/ai-database'

interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Max requests per window
  blockDuration: number // Block duration in milliseconds after limit exceeded
}

interface SecurityConfig {
  requireAuth: boolean
  allowedRoles: string[]
  rateLimit: RateLimitConfig
  maxInputSize: number // Max input size in bytes
  sanitizeInput: boolean
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number; blocked?: number }>()

// Default security configurations for AI endpoints
const DEFAULT_CONFIGS: Record<string, SecurityConfig> = {
  '/api/ai/process': {
    requireAuth: true,
    allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE', 'INTERN'],
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10,      // 10 requests per minute
      blockDuration: 5 * 60 * 1000 // 5 minute block
    },
    maxInputSize: 50 * 1024, // 50KB
    sanitizeInput: true
  },
  '/api/emails/categorize': {
    requireAuth: true,
    allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE'],
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 20,
      blockDuration: 2 * 60 * 1000
    },
    maxInputSize: 100 * 1024, // 100KB for email batch processing
    sanitizeInput: true
  },
  '/api/emails/ai/task-suggestions': {
    requireAuth: true,
    allowedRoles: ['PARTNER', 'MANAGER', 'ASSOCIATE'],
    rateLimit: {
      windowMs: 60 * 1000,
      maxRequests: 15,
      blockDuration: 3 * 60 * 1000
    },
    maxInputSize: 20 * 1024, // 20KB
    sanitizeInput: true
  }
}

export class AISecurityMiddleware {
  
  static async protect(
    request: NextRequest,
    endpoint: string,
    customConfig?: Partial<SecurityConfig>
  ): Promise<NextResponse | null> {
    const config = { ...DEFAULT_CONFIGS[endpoint], ...customConfig }
    const startTime = Date.now()
    
    if (!config) {
      console.warn(`No security config found for endpoint: ${endpoint}`)
      return null
    }

    try {
      // 1. Authentication Check
      let userId = 'anonymous'
      let userRole = 'UNKNOWN'
      let organizationId = 'unknown'

      if (config.requireAuth) {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '')
        
        if (!token) {
          await AISecurityMiddleware.logSecurityEvent({
            endpoint,
            userId: 'anonymous',
            event: 'AUTH_FAILED',
            reason: 'Missing authentication token',
            userAgent: request.headers.get('user-agent') || '',
            ip: AISecurityMiddleware.getClientIP(request)
          })

          return NextResponse.json(
            { error: 'Authentication required', code: 'AUTH_REQUIRED' },
            { status: 401 }
          )
        }

        const payload = await verifyToken(token)
        if (!payload) {
          await AISecurityMiddleware.logSecurityEvent({
            endpoint,
            userId: 'anonymous',
            event: 'AUTH_FAILED',
            reason: 'Invalid authentication token',
            userAgent: request.headers.get('user-agent') || '',
            ip: AISecurityMiddleware.getClientIP(request)
          })

          return NextResponse.json(
            { error: 'Invalid authentication token', code: 'AUTH_INVALID' },
            { status: 401 }
          )
        }

        userId = payload.userId || payload.sub || 'unknown'
        userRole = payload.role || 'UNKNOWN'
        organizationId = payload.organizationId || 'unknown'

        // Role-based authorization
        if (config.allowedRoles && !config.allowedRoles.includes(userRole)) {
          await AISecurityMiddleware.logSecurityEvent({
            endpoint,
            userId,
            event: 'ROLE_DENIED',
            reason: `Role ${userRole} not authorized for ${endpoint}`,
            userAgent: request.headers.get('user-agent') || '',
            ip: AISecurityMiddleware.getClientIP(request)
          })

          return NextResponse.json(
            { error: 'Insufficient permissions', code: 'ROLE_DENIED' },
            { status: 403 }
          )
        }
      }

      // 2. Rate Limiting
      const rateLimitKey = `${endpoint}:${userId}:${AISecurityMiddleware.getClientIP(request)}`
      const rateLimitResult = await AISecurityMiddleware.checkRateLimit(rateLimitKey, config.rateLimit)
      
      if (!rateLimitResult.allowed) {
        await AISecurityMiddleware.logSecurityEvent({
          endpoint,
          userId,
          event: 'RATE_LIMITED',
          reason: `Rate limit exceeded: ${rateLimitResult.count}/${config.rateLimit.maxRequests}`,
          userAgent: request.headers.get('user-agent') || '',
          ip: AISecurityMiddleware.getClientIP(request)
        })

        return NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            code: 'RATE_LIMITED',
            resetTime: rateLimitResult.resetTime,
            limit: config.rateLimit.maxRequests,
            windowMs: config.rateLimit.windowMs
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': config.rateLimit.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
              'Retry-After': Math.ceil(config.rateLimit.blockDuration / 1000).toString()
            }
          }
        )
      }

      // 3. Input Size Validation
      const contentLength = parseInt(request.headers.get('content-length') || '0')
      if (contentLength > config.maxInputSize) {
        await AISecurityMiddleware.logSecurityEvent({
          endpoint,
          userId,
          event: 'INPUT_TOO_LARGE',
          reason: `Input size ${contentLength} exceeds limit ${config.maxInputSize}`,
          userAgent: request.headers.get('user-agent') || '',
          ip: AISecurityMiddleware.getClientIP(request)
        })

        return NextResponse.json(
          { 
            error: 'Request payload too large', 
            code: 'PAYLOAD_TOO_LARGE',
            maxSize: config.maxInputSize,
            receivedSize: contentLength
          },
          { status: 413 }
        )
      }

      // 4. Input Sanitization (if enabled)
      if (config.sanitizeInput && request.method === 'POST') {
        try {
          const clonedRequest = request.clone()
          const body = await clonedRequest.text()
          
          // Basic sanitization checks
          const suspiciousPatterns = [
            /<script[^>]*>.*?<\/script>/gi,  // Script tags
            /javascript:/gi,                  // JavaScript URLs
            /on\w+\s*=/gi,                   // Event handlers
            /eval\s*\(/gi,                   // Eval calls
            /document\.|window\.|global\./gi  // Global object access
          ]

          for (const pattern of suspiciousPatterns) {
            if (pattern.test(body)) {
              await AISecurityMiddleware.logSecurityEvent({
                endpoint,
                userId,
                event: 'SUSPICIOUS_INPUT',
                reason: `Suspicious pattern detected in input: ${pattern.source}`,
                userAgent: request.headers.get('user-agent') || '',
                ip: AISecurityMiddleware.getClientIP(request)
              })

              return NextResponse.json(
                { error: 'Invalid input detected', code: 'SUSPICIOUS_INPUT' },
                { status: 400 }
              )
            }
          }
        } catch (error) {
          console.error('Input sanitization error:', error)
          // Continue processing if sanitization fails
        }
      }

      // Log successful security check
      await aiDatabase.logUsage({
        userId,
        organizationId,
        endpoint,
        requestType: 'SECURITY_CHECK',
        userRole,
        businessContext: 'security_validation',
        success: true,
        processingTime: Date.now() - startTime
      })

      // Security checks passed - request can proceed
      return null

    } catch (error) {
      console.error('Security middleware error:', error)
      
      // Log security error
      await AISecurityMiddleware.logSecurityEvent({
        endpoint,
        userId: 'unknown',
        event: 'SECURITY_ERROR',
        reason: `Security middleware error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        userAgent: request.headers.get('user-agent') || '',
        ip: AISecurityMiddleware.getClientIP(request)
      })

      return NextResponse.json(
        { error: 'Security check failed', code: 'SECURITY_ERROR' },
        { status: 500 }
      )
    }
  }

  static async checkRateLimit(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean
    count: number
    resetTime: number
  }> {
    const now = Date.now()
    const stored = rateLimitStore.get(key)

    // Check if currently blocked
    if (stored?.blocked && stored.blocked > now) {
      return {
        allowed: false,
        count: stored.count,
        resetTime: stored.blocked
      }
    }

    // Reset if window expired
    if (!stored || stored.resetTime <= now) {
      const newResetTime = now + config.windowMs
      rateLimitStore.set(key, { count: 1, resetTime: newResetTime })
      return {
        allowed: true,
        count: 1,
        resetTime: newResetTime
      }
    }

    // Increment counter
    stored.count += 1
    
    // Check if limit exceeded
    if (stored.count > config.maxRequests) {
      stored.blocked = now + config.blockDuration
      rateLimitStore.set(key, stored)
      
      return {
        allowed: false,
        count: stored.count,
        resetTime: stored.blocked
      }
    }

    rateLimitStore.set(key, stored)
    return {
      allowed: true,
      count: stored.count,
      resetTime: stored.resetTime
    }
  }

  static getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           request.headers.get('x-real-ip') ||
           request.headers.get('remote-addr') ||
           'unknown'
  }

  static async logSecurityEvent(event: {
    endpoint: string
    userId: string
    event: string
    reason: string
    userAgent: string
    ip: string
  }): Promise<void> {
    try {
      console.log('🔒 Security Event:', {
        timestamp: new Date().toISOString(),
        endpoint: event.endpoint,
        userId: event.userId,
        event: event.event,
        reason: event.reason,
        userAgent: event.userAgent.substring(0, 100),
        ip: event.ip
      })

      // In production, store in dedicated security logs table
      await aiDatabase.logUsage({
        userId: event.userId,
        organizationId: 'security',
        endpoint: event.endpoint,
        requestType: `SECURITY_${event.event}`,
        userRole: 'SECURITY',
        businessContext: 'security_audit',
        success: event.event.includes('SUCCESS'),
        errorMessage: event.reason,
        processingTime: 0
      })
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  // Health check for security middleware
  static async healthCheck(): Promise<{ status: 'healthy' | 'degraded'; details: any }> {
    try {
      const storeSize = rateLimitStore.size
      const now = Date.now()
      
      // Clean up expired entries
      let cleanedCount = 0
      for (const [key, value] of rateLimitStore.entries()) {
        if (value.resetTime <= now && (!value.blocked || value.blocked <= now)) {
          rateLimitStore.delete(key)
          cleanedCount++
        }
      }

      return {
        status: 'healthy',
        details: {
          rateLimitStoreSize: storeSize,
          cleanedEntries: cleanedCount,
          activeBlocks: Array.from(rateLimitStore.values()).filter(v => v.blocked && v.blocked > now).length
        }
      }
    } catch (error) {
      return {
        status: 'degraded',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  // Manual cleanup for maintenance
  static cleanupExpiredEntries(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime <= now && (!value.blocked || value.blocked <= now)) {
        rateLimitStore.delete(key)
        cleaned++
      }
    }
    
    return cleaned
  }
}

// Export types for use in API routes
export type { SecurityConfig, RateLimitConfig }