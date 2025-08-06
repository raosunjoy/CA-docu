// Zetra Platform - Email to Task Conversion API
// Converts emails to tasks with intelligent parsing

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../../generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { emailService } from '../../../../../lib/email-service'
import { type EmailToTaskData, type TaskCreationData } from '../../../../../types'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailToTaskData: EmailToTaskData = await request.json()

    // Verify email exists and belongs to user
    const email = await prisma.email.findFirst({
      where: {
        id: params.id,
        account: { userId: session.user.id }
      },
      include: {
        attachments: true,
        account: {
          select: { email: true, displayName: true }
        }
      }
    })

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    // Create task data
    const taskData: TaskCreationData = {
      title: emailToTaskData.title,
      description: emailToTaskData.description || generateTaskDescription(email),
      status: 'TODO',
      priority: emailToTaskData.priority,
      assignedTo: emailToTaskData.assignedTo || null,
      createdBy: session.user.id,
      organizationId: session.user.organizationId,
      dueDate: emailToTaskData.dueDate || null,
      metadata: {
        sourceType: 'email',
        sourceId: email.id,
        fromAddress: email.fromAddress,
        emailSubject: email.subject,
        convertedAt: new Date().toISOString()
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
    await emailService.linkEmailToTask(email.id, task.id, session.user.id)

    // Handle attachments if requested
    if (emailToTaskData.includeAttachments && email.attachments.length > 0) {
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
                uploadedBy: session.user.id
              }
            })
          } catch (error) {
            console.error(`Failed to attach file ${attachment.filename}:`, error)
          }
        })
      )
    }

    // Apply tags if provided
    if (emailToTaskData.tags && emailToTaskData.tags.length > 0) {
      await Promise.all(
        emailToTaskData.tags.map(async (tagName) => {
          try {
            // Find or create tag
            let tag = await prisma.tag.findFirst({
              where: {
                organizationId: session.user.organizationId,
                name: tagName
              }
            })

            if (!tag) {
              tag = await prisma.tag.create({
                data: {
                  organizationId: session.user.organizationId,
                  name: tagName,
                  createdBy: session.user.id
                }
              })
            }

            // Create tagging relationship
            await prisma.tagging.create({
              data: {
                tagId: tag.id,
                taggableType: 'task',
                taggableId: task.id,
                taggedBy: session.user.id
              }
            })
          } catch (error) {
            console.error(`Failed to apply tag ${tagName}:`, error)
          }
        })
      )
    }

    // Fetch the complete task with tags
    const completeTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        attachments: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        task: completeTask,
        email: {
          id: email.id,
          subject: email.subject,
          linkedTaskIds: [...email.linkedTaskIds, task.id]
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        attachmentsIncluded: emailToTaskData.includeAttachments ? email.attachments.length : 0,
        tagsApplied: emailToTaskData.tags?.length || 0
      }
    }, { status: 201 })
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

function generateTaskDescription(email: any): string {
  const parts: string[] = []
  
  // Email metadata
  parts.push(`📧 **Email Details**`)
  parts.push(`From: ${email.fromAddress}`)
  if (email.subject) {
    parts.push(`Subject: ${email.subject}`)
  }
  parts.push(`Received: ${new Date(email.receivedAt).toLocaleString()}`)
  
  // Email content
  if (email.bodyText || email.bodyHtml) {
    parts.push(`\n**Email Content:**`)
    const content = email.bodyText || email.bodyHtml?.replace(/<[^>]*>/g, '') || ''
    const preview = content.substring(0, 1000)
    parts.push(preview + (content.length > 1000 ? '\n\n[Content truncated...]' : ''))
  }
  
  // Attachments
  if (email.attachments.length > 0) {
    parts.push(`\n**Attachments (${email.attachments.length}):**`)
    email.attachments.forEach((att: any) => {
      parts.push(`- ${att.filename} (${formatFileSize(att.size)})`)
    })
  }
  
  parts.push(`\n---`)
  parts.push(`*This task was automatically created from email ID: ${email.id}*`)
  
  return parts.join('\n')
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}