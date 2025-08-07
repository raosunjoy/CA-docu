/**
 * Audit Integrity API
 * Provides endpoints for verifying audit log integrity and managing archival
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const auditService = new AuditService(prisma)

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can verify audit integrity
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Verify audit log integrity
    const integrityResult = await auditService.verifyIntegrity(user.organizationId)

    // Log the integrity check
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/audit/integrity',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.SYSTEM_ADMIN,
        severity: integrityResult.isValid ? AuditSeverity.LOW : AuditSeverity.CRITICAL,
        description: `Audit integrity check ${integrityResult.isValid ? 'passed' : 'failed'}`,
        resourceType: 'audit_integrity',
        metadata: {
          isValid: integrityResult.isValid,
          brokenChainsCount: integrityResult.brokenChains.length,
          invalidChecksumsCount: integrityResult.invalidChecksums.length,
        },
        complianceFlags: ['INTEGRITY_CHECK'],
        riskScore: integrityResult.isValid ? 10 : 95,
      }
    )

    return NextResponse.json({
      success: true,
      data: integrityResult,
    })

  } catch (error) {
    console.error('Error verifying audit integrity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify audit integrity' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can perform audit maintenance
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, olderThanDays } = body

    if (action === 'archive') {
      if (!olderThanDays || olderThanDays < 90) {
        return NextResponse.json(
          { success: false, error: 'Archive period must be at least 90 days' },
          { status: 400 }
        )
      }

      // Archive old logs
      const archivedCount = await auditService.archiveOldLogs(
        user.organizationId,
        olderThanDays
      )

      // Log the archival
      await auditService.logEvent(
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/audit/integrity',
          method: 'POST',
        },
        {
          action: AuditAction.ARCHIVE,
          category: AuditCategory.SYSTEM_ADMIN,
          severity: AuditSeverity.HIGH,
          description: `Archived ${archivedCount} audit logs older than ${olderThanDays} days`,
          resourceType: 'audit_logs',
          metadata: {
            action: 'archive',
            olderThanDays,
            archivedCount,
          },
          complianceFlags: ['LOG_ARCHIVAL'],
          riskScore: 70,
        }
      )

      return NextResponse.json({
        success: true,
        data: {
          archivedCount,
          message: `Successfully archived ${archivedCount} audit logs`,
        },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error performing audit maintenance:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform audit maintenance' },
      { status: 500 }
    )
  }
}