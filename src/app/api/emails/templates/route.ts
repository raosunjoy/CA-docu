// Zetra Platform - Email Templates API
// Handles email template management

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../../generated/prisma'
import { verifyToken } from '../../../../lib/auth'
import { type EmailTemplateData } from '../../../../types'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isActive = searchParams.get('isActive')
    const isShared = searchParams.get('isShared')

    const where: any = {
      organizationId: payload.orgId,
      isActive: isActive ? isActive === 'true' : true
    }

    if (category) {
      where.category = category
    }

    if (isShared !== null) {
      where.isShared = isShared === 'true'
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: [
        { isShared: 'desc' },
        { usageCount: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: templates,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Get email templates API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch email templates',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
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

    const templateData: EmailTemplateData = await request.json()

    // Validate required fields
    if (!templateData.name || !templateData.subject) {
      return NextResponse.json(
        { error: 'Name and subject are required' },
        { status: 400 }
      )
    }

    // Validate HTML content
    if (!templateData.bodyHtml) {
      return NextResponse.json(
        { error: 'Email body is required' },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        organizationId: payload.orgId,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        subject: templateData.subject,
        bodyHtml: templateData.bodyHtml,
        bodyText: templateData.bodyText || templateData.bodyHtml.replace(/<[^>]*>/g, ''),
        variables: templateData.variables || [],
        isShared: templateData.isShared || false,
        createdBy: payload.sub
      },
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
    }, { status: 201 })
  } catch (error) {
    console.error('Create email template API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create email template',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    )
  }
}