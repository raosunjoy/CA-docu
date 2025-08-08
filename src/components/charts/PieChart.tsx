import React from 'react'
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BaseChart, chartTheme, formatChartValue } from './BaseChart'

interface PieChartData {
  name: string
  value: number
  [key: string]: any
}

interface PieChartProps {
  data: PieChartData[]
  title?: string
  height?: number
  loading?: boolean
  error?: string | null
  valueType?: 'currency' | 'percentage' | 'number'
  showLegend?: boolean
  showLabels?: boolean
  innerRadius?: number
  outerRadius?: number
  className?: string
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 300,
  loading = false,
  error = null,
  valueType = 'number',
  showLegend = true,
  showLabels = true,
  innerRadius = 0,
  outerRadius = 80,
  className = ''
}) => {
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!showLabels) return null
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border-none">
          <p className="text-sm font-medium mb-1">{data.name}</p>
          <p className="text-sm">
            <span className="font-semibold">
              {formatChartValue(data.value, valueType)}
            </span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <BaseChart
      title={title}
      height={height}
      loading={loading}
      error={error}
      className={className}
    >
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={chartTheme.palette[index % chartTheme.palette.length]} 
            />
          ))}
        </Pie>
        <Tooltip content={<CustomPieTooltip />} />
        {showLegend && (
          <Legend 
            wrapperStyle={{
              fontSize: chartTheme.axis.fontSize,
              fontFamily: chartTheme.axis.fontFamily
            }}
          />
        )}
      </RechartsPieChart>
    </BaseChart>
  )
}

// Donut chart is just a pie chart with inner radius
export const DonutChart: React.FC<PieChartProps> = (props) => {
  return <PieChart {...props} innerRadius={40} />
}