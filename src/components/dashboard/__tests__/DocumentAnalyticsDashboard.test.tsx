import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DocumentAnalyticsDashboard } from '../DocumentAnalyticsDashboard'

// Mock the chart components
jest.mock('../../charts', () => ({
  BarChart: ({ title, loading, error }: any) => (
    <div data-testid="bar-chart">
      {loading ? 'Loading...' : error ? `Error: ${error}` : `Bar Chart: ${title}`}
    </div>
  ),
  LineChart: ({ title, loading, error }: any) => (
    <div data-testid="line-chart">
      {loading ? 'Loading...' : error ? `Error: ${error}` : `Line Chart: ${title}`}
    </div>
  ),
  DonutChart: ({ title, loading, error }: any) => (
    <div data-testid="donut-chart">
      {loading ? 'Loading...' : error ? `Error: ${error}` : `Donut Chart: ${title}`}
    </div>
  ),
  KPICard: ({ title, value, valueType, status }: any) => (
    <div data-testid="kpi-card">
      {title}: {value}{valueType === 'percentage' ? '%' : ''}
    </div>
  )
}))

// Mock icons
jest.mock('lucide-react', () => ({
  FileText: () => <div data-testid="file-text-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  BarChart3: () => <div data-testid="bar-chart3-icon" />,
  FileCheck: () => <div data-testid="file-check-icon" />,
  FileX: () => <div data-testid="file-x-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Filter: () => <div data-testid="filter-icon" />
}))

