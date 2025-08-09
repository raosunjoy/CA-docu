import { prisma } from '@/lib/prisma'
import { EmailData, EmailAnalytics } from '@/types'

interface EmailPattern {
  type: 'sender_frequency' | 'subject_keywords' | 'response_time' | 'attachment_types'
  pattern: string
  frequency: number
  trend: 'increasing' | 'decreasing' | 'stable'
  confidence: number
}

interface EmailSentiment {
  score: number // -1 to 1
  magnitude: number // 0 to 1
  label: 'positive' | 'negative' | 'neutral'
  confidence: number
}

interface EmailCategoryInsights {
  category: string
  count: number
  averageResponseTime: number
  completionRate: number
  urgencyDistribution: Record<string, number>
}

export class AdvancedEmailAnalyticsService {
  async getComprehensiveEmailAnalytics(
    organizationId: string,
    options: {
      startDate?: Date
      endDate?: Date
      accountIds?: string[]
    } = {}
  ): Promise<{
    basicMetrics: EmailAnalytics
    patterns: EmailPattern[]
    categoryInsights: EmailCategoryInsights[]
    sentimentAnalysis: EmailSentiment
    productivityMetrics: {
      emailsPerHour: number
      responseTimeDistribution: Record<string, number>
      taskCreationRate: number
      automationEfficiency: number
    }
    recommendations: string[]
  }> {
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = options.endDate || new Date()

    // Get basic metrics
    const basicMetrics = await this.getBasicEmailMetrics(organizationId, startDate, endDate)
    
    // Analyze patterns
    const patterns = await this.analyzeEmailPatterns(organizationId, startDate, endDate)
    
    // Category insights
    const categoryInsights = await this.getCategoryInsights(organizationId, startDate, endDate)
    
    // Sentiment analysis
    const sentimentAnalysis = await this.analyzeSentiment(organizationId, startDate, endDate)
    
    // Productivity metrics
    const productivityMetrics = await this.getProductivityMetrics(organizationId, startDate, endDate)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      basicMetrics,
      patterns,
      categoryInsights,
      productivityMetrics
    )

