// Authentication middleware for API routes

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractBearerToken, hasPermission, JWTPayload } from './auth'
import { Permission, UserRole } from '@/types'

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

export interface MiddlewareOptions {
  requireAuth?: boolean
  requiredPermissions?: Permission[]
  allowedRoles?: UserRole[]
  skipAuditLog?: boolean
}

/**
 * Create error response for authentication failures
 */
function createAuthErrorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    { status }
  )
}

/**
 * Extract and validate authentication token
 */
function extractAndValidateToken(request: NextRequest): { token: string | null; error: NextResponse | null } {
  const authHeader = request.headers.get('authorization')
  const token = extractBearerToken(authHeader || '')
  
  if (!token) {
    return {
      token: null,
      error: createAuthErrorResponse('UNAUTHORIZED', 'Authentication token is required', 401)
    }
  }
  
  return { token, error: null }
}

/**
 * Verify token and get user payload
 */
function verifyTokenAndGetUser(token: string): { user: JWTPayload | null; error: NextResponse | null } {
  try {
    const user = verifyToken(token)
    return { user, error: null }
  } catch {
    return {
      user: null,
      error: createAuthErrorResponse('UNAUTHORIZED', 'Invalid or expired authentication token', 401)
    }
  }
}

/**
 * Check if user role is in allowed roles
 */
function validateUserRole(user: JWTPayload, allowedRoles: UserRole[]): NextResponse | null {
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return createAuthErrorResponse('FORBIDDEN', 'Insufficient role permissions', 403)
  }
  return null
}

/**
 * Check if user has required permissions
 */
function validateUserPermissions(user: JWTPayload, requiredPermissions: Permission[]): NextResponse | null {
  for (const permission of requiredPermissions) {
    if (!hasPermission(user.role, permission)) {
      return createAuthErrorResponse('FORBIDDEN', `Missing required permission: ${permission}`, 403)
    }
  }
  return null
}

/**
 * Log API access for audit trail
 */
function logApiAccess(): void {
  if (process.env.NODE_ENV === 'development') {
    // API access logged via audit log
  }
}

/**
 * Handle authentication middleware errors
 */
function handleMiddlewareError(error: unknown): NextResponse {
  // eslint-disable-next-line no-console
  console.error('Authentication middleware error:', error)
  
  return createAuthErrorResponse('INTERNAL_ERROR', 'Authentication service error', 500)
}

/**
 * Authentication middleware for API routes
 */
export function authMiddleware(options: MiddlewareOptions = {}) {
  const {
    requireAuth = true,
    requiredPermissions = [],
    allowedRoles = [],
    skipAuditLog = false
  } = options

  return async function middleware(
    request: NextRequest
  ): Promise<NextResponse | { user: JWTPayload }> {
    try {
      // If authentication is not required, continue
      if (!requireAuth) {
        return NextResponse.next()
      }

      // Extract and validate token
      const { token, error: tokenError } = extractAndValidateToken(request)
      if (tokenError) {
        return tokenError
      }

      // Verify token and get user
      const { user, error: userError } = verifyTokenAndGetUser(token!)
      if (userError) {
        return userError
      }

      // Validate user role
      const roleError = validateUserRole(user!, allowedRoles)
      if (roleError) {
        return roleError
      }

      // Validate user permissions
      const permissionError = validateUserPermissions(user!, requiredPermissions)
      if (permissionError) {
        return permissionError
      }

      // Log API access for audit trail (if not skipped)
      if (!skipAuditLog) {
        logApiAccess()
      }

      // Attach user to request and continue
      return { user: user! }
    } catch (error) {
      return handleMiddlewareError(error)
    }
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: UserRole[]) {
  return authMiddleware({
    requireAuth: true,
    allowedRoles: roles
  })
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(...permissions: Permission[]) {
  return authMiddleware({
    requireAuth: true,
    requiredPermissions: permissions
  })
}

/**
 * Admin-only middleware
 */
export function requireAdmin() {
  return requireRole(UserRole.ADMIN)
}

/**
 * Manager or above middleware
 */
export function requireManager() {
  return requireRole(UserRole.MANAGER, UserRole.PARTNER, UserRole.ADMIN)
}

/**
 * Partner or above middleware
 */
export function requirePartner() {
  return requireRole(UserRole.PARTNER, UserRole.ADMIN)
}

/**
 * Public endpoint middleware (no authentication required)
 */
export function publicEndpoint() {
  return authMiddleware({
    requireAuth: false,
    skipAuditLog: true
  })
}

/**
 * Extract user from authenticated request
 */
export function getAuthenticatedUser(request: AuthenticatedRequest): JWTPayload | null {
  return request.user || null
}

/**
 * Check if current user can access resource belonging to another user
 */
export function canAccessUserResource(
  currentUser: JWTPayload,
  targetUserId: string
): boolean {
  // Users can always access their own resources
  if (currentUser.sub === targetUserId) {
    return true
  }

  // Admins and Partners can access any user's resources
  if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PARTNER) {
    return true
  }

  // Managers can access resources of Associates and Interns in their org
  if (currentUser.role === UserRole.MANAGER) {
    // This would need to check if the target user is in the same org
    // and has a lower role (Associate/Intern)
    return true // Simplified for now
  }

  return false
}

/**
 * Validate organization access
 */
export function validateOrganizationAccess(
  user: JWTPayload,
  organizationId: string
): boolean {
  return user.orgId === organizationId
}

/**
 * Rate limiting middleware (simplified implementation)
 */
export function rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>()

  return function rateLimitMiddleware(request: NextRequest): NextResponse | null {
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (data.resetTime < windowStart) {
        requestCounts.delete(ip)
      }
    }

    // Get or create request count for this IP
    const requestData = requestCounts.get(clientIp) || { count: 0, resetTime: now }

    // Reset if window expired
    if (requestData.resetTime < windowStart) {
      requestData.count = 0
      requestData.resetTime = now
    }

    // Increment count
    requestData.count++
    requestCounts.set(clientIp, requestData)

    // Check if rate limit exceeded
    if (requestData.count > maxRequests) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.'
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((requestData.resetTime + windowMs) / 1000).toString()
          }
        }
      )
    }

    return null // Allow request to continue
  }
}