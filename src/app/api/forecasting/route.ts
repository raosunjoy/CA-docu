import { NextRequest, NextResponse } from 'next/server'
import { predictiveForecasting, ForecastRequest, ScenarioAnalysisRequest, ModelCalibrationRequest } from '../../../services/predictive-forecasting'
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
      action = 'generate_forecast',
      metricType,
      historicalData,
      forecastHorizon,
      confidence,
      includeScenarios,
      businessRules,
      customParameters,
      modelType,
      seasonality,
      scenarios,
      modelId,
      calibrationData,
      targetMetrics
    } = body

    switch (action) {
      case 'generate_forecast': {
        if (!metricType || !historicalData || !forecastHorizon) {
          return NextResponse.json({
            error: 'metricType, historicalData, and forecastHorizon are required for forecast generation'
          }, { status: 400 })
        }

        if (!Array.isArray(historicalData) || historicalData.length < 2) {
          return NextResponse.json({
            error: 'historicalData must be an array with at least 2 data points'
          }, { status: 400 })
        }

        // Build forecast request
        const forecastRequest: ForecastRequest = {
          id: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          metricType,
          historicalData: historicalData.map((item: any) => ({
            date: new Date(item.date),
            value: Number(item.value),
            metadata: item.metadata || {}
          })),
          forecastHorizon: Number(forecastHorizon),
          confidence: confidence ? Number(confidence) : 0.95,
          modelPreferences: {
            modelType: modelType || 'AUTO',
            seasonality: seasonality || 'AUTO',
            includeConfidenceIntervals: true,
            customParameters: customParameters || {}
          },
          includeScenarios: includeScenarios !== false,
          businessRules: businessRules || [],
          metadata: {
            requestedBy: user.id,
            requestedAt: new Date(),
            source: 'API'
          }
        }

        // Generate forecast
        const forecast = await predictiveForecasting.generateForecast(forecastRequest)

        logger.info('Forecast generated successfully', {
          userId: user.id,
          requestId: forecastRequest.id,
          forecastId: forecast.forecastId,
          metricType,
          forecastHorizon,
          modelUsed: forecast.modelMetadata.primaryModel,
          confidence: forecast.confidence,
          dataPointsUsed: historicalData.length,
          processingTime: forecast.metadata.processingTime
        })

        return NextResponse.json({
          success: true,
          requestId: forecastRequest.id,
          forecast,
          timestamp: new Date().toISOString()
        })
      }

      case 'scenario_analysis': {
        if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
          return NextResponse.json({
            error: 'scenarios array is required for scenario analysis'
          }, { status: 400 })
        }

        if (!metricType || !historicalData) {
          return NextResponse.json({
            error: 'metricType and historicalData are required for scenario analysis'
          }, { status: 400 })
        }

        const scenarioRequest: ScenarioAnalysisRequest = {
          id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          metricType,
          baseHistoricalData: historicalData.map((item: any) => ({
            date: new Date(item.date),
            value: Number(item.value),
            metadata: item.metadata || {}
          })),
          scenarios: scenarios.map((scenario: any) => ({
            id: scenario.id || `scenario_${Math.random().toString(36).substr(2, 6)}`,
            name: scenario.name,
            description: scenario.description || '',
            assumptions: scenario.assumptions || [],
            parameters: scenario.parameters || {},
            probability: scenario.probability || 0.33,
            impact: scenario.impact || 'MEDIUM',
            timeframe: scenario.timeframe ? {
              start: new Date(scenario.timeframe.start),
              end: new Date(scenario.timeframe.end)
            } : undefined
          })),
          analysisDepth: 'COMPREHENSIVE',
          includeRiskAssessment: true,
          metadata: {
            requestedBy: user.id,
            requestedAt: new Date(),
            businessContext: body.businessContext || {}
          }
        }

        const analysis = await predictiveForecasting.performScenarioAnalysis(scenarioRequest)

        logger.info('Scenario analysis completed', {
          userId: user.id,
          requestId: scenarioRequest.id,
          analysisId: analysis.analysisId,
          scenarioCount: scenarios.length,
          processingTime: analysis.metadata.processingTime
        })

        return NextResponse.json({
          success: true,
          requestId: scenarioRequest.id,
          analysis,
          timestamp: new Date().toISOString()
        })
      }

      case 'risk_assessment': {
        if (!metricType || !historicalData) {
          return NextResponse.json({
            error: 'metricType and historicalData are required for risk assessment'
          }, { status: 400 })
        }

        const riskAssessment = await predictiveForecasting.assessRisks(
          metricType,
          historicalData.map((item: any) => ({
            date: new Date(item.date),
            value: Number(item.value),
            metadata: item.metadata || {}
          })),
          user.organizationId || 'default-org'
        )

        logger.info('Risk assessment completed', {
          userId: user.id,
          metricType,
          riskLevel: riskAssessment.overallRisk.level,
          riskScore: riskAssessment.overallRisk.score
        })

        return NextResponse.json({
          success: true,
          riskAssessment,
          timestamp: new Date().toISOString()
        })
      }

      case 'calibrate_model': {
        if (!modelType || !calibrationData) {
          return NextResponse.json({
            error: 'modelType and calibrationData are required for model calibration'
          }, { status: 400 })
        }

        const calibrationRequest: ModelCalibrationRequest = {
          id: `calibration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          modelType,
          calibrationData: calibrationData.map((item: any) => ({
            date: new Date(item.date),
            actualValue: Number(item.actualValue),
            predictedValue: Number(item.predictedValue),
            metadata: item.metadata || {}
          })),
          targetMetrics: targetMetrics || ['mape', 'rmse', 'mae'],
          optimizationGoal: 'MINIMIZE_ERROR',
          metadata: {
            requestedBy: user.id,
            requestedAt: new Date()
          }
        }

        const calibration = await predictiveForecasting.calibrateModel(calibrationRequest)

        logger.info('Model calibration completed', {
          userId: user.id,
          requestId: calibrationRequest.id,
          calibrationId: calibration.calibrationId,
          modelType,
          performanceImprovement: calibration.performanceMetrics.accuracy - calibration.baselineMetrics.accuracy
        })

        return NextResponse.json({
          success: true,
          requestId: calibrationRequest.id,
          calibration,
          timestamp: new Date().toISOString()
        })
      }

      case 'validate_model': {
        if (!modelId) {
          return NextResponse.json({
            error: 'modelId is required for model validation'
          }, { status: 400 })
        }

        const validation = await predictiveForecasting.validateModel(
          modelId,
          user.organizationId || 'default-org'
        )

        return NextResponse.json({
          success: true,
          modelId,
          validation,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: generate_forecast, scenario_analysis, risk_assessment, calibrate_model, validate_model'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Predictive forecasting API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process forecasting request',
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
      case 'get_supported_metrics': {
        const supportedMetrics = [
          {
            metricType: 'REVENUE',
            displayName: 'Revenue',
            description: 'Total revenue forecasting with seasonal patterns',
            dataRequirements: {
              minDataPoints: 12,
              recommendedDataPoints: 24,
              frequency: 'monthly',
              seasonalityDetection: true
            },
            supportedModels: ['ARIMA', 'PROPHET', 'EXPONENTIAL_SMOOTHING', 'ENSEMBLE'],
            typicalAccuracy: '85-95%',
            forecastHorizons: [1, 3, 6, 12, 24]
          },
          {
            metricType: 'CASH_FLOW',
            displayName: 'Cash Flow',
            description: 'Cash flow forecasting with liquidity risk assessment',
            dataRequirements: {
              minDataPoints: 12,
              recommendedDataPoints: 36,
              frequency: 'monthly',
              seasonalityDetection: true
            },
            supportedModels: ['ARIMA', 'LINEAR_REGRESSION', 'ENSEMBLE'],
            typicalAccuracy: '80-90%',
            forecastHorizons: [1, 3, 6, 12]
          },
          {
            metricType: 'CLIENT_ACQUISITION',
            displayName: 'Client Acquisition',
            description: 'New client acquisition rate forecasting',
            dataRequirements: {
              minDataPoints: 6,
              recommendedDataPoints: 24,
              frequency: 'monthly',
              seasonalityDetection: true
            },
            supportedModels: ['PROPHET', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION'],
            typicalAccuracy: '70-85%',
            forecastHorizons: [1, 3, 6, 12]
          },
          {
            metricType: 'UTILIZATION_RATE',
            displayName: 'Team Utilization',
            description: 'Team utilization rate forecasting and capacity planning',
            dataRequirements: {
              minDataPoints: 8,
              recommendedDataPoints: 24,
              frequency: 'weekly',
              seasonalityDetection: true
            },
            supportedModels: ['ARIMA', 'EXPONENTIAL_SMOOTHING', 'ENSEMBLE'],
            typicalAccuracy: '75-90%',
            forecastHorizons: [4, 8, 12, 24]
          },
          {
            metricType: 'PROJECT_COMPLETION',
            displayName: 'Project Completion Rate',
            description: 'Project completion forecasting and timeline prediction',
            dataRequirements: {
              minDataPoints: 10,
              recommendedDataPoints: 30,
              frequency: 'weekly',
              seasonalityDetection: false
            },
            supportedModels: ['LINEAR_REGRESSION', 'EXPONENTIAL_SMOOTHING'],
            typicalAccuracy: '70-85%',
            forecastHorizons: [2, 4, 8, 12]
          },
          {
            metricType: 'EXPENSE_FORECAST',
            displayName: 'Operating Expenses',
            description: 'Operating expense forecasting with cost optimization',
            dataRequirements: {
              minDataPoints: 12,
              recommendedDataPoints: 24,
              frequency: 'monthly',
              seasonalityDetection: true
            },
            supportedModels: ['ARIMA', 'PROPHET', 'ENSEMBLE'],
            typicalAccuracy: '80-92%',
            forecastHorizons: [1, 3, 6, 12]
          }
        ]

        const metricType = searchParams.get('metricType')
        const metrics = metricType 
          ? supportedMetrics.filter(m => m.metricType === metricType)
          : supportedMetrics

        return NextResponse.json({
          success: true,
          metrics,
          totalSupported: supportedMetrics.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_model_types': {
        const modelTypes = [
          {
            modelType: 'ARIMA',
            displayName: 'ARIMA (AutoRegressive Integrated Moving Average)',
            description: 'Best for stationary time series with clear trends and patterns',
            strengths: [
              'Handles trend and seasonality well',
              'Good for economic and financial data',
              'Robust statistical foundation',
              'Interpretable parameters'
            ],
            limitations: [
              'Requires stationary data',
              'Sensitive to outliers',
              'May struggle with irregular patterns'
            ],
            bestFor: ['Revenue forecasting', 'Financial metrics', 'Regular business cycles'],
            parameters: {
              p: 'Autoregressive order (1-5)',
              d: 'Degree of differencing (0-2)',
              q: 'Moving average order (1-5)'
            }
          },
          {
            modelType: 'PROPHET',
            displayName: 'Prophet (Facebook Prophet)',
            description: 'Designed for business time series with strong seasonal effects',
            strengths: [
              'Handles missing data well',
              'Robust to outliers',
              'Automatic seasonality detection',
              'Holiday effects modeling'
            ],
            limitations: [
              'Less suitable for short time series',
              'Can be slow for real-time predictions'
            ],
            bestFor: ['Sales forecasting', 'Website traffic', 'Seasonal business metrics'],
            parameters: {
              growth: 'linear or logistic',
              seasonality: 'automatic, manual, or disabled',
              holidays: 'custom holiday effects'
            }
          },
          {
            modelType: 'EXPONENTIAL_SMOOTHING',
            displayName: 'Exponential Smoothing',
            description: 'Simple yet effective for trend and seasonal patterns',
            strengths: [
              'Fast computation',
              'Good for short-term forecasts',
              'Handles trend and seasonality',
              'Low computational requirements'
            ],
            limitations: [
              'Limited for complex patterns',
              'May not capture regime changes'
            ],
            bestFor: ['Inventory forecasting', 'Demand planning', 'Short-term predictions'],
            parameters: {
              alpha: 'Level smoothing parameter (0-1)',
              beta: 'Trend smoothing parameter (0-1)',
              gamma: 'Seasonal smoothing parameter (0-1)'
            }
          },
          {
            modelType: 'LINEAR_REGRESSION',
            displayName: 'Linear Regression with Time Features',
            description: 'Linear model with engineered time-based features',
            strengths: [
              'Highly interpretable',
              'Fast training and prediction',
              'Good baseline model',
              'Easy to add external variables'
            ],
            limitations: [
              'Assumes linear relationships',
              'May not capture complex seasonality'
            ],
            bestFor: ['Simple trend analysis', 'Baseline forecasting', 'Feature importance analysis'],
            parameters: {
              features: 'Time-based features (trend, seasonality)',
              regularization: 'Ridge or Lasso regularization'
            }
          },
          {
            modelType: 'ENSEMBLE',
            displayName: 'Ensemble Model',
            description: 'Combines multiple models for improved accuracy',
            strengths: [
              'Often highest accuracy',
              'Robust to model failures',
              'Combines strengths of multiple approaches',
              'Reduced overfitting'
            ],
            limitations: [
              'More complex to interpret',
              'Slower computation',
              'Requires more data'
            ],
            bestFor: ['Critical business forecasts', 'Long-term planning', 'High-stakes decisions'],
            parameters: {
              models: 'Combination of ARIMA, Prophet, and others',
              weighting: 'Performance-based or equal weighting'
            }
          }
        ]

        const modelType = searchParams.get('modelType')
        const models = modelType 
          ? modelTypes.filter(m => m.modelType === modelType)
          : modelTypes

        return NextResponse.json({
          success: true,
          modelTypes: models,
          totalSupported: modelTypes.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_forecast_history': {
        const userId = searchParams.get('userId') || user.id
        const organizationId = searchParams.get('organizationId') || user.organizationId
        const metricType = searchParams.get('metricType')
        const limit = parseInt(searchParams.get('limit') || '10', 10)

        // In a real implementation, this would query the database
        // For now, return mock historical forecasts
        const mockHistory = [
          {
            forecastId: 'forecast_123',
            metricType: metricType || 'REVENUE',
            requestedAt: new Date('2024-01-15'),
            forecastHorizon: 6,
            modelUsed: 'ENSEMBLE',
            accuracy: 0.89,
            status: 'COMPLETED',
            summary: 'Q2 revenue forecast with 89% accuracy'
          },
          {
            forecastId: 'forecast_124',
            metricType: metricType || 'CASH_FLOW',
            requestedAt: new Date('2024-01-10'),
            forecastHorizon: 3,
            modelUsed: 'ARIMA',
            accuracy: 0.85,
            status: 'COMPLETED',
            summary: 'Cash flow forecast for Q1 with good accuracy'
          }
        ].slice(0, limit)

        return NextResponse.json({
          success: true,
          history: mockHistory,
          totalCount: mockHistory.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_model_performance': {
        const modelType = searchParams.get('modelType')
        const metricType = searchParams.get('metricType')

        // Mock performance data
        const performanceData = {
          modelType: modelType || 'ENSEMBLE',
          metricType: metricType || 'REVENUE',
          overallAccuracy: 0.87,
          metrics: {
            mape: 0.13,
            rmse: 1250.45,
            mae: 980.32,
            r2: 0.78
          },
          performanceByHorizon: [
            { horizon: 1, accuracy: 0.94 },
            { horizon: 3, accuracy: 0.89 },
            { horizon: 6, accuracy: 0.84 },
            { horizon: 12, accuracy: 0.78 }
          ],
          lastUpdated: new Date(),
          dataPointsUsed: 48
        }

        return NextResponse.json({
          success: true,
          performance: performanceData,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_business_rules_templates': {
        const businessRulesTemplates = [
          {
            id: 'revenue_growth_constraint',
            name: 'Revenue Growth Constraint',
            description: 'Limit revenue growth to realistic ranges',
            category: 'FINANCIAL',
            template: {
              type: 'RANGE_CONSTRAINT',
              field: 'revenue_growth_rate',
              minValue: -0.20,
              maxValue: 0.50,
              period: 'monthly'
            },
            applicableMetrics: ['REVENUE', 'CASH_FLOW'],
            examples: [
              'Monthly revenue growth should not exceed 50%',
              'Revenue decline should not exceed 20%'
            ]
          },
          {
            id: 'seasonality_adjustment',
            name: 'Seasonal Adjustment',
            description: 'Apply known seasonal patterns to forecasts',
            category: 'SEASONAL',
            template: {
              type: 'SEASONAL_MULTIPLIER',
              pattern: 'monthly',
              multipliers: {
                'Q1': 0.85,
                'Q2': 1.05,
                'Q3': 0.95,
                'Q4': 1.15
              }
            },
            applicableMetrics: ['REVENUE', 'CLIENT_ACQUISITION', 'UTILIZATION_RATE'],
            examples: [
              'Q4 typically sees 15% higher revenue',
              'Q1 usually has 15% lower activity'
            ]
          },
          {
            id: 'capacity_constraint',
            name: 'Capacity Constraint',
            description: 'Ensure forecasts respect capacity limits',
            category: 'OPERATIONAL',
            template: {
              type: 'CAPACITY_LIMIT',
              field: 'max_utilization',
              maxValue: 0.95,
              enforceMethod: 'HARD_LIMIT'
            },
            applicableMetrics: ['UTILIZATION_RATE', 'PROJECT_COMPLETION'],
            examples: [
              'Team utilization cannot exceed 95%',
              'Maximum project capacity is 20 concurrent projects'
            ]
          },
          {
            id: 'market_condition_adjustment',
            name: 'Market Condition Adjustment',
            description: 'Adjust forecasts based on market conditions',
            category: 'MARKET',
            template: {
              type: 'CONDITIONAL_ADJUSTMENT',
              condition: 'market_sentiment',
              adjustments: {
                'BULLISH': 1.10,
                'NEUTRAL': 1.00,
                'BEARISH': 0.90
              }
            },
            applicableMetrics: ['REVENUE', 'CLIENT_ACQUISITION', 'CASH_FLOW'],
            examples: [
              'Increase forecast by 10% in bullish market',
              'Decrease forecast by 10% in bearish market'
            ]
          }
        ]

        const category = searchParams.get('category')
        const metricType = searchParams.get('metricType')
        
        let filteredTemplates = businessRulesTemplates
        
        if (category) {
          filteredTemplates = filteredTemplates.filter(t => t.category === category)
        }
        
        if (metricType) {
          filteredTemplates = filteredTemplates.filter(t => 
            t.applicableMetrics.includes(metricType)
          )
        }

        return NextResponse.json({
          success: true,
          templates: filteredTemplates,
          categories: [...new Set(businessRulesTemplates.map(t => t.category))],
          timestamp: new Date().toISOString()
        })
      }

      case 'get_forecast_capabilities': {
        const capabilities = {
          supportedModels: ['ARIMA', 'PROPHET', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION', 'ENSEMBLE'],
          supportedMetrics: ['REVENUE', 'CASH_FLOW', 'CLIENT_ACQUISITION', 'UTILIZATION_RATE', 'PROJECT_COMPLETION', 'EXPENSE_FORECAST'],
          maxForecastHorizon: 24,
          minDataPointsRequired: 6,
          recommendedDataPoints: 24,
          supportedFrequencies: ['daily', 'weekly', 'monthly', 'quarterly'],
          features: {
            scenarioAnalysis: true,
            riskAssessment: true,
            confidenceIntervals: true,
            seasonalityDetection: true,
            anomalyDetection: true,
            businessRules: true,
            modelCalibration: true,
            ensembleMethods: true
          },
          limitations: {
            minDataPoints: 6,
            maxDataPointsPerRequest: 10000,
            maxForecastHorizon: 24,
            supportedDataTypes: ['numeric time series'],
            processingTimeLimit: '5 minutes'
          },
          accuracyExpectations: {
            shortTerm: '85-95% (1-3 periods)',
            mediumTerm: '75-90% (3-12 periods)',
            longTerm: '65-80% (12+ periods)'
          }
        }

        return NextResponse.json({
          success: true,
          capabilities,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: get_supported_metrics, get_model_types, get_forecast_history, get_model_performance, get_business_rules_templates, get_forecast_capabilities'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Predictive forecasting GET API error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve forecasting data',
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
    const { forecastId, updates } = body

    if (!forecastId) {
      return NextResponse.json({
        error: 'forecastId is required'
      }, { status: 400 })
    }

    // In a real implementation, this would update the forecast in the database
    const updatedForecast = {
      forecastId,
      ...updates,
      updatedAt: new Date(),
      updatedBy: user.id
    }

    logger.info('Forecast updated', {
      userId: user.id,
      forecastId,
      updatedFields: Object.keys(updates)
    })

    return NextResponse.json({
      success: true,
      forecast: updatedForecast,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Forecast update error:', error)
    
    return NextResponse.json({
      error: 'Failed to update forecast',
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
    const forecastId = searchParams.get('forecastId')

    if (!forecastId) {
      return NextResponse.json({
        error: 'forecastId is required'
      }, { status: 400 })
    }

    // In a real implementation, this would delete/archive the forecast
    logger.info('Forecast deleted', {
      userId: user.id,
      forecastId
    })

    return NextResponse.json({
      success: true,
      message: 'Forecast deleted successfully',
      forecastId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Forecast deletion error:', error)
    
    return NextResponse.json({
      error: 'Failed to delete forecast',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}