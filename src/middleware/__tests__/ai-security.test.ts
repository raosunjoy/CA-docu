// AI Security Middleware Tests
import { NextRequest } from 'next/server'
import { AISecurityMiddleware } from '../ai-security'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => {
      const response = {
        json: jest.fn().mockResolvedValue(data),
        status: options?.status || 200,
        headers: options?.headers ? new Map(Object.entries(options.headers)) : new Map(),
      }
      return response
    }),
  },
}))

// Mock the auth library
jest.mock('../../lib/auth', () => ({
  verifyToken: jest.fn(),
}))

import { verifyToken } from '../../lib/auth'
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>

// Mock the AI database
jest.mock('../../services/ai-database', () => ({
  aiDatabase: {
    logUsage: jest.fn(),
  },
}))

import { aiDatabase } from '../../services/ai-database'
const mockAiDatabase = aiDatabase as jest.Mocked<typeof aiDatabase>

describe('AI Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clean up rate limit store between tests
    AISecurityMiddleware.cleanupExpiredEntries()
  })

  const createMockRequest = (
    options: {
      headers?: Record<string, string>
      body?: any
      method?: string
      url?: string
    } = {}
  ) => {
    const headers = new Map()
    Object.entries(options.headers || {}).forEach(([key, value]) => {
      headers.set(key.toLowerCase(), value)
    })

    return {
      headers: {
        get: (key: string) => headers.get(key.toLowerCase()) || null,
      },
      method: options.method || 'POST',
      url: options.url || 'http://localhost:3000/api/ai/process',
      json: jest.fn().mockResolvedValue(options.body || {}),
      clone: jest.fn().mockReturnThis(),
      text: jest.fn().mockResolvedValue(JSON.stringify(options.body || {})),
    } as any
  }

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const request = createMockRequest({
        headers: {},
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeDefined()
      expect(result!.status).toBe(401)
      expect(mockAiDatabase.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Missing authentication token',
        })
      )
    })

    it('should reject requests with invalid tokens', async () => {
      mockVerifyToken.mockResolvedValue(null)

      const request = createMockRequest({
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeDefined()
      expect(result!.status).toBe(401)
      expect(mockVerifyToken).toHaveBeenCalledWith('invalid-token')
    })

    it('should allow requests with valid tokens', async () => {
      mockVerifyToken.mockResolvedValue({
        userId: 'user123',
        role: 'ASSOCIATE',
        organizationId: 'org123',
      })

      const request = createMockRequest({
        headers: {
          Authorization: 'Bearer valid-token',
          'content-length': '100',
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeNull() // No error response means success
      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token')
      expect(mockAiDatabase.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          requestType: 'SECURITY_CHECK',
        })
      )
    })

    it('should reject requests with insufficient role permissions', async () => {
      mockVerifyToken.mockResolvedValue({
        userId: 'user123',
        role: 'INTERN',
        organizationId: 'org123',
      })

      const request = createMockRequest({
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process', {
        allowedRoles: ['PARTNER', 'MANAGER'],
      })

      expect(result).toBeDefined()
      expect(result!.status).toBe(403)
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockVerifyToken.mockResolvedValue({
        userId: 'user123',
        role: 'ASSOCIATE',
        organizationId: 'org123',
      })
    })

    it('should allow requests within rate limit', async () => {
      const uniqueToken = `valid-token-${Date.now()}-${Math.random()}`
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${uniqueToken}`,
          'content-length': '100',
          'x-forwarded-for': `192.168.1.${Math.floor(Math.random() * 200) + 1}`, // Unique IP
        },
      })

      // Use existing endpoint that has a config
      const result1 = await AISecurityMiddleware.protect(request, '/api/ai/process')
      expect(result1).toBeNull()

      // Second request should also pass (within limit - default is 10/minute)
      const result2 = await AISecurityMiddleware.protect(request, '/api/ai/process')
      expect(result2).toBeNull()
    })

    it('should block requests exceeding rate limit', async () => {
      const uniqueToken = `rate-limit-token-${Date.now()}-${Math.random()}`
      const uniqueIP = `10.0.0.${Math.floor(Math.random() * 200) + 1}`
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${uniqueToken}`,
          'content-length': '100',
          'x-forwarded-for': uniqueIP,
        },
      })

      // Use custom config with very low rate limit for testing
      const customConfig = {
        rateLimit: {
          windowMs: 60000,
          maxRequests: 1,
          blockDuration: 60000,
        },
      }

      // First request should pass
      const result1 = await AISecurityMiddleware.protect(request, '/api/ai/process', customConfig)
      expect(result1).toBeNull()

      // Second request should be blocked
      const result2 = await AISecurityMiddleware.protect(request, '/api/ai/process', customConfig)
      expect(result2).toBeDefined()
      expect(result2!.status).toBe(429)

      const responseData = await result2!.json()
      expect(responseData.error).toBe('Rate limit exceeded')
    })

    it('should include rate limit headers in blocked responses', async () => {
      const uniqueToken = `header-test-token-${Date.now()}-${Math.random()}`
      const uniqueIP = `172.16.0.${Math.floor(Math.random() * 200) + 1}`
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${uniqueToken}`,
          'content-length': '100',
          'x-forwarded-for': uniqueIP,
        },
      })

      const customConfig = {
        rateLimit: {
          windowMs: 60000,
          maxRequests: 1,
          blockDuration: 60000,
        },
      }

      // First request to establish limit
      await AISecurityMiddleware.protect(request, '/api/emails/categorize', customConfig)

      // Second request should be blocked with headers
      const result = await AISecurityMiddleware.protect(
        request,
        '/api/emails/categorize',
        customConfig
      )
      expect(result).toBeDefined()

      const headers = result!.headers as any
      expect(headers.get('X-RateLimit-Limit')).toBe('1')
      expect(headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      mockVerifyToken.mockResolvedValue({
        userId: 'user123',
        role: 'ASSOCIATE',
        organizationId: 'org123',
      })
    })

    it('should reject requests with payload too large', async () => {
      const uniqueToken = `payload-test-token-${Date.now()}-${Math.random()}`
      const uniqueIP = `192.168.2.${Math.floor(Math.random() * 200) + 1}`
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${uniqueToken}`,
          'content-length': '100000', // 100KB, exceeds default 50KB limit
          'x-forwarded-for': uniqueIP,
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeDefined()
      expect(result!.status).toBe(413)

      const responseData = await result!.json()
      expect(responseData.error).toBe('Request payload too large')
    })

    it('should detect and block suspicious input patterns', async () => {
      const uniqueToken = `suspicious-test-token-${Date.now()}-${Math.random()}`
      const uniqueIP = `192.168.3.${Math.floor(Math.random() * 200) + 1}`
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${uniqueToken}`,
          'content-length': '100',
          'x-forwarded-for': uniqueIP,
        },
        body: {
          message: '<script>alert("xss")</script>Hello world',
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeDefined()
      expect(result!.status).toBe(400)

      const responseData = await result!.json()
      expect(responseData.error).toBe('Invalid input detected')
    })

    it('should allow clean input to pass through', async () => {
      const uniqueToken = `clean-input-token-${Date.now()}-${Math.random()}`
      const uniqueIP = `192.168.4.${Math.floor(Math.random() * 200) + 1}`
      const request = createMockRequest({
        headers: {
          Authorization: `Bearer ${uniqueToken}`,
          'content-length': '100',
          'x-forwarded-for': uniqueIP,
        },
        body: {
          message: 'What are the GST filing requirements?',
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeNull()
    })
  })

  describe('Client IP Detection', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1',
        },
      })

      const ip = AISecurityMiddleware.getClientIP(request)
      expect(ip).toBe('192.168.1.100')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({
        headers: {
          'x-real-ip': '192.168.1.200',
        },
      })

      const ip = AISecurityMiddleware.getClientIP(request)
      expect(ip).toBe('192.168.1.200')
    })

    it('should return unknown when no IP headers present', () => {
      const request = createMockRequest({})

      const ip = AISecurityMiddleware.getClientIP(request)
      expect(ip).toBe('unknown')
    })
  })

  describe('Health Check', () => {
    it('should return healthy status when functioning normally', async () => {
      const health = await AISecurityMiddleware.healthCheck()

      expect(health.status).toBe('healthy')
      expect(health.details).toBeDefined()
      expect(health.details.rateLimitStoreSize).toBeGreaterThanOrEqual(0)
      expect(health.details.cleanedEntries).toBeGreaterThanOrEqual(0)
      expect(health.details.activeBlocks).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Cleanup Functionality', () => {
    it('should clean up expired rate limit entries', () => {
      const cleanedCount = AISecurityMiddleware.cleanupExpiredEntries()
      expect(typeof cleanedCount).toBe('number')
      expect(cleanedCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Security Event Logging', () => {
    it('should log security events with proper structure', async () => {
      const event = {
        endpoint: '/api/ai/process',
        userId: 'user123',
        event: 'AUTH_FAILED',
        reason: 'Invalid token',
        userAgent: 'TestAgent/1.0',
        ip: '192.168.1.100',
      }

      await AISecurityMiddleware.logSecurityEvent(event)

      expect(mockAiDatabase.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          endpoint: '/api/ai/process',
          requestType: 'SECURITY_AUTH_FAILED',
          success: false,
          errorMessage: 'Invalid token',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock verifyToken to throw an error
      mockVerifyToken.mockRejectedValue(new Error('Token verification failed'))

      const request = createMockRequest({
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      const result = await AISecurityMiddleware.protect(request, '/api/ai/process')

      expect(result).toBeDefined()
      expect(result!.status).toBe(500)

      const responseData = await result!.json()
      expect(responseData.error).toBe('Security check failed')
    })
  })
})
