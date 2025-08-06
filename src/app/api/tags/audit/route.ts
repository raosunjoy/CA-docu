// Tag Audit API - Audit logs and compliance monitoring
import { NextRequest, NextResponse } from 'next/server'
import { tagAuditService } from '@/lib/tag-audit-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const auditQuerySchema = z.object({
  action: z.array(z.string()).optional(),
  resourceType: z.array(z.enum(['tag', 'tagging'])).optional(),
  userId: z.string().optional(),
  tagId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50)
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has audit access permissions
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Audit access required' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    const queryData = {
      action: searchParams.get('action')?.split(',').filter(Boolean),
      resourceType: searchParams.get('resourceType')?.split(',').filter(Boolean) as ('tag' | 'tagging')[] | undefined,
      userId: searchParams.get('userId') || undefined,
      tagId: searchParams.get('tagId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    }

    const validatedQuery = auditQuerySchema.parse(queryData)

    const filters = {
      action: validatedQuery.action,
      resourceType: validatedQuery.resourceType,
      userId: validatedQuery.userId,
      tagId: validatedQuery.tagId,
      startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
      endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined
    }

    const pagination = {
      page: validatedQuery.page,
      limit: validatedQuery.limit
    }

    const result = await tagAuditService.getAuditLogs(
      user.organizationId,
      filters,
      pagination
    )

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch audit logs'
        }
      },
      { status: 500 }
    )
  }
}