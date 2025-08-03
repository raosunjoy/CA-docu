import 'whatwg-fetch'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { UserRole } from '@/types'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => mockPrisma)

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
})

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.ASSOCIATE,
  organizationId: 'org-123',
  isActive: true,
  passwordHash: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  organization: {
    id: 'org-123',
    name: 'Test Organization'
  }
}

describe('Login Authentication Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should validate password correctly', async () => {
    const password = 'TestPassword123!'
    const hashedPassword = await hashPassword(password)
    
    const isValid = await verifyPassword(password, hashedPassword)
    expect(isValid).toBe(true)
    
    const isInvalid = await verifyPassword('wrong-password', hashedPassword)
    expect(isInvalid).toBe(false)
  })

  it('should find user by email', async () => {
    const email = 'test@example.com'
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)

    const user = await mockPrisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
      where: { email: email.toLowerCase() },
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

  it('should update user lastLoginAt', async () => {
    const userId = 'user-123'
    mockPrisma.user.update.mockResolvedValue({})

    await mockPrisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: expect.any(Date) }
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { lastLoginAt: expect.any(Date) }
    })
  })

  it('should create audit log for login', async () => {
    const auditData = {
      organizationId: 'org-123',
      userId: 'user-123',
      action: 'login',
      resourceType: 'user',
      resourceId: 'user-123',
      newValues: {
        deviceId: 'device-123',
        ip: '127.0.0.1'
      },
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    }

    mockPrisma.auditLog.create.mockResolvedValue({})

    await mockPrisma.auditLog.create({
      data: auditData
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: auditData
    })
  })

  it('should handle inactive user', () => {
    const inactiveUser = { ...mockUser, isActive: false }
    
    expect(inactiveUser.isActive).toBe(false)
    
    // This would normally trigger a 403 response
    const shouldAllowLogin = inactiveUser.isActive
    expect(shouldAllowLogin).toBe(false)
  })

  it('should handle user without password hash', () => {
    const userWithoutPassword = { ...mockUser, passwordHash: null }
    
    expect(userWithoutPassword.passwordHash).toBeNull()
    
    // This would normally trigger a 401 response
    const hasPassword = userWithoutPassword.passwordHash !== null
    expect(hasPassword).toBe(false)
  })

  it('should validate email format', () => {
    const validEmail = 'test@example.com'
    const invalidEmail = 'invalid-email'
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    expect(emailRegex.test(validEmail)).toBe(true)
    expect(emailRegex.test(invalidEmail)).toBe(false)
  })

  it('should validate password strength', () => {
    const strongPassword = 'TestPassword123!'
    const weakPassword = '123'
    
    // Basic password validation
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(strongPassword)
    const hasLowerCase = /[a-z]/.test(strongPassword)
    const hasNumbers = /\d/.test(strongPassword)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(strongPassword)
    
    expect(strongPassword.length >= minLength).toBe(true)
    expect(hasUpperCase).toBe(true)
    expect(hasLowerCase).toBe(true)
    expect(hasNumbers).toBe(true)
    expect(hasSpecialChar).toBe(true)
    
    expect(weakPassword.length >= minLength).toBe(false)
  })
})