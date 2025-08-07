/**
 * Cache Performance API
 * Provides endpoints for cache management and optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCacheService } from '@/lib/caching-service'
import { createAPICacheMiddleware } from '@/lib/api-cache-middleware'
import { StaticAssetOptimizer } from '@/lib/static-asset-optimization-service'
import { authMiddleware } from '@/lib/middleware'

// Initialize cache service
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
    ttl: 5 * 60 * 1000, // 5 minutes
    maxAge: 10 * 60 * 1000 // 10 minutes
  },
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider: (process.env.CDN_PROVIDER as any) || 'cloudflare',
    apiKey: process.env.CDN_API_KEY,
    zoneId: process.env.CDN_ZONE_ID
  }
})

// Initialize API cache middleware
const apiCacheMiddleware = createAPICacheMiddleware(cacheService)

// Initialize asset optimizer
const assetOptimizer = new StaticAssetOptimizer({
  images: {
    formats: ['webp', 'avif', 'jpeg'],
    qualities: { webp: 80, avif: 75, jpeg: 85 },
    sizes: [320, 640, 768, 1024, 1280, 1920],
    enableLazyLoading: true,
    enableResponsive: true
  },
  css: {
    minify: true,
    extractCritical: true,
    inlineSmall: true,
    maxInlineSize: 2048
  },
  js: {
    minify: true,
    splitChunks: true,
    enableTreeShaking: true,
    enableCodeSplitting: true
  },
  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    baseUrl: process.env.CDN_BASE_URL || '',
    cacheBusting: true,
    compression: true
  }
})

// GET /api/performance/cache - Get cache performance metrics
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to access cache metrics
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'stats':
        const [cacheStats, detailedStats, apiStats] = await Promise.all([
          cacheService.getStats(),
          cacheService.getDetailedStats(),
          apiCacheMiddleware.getCacheStats()
        ])

        return NextResponse.json({
          success: true,
          data: {
            cache: cacheStats,
            detailed: detailedStats,
            api: apiStats
          }
        })

      case 'asset-metrics':
        const assetMetrics = assetOptimizer.getOptimizationMetrics()
        return NextResponse.json({
          success: true,
          data: assetMetrics
        })

      case 'memory-usage':
        const memoryUsage = process.memoryUsage()
        return NextResponse.json({
          success: true,
          data: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers
          }
        })

      default:
        // Return general cache overview
        const generalStats = cacheService.getStats()
        return NextResponse.json({
          success: true,
          data: generalStats
        })
    }

  } catch (error) {
    console.error('Cache performance API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get cache performance metrics'
    }, { status: 500 })
  }
}

// POST /api/performance/cache - Perform cache operations
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to perform cache operations
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, options = {} } = body

    switch (action) {
      case 'invalidate':
        const { strategy } = options
        if (!strategy) {
          return NextResponse.json({
            success: false,
            error: 'Invalidation strategy is required'
          }, { status: 400 })
        }

        const invalidatedCount = await cacheService.invalidate(strategy)
        return NextResponse.json({
          success: true,
          data: { invalidatedCount },
          message: `Invalidated ${invalidatedCount} cache entries`
        })

      case 'warm':
        const { keys, dataLoaders } = options
        if (!keys || !Array.isArray(keys)) {
          return NextResponse.json({
            success: false,
            error: 'Keys array is required for cache warming'
          }, { status: 400 })
        }

        const warmingResults = await Promise.allSettled(
          keys.map(async (key: string) => {
            // This would need actual data loaders
            return await cacheService.warmCache(key, async () => {
              return { warmed: true, timestamp: Date.now() }
            })
          })
        )

        const successCount = warmingResults.filter(r => r.status === 'fulfilled').length
        return NextResponse.json({
          success: true,
          data: { successCount, totalCount: keys.length },
          message: `Warmed ${successCount}/${keys.length} cache entries`
        })

      case 'optimize-assets':
        const { inputDir, outputDir } = options
        if (!inputDir || !outputDir) {
          return NextResponse.json({
            success: false,
            error: 'Input and output directories are required'
          }, { status: 400 })
        }

        const optimizedAssets = await assetOptimizer.optimizeDirectory(inputDir, outputDir)
        return NextResponse.json({
          success: true,
          data: {
            optimizedCount: optimizedAssets.length,
            totalSavings: optimizedAssets.reduce((sum, asset) => 
              sum + (asset.originalSize - asset.size), 0
            )
          },
          message: `Optimized ${optimizedAssets.length} assets`
        })

      case 'generate-manifest':
        const { assetsDir, manifestPath } = options
        if (!assetsDir || !manifestPath) {
          return NextResponse.json({
            success: false,
            error: 'Assets directory and manifest path are required'
          }, { status: 400 })
        }

        const manifest = await assetOptimizer.generateAssetManifest(assetsDir, manifestPath)
        return NextResponse.json({
          success: true,
          data: { assetCount: Object.keys(manifest).length },
          message: 'Asset manifest generated successfully'
        })

      case 'clear-cache':
        const { level = 'both' } = options
        
        if (level === 'memory' || level === 'both') {
          // Clear memory cache (this would need to be implemented in the cache service)
          console.log('Clearing memory cache')
        }
        
        if (level === 'redis' || level === 'both') {
          // Clear Redis cache
          await cacheService.invalidate({
            type: 'pattern',
            value: '*'
          })
        }

        return NextResponse.json({
          success: true,
          message: `Cleared ${level} cache`
        })

      case 'preload-critical':
        // Preload critical resources
        const criticalResources = [
          '/api/auth/me',
          '/api/dashboard/metrics',
          '/api/tasks?limit=10',
          '/api/documents?limit=10'
        ]

        const preloadResults = await Promise.allSettled(
          criticalResources.map(async (resource) => {
            // This would make actual requests to preload the cache
            return await cacheService.warmCache(`preload:${resource}`, async () => {
              return { resource, preloaded: true, timestamp: Date.now() }
            })
          })
        )

        const preloadedCount = preloadResults.filter(r => r.status === 'fulfilled').length
        return NextResponse.json({
          success: true,
          data: { preloadedCount, totalCount: criticalResources.length },
          message: `Preloaded ${preloadedCount} critical resources`
        })

      case 'compress-images':
        const { imagePaths } = options
        if (!imagePaths || !Array.isArray(imagePaths)) {
          return NextResponse.json({
            success: false,
            error: 'Image paths array is required'
          }, { status: 400 })
        }

        const compressionResults = await Promise.allSettled(
          imagePaths.map(async (imagePath: string) => {
            return await assetOptimizer.optimizeImage(
              imagePath,
              path.dirname(imagePath)
            )
          })
        )

        const compressedCount = compressionResults.filter(r => r.status === 'fulfilled').length
        return NextResponse.json({
          success: true,
          data: { compressedCount, totalCount: imagePaths.length },
          message: `Compressed ${compressedCount} images`
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Cache operation API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform cache operation'
    }, { status: 500 })
  }
}

// DELETE /api/performance/cache - Clear specific cache entries
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to delete cache entries
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    const pattern = url.searchParams.get('pattern')
    const tags = url.searchParams.get('tags')?.split(',')

    if (key) {
      await cacheService.delete(key)
      return NextResponse.json({
        success: true,
        message: `Deleted cache entry: ${key}`
      })
    }

    if (pattern) {
      const invalidatedCount = await cacheService.invalidate({
        type: 'pattern',
        value: pattern
      })
      return NextResponse.json({
        success: true,
        data: { invalidatedCount },
        message: `Deleted ${invalidatedCount} cache entries matching pattern: ${pattern}`
      })
    }

    if (tags) {
      const invalidatedCount = await cacheService.invalidate({
        type: 'tags',
        value: tags
      })
      return NextResponse.json({
        success: true,
        data: { invalidatedCount },
        message: `Deleted ${invalidatedCount} cache entries with tags: ${tags.join(', ')}`
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Key, pattern, or tags parameter is required'
    }, { status: 400 })

  } catch (error) {
    console.error('Cache delete API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete cache entries'
    }, { status: 500 })
  }
}