import { render, screen } from '@testing-library/react'
import { Alert } from '../Alert'

describe('Alert Component', () => {
  it('should render success alert with message', () => {
    render(<Alert type="success" message="Success message" />)
    
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Success message')
    expect(alert).toHaveClass('bg-green-50', 'text-green-800', 'border-green-200')
  })

  it('should render error alert with message', () => {
    render(<Alert type="error" message="Error message" />)
    
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Error message')
    expect(alert).toHaveClass('bg-red-50', 'text-red-800', 'border-red-200')
  })

  it('should render warning alert with message', () => {
    render(<Alert type="warning" message="Warning message" />)
    
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Warning message')
    expect(alert).toHaveClass('bg-yellow-50', 'text-yellow-800', 'border-yellow-200')
  })

  it('should render info alert with message', () => {
    render(<Alert type="info" message="Info message" />)
    
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Info message')
    expect(alert).toHaveClass('bg-blue-50', 'text-blue-800', 'border-blue-200')
  })

  it('should render with custom className', () => {
    render(<Alert type="success" message="Test" className="custom-class" />)
    
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-class')
  })

  it('should render with title when provided', () => {
    render(<Alert type="error" title="Error Title" message="Error message" />)
    
    expect(screen.getByText('Error Title')).toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('should be dismissible when onDismiss is provided', () => {
    const onDismiss = jest.fn()
    render(<Alert type="info" message="Dismissible alert" onDismiss={onDismiss} />)
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i })
    expect(dismissButton).toBeInTheDocument()
    
    dismissButton.click()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should not show dismiss button when onDismiss is not provided', () => {
    render(<Alert type="info" message="Non-dismissible alert" />)
    
    const dismissButton = screen.queryByRole('button', { name: /dismiss/i })
    expect(dismissButton).not.toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<Alert type="error" message="Accessible alert" />)
    
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('role', 'alert')
  })
})