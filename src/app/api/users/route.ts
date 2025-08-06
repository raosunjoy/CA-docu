// Users API endpoint for organization members

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'
import prisma from '@/lib/prisma'

interface UserData {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
}

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<UserData[]>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<UserData[]>>
    }

    const { user } = authResult

    const users = await prisma.user.findMany({
      where: {
        organizationId: user.orgId,
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: users as UserData[],
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get users error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching users'
        }
      },
      { status: 500 }
    )
  }
}