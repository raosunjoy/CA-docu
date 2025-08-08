/**
 * Audit Service Tests
 * Comprehensive tests for audit logging functionality
 */

import { AuditService, AuditContext, AuditEvent } from '../audit-service'
import { AuditAction, AuditCategory, AuditSeverity } from '@prisma/client'

// Mock Prisma
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  auditLogIndex: {
    create: jest.fn(),
  },
  auditReport: {
    create: jest.fn(),
    update: jest.fn(),
  },
} as any

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted-'),
    final: jest.fn(() => 'data'),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted-'),
    final: jest.fn(() => 'data'),
  })),
  randomUUID: jest.fn(() => 'mock-uuid'),
}))

describe('AuditService', () => {
  let auditService: AuditService
  let mockContext: AuditContext
  let mockEvent: AuditEvent

  beforeEach(() => {
    auditService = new AuditService(mockPrisma)
    
    mockContext = {
      userId: 'user-123',
      organizationId: 'org-123',
      sessionId: 'session-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      deviceId: 'device-123',
      requestId: 'req-123',
      endpoint: '/api/test',
      method: 'GET',
    }

    mockEvent = {
      action: AuditAction.READ,
      category: AuditCategory.DATA_ACCESS,
      severity: AuditSeverity.LOW,
      description: 'Test audit event',
      resourceType: 'test_resource',
      resourceId: 'resource-123',
      resourceName: 'Test Resource',
      metadata: { test: 'data' },
      tags: ['test'],
      complianceFlags: ['TEST_FLAG'],
    }

    // Reset mocks
    jest.clearAllMocks()
  })

  describe('logEvent', () => {
    it('should log audit event successfully', async () => {
      mockPrisma.auditLog.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      await auditService.logEvent(mockContext, mockEvent)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockContext.organizationId,
          userId: mockContext.userId,
          sessionId: mockContext.sessionId,
          action: mockEvent.action,
          category: mockEvent.category,
          severity: mockEvent.severity,
          description: mockEvent.description,
          resourceType: mockEvent.resourceType,
          resourceId: mockEvent.resourceId,
          resourceName: mockEvent.resourceName,
          ipAddress: mockContext.ipAddress,
          userAgent: mockContext.userAgent,
          deviceId: mockContext.deviceId,
          requestId: mockContext.requestId,
          endpoint: mockContext.endpoint,
          method: mockContext.method,
          complianceFlags: mockEvent.complianceFlags,
          metadata: mockEvent.metadata,
          tags: mockEvent.tags,
          checksum: expect.any(String),
        })
      })

      expect(mockPrisma.auditLogIndex.create).toHaveBeenCalled()
    })

    it('should handle sensitive data encryption', async () => {
      mockPrisma.auditLog.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      const eventWithSensitiveData = {
        ...mockEvent,
        oldValues: { password: 'secret123', email: 'test@example.com' },
        newValues: { password: 'newsecret456', email: 'new@example.com' },
      }

      await auditService.logEvent(mockContext, eventWithSensitiveData)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValues: expect.objectContaining({
            password: 'encrypted-data',
            email: 'test@example.com', // Non-sensitive field not encrypted
          }),
          newValues: expect.objectContaining({
            password: 'encrypted-data',
            email: 'new@example.com',
          }),
        })
      })
    })

    it('should calculate risk score automatically', async () => {
      mockPrisma.auditLog.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      const highRiskEvent = {
        ...mockEvent,
        action: AuditAction.DELETE,
        severity: AuditSeverity.CRITICAL,
        category: AuditCategory.SECURITY,
        complianceFlags: ['GDPR', 'SOX', 'HIPAA'],
      }

      await auditService.logEvent(mockContext, highRiskEvent)

      const createCall = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(createCall.data.riskScore).toBeGreaterThan(50)
    })

    it('should handle errors gracefully', async () => {
      mockPrisma.auditLog.findFirst.mockRejectedValue(new Error('Database error'))

      // Should not throw - audit logging should not break application flow
      await expect(auditService.logEvent(mockContext, mockEvent)).resolves.toBeUndefined()
    })

    it('should chain audit logs for integrity', async () => {
      const previousLog = { id: 'prev-audit-123', checksum: 'prev-hash' }
      mockPrisma.auditLog.findFirst.mockResolvedValue(previousLog)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      await auditService.logEvent(mockContext, mockEvent)

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          previousLogId: previousLog.id,
        })
      })
    })
  })

  describe('searchAuditLogs', () => {
    it('should search audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          action: AuditAction.READ,
          category: AuditCategory.DATA_ACCESS,
          severity: AuditSeverity.LOW,
          description: 'Test log 1',
          oldValues: null,
          newValues: null,
          user: {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            role: 'ASSOCIATE',
          },
        },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)
      mockPrisma.auditLog.count.mockResolvedValue(1)

      const filters = {
        organizationId: 'org-123',
        actions: [AuditAction.READ],
        categories: [AuditCategory.DATA_ACCESS],
        limit: 50,
        offset: 0,
      }

      const result = await auditService.searchAuditLogs(filters)

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        hasMore: false,
      })

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: 'org-123',
          action: { in: [AuditAction.READ] },
          category: { in: [AuditCategory.DATA_ACCESS] },
        }),
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            }
          }
        },
        orderBy: { occurredAt: 'desc' },
        take: 50,
        skip: 0,
      })
    })

    it('should handle text search', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      const filters = {
        organizationId: 'org-123',
        searchText: 'test search',
      }

      await auditService.searchAuditLogs(filters)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { description: { contains: 'test search', mode: 'insensitive' } },
            { resourceName: { contains: 'test search', mode: 'insensitive' } },
            { changesSummary: { contains: 'test search', mode: 'insensitive' } },
          ],
        }),
        include: expect.any(Object),
        orderBy: { occurredAt: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should handle date range filters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      const dateFrom = new Date('2023-01-01')
      const dateTo = new Date('2023-12-31')

      const filters = {
        organizationId: 'org-123',
        dateFrom,
        dateTo,
      }

      await auditService.searchAuditLogs(filters)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          occurredAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
        include: expect.any(Object),
        orderBy: { occurredAt: 'desc' },
        take: 100,
        skip: 0,
      })
    })

    it('should handle risk score range filters', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      const filters = {
        organizationId: 'org-123',
        riskScoreMin: 25,
        riskScoreMax: 75,
      }

      await auditService.searchAuditLogs(filters)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          riskScore: {
            gte: 25,
            lte: 75,
          },
        }),
        include: expect.any(Object),
        orderBy: { occurredAt: 'desc' },
        take: 100,
        skip: 0,
      })
    })
  })

  describe('generateComplianceReport', () => {
    it('should create compliance report', async () => {
      const reportId = 'report-123'
      mockPrisma.auditReport.create.mockResolvedValue({ id: reportId })

      const config = {
        name: 'Test Report',
        description: 'Test compliance report',
        reportType: 'compliance' as const,
        filters: {
          organizationId: 'org-123',
          actions: [AuditAction.READ],
        },
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
        },
        format: 'pdf' as const,
      }

      const result = await auditService.generateComplianceReport(config)

      expect(result).toBe(reportId)
      expect(mockPrisma.auditReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: config.name,
          description: config.description,
          reportType: config.reportType,
          filters: config.filters,
          dateRange: config.dateRange,
          fileFormat: config.format,
          status: 'generating',
          generatedBy: expect.any(String),
        })
      })
    })

    it('should handle report generation errors', async () => {
      mockPrisma.auditReport.create.mockRejectedValue(new Error('Database error'))

      const config = {
        name: 'Test Report',
        reportType: 'compliance' as const,
        filters: { organizationId: 'org-123' },
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
        },
        format: 'pdf' as const,
      }

      await expect(auditService.generateComplianceReport(config))
        .rejects.toThrow('Failed to generate compliance report')
    })
  })

  describe('verifyIntegrity', () => {
    it('should verify audit log integrity successfully', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          checksum: 'mock-hash',
          previousLogId: null,
          organizationId: 'org-123',
          userId: 'user-123',
          action: AuditAction.READ,
          category: AuditCategory.DATA_ACCESS,
          severity: AuditSeverity.LOW,
          description: 'Test log 1',
          resourceType: 'test',
          resourceId: 'res-1',
          resourceName: 'Test Resource',
          oldValues: null,
          newValues: null,
          changesSummary: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          deviceId: 'device-1',
          location: null,
          requestId: 'req-1',
          endpoint: '/api/test',
          method: 'GET',
          complianceFlags: [],
          riskScore: 10,
          metadata: {},
          tags: [],
          occurredAt: new Date(),
        },
        {
          id: 'audit-2',
          checksum: 'mock-hash',
          previousLogId: 'audit-1',
          organizationId: 'org-123',
          userId: 'user-123',
          action: AuditAction.UPDATE,
          category: AuditCategory.DATA_MODIFICATION,
          severity: AuditSeverity.MEDIUM,
          description: 'Test log 2',
          resourceType: 'test',
          resourceId: 'res-2',
          resourceName: 'Test Resource 2',
          oldValues: null,
          newValues: null,
          changesSummary: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          deviceId: 'device-1',
          location: null,
          requestId: 'req-2',
          endpoint: '/api/test',
          method: 'PUT',
          complianceFlags: [],
          riskScore: 20,
          metadata: {},
          tags: [],
          occurredAt: new Date(),
        },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)

      const result = await auditService.verifyIntegrity('org-123')

      expect(result).toEqual({
        isValid: true,
        brokenChains: [],
        invalidChecksums: [],
      })
    })

    it('should detect broken chains', async () => {
      const mockLogs = [
        {
          id: 'audit-1',
          checksum: 'mock-hash',
          previousLogId: 'missing-audit',
          organizationId: 'org-123',
          userId: 'user-123',
          action: AuditAction.READ,
          category: AuditCategory.DATA_ACCESS,
          severity: AuditSeverity.LOW,
          description: 'Test log 1',
          resourceType: 'test',
          resourceId: 'res-1',
          resourceName: 'Test Resource',
          oldValues: null,
          newValues: null,
          changesSummary: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          deviceId: 'device-1',
          location: null,
          requestId: 'req-1',
          endpoint: '/api/test',
          method: 'GET',
          complianceFlags: [],
          riskScore: 10,
          metadata: {},
          tags: [],
          occurredAt: new Date(),
        },
      ]

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs)

      const result = await auditService.verifyIntegrity('org-123')

      expect(result).toEqual({
        isValid: false,
        brokenChains: ['audit-1'],
        invalidChecksums: [],
      })
    })
  })

  describe('archiveOldLogs', () => {
    it('should archive old logs', async () => {
      mockPrisma.auditLog.updateMany.mockResolvedValue({ count: 5 })

      const result = await auditService.archiveOldLogs('org-123', 365)

      expect(result).toBe(5)
      expect(mockPrisma.auditLog.updateMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
          createdAt: { lt: expect.any(Date) },
          metadata: {
            path: ['archived'],
            equals: undefined
          }
        },
        data: {
          metadata: {
            archived: true,
            archivedAt: expect.any(String),
          }
        }
      })
    })
  })

  describe('Risk Score Calculation', () => {
    it('should calculate higher risk for delete operations', async () => {
      mockPrisma.auditLog.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      const deleteEvent = {
        ...mockEvent,
        action: AuditAction.DELETE,
        severity: AuditSeverity.HIGH,
      }

      await auditService.logEvent(mockContext, deleteEvent)

      const createCall = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(createCall.data.riskScore).toBeGreaterThan(30)
    })

    it('should calculate higher risk for security category', async () => {
      mockPrisma.auditLog.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      const securityEvent = {
        ...mockEvent,
        category: AuditCategory.SECURITY,
        complianceFlags: ['SECURITY_BREACH', 'UNAUTHORIZED_ACCESS'],
      }

      await auditService.logEvent(mockContext, securityEvent)

      const createCall = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(createCall.data.riskScore).toBeGreaterThan(40)
    })

    it('should cap risk score at 100', async () => {
      mockPrisma.auditLog.findFirst.mockResolvedValue(null)
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-123' })
      mockPrisma.auditLogIndex.create.mockResolvedValue({})

      const extremeEvent = {
        ...mockEvent,
        action: AuditAction.RESTORE_BACKUP,
        severity: AuditSeverity.CRITICAL,
        category: AuditCategory.SECURITY,
        complianceFlags: ['GDPR', 'SOX', 'HIPAA', 'PCI_DSS', 'SECURITY_BREACH'],
      }

      await auditService.logEvent(mockContext, extremeEvent)

      const createCall = mockPrisma.auditLog.create.mock.calls[0][0]
      expect(createCall.data.riskScore).toBeLessThanOrEqual(100)
    })
  })
})