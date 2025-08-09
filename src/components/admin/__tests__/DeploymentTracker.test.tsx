import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeploymentTracker } from '../DeploymentTracker'

// Mock the useDeploymentTracker hook
jest.mock('@/hooks/useDeploymentTracker', () => ({
  useDeploymentTracker: jest.fn(() => ({
    currentDeployment: {
      id: 'deploy-123',
      version: 'v1.2.3',
      status: 'in_progress',
      progress: 75,
      startTime: new Date('2024-01-01T12:00:00Z'),
      stages: [
        { name: 'Build', status: 'completed', duration: 120 },
        { name: 'Test', status: 'completed', duration: 90 },
        { name: 'Deploy', status: 'running' },
        { name: 'Health Check', status: 'pending' }
      ],
      rollbackAvailable: false,
      environment: 'production',
      deployedBy: 'admin@zetra.com',
      commitHash: 'abc123f',
      commitMessage: 'feat: add deployment tracking'
    },
    deploymentHistory: {
      deployments: [
        {
          id: 'deploy-122',
          version: 'v1.2.2',
          status: 'success',
          progress: 100,
          startTime: new Date('2024-01-01T11:00:00Z'),
          endTime: new Date('2024-01-01T11:05:00Z'),
          stages: [],
          rollbackAvailable: true,
          environment: 'production',
          deployedBy: 'admin@zetra.com'
        }
      ],
      totalCount: 10,
      successRate: 90,
      averageDuration: 300
    },
    loading: false,
    error: null,
    refresh: jest.fn(),
    triggerRollback: jest.fn()
  }))
}))

describe('DeploymentTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render current deployment information', async () => {
    render(<DeploymentTracker />)
    
    expect(screen.getByText('Current Deployment')).toBeInTheDocument()
    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    expect(screen.getAllByText('production')).toHaveLength(2) // Appears in current and history
    expect(screen.getByText('in progress')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('should display deployment stages with correct status', () => {
    render(<DeploymentTracker />)
    
    expect(screen.getByText('Build')).toBeInTheDocument()
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('Deploy')).toBeInTheDocument()
    expect(screen.getByText('Health Check')).toBeInTheDocument()
    
    // Check for "In progress..." text for running stage
    expect(screen.getByText('In progress...')).toBeInTheDocument()
  })

  it('should show deployment history', () => {
    render(<DeploymentTracker showHistory={true} />)
    
    expect(screen.getByText('Deployment History')).toBeInTheDocument()
    expect(screen.getByText('Success Rate: 90%')).toBeInTheDocument()
    expect(screen.getByText('Avg Duration: 5m 0s')).toBeInTheDocument()
    expect(screen.getByText('v1.2.2')).toBeInTheDocument()
  })

  it('should hide deployment history when showHistory is false', () => {
    render(<DeploymentTracker showHistory={false} />)
    
    expect(screen.queryByText('Deployment History')).not.toBeInTheDocument()
  })

  it('should call refresh when refresh button is clicked', () => {
    const mockRefresh = jest.fn()
    const mockUseDeploymentTracker = require('@/hooks/useDeploymentTracker').useDeploymentTracker
    mockUseDeploymentTracker.mockReturnValue({
      currentDeployment: null,
      deploymentHistory: { deployments: [], totalCount: 0, successRate: 0, averageDuration: 0 },
      loading: false,
      error: null,
      refresh: mockRefresh,
      triggerRollback: jest.fn()
    })

    render(<DeploymentTracker />)
    
    const refreshButton = screen.getByRole('button')
    fireEvent.click(refreshButton)
    
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('should display no active deployments message when no current deployment', () => {
    const mockUseDeploymentTracker = require('@/hooks/useDeploymentTracker').useDeploymentTracker
    mockUseDeploymentTracker.mockReturnValue({
      currentDeployment: null,
      deploymentHistory: { deployments: [], totalCount: 0, successRate: 0, averageDuration: 0 },
      loading: false,
      error: null,
      refresh: jest.fn(),
      triggerRollback: jest.fn()
    })

    render(<DeploymentTracker />)
    
    expect(screen.getByText('No active deployments')).toBeInTheDocument()
  })

  it('should handle error state correctly', () => {
    const mockUseDeploymentTracker = require('@/hooks/useDeploymentTracker').useDeploymentTracker
    mockUseDeploymentTracker.mockReturnValue({
      currentDeployment: null,
      deploymentHistory: { deployments: [], totalCount: 0, successRate: 0, averageDuration: 0 },
      loading: false,
      error: 'Failed to fetch deployment data',
      refresh: jest.fn(),
      triggerRollback: jest.fn()
    })

    render(<DeploymentTracker />)
    
    expect(screen.getByText('Failed to load deployment data')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch deployment data')).toBeInTheDocument()
  })

  it('should show rollback button when deployment is rollback available', () => {
    const mockUseDeploymentTracker = require('@/hooks/useDeploymentTracker').useDeploymentTracker
    mockUseDeploymentTracker.mockReturnValue({
      currentDeployment: {
        id: 'deploy-123',
        version: 'v1.2.3',
        status: 'success',
        progress: 100,
        startTime: new Date(),
        stages: [],
        rollbackAvailable: true,
        environment: 'production',
        deployedBy: 'admin@zetra.com'
      },
      deploymentHistory: { deployments: [], totalCount: 0, successRate: 0, averageDuration: 0 },
      loading: false,
      error: null,
      refresh: jest.fn(),
      triggerRollback: jest.fn()
    })

    render(<DeploymentTracker />)
    
    expect(screen.getByText('Rollback')).toBeInTheDocument()
  })

  it('should call onRollbackRequest when rollback button is clicked', () => {
    const mockOnRollbackRequest = jest.fn()
    const mockUseDeploymentTracker = require('@/hooks/useDeploymentTracker').useDeploymentTracker
    mockUseDeploymentTracker.mockReturnValue({
      currentDeployment: {
        id: 'deploy-123',
        version: 'v1.2.3',
        status: 'success',
        progress: 100,
        startTime: new Date(),
        stages: [],
        rollbackAvailable: true,
        environment: 'production',
        deployedBy: 'admin@zetra.com'
      },
      deploymentHistory: { deployments: [], totalCount: 0, successRate: 0, averageDuration: 0 },
      loading: false,
      error: null,
      refresh: jest.fn(),
      triggerRollback: jest.fn()
    })

    render(<DeploymentTracker onRollbackRequest={mockOnRollbackRequest} />)
    
    const rollbackButton = screen.getByText('Rollback')
    fireEvent.click(rollbackButton)
    
    expect(mockOnRollbackRequest).toHaveBeenCalledWith('deploy-123')
  })
})