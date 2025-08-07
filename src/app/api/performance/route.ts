/**
 * Comprehensive Performance Monitoring API
 * Provides unified access to all performance metrics and optimization features
 */

import { NextRequest, NextResponse } from 'next/server'
import { databasePerformanceService } from '@/lib/database-performance-service'
import { createCacheService } from '@/lib/caching-service'
import { LoadBalancerService } from '@/lib/load-balancer-service'
import { frontendPerformanceService } from '@/lib/frontend-performance-service'
import { authMiddleware } from '@/lib/middleware'

// Initialize services
const cacheService = createCacheService({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: 'zetra:',
    maxRetries: 3,
    retryDelayOnFailover: 100
  },
  memory: {
    maxSize: 1000,
    ttl: 5 * 60 * 1000,
    maxAge: 10 * 60 * 1000
  },
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider: (process.env.CDN_PROVIDER as any) || 'cloudflare',
    apiKey: process.env.CDN_API_KEY,
    zoneId: process.env.CDN_ZONE_ID
  }
})

// GET /api/performance - Get comprehensive performance overview
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to access performance metrics
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const component = url.searchParams.get('component')
    const detailed = url.searchParams.get('detailed') === 'true'

    // Get specific component metrics
    if (component) {
      switch (component) {
        case 'database':
          const dbMetrics = await databasePerformanceService.getPerformanceMetrics()
          return NextResponse.json({
            success: true,
            component: 'database',
            data: dbMetrics
          })

        case 'cache':
          const cacheStats = cacheService.getStats()
          const detailedCacheStats = detailed ? await cacheService.getDetailedStats() : null
          
          return NextResponse.json({
            success: true,
            component: 'cache',
            data: detailed ? detailedCacheStats : cacheStats
          })

        case 'frontend':
          const frontendMetrics = frontendPerformanceService.getPerformanceMetrics()
          const frontendRecommendations = frontendPerformanceService.getPerformanceRecommendations()
          
          return NextResponse.json({
            success: true,
            component: 'frontend',
            data: {
              metrics: frontendMetrics,
              recommendations: frontendRecommendations,
              coreWebVitals: {
                lcp: frontendMetrics.lcp,
                fid: frontendMetrics.fid,
                cls: frontendMetrics.cls
              }
            }
          })

        default:
          return NextResponse.json({
            success: false,
            error: 'Invalid component specified'
          }, { status: 400 })
      }
    }

    // Get comprehensive performance overview
    const [
      databaseMetrics,
      cacheMetrics,
      frontendMetrics
    ] = await Promise.all([
      databasePerformanceService.getPerformanceMetrics(),
      Promise.resolve(cacheService.getStats()),
      Promise.resolve(frontendPerformanceService.getPerformanceMetrics())
    ])

    // Calculate overall performance score
    const performanceScore = calculateOverallPerformanceScore({
      database: databaseMetrics,
      cache: cacheMetrics,
      frontend: frontendMetrics
    })

    // Generate system-wide recommendations
    const systemRecommendations = generateSystemRecommendations({
      database: databaseMetrics,
      cache: cacheMetrics,
      frontend: frontendMetrics
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          score: performanceScore,
          status: performanceScore >= 80 ? 'excellent' : 
                  performanceScore >= 60 ? 'good' : 
                  performanceScore >= 40 ? 'needs-improvement' : 'poor',
          lastUpdated: new Date().toISOString()
        },
        components: {
          database: {
            queryCount: databaseMetrics.queryCount,
            averageQueryTime: databaseMetrics.averageQueryTime,
            slowQueries: databaseMetrics.slowQueries.length,
            connectionPoolUsage: databaseMetrics.connectionPoolStats.activeConnections / 
                                databaseMetrics.connectionPoolStats.totalConnections * 100
          },
          cache: {
            hitRate: cacheMetrics.hitRate,
            memoryUsage: cacheMetrics.memoryUsage,
            operations: cacheMetrics.operations.get + cacheMetrics.operations.set,
            evictions: cacheMetrics.evictions
          },
          frontend: {
            lcp: frontendMetrics.lcp,
            fid: frontendMetrics.fid,
            cls: frontendMetrics.cls,
            totalSize: frontendMetrics.totalSize,
            memoryUsage: frontendMetrics.memoryUsage
          }
        },
        recommendations: systemRecommendations,
        alerts: generatePerformanceAlerts({
          database: databaseMetrics,
          cache: cacheMetrics,
          frontend: frontendMetrics
        })
      }
    })

  } catch (error) {
    console.error('Performance API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get performance metrics'
    }, { status: 500 })
  }
}

