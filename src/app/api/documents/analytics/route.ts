import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  folderId: z.string().optional(),
  userId: z.string().optional(),
  documentType: z.enum(['PDF', 'WORD', 'EXCEL', 'IMAGE', 'OTHER']).optional(),
  metrics: z.array(z.enum([
    'uploads',
    'downloads',
    'views',
    'shares',
    'annotations',
    'comments',
    'storage',
    'activity'
  ])).optional()
})

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

interface SuccessResponse<T = unknown> {
  success: true
  data: T
}

function createErrorResponse(code: string, message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    } as ErrorResponse,
    { status }
  )
}

function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data
    } as SuccessResponse<T>,
    { status }
  )
}

function getDateRange(period: string, startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date()
  let start: Date

  if (startDate) {
    start = new Date(startDate)
  } else {
    switch (period) {
      case 'day':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate())
        break
      case 'quarter':
        start = new Date(end.getFullYear(), end.getMonth() - 3, end.getDate())
        break
      case 'year':
        start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
        break
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
  }

  return { start, end }
}

function buildDocumentFilters(query: z.infer<typeof analyticsQuerySchema>, organizationId: string) {
  const filters: any = {
    organizationId,
    isDeleted: false
  }

  if (query.folderId) {
    filters.folderId = query.folderId
  }

  if (query.userId) {
    filters.uploadedBy = query.userId
  }

  if (query.documentType) {
    filters.type = query.documentType
  }

  return filters
}

