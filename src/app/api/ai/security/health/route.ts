// AI Security Health Check Endpoint
import { NextRequest, NextResponse } from 'next/server'
import { AISecurityMiddleware } from '@/middleware/ai-security'
import { aiDatabase } from '@/services/ai-database'

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now()

    // Check security middleware health
    const securityHealth = await AISecurityMiddleware.healthCheck()
    
    // Check database health
    const dbHealth = await aiDatabase.healthCheck()
    
    // Clean up expired rate limit entries
    const cleanedEntries = AISecurityMiddleware.cleanupExpiredEntries()
    
    const processingTime = Date.now() - startTime

    const overallHealth = securityHealth.status === 'healthy' && dbHealth.status === 'healthy' 
      ? 'healthy' : 'degraded'

    const healthData = {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      processingTime,
      components: {
        securityMiddleware: {
          status: securityHealth.status,
          details: securityHealth.details
        },
        aiDatabase: {
          status: dbHealth.status,
          details: dbHealth.details
        }
      },
      maintenance: {
        cleanedRateLimitEntries: cleanedEntries,
        lastCleanup: new Date().toISOString()
      },
      metrics: {
        endpoints: [
          { path: '/api/ai/process', secured: true },
          { path: '/api/emails/categorize', secured: true },
          { path: '/api/emails/ai/task-suggestions', secured: true }
        ]
      }
    }

    const statusCode = overallHealth === 'healthy' ? 200 : 503

    return NextResponse.json(healthData, { status: statusCode })

  } catch (error) {
    console.error('Security health check error:', error)
    
    return NextResponse.json(
      {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}

// Security metrics endpoint
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'cleanup') {
      const cleaned = AISecurityMiddleware.cleanupExpiredEntries()
      
      return NextResponse.json({
        success: true,
        action: 'cleanup',
        result: {
          cleanedEntries: cleaned,
          timestamp: new Date().toISOString()
        }
      })
    }
    
    if (action === 'stats') {
      // In production, would query actual security statistics from database
      const mockStats = {
        last24Hours: {
          totalRequests: 1247,
          blockedRequests: 23,
          rateLimitedRequests: 8,
          authFailures: 15,
          suspiciousInputBlocked: 0
        },
        endpoints: {
          '/api/ai/process': { requests: 543, blocked: 12 },
          '/api/emails/categorize': { requests: 367, blocked: 6 },
          '/api/emails/ai/task-suggestions': { requests: 234, blocked: 5 }
        },
        topBlockedIPs: [
          { ip: '192.168.1.100', blocks: 8, reason: 'Rate limited' },
          { ip: '10.0.0.50', blocks: 5, reason: 'Auth failures' }
        ]
      }
      
      return NextResponse.json({
        success: true,
        action: 'stats',
        result: mockStats
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Supported actions: cleanup, stats' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Security metrics error:', error)
    
    return NextResponse.json(
      {
        error: 'Metrics request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}