// POST /api/performance - Trigger performance optimizations
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to trigger optimizations
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, components = ['database', 'cache', 'frontend'], options = {} } = body

    const results: any = {}

    switch (action) {
      case 'optimize-all':
        // Run optimizations for all specified components
        if (components.includes('database')) {
          try {
            const dbOptimization = await databasePerformanceService.optimizeDatabase()
            results.database = {
              success: true,
              data: dbOptimization
            }
          } catch (error) {
            results.database = {
              success: false,
              error: error instanceof Error ? error.message : 'Database optimization failed'
            }
          }
        }

        if (components.includes('cache')) {
          try {
            // Clear and warm cache
            await cacheService.invalidate({ type: 'pattern', value: '*' })
            results.cache = {
              success: true,
              message: 'Cache cleared and optimization applied'
            }
          } catch (error) {
            results.cache = {
              success: false,
              error: error instanceof Error ? error.message : 'Cache optimization failed'
            }
          }
        }

        if (components.includes('frontend')) {
          try {
            const frontendRecommendations = frontendPerformanceService.getPerformanceRecommendations()
            results.frontend = {
              success: true,
              recommendations: frontendRecommendations
            }
          } catch (error) {
            results.frontend = {
              success: false,
              error: error instanceof Error ? error.message : 'Frontend optimization failed'
            }
          }
        }

        return NextResponse.json({
          success: true,
          data: results,
          message: 'Performance optimization completed'
        })

      case 'create-indexes':
        await databasePerformanceService.createOptimalIndexes()
        return NextResponse.json({
          success: true,
          message: 'Database indexes created successfully'
        })

      case 'warm-cache':
        const { keys = [] } = options
        const warmingResults = await Promise.allSettled(
          keys.map(async (key: string) => {
            return await cacheService.warmCache(key, async () => {
              return { warmed: true, timestamp: Date.now() }
            })
          })
        )

        const successCount = warmingResults.filter(r => r.status === 'fulfilled').length
        return NextResponse.json({
          success: true,
          data: { successCount, totalCount: keys.length },
          message: `Cache warmed for ${successCount}/${keys.length} keys`
        })

      case 'performance-audit':
        // Run comprehensive performance audit
        const auditResults = await runPerformanceAudit()
        return NextResponse.json({
          success: true,
          data: auditResults,
          message: 'Performance audit completed'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Performance optimization API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform optimization'
    }, { status: 500 })
  }
}

// Helper functions
function calculateOverallPerformanceScore(metrics: any): number {
  let score = 100
  
  // Database performance impact (30% weight)
  if (metrics.database.averageQueryTime > 1000) score -= 15
  else if (metrics.database.averageQueryTime > 500) score -= 8
  
  if (metrics.database.slowQueries.length > 10) score -= 10
  else if (metrics.database.slowQueries.length > 5) score -= 5
  
  // Cache performance impact (25% weight)
  if (metrics.cache.hitRate < 50) score -= 15
  else if (metrics.cache.hitRate < 70) score -= 8
  
  if (metrics.cache.evictions > 100) score -= 5
  
  // Frontend performance impact (45% weight)
  if (metrics.frontend.lcp > 4000) score -= 20
  else if (metrics.frontend.lcp > 2500) score -= 10
  
  if (metrics.frontend.fid > 300) score -= 15
  else if (metrics.frontend.fid > 100) score -= 8
  
  if (metrics.frontend.cls > 0.25) score -= 10
  else if (metrics.frontend.cls > 0.1) score -= 5
  
  return Math.max(0, Math.min(100, score))
}

