import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatChartValue } from './BaseChart'

interface KPICardProps {
  title: string
  value: number
  target?: number
  previousValue?: number
  valueType?: 'currency' | 'percentage' | 'number'
  trend?: 'up' | 'down' | 'stable'
  trendPercentage?: number
  status?: 'good' | 'warning' | 'critical'
  unit?: string
  description?: string
  loading?: boolean
  className?: string
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  target,
  previousValue,
  valueType = 'number',
  trend,
  trendPercentage,
  status = 'good',
  unit,
  description,
  loading = false,
  className = ''
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-600" />
      default:
        return null
    }
  }

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'stable':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    )
  }

  const formattedValue = unit ? `${formatChartValue(value, valueType)}${unit}` : formatChartValue(value, valueType)
  const targetProgress = target ? (value / target) * 100 : undefined

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 truncate">{title}</h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
          {status.toUpperCase()}
        </div>
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formattedValue}
        </div>
        
        {/* Trend Indicator */}
        {trend && trendPercentage !== undefined && (
          <div className={`flex items-center text-sm ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)}
            <span className="ml-1 font-medium">
              {trendPercentage.toFixed(1)}%
            </span>
            <span className="ml-1 text-gray-500">vs previous period</span>
          </div>
        )}
      </div>

      {/* Target Progress */}
      {target && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Target: {formatChartValue(target, valueType)}{unit}</span>
            <span>{targetProgress?.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                targetProgress && targetProgress >= 100
                  ? 'bg-green-500'
                  : targetProgress && targetProgress >= 80
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(targetProgress || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      )}
    </div>
  )
}