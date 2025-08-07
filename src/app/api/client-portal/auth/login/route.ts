import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Find client by email
    const client = await prisma.client.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'ACTIVE',
        isPortalEnabled: true
      },
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

    if (!client || !client.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, client.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Update last login
    await prisma.client.update({
      where: { id: client.id },
      data: { lastLoginAt: new Date() }
    })

    // Generate JWT token
    const token = jwt.sign(
      {
        clientId: client.id,
        organizationId: client.organizationId,
        email: client.email,
        type: 'client'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // Return client data (excluding sensitive information)
    const clientData = {
      id: client.id,
      name: client.name,
      email: client.email,
      companyName: client.companyName,
      phone: client.phone,
      organization: client.organization,
      preferences: client.preferences
    }

    return NextResponse.json({
      success: true,
      data: {
        client: clientData,
        token
      }
    })

  } catch (error) {
    console.error('Client login error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}