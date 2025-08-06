// Search Suggestions API - Auto-complete suggestions
import { NextRequest, NextResponse } from 'next/server'
import { elasticSearchService } from '@/lib/elasticsearch-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const suggestionsQuerySchema = z.object({
  q: z.string().min(1, 'Query is required'),
  limit: z.number().int().min(1).max(20).default(5)
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
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '5')

    const validatedQuery = suggestionsQuerySchema.parse({ q: query, limit })

    const suggestions = await elasticSearchService.suggest(
      validatedQuery.q,
      user.organizationId,
      validatedQuery.limit
    )

    return NextResponse.json({
      success: true,
      data: {
        query: validatedQuery.q,
        suggestions
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error getting search suggestions:', error)
    
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
          message: error instanceof Error ? error.message : 'Failed to get suggestions'
        }
      },
      { status: 500 }
    )
  }
}