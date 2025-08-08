// Chat File Upload API
// Handles file uploads for chat channels

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { authenticateRequest } from '../../../../../../lib/auth'
import { chatService } from '../../../../../../lib/chat-service'
import type { APIResponse } from '../../../../../../types'

// POST /api/chat/channels/[id]/files - Upload file to channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    const { id } = await params
    if (!user) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const channelId = id

    // Verify user has access to channel
    const isMember = await chatService.isChannelMember(channelId, user.id)
    if (!isMember) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this channel'
        }
      }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const caption = formData.get('caption') as string

    if (!file) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file provided'
        }
      }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File size exceeds 10MB limit'
        }
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-zip-compressed'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File type not allowed'
        }
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}_${randomString}.${fileExtension}`

    // Create upload directory
    const uploadDir = join(process.cwd(), 'uploads', 'chat', channelId)
    await mkdir(uploadDir, { recursive: true })

    // Save file
    const filePath = join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create file record in database
    const { prisma } = await import('../../../../../../lib/prisma')
    const fileRecord = await prisma.chatFile.create({
      data: {
        channelId,
        uploadedBy: user.id,
        originalName: file.name,
        fileName,
        filePath: `/uploads/chat/${channelId}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        caption: caption || null
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Send file message to channel via WebSocket
    const { getWebSocketServer } = await import('../../../../../../lib/websocket-server')
    const wsServer = getWebSocketServer()
    
    if (wsServer) {
      // Create a file message
      const message = await prisma.chatMessage.create({
        data: {
          channelId,
          userId: user.id,
          content: caption || `Shared ${file.name}`,
          messageType: 'FILE',
          metadata: {
            fileId: fileRecord.id,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            filePath: fileRecord.filePath
          }
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      })

      // Broadcast to channel
      wsServer.broadcastToChannel(channelId, 'new_message', message)
    }

    return NextResponse.json<APIResponse>({
      success: true,
      data: {
        file: fileRecord,
        message: 'File uploaded successfully'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload file'
      }
    }, { status: 500 })
  }
}

// GET /api/chat/channels/[id]/files - Get channel files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    const { id } = await params
    if (!user) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const channelId = id

    // Verify user has access to channel
    const isMember = await chatService.isChannelMember(channelId, user.id)
    if (!isMember) {
      return NextResponse.json<APIResponse>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this channel'
        }
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // 'image', 'document', etc.

    const { prisma } = await import('../../../../../../lib/prisma')
    
    const whereClause: any = { channelId }
    
    if (type === 'image') {
      whereClause.mimeType = {
        startsWith: 'image/'
      }
    } else if (type === 'document') {
      whereClause.mimeType = {
        in: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ]
      }
    }

    const [files, total] = await Promise.all([
      prisma.chatFile.findMany({
        where: whereClause,
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.chatFile.count({ where: whereClause })
    ])

    return NextResponse.json<APIResponse>({
      success: true,
      data: files,
      meta: {
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          hasMore: offset + limit < total
        },
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })

  } catch (error) {
    console.error('Error fetching channel files:', error)
    return NextResponse.json<APIResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch channel files'
      }
    }, { status: 500 })
  }
}