// Mark All Notifications Read API
// Marks all user notifications as read

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '../../../../lib/auth'
import { notificationService } from '../../../../lib/notification-service'
import type { APIResponse } from '../../../../types'

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    await notificationService.markAllAsRead(user.id)

    return NextResponse.json<APIResponse>({
      success: true,
      data: { message: 'All notifications marked as read' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark all notifications as read'
      }
    }, { status: 500 })
  }
}