// Tag History API - Change history and rollback functionality
import { NextRequest, NextResponse } from 'next/server'
import { tagAuditService } from '@/lib/tag-audit-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const rollbackSchema = z.object({
  changeId: z.string(),
  reason: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const history = await tagAuditService.getTagChangeHistory(params.id, limit)

    return NextResponse.json({
      success: true,
      data: {
        tagId: params.id,
        history,
        total: history.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error fetching tag history:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch tag history'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has rollback permissions
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Rollback access required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'rollback') {
      const { changeId, reason } = rollbackSchema.parse(body)

      await tagAuditService.rollbackTagChange(params.id, changeId, user.id)

      // Log the rollback action
      await tagAuditService.logTagAction({
        organizationId: user.organizationId,
        action: 'update',
        resourceType: 'tag',
        resourceId: params.id,
        userId: user.id,
        metadata: {
          rollback: true,
          changeId,
          reason
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          message: 'Tag change rolled back successfully',
          tagId: params.id,
          changeId,
          rolledBackBy: user.id,
          rolledBackAt: new Date().toISOString()
        },
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
          message: 'Invalid action. Supported actions: rollback'
        }
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing tag history action:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
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
          message: error instanceof Error ? error.message : 'History action failed'
        }
      },
      { status: 500 }
    )
  }
}