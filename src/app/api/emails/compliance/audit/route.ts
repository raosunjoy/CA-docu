// Zetra Platform - Email Audit Logs API
// Provides email audit trail and compliance logging

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../../generated/prisma'
import { verifyToken } from '../../../../../lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date()
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build where clause for audit logs
    const where: any = {
      organizationId: payload.orgId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resourceType: { contains: search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ]
    }

    // Get audit logs with user information
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    // Transform audit logs to include email information
    const transformedLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let emailSubject = 'Unknown'
        
        // If the resource is an email, get the subject
        if (log.resourceType === 'email') {
          try {
            const email = await prisma.email.findUnique({
              where: { id: log.resourceId },
              select: { subject: true }
            })
            if (email) {
              emailSubject = email.subject || '(No subject)'
            }
          } catch (error) {
            console.error('Failed to fetch email subject:', error)
          }
        }

        return {
          id: log.id,
          timestamp: log.createdAt,
          userId: log.userId || 'system',
          userName: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
          action: log.action,
          emailId: log.resourceType === 'email' ? log.resourceId : '',
          emailSubject,
          details: generateAuditDetails(log),
          ipAddress: log.ipAddress
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: transformedLogs,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    })
  } catch (error) {
    console.error('Email audit logs API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to fetch audit logs',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logData = await request.json()
    const { action, resourceType, resourceId, details, ipAddress } = logData

    if (!action || !resourceType || !resourceId) {
      return NextResponse.json(
        { error: 'Action, resource type, and resource ID are required' },
        { status: 400 }
      )
    }

    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: payload.orgId,
        userId: payload.sub,
        action,
        category: 'COMPLIANCE',
        description: `${action} performed on ${resourceType} ${resourceId}`,
        resourceType,
        resourceId,
        occurredAt: new Date(),
        newValues: details || {},
        ipAddress,
        userAgent: request.headers.get('user-agent')
      }
    })

    return NextResponse.json({
      success: true,
      data: auditLog,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create audit log API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'AUDIT_ERROR',
          message: 'Failed to create audit log',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

function generateAuditDetails(log: any): string {
  const action = log.action.toLowerCase()
  const resourceType = log.resourceType.toLowerCase()

  switch (action) {
    case 'view':
      return `Viewed ${resourceType}`
    case 'create':
      return `Created ${resourceType}`
    case 'update':
      return `Updated ${resourceType}`
    case 'delete':
      return `Deleted ${resourceType}`
    case 'download':
      return `Downloaded ${resourceType}`
    case 'export':
      return `Exported ${resourceType}`
    case 'sync':
      return `Synchronized ${resourceType}`
    case 'send':
      return `Sent ${resourceType}`
    case 'archive':
      return `Archived ${resourceType}`
    case 'restore':
      return `Restored ${resourceType}`
    default:
      return `Performed ${action} on ${resourceType}`
  }
}