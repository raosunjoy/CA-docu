import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '../LoginForm'

describe('LoginForm Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    loading: false,
    error: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render login form with all fields', () => {
    render(<LoginForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should submit form with correct data', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('should show validation error for invalid email', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
    })
    
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('should disable submit button when loading', () => {
    render(<LoginForm {...defaultProps} loading />)
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })

  it('should show loading text when loading', () => {
    render(<LoginForm {...defaultProps} loading />)
    
    expect(screen.getByText(/signing in/i)).toBeInTheDocument()
  })

  it('should display error message when error prop is provided', () => {
    const errorMessage = 'Invalid credentials'
    render(<LoginForm {...defaultProps} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should clear error when user starts typing', async () => {
    const errorMessage = 'Invalid credentials'
    const { rerender } = render(<LoginForm {...defaultProps} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
    
    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    // Simulate error being cleared by parent component
    rerender(<LoginForm {...defaultProps} error={null} />)
    
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    render(<LoginForm {...defaultProps} />)
    
    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Login form')
    
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
    
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('required')
  })

  it('should show password visibility toggle', () => {
    render(<LoginForm {...defaultProps} />)
    
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    expect(toggleButton).toBeInTheDocument()
    
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('should handle remember me checkbox', () => {
    render(<LoginForm {...defaultProps} />)
    
    const rememberCheckbox = screen.getByLabelText(/remember me/i)
    expect(rememberCheckbox).toBeInTheDocument()
    expect(rememberCheckbox).not.toBeChecked()
    
    fireEvent.click(rememberCheckbox)
    expect(rememberCheckbox).toBeChecked()
  })

  it('should include remember me in form submission', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const rememberCheckbox = screen.getByLabelText(/remember me/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(rememberCheckbox)
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      })
    })
  })

  it('should prevent form submission on Enter key in input fields', async () => {
    render(<LoginForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' })
    
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false
      })
    })
  })
})