    return {
      basicMetrics,
      patterns,
      categoryInsights,
      sentimentAnalysis,
      productivityMetrics,
      recommendations
    }
  }

  private async getBasicEmailMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmailAnalytics> {
    // Mock implementation - in real scenario, query from database
    return {
      totalEmails: 1250,
      unreadEmails: 23,
      emailsToday: 45,
      emailsThisWeek: 312,
      emailsThisMonth: 1250,
      topSenders: [
        { address: 'client@example.com', name: 'Important Client', count: 45 },
        { address: 'notices@incometax.gov.in', name: 'Income Tax Department', count: 23 },
        { address: 'documents@gst.gov.in', name: 'GST Portal', count: 18 }
      ],
      responseTime: {
        average: 4.2, // hours
        median: 2.8
      },
      emailsWithTasks: 89,
      emailsWithDocuments: 156
    }
  }

  private async analyzeEmailPatterns(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmailPattern[]> {
    // Analyze various patterns in email data
    return [
      {
        type: 'sender_frequency',
        pattern: 'Government notices spike on Fridays',
        frequency: 0.78,
        trend: 'increasing',
        confidence: 0.92
      },
      {
        type: 'subject_keywords',
        pattern: 'Document requests increase before month-end',
        frequency: 0.65,
        trend: 'stable',
        confidence: 0.85
      },
      {
        type: 'response_time',
        pattern: 'Slower response times for complex tax queries',
        frequency: 0.71,
        trend: 'increasing',
        confidence: 0.88
      },
      {
        type: 'attachment_types',
        pattern: 'PDF attachments correlate with higher task creation',
        frequency: 0.83,
        trend: 'stable',
        confidence: 0.94
      }
    ]
  }

  private async getCategoryInsights(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmailCategoryInsights[]> {
    return [
      {
        category: 'Tax Notices',
        count: 23,
        averageResponseTime: 6.2,
        completionRate: 0.87,
        urgencyDistribution: { high: 18, medium: 4, low: 1 }
      },
      {
        category: 'Client Inquiries',
        count: 156,
        averageResponseTime: 3.4,
        completionRate: 0.94,
        urgencyDistribution: { high: 12, medium: 89, low: 55 }
      },
      {
        category: 'Document Requests',
        count: 78,
        averageResponseTime: 4.8,
        completionRate: 0.91,
        urgencyDistribution: { high: 8, medium: 45, low: 25 }
      },
      {
        category: 'Compliance Updates',
        count: 34,
        averageResponseTime: 8.1,
        completionRate: 0.76,
        urgencyDistribution: { high: 28, medium: 5, low: 1 }
      }
    ]
  }

  private async analyzeSentiment(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EmailSentiment> {
    // Mock sentiment analysis - in real implementation, use NLP service
    return {
      score: 0.23, // Slightly positive
      magnitude: 0.67, // Moderate emotional content
      label: 'positive',
      confidence: 0.82
    }
  }

  private async getProductivityMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    emailsPerHour: number
    responseTimeDistribution: Record<string, number>
    taskCreationRate: number
    automationEfficiency: number
  }> {
    return {
      emailsPerHour: 5.2,
      responseTimeDistribution: {
        '< 1 hour': 0.23,
        '1-4 hours': 0.45,
        '4-8 hours': 0.21,
        '8-24 hours': 0.08,
        '> 24 hours': 0.03
      },
      taskCreationRate: 0.071, // 7.1% of emails create tasks
      automationEfficiency: 0.84 // 84% automation success rate
    }
  }

  private generateRecommendations(
    basicMetrics: EmailAnalytics,
    patterns: EmailPattern[],
    categoryInsights: EmailCategoryInsights[],
    productivityMetrics: any
  ): string[] {
    const recommendations: string[] = []

    // Response time recommendations
    if (basicMetrics.responseTime.average > 6) {
      recommendations.push('Consider setting up auto-replies for common queries to improve response times')
    }

    // Pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.trend === 'increasing' && pattern.confidence > 0.8) {
        switch (pattern.type) {
          case 'sender_frequency':
            recommendations.push('Set up dedicated workflows for high-frequency senders')
            break
          case 'response_time':
            recommendations.push('Create templates for slow-response email types')
            break
        }
      }
    })

    // Category-based recommendations
    const lowCompletionCategories = categoryInsights.filter(cat => cat.completionRate < 0.8)
    if (lowCompletionCategories.length > 0) {
      recommendations.push(`Improve workflows for categories with low completion rates: ${lowCompletionCategories.map(c => c.category).join(', ')}`)
    }

    // Task creation rate
    if (productivityMetrics.taskCreationRate < 0.05) {
      recommendations.push('Consider reviewing email-to-task conversion rules to capture more actionable items')
    }

    // Automation efficiency
    if (productivityMetrics.automationEfficiency < 0.7) {
      recommendations.push('Review and optimize automation rules to improve processing efficiency')
    }

    // Default recommendations if none generated
    if (recommendations.length === 0) {
      recommendations.push('Email workflow is performing well. Consider A/B testing new automation rules.')
    }

    return recommendations
  }

  async getEmailTrendAnalysis(
    organizationId: string,
    metric: 'volume' | 'response_time' | 'task_creation' | 'automation_success',
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<Array<{ date: string; value: number }>> {
    // Generate mock trend data
    const data = []
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      let value: number

      switch (metric) {
        case 'volume':
          value = Math.floor(Math.random() * 50) + 30 // 30-80 emails per day
          break
        case 'response_time':
          value = Math.random() * 8 + 2 // 2-10 hours
          break
        case 'task_creation':
          value = Math.floor(Math.random() * 10) + 2 // 2-12 tasks per day
          break
        case 'automation_success':
          value = Math.random() * 0.3 + 0.7 // 70-100% success rate
          break
        default:
          value = Math.random() * 100
      }

      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100
      })
    }

    return data
  }

  async predictEmailVolume(
    organizationId: string,
    daysAhead: number = 7
  ): Promise<Array<{ date: string; predicted: number; confidence: number }>> {
    // Mock prediction - in real implementation, use ML model
    const predictions = []
    const baseVolume = 45 // average emails per day

    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
      const seasonality = Math.sin((i / 7) * Math.PI) * 5 // weekly pattern
      const predicted = Math.max(0, Math.floor(baseVolume + seasonality + Math.random() * 10 - 5))
      const confidence = Math.max(0.6, 1 - (i * 0.05)) // Decreasing confidence

      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted,
        confidence: Math.round(confidence * 100) / 100
      })
    }

    return predictions
  }

  async getClientCommunicationInsights(
    organizationId: string,
    clientEmail?: string
  ): Promise<{
    clientMetrics: Array<{
      clientEmail: string
      clientName: string
      totalEmails: number
      averageResponseTime: number
      satisfactionScore: number
      lastContact: Date
      communicationFrequency: 'high' | 'medium' | 'low'
      preferredTime: string
    }>
    insights: string[]
  }> {
    // Mock client communication data
    const clientMetrics = [
      {
        clientEmail: 'john@company.com',
        clientName: 'John Industries',
        totalEmails: 45,
        averageResponseTime: 3.2,
        satisfactionScore: 4.8,
        lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        communicationFrequency: 'high' as const,
        preferredTime: '9:00 AM - 11:00 AM'
      },
      {
        clientEmail: 'mary@startup.com',
        clientName: 'Mary Tech Startup',
        totalEmails: 23,
        averageResponseTime: 5.1,
        satisfactionScore: 4.2,
        lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        communicationFrequency: 'medium' as const,
        preferredTime: '2:00 PM - 4:00 PM'
      }
    ]

    const insights = [
      'High-frequency clients respond better to quick acknowledgments',
      'Morning communications have 23% higher response rates',
      'Clients prefer structured updates over ad-hoc communications',
      'Response time directly correlates with client satisfaction scores'
    ]

    return { clientMetrics, insights }
  }
}

export const advancedEmailAnalytics = new AdvancedEmailAnalyticsService()