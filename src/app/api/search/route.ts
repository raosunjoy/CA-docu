// Unified Search API - ElasticSearch powered search across all content
import { NextRequest, NextResponse } from 'next/server'
import { elasticSearchService } from '@/lib/elasticsearch-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required'),
  types: z.array(z.enum(['task', 'document', 'email', 'chat_channel', 'chat_message'])).optional(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  createdBy: z.array(z.string()).optional(),
  assignedTo: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['relevance', 'date', 'title']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  highlight: z.boolean().default(true),
  facets: z.boolean().default(true)
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

    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const queryData = {
      q: searchParams.get('q') || '',
      types: searchParams.get('types')?.split(',').filter(Boolean),
      tags: searchParams.get('tags')?.split(',').filter(Boolean),
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      createdBy: searchParams.get('createdBy')?.split(',').filter(Boolean),
      assignedTo: searchParams.get('assignedTo')?.split(',').filter(Boolean),
      status: searchParams.get('status')?.split(',').filter(Boolean),
      priority: searchParams.get('priority')?.split(',').filter(Boolean),
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'relevance',
      sortOrder: searchParams.get('sortOrder') || 'desc',
      highlight: searchParams.get('highlight') !== 'false',
      facets: searchParams.get('facets') !== 'false'
    }

    const validatedQuery = searchQuerySchema.parse(queryData)

    // Build search options
    const searchOptions = {
      query: validatedQuery.q,
      filters: {
        organizationId: user.organizationId,
        types: validatedQuery.types,
        tags: validatedQuery.tags,
        dateRange: validatedQuery.startDate && validatedQuery.endDate ? {
          start: new Date(validatedQuery.startDate),
          end: new Date(validatedQuery.endDate)
        } : undefined,
        createdBy: validatedQuery.createdBy,
        assignedTo: validatedQuery.assignedTo,
        status: validatedQuery.status,
        priority: validatedQuery.priority
      },
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      sortBy: validatedQuery.sortBy as 'relevance' | 'date' | 'title',
      sortOrder: validatedQuery.sortOrder as 'asc' | 'desc',
      highlight: validatedQuery.highlight,
      facets: validatedQuery.facets
    }

    const results = await elasticSearchService.search(searchOptions)

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error performing search:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
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
          message: error instanceof Error ? error.message : 'Search failed'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedQuery = searchQuerySchema.parse(body)

    // Build search options
    const searchOptions = {
      query: validatedQuery.q,
      filters: {
        organizationId: user.organizationId,
        types: validatedQuery.types,
        tags: validatedQuery.tags,
        dateRange: validatedQuery.startDate && validatedQuery.endDate ? {
          start: new Date(validatedQuery.startDate),
          end: new Date(validatedQuery.endDate)
        } : undefined,
        createdBy: validatedQuery.createdBy,
        assignedTo: validatedQuery.assignedTo,
        status: validatedQuery.status,
        priority: validatedQuery.priority
      },
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      sortBy: validatedQuery.sortBy as 'relevance' | 'date' | 'title',
      sortOrder: validatedQuery.sortOrder as 'asc' | 'desc',
      highlight: validatedQuery.highlight,
      facets: validatedQuery.facets
    }

    const results = await elasticSearchService.search(searchOptions)

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error performing search:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid search parameters',
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
          message: error instanceof Error ? error.message : 'Search failed'
        }
      },
      { status: 500 }
    )
  }
}