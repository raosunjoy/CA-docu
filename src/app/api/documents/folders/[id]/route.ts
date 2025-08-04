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

const folderUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  parentId: z.string().optional()
})

const getFolderIncludes = () => ({
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
      _count: {
        select: {
          documents: true,
          children: true
        }
      }
    }
  },
  documents: {
    select: {
      id: true,
      name: true,
      type: true,
      fileSize: true,
      createdAt: true
    },
    where: {
      isDeleted: false
    },
    orderBy: { createdAt: 'desc' as const }
  },
  _count: {
    select: {
      documents: true,
      children: true
    }
  }
})

async function findFolder(id: string, organizationId: string) {
  return prisma.documentFolder.findFirst({
    where: {
      id,
      organizationId
    },
    include: getFolderIncludes()
  })
}

function buildFolderPath(parentPath: string | null, folderName: string): string {
  if (!parentPath) return folderName
  return `${parentPath}/${folderName}`
}

async function updateChildrenPaths(folderId: string, newPath: string) {
  const children = await prisma.documentFolder.findMany({
    where: { parentId: folderId },
    select: { id: true, name: true }
  })

  for (const child of children) {
    const childPath = `${newPath}/${child.name}`
    
    await prisma.documentFolder.update({
      where: { id: child.id },
      data: { path: childPath }
    })

    // Recursively update nested children
    await updateChildrenPaths(child.id, childPath)
  }
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

async function validateParentFolder(parentId: string, organizationId: string) {
  return prisma.documentFolder.findFirst({
    where: {
      id: parentId,
      organizationId
    }
  })
}

async function checkCircularReference(folderId: string, newParentId: string): Promise<boolean> {
  let currentParent = await prisma.documentFolder.findFirst({
    where: { id: newParentId },
    select: { id: true, parentId: true }
  })

  while (currentParent) {
    if (currentParent.id === folderId) {
      return true // Circular reference detected
    }
    
    if (!currentParent.parentId) break
    
    currentParent = await prisma.documentFolder.findFirst({
      where: { id: currentParent.parentId },
      select: { id: true, parentId: true }
    })
  }

  return false
}

async function validateFolderMove(folderId: string, newParentId: string | undefined, organizationId: string) {
  if (!newParentId) return null

  // Check if new parent exists
  const newParent = await validateParentFolder(newParentId, organizationId)
  if (!newParent) {
    throw new Error('Parent folder not found')
  }

  // Check for circular reference
  const hasCircularRef = await checkCircularReference(folderId, newParentId)
  if (hasCircularRef) {
    throw new Error('Cannot move folder into itself or its descendants')
  }

  return newParent
}


async function checkNameConflict(
  organizationId: string,
  name: string,
  parentId: string | null,
  excludeId: string
): Promise<NextResponse | null> {
  const conflictingFolder = await prisma.documentFolder.findFirst({
    where: {
      organizationId,
      name,
      parentId,
      id: { not: excludeId }
    }
  })

  if (conflictingFolder) {
    return createErrorResponse('FOLDER_EXISTS', 'A folder with this name already exists in the same location', 409)
  }
  return null
}

async function validateFolderDeletion(folder: { _count: { children: number; documents: number } }): Promise<NextResponse | null> {
  if (folder._count.children > 0) {
    return createErrorResponse('FOLDER_NOT_EMPTY', 'Cannot delete folder that contains subfolders', 400)
  }

  if (folder._count.documents > 0) {
    return createErrorResponse('FOLDER_NOT_EMPTY', 'Cannot delete folder that contains documents', 400)
  }

  return null
}

async function updateFolderData(
  id: string,
  updateData: { name?: string; description?: string; parentId?: string },
  newPath: string
) {
  return prisma.documentFolder.update({
    where: { id },
    data: {
      ...updateData,
      path: newPath
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
      _count: {
        select: {
          documents: true,
          children: true
        }
      }
    }
  })
}

function handlePatchError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.errors)
  }

  if (error instanceof Error) {
    if (error.message === 'Parent folder not found') {
      return createErrorResponse('PARENT_FOLDER_NOT_FOUND', 'Parent folder not found', 400)
    }

    if (error.message === 'Cannot move folder into itself or its descendants') {
      return createErrorResponse('INVALID_MOVE', 'Cannot move folder into itself or its descendants', 400)
    }
  }

  return createErrorResponse('UPDATE_FAILED', 'Failed to update folder', 500)
}

