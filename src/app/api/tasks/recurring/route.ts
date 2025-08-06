// API route for recurring tasks management

import { NextRequest, NextResponse } from 'next/server'
import { RecurringTaskService } from '@/lib/recurring-task-service'
import { RecurringTaskData } from '@/types'
import { z } from 'zod'

// Validation schema for recurring task creation
const createRecurringTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  pattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  interval: z.number().min(1).optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  monthsOfYear: z.array(z.number().min(1).max(12)).optional(),
  customCron: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)),
  endType: z.enum(['NEVER', 'AFTER_OCCURRENCES', 'ON_DATE']).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  maxOccurrences: z.number().min(1).optional(),
  estimatedHours: z.number().min(0).optional(),
  requiresApproval: z.boolean().optional(),
  templateData: z.record(z.any()).optional(),
})

// GET /api/tasks/recurring - Get recurring tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const isActive = searchParams.get('isActive')
    const assignedTo = searchParams.get('assignedTo')
    const pattern = searchParams.get('pattern')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        { status: 400 }
      )
    }

    const filters: any = {}
    if (isActive !== null) filters.isActive = isActive === 'true'
    if (assignedTo) filters.assignedTo = assignedTo
    if (pattern) filters.pattern = pattern as any

    const recurringTasks = await RecurringTaskService.getRecurringTasks(organizationId, filters)

    return NextResponse.json({
      success: true,
      data: recurringTasks,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error fetching recurring tasks:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch recurring tasks',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// POST /api/tasks/recurring - Create recurring task
export async function POST(request: NextRequest) {
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
    const validationResult = createRecurringTaskSchema.safeParse(body)
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

    const recurringTaskData: RecurringTaskData = validationResult.data

    // Create recurring task
    const recurringTask = await RecurringTaskService.createRecurringTask(organizationId, recurringTaskData)

    return NextResponse.json(
      {
        success: true,
        data: recurringTask,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating recurring task:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create recurring task',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}