import { NextRequest } from 'next/server'
import { GET } from '../route'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { createMockUser, createMockOrganization } from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
  },
}))

jest.mock('@/lib/middleware', () => ({
  authMiddleware: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>

describe('/api/auth/me', () => {
  const mockOrganization = createMockOrganization({
    id: 'org-1',
    name: 'Test Organization',
    subdomain: 'test-org'
  })

  const mockUser = createMockUser({
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'ASSOCIATE',
    isActive: true,
    lastLoginAt: new Date('2024-01-01T10:00:00Z'),
    organizationId: 'org-1',
    organization: mockOrganization
  })

  const mockAuthResult = {
    user: {
      sub: 'user-1',
      email: 'test@example.com',
      role: 'ASSOCIATE',
      orgId: 'org-1',
      permissions: ['TASK_READ', 'TASK_UPDATE', 'DOCUMENT_READ']
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('successful requests', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
    })

    it('should return user data successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ASSOCIATE',
        isActive: true,
        lastLoginAt: '2024-01-01T10:00:00.000Z',
        organization: {
          id: 'org-1',
          name: 'Test Organization',
          subdomain: 'test-org'
        },
        permissions: ['TASK_READ', 'TASK_UPDATE', 'DOCUMENT_READ']
      })
      expect(data.meta.timestamp).toBeDefined()
      expect(data.meta.requestId).toBeDefined()
    })

    it('should handle user with null lastLoginAt', async () => {
      const userWithoutLastLogin = {
        ...mockUser,
        lastLoginAt: null
      }
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutLastLogin)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.lastLoginAt).toBeNull()
    })

    it('should call auth middleware with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      await GET(request)

      expect(mockAuthMiddleware).toHaveBeenCalledWith({})
    })

    it('should query user with correct parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      await GET(request)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              subdomain: true
            }
          }
        }
      })
    })
  })

  describe('authentication errors', () => {
    it('should return auth error when middleware fails', async () => {
      const authErrorResponse = new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token'
          }
        }),
        { status: 401 }
      )

      mockAuthMiddleware.mockImplementation(() => async () => authErrorResponse)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle missing authorization header', async () => {
      const authErrorResponse = new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization header required'
          }
        }),
        { status: 401 }
      )

      mockAuthMiddleware.mockImplementation(() => async () => authErrorResponse)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('user not found errors', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
    })

    it('should return 404 when user not found in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('User not found')
    })
  })

  describe('inactive user errors', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
    })

    it('should return 403 for inactive user', async () => {
      const inactiveUser = {
        ...mockUser,
        isActive: false
      }
      mockPrisma.user.findUnique.mockResolvedValue(inactiveUser)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toBe('Account is deactivated')
    })
  })

  describe('database errors', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
    })

    it('should handle database connection errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('An error occurred while fetching user data')
    })

    it('should handle database timeout errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Query timeout'))

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
    })

    it('should handle user with minimal organization data', async () => {
      const userWithMinimalOrg = {
        ...mockUser,
        organization: {
          id: 'org-1',
          name: 'Test Organization',
          subdomain: 'test-org'
        }
      }
      mockPrisma.user.findUnique.mockResolvedValue(userWithMinimalOrg)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.organization).toEqual({
        id: 'org-1',
        name: 'Test Organization',
        subdomain: 'test-org'
      })
    })

    it('should handle user with empty permissions array', async () => {
      const authResultWithoutPermissions = {
        user: {
          ...mockAuthResult.user,
          permissions: []
        }
      }
      mockAuthMiddleware.mockImplementation(() => async () => authResultWithoutPermissions)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.permissions).toEqual([])
    })
  })
})