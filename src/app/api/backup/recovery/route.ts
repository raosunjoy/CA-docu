/**
 * Recovery Management API
 * Provides endpoints for disaster recovery and restoration operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import BackupRecoveryService, { RecoveryType } from '@/lib/backup-recovery-service'
import { verifyAuth } from '@/lib/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const backupService = new BackupRecoveryService(prisma)
const auditService = new AuditService(prisma)

// Recovery operation schema
const RecoveryOperationSchema = z.object({
  action: z.enum(['restore', 'test_plan', 'create_plan']),
  backupId: z.string().optional(),
  planId: z.string().optional(),
  type: z.nativeEnum(RecoveryType).optional(),
  targetTime: z.string().datetime().optional(),
  selectiveRestore: z.object({
    databases: z.array(z.string()).optional(),
    tables: z.array(z.string()).optional(),
    files: z.array(z.string()).optional(),
  }).optional(),
  overwriteExisting: z.boolean().default(false),
  validateBeforeRestore: z.boolean().default(true),
  notifyUsers: z.boolean().default(true),
  testType: z.enum(['scheduled', 'manual', 'disaster']).optional(),
  plan: z.object({
    name: z.string(),
    description: z.string(),
    type: z.nativeEnum(RecoveryType),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    rto: z.number().min(1).max(10080),
    rpo: z.number().min(0).max(1440),
    steps: z.array(z.object({
      order: z.number(),
      name: z.string(),
      description: z.string(),
      type: z.enum(['database', 'files', 'configuration', 'validation', 'notification']),
      automated: z.boolean(),
      estimatedDuration: z.number(),
      command: z.string().optional(),
      parameters: z.record(z.any()).default({}),
      rollbackCommand: z.string().optional(),
      successCriteria: z.array(z.string()),
      dependencies: z.array(z.string()).default([]),
    })),
    dependencies: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can perform recovery operations
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = RecoveryOperationSchema.parse(body)
    const { action } = validatedData

    let result: any
    let auditDescription: string
    let auditSeverity = AuditSeverity.CRITICAL
    let riskScore = 95

    switch (action) {
      case 'restore':
        if (!validatedData.backupId) {
          return NextResponse.json(
            { success: false, error: 'Backup ID is required for restore operation' },
            { status: 400 }
          )
        }

        // Confirm critical operation
        if (!body.confirmed) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Restore operation requires explicit confirmation',
              requiresConfirmation: true,
              warning: 'This operation will overwrite existing data and may cause downtime. Please confirm you want to proceed.'
            },
            { status: 400 }
          )
        }

        const recoveryId = await backupService.restoreFromBackup(
          validatedData.backupId,
          {
            type: validatedData.type || RecoveryType.FULL_RESTORE,
            targetTime: validatedData.targetTime ? new Date(validatedData.targetTime) : undefined,
            selectiveRestore: validatedData.selectiveRestore,
            overwriteExisting: validatedData.overwriteExisting,
            validateBeforeRestore: validatedData.validateBeforeRestore,
            notifyUsers: validatedData.notifyUsers,
          }
        )

        result = {
          recoveryId,
          message: 'Recovery operation started successfully',
          warning: 'System may experience downtime during recovery process',
        }
        auditDescription = `Started ${validatedData.type || RecoveryType.FULL_RESTORE} recovery from backup ${validatedData.backupId}`
        auditSeverity = AuditSeverity.CRITICAL
        riskScore = 95
        break

      case 'test_plan':
        if (!validatedData.planId) {
          return NextResponse.json(
            { success: false, error: 'Plan ID is required for recovery plan testing' },
            { status: 400 }
          )
        }

        const testId = await backupService.testRecoveryPlan(
          validatedData.planId,
          validatedData.testType || 'manual',
          user.id
        )

        result = {
          testId,
          message: 'Recovery plan test started successfully',
        }
        auditDescription = `Started ${validatedData.testType || 'manual'} test of recovery plan ${validatedData.planId}`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 70
        break

      case 'create_plan':
        if (!validatedData.plan) {
          return NextResponse.json(
            { success: false, error: 'Plan data is required for creating recovery plan' },
            { status: 400 }
          )
        }

        const createdPlan = await backupService.createRecoveryPlan({
          ...validatedData.plan,
          organizationId: user.organizationId,
          testResults: [],
        })

        result = {
          planId: createdPlan.id,
          plan: createdPlan,
          message: 'Recovery plan created successfully',
        }
        auditDescription = `Created recovery plan: ${validatedData.plan.name}`
        auditSeverity = AuditSeverity.MEDIUM
        riskScore = 50
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the recovery operation
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/backup/recovery',
        method: 'POST',
      },
      {
        action: action === 'create_plan' ? AuditAction.CREATE : AuditAction.UPDATE,
        category: AuditCategory.SYSTEM_ADMIN,
        severity: auditSeverity,
        description: auditDescription,
        resourceType: 'disaster_recovery',
        resourceId: validatedData.backupId || validatedData.planId || result.recoveryId || result.planId,
        metadata: {
          action,
          backupId: validatedData.backupId,
          planId: validatedData.planId,
          type: validatedData.type,
          selectiveRestore: validatedData.selectiveRestore,
          overwriteExisting: validatedData.overwriteExisting,
          validateBeforeRestore: validatedData.validateBeforeRestore,
          notifyUsers: validatedData.notifyUsers,
          testType: validatedData.testType,
          ...result,
        },
        complianceFlags: ['DISASTER_RECOVERY', 'BUSINESS_CONTINUITY'],
        riskScore,
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error performing recovery operation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform recovery operation' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can access recovery information
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'plans') {
      // Get recovery plans (mock implementation)
      const plans = [
        {
          id: 'plan-1',
          name: 'Full System Recovery',
          description: 'Complete system restoration from backup',
          type: RecoveryType.FULL_RESTORE,
          priority: 'critical',
          rto: 240, // 4 hours
          rpo: 60,  // 1 hour
          isActive: true,
          lastTestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        {
          id: 'plan-2',
          name: 'Database Point-in-Time Recovery',
          description: 'Restore database to specific point in time',
          type: RecoveryType.POINT_IN_TIME,
          priority: 'high',
          rto: 120, // 2 hours
          rpo: 15,  // 15 minutes
          isActive: true,
          lastTestedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        },
      ]

      // Log recovery plans access
      await auditService.logEvent(
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/backup/recovery',
          method: 'GET',
        },
        {
          action: AuditAction.READ,
          category: AuditCategory.SYSTEM_ADMIN,
          severity: AuditSeverity.MEDIUM,
          description: 'Accessed recovery plans',
          resourceType: 'recovery_plans',
          metadata: {
            plansCount: plans.length,
          },
          complianceFlags: ['DISASTER_RECOVERY_PLANNING'],
        }
      )

      return NextResponse.json({
        success: true,
        data: { plans },
      })
    }

    if (action === 'status') {
      const recoveryId = searchParams.get('recoveryId')
      if (!recoveryId) {
        return NextResponse.json(
          { success: false, error: 'Recovery ID is required' },
          { status: 400 }
        )
      }

      // Get recovery status (mock implementation)
      const status = {
        id: recoveryId,
        status: 'in_progress',
        progress: 65,
        currentStep: 'Restoring database tables',
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        startedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        steps: [
          { name: 'Validate backup integrity', status: 'completed', duration: 120 },
          { name: 'Prepare recovery environment', status: 'completed', duration: 300 },
          { name: 'Decrypt backup files', status: 'completed', duration: 180 },
          { name: 'Restore database tables', status: 'in_progress', duration: null },
          { name: 'Restore file system', status: 'pending', duration: null },
          { name: 'Validate restoration', status: 'pending', duration: null },
          { name: 'Notify users', status: 'pending', duration: null },
        ],
      }

      return NextResponse.json({
        success: true,
        data: status,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching recovery information:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recovery information' },
      { status: 500 }
    )
  }
}