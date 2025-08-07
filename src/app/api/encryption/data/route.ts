/**
 * Data Encryption API
 * Provides endpoints for encrypting and decrypting data
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

// Data encryption schema
const DataEncryptionSchema = z.object({
  action: z.enum(['encrypt', 'decrypt', 'mask', 'anonymize']),
  data: z.record(z.any()),
  encryptionLevel: z.enum(['none', 'standard', 'high', 'maximum']).optional(),
  maskingLevel: z.enum(['partial', 'full']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    const body = await request.json()
    const { action, data, encryptionLevel, maskingLevel } = DataEncryptionSchema.parse(body)

    let result: any
    let auditDescription: string
    let auditSeverity = AuditSeverity.MEDIUM
    let riskScore = 50

    switch (action) {
      case 'encrypt':
        // Encrypt sensitive fields
        result = await encryptionService.encryptSensitiveFields(data, user.organizationId)
        auditDescription = `Encrypted ${result.encryptedFields.length} sensitive fields`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 60
        break

      case 'decrypt':
        // Decrypt sensitive fields
        result = await encryptionService.decryptSensitiveFields(data, user.id, user.organizationId)
        auditDescription = 'Decrypted sensitive fields'
        auditSeverity = AuditSeverity.HIGH
        riskScore = 70
        break

      case 'mask':
        // Mask sensitive data
        result = encryptionService.maskSensitiveData(data, maskingLevel || 'partial')
        auditDescription = `Masked sensitive data with ${maskingLevel || 'partial'} level`
        auditSeverity = AuditSeverity.LOW
        riskScore = 20
        break

      case 'anonymize':
        // Anonymize data
        result = encryptionService.anonymizeData(data)
        auditDescription = 'Anonymized sensitive data'
        auditSeverity = AuditSeverity.MEDIUM
        riskScore = 40
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the encryption operation
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/encryption/data',
        method: 'POST',
      },
      {
        action: action === 'encrypt' ? AuditAction.CREATE : AuditAction.READ,
        category: AuditCategory.SECURITY,
        severity: auditSeverity,
        description: auditDescription,
        resourceType: 'sensitive_data',
        metadata: {
          action,
          encryptionLevel,
          maskingLevel,
          fieldsProcessed: Object.keys(data).length,
          ...(action === 'encrypt' && result.encryptedFields ? {
            encryptedFields: result.encryptedFields,
            keyIds: result.keyIds,
          } : {}),
        },
        complianceFlags: ['DATA_PROTECTION', 'ENCRYPTION'],
        riskScore,
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error processing data encryption:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process data encryption' },
      { status: 500 }
    )
  }
}