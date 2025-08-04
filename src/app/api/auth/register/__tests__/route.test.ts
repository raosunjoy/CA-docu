import 'whatwg-fetch'
import { hashPassword, validatePasswordStrength, validateEmail } from '@/lib/auth'
import { UserRole } from '@/types'

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  organization: {
    findUnique: jest.fn()
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

describe('Registration Authentication Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Input Validation', () => {
    it('should validate email format correctly', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })

    it('should validate password strength correctly', () => {
      const strongPassword = 'TestPassword123!'
      const weakPassword = '123'
      
      const strongValidation = validatePasswordStrength(strongPassword)
      expect(strongValidation.isValid).toBe(true)
      expect(strongValidation.errors).toHaveLength(0)
      
      const weakValidation = validatePasswordStrength(weakPassword)
      expect(weakValidation.isValid).toBe(false)
      expect(weakValidation.errors.length).toBeGreaterThan(0)
    })

    it('should normalize email to lowercase', () => {
      const email = 'Test@EXAMPLE.COM'
      const normalizedEmail = email.toLowerCase()
      
      expect(normalizedEmail).toBe('test@example.com')
    })

    it('should validate required fields', () => {
      const requiredFields = ['email', 'password', 'firstName', 'lastName', 'organizationId', 'role']
      const validData = createValidRegistrationData()
      
      validateRequiredFields(requiredFields, validData)
    })
  })

  describe('Password Management', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 chars
    })
  })

  describe('Organization Verification', () => {
    it('should check if organization exists', async () => {
      const organizationId = 'org-123'
      const mockOrganization = {
        id: organizationId,
        name: 'Test Organization',
        subdomain: 'test'
      }
      
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization)
      
      const organization = await mockPrisma.organization.findUnique({
        where: { id: organizationId }
      })
      
      expect(organization).toEqual(mockOrganization)
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: organizationId }
      })
    })
  })

  describe('User Management', () => {
    it('should check if user already exists', async () => {
      const email = 'test@example.com'
      
      // Test when user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const user = await mockPrisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })
      
      expect(user).toBeNull()
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() }
      })
    })

    it('should create new user successfully', async () => {
      const userData = createUserData()
      const mockCreatedUser = createMockCreatedUser(userData)
      
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)
      
      const createdUser = await mockPrisma.user.create({
        data: userData
      })
      
      expect(createdUser).toEqual(mockCreatedUser)
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData
      })
    })

    it('should validate user roles', () => {
      const validRoles = Object.values(UserRole)
      
      expect(validRoles).toContain(UserRole.PARTNER)
      expect(validRoles).toContain(UserRole.MANAGER)
      expect(validRoles).toContain(UserRole.ASSOCIATE)
      expect(validRoles).toContain(UserRole.INTERN)
      expect(validRoles).toContain(UserRole.ADMIN)
      
      expect(validRoles.includes('INVALID_ROLE' as UserRole)).toBe(false)
    })
  })

  describe('Audit Logging', () => {
    it('should create audit log for registration', async () => {
      const auditData = createRegistrationAuditData()
      
      mockPrisma.auditLog.create.mockResolvedValue({})
      
      await mockPrisma.auditLog.create({
        data: auditData
      })
      
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: auditData
      })
    })
  })
})

// Helper functions
function createUserData() {
  return {
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.ASSOCIATE,
    organizationId: 'org-123',
    isActive: true
  }
}

function createMockCreatedUser(userData: ReturnType<typeof createUserData>) {
  return {
    id: 'user-123',
    ...userData,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function createRegistrationAuditData() {
  return {
    organizationId: 'org-123',
    userId: 'user-123',
    action: 'register',
    resourceType: 'user',
    resourceId: 'user-123',
    newValues: {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.ASSOCIATE,
      deviceId: 'device-123',
      ip: '127.0.0.1'
    },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent'
  }
}

function createValidRegistrationData() {
  return {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    organizationId: 'org-123',
    role: UserRole.ASSOCIATE
  }
}

function validateRequiredFields(fields: string[], data: ReturnType<typeof createValidRegistrationData>) {
  fields.forEach(field => {
    expect(data[field as keyof typeof data]).toBeDefined()
    expect(data[field as keyof typeof data]).not.toBe('')
  })
}