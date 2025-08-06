// API route for task suggestions

import { NextRequest, NextResponse } from 'next/server'
import { TaskSuggestionService } from '@/lib/task-suggestion-service'
import { z } from 'zod'

const respondToSuggestionSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
})

// GET /api/tasks/suggestions - Get task suggestions for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const minConfidence = searchParams.get('minConfidence')
    const limit = searchParams.get('limit')
    const generate = searchParams.get('generate') === 'true'

    if (!organizationId || !userId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'Organization ID and User ID are required' } },
        { status: 400 }
      )
    }

    let suggestions

    if (generate) {
      // Generate new suggestions
      suggestions = await TaskSuggestionService.generateSuggestions(
        userId,
        organizationId,
        limit ? parseInt(limit) : 10
      )
    } else {
      // Get existing suggestions from database
      const filters: any = {}
      if (type) filters.type = type
      if (status) filters.status = status
      if (minConfidence) filters.minConfidence = parseFloat(minConfidence)

      suggestions = await TaskSuggestionService.getSuggestions(userId, organizationId, filters)
    }

    return NextResponse.json({
      success: true,
      data: suggestions,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        generated: generate,
      },
    })
  } catch (error) {
    console.error('Error fetching task suggestions:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch task suggestions',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// POST /api/tasks/suggestions - Respond to a suggestion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')
    const suggestionId = body.suggestionId

    if (!organizationId || !userId || !suggestionId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'Organization ID, User ID, and Suggestion ID are required' } },
        { status: 400 }
      )
    }

    // Validate request body
    const validationResult = respondToSuggestionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validationResult.error.errors,
          },
        },
        { status: 400 }
      )
    }

    const { status } = validationResult.data

    // Respond to suggestion
    const result = await TaskSuggestionService.respondToSuggestion(
      suggestionId,
      userId,
      organizationId,
      status
    )

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error responding to suggestion:', error)
    
    if (error instanceof Error && error.message === 'Suggestion not found') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Suggestion not found',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to respond to suggestion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}