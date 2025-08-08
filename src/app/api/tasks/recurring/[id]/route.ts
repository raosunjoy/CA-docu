// API route for individual recurring task management

import { NextRequest, NextResponse } from 'next/server'
import { RecurringTaskService } from '@/lib/recurring-task-service'
import { RecurringTaskUpdateData } from '@/types'
import { z } from 'zod'

// Validation schema for recurring task updates
const updateRecurringTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  pattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
  interval: z.number().min(1).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  monthsOfYear: z.array(z.number().min(1).max(12)).optional(),
  customCron: z.string().optional(),
  endType: z.enum(['NEVER', 'AFTER_OCCURRENCES', 'ON_DATE']).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  maxOccurrences: z.number().min(1).optional(),
  estimatedHours: z.number().min(0).optional(),
  requiresApproval: z.boolean().optional(),
  templateData: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
  isPaused: z.boolean().optional(),
})

// PUT /api/tasks/recurring/[id] - Update recurring task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const validationResult = updateRecurringTaskSchema.safeParse(body)
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

    const updateData: RecurringTaskUpdateData = validationResult.data

    // Update recurring task
    const recurringTask = await RecurringTaskService.updateRecurringTask(
      params.id,
      organizationId,
      updateData
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
    console.error('Error updating recurring task:', error)
    
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
          message: 'Failed to update recurring task',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/recurring/[id] - Delete recurring task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        { status: 400 }
      )
    }

    // Delete recurring task (soft delete)
    await RecurringTaskService.deleteRecurringTask(params.id, organizationId)

    return NextResponse.json({
      success: true,
      data: { id: params.id, deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error deleting recurring task:', error)
    
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
          message: 'Failed to delete recurring task',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}