'use client'

import React, { useState } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
  onBarClick?: (data: any, index: number) => void
  interactive?: boolean
  showActions?: boolean
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
  className = '',
  onBarClick,
  interactive = true,
  showActions = true
}) => {
  const [selectedBar, setSelectedBar] = useState<string | null>(null)

  const handleBarClick = (data: any, index: number) => {
    if (interactive && onBarClick) {
      onBarClick(data, index)
    }
    setSelectedBar(data[xKey])
  }

  const handleExport = () => {
    // Export functionality - could export as PNG, SVG, or CSV
    console.log('Exporting chart data:', data)
    // In a real implementation, this would trigger a download
  }

  const handleFilter = () => {
    // Filter functionality
    console.log('Opening filter dialog')
  }

  const handleFullscreen = () => {
    // Fullscreen functionality
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
      <RechartsBarChart 
        data={data} 
        margin={{ 
          top: 5, 
          right: window.innerWidth < 768 ? 10 : 30, 
          left: window.innerWidth < 768 ? 10 : 20, 
          bottom: 5 
        }}
        layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
        onClick={handleBarClick}
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
          fontSize={window.innerWidth < 768 ? 10 : chartTheme.axis.fontSize}
          fontFamily={chartTheme.axis.fontFamily}
          angle={window.innerWidth < 768 ? -45 : 0}
          textAnchor={window.innerWidth < 768 ? 'end' : 'middle'}
          height={window.innerWidth < 768 ? 60 : 30}
        />
        <YAxis 
          dataKey={orientation === 'horizontal' ? xKey : undefined}
          type={orientation === 'horizontal' ? 'category' : 'number'}
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
          <Bar
            key={key}
            dataKey={key}
            fill={chartTheme.palette[index % chartTheme.palette.length]}
            radius={[2, 2, 0, 0]}
            cursor={interactive ? 'pointer' : 'default'}
            onClick={handleBarClick}
            opacity={selectedBar && selectedBar !== data.find(d => d[key])?.[xKey] ? 0.6 : 1}
          />
        ))}
      </RechartsBarChart>
    </BaseChart>
  )
}