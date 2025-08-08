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

// Download document
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
      }
    })

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), document.filePath)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // Set appropriate headers for file download
      const headers = new Headers()
      headers.set('Content-Type', document.mimeType)
      headers.set('Content-Length', document.fileSize.toString())
      headers.set('Content-Disposition', `attachment; filename="${document.originalName}"`)
      headers.set('Cache-Control', 'private, no-cache')

      return new NextResponse(fileBuffer, {
        status: 200,
        headers
      })

    } catch (fileError) {
      console.error('File read error:', fileError)
      return NextResponse.json(
        { success: false, error: 'File not found on server' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('Document download error:', error)
    
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