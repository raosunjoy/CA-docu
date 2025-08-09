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
  EmailAccount,
  EmailFolder,
  EmailAttachment,
  EmailTemplate,
  EmailSyncLog,
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
  TimeEntryType,
  EmailProvider,
  EmailAccountStatus,
  EmailSyncStatus
} from '../../generated/prisma'

// Email-specific types
export interface EmailMessage {
  id: string
  threadId: string
  from: string
  to?: string
  cc?: string
  bcc?: string
  subject: string
  date: Date
  bodyText?: string
  bodyHtml?: string
  snippet?: string
  labels: string[]
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  attachments?: EmailAttachment[]
  internalDate: Date
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  attachmentId: string
  size?: number
}

export interface EmailSyncResult {
  accountId: string
  success: boolean
  emailsProcessed: number
  emailsAdded: number
  emailsUpdated: number
  emailsDeleted: number
  errorsCount: number
  startedAt: Date
  completedAt?: Date
}

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
  value: unknown
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
  filters: Record<string, unknown>
  isScheduled?: boolean
  scheduleConfig?: Record<string, unknown>
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

// Dashboard Types
export type DashboardWidgetType = 
  | 'task-overview'
  | 'task-board'
  | 'compliance-status'
  | 'team-performance'
  | 'workload-analytics'
  | 'time-tracking'
  | 'document-stats'
  | 'email-stats'
  | 'productivity-metrics'
  | 'client-engagement'
  | 'learning-progress'
  | 'deadlines'
  | 'notifications'
  | 'quick-actions'
  | 'analytics-chart'
  | 'kpi-card'
  | 'activity-feed'

export interface DashboardWidgetConfig {
  id: string
  type: DashboardWidgetType
  title: string
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
  permissions: UserRole[]
  refreshInterval?: number
  isVisible: boolean
  minSize?: { w: number; h: number }
  maxSize?: { w: number; h: number }
}

export interface DashboardLayout {
  id: string
  name: string
  description?: string
  role?: UserRole
  isDefault: boolean
  widgets: DashboardWidgetConfig[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DashboardTemplate {
  id: string
  name: string
  description?: string
  role: UserRole
  widgets: Omit<DashboardWidgetConfig, 'id'>[]
  isSystemTemplate: boolean
  previewImage?: string
}

export interface DashboardMetrics {
  // Task Metrics
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  tasksInProgress: number
  taskCompletionRate: number
  averageTaskTime: number
  
  // Team Metrics
  teamSize: number
  activeMembers: number
  teamUtilization: number
  teamProductivity: number
  
  // Compliance Metrics
  complianceScore: number
  pendingCompliance: number
  complianceDeadlines: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  
  // Time Tracking Metrics
  totalHours: number
  billableHours: number
  utilizationRate: number
  averageHoursPerTask: number
  
  // Document Metrics
  totalDocuments: number
  documentsUploaded: number
  documentsShared: number
  storageUsed: number
  
  // Email Metrics
  totalEmails: number
  unreadEmails: number
  emailsConverted: number
  responseTime: number
  
  // Client Metrics
  activeClients: number
  clientSatisfaction: number
  engagementProgress: number
  pendingRequests: number
}

export interface AnalyticsData {
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  startDate: Date
  endDate: Date
  data: Array<{
    date: string
    value: number
    label?: string
    metadata?: Record<string, unknown>
  }>
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  comparison?: {
    period: string
    value: number
    change: number
  }
}

export interface KPIData {
  id: string
  name: string
  value: number
  target?: number
  unit?: string
  format?: 'number' | 'percentage' | 'currency' | 'time'
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  status: 'good' | 'warning' | 'critical'
  description?: string
  lastUpdated: Date
}

export interface ActivityFeedItem {
  id: string
  type: 'task' | 'document' | 'email' | 'approval' | 'comment' | 'system'
  title: string
  description?: string
  userId: string
  userName: string
  userAvatar?: string
  resourceId?: string
  resourceType?: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface DashboardAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  isRead: boolean
  actionUrl?: string
  actionLabel?: string
  expiresAt?: Date
  createdAt: Date
}

export interface DashboardFilter {
  dateRange?: [Date, Date]
  userId?: string
  teamId?: string
  clientId?: string
  projectId?: string
  tags?: string[]
  status?: string[]
  priority?: string[]
}

export interface DashboardExportConfig {
  format: 'pdf' | 'excel' | 'csv' | 'png'
  widgets: string[]
  includeData: boolean
  includeCharts: boolean
  dateRange?: [Date, Date]
  title?: string
  description?: string
}

export interface DashboardShareConfig {
  shareType: 'view' | 'edit' | 'admin'
  expiresAt?: Date
  password?: string
  allowedUsers?: string[]
  allowedRoles?: UserRole[]
  isPublic: boolean
}

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  category: string
  reportType: 'dashboard' | 'analytics' | 'compliance' | 'financial'
  config: Record<string, unknown>
  schedule?: ReportSchedule
  recipients?: string[]
  isActive: boolean
  createdBy: string
  createdAt: Date
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  dayOfWeek?: number
  dayOfMonth?: number
  time: string
  timezone: string
  isActive: boolean
}

export interface GeneratedReport {
  id: string
  templateId: string
  name: string
  format: 'pdf' | 'excel' | 'csv'
  filePath: string
  fileSize: number
  generatedAt: Date
  generatedBy: string
  parameters: Record<string, unknown>
  status: 'generating' | 'completed' | 'failed'
  error?: string
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
  templateData?: Record<string, unknown>
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
  templateData?: Record<string, unknown>
  isActive?: boolean
  isPaused?: boolean
}

export interface AutomationRuleData {
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  priority?: number
  cooldownMinutes?: number
  maxExecutions?: number
}

export interface AutomationCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'exists'
  value: unknown
  logicalOperator?: 'AND' | 'OR'
}

