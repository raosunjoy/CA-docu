import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const tagAssignSchema = z.object({
  tagIds: z.array(z.string()).min(1),
  replace: z.boolean().optional().default(false) // If true, replace all existing tags
})

const tagCreateAndAssignSchema = z.object({
  tagName: z.string().min(1).max(100),
  parentId: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).optional()
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

async function validateTags(tagIds: string[], organizationId: string) {
  const tags = await prisma.tag.findMany({
    where: {
      id: { in: tagIds },
      organizationId
    }
  })

  if (tags.length !== tagIds.length) {
    const foundIds = tags.map(t => t.id)
    const missingIds = tagIds.filter(id => !foundIds.includes(id))
    throw new Error(`Tags not found: ${missingIds.join(', ')}`)
  }

  return tags
}

async function getDocumentTags(documentId: string) {
  const taggings = await prisma.tagging.findMany({
    where: {
      taggableType: 'document',
      taggableId: documentId
    },
    include: {
      tag: {
        include: {
          parent: {
            select: {
              id: true,
              name: true
            }
          },
          children: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  return taggings.map(t => t.tag)
}

async function assignTagsToDocument(documentId: string, tagIds: string[], userId: string, replace: boolean = false) {
  return prisma.$transaction(async (tx) => {
    // Remove existing tags if replace is true
    if (replace) {
      await tx.tagging.deleteMany({
        where: {
          taggableType: 'document',
          taggableId: documentId
        }
      })
    }

    // Get existing tag assignments to avoid duplicates
    const existingTaggings = await tx.tagging.findMany({
      where: {
        taggableType: 'document',
        taggableId: documentId,
        tagId: { in: tagIds }
      },
      select: { tagId: true }
    })

    const existingTagIds = existingTaggings.map(t => t.tagId)
    const newTagIds = tagIds.filter(id => !existingTagIds.includes(id))

    // Create new tag assignments
    if (newTagIds.length > 0) {
      await tx.tagging.createMany({
        data: newTagIds.map(tagId => ({
          tagId,
          taggableType: 'document',
          taggableId: documentId,
          taggedBy: userId
        }))
      })
    }

    // Return updated tags
    return getDocumentTags(documentId)
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
  const documentId = params.id

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'view')

    const tags = await getDocumentTags(documentId)

    // Build tag hierarchy for better organization
    const tagHierarchy = tags.reduce((acc, tag) => {
      if (!tag.parent) {
        acc.rootTags.push(tag)
      } else {
        if (!acc.childTags[tag.parent.id]) {
          acc.childTags[tag.parent.id] = []
        }
        acc.childTags[tag.parent.id].push(tag)
      }
      return acc
    }, { rootTags: [] as any[], childTags: {} as Record<string, any[]> })

    return createSuccessResponse({
      tags,
      tagHierarchy,
      stats: {
        total: tags.length,
        rootTags: tagHierarchy.rootTags.length,
        childTags: Object.keys(tagHierarchy.childTags).length
      }
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to view document tags', 403)
      }
    }
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch document tags', 500)
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

    const body = await request.json()
    
    // Check if this is a tag assignment or tag creation request
    if (body.tagIds) {
      // Assign existing tags
      const assignData = tagAssignSchema.parse(body)
      await validateTags(assignData.tagIds, user.orgId)

      const updatedTags = await assignTagsToDocument(
        documentId,
        assignData.tagIds,
        user.sub,
        assignData.replace
      )

      return createSuccessResponse({
        tags: updatedTags,
        message: `${assignData.replace ? 'Replaced' : 'Added'} ${assignData.tagIds.length} tag(s)`
      })
    } else {
      // Create new tag and assign it
      const createData = tagCreateAndAssignSchema.parse(body)

      // Check if tag already exists
      const existingTag = await prisma.tag.findFirst({
        where: {
          organizationId: user.orgId,
          name: createData.tagName,
          parentId: createData.parentId || null
        }
      })

      let tag
      if (existingTag) {
        tag = existingTag
      } else {
        // Create new tag
        tag = await prisma.tag.create({
          data: {
            organizationId: user.orgId,
            name: createData.tagName,
            parentId: createData.parentId || null,
            color: createData.color || null,
            description: createData.description || null,
            createdBy: user.sub
          }
        })
      }

      // Assign the tag to the document
      const updatedTags = await assignTagsToDocument(documentId, [tag.id], user.sub, false)

      return createSuccessResponse({
        tag,
        tags: updatedTags,
        message: `${existingTag ? 'Assigned existing' : 'Created and assigned'} tag "${createData.tagName}"`
      }, existingTag ? 200 : 201)
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid tag data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to tag document', 403)
      }
      if (error.message.startsWith('Tags not found:')) {
        return createErrorResponse('TAGS_NOT_FOUND', error.message, 400)
      }
    }
    return createErrorResponse('ASSIGN_FAILED', 'Failed to assign tags to document', 500)
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
  const tagId = searchParams.get('tagId')

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub, 'edit')

    if (tagId) {
      // Remove specific tag
      const deleted = await prisma.tagging.deleteMany({
        where: {
          taggableType: 'document',
          taggableId: documentId,
          tagId
        }
      })

      if (deleted.count === 0) {
        return createErrorResponse('TAG_NOT_ASSIGNED', 'Tag is not assigned to this document', 404)
      }

      const remainingTags = await getDocumentTags(documentId)

      return createSuccessResponse({
        tags: remainingTags,
        message: 'Tag removed from document'
      })
    } else {
      // Remove all tags
      const deleted = await prisma.tagging.deleteMany({
        where: {
          taggableType: 'document',
          taggableId: documentId
        }
      })

      return createSuccessResponse({
        tags: [],
        message: `Removed ${deleted.count} tag(s) from document`
      })
    }

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to remove tags from document', 403)
      }
    }
    return createErrorResponse('REMOVE_FAILED', 'Failed to remove tags from document', 500)
  }
}