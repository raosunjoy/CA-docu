import { NextRequest, NextResponse } from 'next/server'
import { advancedComplianceIntelligence, ComplianceAssessmentRequest, ComplianceRule, ComplianceViolation, ComplianceMonitoringConfig } from '../../../services/advanced-compliance-intelligence'
import { auth } from '../../../lib/auth'
import { logger } from '../../../lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const organizationId = user.organizationId || 'default-org'

    switch (action) {
      case 'get_rules': {
        const category = searchParams.get('category')
        const ruleType = searchParams.get('ruleType')
        const jurisdiction = searchParams.get('jurisdiction')
        const isActive = searchParams.get('isActive')

        const filters: any = {}
        if (category) filters.category = category
        if (ruleType) filters.ruleType = ruleType
        if (jurisdiction) filters.jurisdiction = jurisdiction
        if (isActive !== null) filters.isActive = isActive === 'true'

        const rules = await advancedComplianceIntelligence.getComplianceRules(organizationId, filters)

        return NextResponse.json({
          success: true,
          rules,
          count: rules.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_violations': {
        const severity = searchParams.get('severity')
        const status = searchParams.get('status')
        const ruleId = searchParams.get('ruleId')
        const entityType = searchParams.get('entityType')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const filters: any = {}
        if (severity) filters.severity = severity
        if (status) filters.status = status
        if (ruleId) filters.ruleId = ruleId
        if (entityType) filters.entityType = entityType
        if (startDate && endDate) {
          filters.dateRange = {
            start: new Date(startDate),
            end: new Date(endDate)
          }
        }

        const violations = await advancedComplianceIntelligence.getViolations(organizationId, filters)

        return NextResponse.json({
          success: true,
          violations,
          count: violations.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_monitoring_configs': {
        const configs = await advancedComplianceIntelligence.getMonitoringConfigs(organizationId)

        return NextResponse.json({
          success: true,
          configs,
          count: configs.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_analytics': {
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const endDate = searchParams.get('endDate') || new Date().toISOString()

        const analytics = await advancedComplianceIntelligence.generateComplianceAnalytics(
          organizationId,
          {
            start: new Date(startDate),
            end: new Date(endDate)
          }
        )

        return NextResponse.json({
          success: true,
          analytics,
          timeframe: {
            start: startDate,
            end: endDate
          },
          timestamp: new Date().toISOString()
        })
      }

      case 'get_rule_categories': {
        // Return available rule categories for filtering/selection
        const categories = [
          { value: 'FINANCIAL_CONTROLS', label: 'Financial Controls', description: 'SOX and financial reporting controls' },
          { value: 'DOCUMENT_MANAGEMENT', label: 'Document Management', description: 'Document retention and management' },
          { value: 'DATA_GOVERNANCE', label: 'Data Governance', description: 'Data privacy and protection' },
          { value: 'PROCESS_COMPLIANCE', label: 'Process Compliance', description: 'Business process compliance' },
          { value: 'AUTHORIZATION', label: 'Authorization', description: 'Access and authorization controls' },
          { value: 'AUDIT_TRAIL', label: 'Audit Trail', description: 'Audit logging and monitoring' },
          { value: 'RISK_MANAGEMENT', label: 'Risk Management', description: 'Risk assessment and mitigation' }
        ]

        return NextResponse.json({
          success: true,
          categories,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_compliance_framework_templates': {
        // Return predefined compliance framework templates
        const templates = [
          {
            name: 'SOX Compliance Framework',
            description: 'Sarbanes-Oxley Act compliance requirements',
            regulations: ['SOX'],
            categories: ['FINANCIAL_CONTROLS', 'AUDIT_TRAIL', 'AUTHORIZATION'],
            rules: [
              {
                name: 'Financial Control Documentation',
                severity: 'HIGH',
                category: 'FINANCIAL_CONTROLS'
              },
              {
                name: 'Audit Trail Completeness',
                severity: 'HIGH',
                category: 'AUDIT_TRAIL'
              }
            ]
          },
          {
            name: 'GDPR Privacy Framework',
            description: 'General Data Protection Regulation compliance',
            regulations: ['GDPR'],
            categories: ['DATA_GOVERNANCE', 'AUTHORIZATION', 'DOCUMENT_MANAGEMENT'],
            rules: [
              {
                name: 'Data Subject Rights',
                severity: 'CRITICAL',
                category: 'DATA_GOVERNANCE'
              },
              {
                name: 'Data Retention Policies',
                severity: 'HIGH',
                category: 'DOCUMENT_MANAGEMENT'
              }
            ]
          },
          {
            name: 'PCAOB Audit Standards',
            description: 'Public Company Accounting Oversight Board standards',
            regulations: ['PCAOB'],
            categories: ['AUDIT_TRAIL', 'FINANCIAL_CONTROLS', 'PROCESS_COMPLIANCE'],
            rules: [
              {
                name: 'Audit Documentation Requirements',
                severity: 'HIGH',
                category: 'AUDIT_TRAIL'
              },
              {
                name: 'Independence Requirements',
                severity: 'CRITICAL',
                category: 'PROCESS_COMPLIANCE'
              }
            ]
          }
        ]

        return NextResponse.json({
          success: true,
          templates,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: get_rules, get_violations, get_monitoring_configs, get_analytics, get_rule_categories, get_compliance_framework_templates'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Compliance intelligence GET API error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve compliance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      action = 'perform_assessment',
      assessmentData,
      ruleData,
      violationData,
      monitoringConfig,
      entityData,
      entityType
    } = body

    switch (action) {
      case 'perform_assessment': {
        if (!assessmentData) {
          return NextResponse.json({
            error: 'assessmentData is required for compliance assessment'
          }, { status: 400 })
        }

        // Build assessment request
        const assessmentRequest: ComplianceAssessmentRequest = {
          id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          organizationId: user.organizationId || 'default-org',
          userId: user.id,
          assessmentType: assessmentData.assessmentType || 'FULL_AUDIT',
          scope: {
            regulations: assessmentData.scope?.regulations || ['SOX', 'GDPR'],
            departments: assessmentData.scope?.departments || ['FINANCE', 'IT'],
            processes: assessmentData.scope?.processes || ['FINANCIAL_REPORTING', 'DATA_MANAGEMENT'],
            timeframe: {
              start: assessmentData.scope?.timeframe?.start ? new Date(assessmentData.scope.timeframe.start) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
              end: assessmentData.scope?.timeframe?.end ? new Date(assessmentData.scope.timeframe.end) : new Date()
            },
            customCriteria: assessmentData.scope?.customCriteria || {}
          },
          priority: assessmentData.priority || 'MEDIUM',
          dueDate: assessmentData.dueDate ? new Date(assessmentData.dueDate) : undefined,
          metadata: {
            requestReason: assessmentData.metadata?.requestReason || 'Routine compliance assessment',
            stakeholders: assessmentData.metadata?.stakeholders || [user.id],
            expectedDeliverables: assessmentData.metadata?.expectedDeliverables || ['Compliance report', 'Risk assessment'],
            specialRequirements: assessmentData.metadata?.specialRequirements || []
          }
        }

        // Perform compliance assessment
        const assessmentResult = await advancedComplianceIntelligence.performComplianceAssessment(assessmentRequest)

        logger.info('Compliance assessment completed', {
          userId: user.id,
          requestId: assessmentRequest.id,
          assessmentId: assessmentResult.assessmentId,
          overallScore: assessmentResult.overallScore,
          violationsFound: assessmentResult.violations.length,
          riskLevel: assessmentResult.riskLevel,
          processingTime: assessmentResult.assessmentMetadata.processingTime
        })

        return NextResponse.json({
          success: true,
          requestId: assessmentRequest.id,
          assessmentResult,
          timestamp: new Date().toISOString()
        })
      }

      case 'create_rule': {
        if (!ruleData) {
          return NextResponse.json({
            error: 'ruleData is required to create compliance rule'
          }, { status: 400 })
        }

        // Validate required rule fields
        if (!ruleData.name || !ruleData.conditions || !ruleData.actions) {
          return NextResponse.json({
            error: 'Rule must have name, conditions, and actions'
          }, { status: 400 })
        }

        const newRule = await advancedComplianceIntelligence.createComplianceRule({
          name: ruleData.name,
          description: ruleData.description || '',
          ruleType: ruleData.ruleType || 'INTERNAL',
          category: ruleData.category || 'GENERAL',
          regulation: ruleData.regulation || 'Internal Policy',
          jurisdiction: ruleData.jurisdiction || 'US',
          severity: ruleData.severity || 'MEDIUM',
          isActive: ruleData.isActive !== false,
          conditions: ruleData.conditions.map((cond: any) => ({
            id: cond.id || `cond_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            field: cond.field,
            operator: cond.operator,
            value: cond.value,
            logicalOperator: cond.logicalOperator,
            weight: cond.weight || 1.0
          })),
          actions: ruleData.actions.map((action: any, index: number) => ({
            type: action.type,
            parameters: action.parameters || {},
            priority: action.priority || index + 1
          })),
          metadata: {
            applicableTo: ruleData.metadata?.applicableTo || ['DOCUMENT'],
            exemptions: ruleData.metadata?.exemptions || [],
            effectiveDate: ruleData.metadata?.effectiveDate ? new Date(ruleData.metadata.effectiveDate) : new Date(),
            expiryDate: ruleData.metadata?.expiryDate ? new Date(ruleData.metadata.expiryDate) : undefined,
            lastUpdated: new Date(),
            version: ruleData.metadata?.version || '1.0',
            source: 'USER_CREATED',
            tags: ruleData.metadata?.tags || []
          }
        })

        logger.info('Compliance rule created', {
          userId: user.id,
          ruleId: newRule.id,
          ruleName: newRule.name,
          category: newRule.category,
          severity: newRule.severity
        })

        return NextResponse.json({
          success: true,
          rule: newRule,
          timestamp: new Date().toISOString()
        })
      }

      case 'update_violation': {
        if (!violationData || !violationData.violationId) {
          return NextResponse.json({
            error: 'violationData with violationId is required'
          }, { status: 400 })
        }

        const updatedViolation = await advancedComplianceIntelligence.updateViolation(
          violationData.violationId,
          violationData.updates
        )

        logger.info('Compliance violation updated', {
          userId: user.id,
          violationId: violationData.violationId,
          updates: Object.keys(violationData.updates)
        })

        return NextResponse.json({
          success: true,
          violation: updatedViolation,
          timestamp: new Date().toISOString()
        })
      }

      case 'check_realtime_compliance': {
        if (!entityData || !entityType) {
          return NextResponse.json({
            error: 'entityData and entityType are required for real-time compliance check'
          }, { status: 400 })
        }

        const complianceCheck = await advancedComplianceIntelligence.checkComplianceInRealTime(
          entityType,
          entityData,
          user.organizationId || 'default-org'
        )

        logger.info('Real-time compliance check completed', {
          userId: user.id,
          entityType,
          isCompliant: complianceCheck.isCompliant,
          violationsFound: complianceCheck.violations.length,
          warningsFound: complianceCheck.warnings.length
        })

        return NextResponse.json({
          success: true,
          complianceCheck,
          timestamp: new Date().toISOString()
        })
      }

      case 'setup_monitoring': {
        if (!monitoringConfig) {
          return NextResponse.json({
            error: 'monitoringConfig is required to setup compliance monitoring'
          }, { status: 400 })
        }

        const config: ComplianceMonitoringConfig = {
          id: monitoringConfig.id || `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          organizationId: user.organizationId || 'default-org',
          name: monitoringConfig.name || 'Unnamed Monitoring',
          description: monitoringConfig.description || '',
          monitoringType: monitoringConfig.monitoringType || 'SCHEDULED',
          rules: monitoringConfig.rules || [],
          alertSettings: {
            enabled: monitoringConfig.alertSettings?.enabled !== false,
            thresholds: {
              low: monitoringConfig.alertSettings?.thresholds?.low || 1,
              medium: monitoringConfig.alertSettings?.thresholds?.medium || 3,
              high: monitoringConfig.alertSettings?.thresholds?.high || 5,
              critical: monitoringConfig.alertSettings?.thresholds?.critical || 10
            },
            channels: monitoringConfig.alertSettings?.channels || ['EMAIL'],
            recipients: monitoringConfig.alertSettings?.recipients || [user.email || user.id],
            escalationMatrix: monitoringConfig.alertSettings?.escalationMatrix || [
              { level: 1, delayMinutes: 15, recipients: [user.email || user.id] }
            ],
            customTemplates: monitoringConfig.alertSettings?.customTemplates || {}
          },
          schedule: {
            enabled: monitoringConfig.schedule?.enabled !== false,
            frequency: monitoringConfig.schedule?.frequency || 'DAILY',
            timezone: monitoringConfig.schedule?.timezone || 'UTC',
            customCron: monitoringConfig.schedule?.customCron
          },
          dataSourcesUsed: monitoringConfig.dataSourcesUsed || ['DOCUMENT_SYSTEM', 'TRANSACTION_LOG'],
          isActive: monitoringConfig.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const setupResult = await advancedComplianceIntelligence.setupContinuousMonitoring(config)

        logger.info('Compliance monitoring setup completed', {
          userId: user.id,
          configId: setupResult.id,
          monitoringType: setupResult.monitoringType,
          rulesCount: setupResult.rules.length
        })

        return NextResponse.json({
          success: true,
          monitoringConfig: setupResult,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: perform_assessment, create_rule, update_violation, check_realtime_compliance, setup_monitoring'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Compliance intelligence API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process compliance request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ruleId, updates } = body

    if (!ruleId || !updates) {
      return NextResponse.json({
        error: 'ruleId and updates object are required'
      }, { status: 400 })
    }

    const updatedRule = await advancedComplianceIntelligence.updateComplianceRule(ruleId, updates)

    logger.info('Compliance rule updated via API', {
      userId: user.id,
      ruleId,
      updatedFields: Object.keys(updates)
    })

    return NextResponse.json({
      success: true,
      rule: updatedRule,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Compliance rule update error:', error)
    
    return NextResponse.json({
      error: 'Failed to update compliance rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('ruleId')

    if (!ruleId) {
      return NextResponse.json({
        error: 'ruleId is required'
      }, { status: 400 })
    }

    await advancedComplianceIntelligence.deleteComplianceRule(ruleId)

    logger.info('Compliance rule deleted', {
      userId: user.id,
      ruleId
    })

    return NextResponse.json({
      success: true,
      message: 'Compliance rule deleted successfully',
      ruleId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Compliance rule deletion error:', error)
    
    return NextResponse.json({
      error: 'Failed to delete compliance rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}