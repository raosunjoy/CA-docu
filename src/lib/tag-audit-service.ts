// Tag Audit Service - Comprehensive tag audit logging and compliance
import { prisma } from './prisma'
import type { Tag, Tagging, User } from '../types'

export interface TagAuditLog {
  id: string
  organizationId: string
  action: 'create' | 'update' | 'delete' | 'apply' | 'remove' | 'bulk_apply' | 'bulk_remove'
  resourceType: 'tag' | 'tagging'
  resourceId: string
  tagId?: string
  taggableType?: string
  taggableId?: string
  userId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface TagChangeHistory {
  id: string
  tagId: string
  changeType: 'name' | 'parent' | 'color' | 'description' | 'delete'
  oldValue?: any
  newValue?: any
  userId: string
  reason?: string
  createdAt: Date
}

export interface TagComplianceRule {
  id: string
  organizationId: string
  name: string
  description?: string
  ruleType: 'required' | 'forbidden' | 'format' | 'retention' | 'access'
  conditions: TagComplianceCondition[]
  actions: TagComplianceAction[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  isActive: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TagComplianceCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'regex' | 'exists' | 'not_exists'
  value?: any
  logicalOperator?: 'AND' | 'OR'
}

export interface TagComplianceAction {
  type: 'log' | 'notify' | 'block' | 'auto_fix' | 'escalate'
  config: Record<string, any>
}

export interface TagComplianceViolation {
  id: string
  organizationId: string
  ruleId: string
  resourceType: 'tag' | 'tagging'
  resourceId: string
  violationType: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive'
  detectedAt: Date
  resolvedAt?: Date
  resolvedBy?: string
  resolution?: string
  metadata?: Record<string, any>
}

export interface TagRetentionPolicy {
  id: string
  organizationId: string
  name: string
  description?: string
  conditions: TagRetentionCondition[]
  retentionPeriod: number // days
  action: 'archive' | 'delete' | 'notify'
  isActive: boolean
  lastRunAt?: Date
  nextRunAt?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TagRetentionCondition {
  field: string
  operator: string
  value: any
}

export interface TagAccessLog {
  id: string
  organizationId: string
  tagId: string
  userId: string
  action: 'view' | 'search' | 'filter'
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface TagComplianceReport {
  organizationId: string
  reportType: 'violations' | 'usage' | 'retention' | 'access'
  period: {
    start: Date
    end: Date
  }
  summary: {
    totalTags: number
    totalTaggings: number
    violations: number
    resolvedViolations: number
    criticalViolations: number
  }
  details: any[]
  generatedAt: Date
  generatedBy: string
}

class TagAuditService {
  // Audit Logging
  async logTagAction(data: {
    organizationId: string
    action: TagAuditLog['action']
    resourceType: TagAuditLog['resourceType']
    resourceId: string
    tagId?: string
    taggableType?: string
    taggableId?: string
    userId?: string
    oldValues?: Record<string, any>
    newValues?: Record<string, any>
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }): Promise<TagAuditLog> {
    const auditLog = await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        oldValues: data.oldValues,
        newValues: data.newValues,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      }
    })

    return {
      id: auditLog.id,
      organizationId: auditLog.organizationId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      tagId: data.tagId,
      taggableType: data.taggableType,
      taggableId: data.taggableId,
      userId: auditLog.userId || undefined,
      oldValues: auditLog.oldValues as Record<string, any> || undefined,
      newValues: auditLog.newValues as Record<string, any> || undefined,
      metadata: data.metadata,
      ipAddress: auditLog.ipAddress || undefined,
      userAgent: auditLog.userAgent || undefined,
      createdAt: auditLog.createdAt
    }
  }

  async getAuditLogs(
    organizationId: string,
    filters?: {
      action?: string[]
      resourceType?: string[]
      userId?: string
      tagId?: string
      startDate?: Date
      endDate?: Date
    },
    pagination?: {
      page: number
      limit: number
    }
  ): Promise<{
    logs: TagAuditLog[]
    total: number
    page: number
    limit: number
  }> {
    const where: any = {
      organizationId,
      resourceType: {
        in: ['tag', 'tagging']
      }
    }

    if (filters?.action?.length) {
      where.action = { in: filters.action }
    }

    if (filters?.resourceType?.length) {
      where.resourceType = { in: filters.resourceType }
    }

    if (filters?.userId) {
      where.userId = filters.userId
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate
      }
    }

