import { NextRequest, NextResponse } from 'next/server'
import { ReportingService } from '../../../../../lib/reporting-service'
import { auth } from '../../../../../lib/auth'

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
    const templateId = searchParams.get('templateId') || undefined
    const userId = searchParams.get('userId') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    // Non-admin users can only see their own reports unless they're managers/partners
    const targetUserId = ['MANAGER', 'PARTNER', 'ADMIN'].includes(user.role) 
      ? userId 
      : user.id

    const reports = await ReportingService.getReportHistory(
      organizationId,
      templateId,
      targetUserId,
      limit
    )

    return NextResponse.json({
      success: true,
      data: reports,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        count: reports.length,
        limit
      }
    })
  } catch (error) {
    console.error('Report history API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch report history'
        }
      },
      { status: 500 }
    )
  }
}