// API route for individual automation rule management

import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/lib/automation-service'
import { AutomationRuleData } from '@/types'
import { z } from 'zod'

// Validation schemas (reused from main route)
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

const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  triggerType: z.enum(['DEADLINE_APPROACHING', 'TASK_OVERDUE', 'TASK_COMPLETED', 'TASK_CREATED', 'WORKLOAD_THRESHOLD', 'TIME_BASED', 'STATUS_CHANGE']).optional(),
  triggerConfig: z.record(z.any()).optional(),
  conditions: z.array(automationConditionSchema).optional(),
  actions: z.array(automationActionSchema).optional(),
  priority: z.number().optional(),
  cooldownMinutes: z.number().min(0).optional(),
  maxExecutions: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
})

// PUT /api/tasks/automation/[id] - Update automation rule
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
    const validationResult = updateAutomationRuleSchema.safeParse(body)
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

    const updateData: Partial<AutomationRuleData> = validationResult.data

    // Update automation rule
    const automationRule = await AutomationService.updateAutomationRule(
      params.id,
      organizationId,
      updateData
    )

    return NextResponse.json({
      success: true,
      data: automationRule,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error updating automation rule:', error)
    
    if (error instanceof Error && error.message === 'Automation rule not found') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Automation rule not found',
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
          message: 'Failed to update automation rule',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/automation/[id] - Delete automation rule
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

    // Soft delete by marking as inactive
    await AutomationService.updateAutomationRule(params.id, organizationId, { isActive: false })

    return NextResponse.json({
      success: true,
      data: { id: params.id, deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error deleting automation rule:', error)
    
    if (error instanceof Error && error.message === 'Automation rule not found') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Automation rule not found',
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
          message: 'Failed to delete automation rule',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}