import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { authMiddleware } from '@/lib/middleware'
import { getTasksPaginated, validateTaskAssignee, validateParentTask, createTaskWithIncludes } from '@/lib/task-service'
import { TaskStatus, TaskPriority } from '@/types'
import { createMockTask, createMockUser } from '@/test-utils'

// Helper function to create NextRequest
const createRequest = (url: string, options?: RequestInit) => {
  return new NextRequest(new Request(url, options))
}

// Mock dependencies
jest.mock('@/lib/middleware', () => ({
  authMiddleware: jest.fn(),
}))

jest.mock('@/lib/task-service', () => ({
  getTasksPaginated: jest.fn(),
  validateTaskAssignee: jest.fn(),
  validateParentTask: jest.fn(),
  createTaskWithIncludes: jest.fn(),
}))

const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>
const mockGetTasksPaginated = getTasksPaginated as jest.MockedFunction<typeof getTasksPaginated>
const mockValidateTaskAssignee = validateTaskAssignee as jest.MockedFunction<typeof validateTaskAssignee>
const mockValidateParentTask = validateParentTask as jest.MockedFunction<typeof validateParentTask>
const mockCreateTaskWithIncludes = createTaskWithIncludes as jest.MockedFunction<typeof createTaskWithIncludes>

describe('/api/tasks', () => {
  const mockUser = {
    sub: 'user-1',
    email: 'test@example.com',
    role: 'ASSOCIATE',
    orgId: 'org-1',
    permissions: ['task:read', 'task:create']
  }

  const mockAuthResult = { user: mockUser }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthMiddleware.mockImplementation(() => async () => mockAuthResult)
  })

  describe('GET /api/tasks', () => {
    const mockTasksResponse = {
      tasks: [
        createMockTask({
          id: 'task-1',
          title: 'Test Task 1',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          organizationId: 'org-1'
        }),
        createMockTask({
          id: 'task-2',
          title: 'Test Task 2',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          organizationId: 'org-1'
        })
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      }
    }

    beforeEach(() => {
      mockGetTasksPaginated.mockResolvedValue(mockTasksResponse)
    })

    it('should return tasks with default pagination', async () => {
      const request = createRequest('http://localhost:3000/api/tasks')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockTasksResponse)
      expect(mockGetTasksPaginated).toHaveBeenCalledWith(
        'org-1',
        {
          search: null,
          assignedTo: null,
          createdBy: null,
          parentTaskId: null
        },
        {
          field: 'createdAt',
          direction: 'desc'
        },
        1,
        20
      )
    })

    it('should handle query parameters correctly', async () => {
      const request = createRequest('http://localhost:3000/api/tasks?page=2&limit=10&status=TODO&priority=HIGH&assignedTo=user-1&search=test&sortBy=title&sortOrder=asc')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockGetTasksPaginated).toHaveBeenCalledWith(
        'org-1',
        {
          search: 'test',
          assignedTo: 'user-1',
          createdBy: null,
          parentTaskId: null,
          status: 'TODO',
          priority: 'HIGH'
        },
        {
          field: 'title',
          direction: 'asc'
        },
        2,
        10
      )
    })

    it('should limit page size to maximum of 100', async () => {
      const request = createRequest('http://localhost:3000/api/tasks?limit=200')

      await GET(request)

      expect(mockGetTasksPaginated).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.any(Number),
        100
      )
    })

    it('should handle invalid query parameters', async () => {
      const request = createRequest('http://localhost:3000/api/tasks?page=invalid&sortBy=invalid')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
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

      const request = createRequest('http://localhost:3000/api/tasks')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle service errors', async () => {
      mockGetTasksPaginated.mockRejectedValue(new Error('Database error'))

      const request = createRequest('http://localhost:3000/api/tasks')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('POST /api/tasks', () => {
    const validTaskData = {
      title: 'New Task',
      description: 'Task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      assignedTo: 'user-2',
      parentTaskId: 'parent-task-1',
      dueDate: '2024-12-31T23:59:59.000Z',
      estimatedHours: 8,
      metadata: { category: 'development' }
    }

    const mockCreatedTask = createMockTask({
      id: 'task-1',
      ...validTaskData,
      organizationId: 'org-1',
      createdBy: 'user-1',
      assignedUser: createMockUser({ id: 'user-2' }),
      createdByUser: createMockUser({ id: 'user-1' })
    })

    beforeEach(() => {
      mockValidateTaskAssignee.mockResolvedValue(createMockUser({ id: 'user-2' }))
      mockValidateParentTask.mockResolvedValue(createMockTask({ id: 'parent-task-1' }))
      mockCreateTaskWithIncludes.mockResolvedValue(mockCreatedTask)
    })

    it('should create task successfully with valid data', async () => {
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockCreatedTask)
      expect(mockCreateTaskWithIncludes).toHaveBeenCalledWith({
        organizationId: 'org-1',
        title: 'New Task',
        description: 'Task description',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        assignedTo: 'user-2',
        createdBy: 'user-1',
        parentTaskId: 'parent-task-1',
        dueDate: new Date('2024-12-31T23:59:59.000Z'),
        estimatedHours: 8,
        metadata: { category: 'development' }
      })
    })

    it('should create task with minimal required data', async () => {
      const minimalTaskData = {
        title: 'Minimal Task'
      }

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(minimalTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockCreateTaskWithIncludes).toHaveBeenCalledWith({
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
      })
    })

    it('should validate required fields', async () => {
      const invalidTaskData = {
        title: '', // Empty title
        description: 'Task description'
      }

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['title'],
            message: 'Title is required'
          })
        ])
      )
    })

    it('should validate title length', async () => {
      const invalidTaskData = {
        title: 'A'.repeat(201) // Too long
      }

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate enum values', async () => {
      const invalidTaskData = {
        title: 'Valid Task',
        status: 'INVALID_STATUS',
        priority: 'INVALID_PRIORITY'
      }

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(invalidTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate assigned user exists', async () => {
      mockValidateTaskAssignee.mockResolvedValue(null)

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Task with invalid assignee',
          assignedTo: 'invalid-user-id'
        }),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Assigned user not found in organization')
    })

    it('should validate parent task exists', async () => {
      mockValidateParentTask.mockResolvedValue(null)

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Task with invalid parent',
          parentTaskId: 'invalid-parent-id'
        }),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Parent task not found')
    })

    it('should validate estimated hours is non-negative', async () => {
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Task with negative hours',
          estimatedHours: -5
        }),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate date format', async () => {
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Task with invalid date',
          dueDate: 'invalid-date'
        }),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
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

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should handle database errors', async () => {
      mockCreateTaskWithIncludes.mockRejectedValue(new Error('Database error'))

      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(validTaskData),
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle malformed JSON', async () => {
      const request = createRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: 'invalid-json',
        headers: { 'content-type': 'application/json' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})