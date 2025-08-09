import { NextRequest, NextResponse } from 'next/server'
import { naturalLanguageAnalytics, NLQueryRequest, NLQueryResult, QuerySuggestion } from '../../../services/natural-language-analytics'
import { auth } from '../../../lib/auth'
import { logger } from '../../../lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      action = 'process_query',
      query,
      context,
      preferences,
      metadata,
      sessionId
    } = body

    switch (action) {
      case 'process_query': {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return NextResponse.json({
            error: 'Query is required and must be a non-empty string'
          }, { status: 400 })
        }

        // Build natural language query request
        const nlQueryRequest: NLQueryRequest = {
          id: `nlquery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          query: query.trim(),
          context: {
            timeframe: context?.timeframe ? {
              start: new Date(context.timeframe.start),
              end: new Date(context.timeframe.end)
            } : undefined,
            filters: context?.filters || {},
            dataScope: context?.dataScope || [],
            userRole: context?.userRole || user.role || 'ASSOCIATE',
            previousQueries: context?.previousQueries || []
          },
          preferences: {
            responseFormat: preferences?.responseFormat || 'STRUCTURED',
            includeCharts: preferences?.includeCharts !== false,
            includeRecommendations: preferences?.includeRecommendations !== false,
            detailLevel: preferences?.detailLevel || 'DETAILED',
            confidenceThreshold: preferences?.confidenceThreshold || 0.7
          },
          metadata: {
            source: metadata?.source || 'WEB_UI',
            sessionId: sessionId,
            originalLanguage: metadata?.originalLanguage || 'en',
            businessContext: metadata?.businessContext || {}
          }
        }

        // Process the natural language query
        const queryResult = await naturalLanguageAnalytics.processNaturalLanguageQuery(nlQueryRequest)

        logger.info('Natural language query processed successfully', {
          userId: user.id,
          requestId: nlQueryRequest.id,
          queryId: queryResult.queryId,
          query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
          processingTime: queryResult.executionMetadata.processingTime,
          dataPointsAnalyzed: queryResult.executionMetadata.dataPointsAnalyzed,
          insightsGenerated: queryResult.insights.length,
          confidenceScore: queryResult.executionMetadata.confidenceScore
        })

        return NextResponse.json({
          success: true,
          requestId: nlQueryRequest.id,
          result: queryResult,
          timestamp: new Date().toISOString()
        })
      }

      case 'explain_interpretation': {
        if (!body.interpretation) {
          return NextResponse.json({
            error: 'interpretation object is required for explanation'
          }, { status: 400 })
        }

        const explanation = await naturalLanguageAnalytics.explainQueryInterpretation(body.interpretation)

        return NextResponse.json({
          success: true,
          explanation,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_suggestions': {
        const suggestionContext = {
          currentFocus: context?.currentFocus || [],
          userRole: context?.userRole || user.role || 'ASSOCIATE',
          recentQueries: context?.recentQueries || []
        }

        const suggestions = await naturalLanguageAnalytics.getQuerySuggestions(
          user.id,
          user.organizationId || 'default-org',
          suggestionContext
        )

        return NextResponse.json({
          success: true,
          suggestions,
          count: suggestions.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'start_session': {
        const session = await naturalLanguageAnalytics.getQuerySession(
          user.id,
          sessionId
        )

        logger.info('NL Analytics session started', {
          userId: user.id,
          sessionId: session.id,
          isNewSession: !sessionId
        })

        return NextResponse.json({
          success: true,
          session,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: process_query, explain_interpretation, get_suggestions, start_session'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Natural language analytics API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process natural language analytics request',
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

    switch (action) {
      case 'get_data_schema': {
        const dataSchema = await naturalLanguageAnalytics.getDataSchema()

        return NextResponse.json({
          success: true,
          dataSchema,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_session': {
        const sessionId = searchParams.get('sessionId')
        const session = await naturalLanguageAnalytics.getQuerySession(user.id, sessionId || undefined)

        return NextResponse.json({
          success: true,
          session,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_query_suggestions': {
        const userRole = searchParams.get('userRole') || user.role || 'ASSOCIATE'
        const currentFocus = searchParams.get('currentFocus')?.split(',') || []
        const recentQueries = searchParams.get('recentQueries')?.split(',') || []

        const suggestions = await naturalLanguageAnalytics.getQuerySuggestions(
          user.id,
          user.organizationId || 'default-org',
          {
            currentFocus,
            userRole,
            recentQueries
          }
        )

        return NextResponse.json({
          success: true,
          suggestions,
          count: suggestions.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_sample_queries': {
        // Return categorized sample queries for different user types
        const sampleQueries = {
          beginner: [
            {
              query: "What was our total revenue last month?",
              category: "Financial Performance",
              description: "Basic revenue query with time filter",
              expectedResults: "Monthly revenue total with trend indicator"
            },
            {
              query: "How many tasks were completed this week?",
              category: "Team Productivity", 
              description: "Simple task completion count",
              expectedResults: "Task completion count with completion rate"
            },
            {
              query: "Which team member has the highest utilization rate?",
              category: "Resource Management",
              description: "Individual performance comparison",
              expectedResults: "Ranked list of team members by utilization"
            }
          ],
          intermediate: [
            {
              query: "Compare our revenue this quarter vs last quarter by service line",
              category: "Comparative Analysis",
              description: "Multi-dimensional comparison with grouping",
              expectedResults: "Service line revenue comparison with growth rates"
            },
            {
              query: "Show me client satisfaction trends over the past 6 months",
              category: "Client Analytics",
              description: "Trend analysis with time series visualization",
              expectedResults: "Time series chart with satisfaction scores"
            },
            {
              query: "What are the top 5 most profitable clients and their profit margins?",
              category: "Profitability Analysis",
              description: "Ranking with calculated metrics",
              expectedResults: "Client profitability ranking with margin calculations"
            }
          ],
          advanced: [
            {
              query: "Predict next quarter's revenue based on current pipeline and identify key risk factors",
              category: "Predictive Analytics",
              description: "Forecasting with risk assessment",
              expectedResults: "Revenue forecast with confidence intervals and risk analysis"
            },
            {
              query: "Analyze team productivity patterns and identify potential burnout risks across all departments",
              category: "Workforce Analytics",
              description: "Complex pattern analysis with predictive insights",
              expectedResults: "Productivity analysis with burnout risk scores and recommendations"
            },
            {
              query: "Which compliance areas show declining trends and what's the financial impact if not addressed?",
              category: "Risk & Compliance",
              description: "Multi-faceted analysis with impact modeling",
              expectedResults: "Compliance trend analysis with financial impact projections"
            }
          ]
        }

        const userLevel = searchParams.get('level') as keyof typeof sampleQueries || 'beginner'
        const queries = sampleQueries[userLevel] || sampleQueries.beginner

        return NextResponse.json({
          success: true,
          queries,
          level: userLevel,
          availableLevels: Object.keys(sampleQueries),
          timestamp: new Date().toISOString()
        })
      }

      case 'get_supported_metrics': {
        const dataSchema = await naturalLanguageAnalytics.getDataSchema()
        
        const supportedMetrics = {
          financial: dataSchema.metrics.filter(m => m.category === 'Financial'),
          productivity: dataSchema.metrics.filter(m => m.category === 'Productivity'),
          all: dataSchema.metrics
        }

        const category = searchParams.get('category') as keyof typeof supportedMetrics
        const metrics = category ? supportedMetrics[category] : supportedMetrics.all

        return NextResponse.json({
          success: true,
          metrics,
          categories: Object.keys(supportedMetrics).filter(k => k !== 'all'),
          timestamp: new Date().toISOString()
        })
      }

      case 'get_business_glossary': {
        const dataSchema = await naturalLanguageAnalytics.getDataSchema()
        const glossary = dataSchema.businessGlossary

        const category = searchParams.get('category')
        const filteredGlossary = category 
          ? glossary.filter(term => term.category === category)
          : glossary

        const categories = [...new Set(glossary.map(term => term.category))]

        return NextResponse.json({
          success: true,
          glossary: filteredGlossary,
          categories,
          totalTerms: filteredGlossary.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_capabilities': {
        const capabilities = {
          supportedIntents: [
            {
              intent: 'ANALYZE',
              description: 'Perform descriptive analysis of metrics and dimensions',
              examples: ['What is our revenue?', 'Show me task completion rates'],
              complexity: 'Simple'
            },
            {
              intent: 'COMPARE',
              description: 'Compare metrics across different dimensions or time periods',
              examples: ['Compare revenue this quarter vs last quarter', 'Which team performs better?'],
              complexity: 'Intermediate'
            },
            {
              intent: 'TREND',
              description: 'Analyze trends and patterns over time',
              examples: ['Show revenue trends over the last year', 'How has productivity changed?'],
              complexity: 'Intermediate'
            },
            {
              intent: 'FORECAST',
              description: 'Predict future values based on historical data',
              examples: ['Predict next month\'s revenue', 'What will be our Q4 performance?'],
              complexity: 'Advanced'
            },
            {
              intent: 'SUMMARIZE',
              description: 'Provide executive summaries and key insights',
              examples: ['Give me an overview of this quarter', 'Summarize our key metrics'],
              complexity: 'Simple'
            }
          ],
          supportedDataTypes: [
            'Financial metrics (revenue, profit, costs)',
            'Productivity metrics (task completion, utilization)',
            'Client metrics (satisfaction, retention)',
            'Team performance (individual and aggregate)',
            'Compliance and risk indicators'
          ],
          visualizationTypes: [
            'Line charts for trends',
            'Bar charts for comparisons', 
            'KPI cards for key metrics',
            'Tables for detailed data',
            'Pie charts for distributions'
          ],
          naturalLanguageFeatures: [
            'Flexible query phrasing',
            'Support for business terminology',
            'Context-aware interpretations',
            'Conversational follow-ups',
            'Query suggestions and recommendations'
          ],
          limitations: [
            'Requires clear metric specification',
            'Complex multi-step analysis may need breakdown',
            'Data quality affects result accuracy',
            'AI interpretation has confidence thresholds'
          ]
        }

        return NextResponse.json({
          success: true,
          capabilities,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: get_data_schema, get_session, get_query_suggestions, get_sample_queries, get_supported_metrics, get_business_glossary, get_capabilities'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Natural language analytics GET API error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve natural language analytics data',
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
    const { sessionId, updates } = body

    if (!sessionId) {
      return NextResponse.json({
        error: 'sessionId is required'
      }, { status: 400 })
    }

    // Get existing session
    const session = await naturalLanguageAnalytics.getQuerySession(user.id, sessionId)
    
    // Update session context
    if (updates.context) {
      Object.assign(session.context, updates.context)
    }
    
    // Update preferences
    if (updates.preferences) {
      Object.assign(session.context.preferences, updates.preferences)
    }
    
    session.lastActiveAt = new Date()

    logger.info('NL Analytics session updated', {
      userId: user.id,
      sessionId,
      updatedFields: Object.keys(updates)
    })

    return NextResponse.json({
      success: true,
      session,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Session update error:', error)
    
    return NextResponse.json({
      error: 'Failed to update session',
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
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({
        error: 'sessionId is required'
      }, { status: 400 })
    }

    // In a real implementation, this would deactivate/delete the session
    const session = await naturalLanguageAnalytics.getQuerySession(user.id, sessionId)
    session.isActive = false

    logger.info('NL Analytics session ended', {
      userId: user.id,
      sessionId
    })

    return NextResponse.json({
      success: true,
      message: 'Session ended successfully',
      sessionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Session deletion error:', error)
    
    return NextResponse.json({
      error: 'Failed to end session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}