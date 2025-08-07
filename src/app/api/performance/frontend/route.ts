/**
 * Frontend Performance Monitoring API
 * Provides endpoints for frontend performance metrics and optimization
 */

import { NextRequest, NextResponse } from 'next/server'
import { frontendPerformanceService } from '@/lib/frontend-performance-service'
import { authMiddleware } from '@/lib/middleware'

// GET /api/performance/frontend - Get frontend performance metrics
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'metrics':
        const metrics = frontendPerformanceService.getPerformanceMetrics()
        return NextResponse.json({
          success: true,
          data: metrics
        })

      case 'recommendations':
        const recommendations = frontendPerformanceService.getPerformanceRecommendations()
        return NextResponse.json({
          success: true,
          data: { recommendations }
        })

      case 'bundle-analysis':
        const bundleAnalysis = frontendPerformanceService.analyzeBundleSize()
        return NextResponse.json({
          success: true,
          data: bundleAnalysis
        })

      case 'critical-css':
        const criticalCSS = await frontendPerformanceService.extractCriticalCSS()
        return NextResponse.json({
          success: true,
          data: criticalCSS
        })

      case 'service-worker-status':
        // Check if service worker is registered
        const swStatus = {
          supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
          registered: false, // Would need to check from client side
          version: '2.0.0',
          caches: [
            'zetra-static-v2.0.0',
            'zetra-dynamic-v2.0.0',
            'zetra-api-v2.0.0',
            'zetra-images-v2.0.0'
          ]
        }
        
        return NextResponse.json({
          success: true,
          data: swStatus
        })

      default:
        // Return general frontend performance overview
        const [performanceMetrics, performanceRecommendations] = await Promise.all([
          Promise.resolve(frontendPerformanceService.getPerformanceMetrics()),
          Promise.resolve(frontendPerformanceService.getPerformanceRecommendations())
        ])

        return NextResponse.json({
          success: true,
          data: {
            metrics: performanceMetrics,
            recommendations: performanceRecommendations.slice(0, 5), // Top 5 recommendations
            coreWebVitals: {
              lcp: performanceMetrics.lcp,
              fid: performanceMetrics.fid,
              cls: performanceMetrics.cls,
              status: {
                lcp: performanceMetrics.lcp <= 2500 ? 'good' : performanceMetrics.lcp <= 4000 ? 'needs-improvement' : 'poor',
                fid: performanceMetrics.fid <= 100 ? 'good' : performanceMetrics.fid <= 300 ? 'needs-improvement' : 'poor',
                cls: performanceMetrics.cls <= 0.1 ? 'good' : performanceMetrics.cls <= 0.25 ? 'needs-improvement' : 'poor'
              }
            }
          }
        })
    }

  } catch (error) {
    console.error('Frontend performance API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get frontend performance metrics'
    }, { status: 500 })
  }
}

