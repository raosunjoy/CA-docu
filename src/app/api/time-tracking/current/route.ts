// Current Running Time Entry API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import { TimeTrackingService, TimeEntryResult } from '@/lib/time-tracking-service'

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<TimeEntryResult | null>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    const runningEntry = await TimeTrackingService.getRunningTimeEntry(
      user.orgId,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: runningEntry,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get current time entry error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching current time entry'
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult

    await TimeTrackingService.stopRunningEntries(user.orgId, user.sub)

    return NextResponse.json({
      success: true,
      data: { stopped: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Stop running entries error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while stopping running entries'
        }
      },
      { status: 500 }
    )
  }
}