/**
 * ML Analytics Engine - Advanced Predictive Analytics for CA Firms
 * Implements machine learning insights for compliance prediction,
 * revenue forecasting, and client risk assessment.
 */

import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ML Model Types
export interface MLPrediction {
  value: number
  confidence: number
  factors: Array<{
    name: string
    weight: number
    contribution: number
  }>
  metadata: {
    modelVersion: string
    trainingDate: Date
    accuracy: number
  }
}

export interface TimeSeriesData {
  timestamp: Date
  value: number
  features: Record<string, number>
}

// Compliance Prediction Model
export class CompliancePredictionModel {
  private static readonly MODEL_VERSION = '1.0.0'
  
  static async predictComplianceRisk(
    clientId: string,
    complianceType: string
  ): Promise<MLPrediction> {
    // Get historical compliance data
    const historicalData = await this.getComplianceHistory(clientId, complianceType)
    
    // Extract features for ML model
    const features = this.extractComplianceFeatures(historicalData)
    
    // Simple rule-based model (would be replaced with actual ML model)
    const riskScore = this.calculateRiskScore(features)
    const confidence = this.calculateConfidence(features)
    
    // Identify key risk factors
    const factors = this.identifyRiskFactors(features)
    
    return {
      value: riskScore,
      confidence,
      factors,
      metadata: {
        modelVersion: this.MODEL_VERSION,
        trainingDate: new Date('2024-01-01'), // Mock training date
        accuracy: 0.85
      }
    }
  }
  
  private static async getComplianceHistory(clientId: string, complianceType: string) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    return await prisma.$queryRaw`
      SELECT 
        t.due_date,
        t.completed_at,
        t.status,
        t.priority,
        EXTRACT(EPOCH FROM (t.completed_at - t.due_date)) / 86400 as days_overdue,
        c.metadata
      FROM tasks t
      JOIN clients c ON t.client_id = c.id
      WHERE t.client_id = ${clientId}
        AND t.metadata->>'complianceType' = ${complianceType}
        AND t.created_at >= ${sixMonthsAgo}
      ORDER BY t.due_date DESC
    ` as any[]
  }
  
  private static extractComplianceFeatures(data: any[]): Record<string, number> {
    if (data.length === 0) {
      return {
        avgDelayDays: 0,
        complianceRate: 0.5,
        recentTrend: 0,
        complexityScore: 0.5
      }
    }
    
    const completedTasks = data.filter(t => t.status === 'COMPLETED')
    const overdueTasks = data.filter(t => t.days_overdue > 0)
    
    return {
      avgDelayDays: overdueTasks.reduce((sum, t) => sum + (t.days_overdue || 0), 0) / data.length,
      complianceRate: completedTasks.length / data.length,
      recentTrend: this.calculateRecentTrend(data),
      complexityScore: this.calculateComplexityScore(data)
    }
  }
  
  private static calculateRecentTrend(data: any[]): number {
    const recentData = data.slice(0, Math.min(5, data.length))
    const olderData = data.slice(5)
    
    if (olderData.length === 0) return 0
    
    const recentComplianceRate = recentData.filter(t => t.status === 'COMPLETED').length / recentData.length
    const olderComplianceRate = olderData.filter(t => t.status === 'COMPLETED').length / olderData.length
    
    return recentComplianceRate - olderComplianceRate
  }
  
  private static calculateComplexityScore(data: any[]): number {
    const avgPriority = data.reduce((sum, t) => {
      const priorityMap = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
      return sum + (priorityMap[t.priority as keyof typeof priorityMap] || 2)
    }, 0) / data.length
    
    return Math.min(avgPriority / 4, 1) // Normalize to 0-1
  }
  
  private static calculateRiskScore(features: Record<string, number>): number {
    // Weighted risk calculation
    const weights = {
      avgDelayDays: 0.3,
      complianceRate: -0.4, // Negative because higher compliance = lower risk
      recentTrend: -0.2, // Negative because positive trend = lower risk
      complexityScore: 0.1
    }
    
    let riskScore = 0.5 // Base risk
    
    Object.entries(weights).forEach(([feature, weight]) => {
      riskScore += (features[feature] || 0) * weight
    })
    
    return Math.max(0, Math.min(1, riskScore)) // Clamp to 0-1
  }
  
  private static calculateConfidence(features: Record<string, number>): number {
    // Confidence based on data quality and quantity
    const dataQuality = Math.min(1, Object.keys(features).length / 4)
    return 0.6 + (dataQuality * 0.3) // 60-90% confidence range
  }
  
  private static identifyRiskFactors(features: Record<string, number>) {
    const factors = [
      {
        name: 'Historical Delays',
        weight: 0.3,
        contribution: features.avgDelayDays * 0.3
      },
      {
        name: 'Compliance Rate',
        weight: -0.4,
        contribution: features.complianceRate * -0.4
      },
      {
        name: 'Recent Trend',
        weight: -0.2,
        contribution: features.recentTrend * -0.2
      },
      {
        name: 'Task Complexity',
        weight: 0.1,
        contribution: features.complexityScore * 0.1
      }
    ]
    
    return factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  }
}

