// Approval API Tests

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { authMiddleware } from '@/lib/middleware'
import { ApprovalService } from '@/lib/approval-service'
import prisma from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/middleware')
jest.mock('@/lib/approval-service')
jest.mock('@/lib/prisma', () => ({
  approvalWorkflow: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  task: {
    findFirst: jest.fn(),
  },
}))

const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>
const mockApprovalService = ApprovalService as jest.Mocked<typeof ApprovalService>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/approvals', () => {
  const mockUser = {
    sub: 'user-1',
    orgId: 'org-1',
    role: 'MANAGER'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuthMiddleware.mockReturnValue(jest.fn().mockResolvedValue({ user: mockUser }))
  })

  describe('GET', () => {
    it('should return workflows for organization', async () => {
      const mockWorkflows = [
        {
          id: 'workflow-1',
          name: 'Test Workflow',
          taskId: 'task-1',
          isActive: true,
          task: { id: 'task-1', title: 'Test Task' },
          creator: { id: 'user-1', firstName: 'John', lastName: 'Doe' }
        }
      ]

      mockPrisma.approvalWorkflow.findMany.mockResolvedValue(mockWorkflows as any)
      mockPrisma.approvalWorkflow.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost/api/approvals')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.workflows).toEqual(mockWorkflows)
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      })
    })

    it('should filter workflows by taskId', async () => {
      const mockWorkflows = [
        {
          id: 'workflow-1',
          name: 'Test Workflow',
          taskId: 'task-1',
          isActive: true
        }
      ]

      mockPrisma.approvalWorkflow.findMany.mockResolvedValue(mockWorkflows as any)
      mockPrisma.approvalWorkflow.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost/api/approvals?taskId=task-1')
      const response = await GET(request)

      expect(mockPrisma.approvalWorkflow.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          taskId: 'task-1'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      })
    })

    it('should handle validation errors', async () => {
      const url = new URL('http://localhost/api/approvals')
      url.searchParams.set('page', 'invalid')
      const request = new NextRequest(url.toString())
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
        taskId: 'task-1',
        steps: [
          {
            stepNumber: 0,
            name: 'Manager Review',
            approverRoles: ['MANAGER'],
            isParallel: false
          }
        ]
      }

      const mockTask = {
        id: 'task-1',
        organizationId: 'org-1'
      }

      const mockWorkflow = {
        id: 'workflow-1',
        ...workflowData,
        organizationId: 'org-1',
        createdBy: 'user-1'
      }

      mockPrisma.task.findFirst.mockResolvedValue(mockTask as any)
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(null)
      mockApprovalService.createWorkflow.mockResolvedValue(mockWorkflow as any)

      const request = new NextRequest('http://localhost/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockWorkflow)

      expect(mockApprovalService.createWorkflow).toHaveBeenCalledWith(
        'org-1',
        workflowData,
        'user-1'
      )
    })

    it('should return 404 if task not found', async () => {
      const workflowData = {
        name: 'Test Workflow',
        taskId: 'nonexistent-task',
        steps: [
          {
            stepNumber: 0,
            name: 'Manager Review',
            approverRoles: ['MANAGER'],
            isParallel: false
          }
        ]
      }

      mockPrisma.task.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Task not found')
    })

    it('should return 409 if task already has active workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        taskId: 'task-1',
        steps: [
          {
            stepNumber: 0,
            name: 'Manager Review',
            approverRoles: ['MANAGER'],
            isParallel: false
          }
        ]
      }

      const mockTask = {
        id: 'task-1',
        organizationId: 'org-1'
      }

      const mockExistingWorkflow = {
        id: 'existing-workflow',
        taskId: 'task-1',
        isActive: true
      }

      mockPrisma.task.findFirst.mockResolvedValue(mockTask as any)
      mockPrisma.approvalWorkflow.findFirst.mockResolvedValue(mockExistingWorkflow as any)

      const request = new NextRequest('http://localhost/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflowData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
      expect(data.error.message).toBe('Task already has an active approval workflow')
    })

    it('should handle validation errors', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        taskId: 'task-1',
        steps: [] // Invalid: no steps
      }

      const request = new NextRequest('http://localhost/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })
})