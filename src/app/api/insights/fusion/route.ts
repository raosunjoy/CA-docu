import { NextRequest, NextResponse } from 'next/server'
import { unifiedInsightFusion, FusionInsightRequest } from '../../../../services/unified-insight-fusion'
import { auth } from '../../../../lib/auth'
import { logger } from '../../../../lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      action = 'generate_fusion',
      sources,
      businessContext,
      preferences = {},
      priority = 'MEDIUM'
    } = body

    switch (action) {
      case 'generate_fusion': {
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
          return NextResponse.json({
            error: 'sources array is required and must not be empty'
          }, { status: 400 })
        }

        // Validate sources
        for (const source of sources) {
          if (!source.type || !source.sourceId || !source.data) {
            return NextResponse.json({
              error: 'Each source must have type, sourceId, and data fields'
            }, { status: 400 })
          }
        }

        // Build fusion request
        const fusionRequest: FusionInsightRequest = {
          id: `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          context: {
            userRole: (businessContext?.userRole || user.role || 'ASSOCIATE') as any,
            currentProjects: businessContext?.currentProjects || [],
            activeClients: businessContext?.activeClients || [],
            timeframe: {
              start: businessContext?.timeframe?.start ? new Date(businessContext.timeframe.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: businessContext?.timeframe?.end ? new Date(businessContext.timeframe.end) : new Date()
            },
            businessObjectives: businessContext?.businessObjectives || [
              {
                type: 'EFFICIENCY',
                priority: 1,
                description: 'Improve operational efficiency'
              }
            ],
            contextualFactors: businessContext?.contextualFactors || []
          },
          sources: sources.map(source => ({
            ...source,
            weight: source.weight || 1.0,
            reliability: source.reliability || 0.8,
            timestamp: source.timestamp ? new Date(source.timestamp) : new Date()
          })),
          preferences: {
            insightDepth: preferences.insightDepth || 'DETAILED',
            includeRecommendations: preferences.includeRecommendations !== false,
            includePredictions: preferences.includePredictions !== false,
            includeRiskAssessment: preferences.includeRiskAssessment !== false,
            focusAreas: preferences.focusAreas || [
              { area: 'FINANCIAL_PERFORMANCE', priority: 1 },
              { area: 'OPERATIONAL_EFFICIENCY', priority: 2 }
            ],
            outputFormat: preferences.outputFormat || 'STRUCTURED'
          },
          priority: priority as any
        }

        // Generate fusion insights
        const fusionResult = await unifiedInsightFusion.generateFusedInsights(fusionRequest)

        logger.info('Unified insight fusion completed', {
          userId: user.id,
          requestId: fusionRequest.id,
          sourcesCount: sources.length,
          insightsGenerated: fusionResult.insights.length,
          processingTime: fusionResult.fusionMetadata.processingTime,
          confidenceScore: fusionResult.fusionMetadata.confidenceScore
        })

        return NextResponse.json({
          success: true,
          requestId: fusionRequest.id,
          fusionResult,
          timestamp: new Date().toISOString()
        })
      }

      case 'validate_sources': {
        if (!sources || !Array.isArray(sources)) {
          return NextResponse.json({
            error: 'sources array is required for validation'
          }, { status: 400 })
        }

        const validationResults = sources.map(source => {
          const isValid = source.type && source.sourceId && source.data
          const issues = []

          if (!source.type) issues.push('Missing type field')
          if (!source.sourceId) issues.push('Missing sourceId field')
          if (!source.data) issues.push('Missing data field')
          
          // Type-specific validation
          if (source.type === 'ANALYTICS' && !source.data.metrics && !source.data.kpis) {
            issues.push('Analytics source should contain metrics or kpis data')
          }
          
          if (source.type === 'AI_DOCUMENT' && !source.data.document) {
            issues.push('AI_DOCUMENT source should contain document data')
          }

          return {
            sourceId: source.sourceId,
            type: source.type,
            isValid,
            issues: issues.length > 0 ? issues : undefined,
            qualityScore: this.assessSourceQuality(source)
          }
        })

        const validSources = validationResults.filter(result => result.isValid).length
        const totalSources = sources.length

        return NextResponse.json({
          success: true,
          validationSummary: {
            totalSources,
            validSources,
            invalidSources: totalSources - validSources,
            validationPassed: validSources === totalSources
          },
          sourceResults: validationResults,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_fusion_templates': {
        const templates = [
          {
            name: 'Financial Performance Analysis',
            description: 'Comprehensive analysis focusing on financial metrics and trends',
            requiredSources: ['ANALYTICS'],
            focusAreas: ['FINANCIAL_PERFORMANCE'],
            preferences: {
              insightDepth: 'COMPREHENSIVE',
              includeRecommendations: true,
              includePredictions: true,
              outputFormat: 'EXECUTIVE_SUMMARY'
            }
          },
          {
            name: 'Operational Efficiency Review',
            description: 'Analysis of operational metrics and improvement opportunities',
            requiredSources: ['ANALYTICS', 'AI_DOCUMENT'],
            focusAreas: ['OPERATIONAL_EFFICIENCY', 'TEAM_PRODUCTIVITY'],
            preferences: {
              insightDepth: 'DETAILED',
              includeRecommendations: true,
              includePredictions: false,
              outputFormat: 'STRUCTURED'
            }
          },
          {
            name: 'Compliance & Risk Assessment',
            description: 'Focus on compliance status and risk factors',
            requiredSources: ['AI_DOCUMENT', 'ANALYTICS'],
            focusAreas: ['COMPLIANCE_STATUS'],
            preferences: {
              insightDepth: 'DETAILED',
              includeRiskAssessment: true,
              includeRecommendations: true,
              outputFormat: 'STRUCTURED'
            }
          },
          {
            name: 'Client Satisfaction Analysis',
            description: 'Analysis of client-related metrics and feedback',
            requiredSources: ['ANALYTICS', 'AI_CONVERSATION'],
            focusAreas: ['CLIENT_SATISFACTION'],
            preferences: {
              insightDepth: 'DETAILED',
              includeRecommendations: true,
              includePredictions: true,
              outputFormat: 'NARRATIVE'
            }
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
          error: 'Invalid action. Supported actions: generate_fusion, validate_sources, get_fusion_templates'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Unified insight fusion API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process insight fusion request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const requestId = searchParams.get('requestId')

    switch (action) {
      case 'get_fusion_status': {
        if (!requestId) {
          return NextResponse.json({
            error: 'requestId is required'
          }, { status: 400 })
        }

        // In a real implementation, this would check the processing status
        // For now, return a mock status
        const status = {
          requestId,
          status: 'COMPLETED',
          progress: 100,
          stage: 'Fusion Complete',
          estimatedTimeRemaining: 0,
          processingStarted: new Date(Date.now() - 30000), // 30 seconds ago
          processingCompleted: new Date()
        }

        return NextResponse.json({
          success: true,
          status,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_fusion_capabilities': {
        const capabilities = {
          supportedSourceTypes: [
            'ANALYTICS',
            'AI_DOCUMENT',
            'AI_CONVERSATION',
            'EXTERNAL_DATA',
            'HISTORICAL_PATTERN'
          ],
          maxSources: 20,
          supportedInsightTypes: [
            'STRATEGIC',
            'OPERATIONAL',
            'TACTICAL',
            'IMMEDIATE_ACTION'
          ],
          supportedFocusAreas: [
            'FINANCIAL_PERFORMANCE',
            'OPERATIONAL_EFFICIENCY',
            'COMPLIANCE_STATUS',
            'CLIENT_SATISFACTION',
            'TEAM_PRODUCTIVITY'
          ],
          outputFormats: [
            'NARRATIVE',
            'STRUCTURED',
            'EXECUTIVE_SUMMARY'
          ],
          processingCapabilities: {
            crossSourceCorrelation: true,
            predictiveInsights: true,
            riskAssessment: true,
            actionableRecommendations: true,
            businessValueQuantification: true
          }
        }

        return NextResponse.json({
          success: true,
          capabilities,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_sample_sources': {
        const sampleSources = [
          {
            type: 'ANALYTICS',
            sourceId: 'monthly_kpis_2024_01',
            description: 'Monthly KPI analytics data',
            sampleData: {
              kpis: [
                { metric: 'task_completion_rate', value: 85, trend: 'UP', benchmark: 80 },
                { metric: 'client_satisfaction', value: 4.2, trend: 'STABLE', benchmark: 4.0 }
              ],
              trends: [
                { pattern: 'productivity', direction: 'INCREASING', strength: 0.7 }
              ]
            }
          },
          {
            type: 'AI_DOCUMENT',
            sourceId: 'contract_analysis_doc_123',
            description: 'AI analysis of contract document',
            sampleData: {
              document: {
                metadata: {
                  classification: { primaryType: 'CONTRACT', confidence: 0.92 },
                  risks: [
                    { category: 'FINANCIAL', level: 'MEDIUM', description: 'Payment terms review needed' }
                  ],
                  compliance: { complianceStatus: 'COMPLIANT', issues: [] }
                }
              }
            }
          },
          {
            type: 'AI_CONVERSATION',
            sourceId: 'client_meeting_summary_456',
            description: 'AI-generated meeting summary',
            sampleData: {
              insights: [
                { title: 'Client Satisfaction High', description: 'Client expressed satisfaction with services', confidence: 0.8 }
              ],
              recommendations: [
                { title: 'Follow-up Meeting', description: 'Schedule quarterly review', priority: 'MEDIUM' }
              ]
            }
          }
        ]

        return NextResponse.json({
          success: true,
          sampleSources,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: get_fusion_status, get_fusion_capabilities, get_sample_sources'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Unified insight fusion GET API error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve fusion data',
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
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json({
        error: 'requestId is required'
      }, { status: 400 })
    }

    // In a real implementation, this would cancel/delete the fusion request
    logger.info('Fusion request cancelled', {
      userId: user.id,
      requestId
    })

    return NextResponse.json({
      success: true,
      message: 'Fusion request cancelled successfully',
      requestId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Fusion request cancellation error:', error)
    
    return NextResponse.json({
      error: 'Failed to cancel fusion request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper method for source quality assessment
function assessSourceQuality(source: any): number {
  let quality = 0.5 // Base quality

  // Check for required fields
  if (source.type && source.sourceId && source.data) {
    quality += 0.3
  }

  // Check for optional quality indicators
  if (source.weight && source.weight > 0 && source.weight <= 1) {
    quality += 0.1
  }

  if (source.reliability && source.reliability > 0 && source.reliability <= 1) {
    quality += 0.1
  }

  if (source.timestamp && new Date(source.timestamp) <= new Date()) {
    quality += 0.1
  }

  return Math.min(1, quality)
}