import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

interface WhereClause {
  documentId: string
  position?: {
    path: string[]
    equals: number
  }
}

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

const annotationCreateSchema = z.object({
  type: z.enum(['highlight', 'comment', 'drawing', 'text', 'arrow']),
  content: z.string().optional(),
  position: z.object({
    page: z.number().min(1),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional()
  }),
  style: z.object({
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    fontSize: z.number().optional(),
    strokeWidth: z.number().optional()
  }).optional()
})

const annotationUpdateSchema = z.object({
  content: z.string().optional(),
  position: z.object({
    page: z.number().min(1),
    x: z.number(),
    y: z.number(),
    width: z.number().optional(),
    height: z.number().optional()
  }).optional(),
  style: z.object({
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    fontSize: z.number().optional(),
    strokeWidth: z.number().optional()
  }).optional()
})

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

async function findDocument(id: string, organizationId: string) {
  return prisma.document.findFirst({
    where: {
      id,
      organizationId,
      isDeleted: false
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

async function validateAnnotationAccess(annotationId: string, documentId: string, userId: string): Promise<NextResponse | null> {
  const existingAnnotation = await prisma.documentAnnotation.findFirst({
    where: {
      id: annotationId,
      documentId,
      userId
    }
  })

  if (!existingAnnotation) {
    return createErrorResponse('ANNOTATION_NOT_FOUND', 'Annotation not found or access denied', 404)
  }
  return null
}

type AnnotationUpdateData = z.infer<typeof annotationUpdateSchema>

interface ValidatedPatchRequest {
  user: { sub: string; orgId: string }
  documentId: string
  annotationId: string
  updateData: AnnotationUpdateData
}

async function validatePatchRequest(request: NextRequest, params: Promise<{ id: string }>): Promise<ValidatedPatchRequest | NextResponse> {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const annotationId = searchParams.get('annotationId')

  if (!annotationId) {
    return createErrorResponse('MISSING_ANNOTATION_ID', 'Annotation ID is required', 400)
  }

  try {
    const body = await request.json()
    const updateData = annotationUpdateSchema.parse(body)
    return { user, documentId: id, annotationId, updateData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.issues)
    }
    throw error
  }
}

function prepareUpdateData(updateData: AnnotationUpdateData) {
  return {
    ...(updateData.content !== undefined && { content: updateData.content || null }),
    ...(updateData.position && { position: updateData.position }),
    ...(updateData.style !== undefined && { style: updateData.style || {} })
  }
}

async function updateAnnotationWithIncludes(annotationId: string, updateData: AnnotationUpdateData) {
  return prisma.documentAnnotation.update({
    where: { id: annotationId },
    data: prepareUpdateData(updateData),
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page')

  try {
    // Check if document exists
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    const whereClause: WhereClause = {
      documentId: id
    }

    // Filter by page if specified
    if (page) {
      whereClause.position = {
        path: ['page'],
        equals: parseInt(page)
      }
    }

    const annotations = await prisma.documentAnnotation.findMany({
      where: whereClause,
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

    return createSuccessResponse({ annotations })
  } catch {
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch annotations', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = await params

  try {
    const body = await request.json()
    const annotationData = annotationCreateSchema.parse(body)

    // Check if document exists
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    const annotation = await prisma.documentAnnotation.create({
      data: {
        documentId: id,
        userId: user.sub,
        type: annotationData.type,
        content: annotationData.content || null,
        position: annotationData.position,
        style: annotationData.style || {}
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
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.issues)
    }

    return createErrorResponse('CREATE_FAILED', 'Failed to create annotation', 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validationResult = await validatePatchRequest(request, params)
  if (validationResult instanceof NextResponse) {
    return validationResult
  }

  const { user, documentId, annotationId, updateData } = validationResult

  try {
    // Check if annotation exists and user owns it
    const annotationError = await validateAnnotationAccess(annotationId, documentId, user.sub)
    if (annotationError) {
      return annotationError
    }

    const annotation = await updateAnnotationWithIncludes(annotationId, updateData)
    return createSuccessResponse({ annotation })
  } catch {
    return createErrorResponse('UPDATE_FAILED', 'Failed to update annotation', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const annotationId = searchParams.get('annotationId')

  if (!annotationId) {
    return createErrorResponse('MISSING_ANNOTATION_ID', 'Annotation ID is required', 400)
  }

  try {
    // Check if annotation exists and user owns it
    const annotationError = await validateAnnotationAccess(annotationId, id, user.sub)
    if (annotationError) {
      return annotationError
    }

    await prisma.documentAnnotation.delete({
      where: { id: annotationId }
    })

    return createSuccessResponse({ message: 'Annotation deleted successfully' })
  } catch {
    return createErrorResponse('DELETE_FAILED', 'Failed to delete annotation', 500)
  }
}