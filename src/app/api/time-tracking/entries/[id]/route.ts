// Individual Time Entry API endpoints - Get, Update, Delete

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse, TimeEntryType } from '@/types'
import { TimeTrackingService, TimeEntryResult } from '@/lib/time-tracking-service'
import prisma from '@/lib/prisma'

// Time entry update schema
const updateTimeEntrySchema = z.object({
  description: z.string().optional(),
  endTime: z.string().datetime().optional(),
  type: z.nativeEnum(TimeEntryType).optional(),
  isBillable: z.boolean().optional(),
  hourlyRate: z.number().min(0).optional(),
  tags: z.array(z.string()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { id: entryId } = await params

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: entryId,
        organizationId: user.orgId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    if (!timeEntry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Time entry not found'
          }
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: timeEntry,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get time entry error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching time entry'
        }
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse<TimeEntryResult>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { id: entryId } = await params
    const body = await request.json()
    const validatedData = updateTimeEntrySchema.parse(body)

    const updateData = {
      description: validatedData.description,
      endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
      type: validatedData.type,
      isBillable: validatedData.isBillable,
      hourlyRate: validatedData.hourlyRate,
      tags: validatedData.tags
    }

    const timeEntry = await TimeTrackingService.updateTimeEntry(
      entryId,
      updateData,
      user.sub
    )

    return NextResponse.json({
      success: true,
      data: timeEntry,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Time entry not found') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Time entry not found'
          }
        },
        { status: 404 }
      )
    }

    console.error('Update time entry error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating time entry'
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<APIResponse>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { user } = authResult
    const { id: entryId } = await params

    // Verify the time entry exists and belongs to the user's organization
    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        id: entryId,
        organizationId: user.orgId
      }
    })

    if (!timeEntry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Time entry not found'
          }
        },
        { status: 404 }
      )
    }

    // Only allow deletion by the entry owner or admin
    if (timeEntry.userId !== user.sub && !['ADMIN', 'PARTNER'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this time entry'
          }
        },
        { status: 403 }
      )
    }

    await prisma.timeEntry.delete({
      where: { id: entryId }
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Delete time entry error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting time entry'
        }
      },
      { status: 500 }
    )
  }
}