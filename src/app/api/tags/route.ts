// Tags API - CRUD operations for hierarchical tags
import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/tag-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().max(500).optional()
})

const tagFiltersSchema = z.object({
  parentId: z.string().optional(),
  search: z.string().optional(),
  includeChildren: z.boolean().optional(),
  includeUsage: z.boolean().optional(),
  createdBy: z.string().optional()
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
    const filters = tagFiltersSchema.parse({
      parentId: searchParams.get('parentId') || undefined,
      search: searchParams.get('search') || undefined,
      includeChildren: searchParams.get('includeChildren') === 'true',
      includeUsage: searchParams.get('includeUsage') === 'true',
      createdBy: searchParams.get('createdBy') || undefined
    })

    const tags = await tagService.getTagHierarchy(user.organizationId, {
      ...filters,
      organizationId: user.organizationId
    })

    return NextResponse.json({
      success: true,
      data: tags,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch tags'
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
    const data = createTagSchema.parse(body)

    const tag = await tagService.createTag({
      ...data,
      organizationId: user.organizationId,
      createdBy: user.id
    })

    return NextResponse.json({
      success: true,
      data: tag,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
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
          message: error instanceof Error ? error.message : 'Failed to create tag'
        }
      },
      { status: 500 }
    )
  }
}