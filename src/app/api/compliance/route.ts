/**
 * Compliance Management API
 * Provides endpoints for compliance reporting, validation, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import ComplianceService, { ComplianceFramework } from '@/lib/compliance-service'
import { verifyAuth } from '@/lib/auth'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const complianceService = new ComplianceService(prisma)
const auditService = new AuditService(prisma)

// Assessment request schema
const AssessmentRequestSchema = z.object({
  action: z.enum(['assess', 'generate_report', 'monitor_changes']),
  framework: z.nativeEnum(ComplianceFramework).optional(),
  reportId: z.string().optional(),
  format: z.enum(['pdf', 'excel', 'json']).optional(),
  frameworks: z.array(z.nativeEnum(ComplianceFramework)).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only partners and admins can access compliance information
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'metrics') {
      // Get compliance metrics
      const metrics = await complianceService.getComplianceMetrics(user.organizationId)

      // Log metrics access
      await auditService.logEvent(
        {
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          endpoint: '/api/compliance',
          method: 'GET',
        },
        {
          action: AuditAction.READ,
          category: AuditCategory.COMPLIANCE,
          severity: AuditSeverity.MEDIUM,
          description: 'Accessed compliance metrics dashboard',
          resourceType: 'compliance_metrics',
          metadata: {
            overallScore: metrics.overallComplianceScore,
            totalRequirements: metrics.requirementsSummary.total,
            totalFindings: metrics.findingsSummary.total,
            upcomingDeadlines: metrics.upcomingDeadlines.length,
          },
          complianceFlags: ['COMPLIANCE_MONITORING'],
        }
      )

      return NextResponse.json({
        success: true,
        data: metrics,
      })
    }

    if (action === 'frameworks') {
      // Get available compliance frameworks
      const frameworks = Object.values(ComplianceFramework).map(framework => ({
        id: framework,
        name: framework,
        description: this.getFrameworkDescription(framework),
        mandatory: this.isFrameworkMandatory(framework),
        applicableRegions: this.getApplicableRegions(framework),
      }))

      return NextResponse.json({
        success: true,
        data: { frameworks },
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching compliance information:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch compliance information' },
      { status: 500 }
    )
  }
}

// Helper functions for framework information
function getFrameworkDescription(framework: ComplianceFramework): string {
    const descriptions = {
      [ComplianceFramework.ICAI]: 'Institute of Chartered Accountants of India professional standards',
      [ComplianceFramework.GSTN]: 'Goods and Services Tax Network compliance requirements',
      [ComplianceFramework.GDPR]: 'General Data Protection Regulation for data privacy',
      [ComplianceFramework.SOX]: 'Sarbanes-Oxley Act for financial reporting',
      [ComplianceFramework.ISO27001]: 'Information Security Management System standard',
      [ComplianceFramework.PCI_DSS]: 'Payment Card Industry Data Security Standard',
      [ComplianceFramework.HIPAA]: 'Health Insurance Portability and Accountability Act',
      [ComplianceFramework.RBI]: 'Reserve Bank of India regulatory requirements',
      [ComplianceFramework.SEBI]: 'Securities and Exchange Board of India regulations',
      [ComplianceFramework.FEMA]: 'Foreign Exchange Management Act compliance',
    }
    return descriptions[framework] || 'Compliance framework'
  }

function isFrameworkMandatory(framework: ComplianceFramework): boolean {
    const mandatory = [
      ComplianceFramework.ICAI,
      ComplianceFramework.GSTN,
      ComplianceFramework.RBI,
    ]
    return mandatory.includes(framework)
  }

function getApplicableRegions(framework: ComplianceFramework): string[] {
    const regions = {
      [ComplianceFramework.ICAI]: ['India'],
      [ComplianceFramework.GSTN]: ['India'],
      [ComplianceFramework.GDPR]: ['EU', 'Global'],
      [ComplianceFramework.SOX]: ['US', 'Global'],
      [ComplianceFramework.ISO27001]: ['Global'],
      [ComplianceFramework.PCI_DSS]: ['Global'],
      [ComplianceFramework.HIPAA]: ['US'],
      [ComplianceFramework.RBI]: ['India'],
      [ComplianceFramework.SEBI]: ['India'],
      [ComplianceFramework.FEMA]: ['India'],
    }
    return regions[framework] || ['Global']
  }

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only partners and admins can perform compliance operations
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, framework, reportId, format, frameworks } = AssessmentRequestSchema.parse(body)

    let result: any
    let auditDescription: string
    let auditSeverity = AuditSeverity.HIGH
    let riskScore = 70

    switch (action) {
      case 'assess':
        if (!framework) {
          return NextResponse.json(
            { success: false, error: 'Framework is required for assessment' },
            { status: 400 }
          )
        }

        const assessmentId = await complianceService.performAssessment(
          user.organizationId,
          framework,
          user.id
        )

        result = {
          assessmentId,
          message: `${framework} compliance assessment completed`,
        }
        auditDescription = `Performed ${framework} compliance assessment`
        auditSeverity = AuditSeverity.HIGH
        riskScore = 60
        break

      case 'generate_report':
        if (!reportId) {
          return NextResponse.json(
            { success: false, error: 'Report ID is required for report generation' },
            { status: 400 }
          )
        }

        const reportData = await complianceService.generateReport(
          reportId,
          format || 'json'
        )

        result = {
          reportId,
          filename: reportData.filename,
          mimeType: reportData.mimeType,
          size: reportData.content.length || JSON.stringify(reportData.content).length,
          message: 'Compliance report generated successfully',
        }
        auditDescription = `Generated compliance report in ${format || 'json'} format`
        auditSeverity = AuditSeverity.MEDIUM
        riskScore = 40
        break

      case 'monitor_changes':
        if (!frameworks || frameworks.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Frameworks are required for regulatory monitoring' },
            { status: 400 }
          )
        }

        const monitoring = await complianceService.monitorRegulatoryChanges(frameworks)

        result = {
          changes: monitoring.changes,
          impactAssessment: monitoring.impactAssessment,
          message: `Monitored regulatory changes for ${frameworks.length} frameworks`,
        }
        auditDescription = `Monitored regulatory changes for frameworks: ${frameworks.join(', ')}`
        auditSeverity = AuditSeverity.MEDIUM
        riskScore = 50
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Log the compliance operation
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/compliance',
        method: 'POST',
      },
      {
        action: action === 'assess' ? AuditAction.CREATE : AuditAction.READ,
        category: AuditCategory.COMPLIANCE,
        severity: auditSeverity,
        description: auditDescription,
        resourceType: 'compliance_assessment',
        resourceId: reportId || result.assessmentId,
        metadata: {
          action,
          framework,
          frameworks,
          format,
          ...result,
        },
        complianceFlags: ['COMPLIANCE_ASSESSMENT', 'REGULATORY_MONITORING'],
        riskScore,
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error performing compliance operation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform compliance operation' },
      { status: 500 }
    )
  }
}