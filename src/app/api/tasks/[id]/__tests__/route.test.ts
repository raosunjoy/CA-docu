import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'
import prisma from '@/lib/prisma'
import { authMiddleware } from '@/lib/middleware'
import { isValidStatusTransition } from '@/lib/task-utils'
import { TaskStatus, TaskPriority } from '@/types'
import { createMockTask, createMockUser } from '@/test-utils'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  task: {
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}))

jest.mock('@/lib/middleware', () => ({
  authMiddleware: jest.fn(),
}))

jest.mock('@/lib/task-utils', () => ({
  isValidStatusTransition: jest.fn(),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>
const mockIsValidStatusTransition = isValidStatusTransition as jest.MockedFunction<typeof isValidStatusTransition>

describe('/api/tasks/[id]', () => {
  const mockUser = {
    sub: 'user-1',
    email: 'test@example.com',
    role: 'ASSOCIATE',
    orgId: 'org-1',
    permissions: ['task:read', 'task:update', 'task:delete']
  }

  const mockAuthResult = { user: mockUser }

  const mockTask = createMockTask({
    id: 'task-1',
    title: 'Test Task',
    description: 'Test description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    organizationId: 'org-1',
    assignedTo: 'user-2',
    createdBy: 'user-1',
    lockedBy: null,
    assignedUser: createMockUser({ id: 'user-2' }),
    createdByUser: createMockUser({ id: 'user-1' }),
    comments: [],
    attachments: [],
    childTasks: []
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
  })

  describe('GET /api/tasks/[id]', () => {
    it('should return task successfully', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1')
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTask)
      expect(mockPrisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', organizationId: 'org-1' },
        include: expect.objectContaining({
          assignedUser: { select: expect.any(Object) },
          createdByUser: { select: expect.any(Object) },
          lockedByUser: { select: expect.any(Object) },
          parentTask: { select: expect.any(Object) },
          childTasks: expect.any(Object),
          comments: expect.any(Object),
          attachments: expect.any(Object)
        })
      })
    })

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks/non-existent')
      const context = { params: Promise.resolve({ id: 'non-existent' }) }

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Task not found')
    })

    it('should handle authentication failure', async () => {
      const authErrorResponse = new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
        }),
        { status: 401 }
      )
      mockAuthMiddleware.mockImplementation(() => async () => authErrorResponse)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1')
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle database errors', async () => {
      mockPrisma.task.findFirst.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1')
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await GET(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('PUT /api/tasks/[id]', () => {
    const validUpdateData = {
      title: 'Updated Task',
      description: 'Updated description',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assignedTo: 'user-3',
      dueDate: '2024-12-31T23:59:59.000Z',
      estimatedHours: 10,
      actualHours: 5
    }

    const updatedTask = {
      ...mockTask,
      ...validUpdateData,
      dueDate: new Date('2024-12-31T23:59:59.000Z'),
      updatedAt: new Date()
    }

    beforeEach(() => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)
      mockPrisma.task.update.mockResolvedValue(updatedTask)
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: 'user-3' }))
      mockPrisma.auditLog.create.mockResolvedValue({} as any)
      mockIsValidStatusTransition.mockReturnValue(true)
    })

    it('should update task successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(updatedTask)
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          title: 'Updated Task',
          description: 'Updated description',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          assignedTo: 'user-3',
          dueDate: new Date('2024-12-31T23:59:59.000Z'),
          estimatedHours: 10,
          actualHours: 5
        }),
        include: expect.any(Object)
      })
    })

    it('should create audit log for update', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent'
        }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      await PUT(request, context)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'update',
          resourceType: 'task',
          resourceId: 'task-1',
          oldValues: {
            title: mockTask.title,
            status: mockTask.status,
            priority: mockTask.priority,
            assignedTo: mockTask.assignedTo
          },
          newValues: {
            title: updatedTask.title,
            status: updatedTask.status,
            priority: updatedTask.priority,
            assignedTo: updatedTask.assignedTo
          },
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      })
    })

    it('should handle partial updates', async () => {
      const partialUpdate = { title: 'Only Title Updated' }

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(partialUpdate),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { title: 'Only Title Updated' },
        include: expect.any(Object)
      })
    })

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks/non-existent', {
        method: 'PUT',
        body: JSON.stringify(validUpdateData),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'non-existent' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should validate status transitions', async () => {
      mockIsValidStatusTransition.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify({ status: TaskStatus.COMPLETED }),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid status transition')
    })

    it('should validate assigned user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify({ assignedTo: 'invalid-user' }),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Assigned user not found in organization')
    })

    it('should handle locked tasks', async () => {
      const lockedTask = { ...mockTask, lockedBy: 'other-user' }
      const lockUser = createMockUser({ id: 'other-user', firstName: 'John', lastName: 'Doe' })
      
      mockPrisma.task.findFirst.mockResolvedValue(lockedTask)
      mockPrisma.user.findUnique.mockResolvedValue(lockUser)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
      expect(data.error.message).toBe('Task is locked by John Doe')
    })

    it('should handle completion date logic', async () => {
      const completionUpdate = { status: TaskStatus.COMPLETED }

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(completionUpdate),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      await PUT(request, context)

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date)
        }),
        include: expect.any(Object)
      })
    })

    it('should clear completion date when moving from completed', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED, completedAt: new Date() }
      mockPrisma.task.findFirst.mockResolvedValue(completedTask)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify({ status: TaskStatus.IN_PROGRESS }),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      await PUT(request, context)

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          completedAt: null
        }),
        include: expect.any(Object)
      })
    })

    it('should validate input data', async () => {
      const invalidData = {
        title: '', // Empty title
        estimatedHours: -5, // Negative hours
        status: 'INVALID_STATUS'
      }

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'PUT',
        body: JSON.stringify(invalidData),
        headers: { 'content-type': 'application/json' }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/tasks/[id]', () => {
    beforeEach(() => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)
      mockPrisma.task.delete.mockResolvedValue(mockTask)
      mockPrisma.auditLog.create.mockResolvedValue({} as any)
    })

    it('should delete task successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE'
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('Task deleted successfully')
      expect(mockPrisma.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' }
      })
    })

    it('should create audit log for deletion', async () => {
      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-agent'
        }
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      await DELETE(request, context)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          userId: 'user-1',
          action: 'delete',
          resourceType: 'task',
          resourceId: 'task-1',
          oldValues: {
            title: mockTask.title,
            status: mockTask.status,
            priority: mockTask.priority,
            assignedTo: mockTask.assignedTo
          },
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent'
        }
      })
    })

    it('should return 404 for non-existent task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks/non-existent', {
        method: 'DELETE'
      })
      const context = { params: Promise.resolve({ id: 'non-existent' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should prevent deletion of tasks with subtasks', async () => {
      const taskWithSubtasks = {
        ...mockTask,
        childTasks: [{ id: 'subtask-1' }]
      }
      mockPrisma.task.findFirst.mockResolvedValue(taskWithSubtasks)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE'
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
      expect(data.error.message).toBe('Cannot delete task with subtasks. Delete subtasks first.')
    })

    it('should prevent deletion of locked tasks by other users', async () => {
      const lockedTask = { ...mockTask, lockedBy: 'other-user' }
      const lockUser = createMockUser({ id: 'other-user', firstName: 'Jane', lastName: 'Smith' })
      
      mockPrisma.task.findFirst.mockResolvedValue(lockedTask)
      mockPrisma.user.findUnique.mockResolvedValue(lockUser)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE'
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
      expect(data.error.message).toBe('Task is locked by Jane Smith')
    })

    it('should allow deletion of tasks locked by same user', async () => {
      const selfLockedTask = { ...mockTask, lockedBy: 'user-1' }
      mockPrisma.task.findFirst.mockResolvedValue(selfLockedTask)

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE'
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.task.delete).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockPrisma.task.delete.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/tasks/task-1', {
        method: 'DELETE'
      })
      const context = { params: Promise.resolve({ id: 'task-1' }) }

      const response = await DELETE(request, context)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})