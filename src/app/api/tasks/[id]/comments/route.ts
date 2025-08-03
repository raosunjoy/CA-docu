// Task Comments API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'

// Comment creation schema
const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000)
})

interface CommentData {
  id: string
  content: string
  taskId: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

async function validateTaskAccess(taskId: string, organizationId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId
    }
  })
}

async function getTaskComments(taskId: string): Promise<CommentData[]> {
  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return comments as CommentData[]
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<CommentData[]>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<CommentData[]>>
    }

    const { user } = authResult
    const taskId = context.params.id

    const task = await validateTaskAccess(taskId, user.orgId)
    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        },
        { status: 404 }
      )
    }

    const comments = await getTaskComments(taskId)

    return NextResponse.json({
      success: true,
      data: comments,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Get comments error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching comments'
        }
      },
      { status: 500 }
    )
  }
}

async function createTaskComment(taskId: string, content: string, authorId: string) {
  return prisma.taskComment.create({
    data: {
      taskId,
      content,
      authorId
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  })
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<CommentData>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<CommentData>>
    }

    const { user } = authResult
    const taskId = context.params.id

    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    const task = await validateTaskAccess(taskId, user.orgId)
    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found'
          }
        },
        { status: 404 }
      )
    }

    const comment = await createTaskComment(taskId, validatedData.content, user.sub)

    return NextResponse.json({
      success: true,
      data: comment as CommentData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })
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

    // eslint-disable-next-line no-console
    console.error('Create comment error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating comment'
        }
      },
      { status: 500 }
    )
  }
}