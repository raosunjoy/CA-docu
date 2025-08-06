// Zetra Platform - Cryptography Utilities
// Handles encryption/decryption of sensitive data

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  
  // If key is shorter than required, derive it using PBKDF2
  if (key.length < KEY_LENGTH) {
    return crypto.pbkdf2Sync(key, 'zetra-salt', 10000, KEY_LENGTH, 'sha256')
  }
  
  return Buffer.from(key.slice(0, KEY_LENGTH))
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipher(ALGORITHM, key)
    cipher.setAAD(Buffer.from('zetra-aad'))
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Combine iv + tag + encrypted data
    return iv.toString('hex') + tag.toString('hex') + encrypted
  } catch (error) {
    throw new Error('Encryption failed')
  }
}

export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    
    // Extract iv, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex')
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex')
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2)
    
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(Buffer.from('zetra-aad'))
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    throw new Error('Decryption failed')
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':')
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex')
  return hash === verifyHash
}

export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}