import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toHaveClass('w-8', 'h-8', 'animate-spin')
  })

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />)
    
    const spinner = screen.getByRole('generic')
    expect(spinner).toHaveClass('w-12', 'h-12')
  })

  it('renders with text when provided', () => {
    render(<LoadingSpinner text="Loading data..." />)
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />)
    
    const container = screen.getByRole('generic').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    expect(screen.getByRole('generic')).toHaveClass('w-4', 'h-4')

    rerender(<LoadingSpinner size="md" />)
    expect(screen.getByRole('generic')).toHaveClass('w-8', 'h-8')

    rerender(<LoadingSpinner size="lg" />)
    expect(screen.getByRole('generic')).toHaveClass('w-12', 'h-12')

    rerender(<LoadingSpinner size="xl" />)
    expect(screen.getByRole('generic')).toHaveClass('w-16', 'h-16')
  })
})