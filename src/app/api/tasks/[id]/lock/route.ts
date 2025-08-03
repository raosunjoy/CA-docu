// Task locking API endpoints

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { APIResponse } from '@/types'

interface TaskLockData {
  id: string
  title: string
  lockedBy: string | null
  lockedAt: Date | null
  lockedByUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface LockResponse {
  task: TaskLockData
  lockAcquired: boolean
  lockedByUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

async function getTaskWithLockInfo(taskId: string, organizationId: string) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId
    },
    include: {
      lockedByUser: {
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

async function lockTask(taskId: string, userId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      lockedBy: userId,
      lockedAt: new Date()
    },
    include: {
      lockedByUser: {
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

async function unlockTask(taskId: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: {
      lockedBy: null,
      lockedAt: null
    }
  })
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<LockResponse>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<LockResponse>>
    }

    const { user } = authResult
    const taskId = context.params.id

    const existingTask = await getTaskWithLockInfo(taskId, user.orgId)

    if (!existingTask) {
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

    // Check if task is already locked by someone else
    if (existingTask.lockedBy && existingTask.lockedBy !== user.sub) {
      return NextResponse.json({
        success: true,
        data: {
          task: existingTask as TaskLockData,
          lockAcquired: false,
          lockedByUser: existingTask.lockedByUser || null
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    // Lock the task
    const lockedTask = await lockTask(taskId, user.sub)

    return NextResponse.json({
      success: true,
      data: {
        task: lockedTask as TaskLockData,
        lockAcquired: true
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Lock task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while locking task'
        }
      },
      { status: 500 }
    )
  }
}

async function validateTaskUnlock(taskId: string, userId: string, organizationId: string) {
  const existingTask = await getTaskWithLockInfo(taskId, organizationId)

  if (!existingTask) {
    return { error: { code: 'NOT_FOUND', message: 'Task not found' } }
  }

  if (!existingTask.lockedBy) {
    return { error: { code: 'BAD_REQUEST', message: 'Task is not locked' } }
  }

  if (existingTask.lockedBy !== userId) {
    return { error: { code: 'FORBIDDEN', message: 'Task is locked by another user' } }
  }

  return { task: existingTask }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse<APIResponse<{ message: string }>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<{ message: string }>>
    }

    const { user } = authResult
    const taskId = context.params.id

    const validation = await validateTaskUnlock(taskId, user.sub, user.orgId)
    if (validation.error) {
      const status = validation.error.code === 'NOT_FOUND' ? 404 :
                    validation.error.code === 'FORBIDDEN' ? 403 : 400
      return NextResponse.json(
        { success: false, error: validation.error },
        { status }
      )
    }

    await unlockTask(taskId)

    return NextResponse.json({
      success: true,
      data: { message: 'Task unlocked successfully' },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unlock task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while unlocking task'
        }
      },
      { status: 500 }
    )
  }
}