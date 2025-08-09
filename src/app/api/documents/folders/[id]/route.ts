import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

const folderUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parentId: z.string().optional()
})

const bulkOperationSchema = z.object({
  operation: z.enum(['move', 'delete']),
  targetFolderId: z.string().optional(), // Required for move operation
  folderIds: z.array(z.string()).min(1)
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

async function validateFolderAccess(folderId: string, organizationId: string, userId: string, requiredPermission: string = 'view') {
  const folder = await prisma.documentFolder.findFirst({
    where: {
      id: folderId,
      organizationId
    },
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
  })

  if (!folder) {
    throw new Error('Folder not found')
  }

  // Check permissions
  const hasPermission = folder.createdBy === userId || 
    folder.permissions.some(p => p.permissions.includes(requiredPermission))

  if (!hasPermission) {
    throw new Error('Insufficient permissions')
  }

  return folder
}

async function getUserRoles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user ? [user.role] : []
}

function buildFolderPath(parentPath: string | null, folderName: string): string {
  if (!parentPath) return folderName
  return `${parentPath}/${folderName}`
}

async function validateParentFolder(parentId: string, organizationId: string, currentFolderId?: string) {
  const parent = await prisma.documentFolder.findFirst({
    where: {
      id: parentId,
      organizationId
    }
  })
  
  if (!parent) {
    throw new Error('Parent folder not found')
  }

  // Prevent circular references
  if (currentFolderId && await isDescendant(parentId, currentFolderId)) {
    throw new Error('Cannot move folder to its own descendant')
  }
  
  return parent
}

async function isDescendant(ancestorId: string, descendantId: string): Promise<boolean> {
  const descendant = await prisma.documentFolder.findUnique({
    where: { id: descendantId },
    select: { parentId: true }
  })

  if (!descendant?.parentId) {
    return false
  }

  if (descendant.parentId === ancestorId) {
    return true
  }

  return isDescendant(ancestorId, descendant.parentId)
}

async function updateChildrenPaths(folderId: string, newPath: string) {
  const children = await prisma.documentFolder.findMany({
    where: { parentId: folderId },
    select: { id: true, name: true }
  })

  for (const child of children) {
    const childPath = buildFolderPath(newPath, child.name)
    await prisma.documentFolder.update({
      where: { id: child.id },
      data: { path: childPath }
    })
    
    // Recursively update grandchildren
    await updateChildrenPaths(child.id, childPath)
  }
}

async function checkFolderNameConflict(
  organizationId: string,
  name: string,
  parentId: string | null,
  excludeFolderId?: string
) {
  const existingFolder = await prisma.documentFolder.findFirst({
    where: {
      organizationId,
      name,
      parentId,
      ...(excludeFolderId ? { id: { not: excludeFolderId } } : {})
    }
  })

  return !!existingFolder
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
    const folderId = id

  try {
    const folder = await validateFolderAccess(folderId, user.orgId, user.sub, 'view')

    const folderWithDetails = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      include: {
        creator: {
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
            name: true,
            path: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            path: true,
            createdAt: true,
            _count: {
              select: {
                documents: true,
                children: true
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        documents: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            type: true,
            fileSize: true,
            createdAt: true,
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { name: 'asc' }
        },
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            documents: true,
            children: true
          }
        }
      }
    })

    return createSuccessResponse({ folder: folderWithDetails })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to access folder', 403)
      }
    }
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch folder', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { id } = await params
    const folderId = id

  try {
    const body = await request.json()
    const updateData = folderUpdateSchema.parse(body)

    await validateFolderAccess(folderId, user.orgId, user.sub, 'edit')

    let parentFolder = null
    let newPath = updateData.name

    // Validate parent folder if changing
    if (updateData.parentId !== undefined) {
      if (updateData.parentId) {
        parentFolder = await validateParentFolder(updateData.parentId, user.orgId, folderId)
        newPath = buildFolderPath(parentFolder.path, updateData.name || '')
      } else {
        newPath = updateData.name || ''
      }
    }

    // Check for name conflicts if name is being changed
    if (updateData.name) {
      const currentFolder = await prisma.documentFolder.findUnique({
        where: { id: folderId },
        select: { name: true, parentId: true }
      })

      const targetParentId = updateData.parentId !== undefined ? 
        (updateData.parentId || null) : currentFolder?.parentId

      if (await checkFolderNameConflict(user.orgId, updateData.name, targetParentId, folderId)) {
        return createErrorResponse('FOLDER_EXISTS', 'A folder with this name already exists in the target location', 409)
      }
    }

    // Update folder in transaction to handle path updates
    const updatedFolder = await prisma.$transaction(async (tx) => {
      const folder = await tx.documentFolder.update({
        where: { id: folderId },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.parentId !== undefined && { parentId: updateData.parentId || null }),
          ...(newPath && { path: newPath })
        },
        include: {
          creator: {
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
              name: true,
              path: true
            }
          },
          _count: {
            select: {
              documents: true,
              children: true
            }
          }
        }
      })

      // Update children paths if path changed
      if (newPath && newPath !== folder.path) {
        await updateChildrenPaths(folderId, newPath)
      }

      return folder
    })

    return createSuccessResponse({ folder: updatedFolder })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid update data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to update folder', 403)
      }
      if (error.message === 'Parent folder not found') {
        return createErrorResponse('PARENT_FOLDER_NOT_FOUND', 'Parent folder not found', 400)
      }
      if (error.message === 'Cannot move folder to its own descendant') {
        return createErrorResponse('CIRCULAR_REFERENCE', 'Cannot move folder to its own descendant', 400)
      }
    }
    return createErrorResponse('UPDATE_FAILED', 'Failed to update folder', 500)
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
    const folderId = id

  try {
    await validateFolderAccess(folderId, user.orgId, user.sub, 'delete')

    // Check if folder has children or documents
    const folderContents = await prisma.documentFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            children: true,
            documents: { where: { isDeleted: false } }
          }
        }
      }
    })

    if (folderContents && (folderContents._count.children > 0 || folderContents._count.documents > 0)) {
      return createErrorResponse('FOLDER_NOT_EMPTY', 'Cannot delete folder that contains subfolders or documents', 400)
    }

    await prisma.documentFolder.delete({
      where: { id: folderId }
    })

    return createSuccessResponse({ message: 'Folder deleted successfully' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to delete folder', 403)
      }
    }
    return createErrorResponse('DELETE_FAILED', 'Failed to delete folder', 500)
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
    const folderId = id

  try {
    const body = await request.json()
    const bulkData = bulkOperationSchema.parse(body)

    await validateFolderAccess(folderId, user.orgId, user.sub, 'edit')

    if (bulkData.operation === 'move') {
      if (!bulkData.targetFolderId) {
        return createErrorResponse('MISSING_TARGET', 'Target folder ID is required for move operation', 400)
      }

      // Validate target folder
      await validateFolderAccess(bulkData.targetFolderId, user.orgId, user.sub, 'upload')

      // Validate all folders to be moved
      const foldersToMove = await prisma.documentFolder.findMany({
        where: {
          id: { in: bulkData.folderIds },
          organizationId: user.orgId
        }
      })

      if (foldersToMove.length !== bulkData.folderIds.length) {
        return createErrorResponse('FOLDERS_NOT_FOUND', 'Some folders were not found', 400)
      }

      // Check for circular references and name conflicts
      for (const folder of foldersToMove) {
        if (await isDescendant(folder.id, bulkData.targetFolderId)) {
          return createErrorResponse('CIRCULAR_REFERENCE', `Cannot move folder "${folder.name}" to its own descendant`, 400)
        }

        if (await checkFolderNameConflict(user.orgId, folder.name, bulkData.targetFolderId)) {
          return createErrorResponse('NAME_CONFLICT', `A folder named "${folder.name}" already exists in the target location`, 409)
        }
      }

      // Perform bulk move
      const targetFolder = await prisma.documentFolder.findUnique({
        where: { id: bulkData.targetFolderId },
        select: { path: true }
      })

      await prisma.$transaction(async (tx) => {
        for (const folder of foldersToMove) {
          const newPath = buildFolderPath(targetFolder!.path, folder.name)
          
          await tx.documentFolder.update({
            where: { id: folder.id },
            data: {
              parentId: bulkData.targetFolderId,
              path: newPath
            }
          })

          // Update children paths
          await updateChildrenPaths(folder.id, newPath)
        }
      })

      return createSuccessResponse({ 
        message: `Successfully moved ${bulkData.folderIds.length} folders`,
        movedFolders: bulkData.folderIds
      })
    }

    if (bulkData.operation === 'delete') {
      // Validate all folders can be deleted
      const foldersToDelete = await prisma.documentFolder.findMany({
        where: {
          id: { in: bulkData.folderIds },
          organizationId: user.orgId
        },
        include: {
          _count: {
            select: {
              children: true,
              documents: { where: { isDeleted: false } }
            }
          }
        }
      })

      const nonEmptyFolders = foldersToDelete.filter(f => 
        f._count.children > 0 || f._count.documents > 0
      )

      if (nonEmptyFolders.length > 0) {
        return createErrorResponse('FOLDERS_NOT_EMPTY', 
          `Cannot delete non-empty folders: ${nonEmptyFolders.map(f => f.name).join(', ')}`, 400)
      }

      // Perform bulk delete
      await prisma.documentFolder.deleteMany({
        where: {
          id: { in: bulkData.folderIds },
          organizationId: user.orgId
        }
      })

      return createSuccessResponse({ 
        message: `Successfully deleted ${bulkData.folderIds.length} folders`,
        deletedFolders: bulkData.folderIds
      })
    }

    return createErrorResponse('INVALID_OPERATION', 'Invalid bulk operation', 400)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid bulk operation data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions for bulk operation', 403)
      }
    }
    return createErrorResponse('BULK_OPERATION_FAILED', 'Failed to perform bulk operation', 500)
  }
}