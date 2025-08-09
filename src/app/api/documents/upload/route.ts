import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { PrismaClient } from '../../../../../generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    
    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      )
    }
    
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
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
      'image/png',
      'image/jpeg',
      'image/gif'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported' },
        { status: 400 }
      )
    }
    
    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name
    const extension = originalName.split('.').pop()
    const uniqueFilename = `${timestamp}_${Math.random().toString(36).substr(2, 9)}.${extension}`
    
    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'documents')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
    
    // Save file to disk
    const filePath = join(uploadDir, uniqueFilename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Create document record in database
    const document = await prisma.document.create({
      data: {
        name: originalName,
        filename: uniqueFilename,
        filePath: filePath,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: userId,
        organizationId: 'default-org', // Replace with actual org ID
        status: 'uploaded',
        version: 1,
        tags: [],
        metadata: {
          originalName,
          uploadTimestamp: timestamp,
          fileExtension: extension
        }
      }
    })
    
    // Create initial folder structure if needed
    let folderId = null
    try {
      const rootFolder = await prisma.folder.findFirst({
        where: {
          organizationId: 'default-org',
          parentId: null,
          name: 'Documents'
        }
      })
      
      if (!rootFolder) {
        const newRootFolder = await prisma.folder.create({
          data: {
            name: 'Documents',
            organizationId: 'default-org',
            createdBy: userId,
            permissions: {
              read: ['all'],
              write: ['all'],
              delete: ['admin']
            }
          }
        })
        folderId = newRootFolder.id
      } else {
        folderId = rootFolder.id
      }
      
      // Update document with folder association
      await prisma.document.update({
        where: { id: document.id },
        data: { folderId }
      })
      
    } catch (error) {
      console.error('Error creating folder structure:', error)
    }
    
    return NextResponse.json({
      id: document.id,
      name: document.name,
      filename: document.filename,
      fileSize: document.fileSize,
      mimeType: document.mimeType,
      uploadedAt: document.createdAt,
      status: document.status
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}