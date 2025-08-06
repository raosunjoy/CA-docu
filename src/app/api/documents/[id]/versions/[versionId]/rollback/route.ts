import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { copyFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { randomBytes } from 'crypto'

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

async function validateDocumentAccess(documentId: string, organizationId: string, userId: string) {
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
    const hasEditPermission = document.folder.permissions.some(p => 
      p.permissions.includes('edit')
    )
    
    if (!hasEditPermission && document.uploadedBy !== userId) {
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

async function rollbackToVersion(
  documentId: string,
  versionId: string,
  userId: string,
  organizationId: string,
  rollbackReason?: string
) {
  // Get the target version to rollback to
  const targetVersion = await prisma.document.findFirst({
    where: {
      id: versionId,
      OR: [
        { id: documentId },
        { parentDocumentId: documentId }
      ],
      organizationId,
      isDeleted: false
    }
  })

  if (!targetVersion) {
    throw new Error('Version not found')
  }

  // Get the current document
  const currentDocument = await prisma.document.findUnique({
    where: { id: documentId }
  })

  if (!currentDocument) {
    throw new Error('Document not found')
  }

  // Don't rollback if already at the target version
  if (currentDocument.version === targetVersion.version) {
    throw new Error('Already at target version')
  }

  // Create a new version based on the target version
  const nextVersion = currentDocument.version + 1
  
  // Copy the target version file to a new location
  const sourcePath = join(process.cwd(), targetVersion.filePath.replace(/^\//, ''))
  const fileName = generateUniqueFileName(`${documentId}_v${nextVersion}_rollback_${targetVersion.originalName}`)
  const uploadDir = join(process.cwd(), 'uploads', organizationId, 'versions')
  const newFilePath = join(uploadDir, fileName)
  
  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true })
  
  // Copy the file
  await copyFile(sourcePath, newFilePath)

  // Create the rollback version in transaction
  return prisma.$transaction(async (tx) => {
    // Create the new rollback version
    const rollbackVersion = await tx.document.create({
      data: {
        organizationId,
        name: currentDocument.name,
        originalName: targetVersion.originalName,
        filePath: `/uploads/${organizationId}/versions/${fileName}`,
        fileSize: targetVersion.fileSize,
        mimeType: targetVersion.mimeType,
        checksum: targetVersion.checksum,
        type: targetVersion.type,
        status: targetVersion.status,
        version: nextVersion,
        parentDocumentId: documentId,
        folderId: currentDocument.folderId,
        uploadedBy: userId,
        metadata: {
          rollbackReason: rollbackReason || `Rolled back to version ${targetVersion.version}`,
          rolledBackFrom: currentDocument.version,
          rolledBackTo: targetVersion.version,
          originalVersionId: versionId
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

    // Update the parent document to point to the rollback version
    const updatedDocument = await tx.document.update({
      where: { id: documentId },
      data: {
        version: nextVersion,
        filePath: rollbackVersion.filePath,
        fileSize: rollbackVersion.fileSize,
        mimeType: rollbackVersion.mimeType,
        checksum: rollbackVersion.checksum,
        updatedAt: new Date()
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
        folder: {
          select: {
            id: true,
            name: true,
            path: true
          }
        }
      }
    })

    return {
      document: updatedDocument,
      rollbackVersion,
      rolledBackFrom: currentDocument.version,
      rolledBackTo: targetVersion.version
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const documentId = params.id
  const versionId = params.versionId

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub)

    const body = await request.json()
    const rollbackReason = body.reason as string

    const result = await rollbackToVersion(
      documentId,
      versionId,
      user.sub,
      user.orgId,
      rollbackReason
    )

    return createSuccessResponse({
      message: `Successfully rolled back to version ${result.rolledBackTo}`,
      document: result.document,
      rollbackVersion: result.rollbackVersion,
      rolledBackFrom: result.rolledBackFrom,
      rolledBackTo: result.rolledBackTo
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Version not found') {
        return createErrorResponse('VERSION_NOT_FOUND', 'Version not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to rollback document', 403)
      }
      if (error.message === 'Already at target version') {
        return createErrorResponse('ALREADY_AT_VERSION', 'Document is already at the target version', 400)
      }
    }
    return createErrorResponse('ROLLBACK_FAILED', 'Failed to rollback document version', 500)
  }
}