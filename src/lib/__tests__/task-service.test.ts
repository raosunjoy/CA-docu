import {
  getTasksPaginated,
  validateTaskAssignee,
  validateParentTask,
  createTaskWithIncludes
} from '../task-service'
import prisma from '@/lib/prisma'
import { buildTaskWhereClause } from '@/lib/task-utils'
import { TaskStatus, TaskPriority } from '@/types'
import { createMockTask, createMockUser } from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  task: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
}))

jest.mock('@/lib/task-utils', () => ({
  buildTaskWhereClause: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockBuildTaskWhereClause = buildTaskWhereClause as jest.MockedFunction<typeof buildTaskWhereClause>

describe('Task Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getTasksPaginated', () => {
    const mockTasks = [
      createMockTask({
        id: 'task-1',
        title: 'Task 1',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        assignedUser: createMockUser({ id: 'user-1' }),
        createdByUser: createMockUser({ id: 'user-2' })
      }),
      createMockTask({
        id: 'task-2',
        title: 'Task 2',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        assignedUser: createMockUser({ id: 'user-2' }),
        createdByUser: createMockUser({ id: 'user-1' })
      })
    ]

    const mockWhereClause = { organizationId: 'org-1' }
    const filters = {
      status: TaskStatus.TODO,
      assignedTo: 'user-1',
      search: 'test',
      createdBy: null,
      parentTaskId: null
    }
    const sortOptions = { field: 'createdAt' as const, direction: 'desc' as const }

    beforeEach(() => {
      mockBuildTaskWhereClause.mockReturnValue(mockWhereClause)
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)
      mockPrisma.task.count.mockResolvedValue(25)
    })

    it('should return paginated tasks with correct structure', async () => {
      const result = await getTasksPaginated('org-1', filters, sortOptions, 1, 10)

      expect(result).toEqual({
        tasks: mockTasks,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3
        }
      })
    })

    it('should call buildTaskWhereClause with correct parameters', async () => {
      await getTasksPaginated('org-1', filters, sortOptions, 1, 10)

      expect(mockBuildTaskWhereClause).toHaveBeenCalledWith('org-1', filters)
    })

    it('should call prisma.task.findMany with correct parameters', async () => {
      await getTasksPaginated('org-1', filters, sortOptions, 2, 20)

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: mockWhereClause,
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
        orderBy: { createdAt: 'desc' },
        skip: 20, // (page - 1) * limit = (2 - 1) * 20
        take: 20
      })
    })

    it('should call prisma.task.count with correct where clause', async () => {
      await getTasksPaginated('org-1', filters, sortOptions, 1, 10)

      expect(mockPrisma.task.count).toHaveBeenCalledWith({
        where: mockWhereClause
      })
    })

    it('should calculate pagination correctly', async () => {
      mockPrisma.task.count.mockResolvedValue(47)

      const result = await getTasksPaginated('org-1', filters, sortOptions, 3, 15)

      expect(result.pagination).toEqual({
        page: 3,
        limit: 15,
        total: 47,
        totalPages: 4 // Math.ceil(47 / 15)
      })
    })

    it('should handle different sort options', async () => {
      const titleSortOptions = { field: 'title' as const, direction: 'asc' as const }

      await getTasksPaginated('org-1', filters, titleSortOptions, 1, 10)

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' }
        })
      )
    })

    it('should handle empty results', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])
      mockPrisma.task.count.mockResolvedValue(0)

      const result = await getTasksPaginated('org-1', filters, sortOptions, 1, 10)

      expect(result).toEqual({
        tasks: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.task.findMany.mockRejectedValue(new Error('Database error'))

      await expect(
        getTasksPaginated('org-1', filters, sortOptions, 1, 10)
      ).rejects.toThrow('Database error')
    })

    it('should handle count query errors', async () => {
      mockPrisma.task.findMany.mockResolvedValue(mockTasks)
      mockPrisma.task.count.mockRejectedValue(new Error('Count error'))

      await expect(
        getTasksPaginated('org-1', filters, sortOptions, 1, 10)
      ).rejects.toThrow('Count error')
    })
  })

  describe('validateTaskAssignee', () => {
    const mockUser = createMockUser({
      id: 'user-1',
      organizationId: 'org-1',
      isActive: true
    })

    it('should return user when valid assignee exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser)

      const result = await validateTaskAssignee('user-1', 'org-1')

      expect(result).toEqual(mockUser)
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          organizationId: 'org-1',
          isActive: true
        }
      })
    })

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const result = await validateTaskAssignee('non-existent', 'org-1')

      expect(result).toBeNull()
    })

    it('should return null when user is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null) // Inactive users won't be found

      const result = await validateTaskAssignee('inactive-user', 'org-1')

      expect(result).toBeNull()
    })

    it('should return null when user is from different organization', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null) // Different org users won't be found

      const result = await validateTaskAssignee('user-1', 'different-org')

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'))

      await expect(
        validateTaskAssignee('user-1', 'org-1')
      ).rejects.toThrow('Database error')
    })
  })

  describe('validateParentTask', () => {
    const mockParentTask = createMockTask({
      id: 'parent-task-1',
      organizationId: 'org-1'
    })

    it('should return task when valid parent task exists', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockParentTask)

      const result = await validateParentTask('parent-task-1', 'org-1')

      expect(result).toEqual(mockParentTask)
      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'parent-task-1',
          organizationId: 'org-1'
        }
      })
    })

    it('should return null when parent task does not exist', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      const result = await validateParentTask('non-existent', 'org-1')

      expect(result).toBeNull()
    })

    it('should return null when parent task is from different organization', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      const result = await validateParentTask('parent-task-1', 'different-org')

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      mockPrisma.task.findFirst.mockRejectedValue(new Error('Database error'))

      await expect(
        validateParentTask('parent-task-1', 'org-1')
      ).rejects.toThrow('Database error')
    })
  })

  describe('createTaskWithIncludes', () => {
    const taskData = {
      organizationId: 'org-1',
      title: 'New Task',
      description: 'Task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assignedTo: 'user-1',
      createdBy: 'user-2',
      parentTaskId: null,
      dueDate: new Date('2024-12-31'),
      estimatedHours: 8,
      metadata: { category: 'development' }
    }

    const mockCreatedTask = createMockTask({
      ...taskData,
      id: 'task-1',
      assignedUser: createMockUser({ id: 'user-1' }),
      createdByUser: createMockUser({ id: 'user-2' })
    })

    it('should create task with includes', async () => {
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask)

      const result = await createTaskWithIncludes(taskData)

      expect(result).toEqual(mockCreatedTask)
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
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
    })

    it('should handle task creation with minimal data', async () => {
      const minimalTaskData = {
        organizationId: 'org-1',
        title: 'Minimal Task',
        description: null,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        assignedTo: null,
        createdBy: 'user-1',
        parentTaskId: null,
        dueDate: null,
        estimatedHours: null,
        metadata: {}
      }

      const minimalCreatedTask = createMockTask({
        ...minimalTaskData,
        id: 'task-1',
        assignedUser: null,
        createdByUser: createMockUser({ id: 'user-1' })
      })

      mockPrisma.task.create.mockResolvedValue(minimalCreatedTask)

      const result = await createTaskWithIncludes(minimalTaskData)

      expect(result).toEqual(minimalCreatedTask)
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: minimalTaskData,
        include: expect.any(Object)
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.task.create.mockRejectedValue(new Error('Database error'))

      await expect(
        createTaskWithIncludes(taskData)
      ).rejects.toThrow('Database error')
    })

    it('should handle constraint violations', async () => {
      const constraintError = new Error('Unique constraint violation')
      mockPrisma.task.create.mockRejectedValue(constraintError)

      await expect(
        createTaskWithIncludes(taskData)
      ).rejects.toThrow('Unique constraint violation')
    })

    it('should create task with parent task relationship', async () => {
      const taskWithParent = {
        ...taskData,
        parentTaskId: 'parent-task-1'
      }

      const createdTaskWithParent = createMockTask({
        ...taskWithParent,
        id: 'task-1'
      })

      mockPrisma.task.create.mockResolvedValue(createdTaskWithParent)

      const result = await createTaskWithIncludes(taskWithParent)

      expect(result).toEqual(createdTaskWithParent)
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: taskWithParent,
        include: expect.any(Object)
      })
    })
  })
})