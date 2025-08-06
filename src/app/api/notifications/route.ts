// Notifications API
// Handles user notifications and preferences

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest } from '../../../lib/auth'
import { notificationService } from '../../../lib/notification-service'
import type { APIResponse } from '../../../types'

// Validation schemas
const notificationFiltersSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  unreadOnly: z.boolean().optional(),
  type: z.string().optional()
})

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1)
})

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const filtersResult = notificationFiltersSchema.safeParse({
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      type: searchParams.get('type') || undefined
    })

    if (!filtersResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid filters',
          details: filtersResult.error.errors
        }
      }, { status: 400 })
    }

    const result = await notificationService.getUserNotifications(user.id, filtersResult.data)

    return NextResponse.json<APIResponse>({
      success: true,
      data: result.notifications,
      meta: {
        pagination: {
          page: Math.floor((filtersResult.data.offset || 0) / (filtersResult.data.limit || 50)) + 1,
          limit: filtersResult.data.limit || 50,
          total: result.total,
          hasMore: (filtersResult.data.offset || 0) + (filtersResult.data.limit || 50) < result.total
        },
        unreadCount: result.unreadCount,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications'
      }
    }, { status: 500 })
  }
}

// PUT /api/notifications - Mark notifications as read
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const validationResult = markReadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    await notificationService.markAsRead(user.id, validationResult.data.notificationIds)

    return NextResponse.json<APIResponse>({
      success: true,
      data: { marked: validationResult.data.notificationIds.length },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notifications as read'
      }
    }, { status: 500 })
  }
}

// DELETE /api/notifications - Delete notifications
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const validationResult = markReadSchema.safeParse(body) // Reuse schema

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid notification data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    await notificationService.deleteNotifications(user.id, validationResult.data.notificationIds)

    return NextResponse.json<APIResponse>({
      success: true,
      data: { deleted: validationResult.data.notificationIds.length },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error deleting notifications:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete notifications'
      }
    }, { status: 500 })
  }
}