// API route for toggling recurring task pause/resume

import { NextRequest, NextResponse } from 'next/server'
import { RecurringTaskService } from '@/lib/recurring-task-service'
import { z } from 'zod'

const toggleSchema = z.object({
  isPaused: z.boolean(),
})

// POST /api/tasks/recurring/[id]/toggle - Toggle pause/resume
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        { status: 400 }
      )
    }

    // Validate request body
    const validationResult = toggleSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { isPaused } = validationResult.data

    // Toggle recurring task
    const recurringTask = await RecurringTaskService.toggleRecurringTask(
      params.id,
      organizationId,
      isPaused
    )

    return NextResponse.json({
      success: true,
      data: recurringTask,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error toggling recurring task:', error)
    
    if (error instanceof Error && error.message === 'Recurring task not found') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Recurring task not found',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to toggle recurring task',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}