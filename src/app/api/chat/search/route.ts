// Chat Search API
// Handles searching across chat messages

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { chatService } from '../../../../lib/chat-service'
import { authenticateRequest } from '../../../../lib/auth'
import type { APIResponse, MessageType } from '../../../../types'

// Validation schemas
const searchFiltersSchema = z.object({
  query: z.string().min(1),
  channelIds: z.array(z.string()).optional(),
  userId: z.string().optional(),
  messageType: z.array(z.enum(['TEXT', 'FILE', 'TASK_REFERENCE', 'EMAIL_REFERENCE'])).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).optional()
})

// GET /api/chat/search - Search messages across channels
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
    const filtersResult = searchFiltersSchema.safeParse({
      query: searchParams.get('query'),
      channelIds: searchParams.get('channelIds')?.split(','),
      userId: searchParams.get('userId') || undefined,
      messageType: searchParams.get('messageType')?.split(',') as MessageType[],
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    })

    if (!filtersResult.success) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid search parameters',
          details: filtersResult.error.errors
        }
      }, { status: 400 })
    }

    const filters = filtersResult.data

    // If specific channels are requested, verify user has access to them
    if (filters.channelIds && filters.channelIds.length > 0) {
      for (const channelId of filters.channelIds) {
        const isMember = await chatService.isChannelMember(channelId, user.id)
        if (!isMember) {
          return NextResponse.json<APIResponse>({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `Access denied to channel ${channelId}`
            }
          }, { status: 403 })
        }
      }
    }

    const messages = await chatService.searchMessages(
      user.organizationId,
      filters.query,
      {
        channelIds: filters.channelIds,
        userId: filters.userId,
        messageType: filters.messageType,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        limit: filters.limit
      }
    )

    return NextResponse.json<APIResponse>({
      success: true,
      data: messages,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error searching messages:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to search messages'
      }
    }, { status: 500 })
  }
}