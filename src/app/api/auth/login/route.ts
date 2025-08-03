// Login API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyPassword, createSessionToken } from '@/lib/auth'
import { APIResponse } from '@/types'

// Login request schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  deviceId: z.string().optional()
})

interface LoginResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    organizationId: string
  }
  token: string
  expiresAt: number
}

async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      organization: {
        select: { id: true, name: true }
      }
    }
  })

  if (!user) {
    return { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }
  }

  if (!user.isActive) {
    return { 
      error: { 
        code: 'FORBIDDEN', 
        message: 'Account is deactivated. Please contact your administrator.' 
      } 
    }
  }

  if (!user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }
  }

  return { user }
}

interface UserData {
  id: string
  organizationId: string
}

async function updateLoginData(user: UserData, deviceId: string | undefined, request: NextRequest) {
  // Update last login time
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })

  // Log successful login for audit
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: 'login',
      resourceType: 'user',
      resourceId: user.id,
      newValues: {
        deviceId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      },
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null
    }
  })
}

interface UserResponseData extends UserData {
  email: string
  firstName: string
  lastName: string
  role: string
}

function createSuccessResponse(user: UserResponseData, token: string, expiresAt: number) {
  return NextResponse.json(
    {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId
        },
        token,
        expiresAt
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    },
    { 
      status: 200,
      headers: {
        'Set-Cookie': `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      }
    }
  )
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<LoginResponse>>> {
  try {
    const body = await request.json()
    const { email, password, deviceId } = loginSchema.parse(body)

    const validation = await validateUser(email, password)
    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error
        },
        { status: validation.error.code === 'FORBIDDEN' ? 403 : 401 }
      )
    }

    const { user } = validation
    const token = createSessionToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      deviceId
    )

    await updateLoginData(user, deviceId, request)
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days

    return createSuccessResponse(user, token, expiresAt)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    // eslint-disable-next-line no-console
    console.error('Login error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login'
        }
      },
      { status: 500 }
    )
  }
}