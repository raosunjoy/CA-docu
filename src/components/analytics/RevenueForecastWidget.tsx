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
  ComposedChart,
  ReferenceLine
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Target,
  Activity,
  BarChart3,
  PieChart,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

interface ForecastPeriod {
  period: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
  confidence: number
  actualRevenue?: number
  growthRate?: number
}

interface SeasonalityData {
  month: string
  seasonalIndex: number
  historicalAverage: number
}

interface RevenueData {
  forecast: ForecastPeriod[]
  seasonality: Record<string, number>
  trends: {
    overall: number
    shortTerm: number
    longTerm: number
  }
  accuracy: {
    lastPeriod: number
    average: number
  }
  scenarios: {
    optimistic: ForecastPeriod[]
    pessimistic: ForecastPeriod[]
    realistic: ForecastPeriod[]
  }
}

interface RevenueForecastWidgetProps {
  className?: string
  height?: number
  periods?: number
}

export const RevenueForecastWidget: React.FC<RevenueForecastWidgetProps> = ({
  className = '',
  height = 400,
  periods = 12
}) => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'forecast' | 'seasonality' | 'scenarios'>('forecast')
  const [selectedScenario, setSelectedScenario] = useState<'realistic' | 'optimistic' | 'pessimistic'>('realistic')

  useEffect(() => {
    fetchRevenueData()
  }, [periods])

  const fetchRevenueData = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        analysisType: 'revenue'
      })

      const response = await fetch(`/api/analytics/ml-insights?${params}`)
      if (!response.ok) throw new Error('Failed to fetch revenue data')

      const result = await response.json()
      
      if (result.success && result.data.insights.revenueForecast) {
        const forecast = result.data.insights.revenueForecast
        
        // Generate scenarios based on base forecast
        const scenarios = generateScenarios(forecast.forecast)
        
        // Calculate accuracy metrics
        const accuracy = calculateAccuracy(forecast.forecast)
        
        // Format seasonality data
        const seasonalityData = formatSeasonalityData(forecast.seasonality)

        setRevenueData({
          ...forecast,
          scenarios,
          accuracy,
          seasonalityData
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }

  const generateScenarios = (baseForecast: ForecastPeriod[]) => {
    return {
      realistic: baseForecast,
      optimistic: baseForecast.map(period => ({
        ...period,
        predictedRevenue: period.predictedRevenue * 1.15,
        lowerBound: period.lowerBound * 1.1,
        upperBound: period.upperBound * 1.2,
        growthRate: (period.growthRate || 0) + 0.05
      })),
      pessimistic: baseForecast.map(period => ({
        ...period,
        predictedRevenue: period.predictedRevenue * 0.85,
        lowerBound: period.lowerBound * 0.8,
        upperBound: period.upperBound * 0.9,
        growthRate: (period.growthRate || 0) - 0.05
      }))
    }
  }

  const calculateAccuracy = (forecast: ForecastPeriod[]) => {
    // Mock accuracy calculation (would use historical data)
    return {
      lastPeriod: 0.87,
      average: 0.82
    }
  }

  const formatSeasonalityData = (seasonality: Record<string, number>): SeasonalityData[] => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    
    return months.map((month, index) => ({
      month,
      seasonalIndex: seasonality[index] || 1,
      historicalAverage: 500000 * (seasonality[index] || 1) // Base 5L monthly revenue
    }))
  }

  const calculateGrowthMetrics = () => {
    if (!revenueData) return null

    const currentScenario = revenueData.scenarios[selectedScenario]
    const nextThreeMonths = currentScenario.slice(0, 3)
    const totalRevenue = nextThreeMonths.reduce((sum, period) => sum + period.predictedRevenue, 0)
    const avgGrowthRate = revenueData.trends.shortTerm * 100

    return {
      totalRevenue,
      avgGrowthRate,
      trend: avgGrowthRate > 0 ? 'up' : avgGrowthRate < 0 ? 'down' : 'stable'
    }
  }

  const getTrendIcon = (trend: string, value: number) => {
    if (trend === 'up' || value > 0) {
      return <ArrowUpRight className="w-4 h-4 text-green-500" />
    } else if (trend === 'down' || value < 0) {
      return <ArrowDownRight className="w-4 h-4 text-red-500" />
    }
    return <Activity className="w-4 h-4 text-gray-500" />
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
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
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Error loading revenue forecast</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </Card>
    )
  }

  if (!revenueData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p>No revenue data available</p>
        </div>
      </Card>
    )
  }

  const growthMetrics = calculateGrowthMetrics()
  const currentScenario = revenueData.scenarios[selectedScenario]

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Revenue Forecast & Analysis
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered revenue predictions with confidence intervals
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="forecast">Forecast</option>
            <option value="seasonality">Seasonality</option>
            <option value="scenarios">Scenarios</option>
          </select>
          {selectedView === 'scenarios' && (
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="realistic">Realistic</option>
              <option value="optimistic">Optimistic</option>
              <option value="pessimistic">Pessimistic</option>
            </select>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Next 3 Months</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {formatChartValue(growthMetrics?.totalRevenue || 0, 'currency')}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Growth Rate</span>
            {getTrendIcon(growthMetrics?.trend || 'stable', growthMetrics?.avgGrowthRate || 0)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {growthMetrics?.avgGrowthRate?.toFixed(1) || '0.0'}%
            </span>
            <Badge className={`${
              (growthMetrics?.avgGrowthRate || 0) > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {(growthMetrics?.avgGrowthRate || 0) > 0 ? 'Growth' : 'Decline'}
            </Badge>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Forecast Accuracy</span>
            <Target className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {Math.round(revenueData.accuracy.average * 100)}%
            </span>
            <Badge className={getConfidenceColor(revenueData.accuracy.average)}>
              {revenueData.accuracy.average >= 0.8 ? 'High' : 
               revenueData.accuracy.average >= 0.6 ? 'Medium' : 'Low'}
            </Badge>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Trend Direction</span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {revenueData.trends.overall > 0 ? 'Upward' : 
               revenueData.trends.overall < 0 ? 'Downward' : 'Stable'}
            </span>
            {getTrendIcon('', revenueData.trends.overall)}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-6">
        {selectedView === 'forecast' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Forecast with Confidence Intervals</h4>
            <BaseChart height={height} loading={false} showActions={false}>
              <ComposedChart data={currentScenario}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                <XAxis 
                  dataKey="period" 
                  stroke={chartTheme.axis.stroke}
                  fontSize={chartTheme.axis.fontSize}
                />
                <YAxis 
                  tickFormatter={(value) => formatChartValue(value, 'currency')}
                  stroke={chartTheme.axis.stroke}
                  fontSize={chartTheme.axis.fontSize}
                />
                
                {/* Confidence interval area */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill={`${chartTheme.colors.primary}20`}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="none"
                  fill="white"
                />
                
                {/* Main forecast line */}
                <Line
                  type="monotone"
                  dataKey="predictedRevenue"
                  stroke={chartTheme.colors.primary}
                  strokeWidth={3}
                  dot={{ fill: chartTheme.colors.primary, strokeWidth: 2, r: 4 }}
                />
                
                {/* Actual revenue line (if available) */}
                <Line
                  type="monotone"
                  dataKey="actualRevenue"
                  stroke={chartTheme.colors.success}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: chartTheme.colors.success, strokeWidth: 2, r: 3 }}
                />
                
                <CustomTooltip valueType="currency" />
              </ComposedChart>
            </BaseChart>
          </div>
        )}

        {selectedView === 'seasonality' && revenueData.seasonalityData && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Seasonal Revenue Patterns</h4>
            <BaseChart height={height} loading={false} showActions={false}>
              <BarChart data={revenueData.seasonalityData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                <XAxis 
                  dataKey="month" 
                  stroke={chartTheme.axis.stroke}
                  fontSize={chartTheme.axis.fontSize}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  stroke={chartTheme.axis.stroke}
                  fontSize={chartTheme.axis.fontSize}
                />
                <Bar 
                  dataKey="seasonalIndex" 
                  fill={chartTheme.colors.secondary}
                  radius={[4, 4, 0, 0]}
                />
                <ReferenceLine y={1} stroke={chartTheme.colors.muted} strokeDasharray="3 3" />
                <CustomTooltip valueType="percentage" />
              </BarChart>
            </BaseChart>
          </div>
        )}

        {selectedView === 'scenarios' && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Revenue Scenario Analysis</h4>
            <BaseChart height={height} loading={false} showActions={false}>
              <LineChart data={currentScenario}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
                <XAxis 
                  dataKey="period" 
                  stroke={chartTheme.axis.stroke}
                  fontSize={chartTheme.axis.fontSize}
                />
                <YAxis 
                  tickFormatter={(value) => formatChartValue(value, 'currency')}
                  stroke={chartTheme.axis.stroke}
                  fontSize={chartTheme.axis.fontSize}
                />
                
                <Line
                  type="monotone"
                  dataKey="predictedRevenue"
                  stroke={
                    selectedScenario === 'optimistic' ? chartTheme.colors.success :
                    selectedScenario === 'pessimistic' ? chartTheme.colors.danger :
                    chartTheme.colors.primary
                  }
                  strokeWidth={3}
                  dot={{ strokeWidth: 2, r: 4 }}
                />
                
                <CustomTooltip valueType="currency" />
              </LineChart>
            </BaseChart>
          </div>
        )}
      </div>

      {/* Growth Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Growth Rate Analysis</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Short-term (3 months)</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  revenueData.trends.shortTerm > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(revenueData.trends.shortTerm * 100).toFixed(1)}%
                </span>
                {getTrendIcon('', revenueData.trends.shortTerm)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Long-term (12 months)</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  revenueData.trends.longTerm > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(revenueData.trends.longTerm * 100).toFixed(1)}%
                </span>
                {getTrendIcon('', revenueData.trends.longTerm)}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Overall Trend</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  revenueData.trends.overall > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(revenueData.trends.overall * 100).toFixed(1)}%
                </span>
                {getTrendIcon('', revenueData.trends.overall)}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Key Insights</h4>
          <div className="space-y-2">
            {revenueData.trends.shortTerm > 0.05 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-green-800">
                  Strong short-term growth expected ({(revenueData.trends.shortTerm * 100).toFixed(1)}% monthly)
                </span>
              </div>
            )}
            
            {revenueData.trends.shortTerm < -0.02 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-red-800">
                  Revenue decline predicted - consider strategic interventions
                </span>
              </div>
            )}
            
            {revenueData.accuracy.average > 0.8 && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-800">
                  High forecast accuracy ({Math.round(revenueData.accuracy.average * 100)}%) - reliable predictions
                </span>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                Peak revenue months: {Object.entries(revenueData.seasonality)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 2)
                  .map(([month]) => new Date(2024, parseInt(month), 1).toLocaleDateString('en-US', { month: 'short' }))
                  .join(', ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}