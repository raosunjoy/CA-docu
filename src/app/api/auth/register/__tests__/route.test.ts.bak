import { NextRequest } from 'next/server'
import { POST } from '../route'
import prisma from '@/lib/prisma'
import { hashPassword, validatePasswordStrength, validateEmail, createSessionToken } from '@/lib/auth'
import { UserRole } from '@/types'
import { createMockUser, createMockOrganization } from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  organization: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}))

jest.mock('@/lib/auth', () => ({
  hashPassword: jest.fn(),
  validatePasswordStrength: jest.fn(),
  validateEmail: jest.fn(),
  createSessionToken: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>
const mockValidatePasswordStrength = validatePasswordStrength as jest.MockedFunction<typeof validatePasswordStrength>
const mockValidateEmail = validateEmail as jest.MockedFunction<typeof validateEmail>
const mockCreateSessionToken = createSessionToken as jest.MockedFunction<typeof createSessionToken>

describe('/api/auth/register', () => {
  const validRegistrationData = {
    email: 'newuser@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe',
    organizationId: 'org-1',
    role: UserRole.ASSOCIATE,
    deviceId: 'device-123'
  }

  const mockOrganization = createMockOrganization({
    id: 'org-1',
    name: 'Test Organization'
  })

  const mockCreatedUser = createMockUser({
    id: 'user-1',
    email: 'newuser@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ASSOCIATE,
    organizationId: 'org-1'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateEmail.mockReturnValue(true)
    mockValidatePasswordStrength.mockReturnValue({ isValid: true, errors: [] })
    mockHashPassword.mockResolvedValue('hashed-password')
    mockCreateSessionToken.mockReturnValue('mock-jwt-token')
  })

  describe('successful registration', () => {
    beforeEach(() => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization)
      mockPrisma.user.findUnique.mockResolvedValue(null) // No existing user
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)
    })

    it('should register user successfully with valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.user).toEqual({
        id: mockCreatedUser.id,
        email: mockCreatedUser.email,
        firstName: mockCreatedUser.firstName,
        lastName: mockCreatedUser.lastName,
        role: mockCreatedUser.role,
        organizationId: mockCreatedUser.organizationId
      })
      expect(data.data.token).toBe('mock-jwt-token')
      expect(data.data.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should hash password before storing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      await POST(request)

      expect(mockHashPassword).toHaveBeenCalledWith('SecurePass123!')
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          passwordHash: 'hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.ASSOCIATE,
          organizationId: 'org-1',
          isActive: true
        }
      })
    })

    it('should normalize email to lowercase', async () => {
      const upperCaseEmailData = {
        ...validRegistrationData,
        email: 'NEWUSER@EXAMPLE.COM'
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(upperCaseEmailData)
      })

      await POST(request)

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com'
        })
      })
    })

    it('should create audit log entry', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData),
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent'
        }
      })

      await POST(request)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'register',
          resourceType: 'user',
          resourceId: 'user-1',
          newValues: {
            email: 'newuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.ASSOCIATE,
            deviceId: 'device-123',
            ip: '192.168.1.1'
          },
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      })
    })

    it('should set auth cookie in response', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const setCookieHeader = response.headers.get('Set-Cookie')

      expect(setCookieHeader).toContain('auth-token=mock-jwt-token')
      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('Secure')
      expect(setCookieHeader).toContain('SameSite=Strict')
    })
  })

  describe('validation errors', () => {
    beforeEach(() => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization)
      mockPrisma.user.findUnique.mockResolvedValue(null)
    })

    it('should return 400 for invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...validRegistrationData,
          email: 'invalid-email'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for short password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...validRegistrationData,
          password: '123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!'
          // Missing firstName, lastName, organizationId, role
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid role', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...validRegistrationData,
          role: 'INVALID_ROLE'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for weak password', async () => {
      mockValidatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password must contain uppercase letter', 'Password must contain special character']
      })

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Password does not meet requirements')
      expect(data.error.details).toEqual(['Password must contain uppercase letter', 'Password must contain special character'])
    })

    it('should return 400 for invalid email format (auth validation)', async () => {
      mockValidateEmail.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid email format')
    })
  })

  describe('business logic errors', () => {
    it('should return 404 for non-existent organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Organization not found')
    })

    it('should return 409 for existing user email', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization)
      mockPrisma.user.findUnique.mockResolvedValue(mockCreatedUser) // Existing user

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
      expect(data.error.message).toBe('User with this email already exists')
    })
  })

  describe('database errors', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.organization.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle user creation failure', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization)
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockRejectedValue(new Error('User creation failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(validRegistrationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization)
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)
    })

    it('should handle registration without deviceId', async () => {
      const registrationDataWithoutDevice = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        organizationId: 'org-1',
        role: UserRole.ASSOCIATE
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationDataWithoutDevice)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockCreateSessionToken).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      )
    })

    it('should handle long names within limits', async () => {
      const longNameData = {
        ...validRegistrationData,
        firstName: 'A'.repeat(100),
        lastName: 'B'.repeat(100)
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(longNameData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('should reject names exceeding limits', async () => {
      const tooLongNameData = {
        ...validRegistrationData,
        firstName: 'A'.repeat(101)
      }

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(tooLongNameData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})