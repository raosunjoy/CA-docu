/**
 * Advanced Session Management and Security Controls Service
 * Provides comprehensive session management, device trust, and security monitoring
 */

import crypto from 'crypto'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

// Session configuration
const SESSION_TIMEOUT_MINUTES = 30
const MAX_CONCURRENT_SESSIONS = 5
const DEVICE_TRUST_DURATION_DAYS = 30
const SUSPICIOUS_ACTIVITY_THRESHOLD = 5
const GEO_BLOCKING_ENABLED = true

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  CONCURRENT_SESSION_LIMIT = 'CONCURRENT_SESSION_LIMIT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DEVICE_TRUST_GRANTED = 'DEVICE_TRUST_GRANTED',
  DEVICE_TRUST_REVOKED = 'DEVICE_TRUST_REVOKED',
  IP_BLOCKED = 'IP_BLOCKED',
  GEO_BLOCKED = 'GEO_BLOCKED',
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
}

export interface SessionData {
  id: string
  userId: string
  organizationId: string
  deviceId: string
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  location?: {
    country: string
    region: string
    city: string
    latitude: number
    longitude: number
  }
  isTrustedDevice: boolean
  createdAt: Date
  lastAccessedAt: Date
  expiresAt: Date
  isActive: boolean
  metadata: Record<string, any>
}

export interface DeviceInfo {
  id: string
  userId: string
  fingerprint: string
  name: string
  type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  os: string
  browser: string
  isTrusted: boolean
  trustGrantedAt?: Date
  trustExpiresAt?: Date
  lastSeenAt: Date
  ipAddresses: string[]
  locations: Array<{
    country: string
    region: string
    city: string
    timestamp: Date
  }>
  metadata: Record<string, any>
}

export interface SecurityEvent {
  id: string
  userId?: string
  organizationId?: string
  sessionId?: string
  deviceId?: string
  type: SecurityEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  ipAddress?: string
  userAgent?: string
  location?: any
  metadata: Record<string, any>
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

export interface SecurityPolicy {
  organizationId: string
  sessionTimeoutMinutes: number
  maxConcurrentSessions: number
  deviceTrustDurationDays: number
  requireDeviceTrust: boolean
  enableGeoBlocking: boolean
  allowedCountries: string[]
  blockedCountries: string[]
  enableBruteForceProtection: boolean
  maxFailedAttempts: number
  lockoutDurationMinutes: number
  enableSuspiciousActivityDetection: boolean
  suspiciousActivityThreshold: number
  requireMFAForNewDevices: boolean
  requireMFAForSuspiciousActivity: boolean
  ipWhitelist: string[]
  ipBlacklist: string[]
}

export class SessionSecurityService {
  private prisma: PrismaClient
  private activeSessions: Map<string, SessionData> = new Map()
  private securityEvents: SecurityEvent[] = []
  private failedAttempts: Map<string, number> = new Map()
  private lockedAccounts: Map<string, Date> = new Map()
  private suspiciousIPs: Map<string, number> = new Map()

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.startCleanupInterval()
  }

