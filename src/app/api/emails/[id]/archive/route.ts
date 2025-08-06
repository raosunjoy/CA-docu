// Zetra Platform - Email Archive API
// Handles archiving/unarchiving emails

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
    const { isArchived } = body

    if (typeof isArchived !== 'boolean') {
      return NextResponse.json(
        { error: 'isArchived must be a boolean' },
        { status: 400 }
      )
    }

    await emailService.archiveEmail(params.id, session.user.id, isArchived)

    return NextResponse.json({
      success: true,
      data: { 
        emailId: params.id,
        isArchived 
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Email archive API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update archive status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}