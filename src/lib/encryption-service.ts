/**
 * Advanced Encryption and Data Protection Service
 * Provides end-to-end encryption, field-level encryption, and key management
 */

import crypto from 'crypto'
import { z } from 'zod'

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_DERIVATION_ALGORITHM = 'pbkdf2'
const KEY_DERIVATION_ITERATIONS = 100000
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16

// Sensitive field patterns for automatic detection
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /ssn/i,
  /social.security/i,
  /pan/i,
  /aadhar/i,
  /aadhaar/i,
  /credit.card/i,
  /bank.account/i,
  /routing.number/i,
  /passport/i,
  /license/i,
  /tax.id/i,
  /ein/i,
  /gstin/i,
  /cin/i,
]

// PII field patterns
const PII_FIELD_PATTERNS = [
  /email/i,
  /phone/i,
  /mobile/i,
  /address/i,
  /name/i,
  /birth/i,
  /dob/i,
  /age/i,
  /gender/i,
  /nationality/i,
]

export interface EncryptionKey {
  id: string
  algorithm: string
  key: Buffer
  iv?: Buffer
  salt?: Buffer
  createdAt: Date
  expiresAt?: Date
  version: number
  purpose: 'document' | 'field' | 'backup' | 'communication'
}

export interface EncryptedData {
  data: string
  keyId: string
  algorithm: string
  iv: string
  tag?: string
  version: number
}

export interface FieldEncryptionConfig {
  fieldName: string
  encryptionLevel: 'none' | 'standard' | 'high' | 'maximum'
  keyRotationDays: number
  accessLogging: boolean
}

export interface DocumentEncryptionConfig {
  encryptionLevel: 'none' | 'standard' | 'high' | 'maximum'
  keyRotationDays: number
  accessLogging: boolean
  watermarking: boolean
  dlpEnabled: boolean
}

export class EncryptionService {
  private masterKey: Buffer
  private keyCache: Map<string, EncryptionKey> = new Map()
  private fieldConfigs: Map<string, FieldEncryptionConfig> = new Map()

  constructor() {
    // In production, this should come from a secure key management service
    const masterKeyHex = process.env.MASTER_ENCRYPTION_KEY
    if (!masterKeyHex) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required')
    }
    
    this.masterKey = Buffer.from(masterKeyHex, 'hex')
    if (this.masterKey.length !== 32) {
      throw new Error('Master encryption key must be 32 bytes (256 bits)')
    }

