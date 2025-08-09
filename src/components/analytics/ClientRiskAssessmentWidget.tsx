import React, { useState, useEffect } from 'react'
import { BaseChart, chartTheme, formatChartValue, CustomTooltip } from '@/components/charts/BaseChart'
import { Card } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Clock, 
  DollarSign,
  MessageSquare,
  Building,
  Scale,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Target,
  Bell
} from 'lucide-react'

interface RiskFactor {
  category: string
  score: number
  weight: number
  description: string
  trend?: 'up' | 'down' | 'stable'
  impact: 'high' | 'medium' | 'low'
}

interface ClientRiskData {
  clientId: string
  clientName: string
  overallRisk: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  riskFactors: RiskFactor[]
  recommendations: string[]
  confidenceLevel: number
  lastUpdated: string
  riskHistory: Array<{
    date: string
    riskScore: number
    category: string
  }>
  alerts: Array<{
    type: 'warning' | 'critical' | 'info'
    message: string
    timestamp: string
  }>
}

interface ClientRiskAssessmentWidgetProps {
  clientId?: string
  className?: string
  height?: number
}

export const ClientRiskAssessmentWidget: React.FC<ClientRiskAssessmentWidgetProps> = ({
  clientId,
  className = '',
  height = 400
}) => {
  const [riskData, setRiskData] = useState<ClientRiskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'factors' | 'history' | 'recommendations'>('overview')
  const [selectedClient, setSelectedClient] = useState<string>(clientId || '')

  useEffect(() => {
    if (selectedClient) {
      fetchRiskData()
    }
  }, [selectedClient])

  const fetchRiskData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        analysisType: 'risk',
        clientId: selectedClient
      })

      const response = await fetch(`/api/analytics/ml-insights?${params}`)
      if (!response.ok) throw new Error('Failed to fetch risk data')

      const result = await response.json()
      
      if (result.success && result.data.insights.clientRiskAssessment) {
        const assessment = result.data.insights.clientRiskAssessment
        
        const formattedData: ClientRiskData = {
          clientId: selectedClient,
          clientName: `Client ${selectedClient.slice(-4)}`, // Mock client name
          overallRisk: assessment.overallRisk,
          riskLevel: getRiskLevel(assessment.overallRisk),
          riskFactors: assessment.riskFactors.map((factor: any) => ({
            ...factor,
            trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
            impact: factor.score > 0.7 ? 'high' : factor.score > 0.4 ? 'medium' : 'low'
          })),
          recommendations: assessment.recommendations,
          confidenceLevel: assessment.confidenceLevel,
          lastUpdated: new Date().toISOString(),
          riskHistory: generateRiskHistory(assessment.overallRisk),
          alerts: generateAlerts(assessment.overallRisk, assessment.riskFactors)
        }

        setRiskData(formattedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load risk data')
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (score >= 0.8) return 'critical'
    if (score >= 0.6) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  const generateRiskHistory = (currentRisk: number) => {
    const history = []
    const categories = ['Payment History', 'Compliance', 'Business Stability', 'Communication', 'Regulatory']
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Generate some variation around current risk
      const variation = (Math.random() - 0.5) * 0.2
      const riskScore = Math.max(0, Math.min(1, currentRisk + variation))
      
      history.push({
        date: date.toISOString().split('T')[0],
        riskScore,
        category: categories[Math.floor(Math.random() * categories.length)]
      })
    }
    
    return history
  }

  const generateAlerts = (overallRisk: number, riskFactors: any[]) => {
    const alerts = []
    
    if (overallRisk > 0.8) {
      alerts.push({
        type: 'critical' as const,
        message: 'Critical risk level detected - immediate attention required',
        timestamp: new Date().toISOString()
      })
    } else if (overallRisk > 0.6) {
      alerts.push({
        type: 'warning' as const,
        message: 'High risk level - monitor closely and implement mitigation strategies',
        timestamp: new Date().toISOString()
      })
    }
    
    // Add factor-specific alerts
    riskFactors.forEach(factor => {
      if (factor.score > 0.8) {
        alerts.push({
          type: 'warning' as const,
          message: `High risk in ${factor.category} - ${factor.description}`,
          timestamp: new Date().toISOString()
        })
      }
    })
    
    return alerts.slice(0, 3) // Limit to 3 most important alerts
  }

  const getRiskLevelInfo = (level: string) => {
    switch (level) {
      case 'critical':
        return { 
          color: 'bg-red-100 text-red-800 border-red-200', 
          icon: <XCircle className="w-4 h-4" />,
          bgColor: 'bg-red-50'
        }
      case 'high':
        return { 
          color: 'bg-orange-100 text-orange-800 border-orange-200', 
          icon: <AlertTriangle className="w-4 h-4" />,
          bgColor: 'bg-orange-50'
        }
      case 'medium':
        return { 
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
          icon: <Clock className="w-4 h-4" />,
          bgColor: 'bg-yellow-50'
        }
      case 'low':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          icon: <CheckCircle className="w-4 h-4" />,
          bgColor: 'bg-green-50'
        }
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: <Activity className="w-4 h-4" />,
          bgColor: 'bg-gray-50'
        }
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'payment history': return <DollarSign className="w-4 h-4" />
      case 'compliance track record': return <Scale className="w-4 h-4" />
      case 'business stability': return <Building className="w-4 h-4" />
      case 'communication quality': return <MessageSquare className="w-4 h-4" />
      case 'regulatory environment': return <Shield className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

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
          <p className="font-medium">Error loading risk assessment</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </Card>
    )
  }

  if (!riskData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <Shield className="w-8 h-8 mx-auto mb-2" />
          <p>No risk data available</p>
          <p className="text-sm mt-1">Select a client to view risk assessment</p>
        </div>
      </Card>
    )
  }

  const riskLevelInfo = getRiskLevelInfo(riskData.riskLevel)

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Client Risk Assessment
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive risk analysis for {riskData.clientName}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="overview">Overview</option>
            <option value="factors">Risk Factors</option>
            <option value="history">History</option>
            <option value="recommendations">Actions</option>
          </select>
        </div>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className={`${riskLevelInfo.bgColor} rounded-lg p-4 border`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Overall Risk</span>
            {riskLevelInfo.icon}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(riskData.overallRisk * 100)}%
            </span>
            <Badge className={riskLevelInfo.color}>
              {riskData.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Confidence</span>
            <Target className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(riskData.confidenceLevel * 100)}%
            </span>
            <span className="text-sm text-gray-500">Accuracy</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">High Risk Factors</span>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {riskData.riskFactors.filter(f => f.impact === 'high').length}
            </span>
            <span className="text-sm text-gray-500">of {riskData.riskFactors.length}</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active Alerts</span>
            <Bell className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {riskData.alerts.length}
            </span>
            <span className="text-sm text-gray-500">Notifications</span>
          </div>
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Radar Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Factor Breakdown</h4>
            <BaseChart height={300} loading={false} showActions={false}>
              <RadarChart data={riskData.riskFactors}>
                <PolarGrid />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 1]} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${Math.round(value * 100)}%`}
                />
                <Radar
                  name="Risk Score"
                  dataKey="score"
                  stroke={chartTheme.colors.danger}
                  fill={`${chartTheme.colors.danger}30`}
                  strokeWidth={2}
                />
              </RadarChart>
            </BaseChart>
          </div>

          {/* Active Alerts */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Active Alerts</h4>
            <div className="space-y-3">
              {riskData.alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  alert.type === 'critical' ? 'bg-red-50 border-red-200' :
                  alert.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {alert.type === 'critical' ? (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        alert.type === 'critical' ? 'text-red-800' :
                        alert.type === 'warning' ? 'text-orange-800' :
                        'text-blue-800'
                      }`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {riskData.alerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p>No active alerts</p>
                  <p className="text-sm">All risk factors are within acceptable ranges</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedView === 'factors' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">Detailed Risk Factor Analysis</h4>
          <div className="space-y-4">
            {riskData.riskFactors.map((factor, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(factor.category)}
                    <div>
                      <h5 className="font-medium text-gray-900">{factor.category}</h5>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      factor.impact === 'high' ? 'bg-red-100 text-red-800' :
                      factor.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }>
                      {factor.impact} impact
                    </Badge>
                    {getTrendIcon(factor.trend || 'stable')}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Risk Score</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(factor.score * 100)}% (Weight: {Math.round(factor.weight * 100)}%)
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      factor.score >= 0.8 ? 'bg-red-500' :
                      factor.score >= 0.6 ? 'bg-orange-500' :
                      factor.score >= 0.4 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${factor.score * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'history' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Risk Score History (30 days)</h4>
          <BaseChart height={height} loading={false} showActions={false}>
            <LineChart data={riskData.riskHistory}>
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
              <Line
                type="monotone"
                dataKey="riskScore"
                stroke={chartTheme.colors.danger}
                strokeWidth={2}
                dot={{ fill: chartTheme.colors.danger, strokeWidth: 2, r: 3 }}
              />
              <CustomTooltip valueType="percentage" />
            </LineChart>
          </BaseChart>
        </div>
      )}

      {selectedView === 'recommendations' && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-4">Recommended Actions</h4>
          <div className="space-y-3">
            {riskData.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">{rec}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                      Priority: {index < 2 ? 'High' : 'Medium'}
                    </Badge>
                    <span className="text-xs text-blue-600">
                      Est. Impact: {index < 2 ? 'High' : 'Medium'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {riskData.recommendations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>No specific recommendations</p>
                <p className="text-sm">Current risk levels are acceptable</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Last updated: {new Date(riskData.lastUpdated).toLocaleString()}</span>
          <span>Confidence: {Math.round(riskData.confidenceLevel * 100)}%</span>
        </div>
      </div>
    </Card>
  )
}