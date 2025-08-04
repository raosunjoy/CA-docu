import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

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

const shareCreateSchema = z.object({
  sharedWith: z.string().optional(),
  shareType: z.enum(['user', 'link', 'public']),
  permissions: z.array(z.enum(['view', 'comment', 'edit', 'download'])),
  expiresAt: z.string().datetime().optional()
})

async function findDocument(id: string, organizationId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
    }
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

async function validateShareRecipient(userId: string, organizationId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
      isActive: true
    }
  })
}

async function validateDocumentAccess(id: string, organizationId: string): Promise<NextResponse | null> {
  const document = await findDocument(id, organizationId)
  if (!document) {
    return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
  }
  return null
}

async function checkExistingShare(
  documentId: string,
  sharedBy: string,
  sharedWith: string | null,
  shareType: string
): Promise<NextResponse | null> {
  const existingShare = await prisma.documentShare.findFirst({
    where: {
      documentId,
      sharedBy,
      sharedWith: sharedWith || null,
      shareType
    }
  })

  if (existingShare) {
    return createErrorResponse('SHARE_EXISTS', 'Document is already shared with this recipient', 409)
  }
  return null
}

async function createDocumentShare(
  documentId: string,
  shareData: { sharedWith?: string; shareType: string; permissions: string[]; expiresAt?: string },
  userId: string
) {
  return prisma.documentShare.create({
    data: {
      documentId,
      sharedBy: userId,
      sharedWith: shareData.sharedWith,
      shareType: shareData.shareType,
      permissions: shareData.permissions,
      expiresAt: shareData.expiresAt ? new Date(shareData.expiresAt) : null
    },
    include: {
      sharer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      recipient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  })
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
    // Check if document exists
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    const shares = await prisma.documentShare.findMany({
      where: {
        documentId: id
      },
      include: {
        sharer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        recipient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return createSuccessResponse({ shares })
  } catch {
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch document shares', 500)
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
  const { id } = params

  try {
    const body = await request.json()
    const shareData = shareCreateSchema.parse(body)

    // Check if document exists
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    // Validate recipient if sharing with specific user
    if (shareData.shareType === 'user' && shareData.sharedWith) {
      const recipient = await validateShareRecipient(shareData.sharedWith, user.orgId)
      if (!recipient) {
        return createErrorResponse('RECIPIENT_NOT_FOUND', 'Share recipient not found', 400)
      }
    }

    // Check for existing share
    const shareError = await checkExistingShare(
      id,
      user.sub,
      shareData.sharedWith || null,
      shareData.shareType
    )
    if (shareError) {
      return shareError
    }

    const share = await createDocumentShare(id, shareData, user.sub)

    return createSuccessResponse({ share }, 201)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.errors)
    }

    return createErrorResponse('SHARE_FAILED', 'Failed to share document', 500)
  }
}