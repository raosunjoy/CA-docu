// Channel Discovery API
// Handles discovery of public channels that users can join

import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '../../../../lib/chat-service'
import { authenticateRequest } from '../../../../lib/auth'
import type { APIResponse } from '../../../../types'

// GET /api/chat/discover - Get public channels user can join
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

    const channels = await chatService.getPublicChannels(user.organizationId, user.id)

    return NextResponse.json<APIResponse>({
      success: true,
      data: channels,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error discovering channels:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to discover channels'
      }
    }, { status: 500 })
  }
}