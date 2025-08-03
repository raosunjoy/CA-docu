// Task management utilities for Zetra Platform

import { TaskStatus, TaskPriority } from '@/types'

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[] | null
  priority?: TaskPriority | TaskPriority[] | null
  assignedTo?: string | null
  createdBy?: string | null
  parentTaskId?: string | null
  dueDate?: {
    from?: Date
    to?: Date
  }
  search?: string | null
}

export interface TaskSortOptions {
  field: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title'
  direction: 'asc' | 'desc'
}

/**
 * Get task status color for UI
 */
export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.TODO:
      return 'gray'
    case TaskStatus.IN_PROGRESS:
      return 'blue'
    case TaskStatus.IN_REVIEW:
      return 'yellow'
    case TaskStatus.COMPLETED:
      return 'green'
    case TaskStatus.CANCELLED:
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Get task priority color for UI
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.LOW:
      return 'green'
    case TaskPriority.MEDIUM:
      return 'yellow'
    case TaskPriority.HIGH:
      return 'orange'
    case TaskPriority.URGENT:
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Get task priority weight for sorting
 */
export function getTaskPriorityWeight(priority: TaskPriority): number {
  switch (priority) {
    case TaskPriority.LOW:
      return 1
    case TaskPriority.MEDIUM:
      return 2
    case TaskPriority.HIGH:
      return 3
    case TaskPriority.URGENT:
      return 4
    default:
      return 0
  }
}

/**
 * Check if task is overdue
 */
export function isTaskOverdue(dueDate: Date | null): boolean {
  if (!dueDate) return false
  return new Date() > new Date(dueDate)
}

/**
 * Get days until due date
 */
export function getDaysUntilDue(dueDate: Date | null): number | null {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Validate task status transition
 */
export function isValidStatusTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus
): boolean {
  const validTransitions: Record<TaskStatus, TaskStatus[]> = {
    [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
    [TaskStatus.IN_PROGRESS]: [
      TaskStatus.TODO,
      TaskStatus.IN_REVIEW,
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED
    ],
    [TaskStatus.IN_REVIEW]: [
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED
    ],
    [TaskStatus.COMPLETED]: [TaskStatus.IN_PROGRESS],
    [TaskStatus.CANCELLED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
  }

  return validTransitions[fromStatus]?.includes(toStatus) || false
}

/**
 * Calculate task completion percentage for subtasks
 */
export function calculateTaskProgress(
  totalSubtasks: number,
  completedSubtasks: number
): number {
  if (totalSubtasks === 0) return 0
  return Math.round((completedSubtasks / totalSubtasks) * 100)
}

/**
 * Generate task number/identifier
 */
export function generateTaskNumber(
  organizationPrefix: string,
  taskCount: number
): string {
  const paddedCount = String(taskCount + 1).padStart(4, '0')
  return `${organizationPrefix}-TASK-${paddedCount}`
}

/**
 * Build Prisma where clause from filters
 */
export function buildTaskWhereClause(
  organizationId: string,
  filters: TaskFilters
) {
  const where: any = {
    organizationId
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status }
    } else {
      where.status = filters.status
    }
  }

  if (filters.priority) {
    if (Array.isArray(filters.priority)) {
      where.priority = { in: filters.priority }
    } else {
      where.priority = filters.priority
    }
  }

  if (filters.assignedTo) {
    where.assignedTo = filters.assignedTo
  }

  if (filters.createdBy) {
    where.createdBy = filters.createdBy
  }

  if (filters.parentTaskId) {
    where.parentTaskId = filters.parentTaskId
  }

  if (filters.dueDate) {
    where.dueDate = {}
    if (filters.dueDate.from) {
      where.dueDate.gte = filters.dueDate.from
    }
    if (filters.dueDate.to) {
      where.dueDate.lte = filters.dueDate.to
    }
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  return where
}

/**
 * Build Prisma orderBy clause from sort options
 */
export function buildTaskOrderByClause(sort: TaskSortOptions) {
  return {
    [sort.field]: sort.direction
  }
}