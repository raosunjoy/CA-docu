import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const shareCreateSchema = z.object({
  shareType: z.enum(['user', 'link', 'public']),
  sharedWith: z.string().optional(), // User ID for user shares
  permissions: z.array(z.enum(['view', 'comment', 'edit', 'download'])).min(1),
  expiresAt: z.string().datetime().optional(),
  message: z.string().max(500).optional()
})

const shareUpdateSchema = z.object({
  permissions: z.array(z.enum(['view', 'comment', 'edit', 'download'])).min(1).optional(),
  expiresAt: z.string().datetime().optional()
})

const shareQuerySchema = z.object({
  shareType: z.enum(['user', 'link', 'public']).optional(),
  active: z.string().optional()
})

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

function generateShareToken(): string {
  return randomBytes(32).toString('hex')
}

function buildShareFilters(query: z.infer<typeof shareQuerySchema>, documentId: string) {
  const filters: any = {
    documentId
  }

  if (query.shareType) {
    filters.shareType = query.shareType
  }

  if (query.active === 'true') {
    filters.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]
  } else if (query.active === 'false') {
    filters.expiresAt = { lte: new Date() }
  }

  return filters
}

async function validateShareRecipient(sharedWith: string, organizationId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: sharedWith,
      organizationId
    }
  })

  if (!user) {
    throw new Error('Share recipient not found in organization')
  }

  return user
}

async function createShareNotification(shareId: string, sharedWith: string, sharedBy: string, documentName: string, message?: string) {
  // This would typically create a notification record or send an email
  // For now, we'll just log it
  console.log(`Document "${documentName}" shared with user ${sharedWith} by ${sharedBy}`)
  if (message) {
    console.log(`Message: ${message}`)
  }
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
  const { searchParams } = new URL(request.url)

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    const query = shareQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const filters = buildShareFilters(query, documentId)

    const shares = await prisma.documentShare.findMany({
      where: filters,
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

    // Calculate share statistics
    const stats = {
      total: shares.length,
      active: shares.filter(s => !s.expiresAt || s.expiresAt > new Date()).length,
      expired: shares.filter(s => s.expiresAt && s.expiresAt <= new Date()).length,
      byType: shares.reduce((acc, share) => {
        acc[share.shareType] = (acc[share.shareType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      totalAccess: shares.reduce((sum, share) => sum + share.accessCount, 0)
    }

    return createSuccessResponse({
      shares,
      stats
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid query parameters', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to view shares', 403)
      }
    }
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
  const documentId = params.id

  try {
    const document = await validateDocumentAccess(documentId, user.orgId, user.sub, 'share')

    const body = await request.json()
    const shareData = shareCreateSchema.parse(body)

    // Validate share recipient for user shares
    if (shareData.shareType === 'user') {
      if (!shareData.sharedWith) {
        return createErrorResponse('MISSING_RECIPIENT', 'User ID is required for user shares', 400)
      }

      await validateShareRecipient(shareData.sharedWith, user.orgId)

      // Check if share already exists
      const existingShare = await prisma.documentShare.findFirst({
        where: {
          documentId,
          shareType: 'user',
          sharedWith: shareData.sharedWith
        }
      })

      if (existingShare) {
        return createErrorResponse('SHARE_EXISTS', 'Document is already shared with this user', 409)
      }
    }

    // Generate share token for link shares
    let shareToken = null
    if (shareData.shareType === 'link') {
      shareToken = generateShareToken()
    }

    // Create the share
    const share = await prisma.documentShare.create({
      data: {
        documentId,
        sharedBy: user.sub,
        sharedWith: shareData.sharedWith || null,
        shareType: shareData.shareType,
        permissions: shareData.permissions,
        expiresAt: shareData.expiresAt ? new Date(shareData.expiresAt) : null,
        metadata: {
          shareToken,
          message: shareData.message
        }
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

    // Send notification for user shares
    if (shareData.shareType === 'user' && shareData.sharedWith) {
      await createShareNotification(
        share.id,
        shareData.sharedWith,
        user.sub,
        document.name,
        shareData.message
      )
    }

    // Generate share URL for link shares
    let shareUrl = null
    if (shareData.shareType === 'link' && shareToken) {
      shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/shared/${shareToken}`
    }

    return createSuccessResponse({ 
      share: {
        ...share,
        shareUrl
      }
    }, 201)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid share data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to share document', 403)
      }
      if (error.message === 'Share recipient not found in organization') {
        return createErrorResponse('RECIPIENT_NOT_FOUND', 'Share recipient not found in organization', 400)
      }
    }
    return createErrorResponse('CREATE_FAILED', 'Failed to create document share', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const documentId = params.id
  const { searchParams } = new URL(request.url)
  const shareId = searchParams.get('shareId')

  if (!shareId) {
    return createErrorResponse('MISSING_SHARE_ID', 'Share ID is required', 400)
  }

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'share')

    // Check if user owns the share
    const existingShare = await prisma.documentShare.findFirst({
      where: {
        id: shareId,
        documentId,
        sharedBy: user.sub
      }
    })

    if (!existingShare) {
      return createErrorResponse('SHARE_NOT_FOUND', 'Share not found or not owned by user', 404)
    }

    const body = await request.json()
    const updateData = shareUpdateSchema.parse(body)

    const updatedShare = await prisma.documentShare.update({
      where: { id: shareId },
      data: {
        ...(updateData.permissions && { permissions: updateData.permissions }),
        ...(updateData.expiresAt !== undefined && { 
          expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : null 
        })
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

    return createSuccessResponse({ share: updatedShare })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid update data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to update share', 403)
      }
    }
    return createErrorResponse('UPDATE_FAILED', 'Failed to update document share', 500)
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
  const documentId = params.id
  const { searchParams } = new URL(request.url)
  const shareId = searchParams.get('shareId')

  if (!shareId) {
    return createErrorResponse('MISSING_SHARE_ID', 'Share ID is required', 400)
  }

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'share')

    // Check if user owns the share
    const existingShare = await prisma.documentShare.findFirst({
      where: {
        id: shareId,
        documentId,
        sharedBy: user.sub
      }
    })

    if (!existingShare) {
      return createErrorResponse('SHARE_NOT_FOUND', 'Share not found or not owned by user', 404)
    }

    await prisma.documentShare.delete({
      where: { id: shareId }
    })

    return createSuccessResponse({ message: 'Document share deleted successfully' })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to delete share', 403)
      }
    }
    return createErrorResponse('DELETE_FAILED', 'Failed to delete document share', 500)
  }
}