async function validateFolderUpdateMove(
  id: string,
  updateData: { parentId?: string },
  existingFolder: { parentId: string | null },
  organizationId: string
) {
  if (updateData.parentId !== undefined && updateData.parentId !== existingFolder.parentId) {
    return validateFolderMove(id, updateData.parentId, organizationId)
  }
  return null
}

async function validateFolderUpdateName(
  id: string,
  updateData: { name?: string; parentId?: string },
  existingFolder: { name: string; parentId: string | null },
  organizationId: string
): Promise<NextResponse | null> {
  if (updateData.name && updateData.name !== existingFolder.name) {
    return checkNameConflict(
      organizationId,
      updateData.name,
      updateData.parentId !== undefined ? updateData.parentId : existingFolder.parentId,
      id
    )
  }
  return null
}

function calculateNewPath(
  updateData: { name?: string; parentId?: string },
  existingFolder: { name: string; path: string; parent?: { path: string } | null },
  newParent: { path: string } | null
): string {
  if (updateData.name || newParent !== null) {
    const folderName = updateData.name || existingFolder.name
    const parentPath = newParent?.path || (updateData.parentId === null ? null : existingFolder.parent?.path)
    return buildFolderPath(parentPath, folderName)
  }
  return existingFolder.path
}

async function processFolderUpdate(
  id: string,
  updateData: { name?: string; description?: string; parentId?: string },
  existingFolder: { name: string; parentId: string | null; path: string; parent?: { path: string } | null },
  organizationId: string
): Promise<{ folder: unknown; pathChanged: boolean } | NextResponse> {
  // Validate folder move
  const newParent = await validateFolderUpdateMove(id, updateData, existingFolder, organizationId)

  // Check for name conflicts
  const nameError = await validateFolderUpdateName(id, updateData, existingFolder, organizationId)
  if (nameError) {
    return nameError
  }

  // Calculate new path
  const newPath = calculateNewPath(updateData, existingFolder, newParent)

  // Update folder
  const folder = await updateFolderData(id, updateData, newPath)
  const pathChanged = newPath !== existingFolder.path

  return { folder, pathChanged }
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
    const folder = await findFolder(id, user.orgId)

    if (!folder) {
      return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
    }

    return createSuccessResponse({ folder })
  } catch {
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch folder', 500)
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
    const updateData = folderUpdateSchema.parse(body)

    // Check if folder exists
    const existingFolder = await findFolder(id, user.orgId)
    if (!existingFolder) {
      return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
    }

    // Process the folder update
    const result = await processFolderUpdate(id, updateData, existingFolder, user.orgId)
    
    // Check if result is an error response
    if (result instanceof NextResponse) {
      return result
    }

    const { folder, pathChanged } = result

    // Update children paths if path changed
    if (pathChanged) {
      await updateChildrenPaths(id, (folder as { path: string }).path)
    }

    return createSuccessResponse({ folder })
  } catch (error) {
    return handlePatchError(error)
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
    // Check if folder exists
    const existingFolder = await findFolder(id, user.orgId)
    if (!existingFolder) {
      return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
    }

    // Validate folder can be deleted
    const validationError = await validateFolderDeletion(existingFolder)
    if (validationError) {
      return validationError
    }

    // Delete the folder
    await prisma.documentFolder.delete({
      where: { id }
    })

    return createSuccessResponse({ message: 'Folder deleted successfully' })
  } catch {
    return createErrorResponse('DELETE_FAILED', 'Failed to delete folder', 500)
  }
}