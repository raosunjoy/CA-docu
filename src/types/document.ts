export interface Document {
  id: string
  name: string
  originalName: string
  description?: string
  filePath: string
  localPath?: string
  cloudPath?: string
  thumbnailPath?: string
  fileSize: number
  mimeType: string
  checksum?: string
  type: DocumentType
  status: DocumentStatus
  version: number
  parentDocumentId?: string
  folderId?: string
  uploadedBy: string
  uploadedAt: Date
  lastAccessedAt?: Date
  extractedText?: string
  metadata: DocumentMetadata
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
  
  // Relations
  organizationId: string
  uploader?: User
  folder?: DocumentFolder
  parentDocument?: Document
  childVersions?: Document[]
  tags: string[]
  
  // CA-specific fields
  documentCategory: DocumentCategory
  clientId?: string
  taskId?: string
  complianceYear?: number
  regulatoryForm?: string
  isConfidential: boolean
  retentionPeriod: number // in years
  expiryDate?: Date
  
  // Collaboration
  shares: DocumentShare[]
  comments: DocumentComment[]
  reviewHistory: DocumentReview[]
  
  // Security
  encryptionStatus: EncryptionStatus
  accessPermissions: DocumentPermission[]
  auditLog: DocumentAuditEntry[]
  
  // Processing status
  ocrStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  ocrText?: string
  indexStatus?: 'PENDING' | 'INDEXED' | 'FAILED'
  virusScanStatus?: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED'
}

export type DocumentType = 
  | 'CONTRACT'
  | 'INVOICE'
  | 'REPORT'
  | 'SPREADSHEET'
  | 'PRESENTATION'
  | 'PDF'
  | 'IMAGE'
  | 'ARCHIVE'
  | 'OTHER'

export type DocumentStatus = 
  | 'ACTIVE'
  | 'DRAFT'
  | 'LOCKED'
  | 'ARCHIVED'
  | 'DELETED'

export type DocumentCategory =
  | 'TAX_DOCUMENTS'
  | 'AUDIT_PAPERS'
  | 'COMPLIANCE_FORMS'
  | 'CLIENT_RECORDS'
  | 'FINANCIAL_STATEMENTS'
  | 'LEGAL_DOCUMENTS'
  | 'CORRESPONDENCE'
  | 'TEMPLATES'
  | 'WORKING_PAPERS'
  | 'CERTIFICATES'
  | 'AGREEMENTS'
  | 'OTHER'

export type EncryptionStatus =
  | 'NOT_ENCRYPTED'
  | 'ENCRYPTED'
  | 'ENCRYPTION_FAILED'

export interface DocumentMetadata {
  // File metadata
  width?: number
  height?: number
  pageCount?: number
  language?: string
  
  // CA-specific metadata
  financialYear?: string
  assessmentYear?: string
  clientName?: string
  panNumber?: string
  gstin?: string
  cin?: string
  formType?: string
  submissionDate?: Date
  approvalDate?: Date
  
  // Processing metadata
  uploadedVia: 'WEB' | 'EMAIL' | 'API' | 'MOBILE' | 'SYNC'
  originalDevice?: string
  ipAddress?: string
  userAgent?: string
  
  // Custom fields
  customFields: Record<string, any>
}

export interface DocumentFolder {
  id: string
  name: string
  description?: string
  parentId?: string
  organizationId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  
  // Hierarchy
  path: string
  level: number
  children?: DocumentFolder[]
  parent?: DocumentFolder
  
  // Contents
  documents?: Document[]
  documentCount: number
  totalSize: number
  
  // Permissions
  permissions: FolderPermission[]
  isPublic: boolean
  
  // CA-specific
  folderType: FolderType
  clientId?: string
  projectId?: string
  complianceYear?: number
  
  // Settings
  autoOCR: boolean
  autoIndex: boolean
  retentionPeriod: number
  isArchived: boolean
}

export type FolderType =
  | 'CLIENT_FOLDER'
  | 'PROJECT_FOLDER'
  | 'COMPLIANCE_FOLDER'
  | 'TEMPLATE_FOLDER'
  | 'ARCHIVE_FOLDER'
  | 'SHARED_FOLDER'
  | 'PERSONAL_FOLDER'

export interface DocumentShare {
  id: string
  documentId: string
  sharedBy: string
  sharedWith: string
  shareType: 'USER' | 'ROLE' | 'PUBLIC' | 'CLIENT'
  permissions: SharePermission[]
  expiresAt?: Date
  accessCount: number
  lastAccessedAt?: Date
  message?: string
  requiresLogin: boolean
  allowDownload: boolean
  allowPrint: boolean
  createdAt: Date
}

export type SharePermission = 
  | 'VIEW'
  | 'COMMENT'
  | 'EDIT'
  | 'DOWNLOAD'
  | 'PRINT'
  | 'SHARE'

export interface DocumentComment {
  id: string
  documentId: string
  userId: string
  content: string
  pageNumber?: number
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  status: 'ACTIVE' | 'RESOLVED' | 'DELETED'
  parentCommentId?: string
  mentions: string[]
  createdAt: Date
  updatedAt: Date
  
  // Relations
  user?: User
  replies?: DocumentComment[]
}

