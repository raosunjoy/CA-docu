// Notification Preferences API
// Handles user notification preferences

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateRequest } from '../../../../lib/auth'
import { notificationService } from '../../../../lib/notification-service'
import type { APIResponse } from '../../../../types'

// Validation schema
const preferencesSchema = z.object({
  mentions: z.boolean().optional(),
  directMessages: z.boolean().optional(),
  channelMessages: z.boolean().optional(),
  taskUpdates: z.boolean().optional(),
  documentShares: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/)
  }).optional(),
  channels: z.record(z.object({
    muted: z.boolean(),
    mentions: z.boolean()
  })).optional()
})

// GET /api/notifications/preferences - Get user notification preferences
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

    const preferences = await notificationService.getUserPreferences(user.id)

    return NextResponse.json<APIResponse>({
      success: true,
      data: preferences,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notification preferences'
      }
    }, { status: 500 })
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
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
    const validationResult = preferencesSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid preferences data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }

    await notificationService.updateUserPreferences(user.id, validationResult.data)

    const updatedPreferences = await notificationService.getUserPreferences(user.id)

    return NextResponse.json<APIResponse>({
      success: true,
      data: updatedPreferences,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update notification preferences'
      }
    }, { status: 500 })
  }
}