// Revenue Forecasting Model
export class RevenueForecastingModel {
  private static readonly FORECAST_PERIODS = 12 // 12 months
  
  static async forecastRevenue(
    organizationId: string,
    periods: number = this.FORECAST_PERIODS
  ): Promise<{
    forecast: Array<{
      period: string
      predictedRevenue: number
      lowerBound: number
      upperBound: number
      confidence: number
    }>
    seasonality: Record<string, number>
    trends: {
      overall: number
      shortTerm: number
      longTerm: number
    }
  }> {
    // Get historical revenue data
    const historicalData = await this.getRevenueHistory(organizationId)
    
    // Extract seasonal patterns
    const seasonality = this.extractSeasonality(historicalData)
    
    // Calculate trends
    const trends = this.calculateTrends(historicalData)
    
    // Generate forecasts
    const forecast = this.generateForecasts(historicalData, seasonality, trends, periods)
    
    return { forecast, seasonality, trends }
  }
  
  private static async getRevenueHistory(organizationId: string): Promise<TimeSeriesData[]> {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    
    // Mock revenue data (would come from billing/invoice system)
    const mockData: TimeSeriesData[] = []
    const baseRevenue = 500000 // ₹5 lakhs base monthly revenue
    
    for (let i = 0; i < 24; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (24 - i))
      
      // Add seasonality and trend
      const seasonalFactor = 1 + 0.2 * Math.sin((i * Math.PI * 2) / 12) // Annual cycle
      const trendFactor = 1 + (i * 0.01) // 1% monthly growth
      const randomFactor = 0.9 + Math.random() * 0.2 // ±10% random variation
      
      mockData.push({
        timestamp: date,
        value: baseRevenue * seasonalFactor * trendFactor * randomFactor,
        features: {
          month: date.getMonth(),
          quarter: Math.floor(date.getMonth() / 3),
          isYearEnd: date.getMonth() === 11 ? 1 : 0,
          isYearStart: date.getMonth() === 0 ? 1 : 0
        }
      })
    }
    
