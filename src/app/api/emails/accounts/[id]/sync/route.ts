// Zetra Platform - Email Sync API
// Handles email synchronization for accounts

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '../../../../../../lib/email-service'
import { verifyToken } from '../../../../../../lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const account = await emailService.getEmailAccount(params.id, payload.sub)
    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    // Start sync process
    const syncResult = await emailService.syncEmails(params.id)

    return NextResponse.json({
      success: true,
      data: syncResult,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Email sync API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: 'Failed to sync emails',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify account belongs to user
    const account = await emailService.getEmailAccount(params.id, payload.sub)
    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    // Get sync status and recent sync logs
    // This would typically fetch from EmailSyncLog model
    const syncStatus = {
      accountId: params.id,
      status: account.syncStatus,
      lastSyncAt: account.lastSyncAt,
      syncError: account.syncError,
      isActive: account.status === 'ACTIVE',
      syncEnabled: account.syncEnabled
    }

    return NextResponse.json({
      success: true,
      data: syncStatus,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get sync status API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get sync status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}