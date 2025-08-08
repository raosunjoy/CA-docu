// Tests for RecurringTaskService

import { RecurringTaskService } from '../recurring-task-service'
import { RecurringTaskData } from '@/types'
import { addDays, addWeeks, addMonths } from 'date-fns'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  recurringTask: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  task: {
    create: jest.fn(),
    count: jest.fn(),
  },
}))

const mockPrisma = require('@/lib/prisma')

describe('RecurringTaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createRecurringTask', () => {
    it('should create a daily recurring task', async () => {
      const organizationId = 'org-1'
      const taskData: RecurringTaskData = {
        title: 'Daily Standup',
        description: 'Team standup meeting',
        priority: 'MEDIUM',
        pattern: 'DAILY',
        interval: 1,
        startDate: new Date('2024-01-01'),
        endType: 'NEVER',
      }

      const mockCreatedTask = {
        id: 'recurring-1',
        ...taskData,
        organizationId,
        nextDue: addDays(taskData.startDate, 1),
        assignedUser: null,
        createdByUser: null,
      }

      mockPrisma.recurringTask.create.mockResolvedValue(mockCreatedTask)

      const result = await RecurringTaskService.createRecurringTask(organizationId, taskData)

      expect(mockPrisma.recurringTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          title: taskData.title,
          pattern: taskData.pattern,
          interval: taskData.interval,
          startDate: taskData.startDate,
          nextDue: expect.any(Date),
        }),
        include: expect.any(Object),
      })

      expect(result).toEqual(mockCreatedTask)
    })

    it('should create a weekly recurring task with specific days', async () => {
      const organizationId = 'org-1'
      const taskData: RecurringTaskData = {
        title: 'Weekly Report',
        pattern: 'WEEKLY',
        interval: 1,
        daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        startDate: new Date('2024-01-01'),
        endType: 'NEVER',
      }

      const mockCreatedTask = {
        id: 'recurring-2',
        ...taskData,
        organizationId,
        nextDue: expect.any(Date),
      }

      mockPrisma.recurringTask.create.mockResolvedValue(mockCreatedTask)

      const result = await RecurringTaskService.createRecurringTask(organizationId, taskData)

      expect(mockPrisma.recurringTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          daysOfWeek: [1, 3, 5],
        }),
        include: expect.any(Object),
      })
    })

    it('should create a monthly recurring task with specific day', async () => {
      const organizationId = 'org-1'
      const taskData: RecurringTaskData = {
        title: 'Monthly Review',
        pattern: 'MONTHLY',
        interval: 1,
        dayOfMonth: 15,
        startDate: new Date('2024-01-01'),
        endType: 'AFTER_OCCURRENCES',
        maxOccurrences: 12,
      }

      const mockCreatedTask = {
        id: 'recurring-3',
        ...taskData,
        organizationId,
        nextDue: expect.any(Date),
      }

      mockPrisma.recurringTask.create.mockResolvedValue(mockCreatedTask)

      const result = await RecurringTaskService.createRecurringTask(organizationId, taskData)

      expect(mockPrisma.recurringTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dayOfMonth: 15,
          maxOccurrences: 12,
          endType: 'AFTER_OCCURRENCES',
        }),
        include: expect.any(Object),
      })
    })
  })

  describe('updateRecurringTask', () => {
    it('should update a recurring task', async () => {
      const taskId = 'recurring-1'
      const organizationId = 'org-1'
      const updateData = {
        title: 'Updated Daily Standup',
        priority: 'HIGH' as const,
      }

      const mockExistingTask = {
        id: taskId,
        organizationId,
        title: 'Daily Standup',
        priority: 'MEDIUM',
        pattern: 'DAILY',
        interval: 1,
        startDate: new Date('2024-01-01'),
        nextDue: new Date('2024-01-02'),
      }

      const mockUpdatedTask = {
        ...mockExistingTask,
        ...updateData,
      }

      mockPrisma.recurringTask.findFirst.mockResolvedValue(mockExistingTask)
      mockPrisma.recurringTask.update.mockResolvedValue(mockUpdatedTask)

      const result = await RecurringTaskService.updateRecurringTask(taskId, organizationId, updateData)

      expect(mockPrisma.recurringTask.findFirst).toHaveBeenCalledWith({
        where: { id: taskId, organizationId },
      })

      expect(mockPrisma.recurringTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining(updateData),
        include: expect.any(Object),
      })

      expect(result).toEqual(mockUpdatedTask)
    })

    it('should throw error if recurring task not found', async () => {
      const taskId = 'non-existent'
      const organizationId = 'org-1'
      const updateData = { title: 'Updated Task' }

      mockPrisma.recurringTask.findFirst.mockResolvedValue(null)

      await expect(
        RecurringTaskService.updateRecurringTask(taskId, organizationId, updateData)
      ).rejects.toThrow('Recurring task not found')
    })
  })

  describe('generateDueTasks', () => {
    it('should generate tasks from due recurring tasks', async () => {
      const now = new Date('2024-01-02T10:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      const mockDueRecurringTasks = [
        {
          id: 'recurring-1',
          organizationId: 'org-1',
          title: 'Daily Task',
          description: 'Daily task description',
          priority: 'MEDIUM',
          assignedTo: 'user-1',
          createdBy: 'user-1',
          pattern: 'DAILY',
          interval: 1,
          nextDue: new Date('2024-01-02T09:00:00Z'),
          totalGenerated: 0,
          estimatedHours: 2,
          requiresApproval: false,
          templateData: { category: 'daily' },
          isActive: true,
          isPaused: false,
          endType: 'NEVER',
          assignedUser: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          createdByUser: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        },
      ]

      const mockGeneratedTask = {
        id: 'task-1',
        title: 'Daily Task (#1)',
        description: 'Daily task description',
        status: 'TODO',
        priority: 'MEDIUM',
        assignedTo: 'user-1',
        createdBy: 'user-1',
        organizationId: 'org-1',
        dueDate: new Date('2024-01-02T09:00:00Z'),
        estimatedHours: 2,
        isRecurring: true,
        recurringTaskId: 'recurring-1',
        instanceNumber: 1,
        assignedUser: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        createdByUser: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      }

      mockPrisma.recurringTask.findMany.mockResolvedValue(mockDueRecurringTasks)
      mockPrisma.task.create.mockResolvedValue(mockGeneratedTask)
      mockPrisma.recurringTask.update.mockResolvedValue({})

      const result = await RecurringTaskService.generateDueTasks()

      expect(mockPrisma.recurringTask.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isPaused: false,
          nextDue: {
            lte: now,
          },
        },
        include: expect.any(Object),
      })

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Daily Task (#1)',
          isRecurring: true,
          recurringTaskId: 'recurring-1',
          instanceNumber: 1,
        }),
        include: expect.any(Object),
      })

      expect(mockPrisma.recurringTask.update).toHaveBeenCalledWith({
        where: { id: 'recurring-1' },
        data: {
          lastGenerated: now,
          nextDue: expect.any(Date),
          totalGenerated: 1,
        },
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockGeneratedTask)

      jest.useRealTimers()
    })

    it('should skip generating tasks for inactive recurring tasks', async () => {
      const now = new Date('2024-01-02T10:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      // Mock that no due recurring tasks are found (since inactive ones are filtered out in the query)
      mockPrisma.recurringTask.findMany.mockResolvedValue([])

      const result = await RecurringTaskService.generateDueTasks()

      expect(mockPrisma.task.create).not.toHaveBeenCalled()
      expect(result).toHaveLength(0)

      jest.useRealTimers()
    })
  })

  describe('getRecurringTasks', () => {
    it('should get recurring tasks with filters', async () => {
      const organizationId = 'org-1'
      const filters = {
        isActive: true,
        assignedTo: 'user-1',
        pattern: 'DAILY' as const,
      }

      const mockRecurringTasks = [
        {
          id: 'recurring-1',
          title: 'Daily Task',
          pattern: 'DAILY',
          isActive: true,
          assignedTo: 'user-1',
        },
      ]

      mockPrisma.recurringTask.findMany.mockResolvedValue(mockRecurringTasks)

      const result = await RecurringTaskService.getRecurringTasks(organizationId, filters)

      expect(mockPrisma.recurringTask.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          isActive: true,
          assignedTo: 'user-1',
          pattern: 'DAILY',
        },
        include: expect.any(Object),
        orderBy: {
          nextDue: 'asc',
        },
      })

      expect(result).toEqual(mockRecurringTasks)
    })
  })

  describe('deleteRecurringTask', () => {
    it('should soft delete a recurring task', async () => {
      const taskId = 'recurring-1'
      const organizationId = 'org-1'

      const mockExistingTask = {
        id: taskId,
        organizationId,
        title: 'Task to Delete',
      }

      const mockUpdatedTask = {
        ...mockExistingTask,
        isActive: false,
      }

      mockPrisma.recurringTask.findFirst.mockResolvedValue(mockExistingTask)
      mockPrisma.recurringTask.update.mockResolvedValue(mockUpdatedTask)

      const result = await RecurringTaskService.deleteRecurringTask(taskId, organizationId)

      expect(mockPrisma.recurringTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          isActive: false,
          updatedAt: expect.any(Date),
        },
      })

      expect(result).toEqual(mockUpdatedTask)
    })

    it('should throw error if recurring task not found for deletion', async () => {
      const taskId = 'non-existent'
      const organizationId = 'org-1'

      mockPrisma.recurringTask.findFirst.mockResolvedValue(null)

      await expect(
        RecurringTaskService.deleteRecurringTask(taskId, organizationId)
      ).rejects.toThrow('Recurring task not found')
    })
  })

  describe('toggleRecurringTask', () => {
    it('should pause a recurring task', async () => {
      const taskId = 'recurring-1'
      const organizationId = 'org-1'
      const isPaused = true

      const mockExistingTask = {
        id: taskId,
        organizationId,
        isPaused: false,
      }

      const mockUpdatedTask = {
        ...mockExistingTask,
        isPaused: true,
      }

      mockPrisma.recurringTask.findFirst.mockResolvedValue(mockExistingTask)
      mockPrisma.recurringTask.update.mockResolvedValue(mockUpdatedTask)

      const result = await RecurringTaskService.toggleRecurringTask(taskId, organizationId, isPaused)

      expect(mockPrisma.recurringTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          isPaused: true,
          updatedAt: expect.any(Date),
        },
      })

      expect(result).toEqual(mockUpdatedTask)
    })
  })
})