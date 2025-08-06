// Approval Workflow Service
// Handles multi-level approval workflows with role-based routing

import prisma from '@/lib/prisma'
import { 
  ApprovalStatus, 
  ApprovalDecision, 
  UserRole,
  ApprovalStep,
  ApprovalCondition,
  ApprovalWorkflowData,
  ApprovalRequestData,
  ApprovalDecisionData,
  ApprovalTemplateData,
  ApprovalDelegateData
} from '@/types'

export interface ApprovalWorkflowResult {
  id: string
  name: string
  description?: string
  steps: ApprovalStep[]
  isActive: boolean
  taskId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface ApprovalRequestResult {
  id: string
  workflowId: string
  taskId: string
  stepNumber: number
  approverId: string
  delegatedFrom?: string
  status: ApprovalStatus
  decision?: ApprovalDecision
  comments?: string
  decidedAt?: Date
  expiresAt?: Date
  reminderSentAt?: Date
  createdAt: Date
  updatedAt: Date
  approver: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: UserRole
  }
  task: {
    id: string
    title: string
    status: string
    priority: string
  }
}

export class ApprovalService {
  // Create approval workflow for a task
  static async createWorkflow(
    organizationId: string,
    workflowData: ApprovalWorkflowData,
    createdBy: string
  ): Promise<ApprovalWorkflowResult> {
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        organizationId,
        taskId: workflowData.taskId,
        name: workflowData.name,
        description: workflowData.description,
        steps: workflowData.steps as any,
        createdBy,
      }
    })

    // Update task to require approval
    await prisma.task.update({
      where: { id: workflowData.taskId },
      data: {
        requiresApproval: true,
        approvalStatus: ApprovalStatus.PENDING,
        currentApprovalStep: 0
      }
    })

    // Create initial approval requests for first step
    await this.createApprovalRequestsForStep(workflow.id, 0)

    return workflow as ApprovalWorkflowResult
  }

  // Create approval requests for a specific step
  static async createApprovalRequestsForStep(
    workflowId: string,
    stepNumber: number
  ): Promise<ApprovalRequestResult[]> {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId },
      include: { task: true }
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    const steps = workflow.steps as ApprovalStep[]
    const currentStep = steps[stepNumber]

    if (!currentStep) {
      throw new Error('Invalid step number')
    }

    // Get approvers for this step
    const approvers = await this.getApproversForStep(
      workflow.organizationId,
      currentStep
    )

    // Check for active delegates
    const approversWithDelegates = await this.resolveApproverDelegates(
      workflow.organizationId,
      approvers
    )

    // Create approval requests
    const requests = await Promise.all(
      approversWithDelegates.map(async (approver) => {
        const expiresAt = currentStep.timeoutHours 
          ? new Date(Date.now() + currentStep.timeoutHours * 60 * 60 * 1000)
          : null

        return prisma.approvalRequest.create({
          data: {
            organizationId: workflow.organizationId,
            workflowId,
            taskId: workflow.taskId,
            stepNumber,
            approverId: approver.effectiveApproverId,
            delegatedFrom: approver.originalApproverId !== approver.effectiveApproverId 
              ? approver.originalApproverId 
              : null,
            expiresAt,
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
          }
        })
      })
    )

    return requests as ApprovalRequestResult[]
  }

  // Process approval decision
  static async processApprovalDecision(
    requestId: string,
    decision: ApprovalDecisionData,
    decidedBy: string
  ): Promise<{ success: boolean; nextStep?: boolean; workflowComplete?: boolean }> {
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        workflow: true,
        task: true
      }
    })

    if (!request) {
      throw new Error('Approval request not found')
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error('Approval request is not pending')
    }

    // Handle delegation
    if (decision.decision === ApprovalDecision.DELEGATE) {
      if (!decision.delegateToId) {
        throw new Error('Delegate ID is required for delegation')
      }

      await prisma.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: ApprovalStatus.DELEGATED,
          decision: decision.decision,
          comments: decision.comments,
          decidedAt: new Date()
        }
      })

      // Create new approval request for delegate
      await prisma.approvalRequest.create({
        data: {
          organizationId: request.organizationId,
          workflowId: request.workflowId,
          taskId: request.taskId,
          stepNumber: request.stepNumber,
          approverId: decision.delegateToId,
          delegatedFrom: request.approverId,
          expiresAt: request.expiresAt
        }
      })

      return { success: true }
    }

    // Update approval request
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: decision.decision === ApprovalDecision.APPROVE 
          ? ApprovalStatus.APPROVED 
          : ApprovalStatus.REJECTED,
        decision: decision.decision,
        comments: decision.comments,
        decidedAt: new Date()
      }
    })

    // Check if step is complete
    const stepComplete = await this.checkStepCompletion(
      request.workflowId,
      request.stepNumber
    )

    if (!stepComplete) {
      return { success: true }
    }

    // If step rejected, reject entire workflow
    if (decision.decision === ApprovalDecision.REJECT) {
      await this.rejectWorkflow(request.workflowId)
      return { success: true, workflowComplete: true }
    }

    // Move to next step or complete workflow
    const nextStepResult = await this.moveToNextStep(request.workflowId)
    
    return {
      success: true,
      nextStep: !nextStepResult.workflowComplete,
      workflowComplete: nextStepResult.workflowComplete
    }
  }

  // Check if current step is complete
  static async checkStepCompletion(
    workflowId: string,
    stepNumber: number
  ): Promise<boolean> {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId }
    })

    if (!workflow) {
      return false
    }

    const steps = workflow.steps as ApprovalStep[]
    const currentStep = steps[stepNumber]

    if (!currentStep) {
      return false
    }

    const requests = await prisma.approvalRequest.findMany({
      where: {
        workflowId,
        stepNumber,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] }
      }
    })

    const approvedCount = requests.filter(r => r.status === ApprovalStatus.APPROVED).length
    const rejectedCount = requests.filter(r => r.status === ApprovalStatus.REJECTED).length
    const pendingCount = requests.filter(r => r.status === ApprovalStatus.PENDING).length

    // If any rejection, step is complete (and failed)
    if (rejectedCount > 0) {
      return true
    }

    // Check if required approvals are met
    const requiredApprovals = currentStep.requiredApprovals || requests.length
    
    if (currentStep.isParallel) {
      // Parallel: need all or required number of approvals
      return approvedCount >= requiredApprovals
    } else {
      // Sequential: need at least one approval and no pending
      return approvedCount > 0 && pendingCount === 0
    }
  }

  // Move workflow to next step
  static async moveToNextStep(
    workflowId: string
  ): Promise<{ workflowComplete: boolean }> {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId },
      include: { task: true }
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    const steps = workflow.steps as ApprovalStep[]
    const currentStep = workflow.task.currentApprovalStep || 0
    const nextStep = currentStep + 1

    // Check if workflow is complete
    if (nextStep >= steps.length) {
      await this.completeWorkflow(workflowId)
      return { workflowComplete: true }
    }

    // Update task to next step
    await prisma.task.update({
      where: { id: workflow.taskId },
      data: {
        currentApprovalStep: nextStep
      }
    })

    // Create approval requests for next step
    await this.createApprovalRequestsForStep(workflowId, nextStep)

    return { workflowComplete: false }
  }

  // Complete workflow
  static async completeWorkflow(workflowId: string): Promise<void> {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId }
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    await prisma.task.update({
      where: { id: workflow.taskId },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        status: 'IN_PROGRESS' // Move task to in progress after approval
      }
    })
  }

  // Reject workflow
  static async rejectWorkflow(workflowId: string): Promise<void> {
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId }
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    await prisma.task.update({
      where: { id: workflow.taskId },
      data: {
        approvalStatus: ApprovalStatus.REJECTED
      }
    })

    // Cancel all pending requests
    await prisma.approvalRequest.updateMany({
      where: {
        workflowId,
        status: ApprovalStatus.PENDING
      },
      data: {
        status: ApprovalStatus.CANCELLED
      }
    })
  }

  // Get approvers for a step based on roles and conditions
  static async getApproversForStep(
    organizationId: string,
    step: ApprovalStep
  ): Promise<Array<{ originalApproverId: string; effectiveApproverId: string }>> {
    let approvers: string[] = []

    // Get approvers by role
    if (step.approverRoles && step.approverRoles.length > 0) {
      const usersByRole = await prisma.user.findMany({
        where: {
          organizationId,
          role: { in: step.approverRoles },
          isActive: true
        },
        select: { id: true }
      })
      approvers.push(...usersByRole.map(u => u.id))
    }

    // Add specific approver IDs
    if (step.approverIds && step.approverIds.length > 0) {
      approvers.push(...step.approverIds)
    }

    // Remove duplicates
    approvers = [...new Set(approvers)]

    return approvers.map(id => ({
      originalApproverId: id,
      effectiveApproverId: id
    }))
  }

  // Resolve approver delegates
  static async resolveApproverDelegates(
    organizationId: string,
    approvers: Array<{ originalApproverId: string; effectiveApproverId: string }>
  ): Promise<Array<{ originalApproverId: string; effectiveApproverId: string }>> {
    const now = new Date()

    const result = await Promise.all(
      approvers.map(async (approver) => {
        const delegate = await prisma.approvalDelegate.findFirst({
          where: {
            organizationId,
            delegatorId: approver.originalApproverId,
            isActive: true,
            startDate: { lte: now },
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        })

        return {
          originalApproverId: approver.originalApproverId,
          effectiveApproverId: delegate?.delegateId || approver.originalApproverId
        }
      })
    )

    return result
  }

  // Get pending approvals for user
  static async getPendingApprovalsForUser(
    userId: string,
    organizationId: string
  ): Promise<ApprovalRequestResult[]> {
    const requests = await prisma.approvalRequest.findMany({
      where: {
        organizationId,
        approverId: userId,
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

    return requests as ApprovalRequestResult[]
  }

  // Create approval template
  static async createTemplate(
    organizationId: string,
    templateData: ApprovalTemplateData,
    createdBy: string
  ): Promise<any> {
    return prisma.approvalTemplate.create({
      data: {
        organizationId,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        conditions: templateData.conditions as any,
        steps: templateData.steps as any,
        isDefault: templateData.isDefault || false,
        createdBy
      }
    })
  }

  // Create approval delegate
  static async createDelegate(
    organizationId: string,
    delegatorId: string,
    delegateData: ApprovalDelegateData
  ): Promise<any> {
    return prisma.approvalDelegate.create({
      data: {
        organizationId,
        delegatorId,
        delegateId: delegateData.delegateId,
        startDate: delegateData.startDate,
        endDate: delegateData.endDate,
        conditions: delegateData.conditions as any
      }
    })
  }

  // Send approval reminders
  static async sendApprovalReminders(): Promise<void> {
    const now = new Date()
    const reminderThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago

    const overdueRequests = await prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        createdAt: { lt: reminderThreshold },
        OR: [
          { reminderSentAt: null },
          { reminderSentAt: { lt: reminderThreshold } }
        ]
      },
      include: {
        approver: true,
        task: true,
        workflow: true
      }
    })

    // TODO: Implement notification service integration
    for (const request of overdueRequests) {
      // Send reminder notification
      console.log(`Sending reminder to ${request.approver.email} for task ${request.task.title}`)
      
      // Update reminder sent timestamp
      await prisma.approvalRequest.update({
        where: { id: request.id },
        data: { reminderSentAt: now }
      })
    }
  }
}