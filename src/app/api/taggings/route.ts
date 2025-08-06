// Taggings API - Apply and remove tags from resources
import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/tag-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const applyTagSchema = z.object({
  tagId: z.string(),
  taggableType: z.enum(['task', 'document', 'email', 'chat_channel']),
  taggableId: z.string()
})

const bulkTaggingSchema = z.object({
  tagIds: z.array(z.string()),
  taggableType: z.enum(['task', 'document', 'email', 'chat_channel']),
  taggableIds: z.array(z.string())
})

const removeTagSchema = z.object({
  tagId: z.string(),
  taggableType: z.enum(['task', 'document', 'email', 'chat_channel']),
  taggableId: z.string()
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
    const { action } = body

    if (action === 'apply') {
      const data = applyTagSchema.parse(body)
      const tagging = await tagService.applyTag({
        ...data,
        taggedBy: user.id
      })

      return NextResponse.json({
        success: true,
        data: tagging,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      }, { status: 201 })
    }

    if (action === 'remove') {
      const data = removeTagSchema.parse(body)
      await tagService.removeTag(data, user.id)

      return NextResponse.json({
        success: true,
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    if (action === 'bulk_apply') {
      const data = bulkTaggingSchema.parse(body)
      const taggings = await tagService.bulkApplyTags({
        ...data,
        taggedBy: user.id
      })

      return NextResponse.json({
        success: true,
        data: taggings,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      }, { status: 201 })
    }

    if (action === 'bulk_remove') {
      const data = bulkTaggingSchema.parse(body)
      await tagService.bulkRemoveTags(data, user.id)

      return NextResponse.json({
        success: true,
        data: null,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid action. Must be one of: apply, remove, bulk_apply, bulk_remove'
        }
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing tagging request:', error)
    
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
          message: error instanceof Error ? error.message : 'Failed to process tagging request'
        }
      },
      { status: 500 }
    )
  }
}

// Get tags for a resource
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
    const taggableType = searchParams.get('taggableType')
    const taggableId = searchParams.get('taggableId')

    if (!taggableType || !taggableId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'taggableType and taggableId are required'
          }
        },
        { status: 400 }
      )
    }

    const tags = await tagService.getResourceTags(taggableType, taggableId)

    return NextResponse.json({
      success: true,
      data: tags,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error fetching resource tags:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch resource tags'
        }
      },
      { status: 500 }
    )
  }
}