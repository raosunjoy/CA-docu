// Authentication utilities for Zetra Platform

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserRole, Permission } from '@/types'

// Environment variables
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'
const BCRYPT_ROUNDS = 12

export interface JWTPayload {
  sub: string
  email: string
  role: UserRole
  orgId: string
  permissions: Permission[]
  iat: number
  exp: number
  deviceId?: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // @ts-ignore - JWT library type issue
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

/**
 * Get permissions for a user role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.INTERN]: [
      Permission.TASK_READ,
      Permission.TASK_UPDATE, // Only assigned tasks
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPLOAD,
      Permission.TAG_APPLY
    ],
    [UserRole.ASSOCIATE]: [
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_ASSIGN, // Limited
      Permission.DOCUMENT_UPLOAD,
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPDATE,
      Permission.TAG_APPLY,
      Permission.TAG_CREATE
    ],
    [UserRole.MANAGER]: [
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_ASSIGN,
      Permission.TASK_LOCK,
      Permission.TASK_DELETE,
      Permission.DOCUMENT_UPLOAD,
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPDATE,
      Permission.DOCUMENT_DELETE,
      Permission.TAG_APPLY,
      Permission.TAG_CREATE,
      Permission.TAG_MANAGE,
      Permission.USER_MANAGE // Limited
    ],
    [UserRole.PARTNER]: [
      Permission.TASK_CREATE,
      Permission.TASK_READ,
      Permission.TASK_UPDATE,
      Permission.TASK_ASSIGN,
      Permission.TASK_LOCK,
      Permission.TASK_UNLOCK,
      Permission.TASK_DELETE,
      Permission.DOCUMENT_UPLOAD,
      Permission.DOCUMENT_READ,
      Permission.DOCUMENT_UPDATE,
      Permission.DOCUMENT_DELETE,
      Permission.DOCUMENT_DOWNLOAD,
      Permission.TAG_APPLY,
      Permission.TAG_CREATE,
      Permission.TAG_MANAGE,
      Permission.USER_MANAGE,
      Permission.AUDIT_VIEW,
      Permission.ORG_SETTINGS
    ],
    [UserRole.ADMIN]: Object.values(Permission)
  }

  return rolePermissions[role] || []
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = getRolePermissions(userRole)
  return permissions.includes(permission)
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate a secure random token for password reset, etc.
 */
export function generateSecureToken(): string {
  return require('crypto').randomBytes(32).toString('hex')
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Create a session token with device information
 */
export function createSessionToken(
  user: {
    id: string
    email: string
    role: UserRole
    organizationId: string
  },
  deviceId?: string
): string {
  const permissions = getRolePermissions(user.role)
  
  const tokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.organizationId,
    permissions,
    ...(deviceId && { deviceId })
  }
  
  return generateToken(tokenPayload)
}

/**
 * Verify authentication and return user from JWT token
 * Used by API routes that need authentication
 */
export async function verifyAuth(authHeader?: string): Promise<{
  success: boolean
  user?: JWTPayload
  error?: string
}> {
  try {
    const token = extractBearerToken(authHeader)
    if (!token) {
      return { success: false, error: 'No authentication token provided' }
    }

    const user = verifyToken(token)
    return { success: true, user }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    }
  }
}

/**
 * Authenticate request and return user data
 * Alternative interface for API routes
 */
export async function authenticateRequest(request: Request): Promise<{
  success: boolean
  user?: JWTPayload
  error?: string
}> {
  const authHeader = request.headers.get('Authorization')
  return verifyAuth(authHeader || undefined)
}

/**
 * Get current user from request
 * Simplified interface for getting user data
 */
export async function getCurrentUser(request: Request): Promise<JWTPayload | null> {
  const result = await authenticateRequest(request)
  return result.success ? result.user || null : null
}

/**
 * Auth utility object for compatibility with existing API routes
 * Provides a unified interface for authentication operations
 */
export const auth = {
  verifyAuth,
  authenticateRequest,
  getCurrentUser,
  extractBearerToken,
  verifyToken,
  generateToken,
  createSessionToken,
  hashPassword,
  verifyPassword,
  getRolePermissions,
  hasPermission,
  validatePasswordStrength,
  validateEmail,
  generateSecureToken
}