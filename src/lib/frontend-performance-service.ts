/**
 * Frontend Performance Optimization Service
 * Handles code splitting, lazy loading, bundle optimization, and critical CSS
 */

import { performance } from 'perf_hooks'

// Performance Metrics
interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  
  // Other metrics
  fcp: number // First Contentful Paint
  ttfb: number // Time to First Byte
  domContentLoaded: number
  loadComplete: number
  
  // Resource metrics
  jsSize: number
  cssSize: number
  imageSize: number
  totalSize: number
  
  // Runtime metrics
  memoryUsage: number
  renderTime: number
  scriptExecutionTime: number
}

// Bundle Analysis
interface BundleAnalysis {
  totalSize: number
  gzippedSize: number
  chunks: ChunkInfo[]
  duplicates: DuplicateModule[]
  unusedCode: UnusedCodeInfo[]
  recommendations: string[]
}

interface ChunkInfo {
  name: string
  size: number
  gzippedSize: number
  modules: string[]
  isAsync: boolean
  isEntry: boolean
}

interface DuplicateModule {
  module: string
  chunks: string[]
  size: number
}

interface UnusedCodeInfo {
  file: string
  unusedBytes: number
  totalBytes: number
  unusedPercentage: number
}

// Code Splitting Configuration
interface CodeSplittingConfig {
  enableRouteBasedSplitting: boolean
  enableComponentBasedSplitting: boolean
  enableVendorSplitting: boolean
  chunkSizeThreshold: number
  maxAsyncRequests: number
  maxInitialRequests: number
}

// Lazy Loading Configuration
interface LazyLoadingConfig {
  enableImageLazyLoading: boolean
  enableComponentLazyLoading: boolean
  enableRouteLazyLoading: boolean
  intersectionThreshold: number
  rootMargin: string
}

class FrontendPerformanceService {
  private static instance: FrontendPerformanceService
  private performanceObserver: PerformanceObserver | null = null
  private metrics: PerformanceMetrics
  private codeSplittingConfig: CodeSplittingConfig
  private lazyLoadingConfig: LazyLoadingConfig

  private constructor() {
    this.metrics = this.initializeMetrics()
    this.codeSplittingConfig = this.getDefaultCodeSplittingConfig()
    this.lazyLoadingConfig = this.getDefaultLazyLoadingConfig()
    this.initializePerformanceMonitoring()
  }

