// Zetra Platform - Email Sending API
// Handles email composition and sending

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { type EmailCompositionData } from '../../../../types'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailData: EmailCompositionData = await request.json()

    // Validate required fields
    if (!emailData.accountId || !emailData.to.length || !emailData.subject) {
      return NextResponse.json(
        { error: 'Account ID, recipients, and subject are required' },
        { status: 400 }
      )
    }

    // Verify email account belongs to user
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: emailData.accountId,
        userId: session.user.id,
        status: 'ACTIVE'
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found or inactive' },
        { status: 404 }
      )
    }

    // Handle scheduled sending
    if (emailData.scheduledAt) {
      const scheduledDate = new Date(emailData.scheduledAt)
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        )
      }

      // Store as draft with scheduled flag
      const scheduledEmail = await createDraftEmail(emailData, account, session.user.id, true)
      
      return NextResponse.json({
        success: true,
        data: {
          emailId: scheduledEmail.id,
          scheduled: true,
          scheduledAt: scheduledDate
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: crypto.randomUUID()
        }
      })
    }

    // Send email immediately
    const sentEmail = await sendEmail(emailData, account, session.user.id)

    return NextResponse.json({
      success: true,
      data: {
        emailId: sentEmail.id,
        sent: true,
        sentAt: new Date()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Send email API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'SEND_ERROR',
          message: 'Failed to send email',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

async function sendEmail(emailData: EmailCompositionData, account: any, userId: string) {
  // In a real implementation, this would:
  // 1. Connect to the email provider (Gmail, Outlook, SMTP)
  // 2. Send the actual email
  // 3. Handle attachments
  // 4. Store the sent email in the database
  
  // For now, we'll simulate sending and store the email
  const email = await prisma.email.create({
    data: {
      organizationId: account.organizationId,
      accountId: account.id,
      externalId: `sent-${crypto.randomUUID()}`,
      subject: emailData.subject,
      fromAddress: account.email,
      fromName: account.displayName,
      toAddresses: emailData.to,
      toNames: [], // Would be populated from address book
      ccAddresses: emailData.cc || [],
      ccNames: [],
      bccAddresses: emailData.bcc || [],
      bccNames: [],
      bodyText: emailData.bodyText,
      bodyHtml: emailData.bodyHtml,
      importance: emailData.importance || 'normal',
      priority: emailData.priority || 'normal',
      isDraft: false,
      isSent: true,
      sentAt: new Date(),
      receivedAt: new Date(), // For sent emails, this is the sent time
      linkedTaskIds: emailData.taskAttachments || [],
      linkedDocIds: emailData.documentAttachments || []
    }
  })

  // Handle file attachments
  if (emailData.attachments && emailData.attachments.length > 0) {
    // In a real implementation, you would:
    // 1. Upload files to storage
    // 2. Create attachment records
    // 3. Include attachments in the email send
    
    console.log(`Would handle ${emailData.attachments.length} file attachments`)
  }

  // Handle task attachments
  if (emailData.taskAttachments && emailData.taskAttachments.length > 0) {
    // Link tasks to the email
    await Promise.all(
      emailData.taskAttachments.map(async (taskId) => {
        try {
          const task = await prisma.task.findFirst({
            where: { id: taskId, organizationId: account.organizationId }
          })
          
          if (task) {
            // Add email reference to task metadata
            const metadata = task.metadata as any || {}
            metadata.linkedEmails = metadata.linkedEmails || []
            if (!metadata.linkedEmails.includes(email.id)) {
              metadata.linkedEmails.push(email.id)
            }
            
            await prisma.task.update({
              where: { id: taskId },
              data: { metadata }
            })
          }
        } catch (error) {
          console.error(`Failed to link task ${taskId}:`, error)
        }
      })
    )
  }

  // Handle document attachments
  if (emailData.documentAttachments && emailData.documentAttachments.length > 0) {
    // Link documents to the email
    await Promise.all(
      emailData.documentAttachments.map(async (documentId) => {
        try {
          const document = await prisma.document.findFirst({
            where: { id: documentId, organizationId: account.organizationId }
          })
          
          if (document) {
            // Create email attachment record referencing the document
            await prisma.emailAttachment.create({
              data: {
                emailId: email.id,
                filename: document.name,
                contentType: document.mimeType,
                size: document.fileSize,
                filePath: document.filePath
              }
            })
          }
        } catch (error) {
          console.error(`Failed to attach document ${documentId}:`, error)
        }
      })
    )
  }

  // Update template usage count if template was used
  if (emailData.templateId) {
    try {
      await prisma.emailTemplate.update({
        where: { id: emailData.templateId },
        data: { usageCount: { increment: 1 } }
      })
    } catch (error) {
      console.error('Failed to update template usage:', error)
    }
  }

  return email
}

async function createDraftEmail(
  emailData: EmailCompositionData, 
  account: any, 
  userId: string, 
  isScheduled = false
) {
  const email = await prisma.email.create({
    data: {
      organizationId: account.organizationId,
      accountId: account.id,
      externalId: `draft-${crypto.randomUUID()}`,
      subject: emailData.subject,
      fromAddress: account.email,
      fromName: account.displayName,
      toAddresses: emailData.to,
      toNames: [],
      ccAddresses: emailData.cc || [],
      ccNames: [],
      bccAddresses: emailData.bcc || [],
      bccNames: [],
      bodyText: emailData.bodyText,
      bodyHtml: emailData.bodyHtml,
      importance: emailData.importance || 'normal',
      priority: emailData.priority || 'normal',
      isDraft: true,
      isSent: false,
      receivedAt: new Date(),
      linkedTaskIds: emailData.taskAttachments || [],
      linkedDocIds: emailData.documentAttachments || [],
      metadata: {
        scheduled: isScheduled,
        scheduledAt: emailData.scheduledAt?.toISOString()
      }
    }
  })

  return email
}

// Draft saving endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailData: EmailCompositionData & { draftId?: string } = await request.json()

    // Verify email account belongs to user
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: emailData.accountId,
        userId: session.user.id
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      )
    }

    let draft
    if (emailData.draftId) {
      // Update existing draft
      draft = await prisma.email.update({
        where: { id: emailData.draftId },
        data: {
          subject: emailData.subject,
          toAddresses: emailData.to,
          ccAddresses: emailData.cc || [],
          bccAddresses: emailData.bcc || [],
          bodyText: emailData.bodyText,
          bodyHtml: emailData.bodyHtml,
          importance: emailData.importance || 'normal',
          priority: emailData.priority || 'normal',
          linkedTaskIds: emailData.taskAttachments || [],
          linkedDocIds: emailData.documentAttachments || []
        }
      })
    } else {
      // Create new draft
      draft = await createDraftEmail(emailData, account, session.user.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        draftId: draft.id,
        saved: true,
        savedAt: new Date()
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Save draft API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: 'Failed to save draft',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}