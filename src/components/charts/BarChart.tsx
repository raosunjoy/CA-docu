import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { BaseChart, chartTheme, CustomTooltip } from './BaseChart'

interface BarChartProps {
  data: Array<Record<string, any>>
  xKey: string
  yKeys: string[]
  title?: string
  height?: number
  loading?: boolean
  error?: string | null
  valueType?: 'currency' | 'percentage' | 'number'
  showGrid?: boolean
  showLegend?: boolean
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKeys,
  title,
  height = 300,
  loading = false,
  error = null,
  valueType = 'number',
  showGrid = true,
  showLegend = true,
  orientation = 'vertical',
  className = ''
}) => {
  return (
    <BaseChart
      title={title}
      height={height}
      loading={loading}
      error={error}
      className={className}
    >
      <RechartsBarChart 
        data={data} 
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
      >
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={chartTheme.grid.stroke}
            strokeWidth={chartTheme.grid.strokeWidth}
          />
        )}
        <XAxis 
          dataKey={orientation === 'horizontal' ? undefined : xKey}
          type={orientation === 'horizontal' ? 'number' : 'category'}
          stroke={chartTheme.axis.stroke}
          fontSize={chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
        />
        <YAxis 
          dataKey={orientation === 'horizontal' ? xKey : undefined}
          type={orientation === 'horizontal' ? 'category' : 'number'}
          stroke={chartTheme.axis.stroke}
          fontSize={chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
        />
        <Tooltip 
          content={<CustomTooltip valueType={valueType} />}
        />
        {showLegend && (
          <Legend 
            wrapperStyle={{
              fontSize: chartTheme.axis.fontSize,
              fontFamily: chartTheme.axis.fontFamily
            }}
          />
        )}
        {yKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={chartTheme.palette[index % chartTheme.palette.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </BaseChart>
  )
}