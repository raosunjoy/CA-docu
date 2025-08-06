// Approval Service Tests

import { ApprovalService } from '../approval-service'
import prisma from '../prisma'

// Define enums for testing
enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELEGATED = 'DELEGATED',
  CANCELLED = 'CANCELLED'
}

enum ApprovalDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DELEGATE = 'DELEGATE',
  REQUEST_CHANGES = 'REQUEST_CHANGES'
}

enum UserRole {
  PARTNER = 'PARTNER',
  MANAGER = 'MANAGER',
  ASSOCIATE = 'ASSOCIATE',
  INTERN = 'INTERN',
  ADMIN = 'ADMIN'
}

// Mock Prisma
jest.mock('../prisma', () => ({
  approvalWorkflow: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  approvalRequest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  approvalTemplate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
  approvalDelegate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  task: {
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('ApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createWorkflow', () => {
    it('should create workflow and update task', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'Test Description',
        taskId: 'task-1',
        steps: [
          {
            stepNumber: 0,
            name: 'Manager Review',
            approverRoles: [UserRole.MANAGER],
            isParallel: false
          }
        ]
      }

      const mockWorkflow = {
        id: 'workflow-1',
        organizationId: 'org-1',
        taskId: 'task-1',
        name: 'Test Workflow',
        description: 'Test Description',
        steps: workflowData.steps,
        isActive: true,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.approvalWorkflow.create.mockResolvedValue(mockWorkflow as any)
      mockPrisma.task.update.mockResolvedValue({} as any)
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'manager-1', role: UserRole.MANAGER }
      ] as any)

      // Mock createApprovalRequestsForStep
      jest.spyOn(ApprovalService, 'createApprovalRequestsForStep').mockResolvedValue([] as any)

      const result = await ApprovalService.createWorkflow('org-1', workflowData, 'user-1')

      expect(mockPrisma.approvalWorkflow.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          taskId: 'task-1',
          name: 'Test Workflow',
          description: 'Test Description',
          steps: workflowData.steps,
          createdBy: 'user-1'
        }
      })

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          requiresApproval: true,
          approvalStatus: ApprovalStatus.PENDING,
          currentApprovalStep: 0
        }
      })

      expect(result).toEqual(mockWorkflow)
    })
  })

  describe('processApprovalDecision', () => {
    it('should approve request and move to next step', async () => {
      const mockRequest = {
        id: 'request-1',
        workflowId: 'workflow-1',
        taskId: 'task-1',
        stepNumber: 0,
        approverId: 'user-1',
        status: ApprovalStatus.PENDING,
        workflow: {
          id: 'workflow-1',
          organizationId: 'org-1',
          steps: [
            { stepNumber: 0, name: 'Step 1' },
            { stepNumber: 1, name: 'Step 2' }
          ]
        },
        task: {
          id: 'task-1',
          currentApprovalStep: 0
        }
      }

      const decision = {
        decision: ApprovalDecision.APPROVE,
        comments: 'Looks good'
      }

      mockPrisma.approvalRequest.findUnique.mockResolvedValue(mockRequest as any)
      mockPrisma.approvalRequest.update.mockResolvedValue({} as any)
      mockPrisma.task.update.mockResolvedValue({} as any)

      // Mock step completion check
      jest.spyOn(ApprovalService, 'checkStepCompletion').mockResolvedValue(true)
      jest.spyOn(ApprovalService, 'moveToNextStep').mockResolvedValue({ workflowComplete: false })

      const result = await ApprovalService.processApprovalDecision('request-1', decision, 'user-1')

      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          status: ApprovalStatus.APPROVED,
          decision: ApprovalDecision.APPROVE,
          comments: 'Looks good',
          decidedAt: expect.any(Date)
        }
      })

      expect(result).toEqual({
        success: true,
        nextStep: true,
        workflowComplete: false
      })
    })

    it('should reject request and reject workflow', async () => {
      const mockRequest = {
        id: 'request-1',
        workflowId: 'workflow-1',
        taskId: 'task-1',
        stepNumber: 0,
        approverId: 'user-1',
        status: ApprovalStatus.PENDING,
        workflow: {
          id: 'workflow-1',
          organizationId: 'org-1'
        },
        task: {
          id: 'task-1'
        }
      }

      const decision = {
        decision: ApprovalDecision.REJECT,
        comments: 'Not approved'
      }

      mockPrisma.approvalRequest.findUnique.mockResolvedValue(mockRequest as any)
      mockPrisma.approvalRequest.update.mockResolvedValue({} as any)

      // Mock step completion check
      jest.spyOn(ApprovalService, 'checkStepCompletion').mockResolvedValue(true)
      jest.spyOn(ApprovalService, 'rejectWorkflow').mockResolvedValue()

      const result = await ApprovalService.processApprovalDecision('request-1', decision, 'user-1')

      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          status: ApprovalStatus.REJECTED,
          decision: ApprovalDecision.REJECT,
          comments: 'Not approved',
          decidedAt: expect.any(Date)
        }
      })

      expect(result).toEqual({
        success: true,
        workflowComplete: true
      })
    })

    it('should delegate request to another user', async () => {
      const mockRequest = {
        id: 'request-1',
        workflowId: 'workflow-1',
        taskId: 'task-1',
        stepNumber: 0,
        approverId: 'user-1',
        status: ApprovalStatus.PENDING,
        organizationId: 'org-1',
        expiresAt: new Date()
      }

      const decision = {
        decision: ApprovalDecision.DELEGATE,
        delegateToId: 'user-2',
        comments: 'Delegating to specialist'
      }

      mockPrisma.approvalRequest.findUnique.mockResolvedValue(mockRequest as any)
      mockPrisma.approvalRequest.update.mockResolvedValue({} as any)
      mockPrisma.approvalRequest.create.mockResolvedValue({} as any)

      const result = await ApprovalService.processApprovalDecision('request-1', decision, 'user-1')

      expect(mockPrisma.approvalRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          status: ApprovalStatus.DELEGATED,
          decision: ApprovalDecision.DELEGATE,
          comments: 'Delegating to specialist',
          decidedAt: expect.any(Date)
        }
      })

      expect(mockPrisma.approvalRequest.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          workflowId: 'workflow-1',
          taskId: 'task-1',
          stepNumber: 0,
          approverId: 'user-2',
          delegatedFrom: 'user-1',
          expiresAt: mockRequest.expiresAt
        }
      })

      expect(result).toEqual({ success: true })
    })
  })

  describe('checkStepCompletion', () => {
    it('should return true when all parallel approvals are complete', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        steps: [
          {
            stepNumber: 0,
            isParallel: true,
            requiredApprovals: 2
          }
        ]
      }

      const mockRequests = [
        { status: ApprovalStatus.APPROVED },
        { status: ApprovalStatus.APPROVED },
        { status: ApprovalStatus.PENDING }
      ]

      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow as any)
      mockPrisma.approvalRequest.findMany.mockResolvedValue(mockRequests as any)

      const result = await ApprovalService.checkStepCompletion('workflow-1', 0)

      expect(result).toBe(true)
    })

    it('should return false when parallel approvals are incomplete', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        steps: [
          {
            stepNumber: 0,
            isParallel: true,
            requiredApprovals: 3
          }
        ]
      }

      const mockRequests = [
        { status: ApprovalStatus.APPROVED },
        { status: ApprovalStatus.PENDING },
        { status: ApprovalStatus.PENDING }
      ]

      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow as any)
      mockPrisma.approvalRequest.findMany.mockResolvedValue(mockRequests as any)

      const result = await ApprovalService.checkStepCompletion('workflow-1', 0)

      expect(result).toBe(false)
    })

    it('should return true when any request is rejected', async () => {
      const mockWorkflow = {
        id: 'workflow-1',
        steps: [
          {
            stepNumber: 0,
            isParallel: false
          }
        ]
      }

      const mockRequests = [
        { status: ApprovalStatus.APPROVED },
        { status: ApprovalStatus.REJECTED },
        { status: ApprovalStatus.PENDING }
      ]

      mockPrisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow as any)
      mockPrisma.approvalRequest.findMany.mockResolvedValue(mockRequests as any)

      const result = await ApprovalService.checkStepCompletion('workflow-1', 0)

      expect(result).toBe(true)
    })
  })

  describe('resolveApproverDelegates', () => {
    it('should resolve active delegates', async () => {
      const approvers = [
        { originalApproverId: 'user-1', effectiveApproverId: 'user-1' },
        { originalApproverId: 'user-2', effectiveApproverId: 'user-2' }
      ]

      const mockDelegate = {
        delegateId: 'user-3'
      }

      mockPrisma.approvalDelegate.findFirst
        .mockResolvedValueOnce(mockDelegate as any)
        .mockResolvedValueOnce(null)

      const result = await ApprovalService.resolveApproverDelegates('org-1', approvers)

      expect(result).toEqual([
        { originalApproverId: 'user-1', effectiveApproverId: 'user-3' },
        { originalApproverId: 'user-2', effectiveApproverId: 'user-2' }
      ])
    })
  })

  describe('getPendingApprovalsForUser', () => {
    it('should return pending approvals for user', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          approverId: 'user-1',
          status: ApprovalStatus.PENDING,
          approver: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
          task: { id: 'task-1', title: 'Test Task' }
        }
      ]

      mockPrisma.approvalRequest.findMany.mockResolvedValue(mockRequests as any)

      const result = await ApprovalService.getPendingApprovalsForUser('user-1', 'org-1')

      expect(mockPrisma.approvalRequest.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          approverId: 'user-1',
          status: ApprovalStatus.PENDING
        },
        include: {
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      expect(result).toEqual(mockRequests)
    })
  })
})