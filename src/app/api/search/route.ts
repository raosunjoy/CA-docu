import { NextRequest, NextResponse } from 'next/server'
import { vectorService } from '@/services/vector-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, filters, limit, threshold } = body

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const searchResults = await vectorService.semanticSearch({
      query,
      filters,
      limit: limit || 10,
      threshold: threshold || 0.7,
      includeMetadata: true
    })

    return NextResponse.json({
      success: true,
      data: searchResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const query = searchParams.get('q')
    const authority = searchParams.get('authority')
    const category = searchParams.get('category')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    let searchResults
    switch (type) {
      case 'regulations':
        searchResults = await vectorService.searchRegulations(query, authority || undefined)
        break
      case 'procedures':
        searchResults = await vectorService.searchProcedures(query, category || undefined)
        break
      default:
        searchResults = await vectorService.semanticSearch({ query, limit: 10 })
    }

    return NextResponse.json({
      success: true,
      data: searchResults,
      searchType: type || 'general'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}