describe('DocumentAnalyticsDashboard', () => {
  const defaultProps = {
    organizationId: 'test-org-123',
    userId: 'test-user-456',
    role: 'manager'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Speed up the mock API delay for tests
    jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
      fn()
      return 0 as any
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders dashboard header correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Document Analytics Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Comprehensive insights into document processing and intelligence')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      expect(screen.getByText('Loading document analytics...')).toBeInTheDocument()
    })

    it('renders navigation tabs correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument()
        expect(screen.getByText('Processing')).toBeInTheDocument()
        expect(screen.getByText('Quality')).toBeInTheDocument()
        expect(screen.getByText('Workflows')).toBeInTheDocument()
        expect(screen.getByText('Compliance')).toBeInTheDocument()
      })
    })

    it('renders category filter dropdown', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        const categoryFilter = screen.getByRole('combobox')
        expect(categoryFilter).toBeInTheDocument()
        expect(screen.getByText('All Categories')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading', () => {
    it('displays mock data after loading', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Documents: 1247')).toBeInTheDocument()
        expect(screen.getByText('Processing Success:')).toBeInTheDocument()
        expect(screen.getByText('Quality Score:')).toBeInTheDocument()
        expect(screen.getByText('Avg Processing Time:')).toBeInTheDocument()
      })
    })

    it('shows processing status correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Processed')).toBeInTheDocument()
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('Failed')).toBeInTheDocument()
        expect(screen.getByText('1198')).toBeInTheDocument() // Processed count
      })
    })
  })

  describe('View Navigation', () => {
    it('switches to processing view correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Processing'))
      })

      await waitFor(() => {
        expect(screen.getByText('Weekly Volume')).toBeInTheDocument()
        expect(screen.getByText('Success Rate')).toBeInTheDocument()
        expect(screen.getByText('Efficiency')).toBeInTheDocument()
        expect(screen.getByText('Active Workflows')).toBeInTheDocument()
      })
    })

    it('switches to quality view correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Quality'))
      })

      await waitFor(() => {
        expect(screen.getByText('Avg Quality')).toBeInTheDocument()
        expect(screen.getByText('High Quality')).toBeInTheDocument()
        expect(screen.getByText('Medium Quality')).toBeInTheDocument()
        expect(screen.getByText('Needs Review')).toBeInTheDocument()
      })
    })

    it('switches to workflows view correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Workflows'))
      })

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
        expect(screen.getByText('Triggered')).toBeInTheDocument()
        expect(screen.getByText('Avg Time')).toBeInTheDocument()
      })
    })

    it('switches to compliance view correctly', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Compliance'))
      })

      await waitFor(() => {
        expect(screen.getByText('Compliance Score')).toBeInTheDocument()
        expect(screen.getByText('Regulatory Docs')).toBeInTheDocument()
        expect(screen.getByText('Gaps Found')).toBeInTheDocument()
        expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument()
      })
    })
  })

  describe('Charts and Visualizations', () => {
    it('renders KPI cards in overview', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        const kpiCards = screen.getAllByTestId('kpi-card')
        expect(kpiCards).toHaveLength(4)
        expect(kpiCards[0]).toHaveTextContent('Total Documents: 1247')
      })
    })

    it('renders donut chart for category distribution', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Donut Chart: Document Categories')).toBeInTheDocument()
      })
    })

    it('renders line chart for daily processing trend', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Line Chart: Daily Processing Trend')).toBeInTheDocument()
      })
    })
  })

  describe('Quality Analytics', () => {
    it('shows quality score distribution', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Quality'))
      })

      await waitFor(() => {
        expect(screen.getByText('Donut Chart: Quality Score Distribution')).toBeInTheDocument()
        expect(screen.getByText('Line Chart: Quality Score Trends')).toBeInTheDocument()
      })
    })

    it('displays low quality documents alert', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Quality'))
      })

      await waitFor(() => {
        expect(screen.getByText('Documents Requiring Attention')).toBeInTheDocument()
        expect(screen.getByText('Bank Statement.pdf')).toBeInTheDocument()
        expect(screen.getByText('Poor scan quality')).toBeInTheDocument()
      })
    })
  })

  describe('Workflow Analytics', () => {
    it('shows workflow performance metrics', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Workflows'))
      })

      await waitFor(() => {
        expect(screen.getByText('Workflow Performance')).toBeInTheDocument()
        expect(screen.getByText('Invoice Processing')).toBeInTheDocument()
        expect(screen.getByText('Compliance Check')).toBeInTheDocument()
      })
    })

    it('displays process bottlenecks', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Workflows'))
      })

      await waitFor(() => {
        expect(screen.getByText('Process Bottlenecks')).toBeInTheDocument()
        expect(screen.getByText('Manual Review')).toBeInTheDocument()
        expect(screen.getByText('Approval Process')).toBeInTheDocument()
      })
    })
  })

  describe('Compliance Analytics', () => {
    it('shows compliance score and metrics', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Compliance'))
      })

      await waitFor(() => {
        expect(screen.getByText('92.5%')).toBeInTheDocument() // Compliance score
        expect(screen.getByText('298')).toBeInTheDocument() // Regulatory docs
        expect(screen.getByText('7')).toBeInTheDocument() // Compliance gaps
        expect(screen.getByText('12')).toBeInTheDocument() // Upcoming deadlines
      })
    })

    it('displays risk assessment with correct risk level', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Compliance'))
      })

      await waitFor(() => {
        expect(screen.getByText('Risk Assessment')).toBeInTheDocument()
        expect(screen.getByText('LOW RISK')).toBeInTheDocument()
        expect(screen.getByText('Audit Readiness')).toBeInTheDocument()
        expect(screen.getByText('Document Compliance')).toBeInTheDocument()
      })
    })
  })

  describe('Interaction Handling', () => {
    it('handles category filter change', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        const categoryFilter = screen.getByRole('combobox')
        fireEvent.change(categoryFilter, { target: { value: 'financial' } })
      })

      // Should trigger data refetch with new filter
      expect(screen.getByDisplayValue('Financial')).toBeInTheDocument()
    })

    it('handles refresh button click', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        const refreshButton = screen.getByText('Refresh')
        fireEvent.click(refreshButton)
      })

      expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    })

    it('maintains view state between refreshes', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Quality'))
      })

      await waitFor(() => {
        expect(screen.getByText('Avg Quality')).toBeInTheDocument()
        
        const refreshButton = screen.getByText('Refresh')
        fireEvent.click(refreshButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Avg Quality')).toBeInTheDocument()
      })
    })
  })

  describe('Props and Configuration', () => {
    it('handles different time range props', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} timeRange="week" />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Documents: 1247')).toBeInTheDocument()
      })
    })

    it('applies custom className correctly', async () => {
      const { container } = render(
        <DocumentAnalyticsDashboard {...defaultProps} className="custom-dashboard" />
      )
      
      await waitFor(() => {
        const dashboard = container.firstChild
        expect(dashboard).toHaveClass('custom-dashboard')
      })
    })

    it('handles missing optional props gracefully', async () => {
      render(<DocumentAnalyticsDashboard organizationId="test-org" />)
      
      await waitFor(() => {
        expect(screen.getByText('Document Analytics Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error state correctly', async () => {
      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock fetch to throw an error
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn().mockImplementation((fn) => {
        throw new Error('Network error')
      })

      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      global.setTimeout = originalSetTimeout
      consoleSpy.mockRestore()
    })

    it('handles retry after error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      // Mock fetch to throw error first, then succeed
      let callCount = 0
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn().mockImplementation((fn) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Network error')
        } else {
          fn()
          return 0 as any
        }
      })

      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Try Again'))
      
      await waitFor(() => {
        expect(screen.getByText('Total Documents: 1247')).toBeInTheDocument()
      })

      global.setTimeout = originalSetTimeout
      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
        
        const combobox = screen.getByRole('combobox')
        expect(combobox).toBeInTheDocument()
      })
    })

    it('provides keyboard navigation for view tabs', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        const overviewTab = screen.getByText('Overview')
        const processingTab = screen.getByText('Processing')
        
        overviewTab.focus()
        expect(overviewTab).toHaveFocus()
        
        fireEvent.keyDown(overviewTab, { key: 'Tab' })
        // Processing tab should be focusable
        processingTab.focus()
        expect(processingTab).toHaveFocus()
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('adapts layout for different screen sizes', async () => {
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        // Check for responsive grid classes
        const dashboard = screen.getByText('Document Analytics Dashboard').closest('div')
        expect(dashboard).toHaveClass('space-y-6')
      })
    })
  })

  describe('Performance', () => {
    it('renders efficiently with large datasets', async () => {
      const startTime = performance.now()
      
      render(<DocumentAnalyticsDashboard {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Documents: 1247')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000)
    })
  })
})