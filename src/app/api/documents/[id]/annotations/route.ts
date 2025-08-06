import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const annotationCreateSchema = z.object({
  type: z.enum(['highlight', 'comment', 'drawing', 'note']),
  content: z.string().optional(),
  position: z.object({
    page: z.number().min(1),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(0).max(100).optional(),
    height: z.number().min(0).max(100).optional()
  }),
  style: z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    opacity: z.number().min(0).max(1).optional(),
    strokeWidth: z.number().min(1).max(10).optional(),
    fontSize: z.number().min(8).max(72).optional()
  }).optional()
})

const annotationUpdateSchema = z.object({
  content: z.string().optional(),
  position: z.object({
    page: z.number().min(1),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(0).max(100).optional(),
    height: z.number().min(0).max(100).optional()
  }).optional(),
  style: z.object({
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    opacity: z.number().min(0).max(1).optional(),
    strokeWidth: z.number().min(1).max(10).optional(),
    fontSize: z.number().min(8).max(72).optional()
  }).optional()
})

const annotationQuerySchema = z.object({
  page: z.string().optional(),
  type: z.enum(['highlight', 'comment', 'drawing', 'note']).optional(),
  userId: z.string().optional()
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

function buildAnnotationFilters(query: z.infer<typeof annotationQuerySchema>, documentId: string) {
  const filters: any = {
    documentId
  }

  if (query.page) {
    const pageNumber = parseInt(query.page)
    if (!isNaN(pageNumber)) {
      filters.position = {
        path: ['page'],
        equals: pageNumber
      }
    }
  }

  if (query.type) {
    filters.type = query.type
  }

  if (query.userId) {
    filters.userId = query.userId
  }

  return filters
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

    const query = annotationQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const filters = buildAnnotationFilters(query, documentId)

    const annotations = await prisma.documentAnnotation.findMany({
      where: filters,
      include: {
        user: {
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

    // Group annotations by page for easier frontend handling
    const annotationsByPage = annotations.reduce((acc, annotation) => {
      const page = (annotation.position as any).page
      if (!acc[page]) {
        acc[page] = []
      }
      acc[page].push(annotation)
      return acc
    }, {} as Record<number, typeof annotations>)

    return createSuccessResponse({
      annotations,
      annotationsByPage,
      stats: {
        total: annotations.length,
        byType: annotations.reduce((acc, annotation) => {
          acc[annotation.type] = (acc[annotation.type] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        byUser: annotations.reduce((acc, annotation) => {
          const userName = `${annotation.user.firstName} ${annotation.user.lastName}`
          acc[userName] = (acc[userName] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
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
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to view annotations', 403)
      }
    }
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch annotations', 500)
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
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    const body = await request.json()
    const annotationData = annotationCreateSchema.parse(body)

    // Create the annotation
    const annotation = await prisma.documentAnnotation.create({
      data: {
        documentId,
        userId: user.sub,
        type: annotationData.type,
        content: annotationData.content || null,
        position: annotationData.position,
        style: annotationData.style || null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return createSuccessResponse({ annotation }, 201)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid annotation data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to create annotations', 403)
      }
    }
    return createErrorResponse('CREATE_FAILED', 'Failed to create annotation', 500)
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
  const annotationId = searchParams.get('annotationId')

  if (!annotationId) {
    return createErrorResponse('MISSING_ANNOTATION_ID', 'Annotation ID is required', 400)
  }

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    // Check if user owns the annotation or has edit permissions
    const existingAnnotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: annotationId,
        documentId
      }
    })

    if (!existingAnnotation) {
      return createErrorResponse('ANNOTATION_NOT_FOUND', 'Annotation not found', 404)
    }

    if (existingAnnotation.userId !== user.sub) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Can only edit your own annotations', 403)
    }

    const body = await request.json()
    const updateData = annotationUpdateSchema.parse(body)

    const updatedAnnotation = await prisma.documentAnnotation.update({
      where: { id: annotationId },
      data: {
        ...(updateData.content !== undefined && { content: updateData.content }),
        ...(updateData.position && { position: updateData.position }),
        ...(updateData.style && { style: updateData.style })
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return createSuccessResponse({ annotation: updatedAnnotation })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid update data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to update annotation', 403)
      }
    }
    return createErrorResponse('UPDATE_FAILED', 'Failed to update annotation', 500)
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
  const annotationId = searchParams.get('annotationId')

  if (!annotationId) {
    return createErrorResponse('MISSING_ANNOTATION_ID', 'Annotation ID is required', 400)
  }

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    // Check if user owns the annotation or has delete permissions
    const existingAnnotation = await prisma.documentAnnotation.findFirst({
      where: {
        id: annotationId,
        documentId
      }
    })

    if (!existingAnnotation) {
      return createErrorResponse('ANNOTATION_NOT_FOUND', 'Annotation not found', 404)
    }

    if (existingAnnotation.userId !== user.sub) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Can only delete your own annotations', 403)
    }

    await prisma.documentAnnotation.delete({
      where: { id: annotationId }
    })

    return createSuccessResponse({ message: 'Annotation deleted successfully' })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to delete annotation', 403)
      }
    }
    return createErrorResponse('DELETE_FAILED', 'Failed to delete annotation', 500)
  }
}