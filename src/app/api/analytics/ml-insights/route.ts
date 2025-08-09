/**
 * ML Analytics Insights API
 * Advanced predictive analytics endpoint for compliance, revenue, and risk insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/middleware'
import { MLAnalyticsEngine, CompliancePredictionModel, RevenueForecastingModel, ClientRiskAssessmentModel } from '@/lib/ml-analytics-engine'
import { z } from 'zod'
import { APIResponse } from '@/types'

// Request schemas
const insightsQuerySchema = z.object({
  clientId: z.string().optional(),
  analysisType: z.enum(['all', 'compliance', 'revenue', 'risk']).default('all'),
  period: z.enum(['3m', '6m', '12m']).default('6m'),
  includeRecommendations: z.boolean().default(true)
})

const compliancePredictionSchema = z.object({
  clientId: z.string(),
  complianceType: z.enum(['GST_RETURN', 'INCOME_TAX_RETURN', 'ADVANCE_TAX', 'TDS_RETURN', 'AUDIT_REPORT']),
  timeframe: z.enum(['next_month', 'next_quarter', 'next_year']).default('next_month')
})

const revenueForecastSchema = z.object({
  periods: z.number().min(1).max(24).default(12),
  includeSeasonality: z.boolean().default(true),
  confidenceInterval: z.number().min(0.8).max(0.99).default(0.95)
})

const riskAssessmentSchema = z.object({
  clientId: z.string(),
  includeRecommendations: z.boolean().default(true),
  riskCategories: z.array(z.enum(['payment', 'compliance', 'business', 'communication', 'regulatory'])).optional()
})

// GET /api/analytics/ml-insights - Generate ML-powered insights
export async function GET(request: NextRequest): Promise<NextResponse<APIResponse<any>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    
    const validatedQuery = insightsQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    // Generate insights based on analysis type
    let insights: any = {}

    switch (validatedQuery.analysisType) {
      case 'all':
        insights = await MLAnalyticsEngine.generateInsights(
          user.orgId,
          validatedQuery.clientId
        )
        break

      case 'compliance':
        if (!validatedQuery.clientId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_CLIENT_ID',
                message: 'Client ID required for compliance analysis'
              }
            },
            { status: 400 }
          )
        }
        
        insights.compliancePredictions = [
          await CompliancePredictionModel.predictComplianceRisk(
            validatedQuery.clientId, 
            'GST_RETURN'
          ),
          await CompliancePredictionModel.predictComplianceRisk(
            validatedQuery.clientId, 
            'INCOME_TAX_RETURN'
          )
        ]
        break

      case 'revenue':
        insights.revenueForecast = await RevenueForecastingModel.forecastRevenue(user.orgId)
        break

      case 'risk':
        if (!validatedQuery.clientId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_CLIENT_ID',
                message: 'Client ID required for risk analysis'
              }
            },
            { status: 400 }
          )
        }

        insights.clientRiskAssessment = await ClientRiskAssessmentModel.assessClientRisk(
          validatedQuery.clientId
        )
        break
    }

    // Add performance metadata
    const performanceMetrics = {
      analysisType: validatedQuery.analysisType,
      dataPoints: this.calculateDataPoints(insights),
      confidenceScore: this.calculateOverallConfidence(insights),
      recommendations: this.extractRecommendations(insights),
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: {
        insights,
        performance: performanceMetrics,
        metadata: {
          organizationId: user.orgId,
          userId: user.sub,
          analysisType: validatedQuery.analysisType,
          period: validatedQuery.period,
          generatedAt: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('ML insights generation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INSIGHTS_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to generate insights'
        }
      },
      { status: 500 }
    )
  }

  // Helper methods
  function calculateDataPoints(insights: any): number {
    let points = 0
    if (insights.compliancePredictions) points += insights.compliancePredictions.length * 10
    if (insights.revenueForecast) points += insights.revenueForecast.forecast?.length || 0
    if (insights.clientRiskAssessment) points += 15 // Risk factors + recommendations
    return points
  }

  function calculateOverallConfidence(insights: any): number {
    const confidenceScores: number[] = []
    
    if (insights.compliancePredictions) {
      insights.compliancePredictions.forEach((pred: any) => {
        confidenceScores.push(pred.confidence)
      })
    }
    
    if (insights.clientRiskAssessment) {
      confidenceScores.push(insights.clientRiskAssessment.confidenceLevel)
    }
    
    if (insights.revenueForecast) {
      const avgForecastConfidence = insights.revenueForecast.forecast
        ?.reduce((sum: number, f: any) => sum + f.confidence, 0) / 
        (insights.revenueForecast.forecast?.length || 1)
      if (avgForecastConfidence) confidenceScores.push(avgForecastConfidence)
    }
    
    return confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0.5
  }

  function extractRecommendations(insights: any): string[] {
    const recommendations: string[] = []
    
    if (insights.clientRiskAssessment?.recommendations) {
      recommendations.push(...insights.clientRiskAssessment.recommendations)
    }
    
    if (insights.insights) {
      insights.insights.forEach((insight: any) => {
        if (insight.actionable) {
          recommendations.push(insight.description)
        }
      })
    }
    
    return recommendations.slice(0, 10) // Limit to top 10
  }
}

// POST /api/analytics/ml-insights/compliance - Specific compliance prediction
export async function POST(request: NextRequest): Promise<NextResponse<APIResponse<any>>> {
  try {
    const authResult = await authMiddleware({})(request)
    if (authResult instanceof NextResponse) {
      return authResult as NextResponse<APIResponse<any>>
    }

    const { user } = authResult
    const body = await request.json()
    
    const endpoint = new URL(request.url).pathname
    
    if (endpoint.endsWith('/compliance')) {
      const validatedData = compliancePredictionSchema.parse(body)
      
      const prediction = await CompliancePredictionModel.predictComplianceRisk(
        validatedData.clientId,
        validatedData.complianceType
      )

      return NextResponse.json({
        success: true,
        data: {
          prediction,
          client: validatedData.clientId,
          complianceType: validatedData.complianceType,
          timeframe: validatedData.timeframe,
          generatedAt: new Date().toISOString()
        }
      })
    }
    
    if (endpoint.endsWith('/revenue')) {
      const validatedData = revenueForecastSchema.parse(body)
      
      const forecast = await RevenueForecastingModel.forecastRevenue(
        user.orgId,
        validatedData.periods
      )

      return NextResponse.json({
        success: true,
        data: {
          forecast,
          periods: validatedData.periods,
          includeSeasonality: validatedData.includeSeasonality,
          confidenceInterval: validatedData.confidenceInterval,
          generatedAt: new Date().toISOString()
        }
      })
    }
    
    if (endpoint.endsWith('/risk')) {
      const validatedData = riskAssessmentSchema.parse(body)
      
      const riskAssessment = await ClientRiskAssessmentModel.assessClientRisk(
        validatedData.clientId
      )

      return NextResponse.json({
        success: true,
        data: {
          riskAssessment,
          client: validatedData.clientId,
          categories: validatedData.riskCategories,
          includeRecommendations: validatedData.includeRecommendations,
          generatedAt: new Date().toISOString()
        }
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_ENDPOINT',
          message: 'Unsupported analysis endpoint'
        }
      },
      { status: 400 }
    )

  } catch (error) {
    console.error('ML analysis error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to perform analysis'
        }
      },
      { status: 500 }
    )
  }
}