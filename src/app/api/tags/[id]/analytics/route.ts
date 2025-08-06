// Tag Analytics API - Get usage analytics for a tag
import { NextRequest, NextResponse } from 'next/server'
import { tagService } from '@/lib/tag-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
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
    const query = analyticsQuerySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined
    })

    const dateRange: [Date, Date] | undefined = query.startDate && query.endDate
      ? [new Date(query.startDate), new Date(query.endDate)]
      : undefined

    const analytics = await tagService.getTagAnalytics(params.id, dateRange)

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error fetching tag analytics:', error)
    
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
          message: error instanceof Error ? error.message : 'Failed to fetch tag analytics'
        }
      },
      { status: 500 }
    )
  }
}