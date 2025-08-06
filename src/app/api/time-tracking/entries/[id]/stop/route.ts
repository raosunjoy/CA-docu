// Stop Time Entry API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import { TimeTrackingService, TimeEntryResult } from '@/lib/time-tracking-service'

// Stop time entry schema
const stopTimeEntrySchema = z.object({
  endTime: z.string().datetime().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse<TimeEntryResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { id: entryId } = await params
    const body = await request.json().catch(() => ({}))
    const validatedData = stopTimeEntrySchema.parse(body)

    const endTime = validatedData.endTime ? new Date(validatedData.endTime) : new Date()

    const timeEntry = await TimeTrackingService.stopTimeEntry(
      entryId,
      endTime,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: timeEntry,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Time entry not found or not running') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Time entry not found or not running'
          }
        },
        { status: 404 }
      )
    }

    console.error('Stop time entry error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while stopping time entry'
        }
      },
      { status: 500 }
    )
  }
}