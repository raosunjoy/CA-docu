import { useEffect, useCallback } from 'react'
import { performanceMonitor, observeResourceTiming, observeNavigationTiming } from '@/lib/performance'

interface UsePerformanceOptions {
  enableResourceTiming?: boolean
  enableNavigationTiming?: boolean
  enableWebVitals?: boolean
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    enableResourceTiming = true,
    enableNavigationTiming = true,
    enableWebVitals = true,
  } = options

  // Initialize performance monitoring
  useEffect(() => {
    if (enableResourceTiming) {
      observeResourceTiming()
    }

    if (enableNavigationTiming) {
      observeNavigationTiming()
    }

    // Web Vitals will be handled by Next.js reportWebVitals
  }, [enableResourceTiming, enableNavigationTiming])

  // Measure component render performance
  const measureRender = useCallback((componentName: string, renderFn: () => void) => {
    return performanceMonitor.measureFunction(`render_${componentName}`, renderFn)
  }, [])

  // Measure async operations
  const measureAsync = useCallback(async <T>(
    operationName: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return performanceMonitor.measureAsyncFunction(operationName, asyncFn)
  }, [])

  // Get current performance metrics
  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics()
  }, [])

  // Check performance budget
  const checkBudget = useCallback(() => {
    return performanceMonitor.getPerformanceBudgetStatus()
  }, [])

  return {
    measureRender,
    measureAsync,
    getMetrics,
    checkBudget,
  }
}