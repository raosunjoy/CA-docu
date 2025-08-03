// Logout API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'
import { APIResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<{ message: string }>>> {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware()(request, {})
    
    if (authResult instanceof NextResponse) {
      return authResult // Return error response from middleware
    }

    const { user } = authResult

    // Log logout for audit trail
    await prisma.auditLog.create({
      data: {
        organizationId: user.orgId,
        userId: user.sub,
        action: 'logout',
        resourceType: 'user',
        resourceId: user.sub,
        newValues: {
          deviceId: user.deviceId,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        },
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Successfully logged out'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      },
      {
        status: 200,
        headers: {
          'Set-Cookie': 'auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
        }
      }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Logout error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during logout'
        }
      },
      { status: 500 }
    )
  }
}