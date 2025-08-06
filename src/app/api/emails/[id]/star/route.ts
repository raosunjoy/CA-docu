// Zetra Platform - Email Star API
// Handles starring/unstarring emails

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '../../../../../lib/email-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { isStarred } = body

    if (typeof isStarred !== 'boolean') {
      return NextResponse.json(
        { error: 'isStarred must be a boolean' },
        { status: 400 }
      )
    }

    await emailService.starEmail(params.id, session.user.id, isStarred)

    return NextResponse.json({
      success: true,
      data: { 
        emailId: params.id,
        isStarred 
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Email star API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update star status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}