export interface DocumentReview {
  id: string
  documentId: string
  reviewerId: string
  reviewType: 'PEER_REVIEW' | 'SUPERVISOR_REVIEW' | 'CLIENT_REVIEW' | 'COMPLIANCE_REVIEW'
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  completedAt?: Date
  feedback?: string
  rating?: number
  changes: DocumentChange[]
  createdAt: Date
  
  // Relations
  reviewer?: User
  document?: Document
}

export interface DocumentChange {
  id: string
  reviewId: string
  changeType: 'ADDITION' | 'DELETION' | 'MODIFICATION' | 'COMMENT'
  pageNumber?: number
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  oldValue?: string
  newValue?: string
  description: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: Date
}

export interface DocumentPermission {
  id: string
  documentId: string
  userId?: string
  roleId?: string
  permissions: SharePermission[]
  inheritedFrom?: string
  grantedBy: string
  grantedAt: Date
  expiresAt?: Date
}

export interface FolderPermission {
  id: string
  folderId: string
  userId?: string
  roleId?: string
  permissions: ('VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'MANAGE')[]
  inheritFromParent: boolean
  grantedBy: string
  grantedAt: Date
}

export interface DocumentAuditEntry {
  id: string
  documentId: string
  userId: string
  action: DocumentAuditAction
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export type DocumentAuditAction =
  | 'CREATED'
  | 'VIEWED'
  | 'DOWNLOADED'
  | 'EDITED'
  | 'DELETED'
  | 'SHARED'
  | 'COMMENTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'LOCKED'
  | 'UNLOCKED'
  | 'MOVED'
  | 'RENAMED'
  | 'TAGGED'
  | 'UNTAGGED'

// Request/Response interfaces
export interface UploadDocumentRequest {
  name?: string
  description?: string
  folderId?: string
  type?: DocumentType
  category: DocumentCategory
  tags?: string[]
  clientId?: string
  taskId?: string
  complianceYear?: number
  regulatoryForm?: string
  isConfidential?: boolean
  retentionPeriod?: number
  expiryDate?: Date
  autoOCR?: boolean
  autoIndex?: boolean
  customFields?: Record<string, any>
}

export interface UploadDocumentResponse {
  document: Document
  uploadUrl?: string
  processingStatus: {
    virusScan: 'PENDING' | 'CLEAN' | 'INFECTED' | 'FAILED'
    ocr: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    indexing: 'PENDING' | 'INDEXED' | 'FAILED'
    thumbnailGeneration: 'PENDING' | 'COMPLETED' | 'FAILED'
  }
}

export interface DocumentSearchRequest {
  query?: string
  folderId?: string
  type?: DocumentType[]
  category?: DocumentCategory[]
  tags?: string[]
  clientId?: string
  taskId?: string
  uploadedBy?: string[]
  dateFrom?: Date
  dateTo?: Date
  sizeMin?: number
  sizeMax?: number
  hasOCRText?: boolean
  isConfidential?: boolean
  status?: DocumentStatus[]
  sortBy?: 'name' | 'uploadedAt' | 'size' | 'lastAccessedAt' | 'relevance'
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
  includeDeleted?: boolean
  facets?: boolean
}

export interface DocumentSearchResponse {
  documents: Document[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
  facets?: {
    types: Record<DocumentType, number>
    categories: Record<DocumentCategory, number>
    tags: Record<string, number>
    clients: Record<string, number>
    uploadedBy: Record<string, number>
  }
  searchTime: number
}

export interface CreateFolderRequest {
  name: string
  description?: string
  parentId?: string
  folderType: FolderType
  clientId?: string
  projectId?: string
  complianceYear?: number
  autoOCR?: boolean
  autoIndex?: boolean
  retentionPeriod?: number
  permissions?: {
    userId?: string
    roleId?: string
    permissions: ('VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'MANAGE')[]
  }[]
}

export interface ShareDocumentRequest {
  documentId: string
  shareWith: {
    userId?: string
    email?: string
    roleId?: string
  }[]
  permissions: SharePermission[]
  expiresAt?: Date
  message?: string
  requiresLogin?: boolean
  allowDownload?: boolean
  allowPrint?: boolean
  notifyUsers?: boolean
}

export interface DocumentVersionInfo {
  id: string
  version: number
  createdAt: Date
  createdBy: string
  fileSize: number
  checksum: string
  changes?: string
  isLatest: boolean
  filePath: string
}

export interface BulkOperationRequest {
  documentIds: string[]
  operation: 'DELETE' | 'MOVE' | 'COPY' | 'TAG' | 'UNTAG' | 'SHARE' | 'ARCHIVE' | 'RESTORE'
  parameters?: {
    targetFolderId?: string
    tags?: string[]
    shareSettings?: ShareDocumentRequest
  }
}

export interface BulkOperationResponse {
  successful: string[]
  failed: Array<{
    documentId: string
    error: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// Document Analytics
export interface DocumentAnalytics {
  totalDocuments: number
  totalSize: number
  documentsByType: Record<DocumentType, number>
  documentsByCategory: Record<DocumentCategory, number>
  documentsByStatus: Record<DocumentStatus, number>
  recentUploads: Document[]
  mostViewed: Document[]
  largestFiles: Document[]
  storageByFolder: Array<{
    folderId: string
    folderName: string
    documentCount: number
    totalSize: number
  }>
  uploadTrends: Array<{
    date: string
    uploads: number
    totalSize: number
  }>
  userActivity: Array<{
    userId: string
    userName: string
    uploads: number
    downloads: number
    shares: number
  }>
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}