/**
 * Backup Management API
 * Provides endpoints for managing backups and recovery operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import BackupRecoveryService, { BackupType, BackupStatus } from '@/lib/backup-recovery-service'
import { verifyAuth } from '@/lib/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const backupService = new BackupRecoveryService(prisma)
const auditService = new AuditService(prisma)

// Backup execution schema
const BackupExecutionSchema = z.object({
  action: z.enum(['execute', 'verify', 'delete']),
  configurationId: z.string().optional(),
  backupId: z.string().optional(),
  type: z.nativeEnum(BackupType).optional(),
  reason: z.string().optional(),
})

// Backup filters schema
const BackupFiltersSchema = z.object({
  type: z.nativeEnum(BackupType).optional(),
  status: z.nativeEnum(BackupStatus).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can access backup information
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'metrics') {
      // Get disaster recovery metrics
      const metrics = await backupService.getDisasterRecoveryMetrics(user.organizationId)

      // Log metrics access
      await auditService.logEvent(
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/backup',
          method: 'GET',
        },
        {
          action: AuditAction.READ,
          category: AuditCategory.SYSTEM_ADMIN,
          severity: AuditSeverity.MEDIUM,
          description: 'Accessed backup and recovery metrics',
          resourceType: 'backup_metrics',
          metadata: {
            totalBackups: metrics.totalBackups,
            successfulBackups: metrics.successfulBackups,
            failedBackups: metrics.failedBackups,
            complianceScore: metrics.complianceScore,
          },
          complianceFlags: ['BACKUP_MONITORING'],
        }
      )

      return NextResponse.json({
        success: true,
        data: metrics,
      })
    }

    // Parse filters for backup list
    const rawFilters = {
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    const filters = BackupFiltersSchema.parse(rawFilters)

    // Get backup list
    const { backups, total } = await backupService.listBackups(
      user.organizationId,
      {
        ...filters,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    )

    // Log backup list access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/backup',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.SYSTEM_ADMIN,
        severity: AuditSeverity.LOW,
        description: 'Accessed backup list',
        resourceType: 'backup_list',
        metadata: {
          filtersApplied: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined),
          backupsReturned: backups.length,
          totalBackups: total,
        },
        complianceFlags: ['BACKUP_ACCESS'],
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        backups: backups.map(backup => ({
          id: backup.id,
          configurationId: backup.configurationId,
          type: backup.type,
          status: backup.status,
          startedAt: backup.startedAt,
          completedAt: backup.completedAt,
          size: backup.size,
          compressedSize: backup.compressedSize,
          compressionRatio: backup.metadata.compressionRatio,
          verificationStatus: backup.metadata.verificationStatus,
          performanceMetrics: backup.metadata.performanceMetrics,
          expiresAt: backup.expiresAt,
        })),
        total,
        hasMore: filters.offset + filters.limit < total,
      },
    })

  } catch (error) {
    console.error('Error fetching backup information:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backup information' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can manage backups
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, configurationId, backupId, type, reason } = BackupExecutionSchema.parse(body)

    let result: any
    let auditDescription: string
    let auditSeverity = AuditSeverity.HIGH
    let riskScore = 70

    switch (action) {
      case 'execute':
        if (!configurationId) {
          return NextResponse.json(
            { success: false, error: 'Configuration ID is required for backup execution' },
            { status: 400 }
          )
        }

        const executedBackupId = await backupService.executeBackup(
          configurationId,
          type || BackupType.FULL,
          user.id
        )

        result = {
          backupId: executedBackupId,
          message: 'Backup execution started successfully',
        }
        auditDescription = `Started ${type || BackupType.FULL} backup execution`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 60
        break

      case 'verify':
        if (!backupId) {
          return NextResponse.json(
            { success: false, error: 'Backup ID is required for verification' },
            { status: 400 }
          )
        }

        const isValid = await backupService.verifyBackupIntegrity(backupId)
        result = {
          backupId,
          isValid,
          message: isValid ? 'Backup integrity verified successfully' : 'Backup integrity verification failed',
        }
        auditDescription = `Verified backup integrity: ${isValid ? 'PASSED' : 'FAILED'}`
        auditSeverity = isValid ? AuditSeverity.MEDIUM : AuditSeverity.HIGH
        riskScore = isValid ? 40 : 80
        break

      case 'delete':
        if (!backupId) {
          return NextResponse.json(
            { success: false, error: 'Backup ID is required for deletion' },
            { status: 400 }
          )
        }

        await backupService.deleteBackup(backupId, reason || 'manual_deletion')
        result = {
          backupId,
          message: 'Backup deleted successfully',
        }
        auditDescription = `Deleted backup ${backupId}`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 90
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the backup operation
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/backup',
        method: 'POST',
      },
      {
        action: action === 'execute' ? AuditAction.CREATE : 
                action === 'verify' ? AuditAction.READ : AuditAction.DELETE,
        category: AuditCategory.SYSTEM_ADMIN,
        severity: auditSeverity,
        description: auditDescription,
        resourceType: 'backup',
        resourceId: backupId || configurationId,
        metadata: {
          action,
          configurationId,
          backupId,
          type,
          reason,
          ...result,
        },
        complianceFlags: ['BACKUP_MANAGEMENT'],
        riskScore,
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error managing backup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to manage backup' },
      { status: 500 }
    )
  }
}