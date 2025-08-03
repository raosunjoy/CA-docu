import {
  getTaskStatusColor,
  getTaskPriorityColor,
  getTaskPriorityWeight,
  isTaskOverdue,
  getDaysUntilDue,
  isValidStatusTransition,
  calculateTaskProgress,
  generateTaskNumber,
  buildTaskWhereClause,
  buildTaskOrderByClause
} from '../task-utils'
import { TaskStatus, TaskPriority } from '@/types'

describe('Task Utils', () => {
  describe('getTaskStatusColor', () => {
    it('should return correct colors for task statuses', () => {
      expect(getTaskStatusColor(TaskStatus.TODO)).toBe('gray')
      expect(getTaskStatusColor(TaskStatus.IN_PROGRESS)).toBe('blue')
      expect(getTaskStatusColor(TaskStatus.IN_REVIEW)).toBe('yellow')
      expect(getTaskStatusColor(TaskStatus.COMPLETED)).toBe('green')
      expect(getTaskStatusColor(TaskStatus.CANCELLED)).toBe('red')
    })
  })

  describe('getTaskPriorityColor', () => {
    it('should return correct colors for task priorities', () => {
      expect(getTaskPriorityColor(TaskPriority.LOW)).toBe('green')
      expect(getTaskPriorityColor(TaskPriority.MEDIUM)).toBe('yellow')
      expect(getTaskPriorityColor(TaskPriority.HIGH)).toBe('orange')
      expect(getTaskPriorityColor(TaskPriority.URGENT)).toBe('red')
    })
  })

  describe('getTaskPriorityWeight', () => {
    it('should return correct weights for sorting', () => {
      expect(getTaskPriorityWeight(TaskPriority.LOW)).toBe(1)
      expect(getTaskPriorityWeight(TaskPriority.MEDIUM)).toBe(2)
      expect(getTaskPriorityWeight(TaskPriority.HIGH)).toBe(3)
      expect(getTaskPriorityWeight(TaskPriority.URGENT)).toBe(4)
    })
  })

  describe('isTaskOverdue', () => {
    it('should return false for null due date', () => {
      expect(isTaskOverdue(null)).toBe(false)
    })

    it('should return true for past due date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      expect(isTaskOverdue(pastDate)).toBe(true)
    })

    it('should return false for future due date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      expect(isTaskOverdue(futureDate)).toBe(false)
    })
  })

  describe('getDaysUntilDue', () => {
    it('should return null for null due date', () => {
      expect(getDaysUntilDue(null)).toBeNull()
    })

    it('should calculate days correctly', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      const days = getDaysUntilDue(futureDate)
      expect(days).toBeGreaterThanOrEqual(4)
      expect(days).toBeLessThanOrEqual(6)
    })
  })

  describe('isValidStatusTransition', () => {
    it('should allow valid transitions from TODO', () => {
      expect(isValidStatusTransition(TaskStatus.TODO, TaskStatus.IN_PROGRESS)).toBe(true)
      expect(isValidStatusTransition(TaskStatus.TODO, TaskStatus.CANCELLED)).toBe(true)
      expect(isValidStatusTransition(TaskStatus.TODO, TaskStatus.COMPLETED)).toBe(false)
    })

    it('should allow valid transitions from IN_PROGRESS', () => {
      expect(isValidStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.TODO)).toBe(true)
      expect(isValidStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW)).toBe(true)
      expect(isValidStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED)).toBe(true)
      expect(isValidStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED)).toBe(true)
    })

    it('should allow valid transitions from COMPLETED', () => {
      expect(isValidStatusTransition(TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS)).toBe(true)
      expect(isValidStatusTransition(TaskStatus.COMPLETED, TaskStatus.TODO)).toBe(false)
    })
  })

  describe('calculateTaskProgress', () => {
    it('should return 0 for no subtasks', () => {
      expect(calculateTaskProgress(0, 0)).toBe(0)
    })

    it('should calculate percentage correctly', () => {
      expect(calculateTaskProgress(10, 5)).toBe(50)
      expect(calculateTaskProgress(4, 1)).toBe(25)
      expect(calculateTaskProgress(3, 3)).toBe(100)
    })
  })

  describe('generateTaskNumber', () => {
    it('should generate task numbers correctly', () => {
      expect(generateTaskNumber('ORG', 0)).toBe('ORG-TASK-0001')
      expect(generateTaskNumber('TEST', 99)).toBe('TEST-TASK-0100')
      expect(generateTaskNumber('ABC', 9999)).toBe('ABC-TASK-10000')
    })
  })

  describe('buildTaskWhereClause', () => {
    const orgId = 'org-123'

    it('should build basic where clause', () => {
      const where = buildTaskWhereClause(orgId, {})
      expect(where).toEqual({ organizationId: orgId })
    })

    it('should build where clause with status filter', () => {
      const where = buildTaskWhereClause(orgId, { status: TaskStatus.TODO })
      expect(where).toEqual({
        organizationId: orgId,
        status: TaskStatus.TODO
      })
    })

    it('should build where clause with multiple status filters', () => {
      const statuses = [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
      const where = buildTaskWhereClause(orgId, { status: statuses })
      expect(where).toEqual({
        organizationId: orgId,
        status: { in: statuses }
      })
    })

    it('should build where clause with search', () => {
      const where = buildTaskWhereClause(orgId, { search: 'test' })
      expect(where).toEqual({
        organizationId: orgId,
        OR: [
          { title: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } }
        ]
      })
    })

    it('should build where clause with date range', () => {
      const from = new Date('2024-01-01')
      const to = new Date('2024-12-31')
      const where = buildTaskWhereClause(orgId, {
        dueDate: { from, to }
      })
      expect(where).toEqual({
        organizationId: orgId,
        dueDate: { gte: from, lte: to }
      })
    })
  })

  describe('buildTaskOrderByClause', () => {
    it('should build order by clause correctly', () => {
      expect(buildTaskOrderByClause({ field: 'createdAt', direction: 'desc' }))
        .toEqual({ createdAt: 'desc' })
      
      expect(buildTaskOrderByClause({ field: 'priority', direction: 'asc' }))
        .toEqual({ priority: 'asc' })
    })
  })
})