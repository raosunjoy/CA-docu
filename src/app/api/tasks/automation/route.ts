// API route for task automation rules management

import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/lib/automation-service'
import { AutomationRuleData } from '@/types'
import { z } from 'zod'

// Validation schemas
const automationConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'exists']),
  value: z.any(),
  logicalOperator: z.enum(['AND', 'OR']).optional(),
})

const automationActionSchema = z.object({
  type: z.enum(['ASSIGN_TASK', 'ESCALATE_TASK', 'CREATE_TASK', 'SEND_NOTIFICATION', 'UPDATE_PRIORITY', 'ADD_COMMENT', 'DELEGATE_APPROVAL']),
  config: z.record(z.any()),
  order: z.number(),
})

const createAutomationRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  triggerType: z.enum(['DEADLINE_APPROACHING', 'TASK_OVERDUE', 'TASK_COMPLETED', 'TASK_CREATED', 'WORKLOAD_THRESHOLD', 'TIME_BASED', 'STATUS_CHANGE']),
  triggerConfig: z.record(z.any()),
  conditions: z.array(automationConditionSchema),
  actions: z.array(automationActionSchema),
  priority: z.number().optional(),
  cooldownMinutes: z.number().min(0).optional(),
  maxExecutions: z.number().min(1).optional(),
})

// GET /api/tasks/automation - Get automation rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const isActive = searchParams.get('isActive')
    const triggerType = searchParams.get('triggerType')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_ORGANIZATION', message: 'Organization ID is required' } },
        { status: 400 }
      )
    }

    const filters: any = {}
    if (isActive !== null) filters.isActive = isActive === 'true'
    if (triggerType) filters.triggerType = triggerType as any

    const automationRules = await AutomationService.getAutomationRules(organizationId, filters)

    return NextResponse.json({
      success: true,
      data: automationRules,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch automation rules',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// POST /api/tasks/automation - Create automation rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const createdBy = searchParams.get('createdBy') // This should come from auth context

    if (!organizationId || !createdBy) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'Organization ID and creator ID are required' } },
        { status: 400 }
      )
    }

    // Validate request body
    const validationResult = createAutomationRuleSchema.safeParse(body)
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

    const automationRuleData: AutomationRuleData = validationResult.data

    // Create automation rule
    const automationRule = await AutomationService.createAutomationRule(
      organizationId,
      createdBy,
      automationRuleData
    )

    return NextResponse.json(
      {
        success: true,
        data: automationRule,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating automation rule:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create automation rule',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}