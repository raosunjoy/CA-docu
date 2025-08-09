import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import type {
  Document,
  DocumentFolder,
  UploadDocumentRequest,
  UploadDocumentResponse,
  DocumentSearchRequest,
  DocumentSearchResponse,
  CreateFolderRequest,
  ShareDocumentRequest,
  DocumentVersionInfo,
  BulkOperationRequest,
  BulkOperationResponse,
  DocumentAnalytics,
  DocumentType,
  DocumentCategory,
  DocumentStatus,
  EncryptionStatus
} from '@/types/document'

const prisma = new PrismaClient()

export class DocumentService {
  private readonly uploadPath = process.env.DOCUMENT_UPLOAD_PATH || './uploads'
  private readonly maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB default
  private readonly allowedTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ])

  /**
   * Initialize upload directory
   */
  async initializeUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadPath)
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true })
    }
  }

  /**
   * Upload a new document with versioning support
   */
  async uploadDocument(
    file: Buffer,
    fileName: string,
    mimeType: string,
    request: UploadDocumentRequest,
    organizationId: string,
    userId: string
  ): Promise<UploadDocumentResponse> {
    try {
      await this.initializeUploadDirectory()

      // Validate file
      this.validateFile(file, fileName, mimeType)

      // Generate file checksum for deduplication
      const checksum = this.generateChecksum(file)
      
      // Check for existing file with same checksum
      const existingDocument = await this.findDocumentByChecksum(checksum, organizationId)
      if (existingDocument && !request.name) {
        return {
          document: existingDocument,
          processingStatus: {
            virusScan: 'CLEAN',
            ocr: existingDocument.ocrStatus || 'PENDING',
            indexing: existingDocument.indexStatus || 'PENDING',
            thumbnailGeneration: 'COMPLETED'
          }
        }
      }

      // Generate unique file path
      const fileExtension = path.extname(fileName)
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`
      const filePath = path.join(this.uploadPath, uniqueFileName)

      // Save file to disk
      await fs.writeFile(filePath, file)

      // Get document type from mime type
      const documentType = this.getDocumentTypeFromMimeType(mimeType)

      // Create document record
      const document = await prisma.document.create({
        data: {
          organizationId,
          name: request.name || fileName,
          originalName: fileName,
          description: request.description,
          filePath,
          fileSize: file.length,
          mimeType,
          checksum,
          type: documentType,
          status: 'ACTIVE',
          version: 1,
          folderId: request.folderId,
          uploadedBy: userId,
          uploadedAt: new Date(),
          extractedText: null,
          metadata: {
            uploadedVia: 'WEB',
            category: request.category,
            tags: request.tags || [],
            clientId: request.clientId,
            taskId: request.taskId,
            complianceYear: request.complianceYear,
            regulatoryForm: request.regulatoryForm,
            isConfidential: request.isConfidential || false,
            retentionPeriod: request.retentionPeriod || 7,
            expiryDate: request.expiryDate,
            customFields: request.customFields || {}
          },
          isDeleted: false
        },
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          folder: true
        }
      })

      // Create audit log entry
      await this.createAuditEntry(
        document.id,
        userId,
        'CREATED',
        { fileName, fileSize: file.length, mimeType }
      )

      // Start background processing
      const processingStatus = await this.startBackgroundProcessing(
        document.id,
        filePath,
        mimeType,
        request.autoOCR !== false,
        request.autoIndex !== false
      )

      const mappedDocument = this.mapDatabaseDocumentToDocument(document)

      return {
        document: mappedDocument,
        processingStatus
      }

    } catch (error) {
      console.error('Document upload error:', error)
      throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search documents with advanced filtering
   */
  async searchDocuments(
    request: DocumentSearchRequest,
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<DocumentSearchResponse> {
    try {
      const {
        query,
        folderId,
        type,
        category,
        tags,
        clientId,
        taskId,
        uploadedBy,
        dateFrom,
        dateTo,
        sizeMin,
        sizeMax,
        hasOCRText,
        isConfidential,
        status,
        sortBy = 'uploadedAt',
        sortOrder = 'DESC',
        page = 1,
        limit = 20,
        includeDeleted = false,
        facets = false
      } = request

      const startTime = Date.now()

      // Build where clause
      const whereClause: any = {
        organizationId,
        isDeleted: includeDeleted
      }

      // Apply role-based filtering
      if (userRole === 'INTERN' || userRole === 'ASSOCIATE') {
        whereClause.OR = [
          { uploadedBy: userId },
          { 
            shares: {
              some: {
                sharedWith: userId,
                expiresAt: { gte: new Date() }
              }
            }
          },
          {
            folder: {
              permissions: {
                some: {
                  userId: userId,
                  permissions: { has: 'VIEW' }
                }
              }
            }
          }
        ]
      }

      // Apply filters
      if (folderId) {
        whereClause.folderId = folderId
      }

      if (type?.length) {
        whereClause.type = { in: type }
      }

      if (status?.length) {
        whereClause.status = { in: status }
      }

      if (uploadedBy?.length) {
        whereClause.uploadedBy = { in: uploadedBy }
      }

      if (dateFrom || dateTo) {
        whereClause.uploadedAt = {}
        if (dateFrom) {
          whereClause.uploadedAt.gte = dateFrom
        }
        if (dateTo) {
          whereClause.uploadedAt.lte = dateTo
        }
      }

      if (sizeMin !== undefined || sizeMax !== undefined) {
        whereClause.fileSize = {}
        if (sizeMin !== undefined) {
          whereClause.fileSize.gte = sizeMin
        }
        if (sizeMax !== undefined) {
          whereClause.fileSize.lte = sizeMax
        }
      }

      if (hasOCRText !== undefined) {
        if (hasOCRText) {
          whereClause.extractedText = { not: null }
        } else {
          whereClause.extractedText = null
        }
      }

      // Metadata filters
      if (category?.length) {
        whereClause.metadata = {
          path: ['category'],
          in: category
        }
      }

      if (tags?.length) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['tags'],
          array_contains: tags
        }
      }

      if (clientId) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['clientId'],
          equals: clientId
        }
      }

      if (taskId) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['taskId'],
          equals: taskId
        }
      }

      if (isConfidential !== undefined) {
        whereClause.metadata = {
          ...whereClause.metadata,
          path: ['isConfidential'],
          equals: isConfidential
        }
      }

      // Text search
      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { originalName: { contains: query, mode: 'insensitive' } },
          { extractedText: { contains: query, mode: 'insensitive' } }
        ]
      }

      // Get total count
      const totalCount = await prisma.document.count({ where: whereClause })

      // Get documents
      const documents = await prisma.document.findMany({
        where: whereClause,
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          folder: {
            select: {
              id: true,
              name: true,
              path: true
            }
          },
          shares: {
            where: {
              OR: [
                { expiresAt: null },
                { expiresAt: { gte: new Date() } }
              ]
            },
            include: {
              sharedByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          comments: {
            where: { status: 'ACTIVE' },
            take: 3,
            orderBy: { createdAt: 'desc' },
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
        orderBy: this.getSortOrder(sortBy, sortOrder),
        skip: (page - 1) * limit,
        take: limit
      })

      // Get facets if requested
      let documentFacets
      if (facets) {
        documentFacets = await this.getSearchFacets(whereClause)
      }

      const mappedDocuments = documents.map(doc => this.mapDatabaseDocumentToDocument(doc))
      const searchTime = Date.now() - startTime

      return {
        documents: mappedDocuments,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
        facets: documentFacets,
        searchTime
      }

    } catch (error) {
      console.error('Document search error:', error)
      throw new Error(`Document search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create a new document version
   */
  async createVersion(
    documentId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    changes: string,
    organizationId: string,
    userId: string
  ): Promise<Document> {
    try {
      // Get current document
      const currentDocument = await prisma.document.findUnique({
        where: { id: documentId, organizationId }
      })

      if (!currentDocument) {
        throw new Error('Document not found')
      }

      // Check permissions
      const hasEditPermission = await this.checkDocumentPermission(
        documentId,
        userId,
        ['EDIT'],
        organizationId
      )

      if (!hasEditPermission) {
        throw new Error('Insufficient permissions to create version')
      }

      // Validate file
      this.validateFile(file, fileName, mimeType)

      // Generate checksum
      const checksum = this.generateChecksum(file)

      // Generate unique file path
      const fileExtension = path.extname(fileName)
      const uniqueFileName = `${Date.now()}_v${currentDocument.version + 1}_${Math.random().toString(36).substr(2, 9)}${fileExtension}`
      const filePath = path.join(this.uploadPath, uniqueFileName)

      // Save file
      await fs.writeFile(filePath, file)

      // Create new version
      const newVersion = await prisma.document.create({
        data: {
          organizationId,
          name: currentDocument.name,
          originalName: fileName,
          description: currentDocument.description,
          filePath,
          fileSize: file.length,
          mimeType,
          checksum,
          type: currentDocument.type,
          status: currentDocument.status,
          version: currentDocument.version + 1,
          parentDocumentId: currentDocument.parentDocumentId || currentDocument.id,
          folderId: currentDocument.folderId,
          uploadedBy: userId,
          uploadedAt: new Date(),
          metadata: {
            ...currentDocument.metadata,
            versionChanges: changes,
            previousVersion: currentDocument.version
          }
        },
        include: {
          uploader: true,
          folder: true
        }
      })

      // Update parent document status if needed
      if (currentDocument.parentDocumentId === null) {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: 'ARCHIVED' }
        })
      }

      // Create audit entry
      await this.createAuditEntry(
        newVersion.id,
        userId,
        'CREATED',
        { 
          type: 'VERSION_CREATED',
          previousVersion: currentDocument.version,
          newVersion: newVersion.version,
          changes
        }
      )

      return this.mapDatabaseDocumentToDocument(newVersion)

    } catch (error) {
      console.error('Document version creation error:', error)
      throw new Error(`Failed to create document version: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get document version history
   */
  async getVersionHistory(
    documentId: string,
    organizationId: string,
    userId: string
  ): Promise<DocumentVersionInfo[]> {
    try {
      // Get all versions of the document
      const document = await prisma.document.findUnique({
        where: { id: documentId, organizationId }
      })

      if (!document) {
        throw new Error('Document not found')
      }

      const parentId = document.parentDocumentId || document.id

      const versions = await prisma.document.findMany({
        where: {
          OR: [
            { id: parentId },
            { parentDocumentId: parentId }
          ],
          organizationId
        },
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { version: 'desc' }
      })

      return versions.map(version => ({
        id: version.id,
        version: version.version,
        createdAt: version.uploadedAt,
        createdBy: version.uploadedBy,
        fileSize: version.fileSize,
        checksum: version.checksum || '',
        changes: (version.metadata as any)?.versionChanges,
        isLatest: version.version === Math.max(...versions.map(v => v.version)),
        filePath: version.filePath
      }))

    } catch (error) {
      console.error('Version history error:', error)
      throw new Error(`Failed to get version history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Share document with users
   */
  async shareDocument(
    request: ShareDocumentRequest,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if user can share the document
      const hasSharePermission = await this.checkDocumentPermission(
        request.documentId,
        userId,
        ['SHARE'],
        organizationId
      )

      if (!hasSharePermission) {
        throw new Error('Insufficient permissions to share document')
      }

      // Create shares
      for (const shareTarget of request.shareWith) {
        const shareData: any = {
          documentId: request.documentId,
          sharedBy: userId,
          shareType: shareTarget.userId ? 'USER' : shareTarget.roleId ? 'ROLE' : 'PUBLIC',
          permissions: request.permissions,
          expiresAt: request.expiresAt,
          message: request.message,
          requiresLogin: request.requiresLogin !== false,
          allowDownload: request.allowDownload !== false,
          allowPrint: request.allowPrint !== false,
          accessCount: 0
        }

        if (shareTarget.userId) {
          shareData.sharedWith = shareTarget.userId
        } else if (shareTarget.email) {
          // Handle email sharing (would need user lookup or guest access)
          const existingUser = await prisma.user.findUnique({
            where: { email: shareTarget.email }
          })
          if (existingUser) {
            shareData.sharedWith = existingUser.id
          } else {
            // Create guest share or send invitation
            continue
          }
        } else if (shareTarget.roleId) {
          shareData.sharedWith = shareTarget.roleId
        }

        await prisma.documentShare.create({
          data: shareData
        })

        // Send notification if requested
        if (request.notifyUsers && shareTarget.userId) {
          // Implementation for notification service
        }
      }

      // Create audit entry
      await this.createAuditEntry(
        request.documentId,
        userId,
        'SHARED',
        { 
          sharedWith: request.shareWith.map(s => s.userId || s.email || s.roleId),
          permissions: request.permissions 
        }
      )

    } catch (error) {
      console.error('Document sharing error:', error)
      throw new Error(`Failed to share document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Bulk operations on documents
   */
  async bulkOperation(
    request: BulkOperationRequest,
    organizationId: string,
    userId: string
  ): Promise<BulkOperationResponse> {
    const result: BulkOperationResponse = {
      successful: [],
      failed: [],
      summary: {
        total: request.documentIds.length,
        successful: 0,
        failed: 0
      }
    }

    try {
      for (const documentId of request.documentIds) {
        try {
          // Check permissions for each document
          let requiredPermissions: string[] = []
          switch (request.operation) {
            case 'DELETE':
              requiredPermissions = ['DELETE']
              break
            case 'MOVE':
            case 'COPY':
              requiredPermissions = ['EDIT']
              break
            case 'SHARE':
              requiredPermissions = ['SHARE']
              break
            case 'TAG':
            case 'UNTAG':
              requiredPermissions = ['EDIT']
              break
          }

          const hasPermission = await this.checkDocumentPermission(
            documentId,
            userId,
            requiredPermissions,
            organizationId
          )

          if (!hasPermission) {
            result.failed.push({
              documentId,
              error: 'Insufficient permissions'
            })
            continue
          }

          // Execute operation
          switch (request.operation) {
            case 'DELETE':
              await this.deleteDocument(documentId, userId, organizationId)
              break
            case 'MOVE':
              await this.moveDocument(documentId, request.parameters?.targetFolderId, userId, organizationId)
              break
            case 'TAG':
              await this.addTagsToDocument(documentId, request.parameters?.tags || [], organizationId)
              break
            case 'UNTAG':
              await this.removeTagsFromDocument(documentId, request.parameters?.tags || [], organizationId)
              break
            // Add other operations as needed
          }

          result.successful.push(documentId)

        } catch (error) {
          result.failed.push({
            documentId,
            error: error instanceof Error ? error.message : 'Operation failed'
          })
        }
      }

      result.summary.successful = result.successful.length
      result.summary.failed = result.failed.length

      return result

    } catch (error) {
      console.error('Bulk operation error:', error)
      throw new Error(`Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get document analytics
   */
  async getDocumentAnalytics(
    organizationId: string,
    userId: string,
    userRole: string
  ): Promise<DocumentAnalytics> {
    try {
      const whereClause: any = { organizationId, isDeleted: false }

      // Apply role-based filtering
      if (userRole === 'INTERN' || userRole === 'ASSOCIATE') {
        whereClause.OR = [
          { uploadedBy: userId },
          { 
            shares: {
              some: { sharedWith: userId }
            }
          }
        ]
      }

      // Get basic metrics
      const [totalDocuments, totalSizeResult] = await Promise.all([
        prisma.document.count({ where: whereClause }),
        prisma.document.aggregate({
          where: whereClause,
          _sum: { fileSize: true }
        })
      ])

      const totalSize = totalSizeResult._sum.fileSize || 0

      // Get distributions
      const [typeDistribution, statusDistribution] = await Promise.all([
        this.getDocumentTypeDistribution(whereClause),
        this.getDocumentStatusDistribution(whereClause)
      ])

      // Get category distribution from metadata
      const categoryDistribution = await this.getDocumentCategoryDistribution(whereClause)

      // Get recent uploads
      const recentUploads = await prisma.document.findMany({
        where: whereClause,
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        take: 10
      })

      // Get most viewed (based on access logs)
      const mostViewed = await this.getMostViewedDocuments(whereClause)

      // Get largest files
      const largestFiles = await prisma.document.findMany({
        where: whereClause,
        include: {
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { fileSize: 'desc' },
        take: 10
      })

      return {
        totalDocuments,
        totalSize,
        documentsByType: typeDistribution,
        documentsByCategory: categoryDistribution,
        documentsByStatus: statusDistribution,
        recentUploads: recentUploads.map(doc => this.mapDatabaseDocumentToDocument(doc)),
        mostViewed: mostViewed.map(doc => this.mapDatabaseDocumentToDocument(doc)),
        largestFiles: largestFiles.map(doc => this.mapDatabaseDocumentToDocument(doc)),
        storageByFolder: await this.getStorageByFolder(whereClause),
        uploadTrends: await this.getUploadTrends(whereClause),
        userActivity: await this.getUserActivity(whereClause)
      }

    } catch (error) {
      console.error('Document analytics error:', error)
      throw new Error(`Failed to get document analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Private helper methods
  private validateFile(file: Buffer, fileName: string, mimeType: string): void {
    if (file.length === 0) {
      throw new Error('File is empty')
    }

    if (file.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`)
    }

    if (!this.allowedTypes.has(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`)
    }

    // Additional security checks
    const fileExtension = path.extname(fileName).toLowerCase()
    const executableExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js']
    if (executableExtensions.includes(fileExtension)) {
      throw new Error('Executable files are not allowed')
    }
  }

  private generateChecksum(file: Buffer): string {
    return createHash('sha256').update(file).digest('hex')
  }

  private async findDocumentByChecksum(checksum: string, organizationId: string): Promise<Document | null> {
    const document = await prisma.document.findFirst({
      where: { checksum, organizationId, isDeleted: false },
      include: {
        uploader: true,
        folder: true
      }
    })

    return document ? this.mapDatabaseDocumentToDocument(document) : null
  }

  private getDocumentTypeFromMimeType(mimeType: string): DocumentType {
    const typeMapping: Record<string, DocumentType> = {
      'application/pdf': 'PDF',
      'application/msword': 'CONTRACT',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'CONTRACT',
      'application/vnd.ms-excel': 'SPREADSHEET',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'SPREADSHEET',
      'application/vnd.ms-powerpoint': 'PRESENTATION',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PRESENTATION',
      'image/jpeg': 'IMAGE',
      'image/png': 'IMAGE',
      'image/gif': 'IMAGE',
      'text/plain': 'OTHER',
      'text/csv': 'SPREADSHEET'
    }

    return typeMapping[mimeType] || 'OTHER'
  }

  private async startBackgroundProcessing(
    documentId: string,
    filePath: string,
    mimeType: string,
    enableOCR: boolean,
    enableIndexing: boolean
  ) {
    // Start background processing (would be implemented with job queues)
    return {
      virusScan: 'PENDING' as const,
      ocr: enableOCR ? 'PENDING' as const : 'COMPLETED' as const,
      indexing: enableIndexing ? 'PENDING' as const : 'COMPLETED' as const,
      thumbnailGeneration: 'PENDING' as const
    }
  }

  private getSortOrder(sortBy: string, sortOrder: string) {
    const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc'
    
    switch (sortBy) {
      case 'name':
        return { name: order }
      case 'size':
        return { fileSize: order }
      case 'lastAccessedAt':
        return { lastAccessedAt: order }
      case 'uploadedAt':
      default:
        return { uploadedAt: order }
    }
  }

  private async checkDocumentPermission(
    documentId: string,
    userId: string,
    permissions: string[],
    organizationId: string
  ): Promise<boolean> {
    // Implementation would check various permission sources:
    // 1. Document owner
    // 2. Explicit document permissions
    // 3. Folder permissions
    // 4. Share permissions
    // 5. Role-based permissions
    
    const document = await prisma.document.findUnique({
      where: { id: documentId, organizationId }
    })

    if (!document) return false
    if (document.uploadedBy === userId) return true

    // Check shares
    const share = await prisma.documentShare.findFirst({
      where: {
        documentId,
        sharedWith: userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      }
    })

    if (share && permissions.every(p => share.permissions.includes(p))) {
      return true
    }

    return false
  }

  private async createAuditEntry(
    documentId: string,
    userId: string,
    action: string,
    details?: any
  ): Promise<void> {
    await prisma.documentAuditEntry.create({
      data: {
        documentId,
        userId,
        action: action as any,
        details: details as any,
        timestamp: new Date()
      }
    })
  }

  private mapDatabaseDocumentToDocument(dbDoc: any): Document {
    const metadata = dbDoc.metadata as any || {}
    
    return {
      id: dbDoc.id,
      name: dbDoc.name,
      originalName: dbDoc.originalName || dbDoc.name,
      description: dbDoc.description,
      filePath: dbDoc.filePath,
      localPath: dbDoc.localPath,
      cloudPath: dbDoc.cloudPath,
      thumbnailPath: dbDoc.thumbnailPath,
      fileSize: dbDoc.fileSize,
      mimeType: dbDoc.mimeType,
      checksum: dbDoc.checksum,
      type: dbDoc.type,
      status: dbDoc.status,
      version: dbDoc.version,
      parentDocumentId: dbDoc.parentDocumentId,
      folderId: dbDoc.folderId,
      uploadedBy: dbDoc.uploadedBy,
      uploadedAt: dbDoc.uploadedAt,
      lastAccessedAt: dbDoc.lastAccessedAt,
      extractedText: dbDoc.extractedText,
      metadata: {
        ...metadata,
        uploadedVia: metadata.uploadedVia || 'WEB',
        customFields: metadata.customFields || {}
      },
      isDeleted: dbDoc.isDeleted,
      createdAt: dbDoc.createdAt || dbDoc.uploadedAt,
      updatedAt: dbDoc.updatedAt,
      organizationId: dbDoc.organizationId,
      uploader: dbDoc.uploader,
      folder: dbDoc.folder,
      parentDocument: dbDoc.parentDocument,
      childVersions: dbDoc.childVersions || [],
      tags: metadata.tags || [],
      documentCategory: metadata.category || 'OTHER',
      clientId: metadata.clientId,
      taskId: metadata.taskId,
      complianceYear: metadata.complianceYear,
      regulatoryForm: metadata.regulatoryForm,
      isConfidential: metadata.isConfidential || false,
      retentionPeriod: metadata.retentionPeriod || 7,
      expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : undefined,
      shares: dbDoc.shares || [],
      comments: dbDoc.comments || [],
      reviewHistory: dbDoc.reviewHistory || [],
      encryptionStatus: 'NOT_ENCRYPTED',
      accessPermissions: [],
      auditLog: [],
      ocrStatus: dbDoc.ocrStatus,
      ocrText: dbDoc.ocrText,
      indexStatus: dbDoc.indexStatus,
      virusScanStatus: dbDoc.virusScanStatus
    }
  }

  // Additional helper methods would be implemented here
  private async getSearchFacets(whereClause: any) {
    // Implementation for search facets
    return undefined
  }

  private async getDocumentTypeDistribution(whereClause: any) {
    const types = await prisma.document.groupBy({
      by: ['type'],
      where: whereClause,
      _count: true
    })

    return types.reduce((acc, item) => {
      acc[item.type] = item._count
      return acc
    }, {} as Record<DocumentType, number>)
  }

  private async getDocumentStatusDistribution(whereClause: any) {
    const statuses = await prisma.document.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true
    })

    return statuses.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<DocumentStatus, number>)
  }

  private async getDocumentCategoryDistribution(whereClause: any) {
    // This would need custom query for metadata field
    return {} as Record<DocumentCategory, number>
  }

  private async getMostViewedDocuments(whereClause: any) {
    // This would be based on audit logs
    return []
  }

  private async getStorageByFolder(whereClause: any) {
    return []
  }

  private async getUploadTrends(whereClause: any) {
    return []
  }

  private async getUserActivity(whereClause: any) {
    return []
  }

  private async deleteDocument(documentId: string, userId: string, organizationId: string) {
    await prisma.document.update({
      where: { id: documentId, organizationId },
      data: { isDeleted: true }
    })
  }

  private async moveDocument(documentId: string, targetFolderId: string | undefined, userId: string, organizationId: string) {
    await prisma.document.update({
      where: { id: documentId, organizationId },
      data: { folderId: targetFolderId }
    })
  }

  private async addTagsToDocument(documentId: string, tags: string[], organizationId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId, organizationId }
    })

    if (document) {
      const metadata = document.metadata as any || {}
      const currentTags = metadata.tags || []
      const newTags = [...new Set([...currentTags, ...tags])]

      await prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: { ...metadata, tags: newTags }
        }
      })
    }
  }

  private async removeTagsFromDocument(documentId: string, tags: string[], organizationId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId, organizationId }
    })

    if (document) {
      const metadata = document.metadata as any || {}
      const currentTags = metadata.tags || []
      const newTags = currentTags.filter((tag: string) => !tags.includes(tag))

      await prisma.document.update({
        where: { id: documentId },
        data: {
          metadata: { ...metadata, tags: newTags }
        }
      })
    }
  }
}

export const documentService = new DocumentService()