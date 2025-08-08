/**
 * Encryption Service Tests
 * Comprehensive tests for encryption and data protection functionality
 */

import EncryptionService from '../encryption-service'
import crypto from 'crypto'

// Mock crypto functions
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid'),
  randomBytes: jest.fn((size: number) => Buffer.alloc(size, 'mock')),
  pbkdf2Sync: jest.fn(() => Buffer.alloc(32, 'derived-key')),
  createCipher: jest.fn(() => ({
    setAAD: jest.fn(),
    update: jest.fn(() => 'encrypted-'),
    final: jest.fn(() => 'data'),
    getAuthTag: jest.fn(() => Buffer.alloc(16, 'tag')),
  })),
  createDecipher: jest.fn(() => ({
    setAAD: jest.fn(),
    setAuthTag: jest.fn(),
    update: jest.fn(() => 'decrypted-'),
    final: jest.fn(() => 'data'),
  })),
}))

// Mock environment variable
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    MASTER_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('EncryptionService', () => {
  let encryptionService: EncryptionService

  beforeEach(() => {
    encryptionService = new EncryptionService()
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with master key', () => {
      expect(() => new EncryptionService()).not.toThrow()
    })

    it('should throw error if master key is missing', () => {
      delete process.env.MASTER_ENCRYPTION_KEY
      expect(() => new EncryptionService()).toThrow('MASTER_ENCRYPTION_KEY environment variable is required')
      process.env.MASTER_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    })

    it('should throw error if master key is wrong length', () => {
      process.env.MASTER_ENCRYPTION_KEY = 'short'
      expect(() => new EncryptionService()).toThrow('Master encryption key must be 32 bytes (256 bits)')
      process.env.MASTER_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    })
  })

  describe('generateKey', () => {
    it('should generate encryption key with correct properties', async () => {
      const key = await encryptionService.generateKey('document', 365)

      expect(key).toMatchObject({
        id: 'mock-uuid',
        algorithm: 'aes-256-gcm',
        purpose: 'document',
        version: 1,
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date),
      })

      expect(key.key).toBeInstanceOf(Buffer)
      expect(key.salt).toBeInstanceOf(Buffer)
    })

    it('should generate key without expiration if not specified', async () => {
      const key = await encryptionService.generateKey('field')

      expect(key.expiresAt).toBeUndefined()
    })

    it('should generate keys for different purposes', async () => {
      const purposes = ['document', 'field', 'backup', 'communication'] as const

      for (const purpose of purposes) {
        const key = await encryptionService.generateKey(purpose)
        expect(key.purpose).toBe(purpose)
      }
    })
  })

  describe('encryptData', () => {
    it('should encrypt data successfully', async () => {
      const data = 'sensitive information'
      const result = await encryptionService.encryptData(data)

      expect(result).toMatchObject({
        data: 'encrypted-data',
        keyId: 'mock-uuid',
        algorithm: 'aes-256-gcm',
        iv: expect.any(String),
        tag: expect.any(String),
        version: 1,
      })
    })

    it('should encrypt data with provided key ID', async () => {
      const key = await encryptionService.generateKey('document')
      const data = 'sensitive information'
      const result = await encryptionService.encryptData(data, key.id)

      expect(result.keyId).toBe(key.id)
    })

    it('should handle buffer data', async () => {
      const data = Buffer.from('sensitive information')
      const result = await encryptionService.encryptData(data)

      expect(result.data).toBe('encrypted-data')
    })
  })

  describe('decryptData', () => {
    it('should decrypt data successfully', async () => {
      const key = await encryptionService.generateKey('document')
      const encryptedData = {
        data: 'encrypted-data',
        keyId: key.id,
        algorithm: 'aes-256-gcm',
        iv: 'mock-iv',
        tag: 'mock-tag',
        version: 1,
      }

      const result = await encryptionService.decryptData(encryptedData)

      expect(result).toBe('decrypted-data')
    })

    it('should throw error for unknown key ID', async () => {
      const encryptedData = {
        data: 'encrypted-data',
        keyId: 'unknown-key',
        algorithm: 'aes-256-gcm',
        iv: 'mock-iv',
        tag: 'mock-tag',
        version: 1,
      }

      await expect(encryptionService.decryptData(encryptedData))
        .rejects.toThrow('Encryption key not found: unknown-key')
    })
  })

  describe('encryptDocument', () => {
    it('should encrypt document with configuration', async () => {
      const documentBuffer = Buffer.from('document content')
      const config = {
        encryptionLevel: 'high' as const,
        keyRotationDays: 365,
        accessLogging: true,
        watermarking: true,
        dlpEnabled: true,
      }

      const result = await encryptionService.encryptDocument(documentBuffer, config, 'user-123')

      expect(result).toMatchObject({
        encryptedData: {
          data: 'encrypted-data',
          keyId: 'mock-uuid',
          algorithm: 'aes-256-gcm',
          iv: expect.any(String),
          tag: expect.any(String),
          version: 1,
        },
        keyId: 'mock-uuid',
        watermark: expect.any(String),
      })
    })

    it('should not include watermark if disabled', async () => {
      const documentBuffer = Buffer.from('document content')
      const config = {
        encryptionLevel: 'standard' as const,
        keyRotationDays: 365,
        accessLogging: false,
        watermarking: false,
        dlpEnabled: false,
      }

      const result = await encryptionService.encryptDocument(documentBuffer, config, 'user-123')

      expect(result.watermark).toBeUndefined()
    })
  })

  describe('encryptSensitiveFields', () => {
    it('should encrypt sensitive fields in object', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        ssn: '123-45-6789',
        normalField: 'not sensitive',
      }

      const result = await encryptionService.encryptSensitiveFields(data, 'org-123')

      expect(result.encryptedFields).toContain('password')
      expect(result.encryptedFields).toContain('ssn')
      expect(result.encryptedFields).not.toContain('name')
      expect(result.encryptedFields).not.toContain('normalField')

      expect(result.encryptedData.password).toMatchObject({
        _encrypted: true,
        data: 'encrypted-data',
        keyId: 'mock-uuid',
        algorithm: 'aes-256-gcm',
      })

      expect(result.encryptedData.normalField).toBe('not sensitive')
    })

    it('should return key IDs for encrypted fields', async () => {
      const data = {
        password: 'secret123',
        token: 'abc123',
      }

      const result = await encryptionService.encryptSensitiveFields(data, 'org-123')

      expect(result.keyIds).toMatchObject({
        password: 'mock-uuid',
        token: 'mock-uuid',
      })
    })

    it('should handle empty or null values', async () => {
      const data = {
        password: '',
        token: null,
        secret: undefined,
        normalField: 'value',
      }

      const result = await encryptionService.encryptSensitiveFields(data, 'org-123')

      expect(result.encryptedFields).toHaveLength(0)
      expect(result.encryptedData).toEqual(data)
    })
  })

  describe('decryptSensitiveFields', () => {
    it('should decrypt encrypted fields in object', async () => {
      const data = {
        name: 'John Doe',
        password: {
          _encrypted: true,
          data: 'encrypted-data',
          keyId: 'mock-uuid',
          algorithm: 'aes-256-gcm',
          iv: 'mock-iv',
          tag: 'mock-tag',
          version: 1,
        },
        normalField: 'not encrypted',
      }

      // First generate a key so it exists in cache
      await encryptionService.generateKey('field')

      const result = await encryptionService.decryptSensitiveFields(data, 'user-123', 'org-123')

      expect(result.password).toBe('decrypted-data')
      expect(result.normalField).toBe('not encrypted')
      expect(result.name).toBe('John Doe')
    })

    it('should handle decryption failures gracefully', async () => {
      const data = {
        password: {
          _encrypted: true,
          data: 'encrypted-data',
          keyId: 'unknown-key',
          algorithm: 'aes-256-gcm',
          iv: 'mock-iv',
          tag: 'mock-tag',
          version: 1,
        },
      }

      const result = await encryptionService.decryptSensitiveFields(data, 'user-123', 'org-123')

      expect(result.password).toBe('[DECRYPTION_FAILED]')
    })
  })

  describe('maskSensitiveData', () => {
    it('should mask sensitive data partially', () => {
      const data = {
        email: 'john.doe@example.com',
        phone: '1234567890',
        ssn: '123-45-6789',
        password: 'secret123',
        normalField: 'not sensitive',
      }

      const result = encryptionService.maskSensitiveData(data, 'partial')

      expect(result.email).toBe('jo*******@example.com')
      expect(result.phone).toBe('******7890')
      expect(result.ssn).toBe('******6789')
      expect(result.password).toBe('se*****23')
      expect(result.normalField).toBe('not sensitive')
    })

    it('should mask sensitive data fully', () => {
      const data = {
        email: 'john.doe@example.com',
        password: 'secret123',
        normalField: 'not sensitive',
      }

      const result = encryptionService.maskSensitiveData(data, 'full')

      expect(result.email).toBe('********')
      expect(result.password).toBe('********')
      expect(result.normalField).toBe('not sensitive')
    })

    it('should handle short values', () => {
      const data = {
        password: 'ab',
        ssn: '123',
      }

      const result = encryptionService.maskSensitiveData(data, 'partial')

      expect(result.password).toBe('**')
      expect(result.ssn).toBe('1*3')
    })
  })

  describe('anonymizeData', () => {
    it('should replace sensitive data with synthetic values', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        ssn: '123-45-6789',
        password: 'secret123',
        normalField: 'not sensitive',
      }

      const result = encryptionService.anonymizeData(data)

      expect(result.name).toMatch(/^(John Doe|Jane Smith|Bob Johnson|Alice Brown|Charlie Wilson)$/)
      expect(result.email).toMatch(/^user\d+@example\.com$/)
      expect(result.phone).toMatch(/^\+1\d{10}$/)
      expect(result.ssn).toMatch(/^\d{3}-\d{2}-\d{4}$/)
      expect(result.password).toMatch(/^SYNTHETIC_[a-z0-9]+$/)
      expect(result.normalField).toBe('not sensitive')
    })
  })

  describe('rotateKeys', () => {
    it('should rotate expired keys', async () => {
      // Create some keys with past expiration dates
      const expiredKey1 = await encryptionService.generateKey('document', -1) // Expired yesterday
      const expiredKey2 = await encryptionService.generateKey('field', -1)
      const currentKey = await encryptionService.generateKey('backup', 365)

      // Manually set expiration dates to past
      expiredKey1.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
      expiredKey2.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const result = await encryptionService.rotateKeys('org-123')

      expect(result.rotatedKeys).toHaveLength(2)
      expect(result.newKeys).toHaveLength(2)
    })

    it('should rotate keys for specific purpose', async () => {
      const documentKey = await encryptionService.generateKey('document', -1)
      const fieldKey = await encryptionService.generateKey('field', -1)

      // Set expiration dates to past
      documentKey.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000)
      fieldKey.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const result = await encryptionService.rotateKeys('org-123', 'document')

      expect(result.rotatedKeys).toHaveLength(1)
      expect(result.newKeys).toHaveLength(1)
    })
  })

  describe('generateEncryptionComplianceReport', () => {
    it('should generate compliance report', async () => {
      // Create some keys with different statuses
      await encryptionService.generateKey('document', 365) // Current
      await encryptionService.generateKey('field', 15) // Expiring soon
      const expiredKey = await encryptionService.generateKey('backup', -1) // Expired
      expiredKey.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const report = await encryptionService.generateEncryptionComplianceReport('org-123')

      expect(report).toMatchObject({
        totalEncryptedFields: expect.any(Number),
        totalEncryptedDocuments: expect.any(Number),
        keyRotationStatus: {
          current: expect.any(Number),
          expired: expect.any(Number),
          expiringSoon: expect.any(Number),
        },
        complianceScore: expect.any(Number),
        recommendations: expect.any(Array),
      })

      expect(report.complianceScore).toBeGreaterThanOrEqual(0)
      expect(report.complianceScore).toBeLessThanOrEqual(100)
    })

    it('should provide recommendations for expired keys', async () => {
      const expiredKey = await encryptionService.generateKey('document', -1)
      expiredKey.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const report = await encryptionService.generateEncryptionComplianceReport('org-123')

      expect(report.recommendations).toContain(
        expect.stringContaining('expired encryption keys immediately')
      )
    })

    it('should provide recommendations for expiring keys', async () => {
      await encryptionService.generateKey('document', 15) // Expiring in 15 days

      const report = await encryptionService.generateEncryptionComplianceReport('org-123')

      expect(report.recommendations).toContain(
        expect.stringContaining('keys expiring within 30 days')
      )
    })
  })

  describe('sensitive field detection', () => {
    it('should detect password fields', () => {
      const testFields = [
        'password',
        'userPassword',
        'currentPassword',
        'newPassword',
        'PASSWORD',
      ]

      testFields.forEach(field => {
        const data = { [field]: 'secret' }
        const result = encryptionService['isSensitiveField'](field)
        expect(result).toBe(true)
      })
    })

    it('should detect SSN fields', () => {
      const testFields = [
        'ssn',
        'socialSecurityNumber',
        'social_security_number',
        'SSN',
      ]

      testFields.forEach(field => {
        const result = encryptionService['isSensitiveField'](field)
        expect(result).toBe(true)
      })
    })

    it('should detect PAN fields', () => {
      const testFields = [
        'pan',
        'panNumber',
        'pan_number',
        'PAN',
      ]

      testFields.forEach(field => {
        const result = encryptionService['isSensitiveField'](field)
        expect(result).toBe(true)
      })
    })

    it('should not detect non-sensitive fields', () => {
      const testFields = [
        'name',
        'description',
        'title',
        'content',
        'normalField',
      ]

      testFields.forEach(field => {
        const result = encryptionService['isSensitiveField'](field)
        expect(result).toBe(false)
      })
    })
  })

  describe('PII field detection', () => {
    it('should detect email fields', () => {
      const testFields = [
        'email',
        'emailAddress',
        'userEmail',
        'EMAIL',
      ]

      testFields.forEach(field => {
        const result = encryptionService['isPIIField'](field)
        expect(result).toBe(true)
      })
    })

    it('should detect phone fields', () => {
      const testFields = [
        'phone',
        'phoneNumber',
        'mobile',
        'mobileNumber',
        'PHONE',
      ]

      testFields.forEach(field => {
        const result = encryptionService['isPIIField'](field)
        expect(result).toBe(true)
      })
    })

    it('should detect name fields', () => {
      const testFields = [
        'name',
        'firstName',
        'lastName',
        'fullName',
        'NAME',
      ]

      testFields.forEach(field => {
        const result = encryptionService['isPIIField'](field)
        expect(result).toBe(true)
      })
    })
  })
})