  /**
   * Create a new session with security checks
   */
  async createSession(
    userId: string,
    organizationId: string,
    deviceInfo: {
      fingerprint: string
      userAgent: string
      ipAddress: string
      location?: any
    }
  ): Promise<{
    session: SessionData
    requiresMFA: boolean
    securityWarnings: string[]
  }> {
    const warnings: string[] = []
    let requiresMFA = false

    // Check if account is locked
    if (this.isAccountLocked(userId)) {
      throw new Error('Account is temporarily locked due to suspicious activity')
    }

    // Get security policy
    const policy = await this.getSecurityPolicy(organizationId)

    // Check geo-blocking
    if (policy.enableGeoBlocking && deviceInfo.location) {
      const isBlocked = await this.checkGeoBlocking(deviceInfo.location, policy)
      if (isBlocked) {
        await this.logSecurityEvent({
          userId,
          organizationId,
          type: SecurityEventType.GEO_BLOCKED,
          severity: 'high',
          description: `Login blocked from ${deviceInfo.location.country}`,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          location: deviceInfo.location,
          metadata: { reason: 'geo_blocking' },
        })
        throw new Error('Access denied from this location')
      }
    }

    // Check IP blocking
    if (this.isIPBlocked(deviceInfo.ipAddress, policy)) {
      await this.logSecurityEvent({
        userId,
        organizationId,
        type: SecurityEventType.IP_BLOCKED,
        severity: 'high',
        description: `Login blocked from IP ${deviceInfo.ipAddress}`,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        metadata: { reason: 'ip_blocking' },
      })
      throw new Error('Access denied from this IP address')
    }

    // Check device trust
    const device = await this.getOrCreateDevice(userId, deviceInfo)
    const isNewDevice = !device.isTrusted
    const isSuspiciousActivity = await this.detectSuspiciousActivity(userId, deviceInfo)

    if (isNewDevice && policy.requireMFAForNewDevices) {
      requiresMFA = true
      warnings.push('New device detected - MFA required')
    }

    if (isSuspiciousActivity && policy.requireMFAForSuspiciousActivity) {
      requiresMFA = true
      warnings.push('Suspicious activity detected - MFA required')
    }

    // Check concurrent session limit
    const activeSessions = await this.getUserActiveSessions(userId)
    if (activeSessions.length >= policy.maxConcurrentSessions) {
      // Terminate oldest session
      const oldestSession = activeSessions.sort((a, b) => 
        a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
      )[0]
      
      await this.terminateSession(oldestSession.id, 'concurrent_limit')
      warnings.push('Oldest session terminated due to concurrent session limit')
    }

    // Create new session
    const sessionId = crypto.randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + policy.sessionTimeoutMinutes * 60 * 1000)

    const session: SessionData = {
      id: sessionId,
      userId,
      organizationId,
      deviceId: device.id,
      deviceFingerprint: device.fingerprint,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      location: deviceInfo.location,
      isTrustedDevice: device.isTrusted,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      isActive: true,
      metadata: {
        requiresMFA,
        isNewDevice,
        isSuspiciousActivity,
      },
    }

    // Store session
    this.activeSessions.set(sessionId, session)

    // Update device last seen
    await this.updateDeviceLastSeen(device.id, deviceInfo.ipAddress, deviceInfo.location)

    // Log security event
    await this.logSecurityEvent({
      userId,
      organizationId,
      sessionId,
      deviceId: device.id,
      type: SecurityEventType.SESSION_CREATED,
      severity: requiresMFA ? 'medium' : 'low',
      description: 'New session created',
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      location: deviceInfo.location,
      metadata: {
        requiresMFA,
        isNewDevice,
        isSuspiciousActivity,
        warnings,
      },
    })

