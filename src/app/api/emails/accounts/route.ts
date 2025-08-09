// Zetra Platform - Email Accounts API
// Handles email account management

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '../../../../lib/email-service'
import { nylasService } from '../../../../lib/nylas-service'
import { emailSyncService } from '../../../../lib/email-sync-service'
import { verifyToken } from '../../../../lib/auth'
import { type EmailAccountData } from '../../../../types'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await emailService.getEmailAccounts(payload.sub)

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
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      useNylas = false, 
      ...accountData 
    }: EmailAccountData & { useNylas?: boolean } = body

    // Validate required fields
    if (!accountData.provider || !accountData.email) {
      return NextResponse.json(
        { error: 'Provider and email are required' },
        { status: 400 }
      )
    }

    // Validate OAuth2 vs IMAP credentials
    if (accountData.provider === 'GMAIL' || accountData.provider === 'OUTLOOK') {
      if (!accountData.accessToken && !useNylas) {
        return NextResponse.json(
          { error: 'Access token is required for OAuth2 providers (unless using Nylas)' },
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

    let nylasAccountId: string | undefined

    // Create account via Nylas if requested
    if (useNylas || process.env.PREFER_NYLAS === 'true') {
      try {
        nylasAccountId = await nylasService.createAccount(accountData)
        console.log('Created Nylas account:', nylasAccountId)
      } catch (error) {
        console.error('Failed to create Nylas account:', error)
        if (useNylas) {
          // If client specifically requested Nylas, fail the request
          return NextResponse.json(
            { 
              error: 'Failed to create Nylas account',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          )
        }
      }
    }

    // Create account via email service (with optional Nylas ID)
    const account = await emailService.createEmailAccount(
      payload.orgId,
      payload.sub,
      {
        ...accountData,
        externalId: nylasAccountId,
        metadata: {
          nylasAccountId,
          useNylas: !!nylasAccountId
        }
      }
    )

    // Start real-time sync if enabled
    if (account.syncEnabled) {
      try {
        await emailSyncService.startRealTimeSync(account.id)
      } catch (error) {
        console.error('Failed to start real-time sync:', error)
        // Don't fail account creation if sync setup fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        useNylas: !!nylasAccountId,
        nylasAccountId
      },
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