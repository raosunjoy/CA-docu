import { NextRequest, NextResponse } from 'next/server'
import { anomalyDetectionService, AnomalyDetectionRequest, AnomalySubscription } from '../../../services/anomaly-detection-service'
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
      action = 'detect_anomalies',
      data,
      algorithms = ['STATISTICAL', 'ISOLATION_FOREST'],
      thresholds,
      metadata,
      subscriptionId,
      alertSettings
    } = body

    switch (action) {
      case 'detect_anomalies': {
        if (!data || !Array.isArray(data) || data.length === 0) {
          return NextResponse.json({
            error: 'data array is required and must not be empty'
          }, { status: 400 })
        }

        // Validate data points
        for (const point of data) {
          if (typeof point.value !== 'number' || !point.timestamp || !point.metric) {
            return NextResponse.json({
              error: 'Each data point must have value (number), timestamp, and metric fields'
            }, { status: 400 })
          }
        }

        // Build anomaly detection request
        const detectionRequest: AnomalyDetectionRequest = {
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          data: data.map(point => ({
            ...point,
            timestamp: new Date(point.timestamp)
          })),
          algorithms: algorithms.filter((alg: string) => 
            ['STATISTICAL', 'ISOLATION_FOREST', 'ONE_CLASS_SVM', 'ENSEMBLE'].includes(alg)
          ),
          thresholds: {
            sensitivity: thresholds?.sensitivity || 0.05,
            minAnomalyScore: thresholds?.minAnomalyScore || 0.7,
            maxFalsePositiveRate: thresholds?.maxFalsePositiveRate || 0.1,
            businessImpactThreshold: thresholds?.businessImpactThreshold || 'MEDIUM'
          },
          metadata: {
            dataSource: metadata?.dataSource || 'API_REQUEST',
            businessContext: metadata?.businessContext || {},
            expectedPatterns: metadata?.expectedPatterns || [],
            seasonalityInfo: metadata?.seasonalityInfo,
            customTags: metadata?.customTags || []
          }
        }

        // Detect anomalies
        const detectionResult = await anomalyDetectionService.detectAnomalies(detectionRequest)

        logger.info('Anomaly detection completed', {
          userId: user.id,
          requestId: detectionRequest.id,
          dataPoints: data.length,
          anomaliesDetected: detectionResult.anomalies.length,
          processingTime: detectionResult.processingMetadata.processingTime,
          algorithms: detectionRequest.algorithms
        })

        return NextResponse.json({
          success: true,
          requestId: detectionRequest.id,
          detectionResult,
          timestamp: new Date().toISOString()
        })
      }

      case 'create_subscription': {
        if (!data || typeof data !== 'object') {
          return NextResponse.json({
            error: 'subscription data object is required'
          }, { status: 400 })
        }

        const subscription: AnomalySubscription = {
          id: subscriptionId || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          organizationId: user.organizationId || 'default-org',
          name: data.name || 'Unnamed Subscription',
          description: data.description,
          dataSource: data.dataSource || 'UNKNOWN',
          metrics: data.metrics || [],
          algorithms: data.algorithms || ['STATISTICAL'],
          thresholds: {
            sensitivity: data.thresholds?.sensitivity || 0.05,
            minAnomalyScore: data.thresholds?.minAnomalyScore || 0.7,
            maxFalsePositiveRate: data.thresholds?.maxFalsePositiveRate || 0.1,
            businessImpactThreshold: data.thresholds?.businessImpactThreshold || 'MEDIUM'
          },
          alertSettings: {
            enabled: alertSettings?.enabled !== false,
            channels: alertSettings?.channels || ['EMAIL'],
            recipients: alertSettings?.recipients || [user.email || user.id],
            escalationRules: alertSettings?.escalationRules || [],
            throttling: {
              maxAlertsPerHour: alertSettings?.throttling?.maxAlertsPerHour || 10,
              cooldownPeriodMinutes: alertSettings?.throttling?.cooldownPeriodMinutes || 15,
              groupSimilarAlerts: alertSettings?.throttling?.groupSimilarAlerts !== false
            },
            customTemplates: alertSettings?.customTemplates || {}
          },
          schedule: {
            enabled: data.schedule?.enabled !== false,
            frequency: data.schedule?.frequency || 'HOURLY',
            timezone: data.schedule?.timezone || 'UTC',
            customCron: data.schedule?.customCron
          },
          metadata: {
            businessContext: data.metadata?.businessContext || {},
            expectedPatterns: data.metadata?.expectedPatterns || [],
            customTags: data.metadata?.customTags || []
          },
          isActive: data.isActive !== false,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const createdSubscription = await anomalyDetectionService.createAnomalySubscription(subscription)

        logger.info('Anomaly subscription created', {
          userId: user.id,
          subscriptionId: createdSubscription.id,
          metrics: createdSubscription.metrics,
          algorithms: createdSubscription.algorithms
        })

        return NextResponse.json({
          success: true,
          subscription: createdSubscription,
          timestamp: new Date().toISOString()
        })
      }

      case 'validate_data': {
        if (!data || !Array.isArray(data)) {
          return NextResponse.json({
            error: 'data array is required for validation'
          }, { status: 400 })
        }

        const validationResults = data.map((point, index) => {
          const isValid = typeof point.value === 'number' && point.timestamp && point.metric
          const issues = []

          if (typeof point.value !== 'number') issues.push('Value must be a number')
          if (!point.timestamp) issues.push('Timestamp is required')
          if (!point.metric) issues.push('Metric name is required')
          if (isNaN(new Date(point.timestamp).getTime())) issues.push('Invalid timestamp format')

          return {
            index,
            isValid,
            issues: issues.length > 0 ? issues : undefined,
            point: {
              metric: point.metric,
              value: point.value,
              timestamp: point.timestamp
            }
          }
        })

        const validPoints = validationResults.filter(result => result.isValid).length
        const totalPoints = data.length

        return NextResponse.json({
          success: true,
          validationSummary: {
            totalPoints,
            validPoints,
            invalidPoints: totalPoints - validPoints,
            validationPassed: validPoints === totalPoints,
            dataQualityScore: validPoints / totalPoints
          },
          pointResults: validationResults,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_model_performance': {
        const organizationId = user.organizationId || 'default-org'
        const performance = await anomalyDetectionService.getModelPerformance(organizationId)

        return NextResponse.json({
          success: true,
          performance,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: detect_anomalies, create_subscription, validate_data, get_model_performance'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Anomaly detection API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process anomaly detection request',
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
    const subscriptionId = searchParams.get('subscriptionId')
    const organizationId = user.organizationId || 'default-org'

    switch (action) {
      case 'get_subscriptions': {
        const subscriptions = await anomalyDetectionService.getAnomalySubscriptions(organizationId)

        return NextResponse.json({
          success: true,
          subscriptions,
          count: subscriptions.length,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_subscription': {
        if (!subscriptionId) {
          return NextResponse.json({
            error: 'subscriptionId is required'
          }, { status: 400 })
        }

        const subscription = await anomalyDetectionService.getAnomalySubscription(subscriptionId)

        if (!subscription) {
          return NextResponse.json({
            error: 'Subscription not found'
          }, { status: 404 })
        }

        return NextResponse.json({
          success: true,
          subscription,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_detection_history': {
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')
        const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
        const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

        // In a real implementation, this would query the detection history
        const mockHistory = {
          detections: [],
          totalCount: 0,
          hasMore: false,
          timeRange: {
            start: startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: endDate || new Date()
          }
        }

        return NextResponse.json({
          success: true,
          history: mockHistory,
          pagination: {
            limit,
            offset,
            totalCount: mockHistory.totalCount
          },
          timestamp: new Date().toISOString()
        })
      }

      case 'get_alert_status': {
        if (!subscriptionId) {
          return NextResponse.json({
            error: 'subscriptionId is required for alert status'
          }, { status: 400 })
        }

        // Mock alert status
        const alertStatus = {
          subscriptionId,
          isActive: true,
          lastAlertSent: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          alertsToday: 3,
          alertsThisWeek: 15,
          throttlingActive: false,
          nextScheduledCheck: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
          recentAlerts: []
        }

        return NextResponse.json({
          success: true,
          alertStatus,
          timestamp: new Date().toISOString()
        })
      }

      case 'get_detection_capabilities': {
        const capabilities = {
          supportedAlgorithms: [
            {
              name: 'STATISTICAL',
              description: 'Statistical outlier detection using z-score and IQR methods',
              bestFor: 'Normal distributions, simple patterns',
              parameters: ['zScoreThreshold', 'iqrMultiplier']
            },
            {
              name: 'ISOLATION_FOREST',
              description: 'Ensemble method for anomaly detection in high-dimensional data',
              bestFor: 'Complex patterns, multivariate data',
              parameters: ['nEstimators', 'contamination']
            },
            {
              name: 'ONE_CLASS_SVM',
              description: 'Support Vector Machine for novelty detection',
              bestFor: 'Non-linear patterns, robust to outliers',
              parameters: ['nu', 'gamma', 'kernel']
            },
            {
              name: 'ENSEMBLE',
              description: 'Combines multiple algorithms for improved accuracy',
              bestFor: 'General purpose, high accuracy requirements',
              parameters: ['votingStrategy', 'algorithmWeights']
            }
          ],
          supportedDataTypes: [
            'FINANCIAL_METRICS',
            'TASK_COMPLETION',
            'CLIENT_ENGAGEMENT',
            'SYSTEM_PERFORMANCE',
            'COMPLIANCE_METRICS',
            'CUSTOM'
          ],
          thresholdRanges: {
            sensitivity: { min: 0.001, max: 0.1, default: 0.05 },
            minAnomalyScore: { min: 0.5, max: 0.99, default: 0.7 },
            maxFalsePositiveRate: { min: 0.01, max: 0.2, default: 0.1 }
          },
          alertChannels: ['EMAIL', 'SMS', 'WEBHOOK', 'SLACK', 'DASHBOARD'],
          processingCapabilities: {
            realTimeDetection: true,
            batchProcessing: true,
            historicalAnalysis: true,
            predictiveAlerting: true,
            multiMetricCorrelation: true,
            customThresholds: true
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
          error: 'Invalid action. Supported actions: get_subscriptions, get_subscription, get_detection_history, get_alert_status, get_detection_capabilities'
        }, { status: 400 })
    }

  } catch (error) {
    logger.error('Anomaly detection GET API error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve anomaly detection data',
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
    const { subscriptionId, updates } = body

    if (!subscriptionId || !updates) {
      return NextResponse.json({
        error: 'subscriptionId and updates object are required'
      }, { status: 400 })
    }

    // Get existing subscription
    const existingSubscription = await anomalyDetectionService.getAnomalySubscription(subscriptionId)
    if (!existingSubscription) {
      return NextResponse.json({
        error: 'Subscription not found'
      }, { status: 404 })
    }

    // Update subscription
    const updatedSubscription: AnomalySubscription = {
      ...existingSubscription,
      ...updates,
      id: subscriptionId, // Ensure ID doesn't change
      userId: existingSubscription.userId, // Ensure ownership doesn't change
      organizationId: existingSubscription.organizationId,
      updatedAt: new Date()
    }

    const result = await anomalyDetectionService.updateAnomalySubscription(updatedSubscription)

    logger.info('Anomaly subscription updated', {
      userId: user.id,
      subscriptionId,
      updatedFields: Object.keys(updates)
    })

    return NextResponse.json({
      success: true,
      subscription: result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Anomaly subscription update error:', error)
    
    return NextResponse.json({
      error: 'Failed to update anomaly subscription',
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
    const subscriptionId = searchParams.get('subscriptionId')

    if (!subscriptionId) {
      return NextResponse.json({
        error: 'subscriptionId is required'
      }, { status: 400 })
    }

    // Delete subscription
    await anomalyDetectionService.deleteAnomalySubscription(subscriptionId)

    logger.info('Anomaly subscription deleted', {
      userId: user.id,
      subscriptionId
    })

    return NextResponse.json({
      success: true,
      message: 'Anomaly subscription deleted successfully',
      subscriptionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Anomaly subscription deletion error:', error)
    
    return NextResponse.json({
      error: 'Failed to delete anomaly subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}