    return {
      session,
      requiresMFA,
      securityWarnings: warnings,
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionId: string): Promise<{
    isValid: boolean
    session?: SessionData
    requiresReauth?: boolean
  }> {
    const session = this.activeSessions.get(sessionId)
    
    if (!session) {
      return { isValid: false }
    }

    const now = new Date()

    // Check if session is expired
    if (session.expiresAt <= now) {
      await this.terminateSession(sessionId, 'expired')
      return { isValid: false }
    }

    // Check if session is still active
    if (!session.isActive) {
      return { isValid: false }
    }

    // Update last accessed time
    session.lastAccessedAt = now

    // Check for suspicious activity
    const policy = await this.getSecurityPolicy(session.organizationId)
    const isSuspicious = await this.detectSuspiciousActivity(session.userId, {
      fingerprint: session.deviceFingerprint,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      location: session.location,
    })

    if (isSuspicious && policy.enableSuspiciousActivityDetection) {
      await this.logSecurityEvent({
        userId: session.userId,
        organizationId: session.organizationId,
        sessionId,
        deviceId: session.deviceId,
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: 'high',
        description: 'Suspicious activity detected during session',
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        location: session.location,
        metadata: { reason: 'session_validation' },
      })

      return {
        isValid: true,
        session,
        requiresReauth: true,
      }
    }

    return {
      isValid: true,
      session,
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = this.activeSessions.get(sessionId)
    
    if (session) {
      session.isActive = false
      this.activeSessions.delete(sessionId)

      await this.logSecurityEvent({
        userId: session.userId,
        organizationId: session.organizationId,
        sessionId,
        deviceId: session.deviceId,
        type: SecurityEventType.SESSION_TERMINATED,
        severity: 'low',
        description: `Session terminated: ${reason}`,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        metadata: { reason },
      })
    }
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllUserSessions(userId: string, reason: string): Promise<number> {
    const userSessions = Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId)

    for (const session of userSessions) {
      await this.terminateSession(session.id, reason)
    }

    return userSessions.length
  }

  /**
   * Grant device trust
   */
  async grantDeviceTrust(
    userId: string,
    deviceId: string,
    grantedBy: string
  ): Promise<void> {
    const device = await this.getDevice(deviceId)
    if (!device || device.userId !== userId) {
      throw new Error('Device not found or access denied')
    }

    const policy = await this.getSecurityPolicy(device.userId) // Assuming we can get org from user
    const trustExpiresAt = new Date(
      Date.now() + policy.deviceTrustDurationDays * 24 * 60 * 60 * 1000
    )

    // Update device trust
    await this.updateDeviceTrust(deviceId, true, trustExpiresAt)

    // Log security event
    await this.logSecurityEvent({
      userId,
      deviceId,
      type: SecurityEventType.DEVICE_TRUST_GRANTED,
      severity: 'medium',
      description: `Device trust granted for ${device.name}`,
      metadata: {
        grantedBy,
        trustExpiresAt: trustExpiresAt.toISOString(),
      },
    })
  }

  /**
   * Revoke device trust
   */
  async revokeDeviceTrust(
    userId: string,
    deviceId: string,
    revokedBy: string
  ): Promise<void> {
    const device = await this.getDevice(deviceId)
    if (!device || device.userId !== userId) {
      throw new Error('Device not found or access denied')
    }

    // Update device trust
    await this.updateDeviceTrust(deviceId, false)

    // Terminate all sessions for this device
    const deviceSessions = Array.from(this.activeSessions.values())
      .filter(session => session.deviceId === deviceId)

    for (const session of deviceSessions) {
      await this.terminateSession(session.id, 'device_trust_revoked')
    }

    // Log security event
    await this.logSecurityEvent({
      userId,
      deviceId,
      type: SecurityEventType.DEVICE_TRUST_REVOKED,
      severity: 'high',
      description: `Device trust revoked for ${device.name}`,
      metadata: {
        revokedBy,
        terminatedSessions: deviceSessions.length,
      },
    })
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(
    userId: string,
    organizationId: string,
    ipAddress: string,
    userAgent: string,
    reason: string
  ): Promise<void> {
    const policy = await this.getSecurityPolicy(organizationId)
    
    if (!policy.enableBruteForceProtection) {
      return
    }

    // Increment failed attempts
    const attempts = (this.failedAttempts.get(userId) || 0) + 1
    this.failedAttempts.set(userId, attempts)

    // Log security event
    await this.logSecurityEvent({
      userId,
      organizationId,
      type: SecurityEventType.LOGIN_FAILURE,
      severity: attempts >= policy.maxFailedAttempts ? 'high' : 'medium',
      description: `Failed login attempt (${attempts}/${policy.maxFailedAttempts})`,
      ipAddress,
      userAgent,
      metadata: {
        reason,
        attempts,
        maxAttempts: policy.maxFailedAttempts,
      },
    })

    // Check if account should be locked
    if (attempts >= policy.maxFailedAttempts) {
      await this.lockAccount(userId, organizationId, policy.lockoutDurationMinutes)
    }

    // Track suspicious IPs
    const suspiciousCount = (this.suspiciousIPs.get(ipAddress) || 0) + 1
    this.suspiciousIPs.set(ipAddress, suspiciousCount)

    if (suspiciousCount >= SUSPICIOUS_ACTIVITY_THRESHOLD) {
      await this.logSecurityEvent({
        organizationId,
        type: SecurityEventType.BRUTE_FORCE_DETECTED,
        severity: 'critical',
        description: `Brute force attack detected from IP ${ipAddress}`,
        ipAddress,
        userAgent,
        metadata: {
          attempts: suspiciousCount,
          threshold: SUSPICIOUS_ACTIVITY_THRESHOLD,
        },
      })
    }
  }

  /**
   * Clear failed attempts (on successful login)
   */
  async clearFailedAttempts(userId: string): Promise<void> {
    this.failedAttempts.delete(userId)
  }

  /**
   * Lock account
   */
  async lockAccount(
    userId: string,
    organizationId: string,
    durationMinutes: number
  ): Promise<void> {
    const unlockAt = new Date(Date.now() + durationMinutes * 60 * 1000)
    this.lockedAccounts.set(userId, unlockAt)

    // Terminate all user sessions
    await this.terminateAllUserSessions(userId, 'account_locked')

    // Log security event
    await this.logSecurityEvent({
      userId,
      organizationId,
      type: SecurityEventType.ACCOUNT_LOCKED,
      severity: 'critical',
      description: `Account locked for ${durationMinutes} minutes due to failed login attempts`,
      metadata: {
        durationMinutes,
        unlockAt: unlockAt.toISOString(),
      },
    })
  }

  /**
   * Unlock account
   */
  async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    this.lockedAccounts.delete(userId)
    this.failedAttempts.delete(userId)

    // Log security event
    await this.logSecurityEvent({
      userId,
      type: SecurityEventType.ACCOUNT_UNLOCKED,
      severity: 'medium',
      description: 'Account manually unlocked',
      metadata: { unlockedBy },
    })
  }

  /**
   * Get security events
   */
  async getSecurityEvents(
    organizationId: string,
    filters: {
      userId?: string
      deviceId?: string
      types?: SecurityEventType[]
      severity?: string[]
      dateFrom?: Date
      dateTo?: Date
      resolved?: boolean
      limit?: number
      offset?: number
    } = {}
  ): Promise<{
    events: SecurityEvent[]
    total: number
  }> {
    // Filter events based on criteria
    const filteredEvents = this.securityEvents.filter(event => {
      if (event.organizationId !== organizationId) return false
      if (filters.userId && event.userId !== filters.userId) return false
      if (filters.deviceId && event.deviceId !== filters.deviceId) return false
      if (filters.types && !filters.types.includes(event.type)) return false
      if (filters.severity && !filters.severity.includes(event.severity)) return false
      if (filters.resolved !== undefined && event.resolved !== filters.resolved) return false
      if (filters.dateFrom && event.timestamp < filters.dateFrom) return false
      if (filters.dateTo && event.timestamp > filters.dateTo) return false
      return true
    })

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const total = filteredEvents.length
    const offset = filters.offset || 0
    const limit = filters.limit || 100

    const events = filteredEvents.slice(offset, offset + limit)

    return { events, total }
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    // In a real implementation, this would query the database
    // For now, return mock data
    return []
  }

  /**
   * Get active sessions for user
   */
  async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    return Array.from(this.activeSessions.values())
      .filter(session => session.userId === userId && session.isActive)
  }

