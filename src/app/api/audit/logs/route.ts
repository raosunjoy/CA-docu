/**
 * Audit Logs API
 * Provides endpoints for searching and retrieving audit logs
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AuditService, AuditSearchFilters } from '@/lib/audit-service'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

const auditService = new AuditService(prisma)

// Search filters schema
const SearchFiltersSchema = z.object({
  userId: z.string().optional(),
  actions: z.array(z.nativeEnum(AuditAction)).optional(),
  categories: z.array(z.nativeEnum(AuditCategory)).optional(),
  severities: z.array(z.nativeEnum(AuditSeverity)).optional(),
  resourceTypes: z.array(z.string()).optional(),
  resourceIds: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  complianceFlags: z.array(z.string()).optional(),
  riskScoreMin: z.number().min(0).max(100).optional(),
  riskScoreMax: z.number().min(0).max(100).optional(),
  searchText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
})

export async function GET(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only admins and partners can access audit logs
    if (!['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parse search parameters
    const rawFilters = {
      userId: searchParams.get('userId') || undefined,
      actions: searchParams.get('actions')?.split(',') || undefined,
      categories: searchParams.get('categories')?.split(',') || undefined,
      severities: searchParams.get('severities')?.split(',') || undefined,
      resourceTypes: searchParams.get('resourceTypes')?.split(',') || undefined,
      resourceIds: searchParams.get('resourceIds')?.split(',') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      complianceFlags: searchParams.get('complianceFlags')?.split(',') || undefined,
      riskScoreMin: searchParams.get('riskScoreMin') ? parseInt(searchParams.get('riskScoreMin')!) : undefined,
      riskScoreMax: searchParams.get('riskScoreMax') ? parseInt(searchParams.get('riskScoreMax')!) : undefined,
      searchText: searchParams.get('searchText') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    }

    // Validate filters
    const filters = SearchFiltersSchema.parse(rawFilters)

    // Add organization filter
    const searchFilters: AuditSearchFilters = {
      ...filters,
      organizationId: user.organizationId,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    }

    // Search audit logs
    const result = await auditService.searchAuditLogs(searchFilters)

    // Log the audit log access
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/audit/logs',
        method: 'GET',
      },
      {
        action: AuditAction.READ,
        category: AuditCategory.COMPLIANCE,
        severity: AuditSeverity.MEDIUM,
        description: 'Accessed audit logs',
        resourceType: 'audit_logs',
        metadata: {
          filtersApplied: Object.keys(filters).filter(key => filters[key as keyof typeof filters] !== undefined),
          recordsReturned: result.logs.length,
        },
        complianceFlags: ['AUDIT_ACCESS'],
      }
    )

    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error) {
    console.error('Error searching audit logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search audit logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await verifyAuth(request)
    
    // Only system can create audit logs directly (usually done via service)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Direct audit log creation not allowed' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Manual audit log creation (for testing or special cases)
    await auditService.logEvent(
      {
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/audit/logs',
        method: 'POST',
      },
      body
    )

    return NextResponse.json({
      success: true,
      message: 'Audit log created successfully',
    })

  } catch (error) {
    console.error('Error creating audit log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create audit log' },
      { status: 500 }
    )
  }
}