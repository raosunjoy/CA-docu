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
  onPointClick?: (data: any, index: number) => void
  interactive?: boolean
  showActions?: boolean
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
  className = '',
  onPointClick,
  interactive = true,
  showActions = true
}) => {
  const handlePointClick = (data: any, index: number) => {
    if (interactive && onPointClick) {
      onPointClick(data, index)
    }
  }

  const handleExport = () => {
    console.log('Exporting line chart data:', data)
  }

  const handleFilter = () => {
    console.log('Opening filter dialog')
  }

  const handleFullscreen = () => {
    console.log('Opening in fullscreen')
  }

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
      <RechartsLineChart 
        data={data} 
        margin={{ 
          top: 5, 
          right: window.innerWidth < 768 ? 10 : 30, 
          left: window.innerWidth < 768 ? 10 : 20, 
          bottom: 5 
        }}
        onClick={handlePointClick}
      >
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
          fontSize={window.innerWidth < 768 ? 10 : chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
          angle={window.innerWidth < 768 ? -45 : 0}
          textAnchor={window.innerWidth < 768 ? 'end' : 'middle'}
          height={window.innerWidth < 768 ? 60 : 30}
        />
        <YAxis 
          stroke={chartTheme.axis.stroke}
          fontSize={window.innerWidth < 768 ? 10 : chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
          width={window.innerWidth < 768 ? 40 : 60}
        />
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
        {yKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={chartTheme.palette[index % chartTheme.palette.length]}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            cursor={interactive ? 'pointer' : 'default'}
          />
        ))}
      </RechartsLineChart>
    </BaseChart>
  )
}