async function getUploadMetrics(filters: any, dateRange: { start: Date; end: Date }) {
  const uploads = await prisma.document.groupBy({
    by: ['type'],
    where: {
      ...filters,
      uploadedAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    _count: { id: true },
    _sum: { fileSize: true }
  })

  const totalUploads = uploads.reduce((sum, item) => sum + item._count.id, 0)
  const totalSize = uploads.reduce((sum, item) => sum + (item._sum.fileSize || 0), 0)

  return {
    totalUploads,
    totalSize,
    byType: uploads.reduce((acc, item) => {
      acc[item.type] = {
        count: item._count.id,
        size: item._sum.fileSize || 0
      }
      return acc
    }, {} as Record<string, { count: number; size: number }>)
  }
}

async function getViewMetrics(filters: any, dateRange: { start: Date; end: Date }) {
  // This would typically come from access logs or analytics events
  // For now, we'll use lastAccessedAt as a proxy
  const views = await prisma.document.findMany({
    where: {
      ...filters,
      lastAccessedAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    select: {
      id: true,
      type: true,
      lastAccessedAt: true,
      uploadedBy: true
    }
  })

  return {
    totalViews: views.length,
    uniqueDocuments: new Set(views.map(v => v.id)).size,
    byType: views.reduce((acc, view) => {
      acc[view.type] = (acc[view.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

async function getShareMetrics(filters: any, dateRange: { start: Date; end: Date }) {
  const shares = await prisma.documentShare.findMany({
    where: {
      document: filters,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      document: {
        select: {
          type: true
        }
      }
    }
  })

  const totalShares = shares.length
  const totalAccess = shares.reduce((sum, share) => sum + share.accessCount, 0)

  return {
    totalShares,
    totalAccess,
    byType: shares.reduce((acc, share) => {
      const type = share.document.type
      if (!acc[type]) {
        acc[type] = { shares: 0, access: 0 }
      }
      acc[type].shares += 1
      acc[type].access += share.accessCount
      return acc
    }, {} as Record<string, { shares: number; access: number }>),
    byShareType: shares.reduce((acc, share) => {
      acc[share.shareType] = (acc[share.shareType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

async function getAnnotationMetrics(filters: any, dateRange: { start: Date; end: Date }) {
  const annotations = await prisma.documentAnnotation.findMany({
    where: {
      document: filters,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      document: {
        select: {
          type: true
        }
      }
    }
  })

  return {
    totalAnnotations: annotations.length,
    byType: annotations.reduce((acc, annotation) => {
      acc[annotation.type] = (acc[annotation.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byDocumentType: annotations.reduce((acc, annotation) => {
      const type = annotation.document.type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

async function getCommentMetrics(filters: any, dateRange: { start: Date; end: Date }) {
  const comments = await prisma.documentComment.findMany({
    where: {
      document: filters,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end
      }
    },
    include: {
      document: {
        select: {
          type: true
        }
      }
    }
  })

  const rootComments = comments.filter(c => !c.parentId)
  const replies = comments.filter(c => c.parentId)

  return {
    totalComments: comments.length,
    rootComments: rootComments.length,
    replies: replies.length,
    byDocumentType: comments.reduce((acc, comment) => {
      const type = comment.document.type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

async function getStorageMetrics(filters: any) {
  const storage = await prisma.document.groupBy({
    by: ['type'],
    where: filters,
    _count: { id: true },
    _sum: { fileSize: true },
    _avg: { fileSize: true },
    _max: { fileSize: true }
  })

  const totalFiles = storage.reduce((sum, item) => sum + item._count.id, 0)
  const totalSize = storage.reduce((sum, item) => sum + (item._sum.fileSize || 0), 0)
  const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0

  return {
    totalFiles,
    totalSize,
    averageSize,
    byType: storage.reduce((acc, item) => {
      acc[item.type] = {
        count: item._count.id,
        totalSize: item._sum.fileSize || 0,
        averageSize: item._avg.fileSize || 0,
        maxSize: item._max.fileSize || 0
      }
      return acc
    }, {} as Record<string, any>)
  }
}

async function getActivityMetrics(filters: any, dateRange: { start: Date; end: Date }) {
  // Get daily activity breakdown
  const activities = await prisma.$queryRaw`
    SELECT 
      DATE(created_at) as date,
      'upload' as activity_type,
      COUNT(*) as count
    FROM documents 
    WHERE organization_id = ${filters.organizationId}
      AND created_at >= ${dateRange.start}
      AND created_at <= ${dateRange.end}
      AND is_deleted = false
      ${filters.folderId ? `AND folder_id = ${filters.folderId}` : ''}
      ${filters.uploadedBy ? `AND uploaded_by = ${filters.uploadedBy}` : ''}
      ${filters.type ? `AND type = ${filters.type}` : ''}
    GROUP BY DATE(created_at)
    
    UNION ALL
    
    SELECT 
      DATE(created_at) as date,
      'annotation' as activity_type,
      COUNT(*) as count
    FROM document_annotations da
    JOIN documents d ON da.document_id = d.id
    WHERE d.organization_id = ${filters.organizationId}
      AND da.created_at >= ${dateRange.start}
      AND da.created_at <= ${dateRange.end}
      AND d.is_deleted = false
      ${filters.folderId ? `AND d.folder_id = ${filters.folderId}` : ''}
      ${filters.uploadedBy ? `AND d.uploaded_by = ${filters.uploadedBy}` : ''}
      ${filters.type ? `AND d.type = ${filters.type}` : ''}
    GROUP BY DATE(da.created_at)
    
    UNION ALL
    
    SELECT 
      DATE(created_at) as date,
      'comment' as activity_type,
      COUNT(*) as count
    FROM document_comments dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.organization_id = ${filters.organizationId}
      AND dc.created_at >= ${dateRange.start}
      AND dc.created_at <= ${dateRange.end}
      AND d.is_deleted = false
      ${filters.folderId ? `AND d.folder_id = ${filters.folderId}` : ''}
      ${filters.uploadedBy ? `AND d.uploaded_by = ${filters.uploadedBy}` : ''}
      ${filters.type ? `AND d.type = ${filters.type}` : ''}
    GROUP BY DATE(dc.created_at)
    
    ORDER BY date DESC
  ` as any[]

  // Group activities by date
  const activityByDate = activities.reduce((acc, activity) => {
    const date = activity.date.toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = {}
    }
    acc[date][activity.activity_type] = activity.count
    return acc
  }, {} as Record<string, Record<string, number>>)

  return {
    activityByDate,
    totalActivities: activities.reduce((sum, activity) => sum + activity.count, 0)
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const query = analyticsQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const dateRange = getDateRange(query.period, query.startDate, query.endDate)
    const filters = buildDocumentFilters(query, user.orgId)

    const requestedMetrics = query.metrics || ['uploads', 'views', 'shares', 'annotations', 'comments', 'storage']
    const analytics: any = {
      period: query.period,
      dateRange,
      filters: {
        folderId: query.folderId,
        userId: query.userId,
        documentType: query.documentType
      }
    }

    // Fetch requested metrics
    if (requestedMetrics.includes('uploads')) {
      analytics.uploads = await getUploadMetrics(filters, dateRange)
    }

    if (requestedMetrics.includes('views')) {
      analytics.views = await getViewMetrics(filters, dateRange)
    }

    if (requestedMetrics.includes('shares')) {
      analytics.shares = await getShareMetrics(filters, dateRange)
    }

    if (requestedMetrics.includes('annotations')) {
      analytics.annotations = await getAnnotationMetrics(filters, dateRange)
    }

    if (requestedMetrics.includes('comments')) {
      analytics.comments = await getCommentMetrics(filters, dateRange)
    }

    if (requestedMetrics.includes('storage')) {
      analytics.storage = await getStorageMetrics(filters)
    }

    if (requestedMetrics.includes('activity')) {
      analytics.activity = await getActivityMetrics(filters, dateRange)
    }

    // Calculate summary metrics
    analytics.summary = {
      totalDocuments: analytics.storage?.totalFiles || 0,
      totalSize: analytics.storage?.totalSize || 0,
      totalUploads: analytics.uploads?.totalUploads || 0,
      totalViews: analytics.views?.totalViews || 0,
      totalShares: analytics.shares?.totalShares || 0,
      totalAnnotations: analytics.annotations?.totalAnnotations || 0,
      totalComments: analytics.comments?.totalComments || 0,
      totalActivities: analytics.activity?.totalActivities || 0
    }

    return createSuccessResponse({ analytics })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid analytics query parameters', 400, error.issues)
    }
    return createErrorResponse('ANALYTICS_FAILED', 'Failed to generate document analytics', 500)
  }
}