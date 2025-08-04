import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { DocumentStatus } from '@prisma/client'
import { z } from 'zod'
import { unlink } from 'fs/promises'

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

const documentUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  folderId: z.string().optional(),
  status: z.nativeEnum(DocumentStatus).optional()
})

const getDocumentIncludes = () => ({
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
  },
  annotations: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' as const }
  },
  comments: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' as const }
  },
  shares: {
    include: {
      sharer: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' as const }
  }
})

async function findDocument(id: string, organizationId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
    },
    include: getDocumentIncludes()
  })
}

async function findDocumentBasic(id: string, organizationId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
    }
  })
}

async function updateDocumentLastAccessed(documentId: string) {
  await prisma.document.update({
    where: { id: documentId },
    data: { lastAccessedAt: new Date() }
  })
}

function createErrorResponse(code: string, message: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
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

async function deleteDocumentFile(filePath: string) {
  try {
    const fullPath = process.cwd() + filePath
    await unlink(fullPath)
  } catch (error) {
    // File might not exist or already deleted, log but don't fail
    // eslint-disable-next-line no-console
    console.warn('Failed to delete file:', filePath, error)
  }
}

async function validateDocumentAccess(id: string, organizationId: string): Promise<NextResponse | null> {
  const document = await findDocumentBasic(id, organizationId)
  if (!document) {
    return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
  }
  return null
}

async function validateFolderExists(folderId: string, organizationId: string): Promise<NextResponse | null> {
  const folder = await prisma.documentFolder.findFirst({
    where: {
      id: folderId,
      organizationId
    }
  })

  if (!folder) {
    return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 400)
  }
  return null
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
  const { id } = params

  try {
    const document = await findDocument(id, user.orgId)

    if (!document) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
    }

    // Update last accessed timestamp
    await updateDocumentLastAccessed(document.id)

    return createSuccessResponse({ document })
  } catch {
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch document', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = params

  try {
    const body = await request.json()
    const updateData = documentUpdateSchema.parse(body)

    // Check if document exists and user has access
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    // Validate folder exists if folderId is provided
    if (updateData.folderId) {
      const folderError = await validateFolderExists(updateData.folderId, user.orgId)
      if (folderError) {
        return folderError
      }
    }

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
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

    return createSuccessResponse({ document })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.errors)
    }

    return createErrorResponse('UPDATE_FAILED', 'Failed to update document', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = params

  try {
    // Check if document exists and user has access
    const existingDocument = await findDocumentBasic(id, user.orgId)
    if (!existingDocument) {
      return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
    }

    // Soft delete the document
    await prisma.document.update({
      where: { id },
      data: {
        isDeleted: true,
        status: DocumentStatus.DELETED
      }
    })

    // Delete physical file
    await deleteDocumentFile(existingDocument.filePath)

    return createSuccessResponse({ message: 'Document deleted successfully' })
  } catch {
    return createErrorResponse('DELETE_FAILED', 'Failed to delete document', 500)
  }
}