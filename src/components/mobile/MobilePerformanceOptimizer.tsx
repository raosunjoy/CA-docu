'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'

interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g'
  downlink: number
  rtt: number
  saveData: boolean
}

interface PerformanceMetrics {
  loadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
  bundleSize: number
  networkLatency: number
  cacheHitRate: number
  errorRate: number
}

interface OptimizationSettings {
  enableCompression: boolean
  enableImageOptimization: boolean
  enableLazyLoading: boolean
  enableServiceWorker: boolean
  enablePrefetching: boolean
  adaptiveQuality: boolean
  networkAwareLoading: boolean
  aggressiveCaching: boolean
  bundleSplitting: boolean
  criticalResourceHints: boolean
}

interface MobilePerformanceOptimizerProps {
  className?: string
  autoOptimize?: boolean
  showMetrics?: boolean
}

export const MobilePerformanceOptimizer: React.FC<MobilePerformanceOptimizerProps> = ({
  className = '',
  autoOptimize = true,
  showMetrics = true
}) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
    timeToInteractive: 0,
    bundleSize: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    errorRate: 0
  })
  const [settings, setSettings] = useState<OptimizationSettings>({
    enableCompression: true,
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableServiceWorker: true,
    enablePrefetching: true,
    adaptiveQuality: true,
    networkAwareLoading: true,
    aggressiveCaching: true,
    bundleSplitting: true,
    criticalResourceHints: true
  })
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationScore, setOptimizationScore] = useState(0)
  const [recommendations, setRecommendations] = useState<string[]>([])

  // Initialize network information
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setNetworkInfo({
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false
      })

      const handleConnectionChange = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        })
      }

      connection.addEventListener('change', handleConnectionChange)
      return () => connection.removeEventListener('change', handleConnectionChange)
    }
  }, [])

  // Collect performance metrics
  useEffect(() => {
    const collectMetrics = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
        const lcp = performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0
        
        setMetrics(prev => ({
          ...prev,
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          firstContentfulPaint: fcp,
          largestContentfulPaint: lcp,
          timeToInteractive: navigation.domInteractive - navigation.navigationStart,
          networkLatency: navigation.responseStart - navigation.requestStart,
          bundleSize: calculateBundleSize()
        }))
      }
    }

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      collectMetrics()
    } else {
      window.addEventListener('load', collectMetrics)
      return () => window.removeEventListener('load', collectMetrics)
    }
  }, [])

  // Auto-optimize based on network conditions
  useEffect(() => {
    if (autoOptimize && networkInfo) {
      optimizeForNetwork(networkInfo)
    }
  }, [networkInfo, autoOptimize])

  const calculateBundleSize = (): number => {
    // Estimate bundle size based on loaded resources
    const resources = performance.getEntriesByType('resource')
    return resources.reduce((total, resource) => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        return total + (resource.transferSize || 0)
      }
      return total
    }, 0)
  }

  const optimizeForNetwork = useCallback((network: NetworkInfo) => {
    const newSettings = { ...settings }
    const newRecommendations: string[] = []

    // Adjust settings based on network conditions
    if (network.effectiveType === '2g' || network.effectiveType === 'slow-2g') {
      newSettings.enableCompression = true
      newSettings.adaptiveQuality = true
      newSettings.aggressiveCaching = true
      newSettings.enableLazyLoading = true
      newRecommendations.push('Enabled aggressive optimizations for slow network')
    } else if (network.effectiveType === '3g') {
      newSettings.enableCompression = true
      newSettings.adaptiveQuality = true
      newSettings.enableLazyLoading = true
      newRecommendations.push('Enabled moderate optimizations for 3G network')
    } else {
      // 4G or better - can be less aggressive
      newSettings.enableCompression = true
      newSettings.adaptiveQuality = false
      newSettings.aggressiveCaching = false
    }

    // Enable data saver mode if requested
    if (network.saveData) {
      newSettings.enableImageOptimization = true
      newSettings.adaptiveQuality = true
      newSettings.enableLazyLoading = true
      newRecommendations.push('Enabled data saver optimizations')
    }

    setSettings(newSettings)
    setRecommendations(newRecommendations)
  }, [settings])

  const calculateOptimizationScore = useCallback((): number => {
    let score = 0
    const maxScore = 100

    // Performance metrics scoring
    if (metrics.loadTime < 1000) score += 20
    else if (metrics.loadTime < 2000) score += 15
    else if (metrics.loadTime < 3000) score += 10

    if (metrics.firstContentfulPaint < 1500) score += 15
    else if (metrics.firstContentfulPaint < 2500) score += 10
    else if (metrics.firstContentfulPaint < 4000) score += 5

    if (metrics.largestContentfulPaint < 2500) score += 15
    else if (metrics.largestContentfulPaint < 4000) score += 10
    else if (metrics.largestContentfulPaint < 6000) score += 5

    if (metrics.bundleSize < 500000) score += 10 // < 500KB
    else if (metrics.bundleSize < 1000000) score += 7 // < 1MB
    else if (metrics.bundleSize < 2000000) score += 5 // < 2MB

    // Optimization settings scoring
    const enabledOptimizations = Object.values(settings).filter(Boolean).length
    score += (enabledOptimizations / Object.keys(settings).length) * 20

    // Network conditions scoring
    if (networkInfo) {
      if (networkInfo.effectiveType === '4g') score += 10
      else if (networkInfo.effectiveType === '3g') score += 7
      else if (networkInfo.effectiveType === '2g') score += 5

      if (networkInfo.rtt < 100) score += 5
      else if (networkInfo.rtt < 200) score += 3
      else if (networkInfo.rtt < 300) score += 1
    }

    return Math.min(score, maxScore)
  }, [metrics, settings, networkInfo])

  useEffect(() => {
    setOptimizationScore(calculateOptimizationScore())
  }, [calculateOptimizationScore])

  const applyOptimizations = async () => {
    setIsOptimizing(true)
    
    try {
      // Apply compression headers
      if (settings.enableCompression) {
        await applyCompressionHeaders()
      }

      // Enable service worker
      if (settings.enableServiceWorker) {
        await enableServiceWorker()
      }

      // Apply image optimizations
      if (settings.enableImageOptimization) {
        await optimizeImages()
      }

      // Enable lazy loading
      if (settings.enableLazyLoading) {
        await enableLazyLoading()
      }

      // Apply bundle splitting
      if (settings.bundleSplitting) {
        await optimizeBundleSplitting()
      }

      // Add critical resource hints
      if (settings.criticalResourceHints) {
        await addResourceHints()
      }

      setRecommendations(prev => [...prev, 'All optimizations applied successfully'])
    } catch (error) {
      console.error('Optimization failed:', error)
      setRecommendations(prev => [...prev, 'Some optimizations failed to apply'])
    } finally {
      setIsOptimizing(false)
    }
  }

  const applyCompressionHeaders = async () => {
    // Add compression headers to API requests
    const originalFetch = window.fetch
    window.fetch = async (input, init = {}) => {
      const headers = new Headers(init.headers)
      headers.set('Accept-Encoding', 'gzip, deflate, br')
      headers.set('Accept', 'application/json, text/plain, */*')
      
      if (networkInfo?.saveData) {
        headers.set('Save-Data', 'on')
      }

      return originalFetch(input, {
        ...init,
        headers
      })
    }
  }

  const enableServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js')
        console.log('Service Worker registered successfully')
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  const optimizeImages = async () => {
    // Add loading="lazy" to all images
    const images = document.querySelectorAll('img:not([loading])')
    images.forEach(img => {
      img.setAttribute('loading', 'lazy')
    })

    // Add responsive image attributes
    const responsiveImages = document.querySelectorAll('img[data-responsive]')
    responsiveImages.forEach(img => {
      const src = img.getAttribute('src')
      if (src && networkInfo) {
        let quality = '80'
        if (networkInfo.effectiveType === '2g' || networkInfo.saveData) {
          quality = '60'
        } else if (networkInfo.effectiveType === '3g') {
          quality = '70'
        }
        
        // Append quality parameter (assuming image service supports it)
        const separator = src.includes('?') ? '&' : '?'
        img.setAttribute('src', `${src}${separator}quality=${quality}`)
      }
    })
  }

  const enableLazyLoading = async () => {
    // Enable intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      const lazyElements = document.querySelectorAll('[data-lazy]')
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            const src = element.getAttribute('data-lazy')
            if (src) {
              if (element.tagName === 'IMG') {
                (element as HTMLImageElement).src = src
              } else {
                element.style.backgroundImage = `url(${src})`
              }
              element.removeAttribute('data-lazy')
              observer.unobserve(element)
            }
          }
        })
      })

      lazyElements.forEach(element => observer.observe(element))
    }
  }

  const optimizeBundleSplitting = async () => {
    // Dynamic import optimization hints
    const criticalModules = [
      'react',
      'react-dom',
      '@/components/atoms',
      '@/lib/utils'
    ]

    // Preload critical modules
    criticalModules.forEach(module => {
      const link = document.createElement('link')
      link.rel = 'modulepreload'
      link.href = `/modules/${module}.js`
      document.head.appendChild(link)
    })
  }

  const addResourceHints = async () => {
    // Add DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'api.zetra.com'
    ]

    externalDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })

    // Add preconnect for critical resources
    const criticalDomains = ['api.zetra.com']
    criticalDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Performance Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mobile Performance Score</h3>
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full border text-lg font-bold',
              getScoreColor(optimizationScore)
            )}>
              {optimizationScore}/100
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div 
              className={cn(
                'h-3 rounded-full transition-all duration-500',
                optimizationScore >= 90 ? 'bg-green-500' :
                optimizationScore >= 70 ? 'bg-yellow-500' :
                optimizationScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
              )}
              style={{ width: `${optimizationScore}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Button
              onClick={applyOptimizations}
              disabled={isOptimizing}
              className="flex items-center gap-2"
            >
              {isOptimizing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {isOptimizing ? 'Optimizing...' : 'Apply Optimizations'}
            </Button>
            
            {networkInfo && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {networkInfo.effectiveType.toUpperCase()}
                </Badge>
                <Badge variant="outline" size="sm">
                  {networkInfo.downlink}Mbps
                </Badge>
                {networkInfo.saveData && (
                  <Badge variant="warning" size="sm">
                    Data Saver
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {showMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(metrics.loadTime)}
              </div>
              <div className="text-sm text-gray-600">Load Time</div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt; 1s
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatTime(metrics.firstContentfulPaint)}
              </div>
              <div className="text-sm text-gray-600">First Contentful Paint</div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt; 1.5s
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(metrics.largestContentfulPaint)}
              </div>
              <div className="text-sm text-gray-600">Largest Contentful Paint</div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt; 2.5s
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatBytes(metrics.bundleSize)}
              </div>
              <div className="text-sm text-gray-600">Bundle Size</div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt; 500KB
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatTime(metrics.networkLatency)}
              </div>
              <div className="text-sm text-gray-600">Network Latency</div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt; 100ms
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">
                {formatTime(metrics.timeToInteractive)}
              </div>
              <div className="text-sm text-gray-600">Time to Interactive</div>
              <div className="text-xs text-gray-500 mt-1">
                Target: &lt; 3s
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Optimization Settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Network Optimizations</h4>
              <div className="space-y-2">
                {[
                  { key: 'enableCompression', label: 'Enable Compression' },
                  { key: 'networkAwareLoading', label: 'Network-Aware Loading' },
                  { key: 'adaptiveQuality', label: 'Adaptive Quality' },
                  { key: 'aggressiveCaching', label: 'Aggressive Caching' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings[key as keyof OptimizationSettings] as boolean}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Resource Optimizations</h4>
              <div className="space-y-2">
                {[
                  { key: 'enableImageOptimization', label: 'Image Optimization' },
                  { key: 'enableLazyLoading', label: 'Lazy Loading' },
                  { key: 'bundleSplitting', label: 'Bundle Splitting' },
                  { key: 'criticalResourceHints', label: 'Resource Hints' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings[key as keyof OptimizationSettings] as boolean}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimization Recommendations</h3>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-700">{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MobilePerformanceOptimizer