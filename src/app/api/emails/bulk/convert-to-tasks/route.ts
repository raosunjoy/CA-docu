// Zetra Platform - Bulk Email to Task Conversion API
// Converts multiple emails to tasks in batch

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { emailService } from '@/lib/email-service'
import { type TaskCreationData } from '@/types'


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
        attachments: true,
        account: {
          select: { email: true, displayName: true }
        }
      }
    })

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid emails found' },
        { status: 404 }
      )
    }

    // Process each email
    const results: ConversionResult[] = []
    const createdTasks: any[] = []

    for (const email of emails) {
      try {
        // Generate task title
        const title = taskPrefix 
          ? `${taskPrefix}: ${email.subject || 'Email task'}`
          : email.subject || 'Task from email'

        // Create task data
        const taskData: TaskCreationData = {
          title: title.length > 200 ? `${title.substring(0, 197)  }...` : title,
          description: generateTaskDescription(email),
          status: 'TODO',
          priority: defaultPriority,
          assignedTo: defaultAssignee || null,
          createdBy: payload.sub,
          organizationId: payload.orgId,
          metadata: {
            sourceType: 'email',
            sourceId: email.id,
            fromAddress: email.fromAddress,
            emailSubject: email.subject,
            convertedAt: new Date().toISOString(),
            bulkConversion: true
          }
        }

        // Create the task
        const task = await prisma.task.create({
          data: taskData,
          include: {
            assignedUser: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            createdByUser: {
              select: { id: true, firstName: true, lastName: true, email: true }
            }
          }
        })

        // Link email to task
        await emailService.linkEmailToTask(email.id, task.id, payload.sub)

        // Handle attachments if requested
        if (includeAttachments && email.attachments.length > 0) {
          await Promise.all(
            email.attachments.map(async (attachment) => {
              try {
                await prisma.taskAttachment.create({
                  data: {
                    taskId: task.id,
                    fileName: attachment.filename,
                    filePath: attachment.filePath || '',
                    fileSize: attachment.size,
                    mimeType: attachment.contentType,
                    uploadedBy: payload.sub
                  }
                })
              } catch (error) {
                console.error(`Failed to attach file ${attachment.filename}:`, error)
              }
            })
          )
        }

        // Apply default tags if provided
        if (defaultTags.length > 0) {
          await Promise.all(
            defaultTags.map(async (tagName) => {
              try {
                // Find or create tag
                let tag = await prisma.tag.findFirst({
                  where: {
                    organizationId: payload.orgId,
                    name: tagName
                  }
                })

                if (!tag) {
                  tag = await prisma.tag.create({
                    data: {
                      organizationId: payload.orgId,
                      name: tagName,
                      createdBy: payload.sub
                    }
                  })
                }

                // Create tagging relationship
                await prisma.tagging.create({
                  data: {
                    tagId: tag.id,
                    taggableType: 'task',
                    taggableId: task.id,
                    taggedBy: payload.sub
                  }
                })
              } catch (error) {
                console.error(`Failed to apply tag ${tagName}:`, error)
              }
            })
          )
        }

        results.push({
          emailId: email.id,
          taskId: task.id,
          success: true
        })

        createdTasks.push(task)
      } catch (error) {
        console.error(`Failed to convert email ${email.id}:`, error)
        results.push({
          emailId: email.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: emailIds.length,
          successful,
          failed,
          tasksCreated: createdTasks.length
        },
        createdTasks
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        bulkOperation: true
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