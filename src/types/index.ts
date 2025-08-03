// Zetra Platform - Type Definitions
// Generated from Prisma schema

// Import and re-export Prisma types and enums
export type { 
  Organization,
  User,
  Tag,
  Task,
  TaskComment,
  TaskAttachment,
  Document,
  Email,
  ChatChannel,
  ChatChannelMember,
  ChatMessage,
  Tagging,
  AuditLog,
  SyncStatus
} from '../../generated/prisma'

import type { Prisma } from '../../generated/prisma'
export type InputJsonValue = Prisma.InputJsonValue
export type JsonNullValueInput = Prisma.JsonNullValueInput

export {
  UserRole,
  TaskStatus,
  TaskPriority,
  ChannelType,
  MessageType
} from '../../generated/prisma'

// Additional types for API responses
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    pagination?: {
      page: number
      limit: number
      total: number
      hasMore: boolean
    }
    timestamp: string
    requestId: string
  }
}

export interface PaginationOptions {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Forward declare types for interface definitions
type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type UserRole = 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN' | 'ADMIN'
type Tag = {
  id: string
  organizationId: string
  name: string
  parentId?: string
  color?: string
  description?: string
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

// Task-related types
export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  assignedTo?: string[]
  tags?: string[]
  dateRange?: [Date, Date]
}

export interface CreateTaskData {
  title: string
  description?: string
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  parentTaskId?: string
  estimatedHours?: number
  metadata?: Record<string, unknown>
}

export interface TaskCreationData {
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assignedTo?: string | null
  createdBy: string
  organizationId: string
  parentTaskId?: string | null
  dueDate?: Date | null
  estimatedHours?: number | null
  metadata?: JsonNullValueInput | InputJsonValue
}

export interface UpdateTaskData {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  estimatedHours?: number
  actualHours?: number
  metadata?: Record<string, unknown>
}

// Document-related types
export interface DocumentFilters {
  mimeType?: string[]
  folderPath?: string
  uploadedBy?: string
  dateRange?: [Date, Date]
}

export interface CreateDocumentData {
  name: string
  filePath: string
  fileSize: number
  mimeType: string
  folderPath?: string
  metadata?: Record<string, unknown>
}

// Tag-related types
export interface TagWithChildren extends Tag {
  children: TagWithChildren[]
}

export interface CreateTagData {
  name: string
  parentId?: string
  color?: string
  description?: string
}

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationId: string
  role: UserRole
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
}

export interface JWTPayload {
  sub: string
  email: string
  role: UserRole
  orgId: string
  permissions: string[]
  iat: number
  exp: number
  deviceId?: string
}

// Error types
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SYNC_CONFLICT = 'SYNC_CONFLICT'
}

// Permission types
export enum Permission {
  // Task permissions
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  TASK_ASSIGN = 'task:assign',
  TASK_LOCK = 'task:lock',
  TASK_UNLOCK = 'task:unlock',
  
  // Document permissions
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_UPDATE = 'document:update',
  DOCUMENT_DELETE = 'document:delete',
  DOCUMENT_DOWNLOAD = 'document:download',
  
  // Admin permissions
  USER_MANAGE = 'user:manage',
  ORG_SETTINGS = 'org:settings',
  AUDIT_VIEW = 'audit:view',
  
  // Tag permissions
  TAG_CREATE = 'tag:create',
  TAG_MANAGE = 'tag:manage',
  TAG_APPLY = 'tag:apply'
}

// Sync-related types
export interface SyncOperation {
  type: 'create' | 'update' | 'delete'
  resourceType: string
  resourceId: string
  data: Record<string, unknown>
  timestamp: Date
}

export interface SyncResult {
  success: boolean
  uploaded: number
  downloaded: number
  conflicts: number
  error?: string
}

export interface ConflictResolution {
  strategy: 'merge' | 'local' | 'remote' | 'version' | 'user_choice'
  result: Record<string, unknown>
  requiresUserInput: boolean
}

// Component prop types
export interface BaseComponentProps {
  className?: string
}

export interface DashboardWidgetConfig {
  id: string
  type: string
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
  permissions: UserRole[]
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[]
}

// Utility types
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & Record<string, never>

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> 
  & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys]