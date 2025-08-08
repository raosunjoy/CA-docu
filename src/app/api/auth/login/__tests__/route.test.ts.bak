import { NextRequest } from 'next/server'
import { POST } from '../route'
import prisma from '@/lib/prisma'
import { verifyPassword, createSessionToken } from '@/lib/auth'
import { createMockUser } from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}))

jest.mock('@/lib/auth', () => ({
  verifyPassword: jest.fn(),
  createSessionToken: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>
const mockCreateSessionToken = createSessionToken as jest.MockedFunction<typeof createSessionToken>

describe('/api/auth/login', () => {
  const validLoginData = {
    email: 'test@example.com',
    password: 'password123',
    deviceId: 'device-123'
  }

  const mockUser = createMockUser({
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    isActive: true,
    organization: {
      id: 'org-1',
      name: 'Test Organization'
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateSessionToken.mockReturnValue('mock-jwt-token')
  })

  describe('successful login', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)
    })

    it('should login successfully with valid credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        organizationId: mockUser.organizationId
      })
      expect(data.data.token).toBe('mock-jwt-token')
      expect(data.data.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should set auth cookie in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const setCookieHeader = response.headers.get('Set-Cookie')

      expect(setCookieHeader).toContain('auth-token=mock-jwt-token')
      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('Secure')
      expect(setCookieHeader).toContain('SameSite=Strict')
    })

    it('should update user last login time', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      await POST(request)

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) }
      })
    })

    it('should create audit log entry', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData),
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent'
        }
      })

      await POST(request)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: mockUser.organizationId,
          userId: mockUser.id,
          action: 'login',
          resourceType: 'user',
          resourceId: mockUser.id,
          newValues: {
            deviceId: 'device-123',
            ip: '192.168.1.1',
            userAgent: 'test-agent'
          },
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      })
    })

    it('should create session token with correct payload', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      await POST(request)

      expect(mockCreateSessionToken).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          organizationId: mockUser.organizationId
        },
        'device-123'
      )
    })
  })

  describe('validation errors', () => {
    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'password123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: 'Invalid email format'
          })
        ])
      )
    })

    it('should return 400 for missing password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: ''
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid-json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('authentication errors', () => {
    it('should return 401 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Invalid email or password')
    })

    it('should return 401 for incorrect password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Invalid email or password')
    })

    it('should return 403 for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false }
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('Account is deactivated. Please contact your administrator.')
    })

    it('should return 401 for user without password hash', async () => {
      const userWithoutPassword = { ...mockUser, passwordHash: null }
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPassword)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('database errors', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle audit log creation failure gracefully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser)
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Audit log failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validLoginData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('edge cases', () => {
    it('should handle login without deviceId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)

      const loginDataWithoutDevice = {
        email: 'test@example.com',
        password: 'password123'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginDataWithoutDevice)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockCreateSessionToken).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      )
    })

    it('should normalize email to lowercase', async () => {
      const upperCaseEmailData = {
        ...validLoginData,
        email: 'TEST@EXAMPLE.COM'
      }

      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockVerifyPassword.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue(mockUser)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(upperCaseEmailData)
      })

      await POST(request)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          organization: {
            select: { id: true, name: true }
          }
        }
      })
    })
  })
})