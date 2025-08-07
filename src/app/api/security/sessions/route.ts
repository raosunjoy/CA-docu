/**
 * Session Security Management API
 * Provides endpoints for managing user sessions and security
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import SessionSecurityService from '@/lib/session-security-service'
import { verifyAuth } from '@/lib/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const sessionSecurityService = new SessionSecurityService(prisma)
const auditService = new AuditService(prisma)

// Session action schema
const SessionActionSchema = z.object({
  action: z.enum(['terminate', 'terminate_all', 'grant_device_trust', 'revoke_device_trust']),
  sessionId: z.string().optional(),
  deviceId: z.string().optional(),
  reason: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    // Only allow users to view their own sessions, or admins to view any
    if (userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get active sessions
    const sessions = await sessionSecurityService.getUserActiveSessions(userId)

    // Get user devices
    const devices = await sessionSecurityService.getUserDevices(userId)

    // Log session access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/security/sessions',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.LOW,
        description: `Viewed session information${userId !== user.id ? ` for user ${userId}` : ''}`,
        resourceType: 'user_sessions',
        resourceId: userId,
        metadata: {
          sessionsCount: sessions.length,
          devicesCount: devices.length,
          viewedUserId: userId,
        },
        complianceFlags: ['SESSION_ACCESS'],
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          id: session.id,
          deviceId: session.deviceId,
          deviceFingerprint: session.deviceFingerprint,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          location: session.location,
          isTrustedDevice: session.isTrustedDevice,
          createdAt: session.createdAt,
          lastAccessedAt: session.lastAccessedAt,
          expiresAt: session.expiresAt,
          metadata: session.metadata,
        })),
        devices: devices.map(device => ({
          id: device.id,
          name: device.name,
          type: device.type,
          os: device.os,
          browser: device.browser,
          isTrusted: device.isTrusted,
          trustGrantedAt: device.trustGrantedAt,
          trustExpiresAt: device.trustExpiresAt,
          lastSeenAt: device.lastSeenAt,
          locations: device.locations.slice(-5), // Last 5 locations
        })),
      },
    })

  } catch (error) {
    console.error('Error fetching session information:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session information' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    const body = await request.json()
    const { action, sessionId, deviceId, reason } = SessionActionSchema.parse(body)

    let result: any
    let auditDescription: string
    let auditSeverity = AuditSeverity.MEDIUM
    let riskScore = 50

    switch (action) {
      case 'terminate':
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'Session ID is required' },
            { status: 400 }
          )
        }

        await sessionSecurityService.terminateSession(sessionId, reason || 'user_request')
        result = { message: 'Session terminated successfully' }
        auditDescription = `Terminated session ${sessionId}`
        auditSeverity = AuditSeverity.MEDIUM
        riskScore = 40
        break

      case 'terminate_all':
        const terminatedCount = await sessionSecurityService.terminateAllUserSessions(
          user.id,
          reason || 'user_request'
        )
        result = { 
          message: `${terminatedCount} sessions terminated successfully`,
          terminatedCount 
        }
        auditDescription = `Terminated all user sessions (${terminatedCount} sessions)`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 70
        break

      case 'grant_device_trust':
        if (!deviceId) {
          return NextResponse.json(
            { success: false, error: 'Device ID is required' },
            { status: 400 }
          )
        }

        await sessionSecurityService.grantDeviceTrust(user.id, deviceId, user.id)
        result = { message: 'Device trust granted successfully' }
        auditDescription = `Granted trust to device ${deviceId}`
        auditSeverity = AuditSeverity.MEDIUM
        riskScore = 60
        break

      case 'revoke_device_trust':
        if (!deviceId) {
          return NextResponse.json(
            { success: false, error: 'Device ID is required' },
            { status: 400 }
          )
        }

        await sessionSecurityService.revokeDeviceTrust(user.id, deviceId, user.id)
        result = { message: 'Device trust revoked successfully' }
        auditDescription = `Revoked trust from device ${deviceId}`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 80
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the security action
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/security/sessions',
        method: 'POST',
      },
      {
        action: AuditAction.UPDATE,
        category: AuditCategory.SECURITY,
        severity: auditSeverity,
        description: auditDescription,
        resourceType: 'user_session',
        resourceId: sessionId || deviceId,
        metadata: {
          action,
          sessionId,
          deviceId,
          reason,
          ...result,
        },
        complianceFlags: ['SESSION_MANAGEMENT'],
        riskScore,
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error managing session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to manage session' },
      { status: 500 }
    )
  }
}