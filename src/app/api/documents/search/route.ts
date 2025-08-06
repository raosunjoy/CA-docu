import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { DocumentType, DocumentStatus } from '@/types'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  type: z.nativeEnum(DocumentType).optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  folderId: z.string().optional(),
  uploadedBy: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tags: z.array(z.string()).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['relevance', 'name', 'uploadedAt', 'fileSize']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

interface SearchFilters {
  organizationId: string
  isDeleted: boolean
  type?: DocumentType
  status?: DocumentStatus
  folderId?: string
  uploadedBy?: string
  uploadedAt?: {
    gte?: Date
    lte?: Date
  }
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' }
    originalName?: { contains: string; mode: 'insensitive' }
    description?: { contains: string; mode: 'insensitive' }
    extractedText?: { contains: string; mode: 'insensitive' }
  }>
}

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

function buildSearchFilters(searchParams: z.infer<typeof searchSchema>, organizationId: string): SearchFilters {
  const filters: SearchFilters = {
    organizationId,
    isDeleted: false
  }

  // Add type filter
  if (searchParams.type) {
    filters.type = searchParams.type
  }

  // Add status filter
  if (searchParams.status) {
    filters.status = searchParams.status
  }

  // Add folder filter
  if (searchParams.folderId) {
    filters.folderId = searchParams.folderId
  }

  // Add uploader filter
  if (searchParams.uploadedBy) {
    filters.uploadedBy = searchParams.uploadedBy
  }

  // Add date range filters
  if (searchParams.dateFrom || searchParams.dateTo) {
    filters.uploadedAt = {}
    if (searchParams.dateFrom) {
      filters.uploadedAt.gte = new Date(searchParams.dateFrom)
    }
    if (searchParams.dateTo) {
      filters.uploadedAt.lte = new Date(searchParams.dateTo)
    }
  }

  // Add text search filters
  if (searchParams.query) {
    const searchTerms = searchParams.query.split(' ').filter(term => term.length > 0)
    
    filters.OR = searchTerms.flatMap(term => [
      { name: { contains: term, mode: 'insensitive' } },
      { originalName: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { extractedText: { contains: term, mode: 'insensitive' } }
    ])
  }

  return filters
}

function buildSortOptions(sortBy?: string, sortOrder?: string) {
  const order = sortOrder === 'asc' ? 'asc' : 'desc'
  
  switch (sortBy) {
    case 'name':
      return { name: order }
    case 'uploadedAt':
      return { uploadedAt: order }
    case 'fileSize':
      return { fileSize: order }
    case 'relevance':
    default:
      // For relevance, we'll sort by a combination of factors
      // In a real implementation, you'd use a proper search engine like ElasticSearch
      return { uploadedAt: 'desc' }
  }
}

async function searchDocumentsWithTags(
  filters: SearchFilters,
  tags: string[],
  organizationId: string
) {
  // This is a simplified implementation
  // In a real system, you'd use a proper search engine or more sophisticated queries
  
  if (tags.length === 0) {
    return prisma.document.findMany({
      where: filters,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        folder: {
          select: {
            id: true,
            name: true,
            path: true
          }
        },
        _count: {
          select: {
            annotations: true,
            comments: true,
            shares: true
          }
        }
      }
    })
  }

  // Find documents that have the specified tags
  const taggedDocuments = await prisma.tagging.findMany({
    where: {
      taggableType: 'document',
      tag: {
        organizationId,
        name: { in: tags }
      }
    },
    select: {
      taggableId: true
    }
  })

  const documentIds = taggedDocuments.map(t => t.taggableId)

  return prisma.document.findMany({
    where: {
      ...filters,
      id: { in: documentIds }
    },
    include: {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      folder: {
        select: {
          id: true,
          name: true,
          path: true
        }
      },
      _count: {
        select: {
          annotations: true,
          comments: true,
          shares: true
        }
      }
    }
  })
}

