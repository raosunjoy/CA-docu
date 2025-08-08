// Registration API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { hashPassword, validatePasswordStrength, validateEmail, createSessionToken } from '@/lib/auth'
import { APIResponse, UserRole } from '@/types'

// Registration request schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  organizationId: z.string().cuid('Invalid organization ID'),
  role: z.nativeEnum(UserRole),
  deviceId: z.string().optional()
})

interface RegisterResponse {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    organizationId: string
  }
  token: string
  expiresAt: number
}

async function validateRegistrationData(email: string, password: string, organizationId: string) {
  if (!validateEmail(email)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } }
  }

  const passwordValidation = validatePasswordStrength(password)
  if (!passwordValidation.isValid) {
    return { 
      error: { 
        code: 'VALIDATION_ERROR', 
        message: 'Password does not meet requirements',
        details: passwordValidation.errors
      } 
    }
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  })

  if (!organization) {
    return { error: { code: 'NOT_FOUND', message: 'Organization not found' } }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })

  if (existingUser) {
    return { error: { code: 'CONFLICT', message: 'User with this email already exists' } }
  }

  return { valid: true }
}

interface UserRegistrationData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
}

async function createUserAccount(userData: UserRegistrationData) {
  const passwordHash = await hashPassword(userData.password)

  return prisma.user.create({
    data: {
      email: userData.email.toLowerCase(),
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      organizationId: userData.organizationId,
      isActive: true
    }
  })
}

interface CreatedUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
}

async function logRegistration(user: CreatedUser, deviceId: string | undefined, request: NextRequest) {
  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      action: 'REGISTER',
      category: 'AUTHENTICATION',
      description: `User ${user.firstName} ${user.lastName} registered`,
      resourceType: 'user',
      resourceId: user.id,
      occurredAt: new Date(),
      newValues: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        deviceId,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      },
      ipAddress: request.headers.get('x-forwarded-for') || null,
      userAgent: request.headers.get('user-agent') || null
    }
  })
}

function createRegistrationResponse(user: CreatedUser, token: string, expiresAt: number) {
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
      status: 201,
      headers: {
        'Set-Cookie': `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; Path=/`
      }
    }
  )
}

export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<RegisterResponse>>> {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)
    const { email, password, organizationId, deviceId } = validatedData

    const validation = await validateRegistrationData(email, password, organizationId)
    if (validation.error) {
      let status = 400
      if (validation.error.code === 'NOT_FOUND') {
        status = 404
      } else if (validation.error.code === 'CONFLICT') {
        status = 409
      }
      return NextResponse.json({ success: false, error: validation.error }, { status })
    }

    const user = await createUserAccount(validatedData)
    const token = createSessionToken(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      deviceId
    )

    await logRegistration(user, deviceId, request)
    const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days

    return createRegistrationResponse(user, token, expiresAt)
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
    console.error('Registration error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during registration'
        }
      },
      { status: 500 }
    )
  }
}