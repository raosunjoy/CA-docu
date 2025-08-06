// Zetra Platform - Email Accounts API
// Handles email account management

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '../../../../lib/email-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { type EmailAccountData } from '../../../../types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await emailService.getEmailAccounts(session.user.id)

    return NextResponse.json({
      success: true,
      data: accounts,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get email accounts API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email accounts',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const accountData: EmailAccountData = body

    // Validate required fields
    if (!accountData.provider || !accountData.email) {
      return NextResponse.json(
        { error: 'Provider and email are required' },
        { status: 400 }
      )
    }

    // Validate OAuth2 vs IMAP credentials
    if (accountData.provider === 'GMAIL' || accountData.provider === 'OUTLOOK') {
      if (!accountData.accessToken) {
        return NextResponse.json(
          { error: 'Access token is required for OAuth2 providers' },
          { status: 400 }
        )
      }
    } else if (accountData.provider === 'IMAP') {
      if (!accountData.imapHost || !accountData.smtpHost || !accountData.password) {
        return NextResponse.json(
          { error: 'IMAP/SMTP configuration is required for IMAP provider' },
          { status: 400 }
        )
      }
    }

    const account = await emailService.createEmailAccount(
      session.user.organizationId,
      session.user.id,
      accountData
    )

    return NextResponse.json({
      success: true,
      data: account,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create email account API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create email account',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}