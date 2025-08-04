import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { DocumentType, DocumentStatus } from '@/types'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

const documentCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  folderId: z.string().optional(),
  type: z.nativeEnum(DocumentType).optional()
})

const documentQuerySchema = z.object({
  folderId: z.string().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
})

function validateDocumentQuery(searchParams: URLSearchParams) {
  const params = Object.fromEntries(searchParams.entries())
  return documentQuerySchema.parse(params)
}

interface DocumentWhere {
  organizationId: string
  isDeleted: boolean
  folderId?: string
  type?: DocumentType
  status?: DocumentStatus
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' }
    description?: { contains: string; mode: 'insensitive' }
    extractedText?: { contains: string; mode: 'insensitive' }
  }>
}

function buildDocumentFilters(query: z.infer<typeof documentQuerySchema>, organizationId: string): DocumentWhere {
  const where: DocumentWhere = {
    organizationId,
    isDeleted: false
  }

  if (query.folderId) {
    where.folderId = query.folderId
  }

  if (query.type) {
    where.type = query.type
  }

  if (query.status) {
    where.status = query.status
  }

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { extractedText: { contains: query.search, mode: 'insensitive' } }
    ]
  }

  return where
}

function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = randomBytes(8).toString('hex')
  const extension = originalName.split('.').pop()
  return `${timestamp}_${random}.${extension}`
}

async function saveUploadedFile(file: File, organizationId: string): Promise<{ filePath: string; fileSize: number }> {
  const fileName = generateUniqueFileName(file.name)
  const uploadDir = join(process.cwd(), 'uploads', organizationId)
  const filePath = join(uploadDir, fileName)
  
  // Ensure upload directory exists
  await mkdir(uploadDir, { recursive: true })
  
  // Save file
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filePath, buffer)
  
  return {
    filePath: `/uploads/${organizationId}/${fileName}`,
    fileSize: buffer.length
  }
}

function determineDocumentType(mimeType: string): DocumentType {
  if (mimeType.includes('pdf')) return DocumentType.PDF
  if (mimeType.includes('word') || mimeType.includes('document')) return DocumentType.WORD
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return DocumentType.EXCEL
  if (mimeType.includes('image')) return DocumentType.IMAGE
  return DocumentType.OTHER
}

interface ParsedMetadata {
  name?: string
  description?: string
  folderId?: string
  type?: DocumentType
}

async function validateUploadData(file: File, metadataJson: string | null): Promise<
  { parsedMetadata: ParsedMetadata } | { error: NextResponse }
> {
  // Validate file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 50MB'
          }
        },
        { status: 400 }
      )
    }
  }

  let parsedMetadata: ParsedMetadata = {}
  if (metadataJson) {
    try {
      parsedMetadata = JSON.parse(metadataJson)
      documentCreateSchema.parse(parsedMetadata)
    } catch {
      return {
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_METADATA',
              message: 'Invalid metadata format'
            }
          },
          { status: 400 }
        )
      }
    }
  }

  return { parsedMetadata }
}

interface CreateDocumentParams {
  file: File
  filePath: string
  fileSize: number
  documentType: DocumentType
  metadata: ParsedMetadata
  userId: string
  organizationId: string
}

async function createDocumentRecord(params: CreateDocumentParams) {
  const { file, filePath, fileSize, documentType, metadata, userId, organizationId } = params
  
  return prisma.document.create({
    data: {
      organizationId,
      name: metadata.name || file.name,
      originalName: file.name,
      description: metadata.description || null,
      filePath,
      fileSize,
      mimeType: file.type,
      type: metadata.type || documentType,
      folderId: metadata.folderId || null,
      uploadedBy: userId,
      status: DocumentStatus.ACTIVE
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
      }
    }
  })
}

async function fetchDocumentsWithPagination(where: DocumentWhere, page: number, limit: number) {
  const skip = (page - 1) * limit

  return Promise.all([
    prisma.document.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.document.count({ where })
  ])
}

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const query = validateDocumentQuery(searchParams)
    const page = parseInt(query.page || '1')
    const limit = Math.min(parseInt(query.limit || '20'), 100)
    const where = buildDocumentFilters(query, user.orgId)

    const [documents, total] = await fetchDocumentsWithPagination(where, page, limit)

    return NextResponse.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid query parameters'
        }
      },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authMiddleware()(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { user } = authResult

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadataJson = formData.get('metadata') as string

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'File is required'
          }
        },
        { status: 400 }
      )
    }

    const validationResult = await validateUploadData(file, metadataJson)
    if ('error' in validationResult) {
      return validationResult.error
    }

    const { parsedMetadata } = validationResult
    const { filePath, fileSize } = await saveUploadedFile(file, user.orgId)
    const documentType = determineDocumentType(file.type)

    const document = await createDocumentRecord({
      file,
      filePath,
      fileSize,
      documentType,
      metadata: parsedMetadata,
      userId: user.sub,
      organizationId: user.orgId
    })

    return NextResponse.json({
      success: true,
      data: { document }
    }, { status: 201 })

  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload document'
        }
      },
      { status: 500 }
    )
  }
}