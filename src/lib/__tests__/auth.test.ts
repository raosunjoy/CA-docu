import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getRolePermissions,
  hasPermission,
  validatePasswordStrength,
  validateEmail,
  generateSecureToken,
  extractBearerToken,
  createSessionToken
} from '../auth'
import { UserRole, Permission } from '@/types'

// Mock environment variables
const originalEnv = process.env
beforeEach(() => {
  process.env = { ...originalEnv }
  process.env.JWT_SECRET = 'test-secret-key'
})

afterEach(() => {
  process.env = originalEnv
})

describe('Authentication Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password correctly', async () => {
      const password = 'testPassword123!'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50)
    })

    it('should verify password against hash correctly', async () => {
      const password = 'testPassword123!'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      const isInvalid = await verifyPassword('wrongPassword', hash)
      
      expect(isValid).toBe(true)
      expect(isInvalid).toBe(false)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2)
      
      // Both should still verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true)
      expect(await verifyPassword(password, hash2)).toBe(true)
    })
  })

  describe('JWT Token Management', () => {
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      role: UserRole.ASSOCIATE,
      orgId: 'org-123',
      permissions: [Permission.TASK_READ, Permission.TASK_CREATE]
    }

    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should verify and decode JWT token correctly', () => {
      const token = generateToken(mockUser)
      const decoded = verifyToken(token)
      
      expect(decoded.sub).toBe(mockUser.sub)
      expect(decoded.email).toBe(mockUser.email)
      expect(decoded.role).toBe(mockUser.role)
      expect(decoded.orgId).toBe(mockUser.orgId)
      expect(decoded.permissions).toEqual(mockUser.permissions)
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    it('should throw error for invalid token', () => {
      expect(() => verifyToken('invalid-token')).toThrow()
    })

    it('should include device ID when provided', () => {
      const deviceId = 'device-123'
      const token = generateToken({ ...mockUser, deviceId })
      const decoded = verifyToken(token)
      
      expect(decoded.deviceId).toBe(deviceId)
    })
  })

  describe('Role-Based Permissions', () => {
    it('should return correct permissions for intern role', () => {
      const permissions = getRolePermissions(UserRole.INTERN)
      
      expect(permissions).toContain(Permission.TASK_READ)
      expect(permissions).toContain(Permission.DOCUMENT_READ)
      expect(permissions).not.toContain(Permission.TASK_DELETE)
      expect(permissions).not.toContain(Permission.USER_MANAGE)
    })

    it('should return correct permissions for associate role', () => {
      const permissions = getRolePermissions(UserRole.ASSOCIATE)
      
      expect(permissions).toContain(Permission.TASK_CREATE)
      expect(permissions).toContain(Permission.TASK_ASSIGN)
      expect(permissions).toContain(Permission.DOCUMENT_UPDATE)
      expect(permissions).not.toContain(Permission.TASK_UNLOCK)
      expect(permissions).not.toContain(Permission.AUDIT_VIEW)
    })

    it('should return correct permissions for manager role', () => {
      const permissions = getRolePermissions(UserRole.MANAGER)
      
      expect(permissions).toContain(Permission.TASK_LOCK)
      expect(permissions).toContain(Permission.DOCUMENT_DELETE)
      expect(permissions).toContain(Permission.USER_MANAGE)
      expect(permissions).not.toContain(Permission.TASK_UNLOCK)
      expect(permissions).not.toContain(Permission.ORG_SETTINGS)
    })

    it('should return correct permissions for partner role', () => {
      const permissions = getRolePermissions(UserRole.PARTNER)
      
      expect(permissions).toContain(Permission.TASK_UNLOCK)
      expect(permissions).toContain(Permission.AUDIT_VIEW)
      expect(permissions).toContain(Permission.ORG_SETTINGS)
    })

    it('should return all permissions for admin role', () => {
      const permissions = getRolePermissions(UserRole.ADMIN)
      const allPermissions = Object.values(Permission)
      
      expect(permissions).toHaveLength(allPermissions.length)
      allPermissions.forEach(permission => {
        expect(permissions).toContain(permission)
      })
    })

    it('should check permissions correctly', () => {
      expect(hasPermission(UserRole.INTERN, Permission.TASK_READ)).toBe(true)
      expect(hasPermission(UserRole.INTERN, Permission.TASK_DELETE)).toBe(false)
      expect(hasPermission(UserRole.PARTNER, Permission.TASK_UNLOCK)).toBe(true)
      expect(hasPermission(UserRole.ASSOCIATE, Permission.USER_MANAGE)).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'StrongPass123!'
      const result = validatePasswordStrength(strongPassword)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak passwords', () => {
      const weakPasswords = getWeakPasswordSamples()
      validateWeakPasswords(weakPasswords)
    })

    function getWeakPasswordSamples() {
      return [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123'
      ]
    }

    function validateWeakPasswords(passwords: string[]) {
      passwords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    }

    it('should provide specific error messages', () => {
      const result = validatePasswordStrength('weak')
      
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })

  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = getValidEmailSamples()
      validateEmailAddresses(validEmails, true)
    })

    function getValidEmailSamples() {
      return [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@subdomain.example.org'
      ]
    }

    function validateEmailAddresses(emails: string[], shouldBeValid: boolean) {
      emails.forEach(email => {
        expect(validateEmail(email)).toBe(shouldBeValid)
      })
    }

    it('should reject invalid email addresses', () => {
      const invalidEmails = getInvalidEmailSamples()
      validateEmailAddresses(invalidEmails, false)
    })

    function getInvalidEmailSamples() {
      return [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com'
      ]
    }
  })

  describe('Utility Functions', () => {
    it('should generate secure random tokens', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()
      
      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
      expect(token1.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should extract bearer token from header', () => {
      const token = 'abc123xyz'
      const authHeader = `Bearer ${token}`
      
      expect(extractBearerToken(authHeader)).toBe(token)
      expect(extractBearerToken('Invalid header')).toBeNull()
      expect(extractBearerToken('')).toBeNull()
      expect(extractBearerToken(undefined)).toBeNull()
    })

    it('should create session token with user data', () => {
      const user = createTestUser()
      const deviceId = 'device-123'
      
      const token = createSessionToken(user, deviceId)
      const decoded = verifyToken(token)
      
      validateSessionTokenData(decoded, user, deviceId)
    })

    function createTestUser() {
      return {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.ASSOCIATE,
        organizationId: 'org-123'
      }
    }

    function validateSessionTokenData(decoded: { sub: string; email: string; role: UserRole; orgId: string; deviceId?: string; permissions: Permission[] }, user: ReturnType<typeof createTestUser>, deviceId: string) {
      expect(decoded.sub).toBe(user.id)
      expect(decoded.email).toBe(user.email)
      expect(decoded.role).toBe(user.role)
      expect(decoded.orgId).toBe(user.organizationId)
      expect(decoded.deviceId).toBe(deviceId)
      expect(decoded.permissions).toEqual(getRolePermissions(user.role))
    }
  })
})