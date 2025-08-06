import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { readFile } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'

interface PreviewOptions {
  page?: number
  width?: number
  height?: number
  quality?: number
  format?: 'png' | 'jpeg' | 'webp'
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
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

async function generateImagePreview(
  filePath: string, 
  options: PreviewOptions
): Promise<{ buffer: Buffer; contentType: string }> {
  const { width = 800, height = 600, quality = 80, format = 'jpeg' } = options
  
  const fullPath = join(process.cwd(), filePath.replace(/^\//, ''))
  const imageBuffer = await readFile(fullPath)
  
  const processedBuffer = await sharp(imageBuffer)
    .resize(width, height, { 
      fit: 'inside',
      withoutEnlargement: true 
    })
    .toFormat(format, { quality })
    .toBuffer()

  return {
    buffer: processedBuffer,
    contentType: `image/${format}`
  }
}

async function generatePDFPreview(
  filePath: string, 
  options: PreviewOptions
): Promise<{ buffer: Buffer; contentType: string }> {
  // This is a placeholder implementation
  // In a real implementation, you would use a library like pdf-poppler or pdf2pic
  // to convert PDF pages to images
  
  const { page = 1, width = 800, height = 600, format = 'png' } = options
  
  try {
    // For now, return a placeholder image
    const placeholderBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .png()
    .composite([{
      input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="24" fill="#666">
            PDF Preview - Page ${page}
          </text>
          <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="#999">
            PDF preview generation not yet implemented
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .toBuffer()

    return {
      buffer: placeholderBuffer,
      contentType: 'image/png'
    }
  } catch (error) {
    throw new Error('Failed to generate PDF preview')
  }
}

async function generateOfficePreview(
  filePath: string, 
  mimeType: string,
  options: PreviewOptions
): Promise<{ buffer: Buffer; contentType: string }> {
  // This is a placeholder implementation
  // In a real implementation, you would use a service like LibreOffice headless mode
  // or a cloud service to convert Office documents to images
  
  const { width = 800, height = 600 } = options
  
  const docType = mimeType.includes('word') ? 'Word Document' :
                  mimeType.includes('excel') ? 'Excel Spreadsheet' :
                  mimeType.includes('powerpoint') ? 'PowerPoint Presentation' :
                  'Office Document'

  try {
    const placeholderBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 245, g: 245, b: 245 }
      }
    })
    .png()
    .composite([{
      input: Buffer.from(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f5f5f5"/>
          <rect x="50" y="50" width="${width - 100}" height="${height - 100}" fill="white" stroke="#ddd"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="24" fill="#666">
            ${docType} Preview
          </text>
          <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14" fill="#999">
            Office document preview generation not yet implemented
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .toBuffer()

    return {
      buffer: placeholderBuffer,
      contentType: 'image/png'
    }
  } catch (error) {
    throw new Error('Failed to generate Office document preview')
  }
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
    const document = await validateDocumentAccess(documentId, user.orgId, user.sub)

    // Parse preview options
    const options: PreviewOptions = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      width: searchParams.get('width') ? parseInt(searchParams.get('width')!) : 800,
      height: searchParams.get('height') ? parseInt(searchParams.get('height')!) : 600,
      quality: searchParams.get('quality') ? parseInt(searchParams.get('quality')!) : 80,
      format: (searchParams.get('format') as 'png' | 'jpeg' | 'webp') || 'jpeg'
    }

    // Validate options
    if (options.width && (options.width < 100 || options.width > 2000)) {
      return createErrorResponse('INVALID_WIDTH', 'Width must be between 100 and 2000 pixels', 400)
    }

    if (options.height && (options.height < 100 || options.height > 2000)) {
      return createErrorResponse('INVALID_HEIGHT', 'Height must be between 100 and 2000 pixels', 400)
    }

    if (options.quality && (options.quality < 10 || options.quality > 100)) {
      return createErrorResponse('INVALID_QUALITY', 'Quality must be between 10 and 100', 400)
    }

    let previewResult: { buffer: Buffer; contentType: string }

    // Generate preview based on document type
    if (document.mimeType.startsWith('image/')) {
      previewResult = await generateImagePreview(document.filePath, options)
    } else if (document.mimeType === 'application/pdf') {
      previewResult = await generatePDFPreview(document.filePath, options)
    } else if (
      document.mimeType.includes('word') ||
      document.mimeType.includes('excel') ||
      document.mimeType.includes('powerpoint') ||
      document.mimeType.includes('spreadsheet') ||
      document.mimeType.includes('presentation')
    ) {
      previewResult = await generateOfficePreview(document.filePath, document.mimeType, options)
    } else {
      return createErrorResponse('UNSUPPORTED_FORMAT', 'Preview not supported for this file type', 400)
    }

    // Update last accessed timestamp
    await prisma.document.update({
      where: { id: documentId },
      data: { lastAccessedAt: new Date() }
    })

    // Return the preview image
    return new NextResponse(previewResult.buffer, {
      headers: {
        'Content-Type': previewResult.contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': previewResult.buffer.length.toString()
      }
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Document not found') {
        return createErrorResponse('DOCUMENT_NOT_FOUND', 'Document not found', 404)
      }
      if (error.message === 'Insufficient permissions') {
        return createErrorResponse('INSUFFICIENT_PERMISSIONS', 'Insufficient permissions to preview document', 403)
      }
      if (error.message.includes('Failed to generate')) {
        return createErrorResponse('PREVIEW_GENERATION_FAILED', error.message, 500)
      }
    }
    return createErrorResponse('PREVIEW_FAILED', 'Failed to generate document preview', 500)
  }
}