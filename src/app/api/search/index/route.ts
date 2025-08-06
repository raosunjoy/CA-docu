// Search Index Management API - Admin operations for search index
import { NextRequest, NextResponse } from 'next/server'
import { elasticSearchService } from '@/lib/elasticsearch-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const indexActionSchema = z.object({
  action: z.enum(['create', 'delete', 'reindex', 'stats', 'health']),
  organizationId: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, organizationId } = indexActionSchema.parse(body)

    let result: any

    switch (action) {
      case 'create':
        await elasticSearchService.createIndex()
        result = { message: 'Index created successfully' }
        break

      case 'delete':
        await elasticSearchService.deleteIndex()
        result = { message: 'Index deleted successfully' }
        break

      case 'reindex':
        await elasticSearchService.reindexAll(organizationId)
        result = { 
          message: organizationId 
            ? `Reindexed content for organization ${organizationId}` 
            : 'Full reindex completed'
        }
        break

      case 'stats':
        result = await elasticSearchService.getStats(organizationId)
        break

      case 'health':
        result = await elasticSearchService.healthCheck()
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid action'
            }
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error performing index operation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
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
          message: error instanceof Error ? error.message : 'Index operation failed'
        }
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || undefined

    const [stats, health] = await Promise.all([
      elasticSearchService.getStats(organizationId),
      elasticSearchService.healthCheck()
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        health
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error getting index information:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get index information'
        }
      },
      { status: 500 }
    )
  }
}