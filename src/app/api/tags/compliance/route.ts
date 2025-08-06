// Tag Compliance API - Compliance rules and violations
import { NextRequest, NextResponse } from 'next/server'
import { tagAuditService } from '@/lib/tag-audit-service'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const complianceRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  ruleType: z.enum(['required', 'forbidden', 'format', 'retention', 'access']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'regex', 'exists', 'not_exists']),
    value: z.any().optional(),
    logicalOperator: z.enum(['AND', 'OR']).optional()
  })),
  actions: z.array(z.object({
    type: z.enum(['log', 'notify', 'block', 'auto_fix', 'escalate']),
    config: z.record(z.any())
  })),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  isActive: z.boolean().default(true)
})

const reportRequestSchema = z.object({
  reportType: z.enum(['violations', 'usage', 'retention', 'access']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has compliance access permissions
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Compliance access required' } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'report') {
      const reportType = searchParams.get('reportType') as any
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      if (!reportType || !startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'reportType, startDate, and endDate are required for reports'
            }
          },
          { status: 400 }
        )
      }

      const validatedRequest = reportRequestSchema.parse({
        reportType,
        startDate,
        endDate
      })

      const report = await tagAuditService.generateComplianceReport(
        user.organizationId,
        validatedRequest.reportType,
        {
          start: new Date(validatedRequest.startDate),
          end: new Date(validatedRequest.endDate)
        },
        user.id
      )

      return NextResponse.json({
        success: true,
        data: report,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    // Default: return compliance overview
    return NextResponse.json({
      success: true,
      data: {
        message: 'Tag compliance system active',
        features: [
          'Compliance rule management',
          'Violation detection',
          'Audit trail',
          'Compliance reporting'
        ]
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Error processing compliance request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
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
          message: error instanceof Error ? error.message : 'Compliance request failed'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Check if user has compliance management permissions
    if (user.role !== 'ADMIN' && user.role !== 'PARTNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Compliance management access required' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'create_rule') {
      const ruleData = complianceRuleSchema.parse(body.rule)
      
      const rule = await tagAuditService.createComplianceRule({
        ...ruleData,
        organizationId: user.organizationId,
        createdBy: user.id
      })

      return NextResponse.json({
        success: true,
        data: rule,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      }, { status: 201 })
    }

    if (action === 'execute_retention') {
      const result = await tagAuditService.executeRetentionPolicies(user.organizationId)

      return NextResponse.json({
        success: true,
        data: result,
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
          message: 'Invalid action. Supported actions: create_rule, execute_retention'
        }
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing compliance action:', error)
    
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
          message: error instanceof Error ? error.message : 'Compliance action failed'
        }
      },
      { status: 500 }
    )
  }
}