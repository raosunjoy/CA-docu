import React from 'react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { BaseChart, chartTheme, CustomTooltip } from './BaseChart'

interface LineChartProps {
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
  className?: string
}

export const LineChart: React.FC<LineChartProps> = ({
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
      <RechartsLineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={chartTheme.grid.stroke}
            strokeWidth={chartTheme.grid.strokeWidth}
          />
        )}
        <XAxis 
          dataKey={xKey}
          stroke={chartTheme.axis.stroke}
          fontSize={chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
        />
        <YAxis 
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
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={chartTheme.palette[index % chartTheme.palette.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </BaseChart>
  )
}