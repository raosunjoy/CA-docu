import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { UserRole } from '@/types'
import { z } from 'zod'

const permissionSchema = z.object({
  userId: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  permissions: z.array(z.enum(['view', 'upload', 'edit', 'delete', 'share'])).min(1)
}).refine(data => data.userId || data.role, {
  message: "Either userId or role must be provided"
})

const bulkPermissionSchema = z.object({
  permissions: z.array(permissionSchema)
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

async function validateFolderAccess(folderId: string, organizationId: string, userId: string) {
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

  // Check if user has permission to manage folder permissions
  const hasManagePermission = folder.permissions.some(p => 
    p.permissions.includes('edit') || p.permissions.includes('delete')
  )

  if (!hasManagePermission && folder.createdBy !== userId) {
    throw new Error('Insufficient permissions')
  }

  return folder
}

async function getUserRoles(userId: string): Promise<UserRole[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  })
  return user ? [user.role] : []
}

async function validatePermissionUsers(permissions: z.infer<typeof permissionSchema>[], organizationId: string) {
  const userIds = permissions.filter(p => p.userId).map(p => p.userId!)
  
  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        organizationId
      },
      select: { id: true }
    })

    const foundUserIds = users.map(u => u.id)
    const missingUsers = userIds.filter(id => !foundUserIds.includes(id))
    
    if (missingUsers.length > 0) {
      throw new Error(`Users not found: ${missingUsers.join(', ')}`)
    }
  }
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
    await validateFolderAccess(folderId, user.orgId, user.sub)

    const permissions = await prisma.folderPermission.findMany({
      where: { folderId },
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
      },
      orderBy: [
        { role: 'asc' },
        { user: { firstName: 'asc' } }
      ]
    })

    return createSuccessResponse({ permissions })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to view folder permissions', 403)
      }
    }
    return createErrorResponse('FETCH_FAILED', 'Failed to fetch folder permissions', 500)
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
    const folderId = id

  try {
    const body = await request.json()
    const permissionData = permissionSchema.parse(body)

    await validateFolderAccess(folderId, user.orgId, user.sub)
    await validatePermissionUsers([permissionData], user.orgId)

    // Check for existing permission
    const existingPermission = await prisma.folderPermission.findFirst({
      where: {
        folderId,
        ...(permissionData.userId ? { userId: permissionData.userId } : { role: permissionData.role })
      }
    })

    if (existingPermission) {
      return createErrorResponse('PERMISSION_EXISTS', 'Permission already exists for this user/role', 409)
    }

    const permission = await prisma.folderPermission.create({
      data: {
        folderId,
        userId: permissionData.userId || null,
        role: permissionData.role || null,
        permissions: permissionData.permissions
      },
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
    })

    return createSuccessResponse({ permission }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid permission data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to manage folder permissions', 403)
      }
      if (error.message.startsWith('Users not found:')) {
        return createErrorResponse('USERS_NOT_FOUND', error.message, 400)
      }
    }
    return createErrorResponse('CREATE_FAILED', 'Failed to create folder permission', 500)
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
    const bulkData = bulkPermissionSchema.parse(body)

    await validateFolderAccess(folderId, user.orgId, user.sub)
    await validatePermissionUsers(bulkData.permissions, user.orgId)

    // Delete existing permissions and create new ones in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.folderPermission.deleteMany({
        where: { folderId }
      })

      // Create new permissions
      const permissions = await Promise.all(
        bulkData.permissions.map(permData =>
          tx.folderPermission.create({
            data: {
              folderId,
              userId: permData.userId || null,
              role: permData.role || null,
              permissions: permData.permissions
            },
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
          })
        )
      )

      return permissions
    })

    return createSuccessResponse({ permissions: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('VALIDATION_ERROR', 'Invalid bulk permission data', 400, error.issues)
    }
    if (error instanceof Error) {
      if (error.message === 'Folder not found') {
        return createErrorResponse('FOLDER_NOT_FOUND', 'Folder not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to manage folder permissions', 403)
      }
      if (error.message.startsWith('Users not found:')) {
        return createErrorResponse('USERS_NOT_FOUND', error.message, 400)
      }
    }
    return createErrorResponse('UPDATE_FAILED', 'Failed to update folder permissions', 500)
  }
}