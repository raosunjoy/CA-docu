// Zetra Platform - Email Search API
// Handles advanced email search functionality

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '../../../../lib/email-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { type EmailSearchFilters } from '../../../../types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Build search filters from query parameters
    const filters: EmailSearchFilters = {}
    
    if (searchParams.get('query')) {
      filters.query = searchParams.get('query')!
    }
    
    if (searchParams.get('searchIn')) {
      filters.searchIn = searchParams.get('searchIn')!.split(',') as ('subject' | 'body' | 'from' | 'to')[]
    }
    
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
    
    if (searchParams.get('hasAttachments')) {
      filters.hasAttachments = searchParams.get('hasAttachments') === 'true'
    }
    
    if (searchParams.get('dateFrom') && searchParams.get('dateTo')) {
      filters.dateRange = [
        new Date(searchParams.get('dateFrom')!),
        new Date(searchParams.get('dateTo')!)
      ]
    }
    
    if (searchParams.get('sortBy')) {
      filters.sortBy = searchParams.get('sortBy') as 'receivedAt' | 'sentAt' | 'subject' | 'fromAddress'
    }
    
    if (searchParams.get('sortOrder')) {
      filters.sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc'
    }

    const result = await emailService.searchEmails(session.user.id, filters, page, limit)

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        searchQuery: filters.query,
        totalResults: result.pagination.total
      }
    })
  } catch (error) {
    console.error('Email search API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search emails',
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      query, 
      filters = {}, 
      page = 1, 
      limit = 50,
      saveSearch = false,
      searchName 
    } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const searchFilters: EmailSearchFilters = {
      query,
      ...filters
    }

    const result = await emailService.searchEmails(session.user.id, searchFilters, page, limit)

    // TODO: Implement saved searches if saveSearch is true
    if (saveSearch && searchName) {
      // Save search logic would go here
      console.log('Saving search:', searchName, searchFilters)
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        searchQuery: query,
        totalResults: result.pagination.total,
        searchSaved: saveSearch
      }
    })
  } catch (error) {
    console.error('Advanced email search API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to perform advanced search',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}