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

// Get client notifications
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type')
    
    const skip = (page - 1) * limit

    const where: any = {
      clientId: client.id,
      organizationId: client.organizationId
    }

    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.clientNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.clientNotification.count({ where }),
      prisma.clientNotification.count({
        where: {
          clientId: client.id,
          organizationId: client.organizationId,
          isRead: false
        }
      })
    ])

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get client notifications error:', error)
    
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