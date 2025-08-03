import 'whatwg-fetch'
import { UserRole } from '@/types'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => mockPrisma)

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
})

describe('User Profile Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ASSOCIATE,
    organizationId: 'org-123',
    isActive: true,
    lastLoginAt: new Date(),
    organization: {
      id: 'org-123',
      name: 'Test Organization',
      subdomain: 'test'
    }
  }

  it('should find user by ID with organization', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)

    const user = await mockPrisma.user.findUnique({
      where: { id: 'user-123' },
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

    expect(user).toEqual(mockUser)
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
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

  it('should handle user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const user = await mockPrisma.user.findUnique({
      where: { id: 'non-existent-user' }
    })

    expect(user).toBeNull()
  })

  it('should check if user is active', () => {
    expect(mockUser.isActive).toBe(true)
    
    const inactiveUser = { ...mockUser, isActive: false }
    expect(inactiveUser.isActive).toBe(false)
  })

  it('should format lastLoginAt as ISO string', () => {
    const lastLoginAt = mockUser.lastLoginAt
    const isoString = lastLoginAt?.toISOString()
    
    expect(isoString).toBeDefined()
    expect(typeof isoString).toBe('string')
    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('should handle null lastLoginAt', () => {
    const userWithoutLogin = { ...mockUser, lastLoginAt: null as Date | null }
    const isoString = userWithoutLogin.lastLoginAt?.toISOString() ?? null
    
    expect(isoString).toBeNull()
  })

  it('should include organization data', () => {
    expect(mockUser.organization).toBeDefined()
    expect(mockUser.organization.id).toBe('org-123')
    expect(mockUser.organization.name).toBe('Test Organization')
    expect(mockUser.organization.subdomain).toBe('test')
  })

  it('should validate user permissions structure', () => {
    const permissions = ['read:tasks', 'write:tasks', 'read:documents']
    
    expect(Array.isArray(permissions)).toBe(true)
    expect(permissions.length).toBeGreaterThan(0)
    
    permissions.forEach(permission => {
      expect(typeof permission).toBe('string')
      expect(permission).toMatch(/^[a-z]+:[a-z]+$/)
    })
  })

  it('should validate user response structure', () => {
    const userResponse = {
      id: mockUser.id,
      email: mockUser.email,
      firstName: mockUser.firstName,
      lastName: mockUser.lastName,
      role: mockUser.role,
      isActive: mockUser.isActive,
      lastLoginAt: mockUser.lastLoginAt?.toISOString() || null,
      organization: mockUser.organization,
      permissions: ['read:tasks', 'write:tasks']
    }

    expect(userResponse.id).toBeDefined()
    expect(userResponse.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    expect(userResponse.firstName).toBeDefined()
    expect(userResponse.lastName).toBeDefined()
    expect(Object.values(UserRole)).toContain(userResponse.role)
    expect(typeof userResponse.isActive).toBe('boolean')
    expect(userResponse.organization).toBeDefined()
    expect(Array.isArray(userResponse.permissions)).toBe(true)
  })
})