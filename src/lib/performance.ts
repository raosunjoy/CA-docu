// Performance monitoring utilities for Zetra Platform

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  url: string
  userAgent: string
}

interface WebVitalsMetric {
  id: string
  name: string
  value: number
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private isEnabled: boolean = process.env.NODE_ENV === 'production'

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Core Web Vitals monitoring
  recordWebVital(metric: WebVitalsMetric): void {
    if (!this.isEnabled) return

    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }

    this.metrics.push(performanceMetric)
    this.sendMetric(performanceMetric)
  }

  // Custom performance measurements
  measureFunction<T>(name: string, fn: () => T): T {
    if (!this.isEnabled) return fn()

    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()

    const metric: PerformanceMetric = {
      name: `function_${name}`,
      value: endTime - startTime,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    }

    this.metrics.push(metric)
    this.sendMetric(metric)

    return result
  }

  // Async function measurement
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn()

    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()

    const metric: PerformanceMetric = {
      name: `async_function_${name}`,
      value: endTime - startTime,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    }

    this.metrics.push(metric)
    this.sendMetric(metric)

    return result
  }

  // API call measurement
  measureApiCall(url: string, method: string, duration: number, status: number): void {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name: `api_${method.toLowerCase()}_${status}`,
      value: duration,
      timestamp: Date.now(),
      url: url,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    }

    this.metrics.push(metric)
    this.sendMetric(metric)
  }

  // Resource loading measurement
  measureResourceLoad(resourceType: string, url: string, duration: number): void {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name: `resource_${resourceType}`,
      value: duration,
      timestamp: Date.now(),
      url: url,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    }

    this.metrics.push(metric)
    this.sendMetric(metric)
  }

  // Get performance budget status
  getPerformanceBudgetStatus(): {
    budget: Record<string, number>
    current: Record<string, number>
    violations: string[]
  } {
    const budget = {
      'largest-contentful-paint': 2500, // 2.5s
      'first-input-delay': 100, // 100ms
      'cumulative-layout-shift': 0.1, // 0.1
      'first-contentful-paint': 1800, // 1.8s
      'time-to-interactive': 3800, // 3.8s
    }

    const current: Record<string, number> = {}
    const violations: string[] = []

    // Get current values from metrics
    Object.keys(budget).forEach(metricName => {
      const recentMetric = this.metrics
        .filter(m => m.name === metricName)
        .sort((a, b) => b.timestamp - a.timestamp)[0]

      if (recentMetric) {
        current[metricName] = recentMetric.value
        if (recentMetric.value > budget[metricName]) {
          violations.push(`${metricName}: ${recentMetric.value} > ${budget[metricName]}`)
        }
      }
    })

    return { budget, current, violations }
  }

  // Send metric to analytics service
  private sendMetric(metric: PerformanceMetric): void {
    // In production, send to your analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: {
          metric_name: metric.name,
          metric_value: metric.value,
          page_url: metric.url,
        },
      })
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${metric.name} = ${metric.value.toFixed(2)}ms`)
    }
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = []
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
}

// Web Vitals integration
export function reportWebVitals(metric: WebVitalsMetric): void {
  const monitor = PerformanceMonitor.getInstance()
  monitor.recordWebVital(metric)
}

// Performance decorators
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyKey}`

    descriptor.value = function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      return monitor.measureFunction(metricName, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

export function measureAsyncPerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      return monitor.measureAsyncFunction(metricName, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Performance budget checker
export function checkPerformanceBudget(): boolean {
  const monitor = PerformanceMonitor.getInstance()
  const status = monitor.getPerformanceBudgetStatus()
  
  if (status.violations.length > 0) {
    console.warn('Performance budget violations:', status.violations)
    return false
  }
  
  return true
}

// Resource timing observer
export function observeResourceTiming(): void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return

  const observer = new PerformanceObserver(list => {
    const monitor = PerformanceMonitor.getInstance()
    
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming
        monitor.measureResourceLoad(
          resourceEntry.initiatorType,
          resourceEntry.name,
          resourceEntry.duration
        )
      }
    })
  })

  observer.observe({ entryTypes: ['resource'] })
}

// Navigation timing observer
export function observeNavigationTiming(): void {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return

  const observer = new PerformanceObserver(list => {
    const monitor = PerformanceMonitor.getInstance()
    
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming
        
        // Measure key navigation metrics
        monitor.recordWebVital({
          id: 'navigation-timing',
          name: 'dom-content-loaded',
          value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          delta: 0,
          rating: 'good',
        })
        
        monitor.recordWebVital({
          id: 'navigation-timing',
          name: 'load-complete',
          value: navEntry.loadEventEnd - navEntry.loadEventStart,
          delta: 0,
          rating: 'good',
        })
      }
    })
  })

  observer.observe({ entryTypes: ['navigation'] })
}