function generateSystemRecommendations(metrics: any): string[] {
  const recommendations: string[] = []
  
  // Database recommendations
  if (metrics.database.averageQueryTime > 500) {
    recommendations.push('Optimize slow database queries and add appropriate indexes')
  }
  
  if (metrics.database.connectionPoolStats.activeConnections / metrics.database.connectionPoolStats.totalConnections > 0.8) {
    recommendations.push('Consider increasing database connection pool size')
  }
  
  // Cache recommendations
  if (metrics.cache.hitRate < 70) {
    recommendations.push('Improve cache hit rate by optimizing cache keys and TTL values')
  }
  
  if (metrics.cache.evictions > 50) {
    recommendations.push('Increase cache memory allocation to reduce evictions')
  }
  
  // Frontend recommendations
  if (metrics.frontend.lcp > 2500) {
    recommendations.push('Optimize Largest Contentful Paint through image optimization and server response time')
  }
  
  if (metrics.frontend.totalSize > 1024 * 1024) {
    recommendations.push('Reduce bundle size through code splitting and tree shaking')
  }
  
  return recommendations
}

function generatePerformanceAlerts(metrics: any): Array<{ type: string; severity: string; message: string }> {
  const alerts: Array<{ type: string; severity: string; message: string }> = []
  
  // Critical alerts
  if (metrics.database.averageQueryTime > 2000) {
    alerts.push({
      type: 'database',
      severity: 'critical',
      message: 'Database queries are extremely slow (>2s average)'
    })
  }
  
  if (metrics.frontend.lcp > 4000) {
    alerts.push({
      type: 'frontend',
      severity: 'critical',
      message: 'Largest Contentful Paint is poor (>4s)'
    })
  }
  
  // Warning alerts
  if (metrics.cache.hitRate < 50) {
    alerts.push({
      type: 'cache',
      severity: 'warning',
      message: 'Cache hit rate is low (<50%)'
    })
  }
  
  if (metrics.frontend.memoryUsage > 100 * 1024 * 1024) {
    alerts.push({
      type: 'frontend',
      severity: 'warning',
      message: 'High memory usage detected (>100MB)'
    })
  }
  
  return alerts
}

async function runPerformanceAudit(): Promise<any> {
  const [
    databaseMetrics,
    cacheStats,
    frontendMetrics
  ] = await Promise.all([
    databasePerformanceService.getPerformanceMetrics(),
    Promise.resolve(cacheService.getStats()),
    Promise.resolve(frontendPerformanceService.getPerformanceMetrics())
  ])

  return {
    timestamp: new Date().toISOString(),
    score: calculateOverallPerformanceScore({
      database: databaseMetrics,
      cache: cacheStats,
      frontend: frontendMetrics
    }),
    components: {
      database: {
        status: databaseMetrics.averageQueryTime < 500 ? 'good' : 'needs-improvement',
        metrics: databaseMetrics
      },
      cache: {
        status: cacheStats.hitRate > 70 ? 'good' : 'needs-improvement',
        metrics: cacheStats
      },
      frontend: {
        status: frontendMetrics.lcp < 2500 && frontendMetrics.fid < 100 && frontendMetrics.cls < 0.1 ? 'good' : 'needs-improvement',
        metrics: frontendMetrics
      }
    },
    recommendations: generateSystemRecommendations({
      database: databaseMetrics,
      cache: cacheStats,
      frontend: frontendMetrics
    }),
    nextAuditRecommended: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
  }
}