    const page = pagination?.page || 1
    const limit = pagination?.limit || 50
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    return {
      logs: logs.map(log => ({
        id: log.id,
        organizationId: log.organizationId,
        action: log.action as TagAuditLog['action'],
        resourceType: log.resourceType as TagAuditLog['resourceType'],
        resourceId: log.resourceId,
        userId: log.userId || undefined,
        oldValues: log.oldValues as Record<string, any> || undefined,
        newValues: log.newValues as Record<string, any> || undefined,
        ipAddress: log.ipAddress || undefined,
        userAgent: log.userAgent || undefined,
        createdAt: log.createdAt
      })),
      total,
      page,
      limit
    }
  }

  // Tag Change History
  async recordTagChange(data: {
    tagId: string
    changeType: TagChangeHistory['changeType']
    oldValue?: any
    newValue?: any
    userId: string
    reason?: string
  }): Promise<TagChangeHistory> {
    // This would be stored in a dedicated tag_change_history table
    // For now, we'll use the audit log system
    const changeRecord = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tagId: data.tagId,
      changeType: data.changeType,
      oldValue: data.oldValue,
      newValue: data.newValue,
      userId: data.userId,
      reason: data.reason,
      createdAt: new Date()
    }

    return changeRecord
  }

  async getTagChangeHistory(
    tagId: string,
    limit: number = 50
  ): Promise<TagChangeHistory[]> {
    // Query audit logs for tag changes
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resourceType: 'tag',
        resourceId: tagId
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return auditLogs.map(log => ({
      id: log.id,
      tagId,
      changeType: this.mapActionToChangeType(log.action),
      oldValue: log.oldValues,
      newValue: log.newValues,
      userId: log.userId || 'system',
      createdAt: log.createdAt
    }))
  }

  private mapActionToChangeType(action: string): TagChangeHistory['changeType'] {
    switch (action) {
      case 'delete':
        return 'delete'
      case 'update':
        return 'name' // This would need more sophisticated logic
      default:
        return 'name'
    }
  }

  // Rollback Functionality
  async rollbackTagChange(
    tagId: string,
    changeId: string,
    userId: string
  ): Promise<void> {
    const changeHistory = await this.getTagChangeHistory(tagId, 100)
    const change = changeHistory.find(c => c.id === changeId)

    if (!change) {
      throw new Error('Change record not found')
    }

    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      throw new Error('Tag not found')
    }

    // Rollback the change
    switch (change.changeType) {
      case 'name':
        if (change.oldValue) {
          await prisma.tag.update({
            where: { id: tagId },
            data: { name: change.oldValue }
          })
        }
        break
      case 'parent':
        await prisma.tag.update({
          where: { id: tagId },
          data: { parentId: change.oldValue }
        })
        break
      case 'color':
        await prisma.tag.update({
          where: { id: tagId },
          data: { color: change.oldValue }
        })
        break
      case 'description':
        await prisma.tag.update({
          where: { id: tagId },
          data: { description: change.oldValue }
        })
        break
      case 'delete':
        // Cannot rollback deletion without backup data
        throw new Error('Cannot rollback tag deletion')
    }

    // Log the rollback
    await this.logTagAction({
      organizationId: tag.organizationId,
      action: 'update',
      resourceType: 'tag',
      resourceId: tagId,
      userId,
      metadata: {
        rollback: true,
        originalChangeId: changeId
      }
    })
  }

  // Compliance Rules
  async createComplianceRule(data: Omit<TagComplianceRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<TagComplianceRule> {
    const rule: TagComplianceRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Store in database (would need a compliance_rules table)
    return rule
  }

  async evaluateCompliance(
    organizationId: string,
    resourceType: 'tag' | 'tagging',
    resourceId: string,
    data: Record<string, any>
  ): Promise<TagComplianceViolation[]> {
    // Get active compliance rules
    const rules = await this.getComplianceRules(organizationId, { isActive: true })
    const violations: TagComplianceViolation[] = []

    for (const rule of rules) {
      const isViolation = this.checkRuleViolation(rule, data)
      
      if (isViolation) {
        violations.push({
          id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          organizationId,
          ruleId: rule.id,
          resourceType,
          resourceId,
          violationType: rule.ruleType,
          description: `Compliance rule "${rule.name}" violated`,
          severity: rule.severity,
          status: 'open',
          detectedAt: new Date(),
          metadata: {
            rule: rule.name,
            conditions: rule.conditions
          }
        })
      }
    }

    return violations
  }

  private async getComplianceRules(
    organizationId: string,
    filters?: { isActive?: boolean }
  ): Promise<TagComplianceRule[]> {
    // This would query a compliance_rules table
    // For now, return mock rules
    return [
      {
        id: 'rule_1',
        organizationId,
        name: 'Required Audit Tag',
        description: 'All audit-related content must be tagged with "audit"',
        ruleType: 'required',
        conditions: [
          {
            field: 'content_type',
            operator: 'equals',
            value: 'audit'
          }
        ],
        actions: [
          {
            type: 'notify',
            config: { recipients: ['compliance@company.com'] }
          }
        ],
        severity: 'high',
        isActive: true,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }

  private checkRuleViolation(rule: TagComplianceRule, data: Record<string, any>): boolean {
    // Implement rule evaluation logic
    for (const condition of rule.conditions) {
      const fieldValue = data[condition.field]
      
      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return true
          break
        case 'not_equals':
          if (fieldValue === condition.value) return true
          break
        case 'contains':
          if (!fieldValue?.includes(condition.value)) return true
          break
        case 'not_contains':
          if (fieldValue?.includes(condition.value)) return true
          break
        case 'exists':
          if (!fieldValue) return true
          break
        case 'not_exists':
          if (fieldValue) return true
          break
      }
    }
    
    return false
  }

  // Data Retention
  async createRetentionPolicy(data: Omit<TagRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<TagRetentionPolicy> {
    const policy: TagRetentionPolicy = {
      id: `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return policy
  }

  async executeRetentionPolicies(organizationId: string): Promise<{
    executed: number
    archived: number
    deleted: number
    errors: string[]
  }> {
    const policies = await this.getRetentionPolicies(organizationId, { isActive: true })
    let executed = 0
    let archived = 0
    let deleted = 0
    const errors: string[] = []

    for (const policy of policies) {
      try {
        const result = await this.executeRetentionPolicy(policy)
        executed++
        archived += result.archived
        deleted += result.deleted
      } catch (error) {
        errors.push(`Policy ${policy.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { executed, archived, deleted, errors }
  }

  private async getRetentionPolicies(
    organizationId: string,
    filters?: { isActive?: boolean }
  ): Promise<TagRetentionPolicy[]> {
    // Mock implementation
    return []
  }

  private async executeRetentionPolicy(policy: TagRetentionPolicy): Promise<{
    archived: number
    deleted: number
  }> {
    // Implementation would depend on the specific policy conditions
    return { archived: 0, deleted: 0 }
  }

  // Access Monitoring
  async logTagAccess(data: {
    organizationId: string
    tagId: string
    userId: string
    action: TagAccessLog['action']
    resourceType?: string
    resourceId?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<TagAccessLog> {
    const accessLog: TagAccessLog = {
      id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date()
    }

    // Store in database (would need a tag_access_logs table)
    return accessLog
  }

  async getTagAccessLogs(
    organizationId: string,
    filters?: {
      tagId?: string
      userId?: string
      action?: string[]
      startDate?: Date
      endDate?: Date
    },
    pagination?: {
      page: number
      limit: number
    }
  ): Promise<{
    logs: TagAccessLog[]
    total: number
    page: number
    limit: number
  }> {
    // Mock implementation
    return {
      logs: [],
      total: 0,
      page: pagination?.page || 1,
      limit: pagination?.limit || 50
    }
  }

  // Compliance Reporting
  async generateComplianceReport(
    organizationId: string,
    reportType: TagComplianceReport['reportType'],
    period: { start: Date; end: Date },
    userId: string
  ): Promise<TagComplianceReport> {
    const report: TagComplianceReport = {
      organizationId,
      reportType,
      period,
      summary: {
        totalTags: 0,
        totalTaggings: 0,
        violations: 0,
        resolvedViolations: 0,
        criticalViolations: 0
      },
      details: [],
      generatedAt: new Date(),
      generatedBy: userId
    }

    switch (reportType) {
      case 'violations':
        report.details = await this.getViolationsReport(organizationId, period)
        break
      case 'usage':
        report.details = await this.getUsageReport(organizationId, period)
        break
      case 'retention':
        report.details = await this.getRetentionReport(organizationId, period)
        break
      case 'access':
        report.details = await this.getAccessReport(organizationId, period)
        break
    }

    return report
  }

  private async getViolationsReport(organizationId: string, period: { start: Date; end: Date }): Promise<any[]> {
    // Implementation would query violations within the period
    return []
  }

  private async getUsageReport(organizationId: string, period: { start: Date; end: Date }): Promise<any[]> {
    // Implementation would analyze tag usage patterns
    return []
  }

  private async getRetentionReport(organizationId: string, period: { start: Date; end: Date }): Promise<any[]> {
    // Implementation would report on retention policy execution
    return []
  }

  private async getAccessReport(organizationId: string, period: { start: Date; end: Date }): Promise<any[]> {
    // Implementation would analyze tag access patterns
    return []
  }
}

export const tagAuditService = new TagAuditService()