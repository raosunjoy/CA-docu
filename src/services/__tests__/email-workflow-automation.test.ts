import { EmailWorkflowAutomationService } from '../email-workflow-automation'
import { openaiService } from '../openai-service'
import { EmailData } from '@/types'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../../lib/prisma', () => ({
  prisma: {
    task: {
      create: jest.fn()
    }
  }
}))

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>

describe('EmailWorkflowAutomationService', () => {
  let service: EmailWorkflowAutomationService
  let mockEmailData: EmailData

  beforeEach(() => {
    service = new EmailWorkflowAutomationService()
    
    mockEmailData = {
      accountId: 'test-account',
      externalId: 'email-123',
      fromAddress: 'client@example.com',
      subject: 'Tax Notice - Response Required',
      bodyText: 'We have received a tax notice from the income tax department. Please review and respond.',
      receivedAt: new Date(),
      toAddresses: ['ca@firm.com'],
      attachments: [
        {
          filename: 'tax_notice.pdf',
          contentType: 'application/pdf',
          size: 1024 * 1024
        }
      ]
    }

    // Mock OpenAI service
    mockedOpenAIService.generateCompletion.mockResolvedValue({
      id: 'completion-123',
      content: JSON.stringify({
        category: 'tax_notice',
        priority: 'HIGH',
        urgency: 'high',
        clientMatch: 'client@example.com',
        suggestedActions: ['Review tax notice', 'Prepare response', 'Contact client'],
        extractedData: {
          deadline: '2025-08-31',
          amount: '50000',
          noticeType: 'demand'
        },
        confidence: 0.92
      }),
      usage: { prompt_tokens: 100, completion_tokens: 150, total_tokens: 250 },
      model: 'gpt-4',
      created: Date.now()
    })

    // Mock Prisma task creation
    const { prisma } = require('../../lib/prisma')
    prisma.task.create.mockResolvedValue({
      id: 'task-123',
      title: 'Respond to Tax Notice'
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('processEmail', () => {
    it('should process email and generate insights', async () => {
      await service.initialize()
      
      const result = await service.processEmail(mockEmailData, 'org-123')

      expect(result.insights).toBeDefined()
      expect(result.insights.category).toBe('tax_notice')
      expect(result.insights.priority).toBe('HIGH')
      expect(result.insights.confidence).toBe(0.92)
      expect(result.actionsPerformed).toContain('Tax Notice Response: create_task')
      expect(result.tasksCreated).toHaveLength(1)
    })

    it('should handle AI service errors gracefully', async () => {
      mockedOpenAIService.generateCompletion.mockRejectedValue(new Error('AI service error'))
      
      await service.initialize()
      const result = await service.processEmail(mockEmailData, 'org-123')

      expect(result.insights.confidence).toBe(0.5)
      expect(result.insights.category).toBe('general')
      expect(result.insights.suggestedActions).toContain('Review manually')
    })

    it('should match tax notice workflow rules', async () => {
      const taxNoticeEmail = {
        ...mockEmailData,
        fromAddress: 'notices@incometax.gov.in',
        subject: 'Income Tax Notice - Immediate Attention Required'
      }

      await service.initialize()
      const result = await service.processEmail(taxNoticeEmail, 'org-123')

      expect(result.actionsPerformed).toContain('Tax Notice Response: create_task')
      expect(result.actionsPerformed).toContain('Tax Notice Response: assign_tags')
    })

    it('should match client document request workflow', async () => {
      const documentRequestEmail = {
        ...mockEmailData,
        subject: 'Document Request - Bank Statements',
        bodyText: 'Hi, please send me the bank statements for July 2025 for audit purposes.'
      }

      await service.initialize()
      const result = await service.processEmail(documentRequestEmail, 'org-123')

      expect(result.actionsPerformed).toContain('Client Document Request: create_task')
    })

    it('should handle emails that do not match any rules', async () => {
      const generalEmail = {
        ...mockEmailData,
        fromAddress: 'friend@personal.com',
        subject: 'How are you?',
        bodyText: 'Just checking in to see how you are doing.'
      }

      await service.initialize()
      const result = await service.processEmail(generalEmail, 'org-123')

      expect(result.actionsPerformed).toHaveLength(0)
      expect(result.tasksCreated).toHaveLength(0)
    })
  })

  describe('createCustomWorkflowRule', () => {
    it('should create custom workflow rule', async () => {
      const ruleData = {
        name: 'Custom Audit Rule',
        conditions: [
          { field: 'subject' as const, operator: 'contains' as const, value: 'audit' }
        ],
        actions: [
          { type: 'create_task' as const, config: { title: 'Handle Audit Request' } }
        ],
        priority: 1,
        isActive: true
      }

      const ruleId = await service.createCustomWorkflowRule(ruleData, 'org-123')

      expect(ruleId).toBeDefined()
      expect(ruleId).toMatch(/^custom_\d+$/)
    })
  })

  describe('getWorkflowStatistics', () => {
    it('should return workflow statistics', async () => {
      const stats = await service.getWorkflowStatistics('org-123')

      expect(stats).toBeDefined()
      expect(stats.totalEmailsProcessed).toBeGreaterThan(0)
      expect(stats.tasksCreated).toBeGreaterThan(0)
      expect(stats.rulesTriggered).toBeDefined()
      expect(stats.averageProcessingTime).toBeGreaterThan(0)
    })
  })

  describe('condition evaluation', () => {
    beforeEach(async () => {
      await service.initialize()
    })

    it('should evaluate contains condition correctly', () => {
      const email = { ...mockEmailData, subject: 'Tax Notice Required' }
      const condition = { field: 'subject' as const, operator: 'contains' as const, value: 'notice' }
      
      // Access private method through any type assertion for testing
      const result = (service as any).evaluateCondition(condition, email, {})
      expect(result).toBe(true)
    })

    it('should evaluate case insensitive conditions', () => {
      const email = { ...mockEmailData, subject: 'TAX NOTICE REQUIRED' }
      const condition = { 
        field: 'subject' as const, 
        operator: 'contains' as const, 
        value: 'notice',
        caseSensitive: false 
      }
      
      const result = (service as any).evaluateCondition(condition, email, {})
      expect(result).toBe(true)
    })

    it('should evaluate regex conditions', () => {
      const email = { ...mockEmailData, subject: 'Notice-12345 from IT Department' }
      const condition = { 
        field: 'subject' as const, 
        operator: 'regex' as const, 
        value: 'Notice-\\d+'
      }
      
      const result = (service as any).evaluateCondition(condition, email, {})
      expect(result).toBe(true)
    })

    it('should handle invalid regex gracefully', () => {
      const email = { ...mockEmailData, subject: 'Test subject' }
      const condition = { 
        field: 'subject' as const, 
        operator: 'regex' as const, 
        value: '[invalid-regex'
      }
      
      const result = (service as any).evaluateCondition(condition, email, {})
      expect(result).toBe(false)
    })
  })

  describe('task creation from email', () => {
    it('should create task with correct metadata', async () => {
      const { prisma } = require('../../lib/prisma')
      await service.initialize()
      
      const config = {
        title: 'Test Task',
        priority: 'HIGH',
        estimatedHours: 4,
        dueDate: '+7days'
      }

      const insights = {
        category: 'test',
        priority: 'HIGH' as const,
        urgency: 'high' as const,
        suggestedActions: ['Test action'],
        extractedData: {},
        confidence: 0.9
      }

      const result = await (service as any).createTaskFromEmail(
        config, 
        mockEmailData, 
        insights, 
        'org-123'
      )

      expect(result.success).toBe(true)
      expect(result.taskId).toBe('task-123')
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Test Task',
          organizationId: 'org-123',
          metadata: expect.objectContaining({
            source: 'email_automation',
            emailId: 'email-123',
            aiInsights: insights
          })
        })
      })
    })

    it('should handle task creation errors', async () => {
      const { prisma } = require('../../lib/prisma')
      prisma.task.create.mockRejectedValue(new Error('Database error'))

      await service.initialize()
      
      const result = await (service as any).createTaskFromEmail(
        { title: 'Test Task' },
        mockEmailData,
        { category: 'test', priority: 'LOW', urgency: 'low', suggestedActions: [], extractedData: {}, confidence: 0.5 },
        'org-123'
      )

      expect(result.success).toBe(false)
    })
  })
})