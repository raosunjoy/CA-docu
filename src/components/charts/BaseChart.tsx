import React from 'react'
import { ResponsiveContainer } from 'recharts'

interface BaseChartProps {
  children: React.ReactNode
  height?: number
  loading?: boolean
  error?: string | null
  title?: string
  className?: string
}

export const BaseChart: React.FC<BaseChartProps> = ({
  children,
  height = 300,
  loading = false,
  error = null,
  title,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`chart-container ${className}`}>
        {title && (
          <div className="chart-header mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        <div 
          className="flex items-center justify-center bg-gray-50 rounded-lg animate-pulse"
          style={{ height }}
        >
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading chart...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`chart-container ${className}`}>
        {title && (
          <div className="chart-header mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        <div 
          className="flex items-center justify-center bg-red-50 border border-red-200 rounded-lg"
          style={{ height }}
        >
          <div className="text-center">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-red-600">Error loading chart</p>
            <p className="text-xs text-red-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chart-container ${className}`}>
      {title && (
        <div className="chart-header mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

// Chart theme configuration
export const chartTheme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#06B6D4',
    success: '#10B981',
    muted: '#6B7280'
  },
  palette: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange
    '#84CC16', // Lime
    '#EC4899', // Pink
    '#6366F1'  // Indigo
  ],
  grid: {
    stroke: '#E5E7EB',
    strokeWidth: 1
  },
  axis: {
    stroke: '#9CA3AF',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  tooltip: {
    backgroundColor: '#1F2937',
    border: 'none',
    borderRadius: 8,
    color: '#F9FAFB',
    fontSize: 12,
    fontFamily: 'Inter, system-ui, sans-serif'
  }
}

// Utility function to format chart data
export const formatChartValue = (value: number, type: 'currency' | 'percentage' | 'number' = 'number'): string => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
    default:
      return new Intl.NumberFormat('en-IN').format(value)
  }
}

// Custom tooltip component
export const CustomTooltip = ({ 
  active, 
  payload, 
  label, 
  valueType = 'number' 
}: {
  active?: boolean
  payload?: any[]
  label?: string
  valueType?: 'currency' | 'percentage' | 'number'
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border-none">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{' '}
            <span className="font-semibold">
              {formatChartValue(entry.value, valueType)}
            </span>
          </p>
        ))}
      </div>
    )
  }
  return null
}