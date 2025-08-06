// Zetra Platform - Individual Email Template API
// Handles operations on specific email templates

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../../generated/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { type EmailTemplateData } from '../../../../../types'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get email template API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email template',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templateData: Partial<EmailTemplateData> = await request.json()

    // Verify template exists and user has access
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      )
    }

    // Check if user can edit (creator or admin)
    if (existingTemplate.createdBy !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this template' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    
    if (templateData.name !== undefined) updateData.name = templateData.name
    if (templateData.description !== undefined) updateData.description = templateData.description
    if (templateData.category !== undefined) updateData.category = templateData.category
    if (templateData.subject !== undefined) updateData.subject = templateData.subject
    if (templateData.bodyHtml !== undefined) {
      updateData.bodyHtml = templateData.bodyHtml
      updateData.bodyText = templateData.bodyText || templateData.bodyHtml.replace(/<[^>]*>/g, '')
    }
    if (templateData.variables !== undefined) updateData.variables = templateData.variables
    if (templateData.isShared !== undefined) updateData.isShared = templateData.isShared

    const template = await prisma.emailTemplate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: template,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Update email template API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update email template',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify template exists and user has access
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id: params.id,
        organizationId: session.user.organizationId
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      )
    }

    // Check if user can delete (creator or admin)
    if (existingTemplate.createdBy !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this template' },
        { status: 403 }
      )
    }

    // Soft delete by marking as inactive
    await prisma.emailTemplate.update({
      where: { id: params.id },
      data: { isActive: false }
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
    console.error('Delete email template API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete email template',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}