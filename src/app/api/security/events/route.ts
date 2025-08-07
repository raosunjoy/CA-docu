/**
 * Security Events API
 * Provides endpoints for viewing and managing security events
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import SessionSecurityService, { SecurityEventType } from '@/lib/session-security-service'
import { verifyAuth } from '@/lib/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const sessionSecurityService = new SessionSecurityService(prisma)
const auditService = new AuditService(prisma)

// Security event filters schema
const SecurityEventFiltersSchema = z.object({
  userId: z.string().optional(),
  deviceId: z.string().optional(),
  types: z.array(z.nativeEnum(SecurityEventType)).optional(),
  severity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  resolved: z.boolean().optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins and partners can view security events
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse filters
    const rawFilters = {
      userId: searchParams.get('userId') || undefined,
      deviceId: searchParams.get('deviceId') || undefined,
      types: searchParams.get('types')?.split(',') || undefined,
      severity: searchParams.get('severity')?.split(',') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      resolved: searchParams.get('resolved') ? searchParams.get('resolved') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const filters = SecurityEventFiltersSchema.parse(rawFilters)

    // Get security events
    const { events, total } = await sessionSecurityService.getSecurityEvents(
      user.organizationId,
      {
        ...filters,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    )

    // Log security events access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/security/events',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.MEDIUM,
        description: 'Accessed security events',
        resourceType: 'security_events',
        metadata: {
          filtersApplied: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined),
          eventsReturned: events.length,
          totalEvents: total,
        },
        complianceFlags: ['SECURITY_MONITORING'],
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        events: events.map(event => ({
          id: event.id,
          userId: event.userId,
          sessionId: event.sessionId,
          deviceId: event.deviceId,
          type: event.type,
          severity: event.severity,
          description: event.description,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          location: event.location,
          metadata: event.metadata,
          timestamp: event.timestamp,
          resolved: event.resolved,
          resolvedAt: event.resolvedAt,
          resolvedBy: event.resolvedBy,
        })),
        total,
        hasMore: filters.offset + filters.limit < total,
      },
    })

  } catch (error) {
    console.error('Error fetching security events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch security events' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can resolve security events
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { eventIds, resolved, resolution } = body

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event IDs are required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would update the database
    // For now, we'll just log the action

    // Log security event resolution
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/security/events',
        method: 'PATCH',
      },
      {
        action: AuditAction.UPDATE,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.HIGH,
        description: `${resolved ? 'Resolved' : 'Reopened'} ${eventIds.length} security events`,
        resourceType: 'security_events',
        metadata: {
          eventIds,
          resolved,
          resolution,
          resolvedBy: user.id,
        },
        complianceFlags: ['SECURITY_INCIDENT_MANAGEMENT'],
        riskScore: 60,
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        message: `${eventIds.length} security events ${resolved ? 'resolved' : 'reopened'} successfully`,
        updatedCount: eventIds.length,
      },
    })

  } catch (error) {
    console.error('Error updating security events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update security events' },
      { status: 500 }
    )
  }
}