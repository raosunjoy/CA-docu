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

// Get client engagements
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    
    const skip = (page - 1) * limit

    const where: any = {
      clientId: client.id,
      organizationId: client.organizationId,
      isVisibleToClient: true
    }

    if (status) where.status = status
    if (type) where.type = type

    const [engagements, total] = await Promise.all([
      prisma.clientEngagement.findMany({
        where,
        include: {
          documentRequests: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              uploadedCount: true,
              requiredCount: true
            },
            where: {
              status: { in: ['PENDING', 'UPLOADED'] }
            }
          },
          progressUpdates: {
            select: {
              id: true,
              title: true,
              description: true,
              updateType: true,
              completionPercentage: true,
              createdAt: true
            },
            where: {
              isVisibleToClient: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              title: true,
              totalAmount: true,
              currency: true,
              status: true,
              dueDate: true
            },
            where: {
              status: { in: ['sent', 'overdue'] }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.clientEngagement.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        engagements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get client engagements error:', error)
    
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