import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const resetRequestSchema = z.object({
  email: z.string().email()
})

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
})

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = resetRequestSchema.parse(body)

    // Find client
    const client = await prisma.client.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'ACTIVE',
        isPortalEnabled: true
      }
    })

    if (!client) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a reset link has been sent'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

    // Store reset token (in a real app, you'd store this in a separate table)
    await prisma.client.update({
      where: { id: client.id },
      data: {
        metadata: {
          ...client.metadata as any,
          resetToken,
          resetTokenExpiry: resetTokenExpiry.toISOString()
        }
      }
    })

    // TODO: Send email with reset link
    // await sendPasswordResetEmail(client.email, resetToken)

    return NextResponse.json({
      success: true,
      message: 'Password reset link sent to your email'
    })

  } catch (error) {
    console.error('Password reset request error:', error)
    
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

// Reset password with token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = resetPasswordSchema.parse(body)

    // Find client with valid reset token
    const client = await prisma.client.findFirst({
      where: {
        status: 'ACTIVE',
        isPortalEnabled: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    const metadata = client.metadata as any
    const resetToken = metadata?.resetToken
    const resetTokenExpiry = metadata?.resetTokenExpiry

    if (!resetToken || !resetTokenExpiry || resetToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(resetTokenExpiry)) {
      return NextResponse.json(
        { success: false, error: 'Reset token has expired' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password and clear reset token
    await prisma.client.update({
      where: { id: client.id },
      data: {
        passwordHash,
        metadata: {
          ...metadata,
          resetToken: null,
          resetTokenExpiry: null
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    
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