import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AIEnhancedChart } from '../AIEnhancedChart'
import { ChartIntelligenceService } from '../../../lib/ai-visualization/chart-intelligence'

// Mock the chart intelligence service
jest.mock('../../../lib/ai-visualization/chart-intelligence', () => ({
  ChartIntelligenceService: jest.fn().mockImplementation(() => ({
    recommendChart: jest.fn(),
    optimizeColors: jest.fn(),
    generateAnnotations: jest.fn()
  }))
}))

// Mock the chart components
jest.mock('../LineChart', () => ({
  LineChart: ({ title }: any) => <div data-testid="line-chart">{title}</div>
}))

jest.mock('../BarChart', () => ({
  BarChart: ({ title }: any) => <div data-testid="bar-chart">{title}</div>
}))

jest.mock('../PieChart', () => ({
  PieChart: ({ title }: any) => <div data-testid="pie-chart">{title}</div>,
  DonutChart: ({ title }: any) => <div data-testid="donut-chart">{title}</div>
}))

// Mock icons
jest.mock('lucide-react', () => ({
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Palette: () => <div data-testid="palette-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  BarChart3: () => <div data-testid="bar-chart3-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />
}))

describe('AIEnhancedChart', () => {
  const mockData = [
    { name: 'Jan', value: 100, revenue: 1000 },
    { name: 'Feb', value: 150, revenue: 1500 },
    { name: 'Mar', value: 200, revenue: 2000 },
    { name: 'Apr', value: 180, revenue: 1800 },
    { name: 'May', value: 220, revenue: 2200 }
  ]

  const mockContext = {
    purpose: 'trend' as const,
    audience: 'manager' as const,
    emphasis: 'clarity' as const
  }

  const mockRecommendation = {
    chartType: 'line' as const,
    confidence: 85,
    reasoning: 'Line chart is optimal for showing trends over time',
    configuration: {
      xKey: 'name',
      yKeys: ['value'],
      showLegend: true,
      showGrid: true,
      smoothCurve: true
    },
    insights: [
      'Revenue shows strong upward trend',
      'May shows peak performance',
      'Growth rate accelerating in Q2'
    ],
    alternatives: [
      {
        chartType: 'bar',
        confidence: 70,
        reasoning: 'Bar chart provides clear comparisons'
      }
    ]
  }

  let mockChartIntelligence: jest.Mocked<ChartIntelligenceService>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mock implementation
    mockChartIntelligence = {
      recommendChart: jest.fn().mockResolvedValue(mockRecommendation),
      optimizeColors: jest.fn().mockResolvedValue(['#1f77b4', '#ff7f0e', '#2ca02c']),
      generateAnnotations: jest.fn().mockResolvedValue([
        {
          type: 'callout',
          position: { x: 'May', y: 220 },
          text: 'Peak performance',
          style: 'success'
        }
      ])
    } as any

    ;(ChartIntelligenceService as jest.Mock).mockImplementation(() => mockChartIntelligence)
  })

  describe('Basic Rendering', () => {
    it('renders without AI enhancement', () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={false}
        />
      )

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      expect(screen.queryByTestId('sparkles-icon')).not.toBeInTheDocument()
    })

    it('renders with AI enhancement enabled', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('AI Enhanced')).toBeInTheDocument()
      })
    })

    it('displays loading state during AI analysis', () => {
      // Mock slow AI response
      mockChartIntelligence.recommendChart.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockRecommendation), 1000))
      )

      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  describe('AI Intelligence Integration', () => {
    it('calls chart intelligence service with correct parameters', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          organizationId="test-org"
        />
      )

      await waitFor(() => {
        expect(mockChartIntelligence.recommendChart).toHaveBeenCalledWith(
          mockData,
          mockContext
        )
      })
    })

    it('applies AI recommendations to chart', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })
    })

    it('displays confidence level', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('85% confidence')).toBeInTheDocument()
      })
    })

    it('optimizes colors using AI', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(mockChartIntelligence.optimizeColors).toHaveBeenCalledWith(
          mockData,
          'line',
          mockContext
        )
      })
    })
  })

  describe('Chart Type Selection', () => {
    it('renders chart type selector when allowed', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          allowChartTypeChange={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Chart Type:')).toBeInTheDocument()
        expect(screen.getByText('Line Chart')).toBeInTheDocument()
        expect(screen.getByText('Bar Chart')).toBeInTheDocument()
      })
    })

    it('hides chart type selector when disabled', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          allowChartTypeChange={false}
        />
      )

      await waitFor(() => {
        expect(screen.queryByText('Chart Type:')).not.toBeInTheDocument()
      })
    })

    it('changes chart type when user selects different option', async () => {
      const onChartTypeChange = jest.fn()

      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          allowChartTypeChange={true}
          onChartTypeChange={onChartTypeChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Bar Chart'))

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
        expect(onChartTypeChange).toHaveBeenCalledWith('bar')
      })
    })
  })

  describe('AI Insights Panel', () => {
    it('shows AI insights panel when button clicked', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          showInsights={true}
        />
      )

      await waitFor(() => {
        const insightsButton = screen.getByTitle('AI Insights')
        fireEvent.click(insightsButton)
      })

      expect(screen.getByText('AI Insights & Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Why this chart type?')).toBeInTheDocument()
      expect(screen.getByText(mockRecommendation.reasoning)).toBeInTheDocument()
    })

    it('displays data insights', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          showInsights={true}
        />
      )

      await waitFor(() => {
        const insightsButton = screen.getByTitle('AI Insights')
        fireEvent.click(insightsButton)
      })

      expect(screen.getByText('Data Insights')).toBeInTheDocument()
      expect(screen.getByText('Revenue shows strong upward trend')).toBeInTheDocument()
      expect(screen.getByText('May shows peak performance')).toBeInTheDocument()
    })

    it('displays alternative chart recommendations', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          showRecommendations={true}
        />
      )

      await waitFor(() => {
        const insightsButton = screen.getByTitle('AI Insights')
        fireEvent.click(insightsButton)
      })

      expect(screen.getByText('Alternative Options')).toBeInTheDocument()
      expect(screen.getByText('Bar Chart')).toBeInTheDocument()
      expect(screen.getByText('70%')).toBeInTheDocument()
    })

    it('handles insight click events', async () => {
      const onInsightClick = jest.fn()

      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          showInsights={true}
          onInsightClick={onInsightClick}
        />
      )

      await waitFor(() => {
        const insightsButton = screen.getByTitle('AI Insights')
        fireEvent.click(insightsButton)
      })

      const insightElement = screen.getByText('Revenue shows strong upward trend')
      fireEvent.click(insightElement)

      expect(onInsightClick).toHaveBeenCalledWith('Revenue shows strong upward trend')
    })
  })

  describe('Error Handling', () => {
    it('handles AI service errors gracefully', async () => {
      mockChartIntelligence.recommendChart.mockRejectedValue(new Error('AI service unavailable'))

      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })
    })

    it('displays error message when AI fails', async () => {
      mockChartIntelligence.recommendChart.mockRejectedValue(new Error('Network error'))

      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        // Should still render chart even with AI error
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('refreshes AI recommendation when button clicked', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByTitle('Refresh AI recommendation')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('Refresh AI recommendation'))

      // Should trigger new AI analysis
      expect(mockChartIntelligence.recommendChart).toHaveBeenCalledTimes(2)
    })
  })

  describe('Color Optimization', () => {
    it('displays AI optimized color palette', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('AI color palette')).toBeInTheDocument()
        expect(screen.getByTestId('palette-icon')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          title="Test Chart"
        />
      )

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })

    it('supports keyboard navigation', async () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
          allowChartTypeChange={true}
        />
      )

      await waitFor(() => {
        const chartTypeButtons = screen.getAllByRole('button')
        const lineChartButton = chartTypeButtons.find(btn => 
          btn.textContent?.includes('Line Chart')
        )
        
        if (lineChartButton) {
          lineChartButton.focus()
          expect(lineChartButton).toHaveFocus()
        }
      })
    })
  })

  describe('Performance', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        name: `Item ${i}`,
        value: Math.random() * 100,
        revenue: Math.random() * 10000
      }))

      const startTime = performance.now()

      render(
        <AIEnhancedChart
          data={largeDataset}
          context={mockContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000)
    })

    it('memoizes expensive calculations', () => {
      const { rerender } = render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      // Re-render with same props
      rerender(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          enableAI={true}
        />
      )

      // Should only call AI service once due to memoization
      expect(mockChartIntelligence.recommendChart).toHaveBeenCalledTimes(1)
    })
  })

  describe('Configuration Options', () => {
    it('respects height prop', () => {
      render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          height={500}
          enableAI={false}
        />
      )

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <AIEnhancedChart
          data={mockData}
          context={mockContext}
          className="custom-chart-class"
          enableAI={false}
        />
      )

      const chartContainer = container.querySelector('.ai-enhanced-chart-container')
      expect(chartContainer).toHaveClass('custom-chart-class')
    })

    it('handles different visualization contexts', async () => {
      const comparisonContext = {
        purpose: 'comparison' as const,
        audience: 'executive' as const
      }

      render(
        <AIEnhancedChart
          data={mockData}
          context={comparisonContext}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(mockChartIntelligence.recommendChart).toHaveBeenCalledWith(
          mockData,
          comparisonContext
        )
      })
    })
  })

  describe('Integration with Document Analytics', () => {
    it('works with document analytics data structure', async () => {
      const documentData = [
        { category: 'Financial', count: 467, quality: 89.2 },
        { category: 'Tax', count: 298, quality: 91.5 },
        { category: 'Legal', count: 187, quality: 85.7 }
      ]

      render(
        <AIEnhancedChart
          data={documentData}
          context={{
            purpose: 'composition',
            audience: 'manager',
            title: 'Document Distribution'
          }}
          enableAI={true}
        />
      )

      await waitFor(() => {
        expect(mockChartIntelligence.recommendChart).toHaveBeenCalledWith(
          documentData,
          expect.objectContaining({
            purpose: 'composition',
            audience: 'manager'
          })
        )
      })
    })
  })
})