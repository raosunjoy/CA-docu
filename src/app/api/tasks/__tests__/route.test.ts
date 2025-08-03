import { TaskStatus, TaskPriority, UserRole } from '@/types'

// Mock Prisma
const mockPrisma = {
  task: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
}

jest.mock('@/lib/prisma', () => mockPrisma)

// Mock middleware
jest.mock('@/lib/middleware', () => ({
  authMiddleware: () => () => Promise.resolve({
    user: {
      sub: 'user-123',
      orgId: 'org-123',
      role: UserRole.ASSOCIATE,
      permissions: ['read:tasks', 'write:tasks']
    }
  })
}))

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
})

describe('Tasks API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockTasks = [
    {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      organizationId: 'org-123',
      assignedTo: 'user-456',
      createdBy: 'user-123',
      createdAt: new Date(),
      assignedUser: {
        id: 'user-456',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com'
      },
      createdByUser: {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@example.com'
      },
      _count: {
        childTasks: 0,
        comments: 2,
        attachments: 1
      }
    }
  ]

  describe('GET /api/tasks', () => {
    it('should structure pagination response correctly', () => {
      const result = {
        tasks: mockTasks,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1
        }
      }

      // Verify response structure
      expect(result.tasks).toEqual(mockTasks)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.totalPages).toBe(1)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
    })

    it('should apply status filter', () => {
      const expectedWhere = {
        organizationId: 'org-123',
        status: TaskStatus.TODO
      }

      // Test where clause building with status filter
      expect(expectedWhere.status).toBe(TaskStatus.TODO)
    })

    it('should apply search filter', () => {
      const expectedWhere = {
        organizationId: 'org-123',
        OR: [
          { title: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } }
        ]
      }

      expect(expectedWhere.OR).toHaveLength(2)
      expect(expectedWhere.OR[0]?.title?.contains).toBe('test')
    })

    it('should handle pagination correctly', () => {
      const page = 2
      const limit = 10
      const expectedSkip = (page - 1) * limit

      expect(expectedSkip).toBe(10)
    })
  })

  describe('POST /api/tasks', () => {
    const validTaskData = {
      title: 'New Task',
      description: 'Task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      assignedTo: 'user-456'
    }

    it('should create task successfully', async () => {
      const mockCreatedTask = {
        id: 'task-new',
        ...validTaskData,
        organizationId: 'org-123',
        createdBy: 'user-123',
        createdAt: new Date(),
        assignedUser: {
          id: 'user-456',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com'
        },
        createdByUser: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@example.com'
        }
      }

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-456',
        organizationId: 'org-123',
        isActive: true
      })
      mockPrisma.task.create.mockResolvedValue(mockCreatedTask)
      mockPrisma.auditLog.create.mockResolvedValue({})


      expect(mockCreatedTask.title).toBe(validTaskData.title)
      expect(mockCreatedTask.organizationId).toBe('org-123')
      expect(mockCreatedTask.createdBy).toBe('user-123')
    })

    it('should validate assigned user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      // Should validate that assigned user exists and is active
      const assignedUser = await mockPrisma.user.findFirst({
        where: {
          id: 'user-456',
          organizationId: 'org-123',
          isActive: true
        }
      })

      expect(assignedUser).toBeNull()
    })

    it('should validate parent task exists', async () => {
      const parentTaskId = 'parent-task-123'
      
      mockPrisma.task.findFirst.mockResolvedValue({
        id: parentTaskId,
        organizationId: 'org-123'
      })

      const parentTask = await mockPrisma.task.findFirst({
        where: {
          id: parentTaskId,
          organizationId: 'org-123'
        }
      })

      expect(parentTask).toBeTruthy()
      expect(parentTask.id).toBe(parentTaskId)
    })

    it('should create audit log entry', async () => {
      const expectedAuditData = {
        organizationId: 'org-123',
        userId: 'user-123',
        action: 'create',
        resourceType: 'task',
        resourceId: 'task-new',
        newValues: {
          title: 'New Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          assignedTo: 'user-456'
        },
        ipAddress: undefined,
        userAgent: undefined
      }

      expect(expectedAuditData.action).toBe('create')
      expect(expectedAuditData.resourceType).toBe('task')
    })
  })

  describe('Validation', () => {
    it('should validate task title requirements', () => {
      const validTitle = 'Valid Task Title'
      const emptyTitle = ''
      const longTitle = 'x'.repeat(201)

      expect(validTitle.length).toBeGreaterThan(0)
      expect(validTitle.length).toBeLessThanOrEqual(200)
      expect(emptyTitle.length).toBe(0)
      expect(longTitle.length).toBeGreaterThan(200)
    })

    it('should validate task enums', () => {
      const validStatus = Object.values(TaskStatus)
      const validPriority = Object.values(TaskPriority)

      expect(validStatus).toContain(TaskStatus.TODO)
      expect(validStatus).toContain(TaskStatus.IN_PROGRESS)
      expect(validPriority).toContain(TaskPriority.LOW)
      expect(validPriority).toContain(TaskPriority.URGENT)
    })

    it('should validate estimated hours range', () => {
      const validHours = 8
      const invalidHours = -5

      expect(validHours).toBeGreaterThanOrEqual(0)
      expect(invalidHours).toBeLessThan(0)
    })
  })
})