import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RollbackConfirmationModal, RollbackImpact, RollbackValidation } from '../RollbackConfirmationModal'

const mockImpact: RollbackImpact = {
  affectedServices: ['api-gateway', 'user-service'],
  estimatedDowntime: 120,
  dataLossRisk: 'low',
  userImpact: 'moderate',
  rollbackComplexity: 'simple',
  dependencies: ['database-migration'],
  warnings: ['This will revert recent changes']
}

const mockValidation: RollbackValidation = {
  isValid: true,
  checks: [
    {
      name: 'Database Compatibility',
      status: 'passed',
      message: 'Database schema is compatible'
    },
    {
      name: 'Service Dependencies',
      status: 'warning',
      message: 'Some dependencies may be affected'
    }
  ],
  canProceed: true,
  requiresConfirmation: true
}

describe('RollbackConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    deploymentId: 'deploy-123',
    deploymentVersion: 'v1.2.3',
    targetVersion: 'v1.2.2',
    impact: mockImpact
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render confirmation step initially', () => {
    render(<RollbackConfirmationModal {...defaultProps} />)
    
    expect(screen.getByText('Confirm Rollback')).toBeInTheDocument()
    expect(screen.getByText(/You are about to rollback deployment/)).toBeInTheDocument()
    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    expect(screen.getByText('v1.2.2')).toBeInTheDocument()
  })

  it('should display impact assessment correctly', () => {
    render(<RollbackConfirmationModal {...defaultProps} />)
    
    expect(screen.getByText('Impact Assessment')).toBeInTheDocument()
    expect(screen.getByText('low')).toBeInTheDocument() // data loss risk
    expect(screen.getByText('moderate')).toBeInTheDocument() // user impact
    expect(screen.getByText('2m 0s')).toBeInTheDocument() // estimated downtime
    expect(screen.getByText('simple')).toBeInTheDocument() // complexity
  })

  it('should show affected services and dependencies', () => {
    render(<RollbackConfirmationModal {...defaultProps} />)
    
    expect(screen.getByText('api-gateway')).toBeInTheDocument()
    expect(screen.getByText('user-service')).toBeInTheDocument()
    expect(screen.getByText('database-migration')).toBeInTheDocument()
  })

  it('should display warnings', () => {
    render(<RollbackConfirmationModal {...defaultProps} />)
    
    expect(screen.getByText('Warnings')).toBeInTheDocument()
    expect(screen.getByText(/This will revert recent changes/)).toBeInTheDocument()
  })

  it('should require acknowledgment checkbox to be checked', () => {
    render(<RollbackConfirmationModal {...defaultProps} />)
    
    const proceedButton = screen.getByRole('button', { name: /proceed with rollback/i })
    expect(proceedButton).toBeDisabled()
    
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    
    // Still disabled because confirmation text is not entered
    expect(proceedButton).toBeDisabled()
  })

  it('should require correct confirmation text', () => {
    render(<RollbackConfirmationModal {...defaultProps} />)
    
    const checkbox = screen.getByRole('checkbox')
    const textInput = screen.getByPlaceholderText('Type confirmation text...')
    const proceedButton = screen.getByRole('button', { name: /proceed with rollback/i })
    
    fireEvent.click(checkbox)
    fireEvent.change(textInput, { target: { value: 'wrong text' } })
    expect(proceedButton).toBeDisabled()
    
    fireEvent.change(textInput, { target: { value: 'rollback v1.2.3' } })
    expect(proceedButton).not.toBeDisabled()
  })

  it('should show validation step when validation is provided', () => {
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        validation={mockValidation}
      />
    )
    
    expect(screen.getByText('Pre-rollback Validation')).toBeInTheDocument()
    expect(screen.getByText('Database Compatibility')).toBeInTheDocument()
    expect(screen.getByText('Service Dependencies')).toBeInTheDocument()
  })

  it('should show validation check statuses correctly', () => {
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        validation={mockValidation}
      />
    )
    
    expect(screen.getByText('Database schema is compatible')).toBeInTheDocument()
    expect(screen.getByText('Some dependencies may be affected')).toBeInTheDocument()
  })

  it('should prevent rollback when validation fails', () => {
    const failedValidation: RollbackValidation = {
      ...mockValidation,
      canProceed: false,
      checks: [
        {
          name: 'Database Compatibility',
          status: 'failed',
          message: 'Schema incompatibility detected'
        }
      ]
    }
    
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        validation={failedValidation}
      />
    )
    
    expect(screen.getByText('Rollback cannot proceed due to failed validation checks')).toBeInTheDocument()
    expect(screen.queryByText('Start Rollback')).not.toBeInTheDocument()
  })

  it('should call onConfirm when proceed button is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined)
    
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        onConfirm={onConfirm}
      />
    )
    
    const checkbox = screen.getByRole('checkbox')
    const textInput = screen.getByPlaceholderText('Type confirmation text...')
    const proceedButton = screen.getByRole('button', { name: /proceed with rollback/i })
    
    fireEvent.click(checkbox)
    fireEvent.change(textInput, { target: { value: 'rollback v1.2.3' } })
    fireEvent.click(proceedButton)
    
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled()
    })
  })

  it('should call onClose when cancel button is clicked', () => {
    const onClose = jest.fn()
    
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        onClose={onClose}
      />
    )
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('should show progress step when isRollingBack is true', () => {
    const progress = [
      {
        stage: 'Preparing rollback environment',
        status: 'completed' as const,
        progress: 100,
        message: 'Environment prepared successfully',
        logs: []
      },
      {
        stage: 'Stopping affected services',
        status: 'running' as const,
        progress: 50,
        message: 'Stopping services...',
        logs: []
      }
    ]
    
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        isRollingBack={true}
        progress={progress}
      />
    )
    
    expect(screen.getByText('Rollback in Progress')).toBeInTheDocument()
    expect(screen.getByText('Preparing rollback environment')).toBeInTheDocument()
    expect(screen.getByText('Stopping affected services')).toBeInTheDocument()
    expect(screen.getByText('Environment prepared successfully')).toBeInTheDocument()
    expect(screen.getByText('Stopping services...')).toBeInTheDocument()
  })

  it('should not show cancel button during progress step', () => {
    const progress = [
      {
        stage: 'Preparing rollback environment',
        status: 'running' as const,
        progress: 50,
        message: 'Preparing...',
        logs: []
      }
    ]
    
    render(
      <RollbackConfirmationModal 
        {...defaultProps} 
        isRollingBack={true}
        progress={progress}
      />
    )
    
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })
})