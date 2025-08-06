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
  MessageType,
  DocumentType,
  DocumentStatus,
  ApprovalStatus,
  ApprovalDecision,
  TimeEntryStatus,
  TimeEntryType
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
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'CANCELLED'
type ApprovalDecision = 'APPROVE' | 'REJECT' | 'DELEGATE' | 'REQUEST_CHANGES'
type TimeEntryStatus = 'RUNNING' | 'STOPPED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
type TimeEntryType = 'WORK' | 'BREAK' | 'MEETING' | 'TRAVEL' | 'ADMIN'
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
  requiresApproval?: boolean
  approvalStatus?: ApprovalStatus
}

// Approval Workflow Types
export interface ApprovalStep {
  stepNumber: number
  name: string
  description?: string
  approverRoles: UserRole[]
  approverIds?: string[]
  conditions?: ApprovalCondition[]
  isParallel?: boolean
  requiredApprovals?: number
  autoApprove?: boolean
  timeoutHours?: number
}

export interface ApprovalCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
}

export interface ApprovalWorkflowData {
  name: string
  description?: string
  steps: ApprovalStep[]
  taskId: string
}

export interface ApprovalRequestData {
  workflowId: string
  taskId: string
  stepNumber: number
  approverId: string
  expiresAt?: Date
  comments?: string
}

export interface ApprovalDecisionData {
  decision: ApprovalDecision
  comments?: string
  delegateToId?: string
}

export interface ApprovalTemplateData {
  name: string
  description?: string
  category?: string
  conditions: ApprovalCondition[]
  steps: ApprovalStep[]
  isDefault?: boolean
}

export interface ApprovalDelegateData {
  delegateId: string
  startDate: Date
  endDate?: Date
  conditions?: ApprovalCondition[]
}

// Time Tracking Types
export interface TimeEntryData {
  taskId?: string
  projectId?: string
  clientId?: string
  description?: string
  startTime: Date
  endTime?: Date
  type: TimeEntryType
  isBillable?: boolean
  hourlyRate?: number
  tags?: string[]
}

export interface TimeEntryUpdateData {
  description?: string
  endTime?: Date
  type?: TimeEntryType
  isBillable?: boolean
  hourlyRate?: number
  tags?: string[]
}

export interface TimeBudgetData {
  name: string
  description?: string
  taskId?: string
  projectId?: string
  clientId?: string
  userId?: string
  budgetHours: number
  startDate: Date
  endDate: Date
  alertThreshold?: number
}

export interface TimeReportData {
  name: string
  description?: string
  reportType: 'timesheet' | 'productivity' | 'billing' | 'project'
  startDate: Date
  endDate: Date
  filters: Record<string, any>
  isScheduled?: boolean
  scheduleConfig?: Record<string, any>
}

export interface ProductivityMetricData {
  userId: string
  date: Date
  totalHours: number
  billableHours: number
  tasksCompleted: number
  focusScore?: number
  efficiencyScore?: number
  utilizationRate?: number
}

export interface TimeTrackingFilters {
  userId?: string
  taskId?: string
  projectId?: string
  clientId?: string
  status?: TimeEntryStatus[]
  type?: TimeEntryType[]
  isBillable?: boolean
  startDate?: Date
  endDate?: Date
  tags?: string[]
}

export interface TimeTrackingSummary {
  totalHours: number
  billableHours: number
  nonBillableHours: number
  totalAmount: number
  entriesCount: number
  averageHoursPerDay: number
  productivityScore: number
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

// Recurring Task and Automation Types
export type RecurrencePattern = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
export type RecurrenceEndType = 'NEVER' | 'AFTER_OCCURRENCES' | 'ON_DATE'
export type TriggerType = 'DEADLINE_APPROACHING' | 'TASK_OVERDUE' | 'TASK_COMPLETED' | 'TASK_CREATED' | 'WORKLOAD_THRESHOLD' | 'TIME_BASED' | 'STATUS_CHANGE'
export type ActionType = 'ASSIGN_TASK' | 'ESCALATE_TASK' | 'CREATE_TASK' | 'SEND_NOTIFICATION' | 'UPDATE_PRIORITY' | 'ADD_COMMENT' | 'DELEGATE_APPROVAL'

export interface RecurringTaskData {
  title: string
  description?: string
  priority?: TaskPriority
  assignedTo?: string
  pattern: RecurrencePattern
  interval?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  monthsOfYear?: number[]
  customCron?: string
  startDate: Date
  endType?: RecurrenceEndType
  endDate?: Date
  maxOccurrences?: number
  estimatedHours?: number
  requiresApproval?: boolean
  templateData?: Record<string, any>
}

export interface RecurringTaskUpdateData {
  title?: string
  description?: string
  priority?: TaskPriority
  assignedTo?: string
  pattern?: RecurrencePattern
  interval?: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  monthsOfYear?: number[]
  customCron?: string
  endType?: RecurrenceEndType
  endDate?: Date
  maxOccurrences?: number
  estimatedHours?: number
  requiresApproval?: boolean
  templateData?: Record<string, any>
  isActive?: boolean
  isPaused?: boolean
}

export interface AutomationRuleData {
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: Record<string, any>
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  priority?: number
  cooldownMinutes?: number
  maxExecutions?: number
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'exists'
  value: any
  logicalOperator?: 'AND' | 'OR'
}

export interface AutomationAction {
  type: ActionType
  config: Record<string, any>
  order: number
}

export interface AutomationTriggerData {
  ruleId: string
  taskId?: string
  triggerData: Record<string, any>
  scheduledFor?: Date
}

export interface WorkloadMetricData {
  userId: string
  date: Date
  activeTasks: number
  overdueTasks: number
  completedTasks: number
  totalHours: number
  availableHours: number
  utilizationRate: number
  avgCompletionTime?: number
  qualityScore?: number
  specializations?: string[]
}

export interface EscalationRuleData {
  name: string
  description?: string
  conditions: EscalationCondition[]
  levels: EscalationLevel[]
  priority?: number
}

export interface EscalationCondition {
  field: string
  operator: string
  value: any
  unit?: string // 'hours', 'days', etc.
}

export interface EscalationLevel {
  level: number
  name: string
  triggerAfter: number // Hours after previous level
  actions: EscalationAction[]
}

export interface EscalationAction {
  type: 'notify' | 'reassign' | 'escalate_priority' | 'add_comment' | 'delegate'
  config: Record<string, any>
}

export interface TaskSuggestionData {
  userId: string
  type: 'recurring' | 'similar' | 'workload' | 'deadline'
  title: string
  description?: string
  confidence: number
  suggestedData: Record<string, any>
  reasoning: Record<string, any>
  expiresAt?: Date
}

export interface TaskAssignmentSuggestion {
  userId: string
  userName: string
  confidence: number
  reasoning: string[]
  workloadScore: number
  skillMatch: number
  availabilityScore: number
}

export interface SmartTaskSuggestion {
  id: string
  type: string
  title: string
  description?: string
  confidence: number
  suggestedData: Record<string, any>
  reasoning: string[]
  expiresAt?: Date
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
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