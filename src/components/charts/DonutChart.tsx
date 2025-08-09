import React from 'react'
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { BaseChart, chartTheme, CustomTooltip } from './BaseChart'

interface DonutChartProps {
  data: Array<{ name: string; value: number }>
  title?: string
  height?: number
  loading?: boolean
  error?: string | null
  valueType?: 'currency' | 'percentage' | 'number'
  showLabels?: boolean
  showLegend?: boolean
  className?: string
  onSliceClick?: (data: any, index: number) => void
  interactive?: boolean
  showActions?: boolean
  centerText?: string
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  height = 300,
  loading = false,
  error = null,
  valueType = 'number',
  showLabels = false,
  showLegend = true,
  className = '',
  onSliceClick,
  interactive = true,
  showActions = true,
  centerText
}) => {
  const handleSliceClick = (data: any, index: number) => {
    if (interactive && onSliceClick) {
      onSliceClick(data, index)
    }
  }

  const handleExport = () => {
    console.log('Exporting donut chart data:', data)
  }

  const handleFilter = () => {
    console.log('Opening filter dialog')
  }

  const handleFullscreen = () => {
    console.log('Opening in fullscreen')
  }

  const renderLabel = (entry: any) => {
    if (!showLabels) return null
    return `${entry.name}: ${entry.value}`
  }

  const outerRadius = Math.min(height * 0.35, 120)
  const innerRadius = outerRadius * 0.6

  return (
    <BaseChart
      title={title}
      height={height}
      loading={loading}
      error={error}
      className={className}
      onExport={handleExport}
      onFilter={handleFilter}
      onFullscreen={handleFullscreen}
      showActions={showActions}
    >
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
          onClick={handleSliceClick}
          cursor={interactive ? 'pointer' : 'default'}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={chartTheme.palette[index % chartTheme.palette.length]} 
            />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip valueType={valueType} />}
        />
        {showLegend && (
          <Legend 
            wrapperStyle={{
              fontSize: window.innerWidth < 768 ? 10 : chartTheme.axis.fontSize,
              fontFamily: chartTheme.axis.fontFamily
            }}
          />
        )}
        {centerText && (
          <text 
            x="50%" 
            y="50%" 
            textAnchor="middle" 
            dominantBaseline="middle"
            className="text-lg font-semibold fill-gray-700"
          >
            {centerText}
          </text>
        )}
      </RechartsPieChart>
    </BaseChart>
  )
}