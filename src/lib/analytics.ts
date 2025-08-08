'use client'

interface AnalyticsEvent {
  action: string
  category: string
  label?: string
  value?: number
  userId?: string
  properties?: Record<string, any>
}

interface UserProperties {
  userId: string
  role: string
  organizationId: string
  [key: string]: any
}

class AnalyticsService {
  private isInitialized = false
  private userId: string | null = null
  private userProperties: UserProperties | null = null

  initialize(config: { userId?: string; debug?: boolean }) {
    if (this.isInitialized) return

    this.userId = config.userId || null
    this.isInitialized = true

    // Initialize Google Analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
        user_id: this.userId,
        custom_map: { custom_dimension_1: 'user_role' }
      })
    }

    // Initialize other analytics services here
    this.initializeHotjar()
    this.initializeMixpanel()
  }

  private initializeHotjar() {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_HOTJAR_ID) {
      // Hotjar initialization code would go here
    }
  }

  private initializeMixpanel() {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
      // Mixpanel initialization code would go here
    }
  }

  setUser(properties: UserProperties) {
    this.userProperties = properties
    this.userId = properties.userId

    // Update Google Analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
        user_id: this.userId,
        custom_map: { custom_dimension_1: properties.role }
      })
    }
  }

  track(event: AnalyticsEvent) {
    if (!this.isInitialized) return

    const eventData = {
      ...event,
      userId: event.userId || this.userId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : ''
    }

    // Send to Google Analytics
    this.trackGoogleAnalytics(eventData)

    // Send to custom analytics endpoint
    this.trackCustomAnalytics(eventData)

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventData)
    }
  }

  private trackGoogleAnalytics(event: AnalyticsEvent & { timestamp: string; userAgent: string; url: string }) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        user_id: event.userId,
        custom_parameters: event.properties
      })
    }
  }

  private async trackCustomAnalytics(event: AnalyticsEvent & { timestamp: string; userAgent: string; url: string }) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Failed to send analytics event:', error)
    }
  }

  // Convenience methods for common events
  trackPageView(page: string, title?: string) {
    this.track({
      action: 'page_view',
      category: 'Navigation',
      label: page,
      properties: { title }
    })
  }

  trackUserAction(action: string, category: string = 'User Interaction', properties?: Record<string, any>) {
    this.track({
      action,
      category,
      properties
    })
  }

  trackError(error: Error, context?: string) {
    this.track({
      action: 'error',
      category: 'Error',
      label: error.message,
      properties: {
        stack: error.stack,
        context,
        name: error.name
      }
    })
  }

  trackPerformance(metric: string, value: number, category: string = 'Performance') {
    this.track({
      action: metric,
      category,
      value: Math.round(value)
    })
  }

  trackFeatureUsage(feature: string, action: string = 'used') {
    this.track({
      action,
      category: 'Feature Usage',
      label: feature,
      properties: {
        userRole: this.userProperties?.role,
        organizationId: this.userProperties?.organizationId
      }
    })
  }
}

// Create singleton instance
export const analytics = new AnalyticsService()

// React hook for analytics
export const useAnalytics = () => {
  const trackEvent = (event: Omit<AnalyticsEvent, 'userId'>) => {
    analytics.track(event)
  }

  const trackPageView = (page: string, title?: string) => {
    analytics.trackPageView(page, title)
  }

  const trackUserAction = (action: string, category?: string, properties?: Record<string, any>) => {
    analytics.trackUserAction(action, category, properties)
  }

  const trackFeatureUsage = (feature: string, action?: string) => {
    analytics.trackFeatureUsage(feature, action)
  }

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackFeatureUsage
  }
}

export default analytics