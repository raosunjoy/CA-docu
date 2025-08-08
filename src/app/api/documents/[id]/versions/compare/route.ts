import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'

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

interface VersionComparison {
  version1: {
    id: string
    version: number
    name: string
    fileSize: number
    checksum: string
    uploadedAt: string
    uploader: {
      id: string
      firstName: string
      lastName: string
    }
  }
  version2: {
    id: string
    version: number
    name: string
    fileSize: number
    checksum: string
    uploadedAt: string
    uploader: {
      id: string
      firstName: string
      lastName: string
    }
  }
  differences: {
    sizeChange: number
    sizeChangePercent: number
    checksumMatch: boolean
    timeDifference: number
    uploaderChanged: boolean
  }
  textComparison?: {
    addedLines: number
    removedLines: number
    modifiedLines: number
    similarity: number
  }
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

async function validateDocumentAccess(documentId: string, organizationId: string, userId: string) {
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
    const hasViewPermission = document.folder.permissions.some(p => 
      p.permissions.includes('view')
    )
    
    if (!hasViewPermission && document.uploadedBy !== userId) {
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

async function getVersionsForComparison(documentId: string, version1Id: string, version2Id: string, organizationId: string) {
  const versions = await prisma.document.findMany({
    where: {
      id: { in: [version1Id, version2Id] },
      OR: [
        { id: documentId },
        { parentDocumentId: documentId }
      ],
      organizationId,
      isDeleted: false
    },
    include: {
      uploader: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  if (versions.length !== 2) {
    throw new Error('One or both versions not found')
  }

  const version1 = versions.find(v => v.id === version1Id)
  const version2 = versions.find(v => v.id === version2Id)

  if (!version1 || !version2) {
    throw new Error('Version mapping error')
  }

  return { version1, version2 }
}

function calculateBasicDifferences(version1: any, version2: any) {
  const sizeChange = version2.fileSize - version1.fileSize
  const sizeChangePercent = version1.fileSize > 0 ? (sizeChange / version1.fileSize) * 100 : 0
  const checksumMatch = version1.checksum === version2.checksum
  const timeDifference = new Date(version2.uploadedAt).getTime() - new Date(version1.uploadedAt).getTime()
  const uploaderChanged = version1.uploadedBy !== version2.uploadedBy

  return {
    sizeChange,
    sizeChangePercent,
    checksumMatch,
    timeDifference,
    uploaderChanged
  }
}

async function compareTextContent(version1: any, version2: any): Promise<{
  addedLines: number
  removedLines: number
  modifiedLines: number
  similarity: number
} | null> {
  try {
    // Only attempt text comparison for text-based files
    const textMimeTypes = [
      'text/plain',
      'application/json',
      'application/xml',
      'text/csv',
      'text/html',
      'text/css',
      'text/javascript'
    ]

    if (!textMimeTypes.includes(version1.mimeType) || !textMimeTypes.includes(version2.mimeType)) {
      return null
    }

    // Read file contents
    const file1Path = join(process.cwd(), version1.filePath.replace(/^\//, ''))
    const file2Path = join(process.cwd(), version2.filePath.replace(/^\//, ''))

    const [content1, content2] = await Promise.all([
      readFile(file1Path, 'utf-8'),
      readFile(file2Path, 'utf-8')
    ])

    // Simple line-by-line comparison
    const lines1 = content1.split('\n')
    const lines2 = content2.split('\n')

    let addedLines = 0
    let removedLines = 0
    let modifiedLines = 0

    // Basic diff algorithm (simplified)
    const maxLines = Math.max(lines1.length, lines2.length)
    const minLines = Math.min(lines1.length, lines2.length)

    // Count matching lines
    let matchingLines = 0
    for (let i = 0; i < minLines; i++) {
      if (lines1[i] === lines2[i]) {
        matchingLines++
      } else {
        modifiedLines++
      }
    }

    // Count added/removed lines
    if (lines2.length > lines1.length) {
      addedLines = lines2.length - lines1.length
    } else if (lines1.length > lines2.length) {
      removedLines = lines1.length - lines2.length
    }

    // Calculate similarity percentage
    const totalLines = Math.max(lines1.length, lines2.length)
    const similarity = totalLines > 0 ? (matchingLines / totalLines) * 100 : 100

    return {
      addedLines,
      removedLines,
      modifiedLines,
      similarity
    }
  } catch (error) {
    console.error('Text comparison failed:', error)
    return null
  }
}

async function generateVersionComparison(
  documentId: string,
  version1Id: string,
  version2Id: string,
  organizationId: string,
  includeTextComparison: boolean = false
): Promise<VersionComparison> {
  const { version1, version2 } = await getVersionsForComparison(documentId, version1Id, version2Id, organizationId)

  const differences = calculateBasicDifferences(version1, version2)

  let textComparison = null
  if (includeTextComparison) {
    textComparison = await compareTextContent(version1, version2)
  }

  return {
    version1: {
      id: version1.id,
      version: version1.version,
      name: version1.name,
      fileSize: version1.fileSize,
      checksum: version1.checksum,
      uploadedAt: version1.uploadedAt.toISOString(),
      uploader: version1.uploader
    },
    version2: {
      id: version2.id,
      version: version2.version,
      name: version2.name,
      fileSize: version2.fileSize,
      checksum: version2.checksum,
      uploadedAt: version2.uploadedAt.toISOString(),
      uploader: version2.uploader
    },
    differences,
    ...(textComparison && { textComparison })
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
    const documentId = id
  const { searchParams } = new URL(request.url)

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub)

    const version1Id = searchParams.get('version1')
    const version2Id = searchParams.get('version2')
    const includeTextComparison = searchParams.get('includeText') === 'true'

    if (!version1Id || !version2Id) {
      return createErrorResponse('MISSING_VERSIONS', 'Both version1 and version2 parameters are required', 400)
    }

    if (version1Id === version2Id) {
      return createErrorResponse('SAME_VERSIONS', 'Cannot compare a version with itself', 400)
    }

    const comparison = await generateVersionComparison(
      documentId,
      version1Id,
      version2Id,
      user.orgId,
      includeTextComparison
    )

    return createSuccessResponse({ comparison })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'One or both versions not found') {
        return createErrorResponse('VERSIONS_NOT_FOUND', 'One or both versions not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to compare document versions', 403)
      }
    }
    return createErrorResponse('COMPARISON_FAILED', 'Failed to compare document versions', 500)
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
    const documentId = id

  try {
    await validateDocumentAccess(documentId, user.orgId, user.sub)

    const body = await request.json()
    const { version1Id, version2Id, includeTextComparison = false } = body

    if (!version1Id || !version2Id) {
      return createErrorResponse('MISSING_VERSIONS', 'Both version1Id and version2Id are required', 400)
    }

    if (version1Id === version2Id) {
      return createErrorResponse('SAME_VERSIONS', 'Cannot compare a version with itself', 400)
    }

    const comparison = await generateVersionComparison(
      documentId,
      version1Id,
      version2Id,
      user.orgId,
      includeTextComparison
    )

    return createSuccessResponse({ comparison })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'One or both versions not found') {
        return createErrorResponse('VERSIONS_NOT_FOUND', 'One or both versions not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to compare document versions', 403)
      }
    }
    return createErrorResponse('COMPARISON_FAILED', 'Failed to compare document versions', 500)
  }
}