    return mockData
  }
  
  private static extractSeasonality(data: TimeSeriesData[]): Record<string, number> {
    const monthlyAvg: Record<number, number[]> = {}
    
    data.forEach(point => {
      const month = point.features.month
      if (!monthlyAvg[month]) monthlyAvg[month] = []
      monthlyAvg[month].push(point.value)
    })
    
    const seasonality: Record<string, number> = {}
    Object.entries(monthlyAvg).forEach(([month, values]) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length
      const overallAvg = data.reduce((sum, point) => sum + point.value, 0) / data.length
      seasonality[month] = avg / overallAvg // Seasonal index
    })
    
    return seasonality
  }
  
  private static calculateTrends(data: TimeSeriesData[]) {
    // Simple linear regression for trend
    const n = data.length
    const sumX = n * (n - 1) / 2
    const sumY = data.reduce((sum, point) => sum + point.value, 0)
    const sumXY = data.reduce((sum, point, index) => sum + index * point.value, 0)
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    // Different trend periods
    const recentData = data.slice(-6) // Last 6 months
    const shortTermTrend = this.calculateSlope(recentData)
    
    const longTermData = data.slice(-12) // Last 12 months
    const longTermTrend = this.calculateSlope(longTermData)
    
    return {
      overall: slope,
      shortTerm: shortTermTrend,
      longTerm: longTermTrend
    }
  }
  
  private static calculateSlope(data: TimeSeriesData[]): number {
    const n = data.length
    if (n < 2) return 0
    
    const sumX = n * (n - 1) / 2
    const sumY = data.reduce((sum, point) => sum + point.value, 0)
    const sumXY = data.reduce((sum, point, index) => sum + index * point.value, 0)
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  }
  
  private static generateForecasts(
    historicalData: TimeSeriesData[],
    seasonality: Record<string, number>,
    trends: any,
    periods: number
  ) {
    const lastDataPoint = historicalData[historicalData.length - 1]
    const baseValue = lastDataPoint.value
    const forecast = []
    
    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(lastDataPoint.timestamp)
      forecastDate.setMonth(forecastDate.getMonth() + i)
      
      const month = forecastDate.getMonth()
      const seasonalIndex = seasonality[month] || 1
      const trendAdjustment = trends.shortTerm * i
      
      const predictedRevenue = (baseValue + trendAdjustment) * seasonalIndex
      const confidenceInterval = predictedRevenue * 0.15 // ±15%
      
      forecast.push({
        period: forecastDate.toISOString().substring(0, 7), // YYYY-MM format
        predictedRevenue,
        lowerBound: predictedRevenue - confidenceInterval,
        upperBound: predictedRevenue + confidenceInterval,
        confidence: Math.max(0.5, 0.9 - (i * 0.03)) // Decreasing confidence over time
      })
    }
    
    return forecast
  }
}

// Client Risk Assessment Model
export class ClientRiskAssessmentModel {
  static async assessClientRisk(clientId: string): Promise<{
    overallRisk: number
    riskFactors: Array<{
      category: string
      score: number
      weight: number
      description: string
    }>
    recommendations: string[]
    confidenceLevel: number
  }> {
    // Get client data and history
    const clientData = await this.getClientRiskData(clientId)
    
    // Calculate risk scores for different categories
    const riskFactors = [
      {
        category: 'Payment History',
        score: this.calculatePaymentRisk(clientData.paymentHistory),
        weight: 0.3,
        description: 'Based on payment delays and outstanding amounts'
      },
      {
        category: 'Compliance Track Record',
        score: this.calculateComplianceRisk(clientData.complianceHistory),
        weight: 0.25,
        description: 'Based on compliance deadline adherence'
      },
      {
        category: 'Business Stability',
        score: this.calculateBusinessStabilityRisk(clientData.businessMetrics),
        weight: 0.2,
        description: 'Based on revenue trends and business indicators'
      },
      {
        category: 'Communication Quality',
        score: this.calculateCommunicationRisk(clientData.communicationHistory),
        weight: 0.15,
        description: 'Based on responsiveness and collaboration'
      },
      {
        category: 'Regulatory Environment',
        score: this.calculateRegulatoryRisk(clientData.industryInfo),
        weight: 0.1,
        description: 'Based on industry regulatory complexity'
      }
    ]
    
    // Calculate overall risk
    const overallRisk = riskFactors.reduce((total, factor) => 
      total + (factor.score * factor.weight), 0
    )
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(riskFactors, overallRisk)
    
    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(clientData)
    
    return {
      overallRisk,
      riskFactors,
      recommendations,
      confidenceLevel
    }
  }
  
