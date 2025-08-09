import type { User } from './index'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  type: TaskType
  category: TaskCategory
  
  // Assignment and ownership
  assigneeId: string
  assignee?: User
  createdBy: string
  creator?: User
  organizationId: string
  
  // CA-specific fields
  clientId?: string
  clientName?: string
  complianceDeadline?: Date
  regulatoryRequirement?: RegulatoryRequirement
  auditTrailRequired: boolean
  approvalRequired: boolean
  approver?: string
  approvedAt?: Date
  
  // Workflow state
  workflowStage: WorkflowStage
  workflowHistory: WorkflowHistoryEntry[]
  dependencies: string[] // Task IDs
  blockedBy: string[] // Task IDs blocking this task
  
  // Time tracking
  estimatedHours?: number
  actualHours?: number
  timeEntries: TimeEntry[]
  
  // Document attachments
  documents: TaskDocument[]
  
  // Tags and categorization
  tags: string[]
  customFields: Record<string, any>
  
  // Dates
  dueDate?: Date
  startDate?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  
  // Recurring tasks
  isRecurring: boolean
  recurrencePattern?: RecurrencePattern
  parentTaskId?: string // For recurring task instances
  
  // Collaboration
  collaborators: string[] // User IDs
  comments: TaskComment[]
  
  // Progress tracking
  completionPercentage: number
  milestones: TaskMilestone[]
  
  // Integration fields
  emailId?: string // If created from email
  sourceSystem?: string // Gmail, Outlook, Manual, etc.
}

export type TaskStatus = 
  | 'DRAFT'
  | 'OPEN' 
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'
  | 'OVERDUE'

export type TaskPriority = 
  | 'LOW'
  | 'MEDIUM' 
  | 'HIGH'
  | 'URGENT'
  | 'CRITICAL'

export type TaskType =
  | 'COMPLIANCE'
  | 'AUDIT'
  | 'TAX_FILING'
  | 'CONSULTATION'
  | 'REVIEW'
  | 'RESEARCH'
  | 'CLIENT_MEETING'
  | 'DOCUMENTATION'
  | 'FOLLOW_UP'
  | 'ADMINISTRATIVE'

export type TaskCategory =
  | 'GST'
  | 'INCOME_TAX'
  | 'CORPORATE_TAX'
  | 'AUDIT'
  | 'COMPLIANCE'
  | 'ADVISORY'
  | 'LITIGATION'
  | 'BUSINESS_SETUP'
  | 'ANNUAL_FILINGS'
  | 'OTHER'

export interface RegulatoryRequirement {
  type: 'GST' | 'INCOME_TAX' | 'CORPORATE_TAX' | 'MCA' | 'SEBI' | 'RBI' | 'OTHER'
  form?: string // GSTR-1, ITR-1, AOC-4, etc.
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | 'ONE_TIME'
  mandatoryDeadline: Date
  penaltyApplicable: boolean
  penaltyAmount?: number
}

export type WorkflowStage =
  | 'INTAKE'
  | 'ASSIGNMENT'
  | 'PREPARATION'
  | 'REVIEW'
  | 'CLIENT_APPROVAL'
  | 'FILING'
  | 'COMPLETION'
  | 'ARCHIVAL'

export interface WorkflowHistoryEntry {
  id: string
  previousStage: WorkflowStage
  newStage: WorkflowStage
  previousStatus: TaskStatus
  newStatus: TaskStatus
  changedBy: string
  changedAt: Date
  comment?: string
  autoTransition: boolean
}

export interface TimeEntry {
  id: string
  taskId: string
  userId: string
  startTime: Date
  endTime?: Date
  duration: number // in minutes
  description?: string
  billable: boolean
  hourlyRate?: number
  createdAt: Date
}

export interface TaskDocument {
  id: string
  taskId: string
  fileName: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedAt: Date
  version: number
  isLatest: boolean
  documentUrl: string
  documentType: DocumentType
}

export type DocumentType =
  | 'SUPPORTING_DOC'
  | 'DRAFT'
  | 'FINAL_OUTPUT'
  | 'CLIENT_APPROVAL'
  | 'REFERENCE'
  | 'TEMPLATE'

export interface RecurrencePattern {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  interval: number // Every N days/weeks/months
  endDate?: Date
  maxOccurrences?: number
  weekDays?: number[] // For weekly recurrence (0=Sunday, 6=Saturday)
  monthDay?: number // For monthly recurrence (1-31)
  quarterMonth?: 1 | 2 | 3 // For quarterly (which month of quarter)
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  user?: User
  content: string
  createdAt: Date
  updatedAt: Date
  parentCommentId?: string
  mentions: string[] // User IDs mentioned
}

export interface TaskMilestone {
  id: string
  taskId: string
  title: string
  description?: string
  dueDate: Date
  completedAt?: Date
  completedBy?: string
  isCompleted: boolean
  order: number
}

// Task creation and update interfaces
export interface CreateTaskRequest {
  title: string
  description?: string
  priority: TaskPriority
  type: TaskType
  category: TaskCategory
  assigneeId: string
  clientId?: string
  complianceDeadline?: Date
  regulatoryRequirement?: RegulatoryRequirement
  auditTrailRequired?: boolean
  approvalRequired?: boolean
  approver?: string
  estimatedHours?: number
  dueDate?: Date
  startDate?: Date
  tags?: string[]
  customFields?: Record<string, any>
  isRecurring?: boolean
  recurrencePattern?: RecurrencePattern
  collaborators?: string[]
  dependencies?: string[]
  emailId?: string
  sourceSystem?: string
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  category?: TaskCategory
  assigneeId?: string
  clientId?: string
  complianceDeadline?: Date
  regulatoryRequirement?: RegulatoryRequirement
  auditTrailRequired?: boolean
  approvalRequired?: boolean
  approver?: string
  estimatedHours?: number
  dueDate?: Date
  startDate?: Date
  tags?: string[]
  customFields?: Record<string, any>
  collaborators?: string[]
  dependencies?: string[]
  completionPercentage?: number
}

export interface TaskFilters {
  status?: TaskStatus[]
  priority?: TaskPriority[]
  type?: TaskType[]
  category?: TaskCategory[]
  assigneeId?: string[]
  createdBy?: string[]
  clientId?: string[]
  workflowStage?: WorkflowStage[]
  tags?: string[]
  dueDateFrom?: Date
  dueDateTo?: Date
  createdFrom?: Date
  createdTo?: Date
  overdue?: boolean
  hasDeadline?: boolean
  isRecurring?: boolean
  approvalRequired?: boolean
  auditTrailRequired?: boolean
  search?: string
}

export interface TaskSearchRequest {
  filters?: TaskFilters
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title' | 'updatedAt'
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
  includeCompleted?: boolean
  includeArchived?: boolean
}

export interface TaskSearchResponse {
  tasks: Task[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
  aggregations: {
    statusCounts: Record<TaskStatus, number>
    priorityCounts: Record<TaskPriority, number>
    typeCounts: Record<TaskType, number>
    overdueTasks: number
    upcomingDeadlines: number
  }
}

// Bulk operations
export interface BulkTaskOperation {
  taskIds: string[]
  operation: 'UPDATE_STATUS' | 'ASSIGN' | 'ADD_TAGS' | 'REMOVE_TAGS' | 'DELETE' | 'ARCHIVE'
  parameters: Record<string, any>
}

export interface BulkTaskResult {
  successful: string[]
  failed: Array<{
    taskId: string
    error: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// Task analytics and reporting
export interface TaskAnalytics {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  upcomingDeadlines: number
  averageCompletionTime: number
  completionRate: number
  statusDistribution: Record<TaskStatus, number>
  priorityDistribution: Record<TaskPriority, number>
  typeDistribution: Record<TaskType, number>
  workloadByAssignee: Array<{
    assigneeId: string
    assigneeName: string
    totalTasks: number
    completedTasks: number
    overdueTasks: number
    averageHours: number
  }>
  productivityTrends: Array<{
    date: string
    tasksCreated: number
    tasksCompleted: number
    averageCompletionTime: number
  }>
}

// Task templates for recurring workflows
export interface TaskTemplate {
  id: string
  name: string
  description: string
  category: TaskCategory
  type: TaskType
  priority: TaskPriority
  estimatedHours: number
  checklistItems: Array<{
    id: string
    title: string
    description?: string
    required: boolean
    order: number
  }>
  documentTemplates: Array<{
    name: string
    type: DocumentType
    templateUrl: string
    required: boolean
  }>
  workflowStages: WorkflowStage[]
  defaultAssigneeRole?: string
  auditTrailRequired: boolean
  approvalRequired: boolean
  tags: string[]
  organizationId: string
  createdBy: string
  createdAt: Date
  isActive: boolean
}