async function getSearchSuggestions(query: string, organizationId: string) {
  // Get suggestions based on existing document names and tags
  const [documentSuggestions, tagSuggestions] = await Promise.all([
    prisma.document.findMany({
      where: {
        organizationId,
        isDeleted: false,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { originalName: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        name: true,
        originalName: true
      },
      take: 5
    }),
    prisma.tag.findMany({
      where: {
        organizationId,
        name: { contains: query, mode: 'insensitive' }
      },
      select: {
        name: true
      },
      take: 5
    })
  ])

  const suggestions = [
    ...documentSuggestions.map(d => d.name),
    ...documentSuggestions.map(d => d.originalName).filter(Boolean),
    ...tagSuggestions.map(t => t.name)
  ]

  return [...new Set(suggestions)].slice(0, 10)
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const params = Object.fromEntries(searchParams.entries())
    
    // Handle tags parameter (comma-separated)
    if (params.tags) {
      params.tags = params.tags.split(',').filter(Boolean)
    }

    const searchData = searchSchema.parse(params)
    
    // Handle suggestions request
    if (searchParams.get('suggestions') === 'true') {
      const suggestions = await getSearchSuggestions(searchData.query, user.orgId)
      return createSuccessResponse({ suggestions })
    }

    const page = parseInt(searchData.page || '1')
    const limit = Math.min(parseInt(searchData.limit || '20'), 100)
    const skip = (page - 1) * limit

    const filters = buildSearchFilters(searchData, user.orgId)
    const sortOptions = buildSortOptions(searchData.sortBy, searchData.sortOrder)

    // Search documents
    const [documents, total] = await Promise.all([
      searchDocumentsWithTags(filters, searchData.tags || [], user.orgId)
        .then(docs => docs
          .sort((a, b) => {
            // Apply sorting
            const sortKey = Object.keys(sortOptions)[0] as keyof typeof a
            const sortOrder = Object.values(sortOptions)[0]
            
            if (sortKey === 'name') {
              const comparison = a.name.localeCompare(b.name)
              return sortOrder === 'asc' ? comparison : -comparison
            }
            
            if (sortKey === 'uploadedAt') {
              const comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
              return sortOrder === 'asc' ? comparison : -comparison
            }
            
            if (sortKey === 'fileSize') {
              const comparison = a.fileSize - b.fileSize
              return sortOrder === 'asc' ? comparison : -comparison
            }
            
            return 0
          })
          .slice(skip, skip + limit)
        ),
      searchDocumentsWithTags(filters, searchData.tags || [], user.orgId)
        .then(docs => docs.length)
    ])

    // Calculate search statistics
    const stats = {
      totalResults: total,
      searchTime: Date.now(), // Placeholder - in real implementation, measure actual search time
      facets: {
        types: await prisma.document.groupBy({
          by: ['type'],
          where: filters,
          _count: { type: true }
        }),
        uploaders: await prisma.document.groupBy({
          by: ['uploadedBy'],
          where: filters,
          _count: { uploadedBy: true },
          take: 10
        })
      }
    }

    return createSuccessResponse({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats,
      query: searchData.query,
      filters: {
        type: searchData.type,
        status: searchData.status,
        folderId: searchData.folderId,
        uploadedBy: searchData.uploadedBy,
        dateFrom: searchData.dateFrom,
        dateTo: searchData.dateTo,
        tags: searchData.tags
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid search parameters', 400, error.issues)
    }
    
    return createErrorResponse('SEARCH_FAILED', 'Failed to search documents', 500)
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const searchData = searchSchema.parse(body)

    // This endpoint can be used for more complex search operations
    // that require POST body (e.g., complex filter objects, saved searches)
    
    const filters = buildSearchFilters(searchData, user.orgId)
    const documents = await searchDocumentsWithTags(filters, searchData.tags || [], user.orgId)

    return createSuccessResponse({
      documents,
      total: documents.length,
      query: searchData.query
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid search data', 400, error.issues)
    }
    
    return createErrorResponse('SEARCH_FAILED', 'Failed to search documents', 500)
  }
}