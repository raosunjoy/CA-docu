import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

// Helper function to verify client token
async function verifyClientToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
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

// Mark message as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await verifyClientToken(request)
    const { id } = await params
    const messageId = id

    // Verify message belongs to client and is from CA firm
    const message = await prisma.clientMessage.findFirst({
      where: {
        id: messageId,
        clientId: client.id,
        organizationId: client.organizationId,
        fromClient: false, // Only mark CA firm messages as read
        isRead: false
      }
    })

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found or already read' },
        { status: 404 }
      )
    }

    // Mark as read
    const updatedMessage = await prisma.clientMessage.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedMessage
    })

  } catch (error) {
    console.error('Mark message as read error:', error)
    
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