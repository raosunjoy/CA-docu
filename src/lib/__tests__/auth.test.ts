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
import jwt from 'jsonwebtoken'

// Mock jwt module
jest.mock('jsonwebtoken')
const mockJwt = jwt as jest.Mocked<typeof jwt>

describe('Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(50) // bcrypt hashes are typically 60 chars
    })

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', async () => {
      const hash = await hashPassword('')
      expect(hash).toBeDefined()
    })

    it('should handle special characters in password', async () => {
      const password = 'test!@#$%^&*()_+{}|:<>?[]\\;\'",./`~'
      const hash = await hashPassword(password)
      expect(hash).toBeDefined()
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword456'
      const hash = await hashPassword(password)
      const isValid = await verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })

    it('should handle empty password verification', async () => {
      const hash = await hashPassword('somePassword')
      const isValid = await verifyPassword('', hash)

      expect(isValid).toBe(false)
    })

    it('should handle invalid hash format', async () => {
      const isValid = await verifyPassword('password', 'invalid-hash')
      expect(isValid).toBe(false)
    })
  })

  describe('generateToken', () => {
    beforeEach(() => {
      mockJwt.sign.mockReturnValue('mock-jwt-token')
    })

    it('should generate token with correct payload', () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.ASSOCIATE,
        orgId: 'org-1',
        permissions: [Permission.TASK_READ, Permission.TASK_UPDATE]
      }

      const token = generateToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      )
      expect(token).toBe('mock-jwt-token')
    })

    it('should use default JWT_SECRET when not provided', () => {
      process.env = { ...process.env }
      delete process.env.JWT_SECRET
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.ASSOCIATE,
        orgId: 'org-1',
        permissions: []
      }

      generateToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      )
    })

    it('should use default expiration when not provided', () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        role: UserRole.ASSOCIATE,
        orgId: 'org-1',
        permissions: []
      }

      generateToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      )
    })
  })

  describe('verifyToken', () => {
    const mockPayload = {
      sub: 'user-1',
      email: 'test@example.com',
      role: UserRole.ASSOCIATE,
      orgId: 'org-1',
      permissions: [Permission.TASK_READ],
      iat: 1234567890,
      exp: 1234567890 + 7 * 24 * 60 * 60
    }

    it('should verify valid token', () => {
      mockJwt.verify.mockReturnValue(mockPayload)

      const result = verifyToken('valid-token')

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'your-secret-key-change-in-production')
      expect(result).toEqual(mockPayload)
    })

    it('should throw error for invalid token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      expect(() => verifyToken('invalid-token')).toThrow('Invalid token')
    })

    it('should throw error for expired token', () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Token expired')
      })

      expect(() => verifyToken('expired-token')).toThrow('Token expired')
    })
  })

  describe('getRolePermissions', () => {
    it('should return correct permissions for INTERN', () => {
      const permissions = getRolePermissions(UserRole.INTERN)
      
      expect(permissions).toContain(Permission.TASK_READ)
      expect(permissions).toContain(Permission.TASK_UPDATE)
      expect(permissions).toContain(Permission.DOCUMENT_READ)
      expect(permissions).toContain(Permission.DOCUMENT_UPLOAD)
      expect(permissions).toContain(Permission.TAG_APPLY)
      expect(permissions).not.toContain(Permission.TASK_DELETE)
      expect(permissions).not.toContain(Permission.USER_MANAGE)
    })

    it('should return correct permissions for ASSOCIATE', () => {
      const permissions = getRolePermissions(UserRole.ASSOCIATE)
      
      expect(permissions).toContain(Permission.TASK_CREATE)
      expect(permissions).toContain(Permission.TASK_READ)
      expect(permissions).toContain(Permission.TASK_UPDATE)
      expect(permissions).toContain(Permission.TASK_ASSIGN)
      expect(permissions).toContain(Permission.DOCUMENT_UPLOAD)
      expect(permissions).toContain(Permission.TAG_CREATE)
      expect(permissions).not.toContain(Permission.TASK_DELETE)
      expect(permissions).not.toContain(Permission.USER_MANAGE)
    })

    it('should return correct permissions for MANAGER', () => {
      const permissions = getRolePermissions(UserRole.MANAGER)
      
      expect(permissions).toContain(Permission.TASK_DELETE)
      expect(permissions).toContain(Permission.DOCUMENT_DELETE)
      expect(permissions).toContain(Permission.TAG_MANAGE)
      expect(permissions).toContain(Permission.USER_MANAGE)
      expect(permissions).not.toContain(Permission.AUDIT_VIEW)
      expect(permissions).not.toContain(Permission.ORG_SETTINGS)
    })

    it('should return correct permissions for PARTNER', () => {
      const permissions = getRolePermissions(UserRole.PARTNER)
      
      expect(permissions).toContain(Permission.TASK_UNLOCK)
      expect(permissions).toContain(Permission.DOCUMENT_DOWNLOAD)
      expect(permissions).toContain(Permission.AUDIT_VIEW)
      expect(permissions).toContain(Permission.ORG_SETTINGS)
      expect(permissions).not.toContain(Permission.SYSTEM_ADMIN)
    })

    it('should return all permissions for ADMIN', () => {
      const permissions = getRolePermissions(UserRole.ADMIN)
      const allPermissions = Object.values(Permission)
      
      expect(permissions).toEqual(allPermissions)
    })

    it('should return empty array for invalid role', () => {
      const permissions = getRolePermissions('INVALID_ROLE' as UserRole)
      expect(permissions).toEqual([])
    })
  })

  describe('hasPermission', () => {
    it('should return true when user has permission', () => {
      const result = hasPermission(UserRole.ASSOCIATE, Permission.TASK_CREATE)
      expect(result).toBe(true)
    })

    it('should return false when user does not have permission', () => {
      const result = hasPermission(UserRole.INTERN, Permission.TASK_DELETE)
      expect(result).toBe(false)
    })

    it('should return true for ADMIN with any permission', () => {
      const result = hasPermission(UserRole.ADMIN, Permission.AUDIT_VIEW)
      expect(result).toBe(true)
    })

    it('should return false for invalid role', () => {
      const result = hasPermission('INVALID_ROLE' as UserRole, Permission.TASK_READ)
      expect(result).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject password too short', () => {
      const result = validatePasswordStrength('Short1!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject password without uppercase', () => {
      const result = validatePasswordStrength('lowercase123!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject password without lowercase', () => {
      const result = validatePasswordStrength('UPPERCASE123!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbers!')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('NoSpecial123')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('missing@domain')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('user@')).toBe(false)
      expect(validateEmail('')).toBe(false)
      expect(validateEmail('user name@domain.com')).toBe(false)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate secure token', () => {
      const token = generateSecureToken()
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes = 64 hex chars
    })

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()
      
      expect(token1).not.toBe(token2)
    })

    it('should generate hex string', () => {
      const token = generateSecureToken()
      expect(/^[a-f0-9]+$/.test(token)).toBe(true)
    })
  })

  describe('extractBearerToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = extractBearerToken('Bearer abc123token')
      expect(token).toBe('abc123token')
    })

    it('should return null for missing header', () => {
      const token = extractBearerToken(undefined)
      expect(token).toBeNull()
    })

    it('should return null for non-Bearer header', () => {
      const token = extractBearerToken('Basic abc123')
      expect(token).toBeNull()
    })

    it('should return empty string for malformed Bearer header', () => {
      const token = extractBearerToken('Bearer ')
      expect(token).toBe('')
    })

    it('should handle Bearer with extra spaces', () => {
      const token = extractBearerToken('Bearer  token-with-spaces')
      expect(token).toBe(' token-with-spaces')
    })
  })

  describe('createSessionToken', () => {
    beforeEach(() => {
      mockJwt.sign.mockReturnValue('session-token')
    })

    it('should create session token with user data', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.ASSOCIATE,
        organizationId: 'org-1'
      }

      const token = createSessionToken(user)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
          role: UserRole.ASSOCIATE,
          orgId: 'org-1',
          permissions: getRolePermissions(UserRole.ASSOCIATE)
        },
        'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      )
      expect(token).toBe('session-token')
    })

    it('should create session token with device ID', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.MANAGER,
        organizationId: 'org-1'
      }
      const deviceId = 'device-123'

      const token = createSessionToken(user, deviceId)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
          role: UserRole.MANAGER,
          orgId: 'org-1',
          permissions: getRolePermissions(UserRole.MANAGER),
          deviceId: 'device-123'
        },
        'your-secret-key-change-in-production',
        { expiresIn: '7d' }
      )
      expect(token).toBe('session-token')
    })

    it('should include correct permissions based on role', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: UserRole.PARTNER,
        organizationId: 'org-1'
      }

      createSessionToken(user)

      const expectedPermissions = getRolePermissions(UserRole.PARTNER)
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expectedPermissions
        }),
        expect.any(String),
        expect.any(Object)
      )
    })
  })
})