import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const commentCreateSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional()
})

const commentUpdateSchema = z.object({
  content: z.string().min(1).max(2000)
})

const commentQuerySchema = z.object({
  parentId: z.string().optional(),
  userId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
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

function buildCommentFilters(query: z.infer<typeof commentQuerySchema>, documentId: string) {
  const filters: any = {
    documentId
  }

  if (query.parentId !== undefined) {
    filters.parentId = query.parentId || null
  }

  if (query.userId) {
    filters.userId = query.userId
  }

  return filters
}

async function buildCommentTree(comments: any[]): Promise<any[]> {
  const commentMap = new Map()
  const rootComments: any[] = []

  // Create a map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] })
  })

  // Build the tree structure
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)
    
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId)
      if (parent) {
        parent.replies.push(commentWithReplies)
      }
    } else {
      rootComments.push(commentWithReplies)
    }
  })

  return rootComments
}

async function extractMentions(content: string, organizationId: string): Promise<string[]> {
  // Extract @mentions from content
  const mentionRegex = /@(\w+)/g
  const mentions = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1])
  }

  if (mentions.length === 0) {
    return []
  }

  // Find users by email or name
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      OR: [
        { email: { in: mentions.map(m => `${m}@example.com`) } }, // Simplified - in real app, you'd have proper mention resolution
        { firstName: { in: mentions, mode: 'insensitive' } },
        { lastName: { in: mentions, mode: 'insensitive' } }
      ]
    },
    select: { id: true }
  })

  return users.map(u => u.id)
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

    const query = commentQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const page = parseInt(query.page || '1')
    const limit = Math.min(parseInt(query.limit || '50'), 100)
    const skip = (page - 1) * limit

    const filters = buildCommentFilters(query, documentId)

    const [comments, total] = await Promise.all([
      prisma.documentComment.findMany({
        where: filters,
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
          },
          _count: {
            select: {
              replies: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip: query.parentId ? 0 : skip, // Don't paginate when getting replies
        take: query.parentId ? undefined : limit
      }),
      prisma.documentComment.count({ where: filters })
    ])

    // Build comment tree if getting root comments
    let result = comments
    if (!query.parentId) {
      result = await buildCommentTree(comments)
    }

    return createSuccessResponse({
      comments: result,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total,
        rootComments: comments.filter(c => !c.parentId).length,
        replies: comments.filter(c => c.parentId).length
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
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to view comments', 403)
      }
    }
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch comments', 500)
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
    const commentData = commentCreateSchema.parse(body)

    // Validate parent comment if provided
    if (commentData.parentId) {
      const parentComment = await prisma.documentComment.findFirst({
        where: {
          id: commentData.parentId,
          documentId
        }
      })

      if (!parentComment) {
        return createErrorResponse('PARENT_COMMENT_NOT_FOUND', 'Parent comment not found', 400)
      }
    }

    // Extract mentions from content
    const mentionedUserIds = await extractMentions(commentData.content, user.orgId)

    // Create the comment
    const comment = await prisma.documentComment.create({
      data: {
        documentId,
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
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    })

    // TODO: Send notifications to mentioned users
    // This would typically involve creating notification records or sending emails

    return createSuccessResponse({ 
      comment,
      mentionedUsers: mentionedUserIds
    }, 201)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid comment data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to create comments', 403)
      }
    }
    return createErrorResponse('CREATE_FAILED', 'Failed to create comment', 500)
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
  const commentId = searchParams.get('commentId')

  if (!commentId) {
    return createErrorResponse('MISSING_COMMENT_ID', 'Comment ID is required', 400)
  }

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    // Check if user owns the comment
    const existingComment = await prisma.documentComment.findFirst({
      where: {
        id: commentId,
        documentId
      }
    })

    if (!existingComment) {
      return createErrorResponse('COMMENT_NOT_FOUND', 'Comment not found', 404)
    }

    if (existingComment.userId !== user.sub) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Can only edit your own comments', 403)
    }

    const body = await request.json()
    const updateData = commentUpdateSchema.parse(body)

    // Extract mentions from updated content
    const mentionedUserIds = await extractMentions(updateData.content, user.orgId)

    const updatedComment = await prisma.documentComment.update({
      where: { id: commentId },
      data: {
        content: updateData.content
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
        },
        _count: {
          select: {
            replies: true
          }
        }
      }
    })

    return createSuccessResponse({ 
      comment: updatedComment,
      mentionedUsers: mentionedUserIds
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid update data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to update comment', 403)
      }
    }
    return createErrorResponse('UPDATE_FAILED', 'Failed to update comment', 500)
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
  const commentId = searchParams.get('commentId')

  if (!commentId) {
    return createErrorResponse('MISSING_COMMENT_ID', 'Comment ID is required', 400)
  }

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    // Check if user owns the comment
    const existingComment = await prisma.documentComment.findFirst({
      where: {
        id: commentId,
        documentId
      },
      include: {
        _count: {
          select: {
            replies: true
          }
        }
      }
    })

    if (!existingComment) {
      return createErrorResponse('COMMENT_NOT_FOUND', 'Comment not found', 404)
    }

    if (existingComment.userId !== user.sub) {
      return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Can only delete your own comments', 403)
    }

    // Check if comment has replies
    if (existingComment._count.replies > 0) {
      return createErrorResponse('COMMENT_HAS_REPLIES', 'Cannot delete comment with replies', 400)
    }

    await prisma.documentComment.delete({
      where: { id: commentId }
    })

    return createSuccessResponse({ message: 'Comment deleted successfully' })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to delete comment', 403)
      }
    }
    return createErrorResponse('DELETE_FAILED', 'Failed to delete comment', 500)
  }
}