'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Lightbulb, 
  Settings, 
  Palette, 
  TrendingUp, 
  BarChart3,
  RefreshCw,
  Sparkles,
  Eye,
  Download,
  Maximize2
} from 'lucide-react'
import { BaseChart } from './BaseChart'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { PieChart, DonutChart } from './PieChart'
import { Button } from '../atoms/Button'
import { Card } from '../atoms/Card'
import { ChartIntelligenceService, type DataPoint, type VisualizationContext, type ChartRecommendation } from '../../lib/ai-visualization/chart-intelligence'

interface AIEnhancedChartProps {
  data: DataPoint[]
  context: VisualizationContext
  title?: string
  height?: number
  className?: string
  enableAI?: boolean
  allowChartTypeChange?: boolean
  showInsights?: boolean
  showRecommendations?: boolean
  organizationId?: string
  onChartTypeChange?: (chartType: string) => void
  onInsightClick?: (insight: string) => void
}

export const AIEnhancedChart: React.FC<AIEnhancedChartProps> = ({
  data,
  context,
  title,
  height = 300,
  className = '',
  enableAI = true,
  allowChartTypeChange = true,
  showInsights = true,
  showRecommendations = true,
  organizationId = 'default-org',
  onChartTypeChange,
  onInsightClick
}) => {
  const [recommendation, setRecommendation] = useState<ChartRecommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChartType, setSelectedChartType] = useState<string | null>(null)
  const [optimizedColors, setOptimizedColors] = useState<string[]>([])
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [annotations, setAnnotations] = useState<any[]>([])

  const chartIntelligence = useMemo(() => {
    if (!enableAI) return null
    return new ChartIntelligenceService({
      openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
      organizationId
    })
  }, [enableAI, organizationId])

  // Generate AI recommendations
  useEffect(() => {
    if (!enableAI || !chartIntelligence || !data || data.length === 0) return

    const generateRecommendation = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const aiRecommendation = await chartIntelligence.recommendChart(data, context)
        setRecommendation(aiRecommendation)
        setSelectedChartType(aiRecommendation.chartType)
        
        // Optimize colors
        const colors = await chartIntelligence.optimizeColors(data, aiRecommendation.chartType, context)
        setOptimizedColors(colors)
        
        // Generate annotations
        const chartAnnotations = await chartIntelligence.generateAnnotations(
          data, 
          aiRecommendation.chartType, 
          aiRecommendation.insights
        )
        setAnnotations(chartAnnotations)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate AI recommendation')
        console.error('AI chart generation error:', err)
      } finally {
        setLoading(false)
      }
    }

    generateRecommendation()
  }, [data, context, chartIntelligence, enableAI])

  const currentChartType = selectedChartType || 'bar'
  const chartConfig = recommendation?.configuration || {}

  // Enhanced chart props with AI optimizations
  const enhancedProps = {
    data,
    height,
    title,
    loading: loading && !recommendation,
    error,
    colors: optimizedColors.length > 0 ? optimizedColors : undefined,
    showLegend: chartConfig.showLegend,
    showGrid: chartConfig.showGrid,
    stackedData: chartConfig.stackedData,
    smoothCurve: chartConfig.smoothCurve,
    showDataLabels: chartConfig.showDataLabels,
    annotations,
    xKey: chartConfig.xKey,
    yKeys: chartConfig.yKeys,
    ...(chartConfig.trendLine && { showTrendLine: true })
  }

  const handleChartTypeChange = (newType: string) => {
    setSelectedChartType(newType)
    onChartTypeChange?.(newType)
  }

  const handleRefreshRecommendation = async () => {
    if (chartIntelligence) {
      setRecommendation(null)
      setOptimizedColors([])
      setLoading(true)
      setError(null)
      
      try {
        const aiRecommendation = await chartIntelligence.recommendChart(data, context)
        setRecommendation(aiRecommendation)
        setSelectedChartType(aiRecommendation.chartType)
        
        // Optimize colors
        const colors = await chartIntelligence.optimizeColors(data, aiRecommendation.chartType, context)
        setOptimizedColors(colors)
        
        // Generate annotations
        const chartAnnotations = await chartIntelligence.generateAnnotations(
          data, 
          aiRecommendation.chartType, 
          aiRecommendation.insights
        )
        setAnnotations(chartAnnotations)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate AI recommendation')
        console.error('AI chart generation error:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  const renderChart = () => {
    switch (currentChartType) {
      case 'line':
        return <LineChart {...enhancedProps} />
      case 'bar':
        return <BarChart {...enhancedProps} />
      case 'pie':
        return <PieChart {...enhancedProps} />
      case 'donut':
        return <DonutChart {...enhancedProps} />
      default:
        return <BarChart {...enhancedProps} />
    }
  }

  const chartTypeOptions = [
    { type: 'line', icon: TrendingUp, label: 'Line Chart' },
    { type: 'bar', icon: BarChart3, label: 'Bar Chart' },
    { type: 'pie', icon: Eye, label: 'Pie Chart' },
    { type: 'donut', icon: Eye, label: 'Donut Chart' }
  ]

  return (
    <div className={`ai-enhanced-chart-container ${className}`}>
      <div className="relative">
        {/* AI Enhancement Badge */}
        {enableAI && recommendation && (
          <div className="absolute top-2 right-2 z-10 flex items-center space-x-1">
            <div className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Enhanced
            </div>
            <Button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className="p-1 bg-white/80 hover:bg-white text-gray-600 border border-gray-200 rounded shadow-sm"
              title="AI Insights"
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Chart Type Selector */}
        {allowChartTypeChange && recommendation && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Chart Type:</span>
              <div className="flex space-x-1">
                {chartTypeOptions.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => handleChartTypeChange(type)}
                    className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                      selectedChartType === type
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4 mr-1" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
            {enableAI && (
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  (recommendation?.confidence || 0) >= 80 
                    ? 'bg-green-100 text-green-800' 
                    : (recommendation?.confidence || 0) >= 60 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {recommendation?.confidence}% confidence
                </span>
                <Button
                  onClick={handleRefreshRecommendation}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Refresh AI recommendation"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Main Chart */}
        <div className="chart-wrapper">
          {renderChart()}
        </div>

        {/* AI Insights Panel */}
        {enableAI && showAIPanel && recommendation && (
          <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-blue-900 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Insights & Recommendations
              </h4>
              <Button
                onClick={() => setShowAIPanel(false)}
                className="p-1 text-blue-600 hover:text-blue-800"
                title="Close insights panel"
              >
                ×
              </Button>
            </div>

            {/* Chart Recommendation Reasoning */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-blue-800 mb-2">Why this chart type?</h5>
              <p className="text-sm text-blue-700 bg-white/60 p-3 rounded border">
                {recommendation.reasoning}
              </p>
            </div>

            {/* Data Insights */}
            {showInsights && recommendation.insights.length > 0 && (
              <div className="mb-4">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Data Insights</h5>
                <div className="space-y-2">
                  {recommendation.insights.map((insight, index) => (
                    <div
                      key={index}
                      onClick={() => onInsightClick?.(insight)}
                      className="flex items-start p-2 bg-white/60 rounded border hover:bg-white/80 cursor-pointer transition-colors"
                    >
                      <Lightbulb className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-700">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Chart Types */}
            {showRecommendations && recommendation.alternatives.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-800 mb-2">Alternative Options</h5>
                <div className="space-y-2">
                  {recommendation.alternatives.map((alternative, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white/60 rounded border">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-700 capitalize">
                          {alternative.chartType} Chart
                        </div>
                        <div className="text-xs text-blue-600">{alternative.reasoning}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-600">{alternative.confidence}%</span>
                        <Button
                          onClick={() => handleChartTypeChange(alternative.chartType)}
                          className="px-2 py-1 text-xs bg-blue-200 text-blue-800 hover:bg-blue-300"
                        >
                          Try
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Chart Configuration Summary */}
        {enableAI && recommendation && (
          <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span>AI optimized for {context.purpose}</span>
              <span>•</span>
              <span>Audience: {context.audience}</span>
              {optimizedColors.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center">
                    <Palette className="w-3 h-3 mr-1" />
                    <span>AI color palette</span>
                    <div className="flex ml-2 space-x-1">
                      {optimizedColors.slice(0, 5).map((color, index) => (
                        <div
                          key={index}
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {/* Handle export */}}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Export chart"
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => {/* Handle fullscreen */}}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Fullscreen view"
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIEnhancedChart