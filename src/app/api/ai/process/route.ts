// AI Processing API - Handles all AI requests from components
import { NextRequest, NextResponse } from 'next/server'
import { aiOrchestrator, UnifiedRequest } from '@/services/ai-orchestrator'
import { openaiService } from '@/services/openai-service'
import { vectorService } from '@/services/vector-service'
import { aiDatabase } from '@/services/ai-database'
import { AISecurityMiddleware } from '@/middleware/ai-security'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Security middleware check
  const securityCheck = await AISecurityMiddleware.protect(request, '/api/ai/process')
  if (securityCheck) {
    return securityCheck // Return security error response
  }

  try {
    const body = await request.json()
    const { type, data, userId, context } = body

    // Validate required fields
    if (!data || !userId) {
      await aiDatabase.logUsage({
        userId: userId || 'unknown',
        organizationId: context?.organizationId || 'unknown',
        endpoint: '/api/ai/process',
        requestType: type || 'unknown',
        userRole: context?.userRole || 'UNKNOWN',
        businessContext: context?.businessContext,
        success: false,
        errorMessage: 'Missing required fields',
        processingTime: Date.now() - startTime,
      })

      return NextResponse.json({ error: 'Missing required fields: data, userId' }, { status: 400 })
    }

    // Handle different request types from our AI components
    let response: any
    const analysisType: string = 'GENERAL'

    if (type === 'AI' || !type) {
      // Handle AI requests (chat, document analysis, insights)
      if (data.document) {
        // Document analysis request
        response = await openaiService.analyzeDocument({
          content: data.document,
          documentType: data.documentType || 'GENERAL',
          context: data.context,
        })
      } else if (data.message) {
        // Chat/insight request - use the correct method name
        response = await openaiService.chatWithAssistant({
          message: data.message,
          context: {
            userRole: context?.userRole || 'ASSOCIATE',
            businessContext: context?.businessContext,
            conversationHistory: data.conversationHistory,
          },
        })
      } else {
        // Generic AI processing through orchestrator
        const unifiedRequest: UnifiedRequest = {
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'AI',
          priority: context?.priority || 'MEDIUM',
          data: data,
          context: {
            userRole: context?.userRole || 'ASSOCIATE',
            businessContext: context?.businessContext || 'general',
            dataContext: context?.dataContext || {},
            preferences: {
              insightLevel: 'ADVANCED',
              preferredFormat: 'DETAILED',
              autoEnableAI: true,
              cachePreferences: true,
            },
          },
          userId: userId,
          timestamp: new Date(),
        }

        response = await aiOrchestrator.processUnifiedRequest(unifiedRequest)
      }
    } else if (type === 'VECTOR_SEARCH') {
      // Handle vector search requests
      response = await vectorService.semanticSearch({
        query: data.query,
        filters: data.filters,
        limit: data.limit || 10,
        threshold: data.threshold || 0.7,
      })
    } else {
      return NextResponse.json({ error: `Unsupported request type: ${type}` }, { status: 400 })
    }

    const processingTime = Date.now() - startTime

    // Store analysis result in database
    try {
      const analysisId = await aiDatabase.storeAnalysisResult({
        requestId,
        userId,
        organizationId: context?.organizationId || 'demo-org',
        type: analysisType as any,
        inputData: { type, data, context },
        outputData: response,
        confidence: response?.confidence || 0.8,
        processingTime,
        aiModel: 'gpt-4o-mini',
        cached: false,
      })

      // Log successful usage
      await aiDatabase.logUsage({
        userId,
        organizationId: context?.organizationId || 'demo-org',
        endpoint: '/api/ai/process',
        requestType: type || 'AI',
        userRole: context?.userRole || 'ASSOCIATE',
        businessContext: context?.businessContext,
        success: true,
        tokensUsed: response?.tokensUsed,
        processingTime,
      })

      // Add analysis ID to response
      response.analysisId = analysisId
    } catch (dbError) {
      console.error('Database storage failed:', dbError)
      // Don't fail the request if database storage fails
    }

    return NextResponse.json({
      success: true,
      data: response,
      requestId,
      processingTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AI API Error:', error)

    // Log failed usage - safely handle undefined body
    try {
      let requestBody: any = {}
      try {
        requestBody = await request.clone().json()
      } catch {
        // If we can't parse body, use empty object
      }

      await aiDatabase.logUsage({
        userId: requestBody?.userId || 'unknown',
        organizationId: requestBody?.context?.organizationId || 'unknown',
        endpoint: '/api/ai/process',
        requestType: requestBody?.type || 'unknown',
        userRole: requestBody?.context?.userRole || 'UNKNOWN',
        businessContext: requestBody?.context?.businessContext,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json(
      {
        error: 'Processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Test endpoint
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    message: 'AI Processing API is running',
    version: '1.0.0',
    capabilities: ['DOCUMENT_PROCESSING', 'ANALYTICS', 'INSIGHTS', 'RECOMMENDATIONS'],
    status: 'operational',
    timestamp: new Date().toISOString(),
  })
}
