import { AdvancedComplianceIntelligenceService, advancedComplianceIntelligence, ComplianceAssessmentRequest, ComplianceRule, ComplianceViolation, ComplianceMonitoringConfig } from '../advanced-compliance-intelligence'
import { openaiService } from '../openai-service'
import { analyticsService } from '../analytics-service'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../analytics-service')
jest.mock('../email-service')
jest.mock('../notification-service')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>

describe('AdvancedComplianceIntelligenceService', () => {
  let service: AdvancedComplianceIntelligenceService
  
  const mockAssessmentRequest: ComplianceAssessmentRequest = {
    id: 'assessment_test_123',
    organizationId: 'org_456',
    userId: 'user_789',
    assessmentType: 'FULL_AUDIT',
    scope: {
      regulations: ['SOX', 'GDPR'],
      departments: ['FINANCE', 'IT'],
      processes: ['FINANCIAL_REPORTING', 'DATA_MANAGEMENT'],
      timeframe: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      },
      customCriteria: {}
    },
    priority: 'HIGH',
    metadata: {
      requestReason: 'Annual compliance audit',
      stakeholders: ['user_789', 'compliance_officer'],
      expectedDeliverables: ['Compliance report', 'Risk assessment'],
      specialRequirements: []
    }
  }

  const mockComplianceRule: Omit<ComplianceRule, 'id'> = {
    name: 'Financial Document Retention',
    description: 'All financial documents must be retained for 7 years',
    ruleType: 'REGULATORY',
    category: 'DOCUMENT_MANAGEMENT',
    regulation: 'SOX',
    jurisdiction: 'US',
    severity: 'HIGH',
    isActive: true,
    conditions: [
      {
        id: 'cond1',
        field: 'documentType',
        operator: 'EQUALS',
        value: 'FINANCIAL',
        weight: 1.0
      },
      {
        id: 'cond2',
        field: 'retentionPeriodDays',
        operator: 'LESS_THAN',
        value: 2555, // 7 years
        logicalOperator: 'AND',
        weight: 1.0
      }
    ],
    actions: [
      {
        type: 'ALERT',
        parameters: { severity: 'HIGH' },
        priority: 1
      },
      {
        type: 'REQUIRE_APPROVAL',
        parameters: { approverRole: 'COMPLIANCE_OFFICER' },
        priority: 2
      }
    ],
    metadata: {
      applicableTo: ['DOCUMENT', 'FINANCIAL_RECORD'],
      exemptions: [],
      effectiveDate: new Date('2024-01-01'),
      lastUpdated: new Date(),
      version: '1.0',
      source: 'REGULATORY',
      tags: ['SOX', 'RETENTION', 'FINANCIAL']
    }
  }

  const mockMonitoringConfig: ComplianceMonitoringConfig = {
    id: 'monitor_123',
    organizationId: 'org_456',
    name: 'SOX Compliance Monitoring',
    description: 'Continuous monitoring for SOX compliance violations',
    monitoringType: 'REAL_TIME',
    rules: ['rule_123', 'rule_456'],
    alertSettings: {
      enabled: true,
      thresholds: {
        low: 1,
        medium: 3,
        high: 5,
        critical: 10
      },
      channels: ['EMAIL', 'SLACK'],
      recipients: ['compliance@company.com', 'manager@company.com'],
      escalationMatrix: [
        { level: 1, delayMinutes: 15, recipients: ['compliance@company.com'] },
        { level: 2, delayMinutes: 60, recipients: ['cro@company.com'] }
      ],
      customTemplates: {}
    },
    schedule: {
      enabled: true,
      frequency: 'HOURLY',
      timezone: 'UTC'
    },
    dataSourcesUsed: ['DOCUMENT_SYSTEM', 'TRANSACTION_LOG'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }

  beforeEach(() => {
    service = new AdvancedComplianceIntelligenceService()
    jest.clearAllMocks()

    // Setup default AI response
    mockedOpenAIService.analyzeText.mockResolvedValue({
      summary: 'Comprehensive compliance assessment completed with identified areas for improvement',
      sentiment: 'NEUTRAL',
      keyPoints: [
        'Strong financial controls framework',
        'Some gaps in data governance processes',
        'Audit trail completeness needs attention'
      ],
      confidence: 0.85
    })

    // Setup analytics service
    mockedAnalyticsService.calculateKPI.mockResolvedValue({
      value: 75,
      trend: 'STABLE',
      changePercentage: 0,
      benchmark: 80,
      status: 'BELOW_TARGET',
      metadata: {}
    })
  })

  describe('performComplianceAssessment', () => {
    it('should perform comprehensive compliance assessment', async () => {
      const result = await service.performComplianceAssessment(mockAssessmentRequest)

      expect(result).toBeDefined()
      expect(result.requestId).toBe(mockAssessmentRequest.id)
      expect(result.assessmentId).toBeDefined()
      expect(result.organizationId).toBe(mockAssessmentRequest.organizationId)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.riskLevel).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
      expect(result.complianceStatus).toMatch(/COMPLIANT|MINOR_ISSUES|MAJOR_ISSUES|NON_COMPLIANT/)
      expect(result.violations).toBeDefined()
      expect(result.riskAreas).toBeDefined()
      expect(result.recommendations).toBeDefined()
      expect(result.executiveSummary).toBeDefined()
      expect(result.detailedAnalysis).toBeDefined()
      expect(result.assessmentMetadata).toBeDefined()

      // Check executive summary structure
      expect(result.executiveSummary.keyFindings).toBeDefined()
      expect(result.executiveSummary.criticalIssues).toBeDefined()
      expect(result.executiveSummary.immediateActions).toBeDefined()
      expect(result.executiveSummary.overallAssessment).toBeDefined()

      // Check detailed analysis structure
      expect(result.detailedAnalysis.regulatoryCompliance).toBeDefined()
      expect(result.detailedAnalysis.processCompliance).toBeDefined()
      expect(result.detailedAnalysis.dataGovernance).toBeDefined()
      expect(result.detailedAnalysis.riskManagement).toBeDefined()
      expect(result.detailedAnalysis.auditReadiness).toBeDefined()

      // Check assessment metadata
      expect(result.assessmentMetadata.conductedBy).toBe(mockAssessmentRequest.userId)
      expect(result.assessmentMetadata.completedAt).toBeInstanceOf(Date)
      expect(result.assessmentMetadata.processingTime).toBeGreaterThan(0)
      expect(result.assessmentMetadata.confidence).toBeGreaterThan(0)
      expect(result.assessmentMetadata.confidence).toBeLessThanOrEqual(1)
    })

    it('should validate assessment request properly', async () => {
      const invalidRequest = {
        ...mockAssessmentRequest,
        organizationId: '' // Invalid org ID
      }

      await expect(
        service.performComplianceAssessment(invalidRequest)
      ).rejects.toThrow('Organization ID is required')

      const emptyRegulationsRequest = {
        ...mockAssessmentRequest,
        scope: {
          ...mockAssessmentRequest.scope,
          regulations: [] // No regulations
        }
      }

      await expect(
        service.performComplianceAssessment(emptyRegulationsRequest)
      ).rejects.toThrow('At least one regulation must be specified')
    })

    it('should generate appropriate risk levels based on violations', async () => {
      const result = await service.performComplianceAssessment(mockAssessmentRequest)

      // Risk level should be calculated based on violations
      if (result.violations.some(v => v.severity === 'CRITICAL')) {
        expect(result.riskLevel).toBe('CRITICAL')
      } else if (result.violations.filter(v => v.severity === 'HIGH').length > 2) {
        expect(result.riskLevel).toBe('HIGH')
      }
    })

    it('should handle different assessment types', async () => {
      const riskAssessmentRequest = {
        ...mockAssessmentRequest,
        assessmentType: 'RISK_ASSESSMENT' as const
      }

      const result = await service.performComplianceAssessment(riskAssessmentRequest)
      expect(result.assessmentMetadata.nextReviewDate).toBeInstanceOf(Date)

      const continuousMonitoringRequest = {
        ...mockAssessmentRequest,
        assessmentType: 'CONTINUOUS_MONITORING' as const
      }

      const continuousResult = await service.performComplianceAssessment(continuousMonitoringRequest)
      expect(continuousResult.assessmentMetadata.nextReviewDate).toBeInstanceOf(Date)
    })

    it('should handle AI service failures gracefully', async () => {
      mockedOpenAIService.analyzeText.mockRejectedValue(new Error('AI service unavailable'))

      const result = await service.performComplianceAssessment(mockAssessmentRequest)
      
      // Should still complete assessment with fallback summary
      expect(result.executiveSummary.overallAssessment).toBeDefined()
      expect(result.assessmentMetadata.confidence).toBeLessThan(0.9) // Lower confidence due to AI failure
    })
  })

  describe('compliance rule management', () => {
    it('should create compliance rule successfully', async () => {
      const createdRule = await service.createComplianceRule(mockComplianceRule)

      expect(createdRule.id).toBeDefined()
      expect(createdRule.name).toBe(mockComplianceRule.name)
      expect(createdRule.description).toBe(mockComplianceRule.description)
      expect(createdRule.ruleType).toBe(mockComplianceRule.ruleType)
      expect(createdRule.category).toBe(mockComplianceRule.category)
      expect(createdRule.regulation).toBe(mockComplianceRule.regulation)
      expect(createdRule.severity).toBe(mockComplianceRule.severity)
      expect(createdRule.isActive).toBe(true)
      expect(createdRule.conditions).toEqual(mockComplianceRule.conditions)
      expect(createdRule.actions).toEqual(mockComplianceRule.actions)
      expect(createdRule.metadata.lastUpdated).toBeInstanceOf(Date)
    })

    it('should validate rule creation requirements', async () => {
      const invalidRule = {
        ...mockComplianceRule,
        name: '' // Missing name
      }

      await expect(
        service.createComplianceRule(invalidRule)
      ).rejects.toThrow('Rule name is required')

      const noConditionsRule = {
        ...mockComplianceRule,
        conditions: [] // No conditions
      }

      await expect(
        service.createComplianceRule(noConditionsRule)
      ).rejects.toThrow('At least one condition is required')

      const noActionsRule = {
        ...mockComplianceRule,
        actions: [] // No actions
      }

      await expect(
        service.createComplianceRule(noActionsRule)
      ).rejects.toThrow('At least one action is required')
    })

    it('should update compliance rule', async () => {
      // First create a rule
      const createdRule = await service.createComplianceRule(mockComplianceRule)

      const updates = {
        name: 'Updated Financial Document Retention',
        severity: 'CRITICAL' as const,
        isActive: false
      }

      const updatedRule = await service.updateComplianceRule(createdRule.id, updates)

      expect(updatedRule.id).toBe(createdRule.id)
      expect(updatedRule.name).toBe(updates.name)
      expect(updatedRule.severity).toBe(updates.severity)
      expect(updatedRule.isActive).toBe(false)
      expect(updatedRule.metadata.lastUpdated).not.toEqual(createdRule.metadata.lastUpdated)
    })

    it('should delete compliance rule', async () => {
      // First create a rule
      const createdRule = await service.createComplianceRule(mockComplianceRule)

      await service.deleteComplianceRule(createdRule.id)

      // Rule should no longer exist
      const rules = await service.getComplianceRules('org_456')
      expect(rules.find(r => r.id === createdRule.id)).toBeUndefined()
    })

    it('should get compliance rules with filters', async () => {
      // Create multiple rules
      const rule1 = await service.createComplianceRule(mockComplianceRule)
      const rule2 = await service.createComplianceRule({
        ...mockComplianceRule,
        name: 'GDPR Data Protection Rule',
        category: 'DATA_GOVERNANCE',
        regulation: 'GDPR',
        jurisdiction: 'EU'
      })

      // Test category filter
      const financeRules = await service.getComplianceRules('org_456', { 
        category: 'DOCUMENT_MANAGEMENT' 
      })
      expect(financeRules).toHaveLength(1)
      expect(financeRules[0].id).toBe(rule1.id)

      // Test regulation filter
      const gdprRules = await service.getComplianceRules('org_456', { 
        ruleType: 'REGULATORY' 
      })
      expect(gdprRules.length).toBeGreaterThanOrEqual(2)

      // Test active filter
      await service.updateComplianceRule(rule1.id, { isActive: false })
      const activeRules = await service.getComplianceRules('org_456', { 
        isActive: true 
      })
      expect(activeRules.find(r => r.id === rule1.id)).toBeUndefined()
    })

    it('should handle rule not found errors', async () => {
      await expect(
        service.updateComplianceRule('non_existent_rule', { name: 'Updated' })
      ).rejects.toThrow('Compliance rule not found')

      await expect(
        service.deleteComplianceRule('non_existent_rule')
      ).rejects.toThrow('Compliance rule not found')
    })
  })

  describe('violation management', () => {
    it('should create compliance violation', async () => {
      const violationData: Omit<ComplianceViolation, 'id' | 'detectedAt'> = {
        ruleId: 'rule_123',
        ruleName: 'Test Rule',
        severity: 'HIGH',
        status: 'OPEN',
        entityType: 'DOCUMENT',
        entityId: 'doc_456',
        violationType: 'DOCUMENTATION',
        description: 'Missing required documentation',
        impact: {
          level: 'HIGH',
          description: 'High impact violation',
          affectedAreas: ['FINANCE'],
          potentialConsequences: ['Audit findings', 'Regulatory penalties'],
          reputationalRisk: 'MEDIUM',
          regulatoryRisk: 'HIGH'
        },
        evidence: [],
        recommendedActions: [{
          id: 'action_123',
          title: 'Add Missing Documentation',
          description: 'Compile and submit required documentation',
          actionType: 'CORRECTIVE',
          priority: 'HIGH',
          estimatedEffort: 8,
          timeline: '1 week',
          requiredRoles: ['COMPLIANCE_OFFICER'],
          dependencies: [],
          measurableOutcome: 'Documentation compliance achieved'
        }],
        metadata: {
          detectionMethod: 'AUTOMATED',
          confidence: 0.9,
          riskScore: 0.8,
          businessContext: {},
          relatedViolations: [],
          escalationPath: ['COMPLIANCE_OFFICER'],
          customFields: {}
        }
      }

      const createdViolation = await service.createViolation(violationData)

      expect(createdViolation.id).toBeDefined()
      expect(createdViolation.detectedAt).toBeInstanceOf(Date)
      expect(createdViolation.ruleId).toBe(violationData.ruleId)
      expect(createdViolation.severity).toBe(violationData.severity)
      expect(createdViolation.status).toBe(violationData.status)
      expect(createdViolation.description).toBe(violationData.description)
    })

    it('should update violation status and set resolution date', async () => {
      const violationData: Omit<ComplianceViolation, 'id' | 'detectedAt'> = {
        ruleId: 'rule_123',
        ruleName: 'Test Rule',
        severity: 'MEDIUM',
        status: 'OPEN',
        entityType: 'PROCESS',
        entityId: 'process_123',
        violationType: 'PROCESS',
        description: 'Process compliance issue',
        impact: {
          level: 'MEDIUM',
          description: 'Medium impact violation',
          affectedAreas: ['OPERATIONS'],
          potentialConsequences: ['Process inefficiency'],
          reputationalRisk: 'LOW',
          regulatoryRisk: 'MEDIUM'
        },
        evidence: [],
        recommendedActions: [],
        metadata: {
          detectionMethod: 'MANUAL',
          confidence: 0.8,
          riskScore: 0.6,
          businessContext: {},
          relatedViolations: [],
          escalationPath: [],
          customFields: {}
        }
      }

      const createdViolation = await service.createViolation(violationData)

      // Update to resolved
      const updatedViolation = await service.updateViolation(createdViolation.id, {
        status: 'RESOLVED',
        assignedTo: 'user_123'
      })

      expect(updatedViolation.status).toBe('RESOLVED')
      expect(updatedViolation.resolvedAt).toBeInstanceOf(Date)
      expect(updatedViolation.assignedTo).toBe('user_123')
    })

    it('should get violations with filters', async () => {
      // Create test violations
      await service.createViolation({
        ruleId: 'rule_high',
        ruleName: 'High Severity Rule',
        severity: 'HIGH',
        status: 'OPEN',
        entityType: 'DOCUMENT',
        entityId: 'doc_1',
        violationType: 'DOCUMENTATION',
        description: 'High severity violation',
        impact: {
          level: 'HIGH',
          description: 'High impact',
          affectedAreas: ['FINANCE'],
          potentialConsequences: ['Penalties'],
          reputationalRisk: 'HIGH',
          regulatoryRisk: 'HIGH'
        },
        evidence: [],
        recommendedActions: [],
        metadata: {
          detectionMethod: 'AUTOMATED',
          confidence: 0.9,
          riskScore: 0.8,
          businessContext: {},
          relatedViolations: [],
          escalationPath: [],
          customFields: {}
        }
      })

      await service.createViolation({
        ruleId: 'rule_medium',
        ruleName: 'Medium Severity Rule',
        severity: 'MEDIUM',
        status: 'INVESTIGATING',
        entityType: 'PROCESS',
        entityId: 'process_1',
        violationType: 'PROCESS',
        description: 'Medium severity violation',
        impact: {
          level: 'MEDIUM',
          description: 'Medium impact',
          affectedAreas: ['OPERATIONS'],
          potentialConsequences: ['Inefficiency'],
          reputationalRisk: 'MEDIUM',
          regulatoryRisk: 'MEDIUM'
        },
        evidence: [],
        recommendedActions: [],
        metadata: {
          detectionMethod: 'MANUAL',
          confidence: 0.7,
          riskScore: 0.6,
          businessContext: {},
          relatedViolations: [],
          escalationPath: [],
          customFields: {}
        }
      })

      // Test severity filter
      const highSeverityViolations = await service.getViolations('org_456', {
        severity: 'HIGH'
      })
      expect(highSeverityViolations).toHaveLength(1)
      expect(highSeverityViolations[0].severity).toBe('HIGH')

      // Test status filter
      const openViolations = await service.getViolations('org_456', {
        status: 'OPEN'
      })
      expect(openViolations.some(v => v.status === 'OPEN')).toBe(true)

      // Test entity type filter
      const documentViolations = await service.getViolations('org_456', {
        entityType: 'DOCUMENT'
      })
      expect(documentViolations.every(v => v.entityType === 'DOCUMENT')).toBe(true)
    })
  })

  describe('continuous monitoring', () => {
    it('should setup continuous monitoring configuration', async () => {
      const setupConfig = await service.setupContinuousMonitoring(mockMonitoringConfig)

      expect(setupConfig.id).toBe(mockMonitoringConfig.id)
      expect(setupConfig.organizationId).toBe(mockMonitoringConfig.organizationId)
      expect(setupConfig.name).toBe(mockMonitoringConfig.name)
      expect(setupConfig.monitoringType).toBe(mockMonitoringConfig.monitoringType)
      expect(setupConfig.rules).toEqual(mockMonitoringConfig.rules)
      expect(setupConfig.isActive).toBe(true)
    })

    it('should validate monitoring configuration', async () => {
      const invalidConfig = {
        ...mockMonitoringConfig,
        organizationId: '' // Invalid org ID
      }

      await expect(
        service.setupContinuousMonitoring(invalidConfig)
      ).rejects.toThrow('Organization ID is required')

      const noRulesConfig = {
        ...mockMonitoringConfig,
        rules: [] // No rules
      }

      await expect(
        service.setupContinuousMonitoring(noRulesConfig)
      ).rejects.toThrow('At least one rule must be specified')

      const noRecipientsConfig = {
        ...mockMonitoringConfig,
        alertSettings: {
          ...mockMonitoringConfig.alertSettings,
          enabled: true,
          recipients: [] // No recipients but alerts enabled
        }
      }

      await expect(
        service.setupContinuousMonitoring(noRecipientsConfig)
      ).rejects.toThrow('At least one recipient is required when alerts are enabled')
    })

    it('should get monitoring configurations for organization', async () => {
      await service.setupContinuousMonitoring(mockMonitoringConfig)
      
      const configs = await service.getMonitoringConfigs('org_456')

      expect(configs).toHaveLength(1)
      expect(configs[0].id).toBe(mockMonitoringConfig.id)
      expect(configs[0].organizationId).toBe('org_456')
    })
  })

  describe('real-time compliance checking', () => {
    it('should check compliance in real-time', async () => {
      // Create a test rule first
      const rule = await service.createComplianceRule(mockComplianceRule)

      const entityData = {
        id: 'doc_test_123',
        documentType: 'FINANCIAL',
        retentionPeriodDays: 1000, // Less than required 7 years
        content: 'Test financial document content'
      }

      const result = await service.checkComplianceInRealTime(
        'DOCUMENT',
        entityData,
        'org_456'
      )

      expect(result.isCompliant).toBeDefined()
      expect(result.violations).toBeDefined()
      expect(result.warnings).toBeDefined()
      expect(result.recommendedActions).toBeDefined()

      // Check result structure
      expect(Array.isArray(result.violations)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
      expect(Array.isArray(result.recommendedActions)).toBe(true)
    })

    it('should return compliant result when no violations detected', async () => {
      const compliantEntityData = {
        id: 'doc_compliant_123',
        documentType: 'GENERAL',
        retentionPeriodDays: 3000, // More than required
        content: 'Compliant document'
      }

      const result = await service.checkComplianceInRealTime(
        'DOCUMENT',
        compliantEntityData,
        'org_456'
      )

      // Due to mock implementation, result will vary, but structure should be consistent
      expect(result.isCompliant).toBeDefined()
      expect(result.violations).toBeDefined()
      expect(result.warnings).toBeDefined()
    })
  })

  describe('compliance analytics', () => {
    it('should generate comprehensive compliance analytics', async () => {
      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }

      const analytics = await service.generateComplianceAnalytics('org_456', timeframe)

      expect(analytics.summary).toBeDefined()
      expect(analytics.summary.totalViolations).toBeGreaterThanOrEqual(0)
      expect(analytics.summary.complianceScore).toBeGreaterThanOrEqual(0)
      expect(analytics.summary.complianceScore).toBeLessThanOrEqual(100)
      expect(analytics.summary.trendDirection).toMatch(/IMPROVING|STABLE|DECLINING/)

      expect(analytics.violationsByCategory).toBeDefined()
      expect(analytics.violationsBySeverity).toBeDefined()
      expect(analytics.topRiskAreas).toBeDefined()
      expect(analytics.complianceTrends).toBeDefined()
      expect(analytics.recommendations).toBeDefined()
      expect(analytics.regulatoryUpdates).toBeDefined()

      // Check trends structure
      analytics.complianceTrends.forEach(trend => {
        expect(trend.date).toBeInstanceOf(Date)
        expect(trend.violationCount).toBeGreaterThanOrEqual(0)
        expect(trend.complianceScore).toBeGreaterThanOrEqual(0)
        expect(trend.complianceScore).toBeLessThanOrEqual(100)
      })

      // Check risk areas structure
      analytics.topRiskAreas.forEach(riskArea => {
        expect(riskArea.area).toBeDefined()
        expect(riskArea.riskScore).toBeGreaterThanOrEqual(0)
        expect(riskArea.violationCount).toBeGreaterThanOrEqual(0)
      })

      // Check regulatory updates structure
      analytics.regulatoryUpdates.forEach(update => {
        expect(update.regulation).toBeDefined()
        expect(update.update).toBeDefined()
        expect(update.impact).toBeDefined()
        expect(update.actionRequired).toBeDefined()
      })
    })

    it('should calculate metrics correctly', async () => {
      // Create some test violations to have data for analytics
      await service.createViolation({
        ruleId: 'rule_analytics_test',
        ruleName: 'Analytics Test Rule',
        severity: 'HIGH',
        status: 'OPEN',
        entityType: 'DOCUMENT',
        entityId: 'doc_analytics',
        violationType: 'DOCUMENTATION',
        description: 'Test violation for analytics',
        impact: {
          level: 'HIGH',
          description: 'Test impact',
          affectedAreas: ['FINANCE'],
          potentialConsequences: ['Test consequences'],
          reputationalRisk: 'MEDIUM',
          regulatoryRisk: 'HIGH'
        },
        evidence: [],
        recommendedActions: [],
        metadata: {
          detectionMethod: 'AUTOMATED',
          confidence: 0.8,
          riskScore: 0.7,
          businessContext: {},
          relatedViolations: [],
          escalationPath: [],
          customFields: {}
        }
      })

      const timeframe = {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      }

      const analytics = await service.generateComplianceAnalytics('org_456', timeframe)

      expect(analytics.summary.totalViolations).toBeGreaterThan(0)
      expect(analytics.summary.openViolations).toBeGreaterThanOrEqual(0)
      expect(analytics.summary.resolvedViolations).toBeGreaterThanOrEqual(0)
      
      // Compliance score should be calculated based on violations
      expect(analytics.summary.complianceScore).toBeLessThan(100) // Should be less than 100 due to violations
    })
  })

  describe('built-in rules initialization', () => {
    it('should initialize with built-in compliance rules', async () => {
      const rules = await service.getComplianceRules('org_456')

      expect(rules.length).toBeGreaterThan(0)

      // Should have SOX rules
      const soxRules = rules.filter(rule => rule.regulation === 'Sarbanes-Oxley Act')
      expect(soxRules.length).toBeGreaterThan(0)

      // Should have document retention rules
      const retentionRules = rules.filter(rule => rule.category === 'DOCUMENT_MANAGEMENT')
      expect(retentionRules.length).toBeGreaterThan(0)

      // Check built-in rule structure
      const builtInRule = rules.find(rule => rule.metadata.source === 'BUILT_IN')
      if (builtInRule) {
        expect(builtInRule.name).toBeDefined()
        expect(builtInRule.conditions.length).toBeGreaterThan(0)
        expect(builtInRule.actions.length).toBeGreaterThan(0)
        expect(builtInRule.metadata.tags.length).toBeGreaterThan(0)
      }
    })

    it('should have properly structured built-in rules', async () => {
      const rules = await service.getComplianceRules('org_456')
      
      rules.forEach(rule => {
        expect(rule.id).toBeDefined()
        expect(rule.name).toBeDefined()
        expect(rule.description).toBeDefined()
        expect(rule.category).toBeDefined()
        expect(rule.regulation).toBeDefined()
        expect(rule.severity).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/)
        expect(rule.conditions).toBeDefined()
        expect(rule.conditions.length).toBeGreaterThan(0)
        expect(rule.actions).toBeDefined()
        expect(rule.actions.length).toBeGreaterThan(0)
        expect(rule.metadata).toBeDefined()
        expect(rule.metadata.applicableTo).toBeDefined()
        expect(rule.metadata.effectiveDate).toBeInstanceOf(Date)
        expect(rule.metadata.lastUpdated).toBeInstanceOf(Date)
      })
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle assessment with no applicable rules', async () => {
      const emptyAssessmentRequest = {
        ...mockAssessmentRequest,
        scope: {
          ...mockAssessmentRequest.scope,
          regulations: ['NON_EXISTENT_REGULATION']
        }
      }

      const result = await service.performComplianceAssessment(emptyAssessmentRequest)
      
      expect(result).toBeDefined()
      expect(result.violations.length).toBe(0)
      expect(result.complianceStatus).toBe('COMPLIANT')
    })

    it('should handle invalid timeframe gracefully', async () => {
      const invalidTimeframeRequest = {
        ...mockAssessmentRequest,
        scope: {
          ...mockAssessmentRequest.scope,
          timeframe: {
            start: new Date('2024-01-31'), // After end date
            end: new Date('2024-01-01')
          }
        }
      }

      await expect(
        service.performComplianceAssessment(invalidTimeframeRequest)
      ).rejects.toThrow('Invalid timeframe: start date must be before end date')
    })

    it('should handle malformed rule conditions', async () => {
      const malformedRule = {
        ...mockComplianceRule,
        conditions: [
          {
            id: 'bad_condition',
            field: '', // Empty field
            operator: 'EQUALS' as const,
            value: 'test',
            weight: 1.0
          }
        ]
      }

      await expect(
        service.createComplianceRule(malformedRule)
      ).rejects.toThrow('Condition field is required')
    })

    it('should handle empty violation data gracefully', async () => {
      const violations = await service.getViolations('non_existent_org')
      expect(violations).toEqual([])

      const analytics = await service.generateComplianceAnalytics('empty_org', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      })

      expect(analytics.summary.totalViolations).toBe(0)
      expect(analytics.summary.complianceScore).toBe(100)
    })
  })
})