  // Private helper methods

  private async getSecurityPolicy(organizationId: string): Promise<SecurityPolicy> {
    // In a real implementation, this would query the database
    // For now, return default policy
    return {
      organizationId,
      sessionTimeoutMinutes: SESSION_TIMEOUT_MINUTES,
      maxConcurrentSessions: MAX_CONCURRENT_SESSIONS,
      deviceTrustDurationDays: DEVICE_TRUST_DURATION_DAYS,
      requireDeviceTrust: false,
      enableGeoBlocking: GEO_BLOCKING_ENABLED,
      allowedCountries: [],
      blockedCountries: ['CN', 'RU', 'KP'], // Example blocked countries
      enableBruteForceProtection: true,
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 30,
      enableSuspiciousActivityDetection: true,
      suspiciousActivityThreshold: SUSPICIOUS_ACTIVITY_THRESHOLD,
      requireMFAForNewDevices: true,
      requireMFAForSuspiciousActivity: true,
      ipWhitelist: [],
      ipBlacklist: [],
    }
  }

  private async getOrCreateDevice(
    userId: string,
    deviceInfo: {
      fingerprint: string
      userAgent: string
      ipAddress: string
      location?: any
    }
  ): Promise<DeviceInfo> {
    // In a real implementation, this would query/create in database
    // For now, create a mock device
    const deviceId = crypto.randomUUID()
    const now = new Date()

    return {
      id: deviceId,
      userId,
      fingerprint: deviceInfo.fingerprint,
      name: this.parseDeviceName(deviceInfo.userAgent),
      type: this.parseDeviceType(deviceInfo.userAgent),
      os: this.parseOS(deviceInfo.userAgent),
      browser: this.parseBrowser(deviceInfo.userAgent),
      isTrusted: false,
      lastSeenAt: now,
      ipAddresses: [deviceInfo.ipAddress],
      locations: deviceInfo.location ? [{
        country: deviceInfo.location.country,
        region: deviceInfo.location.region,
        city: deviceInfo.location.city,
        timestamp: now,
      }] : [],
      metadata: {},
    }
  }

