import { NextRequest, NextResponse } from 'next/server'
import { ReportingService } from '../../../../lib/reporting-service'
import { auth } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || user.organizationId
    const category = searchParams.get('category') || undefined
    const reportType = searchParams.get('reportType') || undefined
    const includeCA = searchParams.get('includeCA') === 'true'

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    let templates
    if (includeCA) {
      templates = await ReportingService.getCAReportTemplates(organizationId)
    } else {
      templates = await ReportingService.getReportTemplates(organizationId, category, reportType)
    }

    return NextResponse.json({
      success: true,
      data: templates,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        count: templates.length
      }
    })
  } catch (error) {
    console.error('Reports GET API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch report templates'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, organizationId, ...data } = body

    // Validate organization access
    const targetOrgId = organizationId || user.organizationId
    if (targetOrgId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    switch (action) {
      case 'create_template':
        // Only managers and above can create templates
        if (!['MANAGER', 'PARTNER', 'ADMIN'].includes(user.role)) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
            { status: 403 }
          )
        }

        const template = await ReportingService.createReportTemplate(
          targetOrgId,
          user.id,
          data.template
        )

        return NextResponse.json({
          success: true,
          data: template,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'generate_report':
        const { templateId, parameters } = data
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Template ID is required' } },
            { status: 400 }
          )
        }

        const report = await ReportingService.generateReport(
          targetOrgId,
          templateId,
          user.id,
          parameters
        )

        return NextResponse.json({
          success: true,
          data: report,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'export_dashboard':
        const { exportConfig } = data
        if (!exportConfig) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Export config is required' } },
            { status: 400 }
          )
        }

        const dashboardExport = await ReportingService.exportDashboard(
          targetOrgId,
          user.id,
          user.role,
          exportConfig
        )

        return NextResponse.json({
          success: true,
          data: dashboardExport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'schedule_report':
        // Only managers and above can schedule reports
        if (!['MANAGER', 'PARTNER', 'ADMIN'].includes(user.role)) {
          return NextResponse.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
            { status: 403 }
          )
        }

        const { templateId: scheduleTemplateId, schedule, recipients } = data
        if (!scheduleTemplateId || !schedule) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Template ID and schedule are required' } },
            { status: 400 }
          )
        }

        await ReportingService.scheduleReport(scheduleTemplateId, schedule, recipients || [])

        return NextResponse.json({
          success: true,
          data: { scheduled: true },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      case 'share_report':
        const { reportId, shareRecipients, message } = data
        if (!reportId || !shareRecipients) {
          return NextResponse.json(
            { success: false, error: { code: 'BAD_REQUEST', message: 'Report ID and recipients are required' } },
            { status: 400 }
          )
        }

        await ReportingService.shareReport(reportId, shareRecipients, message)

        return NextResponse.json({
          success: true,
          data: { shared: true },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID()
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Unknown action' } },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Reports POST API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process report request'
        }
      },
      { status: 500 }
    )
  }
}