import { NextRequest, NextResponse } from 'next/server'
import { DashboardService } from '../../../../lib/dashboard-service'
import { auth } from '../../../../lib/auth'
import type { UserRole, DashboardLayout } from '../../../../types'

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
    const role = (searchParams.get('role') as UserRole) || user.role

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    const layout = await DashboardService.getDashboardLayout(user.id, role)

    if (!layout) {
      // Return default layout for the role
      const defaultLayout = await DashboardService.getDefaultLayoutForRole(role)
      
      return NextResponse.json({
        success: true,
        data: defaultLayout,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID(),
          isDefault: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: layout,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        isDefault: false
      }
    })
  } catch (error) {
    console.error('Dashboard layout GET API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch dashboard layout'
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
    const { organizationId, layout } = body

    // Validate organization access
    const targetOrgId = organizationId || user.organizationId
    if (targetOrgId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (!layout) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Layout data is required' } },
        { status: 400 }
      )
    }

    // Validate layout structure
    const validationError = validateDashboardLayout(layout)
    if (validationError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validationError } },
        { status: 400 }
      )
    }

    const savedLayout = await DashboardService.saveDashboardLayout(
      user.id,
      targetOrgId,
      {
        ...layout,
        createdBy: user.id
      }
    )

    return NextResponse.json({
      success: true,
      data: savedLayout,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Dashboard layout POST API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save dashboard layout'
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const layoutId = searchParams.get('layoutId')
    const organizationId = searchParams.get('organizationId') || user.organizationId

    // Validate organization access
    if (organizationId !== user.organizationId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      )
    }

    if (!layoutId) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Layout ID is required' } },
        { status: 400 }
      )
    }

    await DashboardService.deleteDashboardLayout(layoutId, user.id)

    return NextResponse.json({
      success: true,
      data: { layoutId, deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Dashboard layout DELETE API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete dashboard layout'
        }
      },
      { status: 500 }
    )
  }
}

// Helper function to validate dashboard layout
function validateDashboardLayout(layout: any): string | null {
  if (!layout.name || typeof layout.name !== 'string') {
    return 'Layout name is required and must be a string'
  }

  if (!Array.isArray(layout.widgets)) {
    return 'Widgets must be an array'
  }

  for (const widget of layout.widgets) {
    if (!widget.id || typeof widget.id !== 'string') {
      return 'Each widget must have a valid ID'
    }

    if (!widget.type || typeof widget.type !== 'string') {
      return 'Each widget must have a valid type'
    }

    if (!widget.title || typeof widget.title !== 'string') {
      return 'Each widget must have a title'
    }

    if (!widget.position || 
        typeof widget.position.x !== 'number' ||
        typeof widget.position.y !== 'number' ||
        typeof widget.position.w !== 'number' ||
        typeof widget.position.h !== 'number') {
      return 'Each widget must have valid position coordinates'
    }

    if (!Array.isArray(widget.permissions)) {
      return 'Each widget must have permissions array'
    }

    if (typeof widget.isVisible !== 'boolean') {
      return 'Each widget must have isVisible boolean'
    }
  }

  return null
}