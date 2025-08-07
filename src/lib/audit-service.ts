/**
 * Comprehensive Audit Logging Service
 * Provides immutable audit trail for all user actions with compliance features
 */

import { PrismaClient, AuditAction, AuditCategory, AuditSeverity, UserRole } from '@prisma/client'
import crypto from 'crypto'
import { z } from 'zod'

// Audit context schema
const AuditContextSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  organizationId: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  deviceId: z.string().optional(),
  location: z.string().optional(),
  requestId: z.string().optional(),
  endpoint: z.string().optional(),
  method: z.string().optional(),
})

const AuditEventSchema = z.object({
  action: z.nativeEnum(AuditAction),
  category: z.nativeEnum(AuditCategory),
  severity: z.nativeEnum(AuditSeverity).default(AuditSeverity.LOW),
  description: z.string(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  resourceName: z.string().optional(),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  changesSummary: z.string().optional(),
  complianceFlags: z.array(z.string()).default([]),
  riskScore: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
  occurredAt: z.date().default(() => new Date()),
})

export type AuditContext = z.infer<typeof AuditContextSchema>
export type AuditEvent = z.infer<typeof AuditEventSchema>

export interface AuditSearchFilters {
  organizationId: string
  userId?: string
  actions?: AuditAction[]
  categories?: AuditCategory[]
  severities?: AuditSeverity[]
  resourceTypes?: string[]
  resourceIds?: string[]
  dateFrom?: Date
  dateTo?: Date
  complianceFlags?: string[]
  riskScoreMin?: number
  riskScoreMax?: number
  searchText?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface AuditReportConfig {
  name: string
  description?: string
  reportType: 'compliance' | 'security' | 'activity' | 'custom'
  filters: AuditSearchFilters
  dateRange: {
    start: Date
    end: Date
  }
  format: 'pdf' | 'excel' | 'csv' | 'json'
  isScheduled?: boolean
  schedule?: string // Cron expression
  allowedRoles?: UserRole[]
}

export class AuditService {
  private prisma: PrismaClient
  private encryptionKey: string
  private lastLogChecksum: string | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key-change-in-production'
  }

  /**
   * Log an audit event with full context and integrity checking
   */
  async logEvent(context: AuditContext, event: AuditEvent): Promise<void> {
    try {
      // Validate input
      const validatedContext = AuditContextSchema.parse(context)
      const validatedEvent = AuditEventSchema.parse(event)

      // Get the last log for chaining
      const lastLog = await this.getLastAuditLog(validatedContext.organizationId)
      
      // Encrypt sensitive data if needed
      const encryptedOldValues = validatedEvent.oldValues 
        ? await this.encryptSensitiveData(validatedEvent.oldValues)
        : null
      
      const encryptedNewValues = validatedEvent.newValues
        ? await this.encryptSensitiveData(validatedEvent.newValues)
        : null

      // Calculate risk score if not provided
      const riskScore = validatedEvent.riskScore || this.calculateRiskScore(validatedEvent)

      // Create audit log entry
      const auditLogData = {
        organizationId: validatedContext.organizationId,
        userId: validatedContext.userId,
        sessionId: validatedContext.sessionId,
        action: validatedEvent.action,
        category: validatedEvent.category,
        severity: validatedEvent.severity,
        description: validatedEvent.description,
        resourceType: validatedEvent.resourceType,
        resourceId: validatedEvent.resourceId,
        resourceName: validatedEvent.resourceName,
        oldValues: encryptedOldValues,
        newValues: encryptedNewValues,
        changesSummary: validatedEvent.changesSummary,
        ipAddress: validatedContext.ipAddress,
        userAgent: validatedContext.userAgent,
        deviceId: validatedContext.deviceId,
        location: validatedContext.location,
        requestId: validatedContext.requestId,
        endpoint: validatedContext.endpoint,
        method: validatedContext.method,
        complianceFlags: validatedEvent.complianceFlags,
        riskScore,
        metadata: validatedEvent.metadata,
        tags: validatedEvent.tags,
        occurredAt: validatedEvent.occurredAt,
        previousLogId: lastLog?.id,
      }

      // Calculate checksum for integrity
      const checksum = this.calculateChecksum(auditLogData)
      
      // Create the audit log
      const auditLog = await this.prisma.auditLog.create({
        data: {
          ...auditLogData,
          checksum,
        }
      })

      // Create search index
      await this.createSearchIndex(auditLog.id, auditLogData)

      // Check for high-risk events and trigger alerts
      if (riskScore >= 75) {
        await this.triggerSecurityAlert(auditLog)
      }

      // Update last log checksum for chaining
      this.lastLogChecksum = checksum

    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging should not break application flow
    }
  }

  /**
   * Search audit logs with advanced filtering
   */
  async searchAuditLogs(filters: AuditSearchFilters) {
    const {
      organizationId,
      userId,
      actions,
      categories,
      severities,
      resourceTypes,
      resourceIds,
      dateFrom,
      dateTo,
      complianceFlags,
      riskScoreMin,
      riskScoreMax,
      searchText,
      tags,
      limit = 100,
      offset = 0,
    } = filters

    const where: any = {
      organizationId,
    }

    if (userId) where.userId = userId
    if (actions?.length) where.action = { in: actions }
    if (categories?.length) where.category = { in: categories }
    if (severities?.length) where.severity = { in: severities }
    if (resourceTypes?.length) where.resourceType = { in: resourceTypes }
    if (resourceIds?.length) where.resourceId = { in: resourceIds }
    if (complianceFlags?.length) {
      where.complianceFlags = { hasSome: complianceFlags }
    }
    if (tags?.length) {
      where.tags = { hasSome: tags }
    }
    if (riskScoreMin !== undefined || riskScoreMax !== undefined) {
      where.riskScore = {}
      if (riskScoreMin !== undefined) where.riskScore.gte = riskScoreMin
      if (riskScoreMax !== undefined) where.riskScore.lte = riskScoreMax
    }
    if (dateFrom || dateTo) {
      where.occurredAt = {}
      if (dateFrom) where.occurredAt.gte = dateFrom
      if (dateTo) where.occurredAt.lte = dateTo
    }

    // Handle text search
    if (searchText) {
      where.OR = [
        { description: { contains: searchText, mode: 'insensitive' } },
        { resourceName: { contains: searchText, mode: 'insensitive' } },
        { changesSummary: { contains: searchText, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
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
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ])

    // Decrypt sensitive data for authorized users
    const decryptedLogs = await Promise.all(
      logs.map(async (log) => ({
        ...log,
        oldValues: log.oldValues ? await this.decryptSensitiveData(log.oldValues as any) : null,
        newValues: log.newValues ? await this.decryptSensitiveData(log.newValues as any) : null,
      }))
    )

    return {
      logs: decryptedLogs,
      total,
      hasMore: offset + limit < total,
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(config: AuditReportConfig): Promise<string> {
    const reportId = crypto.randomUUID()
    
    try {
      // Create report record
      const report = await this.prisma.auditReport.create({
        data: {
          id: reportId,
          organizationId: config.filters.organizationId,
          name: config.name,
          description: config.description,
          reportType: config.reportType,
          filters: config.filters as any,
          dateRange: config.dateRange as any,
          fileFormat: config.format,
          status: 'generating',
          isScheduled: config.isScheduled || false,
          schedule: config.schedule ? JSON.stringify(config.schedule) : null,
          allowedRoles: config.allowedRoles || [],
          generatedBy: config.filters.userId || 'system',
        }
      })

      // Generate report data in background
      this.generateReportData(reportId, config).catch(console.error)

      return reportId
    } catch (error) {
      console.error('Failed to generate compliance report:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(organizationId: string): Promise<{
    isValid: boolean
    brokenChains: string[]
    invalidChecksums: string[]
  }> {
    const logs = await this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        checksum: true,
        previousLogId: true,
        organizationId: true,
        userId: true,
        action: true,
        category: true,
        severity: true,
        description: true,
        resourceType: true,
        resourceId: true,
        resourceName: true,
        oldValues: true,
        newValues: true,
        changesSummary: true,
        ipAddress: true,
        userAgent: true,
        deviceId: true,
        location: true,
        requestId: true,
        endpoint: true,
        method: true,
        complianceFlags: true,
        riskScore: true,
        metadata: true,
        tags: true,
        occurredAt: true,
      }
    })

    const brokenChains: string[] = []
    const invalidChecksums: string[] = []
    const logMap = new Map(logs.map(log => [log.id, log]))

    for (const log of logs) {
      // Verify checksum
      const expectedChecksum = this.calculateChecksum(log)
      if (log.checksum !== expectedChecksum) {
        invalidChecksums.push(log.id)
      }

      // Verify chain
      if (log.previousLogId) {
        const previousLog = logMap.get(log.previousLogId)
        if (!previousLog) {
          brokenChains.push(log.id)
        }
      }
    }

    return {
      isValid: brokenChains.length === 0 && invalidChecksums.length === 0,
      brokenChains,
      invalidChecksums,
    }
  }

  /**
   * Archive old audit logs
   */
  async archiveOldLogs(organizationId: string, olderThanDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // In a real implementation, this would move logs to cold storage
    // For now, we'll just mark them as archived in metadata
    const result = await this.prisma.auditLog.updateMany({
      where: {
        organizationId,
        createdAt: { lt: cutoffDate },
        metadata: {
          path: ['archived'],
          equals: undefined
        }
      },
      data: {
        metadata: {
          archived: true,
          archivedAt: new Date().toISOString(),
        }
      }
    })

    return result.count
  }

  // Private helper methods

  private async getLastAuditLog(organizationId: string) {
    return await this.prisma.auditLog.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, checksum: true }
    })
  }

  private calculateRiskScore(event: AuditEvent): number {
    let score = 0

    // Base score by action
    const actionScores: Record<AuditAction, number> = {
      [AuditAction.CREATE]: 10,
      [AuditAction.READ]: 5,
      [AuditAction.UPDATE]: 15,
      [AuditAction.DELETE]: 25,
      [AuditAction.LOGIN]: 10,
      [AuditAction.LOGOUT]: 5,
      [AuditAction.EXPORT]: 20,
      [AuditAction.SHARE]: 15,
      [AuditAction.DOWNLOAD]: 10,
      [AuditAction.UPLOAD]: 10,
      [AuditAction.APPROVE]: 15,
      [AuditAction.REJECT]: 15,
      [AuditAction.ASSIGN]: 10,
      [AuditAction.UNASSIGN]: 10,
      [AuditAction.ARCHIVE]: 15,
      [AuditAction.RESTORE]: 20,
      [AuditAction.SYNC]: 10,
      [AuditAction.BACKUP]: 15,
      [AuditAction.RESTORE_BACKUP]: 30,
    }

    score += actionScores[event.action] || 10

    // Severity multiplier
    const severityMultipliers: Record<AuditSeverity, number> = {
      [AuditSeverity.LOW]: 1,
      [AuditSeverity.MEDIUM]: 1.5,
      [AuditSeverity.HIGH]: 2,
      [AuditSeverity.CRITICAL]: 3,
    }

    score *= severityMultipliers[event.severity]

    // Category adjustments
    if (event.category === AuditCategory.SECURITY) score += 20
    if (event.category === AuditCategory.COMPLIANCE) score += 15
    if (event.category === AuditCategory.SYSTEM_ADMIN) score += 10

    // Compliance flags increase risk
    score += event.complianceFlags.length * 5

    return Math.min(Math.round(score), 100)
  }

  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(dataString + this.encryptionKey).digest('hex')
  }

  private async encryptSensitiveData(data: Record<string, any>): Promise<Record<string, any>> {
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'ssn', 'pan', 'aadhar']
    const encrypted = { ...data }

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        if (typeof value === 'string') {
          const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey)
          encrypted[key] = cipher.update(value, 'utf8', 'hex') + cipher.final('hex')
        }
      }
    }

    return encrypted
  }

  private async decryptSensitiveData(data: Record<string, any>): Promise<Record<string, any>> {
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'ssn', 'pan', 'aadhar']
    const decrypted = { ...data }

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        if (typeof value === 'string') {
          try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey)
            decrypted[key] = decipher.update(value, 'hex', 'utf8') + decipher.final('utf8')
          } catch {
            // If decryption fails, keep original value
            decrypted[key] = '[ENCRYPTED]'
          }
        }
      }
    }

    return decrypted
  }

  private async createSearchIndex(auditLogId: string, data: any): Promise<void> {
    const searchableText = [
      data.description,
      data.resourceName,
      data.changesSummary,
      data.endpoint,
    ].filter(Boolean).join(' ')

    const keywords = [
      ...data.tags,
      ...data.complianceFlags,
      data.action,
      data.category,
      data.resourceType,
    ].filter(Boolean)

    await this.prisma.auditLogIndex.create({
      data: {
        auditLogId,
        searchableText,
        keywords,
      }
    })
  }

  private async triggerSecurityAlert(auditLog: any): Promise<void> {
    // In a real implementation, this would send alerts to security team
    console.warn('High-risk audit event detected:', {
      id: auditLog.id,
      action: auditLog.action,
      riskScore: auditLog.riskScore,
      userId: auditLog.userId,
      resourceType: auditLog.resourceType,
    })
  }

  private async generateReportData(reportId: string, config: AuditReportConfig): Promise<void> {
    try {
      // Search audit logs based on filters
      const { logs, total } = await this.searchAuditLogs({
        ...config.filters,
        limit: 10000, // Large limit for reports
      })

      // Generate summary statistics
      const summary = this.generateReportSummary(logs)

      // Update report with data
      await this.prisma.auditReport.update({
        where: { id: reportId },
        data: {
          status: 'completed',
          totalRecords: total,
          reportData: logs as any,
          summary: summary as any,
          lastGenerated: new Date(),
        }
      })

    } catch (error) {
      await this.prisma.auditReport.update({
        where: { id: reportId },
        data: {
          status: 'failed',
          metadata: { error: error.message } as any,
        }
      })
    }
  }

  private generateReportSummary(logs: any[]): any {
    const summary = {
      totalEvents: logs.length,
      actionBreakdown: {} as Record<string, number>,
      categoryBreakdown: {} as Record<string, number>,
      severityBreakdown: {} as Record<string, number>,
      riskDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      topUsers: {} as Record<string, number>,
      complianceEvents: 0,
      securityEvents: 0,
    }

    logs.forEach(log => {
      // Action breakdown
      summary.actionBreakdown[log.action] = (summary.actionBreakdown[log.action] || 0) + 1

      // Category breakdown
      summary.categoryBreakdown[log.category] = (summary.categoryBreakdown[log.category] || 0) + 1

      // Severity breakdown
      summary.severityBreakdown[log.severity] = (summary.severityBreakdown[log.severity] || 0) + 1

      // Risk distribution
      if (log.riskScore <= 25) summary.riskDistribution.low++
      else if (log.riskScore <= 50) summary.riskDistribution.medium++
      else if (log.riskScore <= 75) summary.riskDistribution.high++
      else summary.riskDistribution.critical++

      // Top users
      if (log.userId) {
        summary.topUsers[log.userId] = (summary.topUsers[log.userId] || 0) + 1
      }

      // Special event counts
      if (log.complianceFlags.length > 0) summary.complianceEvents++
      if (log.category === 'SECURITY') summary.securityEvents++
    })

    return summary
  }
}

