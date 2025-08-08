'use client'

import { useEffect, useCallback } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  interactionTime: number
}

export const usePerformanceMonitor = (componentName: string) => {
  const measurePerformance = useCallback((metricName: string, startTime: number) => {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName} - ${metricName}: ${duration.toFixed(2)}ms`)
    }
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: metricName,
        value: Math.round(duration),
        event_category: 'Performance',
        event_label: componentName
      })
    }
    
    return duration
  }, [componentName])

  const measureRender = useCallback(() => {
    const startTime = performance.now()
    
    return () => {
      measurePerformance('render_time', startTime)
    }
  }, [measurePerformance])

  const measureInteraction = useCallback((interactionName: string) => {
    const startTime = performance.now()
    
    return () => {
      measurePerformance(`${interactionName}_interaction`, startTime)
    }
  }, [measurePerformance])

  // Monitor Core Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log)
        getFID(console.log)
        getFCP(console.log)
        getLCP(console.log)
        getTTFB(console.log)
      })
    }
  }, [])

  return {
    measurePerformance,
    measureRender,
    measureInteraction
  }
}

export default usePerformanceMonitor