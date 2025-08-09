// Zetra Platform - Bulk Email to Task Conversion API
// Converts multiple emails to tasks in batch

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { verifyToken } from '../../../../../lib/auth'
import { emailToTaskService } from '../../../../../lib/email-to-task-service'


interface BulkConversionRequest {
  emailIds: string[]
  defaultAssignee?: string
  defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  defaultTags?: string[]
  includeAttachments?: boolean
  taskPrefix?: string
}

interface ConversionResult {
  emailId: string
  taskId?: string
  success: boolean
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: BulkConversionRequest = await request.json()
    const { 
      emailIds, 
      defaultAssignee, 
      defaultPriority = 'MEDIUM',
      defaultTags = [],
      includeAttachments = false,
      taskPrefix = ''
    } = body

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'Email IDs are required' },
        { status: 400 }
      )
    }

    if (emailIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 emails can be converted at once' },
        { status: 400 }
      )
    }

    // Fetch all emails that belong to the user
    const emails = await prisma.email.findMany({
      where: {
        id: { in: emailIds },
        account: { userId: payload.sub }
      },
      include: {
        account: true
      }
    })

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid emails found' },
        { status: 404 }
      )
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Convert emails to EmailMessage format
    const emailMessages = emails.map(email => ({
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
    }))

    // Use AI-powered batch processing
    const batchResult = await emailToTaskService.batchProcessEmails(
      emailMessages,
      user.organizationId,
      payload.sub,
      emails[0].accountId
    )

    return NextResponse.json({
      success: true,
      data: {
        results: batchResult.results,
        summary: {
          total: batchResult.processed,
          successful: batchResult.tasksCreated,
          failed: batchResult.errors,
          tasksCreated: batchResult.tasksCreated
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        bulkOperation: true,
        aiPowered: true
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Bulk email to task conversion API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'BULK_CONVERSION_ERROR',
          message: 'Failed to convert emails to tasks',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

function generateTaskDescription(email: any): string {
  const parts: string[] = []
  
  // Email metadata
  parts.push(`📧 **Email Details**`)
  parts.push(`From: ${email.fromAddress}`)
  if (email.subject) {
    parts.push(`Subject: ${email.subject}`)
  }
  parts.push(`Received: ${new Date(email.receivedAt).toLocaleString()}`)
  
  // Email content (truncated for bulk operations)
  if (email.bodyText || email.bodyHtml) {
    parts.push(`\n**Email Content:**`)
    const content = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || ''
    const preview = content.substring(0, 500) // Shorter for bulk operations
    parts.push(preview + (content.length > 500 ? '\n\n[Content truncated...]' : ''))
  }
  
  // Attachments
  if (email.attachments.length > 0) {
    parts.push(`\n**Attachments (${email.attachments.length}):**`)
    email.attachments.slice(0, 5).forEach((att: any) => { // Limit to 5 for bulk
      parts.push(`- ${att.filename}`)
    })
    if (email.attachments.length > 5) {
      parts.push(`- ... and ${email.attachments.length - 5} more`)
    }
  }
  
  parts.push(`\n---`)
  parts.push(`*This task was automatically created from email ID: ${email.id}*`)
  
  return parts.join('\n')
}