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

// Get document request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await verifyClientToken(request)
    const { id } = await params
    const requestId = id

    const documentRequest = await prisma.clientDocumentRequest.findFirst({
      where: {
        id: requestId,
        clientId: client.id,
        organizationId: client.organizationId
      },
      include: {
        engagement: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            description: true
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            originalName: true,
            description: true,
            category: true,
            status: true,
            fileSize: true,
            mimeType: true,
            clientNotes: true,
            reviewNotes: true,
            uploadedAt: true,
            reviewedAt: true
          },
          orderBy: { uploadedAt: 'desc' }
        }
      }
    })

    if (!documentRequest) {
      return NextResponse.json(
        { success: false, error: 'Document request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: documentRequest
    })

  } catch (error) {
    console.error('Get document request error:', error)
    
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