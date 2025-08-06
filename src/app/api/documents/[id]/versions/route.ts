import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { DocumentStatus } from '@/types'
import { writeFile, mkdir, copyFile } from 'fs/promises'
import { join } from 'path'
import { randomBytes, createHash } from 'crypto'

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

interface SuccessResponse<T = unknown> {
  success: true
  data: T
}

function createErrorResponse(code: string, message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    } as ErrorResponse,
    { status }
  )
}

function createSuccessResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data
    } as SuccessResponse<T>,
    { status }
  )
}

async function validateDocumentAccess(documentId: string, organizationId: string, userId: string, requiredPermission: string = 'view') {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      organizationId,
      isDeleted: false
    },
    include: {
      folder: {
        include: {
          permissions: {
            where: {
              OR: [
                { userId },
                { role: { in: await getUserRoles(userId) } }
              ]
            }
          }
        }
      }
    }
  })

  if (!document) {
    throw new Error('Document not found')
  }

  // Check folder permissions if document is in a folder
  if (document.folder) {
    const hasPermission = document.folder.permissions.some(p => 
      p.permissions.includes(requiredPermission)
    )
    
    if (!hasPermission && document.uploadedBy !== userId) {
      throw new Error('Insufficient permissions')
    }
  }

  return document
}

async function getUserRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user ? [user.role] : []
}

function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = randomBytes(8).toString('hex')
  const extension = originalName.split('.').pop()
  return `${timestamp}_${random}.${extension}`
}

async function calculateFileChecksum(filePath: string): Promise<string> {
  const { readFile } = await import('fs/promises')
  const fileBuffer = await readFile(filePath)
  return createHash('sha256').update(fileBuffer).digest('hex')
}

async function saveVersionFile(file: File, organizationId: string, documentId: string, version: number): Promise<{ filePath: string; fileSize: number; checksum: string }> {
  const fileName = generateUniqueFileName(`${documentId}_v${version}_${file.name}`)
  const uploadDir = join(process.cwd(), 'uploads', organizationId, 'versions')
  const filePath = join(uploadDir, fileName)
  
  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true })
  
  // Save file
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filePath, buffer)
  
  // Calculate checksum
  const checksum = createHash('sha256').update(buffer).digest('hex')
  
  return {
    filePath: `/uploads/${organizationId}/versions/${fileName}`,
    fileSize: buffer.length,
    checksum
  }
}

async function createDocumentVersion(
  documentId: string,
  file: File,
  userId: string,
  organizationId: string,
  changeDescription?: string
) {
  // Get current document to determine next version number
  const currentDocument = await prisma.document.findUnique({
    where: { id: documentId },
    select: { version: true, name: true }
  })

  if (!currentDocument) {
    throw new Error('Document not found')
  }

  const nextVersion = currentDocument.version + 1
  
  // Save the new version file
  const { filePath, fileSize, checksum } = await saveVersionFile(file, organizationId, documentId, nextVersion)

  // Create new document version in transaction
  return prisma.$transaction(async (tx) => {
    // Create the new version as a separate document record
    const newVersion = await tx.document.create({
      data: {
        organizationId,
        name: currentDocument.name,
        originalName: file.name,
        filePath,
        fileSize,
        mimeType: file.type,
        checksum,
        type: determineDocumentType(file.type),
        status: DocumentStatus.ACTIVE,
        version: nextVersion,
        parentDocumentId: documentId,
        uploadedBy: userId,
        metadata: {
          changeDescription: changeDescription || `Version ${nextVersion}`,
          previousVersion: currentDocument.version
        }
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

    // Update the parent document's version number
    await tx.document.update({
      where: { id: documentId },
      data: { 
        version: nextVersion,
        updatedAt: new Date()
      }
    })

    return newVersion
  })
}

function determineDocumentType(mimeType: string) {
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'WORD'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'EXCEL'
  if (mimeType.includes('image')) return 'IMAGE'
  return 'OTHER'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const documentId = params.id

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    // Get all versions of the document
    const versions = await prisma.document.findMany({
      where: {
        OR: [
          { id: documentId },
          { parentDocumentId: documentId }
        ],
        organizationId: user.orgId,
        isDeleted: false
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        parentDocument: {
          select: {
            id: true,
            name: true,
            version: true
          }
        },
        _count: {
          select: {
            annotations: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: { version: 'desc' }
    })

    // Calculate version statistics
    const stats = {
      totalVersions: versions.length,
      currentVersion: Math.max(...versions.map(v => v.version)),
      totalSize: versions.reduce((sum, v) => sum + v.fileSize, 0),
      contributors: [...new Set(versions.map(v => v.uploadedBy))].length
    }

    return createSuccessResponse({
      versions,
      stats
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to view document versions', 403)
      }
    }
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch document versions', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const documentId = params.id

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'edit')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const changeDescription = formData.get('changeDescription') as string

    if (!file) {
      return createErrorResponse('MISSING_FILE', 'File is required for new version', 400)
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return createErrorResponse('FILE_TOO_LARGE', 'File size must be less than 50MB', 400)
    }

    const newVersion = await createDocumentVersion(
      documentId,
      file,
      user.sub,
      user.orgId,
      changeDescription
    )

    return createSuccessResponse({ version: newVersion }, 201)

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to create document version', 403)
      }
    }
    return createErrorResponse('VERSION_CREATE_FAILED', 'Failed to create document version', 500)
  }
}