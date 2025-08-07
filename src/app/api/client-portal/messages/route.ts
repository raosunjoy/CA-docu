import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const messageSchema = z.object({
  subject: z.string().optional(),
  content: z.string().min(1),
  parentId: z.string().optional()
})

// Helper function to verify client token
async function verifyClientToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }

  const token = authHeader.substring(7)
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  
  if (decoded.type !== 'client') {
    throw new Error('Invalid token type')
  }

  const client = await prisma.client.findUnique({
    where: { 
      id: decoded.clientId,
      status: 'ACTIVE',
      isPortalEnabled: true
    }
  })

  if (!client) {
    throw new Error('Client not found')
  }

  return client
}

// Get client messages
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    
    const skip = (page - 1) * limit

    const where: any = {
      clientId: client.id,
      organizationId: client.organizationId,
      parentId: null // Only get top-level messages
    }

    if (unreadOnly) {
      where.isRead = false
      where.fromClient = false // Only unread messages from CA firm
    }

    const [messages, total] = await Promise.all([
      prisma.clientMessage.findMany({
        where,
        include: {
          replies: {
            select: {
              id: true,
              content: true,
              fromClient: true,
              isRead: true,
              sentAt: true
            },
            orderBy: { sentAt: 'asc' }
          }
        },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.clientMessage.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get client messages error:', error)
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Send message from client
export async function POST(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const body = await request.json()
    const { subject, content, parentId } = messageSchema.parse(body)

    // If replying to a message, verify the parent exists
    if (parentId) {
      const parentMessage = await prisma.clientMessage.findFirst({
        where: {
          id: parentId,
          clientId: client.id,
          organizationId: client.organizationId
        }
      })

      if (!parentMessage) {
        return NextResponse.json(
          { success: false, error: 'Parent message not found' },
          { status: 404 }
        )
      }
    }

    // Create the message
    const message = await prisma.clientMessage.create({
      data: {
        organizationId: client.organizationId,
        clientId: client.id,
        subject: subject || (parentId ? undefined : 'Message from Client'),
        content,
        fromClient: true,
        parentId: parentId || null,
        messageType: 'message'
      },
      include: {
        parent: {
          select: {
            id: true,
            subject: true
          }
        }
      }
    })

    // Create notification for CA firm
    // TODO: Implement notification system to alert CA firm of new client message

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error('Send client message error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}