// Audit logging middleware for automatic event capture
export function createAuditMiddleware(auditService: AuditService) {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send
    const startTime = Date.now()

    res.send = function(data: any) {
      const endTime = Date.now()
      const duration = endTime - startTime

      // Log API access
      const context: AuditContext = {
        userId: req.user?.id,
        sessionId: req.sessionID,
        organizationId: req.user?.organizationId || req.headers['x-organization-id'],
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        deviceId: req.headers['x-device-id'] as string,
        requestId: req.headers['x-request-id'] as string,
        endpoint: req.originalUrl,
        method: req.method,
      }

      const event: AuditEvent = {
        action: this.getActionFromMethod(req.method),
        category: AuditCategory.DATA_ACCESS,
        severity: AuditSeverity.LOW,
        description: `API ${req.method} ${req.originalUrl}`,
        resourceType: 'api_endpoint',
        resourceId: req.originalUrl,
        metadata: {
          statusCode: res.statusCode,
          duration,
          responseSize: data?.length || 0,
        },
      }

      // Don't await - fire and forget
      auditService.logEvent(context, event).catch(console.error)

      return originalSend.call(this, data)
    }

    next()
  }

  function getActionFromMethod(method: string): AuditAction {
    switch (method.toUpperCase()) {
      case 'GET': return AuditAction.READ
      case 'POST': return AuditAction.CREATE
      case 'PUT':
      case 'PATCH': return AuditAction.UPDATE
      case 'DELETE': return AuditAction.DELETE
      default: return AuditAction.READ
    }
  }
}

export default AuditService