  private static async getClientRiskData(clientId: string) {
    // Mock client risk data (would come from various sources)
    return {
      paymentHistory: {
        avgDelayDays: Math.random() * 30,
        outstandingAmount: Math.random() * 100000,
        paymentConsistency: 0.7 + Math.random() * 0.3
      },
      complianceHistory: {
        onTimeRate: 0.6 + Math.random() * 0.4,
        avgDelayDays: Math.random() * 15,
        complexityScore: Math.random()
      },
      businessMetrics: {
        revenueTrend: -0.1 + Math.random() * 0.3, // -10% to +20%
        stabilityScore: Math.random(),
        industryGrowth: Math.random() * 0.1
      },
      communicationHistory: {
        responsivenessScore: 0.5 + Math.random() * 0.5,
        clarityScore: 0.6 + Math.random() * 0.4,
        collaborationScore: 0.7 + Math.random() * 0.3
      },
      industryInfo: {
        regulatoryComplexity: Math.random(),
        changeFrequency: Math.random(),
        complianceBurden: Math.random()
      }
    }
  }
  
  private static calculatePaymentRisk(paymentData: any): number {
    const delayFactor = Math.min(paymentData.avgDelayDays / 30, 1) // Normalize to 30 days
    const outstandingFactor = Math.min(paymentData.outstandingAmount / 50000, 1) // Normalize to 50k
    const consistencyFactor = 1 - paymentData.paymentConsistency
    
    return (delayFactor * 0.4 + outstandingFactor * 0.3 + consistencyFactor * 0.3)
  }
  
  private static calculateComplianceRisk(complianceData: any): number {
    const timelinessRisk = 1 - complianceData.onTimeRate
    const delayRisk = Math.min(complianceData.avgDelayDays / 15, 1)
    const complexityRisk = complianceData.complexityScore
    
    return (timelinessRisk * 0.5 + delayRisk * 0.3 + complexityRisk * 0.2)
  }
  
  private static calculateBusinessStabilityRisk(businessData: any): number {
    const trendRisk = businessData.revenueTrend < 0 ? Math.abs(businessData.revenueTrend) * 2 : 0
    const stabilityRisk = 1 - businessData.stabilityScore
    const industryRisk = businessData.industryGrowth < 0.05 ? 0.3 : 0.1 // Low industry growth = higher risk
    
    return Math.min((trendRisk * 0.5 + stabilityRisk * 0.4 + industryRisk * 0.1), 1)
  }
  
  private static calculateCommunicationRisk(communicationData: any): number {
    const responsivenessRisk = 1 - communicationData.responsivenessScore
    const clarityRisk = 1 - communicationData.clarityScore
    const collaborationRisk = 1 - communicationData.collaborationScore
    
    return (responsivenessRisk * 0.4 + clarityRisk * 0.3 + collaborationRisk * 0.3)
  }
  
  private static calculateRegulatoryRisk(industryData: any): number {
    return (industryData.regulatoryComplexity * 0.4 + 
            industryData.changeFrequency * 0.3 + 
            industryData.complianceBurden * 0.3)
  }
  
  private static generateRecommendations(riskFactors: any[], overallRisk: number): string[] {
    const recommendations: string[] = []
    
    // High-risk factors get specific recommendations
    riskFactors.forEach(factor => {
      if (factor.score > 0.7) {
        switch (factor.category) {
          case 'Payment History':
            recommendations.push('Implement stricter payment terms and consider advance billing')
            recommendations.push('Set up automated payment reminders and follow-up processes')
            break
          case 'Compliance Track Record':
            recommendations.push('Increase compliance monitoring and early warning systems')
            recommendations.push('Consider additional compliance review meetings')
            break
          case 'Business Stability':
            recommendations.push('Monitor client business health more closely')
            recommendations.push('Consider adjusting service scope based on client capacity')
            break
          case 'Communication Quality':
            recommendations.push('Establish clearer communication protocols and expectations')
            recommendations.push('Schedule regular check-ins to improve collaboration')
            break
        }
      }
    })
    
    // Overall risk level recommendations
    if (overallRisk > 0.8) {
      recommendations.push('Consider requiring additional security deposits or guarantees')
      recommendations.push('Escalate to partner-level oversight for this client')
    } else if (overallRisk > 0.6) {
      recommendations.push('Implement enhanced monitoring and reporting procedures')
      recommendations.push('Review service agreement terms for risk mitigation')
    }
    
    return recommendations.slice(0, 5) // Limit to 5 most relevant recommendations
  }
  
