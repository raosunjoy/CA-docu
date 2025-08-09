'use client'

import React, { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
          right: isMobile ? 10 : 30, 
          left: isMobile ? 10 : 20, 
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
          fontSize={isMobile ? 10 : chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
          angle={isMobile ? -45 : 0}
          textAnchor={isMobile ? 'end' : 'middle'}
          height={isMobile ? 60 : 30}
        />
        <YAxis 
          stroke={chartTheme.axis.stroke}
          fontSize={isMobile ? 10 : chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
          width={isMobile ? 40 : 60}
        />
        <Tooltip 
          content={<CustomTooltip valueType={valueType} />}
        />
        {showLegend && (
          <Legend 
            wrapperStyle={{
              fontSize: isMobile ? 10 : chartTheme.axis.fontSize,
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