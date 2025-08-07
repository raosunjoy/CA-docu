import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  requestId: z.string().optional(),
  clientNotes: z.string().optional()
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

// Get client documents
export async function GET(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    const { searchParams } = new URL(request.url)
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const requestId = searchParams.get('requestId')
    
    const skip = (page - 1) * limit

    const where: any = {
      clientId: client.id,
      organizationId: client.organizationId
    }

    if (category) where.category = category
    if (status) where.status = status
    if (requestId) where.requestId = requestId

    const [documents, total] = await Promise.all([
      prisma.clientDocument.findMany({
        where,
        include: {
          request: {
            select: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.clientDocument.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })

  } catch (error) {
    console.error('Get client documents error:', error)
    
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

// Upload client document
export async function POST(request: NextRequest) {
  try {
    const client = await verifyClientToken(request)
    
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataStr = formData.get('metadata') as string
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    const metadata = metadataStr ? JSON.parse(metadataStr) : {}
    const validatedData = uploadSchema.parse(metadata)

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExtension = path.extname(file.name)
    const fileName = `${crypto.randomUUID()}${fileExtension}`
    const uploadDir = path.join(process.cwd(), 'uploads', 'client-documents', client.organizationId)
    const filePath = path.join(uploadDir, fileName)

    // Ensure upload directory exists
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

    // Save document record
    const document = await prisma.clientDocument.create({
      data: {
        organizationId: client.organizationId,
        clientId: client.id,
        requestId: validatedData.requestId || null,
        name: validatedData.name,
        originalName: file.name,
        description: validatedData.description,
        category: validatedData.category,
        filePath: `uploads/client-documents/${client.organizationId}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        checksum,
        clientNotes: validatedData.clientNotes,
        status: 'UPLOADED'
      },
      include: {
        request: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    // Update document request if linked
    if (validatedData.requestId) {
      await prisma.clientDocumentRequest.update({
        where: { id: validatedData.requestId },
        data: {
          uploadedCount: {
            increment: 1
          }
        }
      })

      // Check if request is complete
      const request = await prisma.clientDocumentRequest.findUnique({
        where: { id: validatedData.requestId },
        include: {
          documents: true
        }
      })

      if (request && request.uploadedCount >= request.requiredCount) {
        await prisma.clientDocumentRequest.update({
          where: { id: validatedData.requestId },
          data: { status: 'UPLOADED' }
        })
      }
    }

    // Create notification for CA firm
    // TODO: Implement notification system

    return NextResponse.json({
      success: true,
      data: document
    })

  } catch (error) {
    console.error('Document upload error:', error)
    
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