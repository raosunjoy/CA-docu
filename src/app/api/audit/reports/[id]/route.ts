/**
 * Individual Audit Report API
 * Provides endpoints for retrieving specific audit reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const auditService = new AuditService(prisma)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request)
    const { id } = await params
    
    // Only admins and partners can access audit reports
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const reportId = id

    // Find the report
    const report = await prisma.auditReport.findFirst({
      where: {
        id: reportId,
        organizationId: user.organizationId,
      },
    })

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      )
    }

    // Check role-based access
    if (user.role !== 'ADMIN') {
      const hasAccess = 
        report.allowedRoles.length === 0 || 
        report.allowedRoles.includes(user.role) ||
        report.generatedBy === user.id

      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied to this report' },
          { status: 403 }
        )
      }
    }

    // Log the report access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: `/api/audit/reports/${reportId}`,
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.MEDIUM,
        description: `Accessed audit report: ${report.name}`,
        resourceType: 'audit_report',
        resourceId: reportId,
        resourceName: report.name,
        metadata: {
          reportType: report.reportType,
          status: report.status,
          totalRecords: report.totalRecords,
        },
        complianceFlags: ['REPORT_ACCESS'],
      }
    )

    return NextResponse.json({
      success: true,
      data: report,
    })

  } catch (error) {
    console.error('Error fetching audit report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit report' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request)
    const { id } = await params
    
    // Only admins can delete audit reports
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const reportId = id

    // Find the report
    const report = await prisma.auditReport.findFirst({
      where: {
        id: reportId,
        organizationId: user.organizationId,
      },
    })

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      )
    }

    // Delete the report
    await prisma.auditReport.delete({
      where: { id: reportId },
    })

    // Log the report deletion
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: `/api/audit/reports/${reportId}`,
        method: 'DELETE',
      },
      {
        action: AuditAction.DELETE,
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.HIGH,
        description: `Deleted audit report: ${report.name}`,
        resourceType: 'audit_report',
        resourceId: reportId,
        resourceName: report.name,
        oldValues: {
          name: report.name,
          reportType: report.reportType,
          totalRecords: report.totalRecords,
        },
        metadata: {
          reportType: report.reportType,
          totalRecords: report.totalRecords,
        },
        complianceFlags: ['REPORT_DELETION'],
        riskScore: 80, // High risk for deleting compliance reports
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully',
    })

  } catch (error) {
    console.error('Error deleting audit report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete audit report' },
      { status: 500 }
    )
  }
}