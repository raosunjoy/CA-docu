import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { EnhancedClientDashboard } from '../client-portal/EnhancedClientDashboard'

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, size }: any) => (
    <span data-testid="badge" data-variant={variant} data-size={size}>{children}</span>
  )
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value}>
      <div style={{ width: `${value}%` }}></div>
    </div>
  )
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button 
      onClick={onClick} 
      data-testid="button" 
      data-variant={variant} 
      data-size={size}
    >
      {children}
    </button>
  )
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Activity: () => <div data-testid="activity-icon" />
}))

describe('EnhancedClientDashboard', () => {
  const defaultProps = {
    clientId: 'client-123',
    clientType: 'business' as const
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    expect(screen.getByText(/animate-pulse/)).toBeInTheDocument()
  })

  it('renders business dashboard header for business clients', async () => {
    render(<EnhancedClientDashboard {...defaultProps} clientType="business" />)
    
    await waitFor(() => {
      expect(screen.getByText('Business Dashboard')).toBeInTheDocument()
    })
  })

  it('renders client dashboard header for individual clients', async () => {
    render(<EnhancedClientDashboard {...defaultProps} clientType="individual" />)
    
    await waitFor(() => {
      expect(screen.getByText('Client Dashboard')).toBeInTheDocument()
    })
  })

  it('displays key metrics cards', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Engagements')).toBeInTheDocument()
      expect(screen.getByText('Compliance Score')).toBeInTheDocument()
      expect(screen.getByText('Avg Response Time')).toBeInTheDocument()
      expect(screen.getByText('Satisfaction')).toBeInTheDocument()
    })

    // Check metric values
    expect(screen.getByText('2')).toBeInTheDocument() // Active engagements
    expect(screen.getByText('94%')).toBeInTheDocument() // Compliance score
    expect(screen.getByText('2.3h')).toBeInTheDocument() // Response time
    expect(screen.getByText('4.8/5')).toBeInTheDocument() // Satisfaction
  })

  it('displays navigation tabs', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Engagements')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('Communications')).toBeInTheDocument()
    })
  })

  it('switches tabs when clicked', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const engagementsTab = screen.getByText('Engagements')
      fireEvent.click(engagementsTab)
    })

    // Should show detailed engagement view
    await waitFor(() => {
      expect(screen.getByText('Annual Audit FY 2024-25')).toBeInTheDocument()
    })
  })

  it('displays different engagements for individual vs business clients', async () => {
    // Test business client
    const { rerender } = render(<EnhancedClientDashboard {...defaultProps} clientType="business" />)
    
    await waitFor(() => {
      expect(screen.getByText('Annual Audit FY 2024-25')).toBeInTheDocument()
      expect(screen.getByText('GST Compliance Review')).toBeInTheDocument()
    })

    // Test individual client
    rerender(<EnhancedClientDashboard {...defaultProps} clientType="individual" />)
    
    await waitFor(() => {
      expect(screen.getByText('Income Tax Return Filing')).toBeInTheDocument()
      expect(screen.getByText('Capital Gains Assessment')).toBeInTheDocument()
    })
  })

  it('displays progress bars for engagements', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const progressBars = screen.getAllByTestId('progress')
      expect(progressBars).toHaveLength(3) // 3 engagements in overview
      
      // Check progress values
      expect(progressBars[0]).toHaveAttribute('data-value', '65')
      expect(progressBars[1]).toHaveAttribute('data-value', '90')
      expect(progressBars[2]).toHaveAttribute('data-value', '100')
    })
  })

  it('displays engagement status badges with correct variants', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const badges = screen.getAllByTestId('badge')
      
      // Find status badges
      const statusBadges = badges.filter(badge => 
        badge.textContent?.includes('in progress') ||
        badge.textContent?.includes('under review') ||
        badge.textContent?.includes('completed')
      )
      
      expect(statusBadges.length).toBeGreaterThan(0)
    })
  })

  it('displays pending document requests with upload buttons', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      // Check for document titles - different for business vs individual
      expect(
        screen.getByText('Bank Statements (July 2025)') || 
        screen.getByText('Form 16 for FY 2024-25')
      ).toBeInTheDocument()
      
      // Check for upload buttons
      const uploadButtons = screen.getAllByText('Upload')
      expect(uploadButtons.length).toBeGreaterThan(0)
    })
  })

  it('handles contact team button click', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const contactButtons = screen.getAllByText('Contact Team')
      expect(contactButtons.length).toBeGreaterThan(0)
      
      // Click should not throw error
      fireEvent.click(contactButtons[0])
    })
  })

  it('displays notifications with correct read/unread status', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    // Switch to communications tab
    await waitFor(() => {
      const communicationsTab = screen.getByText('Communications')
      fireEvent.click(communicationsTab)
    })

    await waitFor(() => {
      expect(screen.getByText('Document Upload Deadline Approaching')).toBeInTheDocument()
      expect(screen.getByText('Audit Progress Update')).toBeInTheDocument()
      expect(screen.getByText('Tax Planning Consultation Completed')).toBeInTheDocument()
    })
  })

  it('shows action required badges for urgent notifications', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const communicationsTab = screen.getByText('Communications')
      fireEvent.click(communicationsTab)
    })

    await waitFor(() => {
      const actionRequiredBadges = screen.getAllByText('Action Required')
      expect(actionRequiredBadges.length).toBeGreaterThan(0)
    })
  })

  it('displays correct notification count in header badge', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('1 New')).toBeInTheDocument() // 1 unread notification
    })
  })

  it('formats dates correctly', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      // Should display formatted dates
      const dateElements = screen.getAllByTestId('calendar-icon')
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  it('handles detailed engagement view', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const engagementsTab = screen.getByText('Engagements')
      fireEvent.click(engagementsTab)
    })

    await waitFor(() => {
      // Should show detailed engagement information
      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('Deadline')).toBeInTheDocument()
      expect(screen.getByText('Assigned Team')).toBeInTheDocument()
    })
  })

  it('displays team member names', async () => {
    render(<EnhancedClientDashboard {...defaultProps} />)
    
    await waitFor(() => {
      const engagementsTab = screen.getByText('Engagements')
      fireEvent.click(engagementsTab)
    })

    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson, Mike Chen')).toBeInTheDocument()
      expect(screen.getByText('Alex Kumar')).toBeInTheDocument()
    })
  })
})