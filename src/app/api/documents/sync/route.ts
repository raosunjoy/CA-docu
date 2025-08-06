import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const syncRequestSchema = z.object({
  deviceId: z.string().min(1),
  lastSyncAt: z.string().datetime().optional(),
  syncVersion: z.number().min(0).optional().default(0),
  operations: z.array(z.object({
    type: z.enum(['create', 'update', 'delete']),
    resourceType: z.enum(['document', 'annotation', 'comment']),
    resourceId: z.string(),
    data: z.record(z.any()).optional(),
    timestamp: z.string().datetime(),
    clientId: z.string().optional()
  })).optional().default([])
})

const offlineCacheSchema = z.object({
  documentIds: z.array(z.string()).optional(),
  folderId: z.string().optional(),
  cacheSize: z.number().min(1).max(1000).optional().default(50)
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

async function getUserSyncStatus(userId: string, deviceId: string) {
  let syncStatus = await prisma.syncStatus.findUnique({
    where: {
      userId_deviceId: {
        userId,
        deviceId
      }
    }
  })

  if (!syncStatus) {
    syncStatus = await prisma.syncStatus.create({
      data: {
        userId,
        deviceId,
        lastSyncAt: new Date(),
        syncVersion: 1,
        pendingChanges: 0
      }
    })
  }

  return syncStatus
}

async function getChangedDocuments(organizationId: string, lastSyncAt: Date) {
  const documents = await prisma.document.findMany({
    where: {
      organizationId,
      isDeleted: false,
      updatedAt: {
        gt: lastSyncAt
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
      },
      folder: {
        select: {
          id: true,
          name: true,
          path: true
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
    orderBy: { updatedAt: 'desc' }
  })

  return documents
}

async function getChangedAnnotations(organizationId: string, lastSyncAt: Date) {
  const annotations = await prisma.documentAnnotation.findMany({
    where: {
      document: {
        organizationId,
        isDeleted: false
      },
      updatedAt: {
        gt: lastSyncAt
      }
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
      document: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return annotations
}

async function getChangedComments(organizationId: string, lastSyncAt: Date) {
  const comments = await prisma.documentComment.findMany({
    where: {
      document: {
        organizationId,
        isDeleted: false
      },
      updatedAt: {
        gt: lastSyncAt
      }
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
      document: {
        select: {
          id: true,
          name: true
        }
      },
      parent: {
        select: {
          id: true,
          content: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  return comments
}

async function processOfflineOperations(operations: any[], userId: string, organizationId: string) {
  const results = []
  const conflicts = []

  for (const operation of operations) {
    try {
      let result = null

      switch (operation.resourceType) {
        case 'document':
          // Document operations would typically be handled differently
          // as they involve file uploads which can't be done offline
          result = { skipped: true, reason: 'Document operations not supported in offline sync' }
          break

        case 'annotation':
          result = await processAnnotationOperation(operation, userId, organizationId)
          break

        case 'comment':
          result = await processCommentOperation(operation, userId, organizationId)
          break

        default:
          result = { error: 'Unknown resource type' }
      }

      results.push({
        operation,
        result,
        success: !result.error && !result.conflict
      })

      if (result.conflict) {
        conflicts.push({
          operation,
          conflict: result.conflict
        })
      }
    } catch (error) {
      results.push({
        operation,
        result: { error: error instanceof Error ? error.message : 'Unknown error' },
        success: false
      })
    }
  }

  return { results, conflicts }
}

async function processAnnotationOperation(operation: any, userId: string, organizationId: string) {
  const { type, resourceId, data, timestamp } = operation

  switch (type) {
    case 'create':
      // Check if annotation already exists (duplicate prevention)
      const existing = await prisma.documentAnnotation.findUnique({
        where: { id: resourceId }
      })

      if (existing) {
        return { skipped: true, reason: 'Annotation already exists' }
      }

      // Validate document access
      const document = await prisma.document.findFirst({
        where: {
          id: data.documentId,
          organizationId,
          isDeleted: false
        }
      })

      if (!document) {
        return { error: 'Document not found or access denied' }
      }

      const annotation = await prisma.documentAnnotation.create({
        data: {
          id: resourceId,
          documentId: data.documentId,
          userId,
          type: data.type,
          content: data.content,
          position: data.position,
          style: data.style,
          createdAt: new Date(timestamp)
        }
      })

      return { created: annotation }

    case 'update':
      const annotationToUpdate = await prisma.documentAnnotation.findFirst({
        where: {
          id: resourceId,
          userId // Only allow updating own annotations
        }
      })

      if (!annotationToUpdate) {
        return { error: 'Annotation not found or access denied' }
      }

      // Check for conflicts (server version newer than client)
      if (annotationToUpdate.updatedAt > new Date(timestamp)) {
        return {
          conflict: {
            type: 'version_conflict',
            serverVersion: annotationToUpdate,
            clientVersion: data
          }
        }
      }

      const updatedAnnotation = await prisma.documentAnnotation.update({
        where: { id: resourceId },
        data: {
          content: data.content,
          position: data.position,
          style: data.style,
          updatedAt: new Date(timestamp)
        }
      })

      return { updated: updatedAnnotation }

    case 'delete':
      const annotationToDelete = await prisma.documentAnnotation.findFirst({
        where: {
          id: resourceId,
          userId // Only allow deleting own annotations
        }
      })

      if (!annotationToDelete) {
        return { skipped: true, reason: 'Annotation not found or already deleted' }
      }

      await prisma.documentAnnotation.delete({
        where: { id: resourceId }
      })

      return { deleted: true }

    default:
      return { error: 'Unknown operation type' }
  }
}

async function processCommentOperation(operation: any, userId: string, organizationId: string) {
  const { type, resourceId, data, timestamp } = operation

  switch (type) {
    case 'create':
      // Check if comment already exists
      const existing = await prisma.documentComment.findUnique({
        where: { id: resourceId }
      })

      if (existing) {
        return { skipped: true, reason: 'Comment already exists' }
      }

      // Validate document access
      const document = await prisma.document.findFirst({
        where: {
          id: data.documentId,
          organizationId,
          isDeleted: false
        }
      })

      if (!document) {
        return { error: 'Document not found or access denied' }
      }

      const comment = await prisma.documentComment.create({
        data: {
          id: resourceId,
          documentId: data.documentId,
          userId,
          content: data.content,
          parentId: data.parentId,
          createdAt: new Date(timestamp)
        }
      })

      return { created: comment }

    case 'update':
      const commentToUpdate = await prisma.documentComment.findFirst({
        where: {
          id: resourceId,
          userId // Only allow updating own comments
        }
      })

      if (!commentToUpdate) {
        return { error: 'Comment not found or access denied' }
      }

      // Check for conflicts
      if (commentToUpdate.updatedAt > new Date(timestamp)) {
        return {
          conflict: {
            type: 'version_conflict',
            serverVersion: commentToUpdate,
            clientVersion: data
          }
        }
      }

      const updatedComment = await prisma.documentComment.update({
        where: { id: resourceId },
        data: {
          content: data.content,
          updatedAt: new Date(timestamp)
        }
      })

      return { updated: updatedComment }

    case 'delete':
      const commentToDelete = await prisma.documentComment.findFirst({
        where: {
          id: resourceId,
          userId // Only allow deleting own comments
        }
      })

      if (!commentToDelete) {
        return { skipped: true, reason: 'Comment not found or already deleted' }
      }

      await prisma.documentComment.delete({
        where: { id: resourceId }
      })

      return { deleted: true }

    default:
      return { error: 'Unknown operation type' }
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const syncData = syncRequestSchema.parse(body)

    // Get or create sync status
    const syncStatus = await getUserSyncStatus(user.sub, syncData.deviceId)
    const lastSyncAt = syncData.lastSyncAt ? new Date(syncData.lastSyncAt) : syncStatus.lastSyncAt

    // Process offline operations first
    const { results, conflicts } = await processOfflineOperations(
      syncData.operations,
      user.sub,
      user.orgId
    )

    // Get changes since last sync
    const [changedDocuments, changedAnnotations, changedComments] = await Promise.all([
      getChangedDocuments(user.orgId, lastSyncAt),
      getChangedAnnotations(user.orgId, lastSyncAt),
      getChangedComments(user.orgId, lastSyncAt)
    ])

    // Update sync status
    const newSyncVersion = syncStatus.syncVersion + 1
    await prisma.syncStatus.update({
      where: {
        userId_deviceId: {
          userId: user.sub,
          deviceId: syncData.deviceId
        }
      },
      data: {
        lastSyncAt: new Date(),
        syncVersion: newSyncVersion,
        pendingChanges: conflicts.length
      }
    })

    const syncResult = {
      syncVersion: newSyncVersion,
      timestamp: new Date().toISOString(),
      changes: {
        documents: changedDocuments,
        annotations: changedAnnotations,
        comments: changedComments
      },
      operations: {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      },
      conflicts,
      stats: {
        documentsChanged: changedDocuments.length,
        annotationsChanged: changedAnnotations.length,
        commentsChanged: changedComments.length,
        totalChanges: changedDocuments.length + changedAnnotations.length + changedComments.length
      }
    }

    return createSuccessResponse({ sync: syncResult })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid sync request data', 400, error.issues)
    }
    return createErrorResponse('SYNC_FAILED', 'Failed to process sync request', 500)
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const deviceId = searchParams.get('deviceId')
    
    if (!deviceId) {
      return createErrorResponse('MISSING_DEVICE_ID', 'Device ID is required', 400)
    }

    // Get sync status
    const syncStatus = await getUserSyncStatus(user.sub, deviceId)

    // Get offline cache recommendations based on user activity
    const recentDocuments = await prisma.document.findMany({
      where: {
        organizationId: user.orgId,
        isDeleted: false,
        OR: [
          { uploadedBy: user.sub },
          { lastAccessedAt: { not: null } }
        ]
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        folder: {
          select: {
            id: true,
            name: true,
            path: true
          }
        }
      },
      orderBy: [
        { lastAccessedAt: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: 20
    })

    return createSuccessResponse({
      syncStatus,
      recommendations: {
        documents: recentDocuments,
        message: 'Documents recommended for offline access based on your recent activity'
      }
    })

  } catch (error) {
    return createErrorResponse('SYNC_STATUS_FAILED', 'Failed to get sync status', 500)
  }
}

// Endpoint for managing offline cache
export async function PUT(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const cacheData = offlineCacheSchema.parse(body)

    let documentsToCache = []

    if (cacheData.documentIds) {
      // Cache specific documents
      documentsToCache = await prisma.document.findMany({
        where: {
          id: { in: cacheData.documentIds },
          organizationId: user.orgId,
          isDeleted: false
        },
        include: {
          annotations: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
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
            }
          }
        }
      })
    } else if (cacheData.folderId) {
      // Cache documents from a specific folder
      documentsToCache = await prisma.document.findMany({
        where: {
          folderId: cacheData.folderId,
          organizationId: user.orgId,
          isDeleted: false
        },
        include: {
          annotations: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
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
            }
          }
        },
        take: cacheData.cacheSize
      })
    }

    // Calculate total cache size
    const totalSize = documentsToCache.reduce((sum, doc) => sum + doc.fileSize, 0)

    return createSuccessResponse({
      cache: {
        documents: documentsToCache,
        totalDocuments: documentsToCache.length,
        totalSize,
        message: `Prepared ${documentsToCache.length} documents for offline access`
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid cache request data', 400, error.issues)
    }
    return createErrorResponse('CACHE_FAILED', 'Failed to prepare offline cache', 500)
  }
}