export interface AutomationAction {
  type: ActionType
  config: Record<string, unknown>
  order: number
}

export interface AutomationTriggerData {
  ruleId: string
  taskId?: string
  triggerData: Record<string, unknown>
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
  value: unknown
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
  config: Record<string, unknown>
}

export interface TaskSuggestionData {
  userId: string
  type: 'recurring' | 'similar' | 'workload' | 'deadline'
  title: string
  description?: string
  confidence: number
  suggestedData: Record<string, unknown>
  reasoning: Record<string, unknown>
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
  suggestedData: Record<string, unknown>
  reasoning: string[]
  expiresAt?: Date
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
}

// Email Integration Types
export interface EmailAccountData {
  provider: EmailProvider
  email: string
  displayName?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  imapHost?: string
  imapPort?: number
  smtpHost?: string
  smtpPort?: number
  username?: string
  password?: string
  isDefault?: boolean
  syncEnabled?: boolean
  syncFolders?: string[]
  maxSyncDays?: number
}

export interface EmailAccountUpdateData {
  displayName?: string
  isDefault?: boolean
  syncEnabled?: boolean
  syncFolders?: string[]
  maxSyncDays?: number
  status?: EmailAccountStatus
}

export interface EmailFilters {
  accountId?: string
  folderId?: string
  isRead?: boolean
  isStarred?: boolean
  isArchived?: boolean
  fromAddress?: string
  subject?: string
  dateRange?: [Date, Date]
  hasAttachments?: boolean
  labels?: string[]
  linkedToTasks?: boolean
}

export interface EmailSearchFilters extends EmailFilters {
  query?: string
  searchIn?: ('subject' | 'body' | 'from' | 'to')[]
  sortBy?: 'receivedAt' | 'sentAt' | 'subject' | 'fromAddress'
  sortOrder?: 'asc' | 'desc'
}

export interface EmailData {
  accountId: string
  folderId?: string
  externalId: string
  threadId?: string
  messageId?: string
  subject?: string
  fromAddress: string
  fromName?: string
  toAddresses: string[]
  toNames?: string[]
  ccAddresses?: string[]
  ccNames?: string[]
  bccAddresses?: string[]
  bccNames?: string[]
  bodyText?: string
  bodyHtml?: string
  snippet?: string
  importance?: string
  priority?: string
  sentAt?: Date
  receivedAt: Date
  attachments?: EmailAttachmentData[]
}

export interface EmailAttachmentData {
  filename: string
  contentType: string
  size: number
  contentId?: string
  isInline?: boolean
  downloadUrl?: string
}

export interface EmailTemplateData {
  name: string
  description?: string
  category?: string
  subject: string
  bodyHtml: string
  bodyText?: string
  variables?: EmailTemplateVariable[]
  isShared?: boolean
}

export interface EmailTemplateVariable {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  required?: boolean
  defaultValue?: unknown
  options?: string[] // For select type
}

export interface EmailCompositionData {
  accountId: string
  templateId?: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  attachments?: File[]
  taskAttachments?: string[] // Task IDs
  documentAttachments?: string[] // Document IDs
  scheduledAt?: Date
  importance?: string
  priority?: string
}

export interface EmailToTaskData {
  emailId: string
  title: string
  description?: string
  priority?: TaskPriority
  assignedTo?: string
  dueDate?: Date
  tags?: string[]
  includeAttachments?: boolean
}

export interface EmailSyncResult {
  accountId: string
  success: boolean
  emailsProcessed: number
  emailsAdded: number
  emailsUpdated: number
  emailsDeleted: number
  errorsCount: number
  error?: string
  startedAt: Date
  completedAt?: Date
}

export interface EmailFolderData {
  accountId: string
  name: string
  displayName?: string
  externalId?: string
  parentId?: string
  type?: string
}

export interface EmailAccountCredentials {
  provider: EmailProvider
  email: string
  // OAuth2 credentials
  accessToken?: string
  refreshToken?: string
  authCode?: string
  // IMAP/SMTP credentials
  password?: string
  imapHost?: string
  imapPort?: number
  smtpHost?: string
  smtpPort?: number
  username?: string
}

export interface EmailProviderConfig {
  provider: EmailProvider
  displayName: string
  authUrl?: string
  scopes?: string[]
  imapDefaults?: {
    host: string
    port: number
    secure: boolean
  }
  smtpDefaults?: {
    host: string
    port: number
    secure: boolean
  }
}

export interface EmailSyncConfig {
  enabled: boolean
  folders: string[]
  maxDays: number
  syncInterval: number // minutes
  batchSize: number
}

export interface EmailAnalytics {
  totalEmails: number
  unreadEmails: number
  emailsToday: number
  emailsThisWeek: number
  emailsThisMonth: number
  topSenders: Array<{
    address: string
    name?: string
    count: number
  }>
  responseTime: {
    average: number // hours
    median: number
  }
  emailsWithTasks: number
  emailsWithDocuments: number
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