// Get current user endpoint

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import prisma from '@/lib/prisma'
import { APIResponse } from '@/types'

interface MeResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  lastLoginAt: string | null
  organization: {
    id: string
    name: string
    subdomain: string
  }
  permissions: string[]
}

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<MeResponse>>> {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware()(request, {})
    
    if (authResult instanceof NextResponse) {
      return authResult // Return error response from middleware
    }

    const { user } = authResult

    // Get user details from database
    const userDetails = await prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subdomain: true
          }
        }
      }
    })

    if (!userDetails) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found'
          }
        },
        { status: 404 }
      )
    }

    if (!userDetails.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Account is deactivated'
          }
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: userDetails.id,
          email: userDetails.email,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          role: userDetails.role,
          isActive: userDetails.isActive,
          lastLoginAt: userDetails.lastLoginAt?.toISOString() || null,
          organization: userDetails.organization,
          permissions: user.permissions
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      },
      { status: 200 }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get user error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user data'
        }
      },
      { status: 500 }
    )
  }
}