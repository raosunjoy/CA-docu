// Email to Task Conversion API
import { NextRequest, NextResponse } from 'next/server'
import { emailToTaskService } from '../../../../../lib/email-to-task-service'
import { prisma } from '../../../../../lib/prisma'
import { verifyToken } from '../../../../../lib/auth'

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

    const { id: emailId } = await params

    // Get the email
    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        account: {
          userId: payload.sub
        }
      },
      include: {
        account: true
      }
    })

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    // Check if email was already converted to task
    const existingTaskId = email.metadata?.taskId as string
    if (existingTaskId) {
      return NextResponse.json({
        success: false,
        error: 'Email already converted to task',
        taskId: existingTaskId
      })
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Convert email format
    const emailMessage = {
      id: email.id,
      threadId: email.threadId,
      from: email.from,
      to: email.to || '',
      cc: email.cc || '',
      bcc: email.bcc || '',
      subject: email.subject,
      date: email.date,
      bodyText: email.bodyText || '',
      bodyHtml: email.bodyHtml || '',
      snippet: email.snippet || '',
      labels: email.labels as string[],
      isRead: email.isRead,
      isStarred: email.isStarred,
      hasAttachments: email.hasAttachments,
      internalDate: email.internalDate || email.date
    }

    // Convert email to task
    const result = await emailToTaskService.convertEmailToTask(
      emailMessage,
      user.organizationId,
      payload.sub,
      email.accountId
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          taskId: result.taskId,
          confidence: result.confidence,
          analysis: result.analysis
        },
        meta: {
          emailId,
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create task from email',
        details: {
          confidence: result.confidence,
          analysis: result.analysis,
          reason: result.analysis.isActionRequired ? 'Low confidence' : 'No action required'
        }
      })
    }
  } catch (error) {
    console.error('Email to task conversion API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CONVERSION_ERROR',
          message: 'Failed to convert email to task',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

// Get conversion analysis without creating task
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

    const { id: emailId } = await params

    // Get the email
    const email = await prisma.email.findFirst({
      where: {
        id: emailId,
        account: {
          userId: payload.sub
        }
      }
    })

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    // Convert email format
    const emailMessage = {
      id: email.id,
      threadId: email.threadId,
      from: email.from,
      to: email.to || '',
      cc: email.cc || '',
      bcc: email.bcc || '',
      subject: email.subject,
      date: email.date,
      bodyText: email.bodyText || '',
      bodyHtml: email.bodyHtml || '',
      snippet: email.snippet || '',
      labels: email.labels as string[],
      isRead: email.isRead,
      isStarred: email.isStarred,
      hasAttachments: email.hasAttachments,
      internalDate: email.internalDate || email.date
    }

    // Analyze email without creating task
    const analysis = await emailToTaskService.analyzeEmail(emailMessage)

    return NextResponse.json({
      success: true,
      data: {
        shouldCreateTask: analysis.shouldCreateTask,
        confidence: analysis.analysis.confidence,
        analysis: analysis.analysis,
        taskPreview: analysis.taskData ? {
          title: analysis.taskData.title,
          description: analysis.taskData.description,
          priority: analysis.taskData.priority,
          category: analysis.taskData.category,
          tags: analysis.taskData.tags,
          actionItems: analysis.taskData.actionItems,
          estimatedHours: analysis.taskData.estimatedHours
        } : null
      },
      meta: {
        emailId,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Email analysis API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: 'Failed to analyze email',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}