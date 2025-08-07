/**
 * Encryption Keys Management API
 * Provides endpoints for managing encryption keys and key rotation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import EncryptionService from '@/lib/encryption-service'
import { verifyAuth } from '@/lib/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const encryptionService = new EncryptionService()
const auditService = new AuditService(prisma)

// Key generation schema
const KeyGenerationSchema = z.object({
  purpose: z.enum(['document', 'field', 'backup', 'communication']),
  expirationDays: z.number().min(1).max(3650).optional(),
})

// Key rotation schema
const KeyRotationSchema = z.object({
  keyPurpose: z.enum(['document', 'field', 'backup', 'communication']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can manage encryption keys
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'generate') {
      const { purpose, expirationDays } = KeyGenerationSchema.parse(body)
      
      // Generate new encryption key
      const key = await encryptionService.generateKey(purpose, expirationDays)

      // Log key generation
      await auditService.logEvent(
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/encryption/keys',
          method: 'POST',
        },
        {
          action: AuditAction.CREATE,
          category: AuditCategory.SECURITY,
          severity: AuditSeverity.HIGH,
          description: `Generated new encryption key for ${purpose}`,
          resourceType: 'encryption_key',
          resourceId: key.id,
          metadata: {
            purpose,
            expirationDays,
            algorithm: key.algorithm,
          },
          complianceFlags: ['KEY_GENERATION', 'ENCRYPTION'],
          riskScore: 70,
        }
      )

      return NextResponse.json({
        success: true,
        data: {
          keyId: key.id,
          purpose: key.purpose,
          algorithm: key.algorithm,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          version: key.version,
        },
      })
    }

    if (action === 'rotate') {
      const { keyPurpose } = KeyRotationSchema.parse(body)
      
      // Rotate encryption keys
      const result = await encryptionService.rotateKeys(user.organizationId, keyPurpose)

      // Log key rotation
      await auditService.logEvent(
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/encryption/keys',
          method: 'POST',
        },
        {
          action: AuditAction.UPDATE,
          category: AuditCategory.SECURITY,
          severity: AuditSeverity.HIGH,
          description: `Rotated encryption keys${keyPurpose ? ` for ${keyPurpose}` : ''}`,
          resourceType: 'encryption_keys',
          metadata: {
            keyPurpose,
            rotatedKeysCount: result.rotatedKeys.length,
            newKeysCount: result.newKeys.length,
            rotatedKeys: result.rotatedKeys,
            newKeys: result.newKeys,
          },
          complianceFlags: ['KEY_ROTATION', 'ENCRYPTION'],
          riskScore: 80,
        }
      )

      return NextResponse.json({
        success: true,
        data: result,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error managing encryption keys:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to manage encryption keys' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins can view encryption key status
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Generate encryption compliance report
    const report = await encryptionService.generateEncryptionComplianceReport(user.organizationId)

    // Log compliance report access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/encryption/keys',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.MEDIUM,
        description: 'Accessed encryption compliance report',
        resourceType: 'encryption_compliance',
        metadata: {
          complianceScore: report.complianceScore,
          totalEncryptedFields: report.totalEncryptedFields,
          totalEncryptedDocuments: report.totalEncryptedDocuments,
        },
        complianceFlags: ['ENCRYPTION_COMPLIANCE'],
      }
    )

    return NextResponse.json({
      success: true,
      data: report,
    })

  } catch (error) {
    console.error('Error fetching encryption status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch encryption status' },
      { status: 500 }
    )
  }
}