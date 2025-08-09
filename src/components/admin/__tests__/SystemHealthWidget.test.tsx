import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { SystemHealthWidget } from '../SystemHealthWidget'

// Mock the useSystemHealth hook
jest.mock('@/hooks/useSystemHealth', () => ({
  useSystemHealth: jest.fn(() => ({
    healthData: {
      status: 'healthy',
      metrics: {
        cpu: 45,
        memory: 67,
        responseTime: 120,
        errorRate: 1,
        activeUsers: 23,
        uptime: 86400
      },
      alerts: [],
      lastUpdated: new Date('2024-01-01T12:00:00Z'),
      ready: true
    },
    loading: false,
    error: null,
    refresh: jest.fn()
  }))
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('SystemHealthWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render system health metrics correctly', async () => {
    render(<SystemHealthWidget />)
    
    expect(screen.getByText('System Health')).toBeInTheDocument()
    expect(screen.getByText('healthy')).toBeInTheDocument()
    
    // Check metrics
    expect(screen.getByText('45%')).toBeInTheDocument() // CPU
    expect(screen.getByText('67%')).toBeInTheDocument() // Memory
    expect(screen.getByText('120ms')).toBeInTheDocument() // Response Time
    expect(screen.getByText('23')).toBeInTheDocument() // Active Users
    expect(screen.getByText('1%')).toBeInTheDocument() // Error Rate
    expect(screen.getByText('1d 0h 0m')).toBeInTheDocument() // Uptime
  })

  it('should display alerts when present', () => {
    const mockUseSystemHealth = require('@/hooks/useSystemHealth').useSystemHealth
    mockUseSystemHealth.mockReturnValue({
      healthData: {
        status: 'warning',
        metrics: {
          cpu: 85,
          memory: 90,
          responseTime: 250,
          errorRate: 3,
          activeUsers: 50,
          uptime: 3600
        },
        alerts: [
          {
            id: 'memory-high',
            severity: 'high',
            message: 'Memory usage is 90%',
            component: 'System Memory',
            timestamp: new Date('2024-01-01T12:00:00Z'),
            acknowledged: false,
            actionRequired: 'Consider scaling up or optimizing memory usage'
          }
        ],
        lastUpdated: new Date('2024-01-01T12:00:00Z'),
        ready: true
      },
      loading: false,
      error: null,
      refresh: jest.fn()
    })

    render(<SystemHealthWidget />)
    
    expect(screen.getByText('warning')).toBeInTheDocument()
    expect(screen.getByText('Active Alerts')).toBeInTheDocument()
    expect(screen.getByText('Memory usage is 90%')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })

  it('should handle error state correctly', () => {
    const mockUseSystemHealth = require('@/hooks/useSystemHealth').useSystemHealth
    mockUseSystemHealth.mockReturnValue({
      healthData: {
        status: 'unknown',
        metrics: {
          cpu: 0,
          memory: 0,
          responseTime: 0,
          errorRate: 0,
          activeUsers: 0,
          uptime: 0
        },
        alerts: [],
        lastUpdated: new Date(),
        ready: false
      },
      loading: false,
      error: 'Failed to fetch health data',
      refresh: jest.fn()
    })

    render(<SystemHealthWidget />)
    
    expect(screen.getByText('Failed to load system health data')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch health data')).toBeInTheDocument()
  })

  it('should call refresh when refresh button is clicked', () => {
    const mockRefresh = jest.fn()
    const mockUseSystemHealth = require('@/hooks/useSystemHealth').useSystemHealth
    mockUseSystemHealth.mockReturnValue({
      healthData: {
        status: 'healthy',
        metrics: {
          cpu: 45,
          memory: 67,
          responseTime: 120,
          errorRate: 1,
          activeUsers: 23,
          uptime: 86400
        },
        alerts: [],
        lastUpdated: new Date(),
        ready: true
      },
      loading: false,
      error: null,
      refresh: mockRefresh
    })

    render(<SystemHealthWidget />)
    
    const refreshButton = screen.getByRole('button')
    fireEvent.click(refreshButton)
    
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('should call onAlertClick when alert is clicked', () => {
    const mockOnAlertClick = jest.fn()
    const mockAlert = {
      id: 'test-alert',
      severity: 'high' as const,
      message: 'Test alert message',
      component: 'Test Component',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      acknowledged: false
    }

    const mockUseSystemHealth = require('@/hooks/useSystemHealth').useSystemHealth
    mockUseSystemHealth.mockReturnValue({
      healthData: {
        status: 'warning',
        metrics: {
          cpu: 45,
          memory: 67,
          responseTime: 120,
          errorRate: 1,
          activeUsers: 23,
          uptime: 86400
        },
        alerts: [mockAlert],
        lastUpdated: new Date(),
        ready: true
      },
      loading: false,
      error: null,
      refresh: jest.fn()
    })

    render(<SystemHealthWidget onAlertClick={mockOnAlertClick} />)
    
    const alertElement = screen.getByText('Test alert message').closest('div')
    fireEvent.click(alertElement!)
    
    expect(mockOnAlertClick).toHaveBeenCalledWith(mockAlert)
  })
})