    // Initialize default field configurations
    this.initializeDefaultConfigs()
  }

  /**
   * Generate a new encryption key
   */
  async generateKey(purpose: EncryptionKey['purpose'], expirationDays?: number): Promise<EncryptionKey> {
    const keyId = crypto.randomUUID()
    const key = crypto.randomBytes(32) // 256-bit key
    const salt = crypto.randomBytes(SALT_LENGTH)
    
    const expiresAt = expirationDays 
      ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
      : undefined

    const encryptionKey: EncryptionKey = {
      id: keyId,
      algorithm: ENCRYPTION_ALGORITHM,
      key,
      salt,
      createdAt: new Date(),
      expiresAt,
      version: 1,
      purpose,
    }

    // Cache the key
    this.keyCache.set(keyId, encryptionKey)

    return encryptionKey
  }

  /**
   * Derive key from password using PBKDF2
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, KEY_DERIVATION_ITERATIONS, 32, 'sha256')
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encryptData(data: string | Buffer, keyId?: string): Promise<EncryptedData> {
    let encryptionKey: EncryptionKey

    if (keyId) {
      encryptionKey = this.keyCache.get(keyId)
      if (!encryptionKey) {
        throw new Error(`Encryption key not found: ${keyId}`)
      }
    } else {
      // Generate a new key for this data
      encryptionKey = await this.generateKey('document')
    }

    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, encryptionKey.key)
    cipher.setAAD(Buffer.from(encryptionKey.id)) // Additional authenticated data

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()

    return {
      data: encrypted,
      keyId: encryptionKey.id,
      algorithm: ENCRYPTION_ALGORITHM,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      version: 1,
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    const encryptionKey = this.keyCache.get(encryptedData.keyId)
    if (!encryptionKey) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`)
    }

    const decipher = crypto.createDecipher(encryptedData.algorithm, encryptionKey.key)
    decipher.setAAD(Buffer.from(encryptedData.keyId))
    
    if (encryptedData.tag) {
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
    }

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Encrypt document with end-to-end encryption
   */
  async encryptDocument(
    documentBuffer: Buffer,
    config: DocumentEncryptionConfig,
    userId: string
  ): Promise<{
    encryptedData: EncryptedData
    keyId: string
    watermark?: string
  }> {
    // Generate document-specific key
    const documentKey = await this.generateKey('document', config.keyRotationDays)

    // Apply watermarking if enabled
    let processedBuffer = documentBuffer
    let watermark: string | undefined

    if (config.watermarking) {
      watermark = this.generateWatermark(userId)
      processedBuffer = await this.applyWatermark(documentBuffer, watermark)
    }

    // Encrypt the document
    const encryptedData = await this.encryptData(processedBuffer, documentKey.id)

    // Log access if required
    if (config.accessLogging) {
      await this.logEncryptionAccess('ENCRYPT_DOCUMENT', documentKey.id, userId)
    }

    return {
      encryptedData,
      keyId: documentKey.id,
      watermark,
    }
  }

  /**
   * Decrypt document
   */
  async decryptDocument(
    encryptedData: EncryptedData,
    userId: string,
    config?: DocumentEncryptionConfig
  ): Promise<Buffer> {
    // Log access if required
    if (config?.accessLogging) {
      await this.logEncryptionAccess('DECRYPT_DOCUMENT', encryptedData.keyId, userId)
    }

    const decryptedData = await this.decryptData(encryptedData)
    return Buffer.from(decryptedData, 'utf8')
  }

  /**
   * Encrypt sensitive fields in an object
   */
  async encryptSensitiveFields(
    data: Record<string, any>,
    organizationId: string
  ): Promise<{
    encryptedData: Record<string, any>
    encryptedFields: string[]
    keyIds: Record<string, string>
  }> {
    const encryptedData = { ...data }
    const encryptedFields: string[] = []
    const keyIds: Record<string, string> = {}

    for (const [fieldName, value] of Object.entries(data)) {
      if (this.isSensitiveField(fieldName) && typeof value === 'string' && value.length > 0) {
        const config = this.getFieldConfig(fieldName, organizationId)
        
        if (config.encryptionLevel !== 'none') {
          const fieldKey = await this.generateKey('field', config.keyRotationDays)
          const encrypted = await this.encryptData(value, fieldKey.id)
          
          encryptedData[fieldName] = {
            _encrypted: true,
            data: encrypted.data,
            keyId: encrypted.keyId,
            algorithm: encrypted.algorithm,
            iv: encrypted.iv,
            tag: encrypted.tag,
            version: encrypted.version,
          }
          
          encryptedFields.push(fieldName)
          keyIds[fieldName] = fieldKey.id

          // Log field encryption if required
          if (config.accessLogging) {
            await this.logEncryptionAccess('ENCRYPT_FIELD', fieldKey.id, 'system', {
              fieldName,
              organizationId,
            })
          }
        }
      }
    }

    return {
      encryptedData,
      encryptedFields,
      keyIds,
    }
  }

  /**
   * Decrypt sensitive fields in an object
   */
  async decryptSensitiveFields(
    data: Record<string, any>,
    userId: string,
    organizationId: string
  ): Promise<Record<string, any>> {
    const decryptedData = { ...data }

    for (const [fieldName, value] of Object.entries(data)) {
      if (this.isEncryptedField(value)) {
        const config = this.getFieldConfig(fieldName, organizationId)
        
        const encryptedData: EncryptedData = {
          data: value.data,
          keyId: value.keyId,
          algorithm: value.algorithm,
          iv: value.iv,
          tag: value.tag,
          version: value.version,
        }

        try {
          const decryptedValue = await this.decryptData(encryptedData)
          decryptedData[fieldName] = decryptedValue

          // Log field decryption if required
          if (config.accessLogging) {
            await this.logEncryptionAccess('DECRYPT_FIELD', value.keyId, userId, {
              fieldName,
              organizationId,
            })
          }
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldName}:`, error)
          decryptedData[fieldName] = '[DECRYPTION_FAILED]'
        }
      }
    }

    return decryptedData
  }

  /**
   * Mask sensitive data for display
   */
  maskSensitiveData(
    data: Record<string, any>,
    maskingLevel: 'partial' | 'full' = 'partial'
  ): Record<string, any> {
    const maskedData = { ...data }

    for (const [fieldName, value] of Object.entries(data)) {
      if (this.isSensitiveField(fieldName) && typeof value === 'string') {
        maskedData[fieldName] = this.maskValue(value, fieldName, maskingLevel)
      } else if (this.isPIIField(fieldName) && typeof value === 'string') {
        maskedData[fieldName] = this.maskValue(value, fieldName, 'partial')
      }
    }

    return maskedData
  }

  /**
   * Anonymize data by replacing with synthetic values
   */
  anonymizeData(data: Record<string, any>): Record<string, any> {
    const anonymizedData = { ...data }

    for (const [fieldName, value] of Object.entries(data)) {
      if (this.isSensitiveField(fieldName)) {
        anonymizedData[fieldName] = this.generateSyntheticValue(fieldName)
      } else if (this.isPIIField(fieldName)) {
        anonymizedData[fieldName] = this.generateSyntheticValue(fieldName)
      }
    }

    return anonymizedData
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(organizationId: string, keyPurpose?: EncryptionKey['purpose']): Promise<{
    rotatedKeys: string[]
    newKeys: string[]
  }> {
    const rotatedKeys: string[] = []
    const newKeys: string[] = []

    // Find keys that need rotation
    const keysToRotate = Array.from(this.keyCache.values()).filter(key => {
      if (keyPurpose && key.purpose !== keyPurpose) return false
      if (!key.expiresAt) return false
      return key.expiresAt <= new Date()
    })

    for (const oldKey of keysToRotate) {
      // Generate new key
      const newKey = await this.generateKey(oldKey.purpose)
      
      // TODO: Re-encrypt data with new key (this would require database operations)
      // This is a complex operation that would need to be implemented based on specific requirements
      
      rotatedKeys.push(oldKey.id)
      newKeys.push(newKey.id)

      // Remove old key from cache
      this.keyCache.delete(oldKey.id)
    }

    return {
      rotatedKeys,
      newKeys,
    }
  }

  /**
   * Generate compliance report for encryption usage
   */
  async generateEncryptionComplianceReport(organizationId: string): Promise<{
    totalEncryptedFields: number
    totalEncryptedDocuments: number
    keyRotationStatus: {
      current: number
      expired: number
      expiringSoon: number
    }
    complianceScore: number
    recommendations: string[]
  }> {
    // This would typically query the database for actual usage statistics
    // For now, we'll return mock data structure
    
    const keys = Array.from(this.keyCache.values())
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const keyRotationStatus = {
      current: keys.filter(k => !k.expiresAt || k.expiresAt > thirtyDaysFromNow).length,
      expired: keys.filter(k => k.expiresAt && k.expiresAt <= now).length,
      expiringSoon: keys.filter(k => k.expiresAt && k.expiresAt > now && k.expiresAt <= thirtyDaysFromNow).length,
    }

    const complianceScore = this.calculateComplianceScore(keyRotationStatus)
    const recommendations = this.generateComplianceRecommendations(keyRotationStatus)

    return {
      totalEncryptedFields: 0, // Would be calculated from database
      totalEncryptedDocuments: 0, // Would be calculated from database
      keyRotationStatus,
      complianceScore,
      recommendations,
    }
  }

  // Private helper methods

  private initializeDefaultConfigs(): void {
    // Default configurations for different field types
    const defaultConfigs: Array<[string, FieldEncryptionConfig]> = [
      ['password', { fieldName: 'password', encryptionLevel: 'maximum', keyRotationDays: 90, accessLogging: true }],
      ['ssn', { fieldName: 'ssn', encryptionLevel: 'maximum', keyRotationDays: 365, accessLogging: true }],
      ['pan', { fieldName: 'pan', encryptionLevel: 'maximum', keyRotationDays: 365, accessLogging: true }],
      ['aadhar', { fieldName: 'aadhar', encryptionLevel: 'maximum', keyRotationDays: 365, accessLogging: true }],
      ['credit_card', { fieldName: 'credit_card', encryptionLevel: 'maximum', keyRotationDays: 180, accessLogging: true }],
      ['bank_account', { fieldName: 'bank_account', encryptionLevel: 'high', keyRotationDays: 180, accessLogging: true }],
      ['email', { fieldName: 'email', encryptionLevel: 'standard', keyRotationDays: 365, accessLogging: false }],
      ['phone', { fieldName: 'phone', encryptionLevel: 'standard', keyRotationDays: 365, accessLogging: false }],
    ]

    defaultConfigs.forEach(([key, config]) => {
      this.fieldConfigs.set(key, config)
    })
  }

  private isSensitiveField(fieldName: string): boolean {
    return SENSITIVE_FIELD_PATTERNS.some(pattern => pattern.test(fieldName))
  }

  private isPIIField(fieldName: string): boolean {
    return PII_FIELD_PATTERNS.some(pattern => pattern.test(fieldName))
  }

  private isEncryptedField(value: any): boolean {
    return (
      typeof value === 'object' &&
      value !== null &&
      value._encrypted === true &&
      typeof value.data === 'string' &&
      typeof value.keyId === 'string'
    )
  }

  private getFieldConfig(fieldName: string, organizationId: string): FieldEncryptionConfig {
    // Try to find specific config for this field
    const config = this.fieldConfigs.get(fieldName.toLowerCase())
    if (config) return config

    // Try to find config by pattern matching
    for (const [pattern, config] of this.fieldConfigs.entries()) {
      if (fieldName.toLowerCase().includes(pattern)) {
        return config
      }
    }

    // Default config for sensitive fields
    if (this.isSensitiveField(fieldName)) {
      return {
        fieldName,
        encryptionLevel: 'high',
        keyRotationDays: 365,
        accessLogging: true,
      }
    }

    // Default config for PII fields
    if (this.isPIIField(fieldName)) {
      return {
        fieldName,
        encryptionLevel: 'standard',
        keyRotationDays: 365,
        accessLogging: false,
      }
    }

    // Default config for other fields
    return {
      fieldName,
      encryptionLevel: 'none',
      keyRotationDays: 365,
      accessLogging: false,
    }
  }

  private maskValue(value: string, fieldName: string, level: 'partial' | 'full'): string {
    if (level === 'full') {
      return '*'.repeat(Math.min(value.length, 8))
    }

    // Partial masking based on field type
    if (fieldName.toLowerCase().includes('email')) {
      const [local, domain] = value.split('@')
      if (domain) {
        const maskedLocal = local.length > 2 
          ? local.substring(0, 2) + '*'.repeat(local.length - 2)
          : '*'.repeat(local.length)
        return `${maskedLocal}@${domain}`
      }
    }

    if (fieldName.toLowerCase().includes('phone')) {
      if (value.length > 4) {
        return '*'.repeat(value.length - 4) + value.slice(-4)
      }
    }

    if (fieldName.toLowerCase().includes('ssn') || fieldName.toLowerCase().includes('pan')) {
      if (value.length > 4) {
        return '*'.repeat(value.length - 4) + value.slice(-4)
      }
    }

    // Default partial masking
    if (value.length > 4) {
      return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2)
    } else if (value.length > 2) {
      return value.substring(0, 1) + '*'.repeat(value.length - 2) + value.slice(-1)
    } else {
      return '*'.repeat(value.length)
    }
  }

  private generateSyntheticValue(fieldName: string): string {
    const lowerFieldName = fieldName.toLowerCase()

    if (lowerFieldName.includes('email')) {
      return `user${Math.floor(Math.random() * 10000)}@example.com`
    }

    if (lowerFieldName.includes('phone')) {
      return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`
    }

    if (lowerFieldName.includes('name')) {
      const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson']
      return names[Math.floor(Math.random() * names.length)]
    }

    if (lowerFieldName.includes('ssn')) {
      return `${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000 + 1000)}`
    }

    if (lowerFieldName.includes('pan')) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const numbers = '0123456789'
      return Array.from({ length: 5 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') +
             Array.from({ length: 4 }, () => numbers[Math.floor(Math.random() * numbers.length)]).join('') +
             letters[Math.floor(Math.random() * letters.length)]
    }

    // Default synthetic value
    return `SYNTHETIC_${Math.random().toString(36).substring(2, 15)}`
  }

  private generateWatermark(userId: string): string {
    const timestamp = new Date().toISOString()
    return `${userId}-${timestamp}-${crypto.randomBytes(4).toString('hex')}`
  }

  private async applyWatermark(documentBuffer: Buffer, watermark: string): Promise<Buffer> {
    // This is a simplified implementation
    // In a real system, you would use a proper document processing library
    // to embed watermarks in PDFs, images, etc.
    
    const watermarkBuffer = Buffer.from(`\n<!-- WATERMARK: ${watermark} -->`, 'utf8')
    return Buffer.concat([documentBuffer, watermarkBuffer])
  }

  private async logEncryptionAccess(
    action: string,
    keyId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // This would integrate with the audit service
    console.log('Encryption access log:', {
      action,
      keyId,
      userId,
      timestamp: new Date().toISOString(),
      metadata,
    })
  }

  private calculateComplianceScore(keyRotationStatus: any): number {
    const total = keyRotationStatus.current + keyRotationStatus.expired + keyRotationStatus.expiringSoon
    if (total === 0) return 100

    const currentScore = (keyRotationStatus.current / total) * 100
    const expiringSoonPenalty = (keyRotationStatus.expiringSoon / total) * 20
    const expiredPenalty = (keyRotationStatus.expired / total) * 50

    return Math.max(0, Math.round(currentScore - expiringSoonPenalty - expiredPenalty))
  }

  private generateComplianceRecommendations(keyRotationStatus: any): string[] {
    const recommendations: string[] = []

    if (keyRotationStatus.expired > 0) {
      recommendations.push(`Rotate ${keyRotationStatus.expired} expired encryption keys immediately`)
    }

    if (keyRotationStatus.expiringSoon > 0) {
      recommendations.push(`Plan rotation for ${keyRotationStatus.expiringSoon} keys expiring within 30 days`)
    }

    if (keyRotationStatus.current === 0) {
      recommendations.push('Implement regular key rotation schedule')
    }

    if (recommendations.length === 0) {
      recommendations.push('Encryption key management is compliant')
    }

    return recommendations
  }
}

export default EncryptionService