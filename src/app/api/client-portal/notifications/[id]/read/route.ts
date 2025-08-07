import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

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

// Mark notification as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await verifyClientToken(request)
    const notificationId = params.id

    // Verify notification belongs to client
    const notification = await prisma.clientNotification.findFirst({
      where: {
        id: notificationId,
        clientId: client.id,
        organizationId: client.organizationId,
        isRead: false
      }
    })

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found or already read' },
        { status: 404 }
      )
    }

    // Mark as read
    const updatedNotification = await prisma.clientNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedNotification
    })

  } catch (error) {
    console.error('Mark notification as read error:', error)
    
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

// Mark all notifications as read
export async function PUT(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)

    // Mark all unread notifications as read
    const result = await prisma.clientNotification.updateMany({
      where: {
        clientId: client.id,
        organizationId: client.organizationId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count
      }
    })

  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    
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