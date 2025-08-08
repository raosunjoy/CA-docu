// Zetra Platform - Email API Routes
// Handles email listing and operations

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '../../../lib/email-service'
import { verifyToken } from '../../../lib/auth'
import { type EmailFilters } from '../../../types'

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Build filters from query parameters
    const filters: EmailFilters = {}
    
    if (searchParams.get('accountId')) {
      filters.accountId = searchParams.get('accountId')!
    }
    
    if (searchParams.get('folderId')) {
      filters.folderId = searchParams.get('folderId')!
    }
    
    if (searchParams.get('isRead')) {
      filters.isRead = searchParams.get('isRead') === 'true'
    }
    
    if (searchParams.get('isStarred')) {
      filters.isStarred = searchParams.get('isStarred') === 'true'
    }
    
    if (searchParams.get('isArchived')) {
      filters.isArchived = searchParams.get('isArchived') === 'true'
    }
    
    if (searchParams.get('fromAddress')) {
      filters.fromAddress = searchParams.get('fromAddress')!
    }
    
    if (searchParams.get('subject')) {
      filters.subject = searchParams.get('subject')!
    }
    
    if (searchParams.get('labels')) {
      filters.labels = searchParams.get('labels')!.split(',')
    }
    
    if (searchParams.get('linkedToTasks')) {
      filters.linkedToTasks = searchParams.get('linkedToTasks') === 'true'
    }
    
    if (searchParams.get('dateFrom') && searchParams.get('dateTo')) {
      filters.dateRange = [
        new Date(searchParams.get('dateFrom')!),
        new Date(searchParams.get('dateTo')!)
      ]
    }

    const result = await emailService.getEmails(payload.sub, filters, page, limit)

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch emails',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const { emailIds, action } = body

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'Email IDs are required' },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    // Process bulk actions
    const results = await Promise.allSettled(
      emailIds.map(async (emailId: string) => {
        switch (action) {
          case 'markRead':
            return emailService.markEmailAsRead(emailId, payload.sub, true)
          case 'markUnread':
            return emailService.markEmailAsRead(emailId, payload.sub, false)
          case 'star':
            return emailService.starEmail(emailId, payload.sub, true)
          case 'unstar':
            return emailService.starEmail(emailId, payload.sub, false)
          case 'archive':
            return emailService.archiveEmail(emailId, payload.sub, true)
          case 'unarchive':
            return emailService.archiveEmail(emailId, payload.sub, false)
          default:
            throw new Error(`Unknown action: ${action}`)
        }
      })
    )

    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    return NextResponse.json({
      success: true,
      data: {
        processed: emailIds.length,
        successful,
        failed,
        action
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Bulk email operation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform bulk operation',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}