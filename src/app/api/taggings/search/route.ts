// Tag Search API - Find resources by tags
import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/tag-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const searchQuerySchema = z.object({
  tagIds: z.array(z.string()).min(1),
  taggableType: z.enum(['task', 'document', 'email', 'chat_channel'])
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

    const body = await request.json()
    const data = searchQuerySchema.parse(body)

    const resourceIds = await tagService.getResourcesByTags(
      data.taggableType,
      data.tagIds,
      user.organizationId
    )

    return NextResponse.json({
      success: true,
      data: {
        resourceIds,
        count: resourceIds.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error searching by tags:', error)
    
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
          message: error instanceof Error ? error.message : 'Failed to search by tags'
        }
      },
      { status: 500 }
    )
  }
}