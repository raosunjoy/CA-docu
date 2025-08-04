import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

interface CommentWithUser {
  id: string
  content: string
  parentId: string | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

interface CommentNode extends CommentWithUser {
  replies: CommentNode[]
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

const commentCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional()
})

const commentUpdateSchema = z.object({
  content: z.string().min(1).max(2000)
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

async function validateCommentAccess(commentId: string, documentId: string, userId: string): Promise<NextResponse | null> {
  const existingComment = await prisma.documentComment.findFirst({
    where: {
      id: commentId,
      documentId,
      userId
    }
  })

  if (!existingComment) {
    return createErrorResponse('COMMENT_NOT_FOUND', 'Comment not found or access denied', 404)
  }
  return null
}

async function validateParentComment(parentId: string, documentId: string): Promise<NextResponse | null> {
  const parentComment = await prisma.documentComment.findFirst({
    where: {
      id: parentId,
      documentId
    }
  })

  if (!parentComment) {
    return createErrorResponse('PARENT_COMMENT_NOT_FOUND', 'Parent comment not found', 400)
  }
  return null
}

async function validateCommentForDeletion(commentId: string, documentId: string, userId: string): Promise<NextResponse | null> {
  const existingComment = await prisma.documentComment.findFirst({
    where: {
      id: commentId,
      documentId,
      userId
    },
    include: {
      replies: {
        select: { id: true }
      }
    }
  })

  if (!existingComment) {
    return createErrorResponse('COMMENT_NOT_FOUND', 'Comment not found or access denied', 404)
  }

  // Check if comment has replies
  if (existingComment.replies.length > 0) {
    return createErrorResponse('COMMENT_HAS_REPLIES', 'Cannot delete comment that has replies', 400)
  }

  return null
}

async function buildCommentTree(comments: CommentWithUser[]): Promise<CommentNode[]> {
  const commentMap = new Map<string, CommentNode>()
  const rootComments: CommentNode[] = []

  // Create comment map
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Build tree structure
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id)
    if (commentNode) {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId)
        if (parent) {
          parent.replies.push(commentNode)
        }
      } else {
        rootComments.push(commentNode)
      }
    }
  })

  return rootComments
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
  const includeReplies = searchParams.get('includeReplies') !== 'false'

  try {
    // Check if document exists
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    const comments = await prisma.documentComment.findMany({
      where: {
        documentId: id
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
      },
      orderBy: { createdAt: 'asc' }
    })

    let result: CommentWithUser[] | CommentNode[] = comments
    if (includeReplies) {
      // Build threaded comment structure
      result = await buildCommentTree(comments)
    } else {
      // Only return top-level comments
      result = comments.filter(comment => !comment.parentId)
    }

    return createSuccessResponse({ comments: result })
  } catch {
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch comments', 500)
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
    const commentData = commentCreateSchema.parse(body)

    // Check if document exists
    const documentError = await validateDocumentAccess(id, user.orgId)
    if (documentError) {
      return documentError
    }

    // Validate parent comment if provided
    if (commentData.parentId) {
      const parentError = await validateParentComment(commentData.parentId, id)
      if (parentError) {
        return parentError
      }
    }

    const comment = await prisma.documentComment.create({
      data: {
        documentId: id,
        userId: user.sub,
        content: commentData.content,
        parentId: commentData.parentId || null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    return createSuccessResponse({ comment }, 201)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.issues)
    }

    return createErrorResponse('CREATE_FAILED', 'Failed to create comment', 500)
  }
}

export async function PATCH(
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
  const commentId = searchParams.get('commentId')

  if (!commentId) {
    return createErrorResponse('MISSING_COMMENT_ID', 'Comment ID is required', 400)
  }

  try {
    const body = await request.json()
    const updateData = commentUpdateSchema.parse(body)

    // Check if comment exists and user owns it
    const commentError = await validateCommentAccess(commentId, id, user.sub)
    if (commentError) {
      return commentError
    }

    const comment = await prisma.documentComment.update({
      where: { id: commentId },
      data: updateData,
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

    return createSuccessResponse({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.issues)
    }

    return createErrorResponse('UPDATE_FAILED', 'Failed to update comment', 500)
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
  const commentId = searchParams.get('commentId')

  if (!commentId) {
    return createErrorResponse('MISSING_COMMENT_ID', 'Comment ID is required', 400)
  }

  try {
    // Check if comment exists, user owns it, and it can be deleted
    const validationError = await validateCommentForDeletion(commentId, id, user.sub)
    if (validationError) {
      return validationError
    }

    await prisma.documentComment.delete({
      where: { id: commentId }
    })

    return createSuccessResponse({ message: 'Comment deleted successfully' })
  } catch {
    return createErrorResponse('DELETE_FAILED', 'Failed to delete comment', 500)
  }
}