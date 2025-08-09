import React, { useState, useEffect } from 'react'
import { BaseChart, chartTheme, formatChartValue, CustomTooltip } from '@/components/charts/BaseChart'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  Bell,
  Calendar,
  Target,
  Activity
} from 'lucide-react'

interface CompliancePrediction {
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

interface ComplianceData {
  complianceType: string
  riskScore: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  dueDate: string
  recommendations: string[]
  factors: Array<{
    name: string
    weight: number
    contribution: number
  }>
  timeline: Array<{
    date: string
    predictedRisk: number
    confidence: number
  }>
}

interface PredictiveComplianceWidgetProps {
  clientId?: string
  className?: string
  height?: number
}

export const PredictiveComplianceWidget: React.FC<PredictiveComplianceWidgetProps> = ({
  clientId,
  className = '',
  height = 400
}) => {
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCompliance, setSelectedCompliance] = useState<string>('GST_RETURN')
  const [timeframe, setTimeframe] = useState<'next_month' | 'next_quarter' | 'next_year'>('next_month')

  useEffect(() => {
    fetchComplianceData()
  }, [clientId, selectedCompliance, timeframe])

  const fetchComplianceData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        analysisType: 'compliance',
        ...(clientId && { clientId })
      })

      const response = await fetch(`/api/analytics/ml-insights?${params}`)
      if (!response.ok) throw new Error('Failed to fetch compliance data')

      const result = await response.json()
      
      if (result.success && result.data.insights.compliancePredictions) {
        const predictions = result.data.insights.compliancePredictions
        
        const formattedData = predictions.map((pred: CompliancePrediction, index: number) => ({
          complianceType: index === 0 ? 'GST_RETURN' : 'INCOME_TAX_RETURN',
          riskScore: pred.value,
          confidence: pred.confidence,
          trend: pred.value > 0.6 ? 'up' : pred.value < 0.4 ? 'down' : 'stable',
          dueDate: new Date(Date.now() + (30 + index * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          recommendations: generateRecommendations(pred.value, pred.factors),
          factors: pred.factors,
          timeline: generateTimeline(pred.value, pred.confidence)
        }))

        setComplianceData(formattedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }

  const generateRecommendations = (riskScore: number, factors: any[]): string[] => {
    const recommendations = []
    
    if (riskScore > 0.7) {
      recommendations.push('Schedule immediate compliance review meeting')
      recommendations.push('Prepare documentation 2 weeks in advance')
      recommendations.push('Set up daily progress monitoring')
    } else if (riskScore > 0.5) {
      recommendations.push('Begin preparation 1 week early')
      recommendations.push('Review historical compliance patterns')
      recommendations.push('Ensure all required documents are ready')
    } else {
      recommendations.push('Maintain current compliance schedule')
      recommendations.push('Continue regular monitoring')
    }

    // Add factor-specific recommendations
    const highRiskFactors = factors.filter(f => Math.abs(f.contribution) > 0.2)
    highRiskFactors.forEach(factor => {
      if (factor.name === 'Historical Delays') {
        recommendations.push('Address recurring delay patterns')
      } else if (factor.name === 'Task Complexity') {
        recommendations.push('Allocate additional resources for complex tasks')
      }
    })

    return recommendations.slice(0, 4)
  }

  const generateTimeline = (baseRisk: number, confidence: number) => {
    const timeline = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      
      // Risk increases as deadline approaches
      const timeDecay = Math.min(1, (30 - i) / 30)
      const predictedRisk = Math.min(1, baseRisk + (timeDecay * 0.3))
      const timeConfidence = Math.max(0.5, confidence - (i * 0.01))
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        predictedRisk: Math.round(predictedRisk * 100) / 100,
        confidence: Math.round(timeConfidence * 100) / 100
      })
    }
    
    return timeline
  }

  const getRiskLevel = (score: number): { level: string; color: string; icon: React.ReactNode } => {
    if (score >= 0.8) return { 
      level: 'Critical', 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: <XCircle className="w-4 h-4" /> 
    }
    if (score >= 0.6) return { 
      level: 'High', 
      color: 'bg-orange-100 text-orange-800 border-orange-200', 
      icon: <AlertTriangle className="w-4 h-4" /> 
    }
    if (score >= 0.4) return { 
      level: 'Medium', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: <Clock className="w-4 h-4" /> 
    }
    return { 
      level: 'Low', 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: <CheckCircle className="w-4 h-4" /> 
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const currentData = complianceData.find(d => d.complianceType === selectedCompliance) || complianceData[0]

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Error loading compliance data</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </Card>
    )
  }

  if (!currentData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Target className="w-8 h-8 mx-auto mb-2" />
          <p>No compliance data available</p>
        </div>
      </Card>
    )
  }

  const riskInfo = getRiskLevel(currentData.riskScore)

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Predictive Compliance Analysis
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered compliance risk assessment and predictions
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCompliance}
            onChange={(e) => setSelectedCompliance(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="GST_RETURN">GST Return</option>
            <option value="INCOME_TAX_RETURN">Income Tax Return</option>
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="next_month">Next Month</option>
            <option value="next_quarter">Next Quarter</option>
            <option value="next_year">Next Year</option>
          </select>
        </div>
      </div>

      {/* Risk Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Risk Score</span>
            {getTrendIcon(currentData.trend)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(currentData.riskScore * 100)}%
            </span>
            <Badge className={`${riskInfo.color} flex items-center gap-1`}>
              {riskInfo.icon}
              {riskInfo.level}
            </Badge>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Confidence</span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(currentData.confidence * 100)}%
            </span>
            <span className="text-sm text-gray-500">Model Accuracy</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Due Date</span>
            <Calendar className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {new Date(currentData.dueDate).toLocaleDateString()}
            </span>
            <span className="text-sm text-gray-500">
              {Math.ceil((new Date(currentData.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
            </span>
          </div>
        </div>
      </div>

      {/* Risk Timeline Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Prediction Timeline</h4>
        <BaseChart height={200} loading={false} showActions={false}>
          <AreaChart data={currentData.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              stroke={chartTheme.axis.stroke}
              fontSize={chartTheme.axis.fontSize}
            />
            <YAxis 
              domain={[0, 1]}
              tickFormatter={(value) => `${Math.round(value * 100)}%`}
              stroke={chartTheme.axis.stroke}
              fontSize={chartTheme.axis.fontSize}
            />
            <Area
              type="monotone"
              dataKey="predictedRisk"
              stroke={chartTheme.colors.danger}
              fill={`${chartTheme.colors.danger}20`}
              strokeWidth={2}
            />
            <CustomTooltip 
              valueType="percentage"
            />
          </AreaChart>
        </BaseChart>
      </div>

      {/* Risk Factors Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Factors</h4>
          <div className="space-y-3">
            {currentData.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{factor.name}</span>
                    <span className="text-sm text-gray-500">
                      {Math.abs(factor.contribution) > 0.1 ? 'High Impact' : 'Low Impact'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        factor.contribution > 0 ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.abs(factor.contribution) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="ml-3 text-right">
                  <span className={`text-sm font-medium ${
                    factor.contribution > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {factor.contribution > 0 ? '+' : ''}{Math.round(factor.contribution * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Recommendations
          </h4>
          <div className="space-y-2">
            {currentData.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-blue-800">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Alerts */}
      {currentData.riskScore > 0.6 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium text-orange-800">High Risk Alert</span>
          </div>
          <p className="text-sm text-orange-700">
            This compliance item shows elevated risk indicators. Consider implementing the recommended actions immediately.
          </p>
        </div>
      )}
    </Card>
  )
}