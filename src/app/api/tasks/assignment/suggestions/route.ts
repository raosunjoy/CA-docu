// API route for smart task assignment suggestions

import { NextRequest, NextResponse } from 'next/server'
import { AutomationService } from '@/lib/automation-service'
import { z } from 'zod'

// GET /api/tasks/assignment/suggestions - Get smart assignment suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const taskId = searchParams.get('taskId')
    const limit = searchParams.get('limit')

    if (!organizationId || !taskId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAMS', message: 'Organization ID and Task ID are required' } },
        { status: 400 }
      )
    }

    // Get task details
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
      include: {
        assignedUser: true,
        createdByUser: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      )
    }

    // Get smart assignment suggestions
    const suggestions = await AutomationService.getSmartAssignmentSuggestions(
      task,
      organizationId,
      limit ? parseInt(limit) : 5
    )

    return NextResponse.json({
      success: true,
      data: {
        task: {
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          currentAssignee: task.assignedUser,
        },
        suggestions,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
      },
    })
  } catch (error) {
    console.error('Error fetching assignment suggestions:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch assignment suggestions',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}