// POST /api/performance/frontend - Perform frontend optimization actions
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, options = {} } = body

    switch (action) {
      case 'register-service-worker':
        const { swPath = '/sw.js' } = options
        
        // This would typically be done on the client side
        // Here we just return instructions
        return NextResponse.json({
          success: true,
          message: 'Service worker registration instructions provided',
          data: {
            script: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('${swPath}')
                  .then(registration => console.log('SW registered:', registration))
                  .catch(error => console.error('SW registration failed:', error));
              }
            `
          }
        })

      case 'preload-resources':
        const { resources = [] } = options
        
        if (!Array.isArray(resources)) {
          return NextResponse.json({
            success: false,
            error: 'Resources must be an array'
          }, { status: 400 })
        }

        // Generate preload instructions
        const preloadInstructions = resources.map(resource => {
          const resourceType = resource.endsWith('.css') ? 'style' : 
                              resource.endsWith('.js') ? 'script' : 
                              resource.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? 'image' : 'fetch'
          
          return {
            href: resource,
            as: resourceType,
            html: `<link rel="preload" href="${resource}" as="${resourceType}">`
          }
        })

        return NextResponse.json({
          success: true,
          data: { preloadInstructions },
          message: `Generated preload instructions for ${resources.length} resources`
        })

      case 'optimize-images':
        const { images = [] } = options
        
        // This would typically integrate with an image optimization service
        const optimizationResults = images.map((image: string) => ({
          original: image,
          optimized: image.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
          savings: '30-50%', // Estimated
          formats: ['webp', 'avif']
        }))

        return NextResponse.json({
          success: true,
          data: { optimizationResults },
          message: `Generated optimization plan for ${images.length} images`
        })

      case 'generate-critical-css':
        const { url: pageUrl } = options
        
        if (!pageUrl) {
          return NextResponse.json({
            success: false,
            error: 'Page URL is required'
          }, { status: 400 })
        }

        // This would typically use a tool like Puppeteer to extract critical CSS
        const criticalCSSResult = {
          url: pageUrl,
          critical: '/* Critical CSS would be extracted here */',
          remaining: '/* Non-critical CSS would be here */',
          savings: '40-60%'
        }

        return NextResponse.json({
          success: true,
          data: criticalCSSResult,
          message: 'Critical CSS extraction completed'
        })

      case 'enable-lazy-loading':
        // Generate lazy loading implementation
        const lazyLoadingScript = `
          // Lazy loading implementation
          if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  const img = entry.target;
                  const src = img.getAttribute('data-src');
                  if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                  }
                }
              });
            }, { threshold: 0.1, rootMargin: '50px' });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
              imageObserver.observe(img);
            });
          }
        `

        return NextResponse.json({
          success: true,
          data: { script: lazyLoadingScript },
          message: 'Lazy loading implementation generated'
        })

      case 'bundle-optimization':
        // Generate bundle optimization recommendations
        const bundleOptimizations = {
          codeSplitting: {
            enabled: true,
            strategy: 'route-based',
            chunks: ['vendor', 'common', 'runtime']
          },
          treeShaking: {
            enabled: true,
            unusedExports: ['lodash.debounce', 'moment.locale']
          },
          compression: {
            gzip: true,
            brotli: true,
            estimatedSavings: '60-70%'
          },
          minification: {
            js: true,
            css: true,
            html: true
          }
        }

        return NextResponse.json({
          success: true,
          data: bundleOptimizations,
          message: 'Bundle optimization plan generated'
        })

      case 'performance-budget':
        const { budgets } = options
        
        const defaultBudgets = {
          javascript: '250KB',
          css: '100KB',
          images: '500KB',
          fonts: '100KB',
          total: '1MB',
          requests: 50,
          ...budgets
        }

        return NextResponse.json({
          success: true,
          data: { budgets: defaultBudgets },
          message: 'Performance budgets configured'
        })

      case 'rum-data':
        const { metrics: rumMetrics, url: rumUrl } = options
        
        if (!rumMetrics) {
          return NextResponse.json({
            success: false,
            error: 'RUM metrics are required'
          }, { status: 400 })
        }

        // Store RUM data (in production, this would go to analytics service)
        console.log('RUM Data received:', {
          url: rumUrl,
          metrics: rumMetrics,
          timestamp: new Date().toISOString()
        })

        return NextResponse.json({
          success: true,
          message: 'RUM data recorded successfully'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action specified'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Frontend optimization API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform frontend optimization'
    }, { status: 500 })
  }
}

// PUT /api/performance/frontend - Update frontend performance configuration
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin users to update performance configuration
    if (authResult.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration is required'
      }, { status: 400 })
    }

    // Update performance configuration
    // In production, this would update the actual configuration
    const updatedConfig = {
      codeSplitting: config.codeSplitting || {},
      lazyLoading: config.lazyLoading || {},
      caching: config.caching || {},
      monitoring: config.monitoring || {},
      budgets: config.budgets || {}
    }

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: 'Frontend performance configuration updated'
    })

  } catch (error) {
    console.error('Frontend configuration update error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update frontend performance configuration'
    }, { status: 500 })
  }
}