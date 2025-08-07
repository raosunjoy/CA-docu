/**
 * Audit Reports API
 * Provides endpoints for generating and managing audit reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuditService, AuditReportConfig } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { AuditAction, AuditCategory, AuditSeverity, UserRole } from '@prisma/client'

const auditService = new AuditService(prisma)

// Report configuration schema
const ReportConfigSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  reportType: z.enum(['compliance', 'security', 'activity', 'custom']),
  filters: z.object({
    userId: z.string().optional(),
    actions: z.array(z.nativeEnum(AuditAction)).optional(),
    categories: z.array(z.nativeEnum(AuditCategory)).optional(),
    severities: z.array(z.nativeEnum(AuditSeverity)).optional(),
    resourceTypes: z.array(z.string()).optional(),
    resourceIds: z.array(z.string()).optional(),
    complianceFlags: z.array(z.string()).optional(),
    riskScoreMin: z.number().min(0).max(100).optional(),
    riskScoreMax: z.number().min(0).max(100).optional(),
    searchText: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  isScheduled: z.boolean().default(false),
  schedule: z.string().optional(), // Cron expression
  allowedRoles: z.array(z.nativeEnum(UserRole)).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins and partners can access audit reports
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('reportType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {
      organizationId: user.organizationId,
    }

    if (reportType) where.reportType = reportType
    if (status) where.status = status

    // Check role-based access
    if (user.role !== 'ADMIN') {
      where.OR = [
        { allowedRoles: { has: user.role } },
        { allowedRoles: { isEmpty: true } },
        { generatedBy: user.id },
      ]
    }

    const [reports, total] = await Promise.all([
      prisma.auditReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          reportType: true,
          status: true,
          totalRecords: true,
          fileFormat: true,
          fileSize: true,
          isScheduled: true,
          lastGenerated: true,
          nextGeneration: true,
          generatedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.auditReport.count({ where }),
    ])

    // Log the report access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/audit/reports',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.MEDIUM,
        description: 'Accessed audit reports list',
        resourceType: 'audit_reports',
        metadata: {
          reportsCount: reports.length,
          filters: { reportType, status },
        },
        complianceFlags: ['REPORT_ACCESS'],
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        reports,
        total,
        hasMore: offset + limit < total,
      },
    })

  } catch (error) {
    console.error('Error fetching audit reports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit reports' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins and partners can generate audit reports
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const config = ReportConfigSchema.parse(body)

    // Add organization and user context
    const reportConfig: AuditReportConfig = {
      ...config,
      filters: {
        ...config.filters,
        organizationId: user.organizationId,
        userId: config.filters.userId || user.id,
      },
      dateRange: {
        start: new Date(config.dateRange.start),
        end: new Date(config.dateRange.end),
      },
    }

    // Generate the report
    const reportId = await auditService.generateComplianceReport(reportConfig)

    // Log the report generation
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/audit/reports',
        method: 'POST',
      },
      {
        action: AuditAction.CREATE,
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.HIGH,
        description: `Generated audit report: ${config.name}`,
        resourceType: 'audit_report',
        resourceId: reportId,
        resourceName: config.name,
        metadata: {
          reportType: config.reportType,
          format: config.format,
          dateRange: config.dateRange,
          isScheduled: config.isScheduled,
        },
        complianceFlags: ['REPORT_GENERATION'],
        riskScore: 60, // Report generation is medium-high risk
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        reportId,
        message: 'Report generation started',
      },
    })

  } catch (error) {
    console.error('Error generating audit report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate audit report' },
      { status: 500 }
    )
  }
}