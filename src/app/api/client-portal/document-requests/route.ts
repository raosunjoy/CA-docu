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

// Get client document requests
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const engagementId = searchParams.get('engagementId')
    
    const skip = (page - 1) * limit

    const where: any = {
      clientId: client.id,
      organizationId: client.organizationId
    }

    if (status) where.status = status
    if (engagementId) where.engagementId = engagementId

    const [requests, total] = await Promise.all([
      prisma.clientDocumentRequest.findMany({
        where,
        include: {
          engagement: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true
            }
          },
          documents: {
            select: {
              id: true,
              name: true,
              status: true,
              uploadedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.clientDocumentRequest.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get document requests error:', error)
    
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