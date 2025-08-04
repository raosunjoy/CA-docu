import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { z } from 'zod'

interface FolderWithCount {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
  creator: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count: {
    documents: number
    children: number
  }
}

interface FolderNode extends FolderWithCount {
  children: FolderNode[]
}

interface WhereClause {
  organizationId: string
  parentId?: string | null
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

const folderCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parentId: z.string().optional()
})

const folderQuerySchema = z.object({
  parentId: z.string().optional(),
  includeChildren: z.string().optional()
})

function buildFolderPath(parentPath: string | null, folderName: string): string {
  if (!parentPath) return folderName
  return `${parentPath}/${folderName}`
}

async function validateParentFolder(parentId: string, organizationId: string) {
  const parent = await prisma.documentFolder.findFirst({
    where: {
      id: parentId,
      organizationId
    }
  })
  
  if (!parent) {
    throw new Error('Parent folder not found')
  }
  
  return parent
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

async function buildFolderTree(folders: FolderWithCount[]): Promise<FolderNode[]> {
  const folderMap = new Map<string, FolderNode>()
  const rootFolders: FolderNode[] = []

  // Create folder map
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] })
  })

  // Build tree structure
  folders.forEach(folder => {
    const folderNode = folderMap.get(folder.id)
    if (folderNode) {
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId)
        if (parent) {
          parent.children.push(folderNode)
        }
      } else {
        rootFolders.push(folderNode)
      }
    }
  })

  return rootFolders
}

async function checkFolderNameConflict(
  organizationId: string,
  name: string,
  parentId: string | null
): Promise<NextResponse | null> {
  const existingFolder = await prisma.documentFolder.findFirst({
    where: {
      organizationId,
      name,
      parentId
    }
  })

  if (existingFolder) {
    return createErrorResponse('FOLDER_EXISTS', 'A folder with this name already exists in the same location', 409)
  }
  return null
}

function handlePostError(error: unknown): NextResponse {
  if (error instanceof z.ZodError) {
    return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', 400, error.errors)
  }

  if (error instanceof Error && error.message === 'Parent folder not found') {
    return createErrorResponse('PARENT_FOLDER_NOT_FOUND', 'Parent folder not found', 400)
  }

  return createErrorResponse('CREATE_FAILED', 'Failed to create folder', 500)
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const query = folderQuerySchema.parse(Object.fromEntries(searchParams.entries()))
    const includeChildren = query.includeChildren === 'true'

    const where: WhereClause = {
      organizationId: user.orgId
    }

    if (query.parentId) {
      where.parentId = query.parentId
    } else if (!includeChildren) {
      where.parentId = null // Only root folders
    }

    const folders = await prisma.documentFolder.findMany({
      where,
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
      },
      orderBy: { name: 'asc' }
    })

    let result: FolderWithCount[] | FolderNode[] = folders
    if (includeChildren && !query.parentId) {
      // Build complete folder tree
      result = await buildFolderTree(folders)
    }

    return createSuccessResponse({ folders: result })
  } catch {
    return createErrorResponse('INVALID_REQUEST', 'Invalid query parameters', 400)
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
    const folderData = folderCreateSchema.parse(body)

    let parentFolder = null
    let folderPath = folderData.name

    // Validate parent folder if provided
    if (folderData.parentId) {
      parentFolder = await validateParentFolder(folderData.parentId, user.orgId)
      folderPath = buildFolderPath(parentFolder.path, folderData.name)
    }

    // Check for duplicate folder names in the same parent
    const nameError = await checkFolderNameConflict(
      user.orgId,
      folderData.name,
      folderData.parentId || null
    )
    if (nameError) {
      return nameError
    }

    const folder = await prisma.documentFolder.create({
      data: {
        organizationId: user.orgId,
        name: folderData.name,
        description: folderData.description,
        parentId: folderData.parentId,
        path: folderPath,
        createdBy: user.sub
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

    return createSuccessResponse({ folder }, 201)

  } catch (error) {
    return handlePostError(error)
  }
}