  static getInstance(): FrontendPerformanceService {
    if (!FrontendPerformanceService.instance) {
      FrontendPerformanceService.instance = new FrontendPerformanceService()
    }
    return FrontendPerformanceService.instance
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      lcp: 0,
      fid: 0,
      cls: 0,
      fcp: 0,
      ttfb: 0,
      domContentLoaded: 0,
      loadComplete: 0,
      jsSize: 0,
      cssSize: 0,
      imageSize: 0,
      totalSize: 0,
      memoryUsage: 0,
      renderTime: 0,
      scriptExecutionTime: 0
    }
  }

  private getDefaultCodeSplittingConfig(): CodeSplittingConfig {
    return {
      enableRouteBasedSplitting: true,
      enableComponentBasedSplitting: true,
      enableVendorSplitting: true,
      chunkSizeThreshold: 244 * 1024, // 244KB
      maxAsyncRequests: 30,
      maxInitialRequests: 30
    }
  }

  private getDefaultLazyLoadingConfig(): LazyLoadingConfig {
    return {
      enableImageLazyLoading: true,
      enableComponentLazyLoading: true,
      enableRouteLazyLoading: true,
      intersectionThreshold: 0.1,
      rootMargin: '50px'
    }
  }

  // Performance Monitoring
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return

    // Core Web Vitals monitoring
    this.observeCoreWebVitals()
    
    // Resource timing monitoring
    this.observeResourceTiming()
    
    // Navigation timing monitoring
    this.observeNavigationTiming()
    
    // Memory usage monitoring
    this.observeMemoryUsage()
  }

  private observeCoreWebVitals(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      this.metrics.lcp = lastEntry.startTime
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.metrics.fid = entry.processingStart - entry.startTime
      })
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          this.metrics.cls = clsValue
        }
      })
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime
        }
      })
    })
    fcpObserver.observe({ entryTypes: ['paint'] })
  }

  private observeResourceTiming(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const size = entry.transferSize || entry.encodedBodySize || 0
        
        if (entry.name.includes('.js')) {
          this.metrics.jsSize += size
        } else if (entry.name.includes('.css')) {
          this.metrics.cssSize += size
        } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
          this.metrics.imageSize += size
        }
        
        this.metrics.totalSize += size
      })
    })
    resourceObserver.observe({ entryTypes: ['resource'] })
  }

  private observeNavigationTiming(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as any
      if (navigation) {
        this.metrics.ttfb = navigation.responseStart - navigation.requestStart
        this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart
        this.metrics.loadComplete = navigation.loadEventEnd - navigation.navigationStart
      }
    })
  }

  private observeMemoryUsage(): void {
    if (typeof window === 'undefined') return

    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        this.metrics.memoryUsage = memory.usedJSHeapSize
      }
    }

    updateMemoryUsage()
    setInterval(updateMemoryUsage, 5000) // Update every 5 seconds
  }

  // Code Splitting Utilities
  createAsyncComponent<T = any>(
    importFunction: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ): React.ComponentType {
    if (typeof window === 'undefined') {
      // Server-side rendering fallback
      return fallback || (() => null)
    }

    const React = require('react')
    const { lazy, Suspense } = React

    const LazyComponent = lazy(importFunction)

    return (props: any) => (
      React.createElement(Suspense, {
        fallback: fallback ? React.createElement(fallback) : React.createElement('div', null, 'Loading...')
      }, React.createElement(LazyComponent, props))
    )
  }

  preloadComponent(importFunction: () => Promise<any>): void {
    if (typeof window !== 'undefined') {
      // Preload the component
      importFunction().catch(console.error)
    }
  }

  preloadRoute(routePath: string): void {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = routePath
        document.head.appendChild(link)
      })
    }
  }

  // Lazy Loading Implementation
  createLazyImage(src: string, alt: string, options: {
    className?: string
    placeholder?: string
    onLoad?: () => void
    onError?: () => void
  } = {}): HTMLImageElement | null {
    if (typeof window === 'undefined') return null

    const img = document.createElement('img')
    img.alt = alt
    img.className = options.className || ''
    
    if (options.placeholder) {
      img.src = options.placeholder
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const lazyImg = entry.target as HTMLImageElement
            lazyImg.src = src
            lazyImg.onload = options.onLoad || null
            lazyImg.onerror = options.onError || null
            observer.unobserve(lazyImg)
          }
        })
      }, {
        threshold: this.lazyLoadingConfig.intersectionThreshold,
        rootMargin: this.lazyLoadingConfig.rootMargin
      })

      observer.observe(img)
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = src
      img.onload = options.onLoad || null
      img.onerror = options.onError || null
    }

    return img
  }

  enableLazyLoadingForImages(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const images = document.querySelectorAll('img[data-src]')
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.getAttribute('data-src')
          if (src) {
            img.src = src
            img.removeAttribute('data-src')
            imageObserver.unobserve(img)
          }
        }
      })
    }, {
      threshold: this.lazyLoadingConfig.intersectionThreshold,
      rootMargin: this.lazyLoadingConfig.rootMargin
    })

    images.forEach((img) => imageObserver.observe(img))
  }

  // Bundle Optimization
  analyzeBundleSize(): BundleAnalysis {
    // This would typically integrate with webpack-bundle-analyzer or similar
    // For now, return mock data structure
    return {
      totalSize: this.metrics.totalSize,
      gzippedSize: Math.floor(this.metrics.totalSize * 0.3), // Estimate
      chunks: [],
      duplicates: [],
      unusedCode: [],
      recommendations: [
        'Enable tree shaking to remove unused code',
        'Split vendor libraries into separate chunks',
        'Use dynamic imports for route-based code splitting',
        'Optimize images and use modern formats (WebP, AVIF)',
        'Enable compression (Gzip/Brotli) on the server'
      ]
    }
  }

  // Critical CSS Extraction
  extractCriticalCSS(): Promise<{ critical: string; remaining: string }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({ critical: '', remaining: '' })
        return
      }

      // Get all stylesheets
      const stylesheets = Array.from(document.styleSheets)
      let criticalCSS = ''
      let remainingCSS = ''

      try {
        stylesheets.forEach((stylesheet) => {
          if (stylesheet.cssRules) {
            Array.from(stylesheet.cssRules).forEach((rule) => {
              const ruleText = rule.cssText
              
              // Simple heuristic: consider rules that affect above-the-fold content as critical
              if (this.isCriticalRule(rule)) {
                criticalCSS += `${ruleText  }\n`
              } else {
                remainingCSS += `${ruleText  }\n`
              }
            })
          }
        })
      } catch (error) {
        console.warn('Could not access stylesheet rules:', error)
      }

      resolve({ critical: criticalCSS, remaining: remainingCSS })
    })
  }

  private isCriticalRule(rule: CSSRule): boolean {
    const criticalSelectors = [
      'body', 'html', 'head',
      '.header', '.nav', '.hero',
      '.above-fold', '.critical',
      'h1', 'h2', 'h3'
    ]

    const ruleText = rule.cssText.toLowerCase()
    return criticalSelectors.some(selector => ruleText.includes(selector))
  }

  // Service Worker for Caching
  registerServiceWorker(swPath: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return Promise.resolve(null)
    }

    return navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('Service Worker registered:', registration)
        return registration
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
        return null
      })
  }

  // Performance Optimization Recommendations
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = []
    const metrics = this.metrics

    // Core Web Vitals recommendations
    if (metrics.lcp > 2500) {
      recommendations.push('Optimize Largest Contentful Paint (LCP) - consider image optimization and server response time')
    }

    if (metrics.fid > 100) {
      recommendations.push('Reduce First Input Delay (FID) - minimize JavaScript execution time')
    }

    if (metrics.cls > 0.1) {
      recommendations.push('Improve Cumulative Layout Shift (CLS) - ensure proper sizing for images and ads')
    }

    // Resource size recommendations
    if (metrics.jsSize > 500 * 1024) { // 500KB
      recommendations.push('JavaScript bundle is large - consider code splitting and tree shaking')
    }

    if (metrics.cssSize > 100 * 1024) { // 100KB
      recommendations.push('CSS bundle is large - consider critical CSS extraction and unused CSS removal')
    }

    if (metrics.imageSize > 1024 * 1024) { // 1MB
      recommendations.push('Images are large - consider compression and modern formats (WebP, AVIF)')
    }

    // Memory recommendations
    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High memory usage detected - check for memory leaks and optimize component lifecycle')
    }

    // Loading time recommendations
    if (metrics.loadComplete > 3000) {
      recommendations.push('Page load time is slow - consider lazy loading and resource prioritization')
    }

    return recommendations
  }

  // Performance Metrics
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Real User Monitoring (RUM)
  sendRUMData(endpoint: string): void {
    if (typeof window === 'undefined') return

    const rumData = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: this.metrics,
      connection: this.getConnectionInfo(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }

    // Send data to analytics endpoint
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(endpoint, JSON.stringify(rumData))
    } else {
      fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(rumData),
        headers: {
          'Content-Type': 'application/json'
        },
        keepalive: true
      }).catch(console.error)
    }
  }

  private getConnectionInfo(): any {
    if (typeof window === 'undefined') return {}

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      }
    }

    return {}
  }

  // Resource Hints
  addResourceHints(): void {
    if (typeof document === 'undefined') return

    // DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'cdn.zetra.com'
    ]

    externalDomains.forEach((domain) => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })

    // Preconnect to critical resources
    const criticalResources = [
      'https://api.zetra.com',
      'https://cdn.zetra.com'
    ]

    criticalResources.forEach((resource) => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = resource
      document.head.appendChild(link)
    })
  }

  // Cleanup
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  }
}

// Export singleton instance
export const frontendPerformanceService = FrontendPerformanceService.getInstance()

export {
  FrontendPerformanceService,
  PerformanceMetrics,
  BundleAnalysis,
  CodeSplittingConfig,
  LazyLoadingConfig
}