  private async getDevice(deviceId: string): Promise<DeviceInfo | null> {
    // In a real implementation, this would query the database
    return null
  }

  private async updateDeviceLastSeen(
    deviceId: string,
    ipAddress: string,
    location?: any
  ): Promise<void> {
    // In a real implementation, this would update the database
  }

  private async updateDeviceTrust(
    deviceId: string,
    isTrusted: boolean,
    trustExpiresAt?: Date
  ): Promise<void> {
    // In a real implementation, this would update the database
  }

  private async checkGeoBlocking(location: any, policy: SecurityPolicy): Promise<boolean> {
    if (!location?.country) return false

    // Check if country is explicitly blocked
    if (policy.blockedCountries.includes(location.country)) {
      return true
    }

    // Check if only specific countries are allowed
    if (policy.allowedCountries.length > 0 && !policy.allowedCountries.includes(location.country)) {
      return true
    }

    return false
  }

  private isIPBlocked(ipAddress: string, policy: SecurityPolicy): boolean {
    // Check IP blacklist
    if (policy.ipBlacklist.includes(ipAddress)) {
      return true
    }

    // Check IP whitelist (if defined, only allow whitelisted IPs)
    if (policy.ipWhitelist.length > 0 && !policy.ipWhitelist.includes(ipAddress)) {
      return true
    }

    return false
  }

  private isAccountLocked(userId: string): boolean {
    const unlockAt = this.lockedAccounts.get(userId)
    if (!unlockAt) return false

    if (new Date() >= unlockAt) {
      this.lockedAccounts.delete(userId)
      return false
    }

    return true
  }

  private async detectSuspiciousActivity(
    userId: string,
    deviceInfo: {
      fingerprint: string
      userAgent: string
      ipAddress: string
      location?: any
    }
  ): Promise<boolean> {
    // Check for suspicious IP
    const suspiciousCount = this.suspiciousIPs.get(deviceInfo.ipAddress) || 0
    if (suspiciousCount >= SUSPICIOUS_ACTIVITY_THRESHOLD) {
      return true
    }

    // Check for unusual location (simplified)
    // In a real implementation, this would compare against user's typical locations
    
    // Check for unusual user agent changes
    // In a real implementation, this would compare against user's typical devices

    return false
  }

  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      resolved: false,
    }

    this.securityEvents.push(securityEvent)

    // In a real implementation, this would also store in database
    // and potentially trigger alerts for high-severity events
  }

  private parseDeviceName(userAgent: string): string {
    // Simplified device name parsing
    if (userAgent.includes('iPhone')) return 'iPhone'
    if (userAgent.includes('iPad')) return 'iPad'
    if (userAgent.includes('Android')) return 'Android Device'
    if (userAgent.includes('Windows')) return 'Windows PC'
    if (userAgent.includes('Macintosh')) return 'Mac'
    if (userAgent.includes('Linux')) return 'Linux PC'
    return 'Unknown Device'
  }

  private parseDeviceType(userAgent: string): DeviceInfo['type'] {
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return 'mobile'
    }
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      return 'tablet'
    }
    return 'desktop'
  }

  private parseOS(userAgent: string): string {
    if (userAgent.includes('Windows NT')) return 'Windows'
    if (userAgent.includes('Macintosh')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('iPhone OS')) return 'iOS'
    if (userAgent.includes('Android')) return 'Android'
    return 'Unknown'
  }

  private parseBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  private startCleanupInterval(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      const now = new Date()
      const expiredSessions = Array.from(this.activeSessions.entries())
        .filter(([_, session]) => session.expiresAt <= now)

      for (const [sessionId, _] of expiredSessions) {
        this.terminateSession(sessionId, 'expired').catch(console.error)
      }

      // Clean up old security events (keep last 1000)
      if (this.securityEvents.length > 1000) {
        this.securityEvents = this.securityEvents
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 1000)
      }

      // Clean up old failed attempts (older than 1 hour)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      // In a real implementation, we'd track timestamps for failed attempts

      // Clean up unlocked accounts
      for (const [userId, unlockAt] of this.lockedAccounts.entries()) {
        if (now >= unlockAt) {
          this.lockedAccounts.delete(userId)
        }
      }
    }, 5 * 60 * 1000) // 5 minutes
  }
}

export default SessionSecurityService