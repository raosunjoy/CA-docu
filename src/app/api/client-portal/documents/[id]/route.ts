import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { readFile } from 'fs/promises'
import path from 'path'

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

// Get document details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await verifyClientToken(request)
    const { id } = await params
    const documentId = id

    const document = await prisma.clientDocument.findFirst({
      where: {
        id: documentId,
        clientId: client.id,
        organizationId: client.organizationId
      },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            status: true,
            description: true
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: document
    })

  } catch (error) {
    console.error('Get document error:', error)
    
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

// Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await verifyClientToken(request)
    const { id } = await params
    const documentId = id

    const document = await prisma.clientDocument.findFirst({
      where: {
        id: documentId,
        clientId: client.id,
        organizationId: client.organizationId,
        status: { in: ['UPLOADED', 'REJECTED'] } // Only allow deletion of uploaded or rejected documents
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or cannot be deleted' },
        { status: 404 }
      )
    }

    // Delete the document record
    await prisma.clientDocument.delete({
      where: { id: documentId }
    })

    // Update document request count if linked
    if (document.requestId) {
      await prisma.clientDocumentRequest.update({
        where: { id: document.requestId },
        data: {
          uploadedCount: {
            decrement: 1
          }
        }
      })
    }

    // TODO: Delete physical file
    // await unlink(path.join(process.cwd(), document.filePath))

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error) {
    console.error('Delete document error:', error)
    
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