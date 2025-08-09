// Task service utilities for API routes

import { prisma } from './prisma'
import { TaskFilters, TaskSortOptions, buildTaskWhereClause } from './task-utils'
import type { TaskCreationData } from '../types'

export interface TaskData {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  assignedTo: string | null
  createdBy: string
  parentTaskId: string | null
  dueDate: Date | null
  estimatedHours: number | null
  actualHours: number | null
  organizationId: string
  createdAt: Date
  updatedAt: Date
  assignedUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  createdByUser?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function getTasksPaginated(
  organizationId: string,
  filters: TaskFilters,
  sortOptions: TaskSortOptions,
  page: number,
  limit: number
): Promise<{ tasks: TaskData[], pagination: PaginationInfo }> {
  const where = buildTaskWhereClause(organizationId, filters)
  
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { [sortOptions.field]: sortOptions.direction },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.task.count({ where })
  ])

  return {
    tasks: tasks as TaskData[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export async function validateTaskAssignee(assignedTo: string, organizationId: string) {
  return prisma.user.findFirst({
    where: {
      id: assignedTo,
      organizationId,
      isActive: true
    }
  })
}

export async function validateParentTask(parentTaskId: string, organizationId: string) {
  return prisma.task.findFirst({
    where: {
      id: parentTaskId,
      organizationId
    }
  })
}

export async function createTaskWithIncludes(taskData: TaskCreationData) {
  return prisma.task.create({
    data: taskData,
    include: {
      assignedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  })
}

// Export task service instance for backward compatibility
export const taskService = {
  createTask: createTaskWithIncludes,
  getTasks: getTasksPaginated,
  validateAssignee: validateTaskAssignee,
  validateParentTask: validateParentTask
}