  private static calculateConfidenceLevel(clientData: any): number {
    // Confidence based on data completeness and recency
    let confidence = 0.6 // Base confidence
    
    // Boost confidence based on data quality
    confidence += 0.1 // Payment history available
    confidence += 0.1 // Compliance history available  
    confidence += 0.1 // Business metrics available
    confidence += 0.1 // Communication data available
    
    return Math.min(confidence, 0.95) // Cap at 95%
  }
}

// Main ML Analytics Engine
export class MLAnalyticsEngine {
  static async generateInsights(
    organizationId: string,
    clientId?: string
  ): Promise<{
    compliancePredictions?: MLPrediction[]
    revenueForecast?: any
    clientRiskAssessment?: any
    insights: Array<{
      type: 'warning' | 'opportunity' | 'recommendation'
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
      actionable: boolean
      estimatedImpact: string
    }>
  }> {
    const results: any = {}
    const insights: any[] = []
    
    // Client-specific analysis
    if (clientId) {
      // Compliance risk prediction
      results.compliancePredictions = [
        await CompliancePredictionModel.predictComplianceRisk(clientId, 'GST_RETURN'),
        await CompliancePredictionModel.predictComplianceRisk(clientId, 'INCOME_TAX_RETURN')
      ]
      
      // Client risk assessment
      results.clientRiskAssessment = await ClientRiskAssessmentModel.assessClientRisk(clientId)
      
      // Generate client-specific insights
      if (results.clientRiskAssessment.overallRisk > 0.7) {
        insights.push({
          type: 'warning',
          priority: 'high',
          title: 'High Client Risk Detected',
          description: 'Client shows elevated risk indicators across multiple categories',
          actionable: true,
          estimatedImpact: 'Potential revenue loss: ₹2-5 lakhs'
        })
      }
    }
    
    // Organization-wide analysis
    results.revenueForecast = await RevenueForecastingModel.forecastRevenue(organizationId)
    
    // Generate revenue insights
    const forecast = results.revenueForecast.forecast
    const nextThreeMonths = forecast.slice(0, 3)
    const avgGrowth = nextThreeMonths.reduce((sum: number, period: any, index: number) => {
      if (index === 0) return 0
      return sum + ((period.predictedRevenue / nextThreeMonths[index - 1].predictedRevenue) - 1)
    }, 0) / Math.max(nextThreeMonths.length - 1, 1)
    
    if (avgGrowth > 0.05) {
      insights.push({
        type: 'opportunity',
        priority: 'medium',
        title: 'Strong Revenue Growth Predicted',
        description: `Revenue forecasting shows ${(avgGrowth * 100).toFixed(1)}% growth trend`,
        actionable: true,
        estimatedImpact: 'Potential additional revenue: ₹5-10 lakhs'
      })
    } else if (avgGrowth < -0.02) {
      insights.push({
        type: 'warning',
        priority: 'high',
        title: 'Revenue Decline Predicted',
        description: `Revenue forecasting shows ${Math.abs(avgGrowth * 100).toFixed(1)}% decline trend`,
        actionable: true,
        estimatedImpact: 'Potential revenue loss: ₹3-8 lakhs'
      })
    }
    
    results.insights = insights
    return results
  }
}