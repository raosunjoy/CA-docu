import { ChartIntelligenceService, type DataPoint, type VisualizationContext } from '../chart-intelligence'
import { OpenAI } from 'openai'

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}))

describe('ChartIntelligenceService', () => {
  let service: ChartIntelligenceService
  let mockOpenAI: jest.Mocked<OpenAI>

  const mockData: DataPoint[] = [
    { name: 'Jan', value: 100, revenue: 1000 },
    { name: 'Feb', value: 150, revenue: 1500 },
    { name: 'Mar', value: 200, revenue: 2000 },
    { name: 'Apr', value: 180, revenue: 1800 },
    { name: 'May', value: 220, revenue: 2200 }
  ]

  const mockContext: VisualizationContext = {
    purpose: 'trend',
    audience: 'manager',
    emphasis: 'clarity'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any

    ;(OpenAI as jest.Mock).mockImplementation(() => mockOpenAI)

    service = new ChartIntelligenceService({
      openaiApiKey: 'test-api-key',
      organizationId: 'test-org'
    })
  })

  describe('Chart Recommendation', () => {
    it('generates chart recommendations successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              chartType: 'line',
              confidence: 85,
              reasoning: 'Line chart is optimal for trend analysis',
              configuration: {
                xKey: 'name',
                yKeys: ['value'],
                showLegend: true,
                showGrid: true
              },
              alternatives: [{
                chartType: 'bar',
                confidence: 70,
                reasoning: 'Bar chart for comparisons'
              }]
            })
          }
        }]
      }

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: '["Revenue shows upward trend", "Peak in May"]'
            }
          }]
        })

      const recommendation = await service.recommendChart(mockData, mockContext)

      expect(recommendation).toEqual(
        expect.objectContaining({
          chartType: 'line',
          confidence: 85,
          reasoning: 'Line chart is optimal for trend analysis',
          configuration: expect.objectContaining({
            xKey: 'name',
            yKeys: ['value'],
            showLegend: true,
            showGrid: true
          }),
          insights: expect.arrayContaining([
            expect.stringMatching(/trend|May/i)
          ]),
          alternatives: expect.arrayContaining([
            expect.objectContaining({
              chartType: 'bar',
              confidence: 70
            })
          ])
        })
      )
    })

    it('handles AI service errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const recommendation = await service.recommendChart(mockData, mockContext)

      expect(recommendation.chartType).toBeDefined()
      expect(recommendation.confidence).toBeGreaterThan(0)
      expect(recommendation.insights).toContain('Using fallback chart recommendation')
    })

    it('returns fallback recommendation for invalid AI response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: 'invalid json' }
        }]
      })

      const recommendation = await service.recommendChart(mockData, mockContext)

      expect(recommendation.chartType).toBeDefined()
      expect(recommendation.confidence).toBeGreaterThan(0)
    })
  })

  describe('Color Optimization', () => {
    it('generates optimized color palette', async () => {
      const mockColors = ['#1f77b4', '#ff7f0e', '#2ca02c']
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockColors)
          }
        }]
      })

      const colors = await service.optimizeColors(mockData, 'line', mockContext)

      expect(colors).toEqual(mockColors)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.2
        })
      )
    })

    it('returns default colors on AI error', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const colors = await service.optimizeColors(mockData, 'line', mockContext)

      expect(colors).toBeInstanceOf(Array)
      expect(colors.length).toBeGreaterThan(0)
      expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/i)
    })

    it('handles invalid JSON response', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: 'not json' }
        }]
      })

      const colors = await service.optimizeColors(mockData, 'line', mockContext)

      expect(colors).toBeInstanceOf(Array)
      expect(colors.length).toBeGreaterThan(0)
    })
  })

  describe('Annotation Generation', () => {
    it('generates chart annotations', async () => {
      const mockAnnotations = [
        {
          type: 'callout',
          position: { x: 'May', y: 220 },
          text: 'Peak performance',
          style: 'success'
        }
      ]

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAnnotations)
          }
        }]
      })

      const insights = ['Revenue peaked in May', 'Growth trend positive']
      const annotations = await service.generateAnnotations(mockData, 'line', insights)

      expect(annotations).toEqual(mockAnnotations)
    })

    it('handles annotation generation errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const annotations = await service.generateAnnotations(mockData, 'line', [])

      expect(annotations).toEqual([])
    })
  })

  describe('Data Structure Analysis', () => {
    it('analyzes numeric data correctly', async () => {
      const numericData = [
        { x: 1, y: 100 },
        { x: 2, y: 200 },
        { x: 3, y: 300 }
      ]

      // Test through chart recommendation which uses data analysis
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'scatter',
                confidence: 80,
                reasoning: 'Scatter plot for numeric relationships',
                configuration: {}
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      await service.recommendChart(numericData, {
        purpose: 'relationship',
        audience: 'analyst'
      })

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Numeric columns: 2')
            })
          ])
        })
      )
    })

    it('analyzes categorical data correctly', async () => {
      const categoricalData = [
        { category: 'A', value: 100 },
        { category: 'B', value: 200 },
        { category: 'A', value: 150 }
      ]

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'bar',
                confidence: 90,
                reasoning: 'Bar chart for categorical comparisons',
                configuration: {}
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      await service.recommendChart(categoricalData, {
        purpose: 'comparison',
        audience: 'general'
      })

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Categorical columns: 1')
            })
          ])
        })
      )
    })

    it('detects time series data', async () => {
      const timeData = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-02-01', value: 150 },
        { date: '2023-03-01', value: 200 }
      ]

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'line',
                confidence: 95,
                reasoning: 'Line chart for time series',
                configuration: { smoothCurve: true }
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      await service.recommendChart(timeData, {
        purpose: 'trend',
        audience: 'analyst'
      })

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Has time data: true')
            })
          ])
        })
      )
    })
  })

  describe('Context-Based Optimization', () => {
    it('optimizes for different audiences', async () => {
      const executiveContext: VisualizationContext = {
        purpose: 'performance',
        audience: 'executive',
        emphasis: 'impact'
      }

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'bar',
                confidence: 85,
                reasoning: 'Clear visualization for executives',
                configuration: {
                  showLegend: true,
                  showGrid: false
                }
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      const recommendation = await service.recommendChart(mockData, executiveContext)

      expect(recommendation.configuration.showDataLabels).toBe(true)
      expect(recommendation.configuration.showGrid).toBe(false)
    })

    it('handles mobile optimization constraints', async () => {
      const mobileContext: VisualizationContext = {
        purpose: 'comparison',
        audience: 'general',
        constraints: {
          mobileOptimized: true,
          maxComplexity: 'simple'
        }
      }

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'bar',
                confidence: 80,
                reasoning: 'Simple bar chart for mobile',
                configuration: {}
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      const recommendation = await service.recommendChart(mockData, mobileContext)

      // Should optimize for mobile constraints
      expect(recommendation.configuration).toBeDefined()
    })
  })

  describe('Fallback Scenarios', () => {
    it('provides appropriate fallback for empty data', async () => {
      const recommendation = await service.recommendChart([], mockContext)

      expect(recommendation.chartType).toBeDefined()
      expect(recommendation.confidence).toBeGreaterThan(0)
      expect(recommendation.insights).toContain('Using fallback chart recommendation')
    })

    it('handles different chart purposes correctly in fallback', async () => {
      const compositionContext = { ...mockContext, purpose: 'composition' as const }
      const trendContext = { ...mockContext, purpose: 'trend' as const }

      const compositionRec = await service.recommendChart([], compositionContext)
      const trendRec = await service.recommendChart([], trendContext)

      expect(compositionRec.chartType).toBe('pie')
      expect(trendRec.chartType).toBe('line')
    })
  })

  describe('Performance and Edge Cases', () => {
    it('handles large datasets efficiently', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        x: i,
        y: Math.random() * 100
      }))

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'line',
                confidence: 75,
                reasoning: 'Line chart for large dataset',
                configuration: {}
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      const startTime = performance.now()
      await service.recommendChart(largeData, mockContext)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('handles malformed data gracefully', async () => {
      const malformedData = [
        { a: null, b: undefined },
        { a: '', b: 0 },
        { a: 'valid', b: 100 }
      ]

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                chartType: 'bar',
                confidence: 60,
                reasoning: 'Default chart for malformed data',
                configuration: {}
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '[]' } }]
        })

      const recommendation = await service.recommendChart(malformedData, mockContext)

      expect(recommendation.chartType).toBeDefined()
      expect(recommendation.confidence).toBeGreaterThan(0)
    })
  })
})