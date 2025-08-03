import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../Input'

describe('Input', () => {
  it('should render with default props', () => {
    render(<Input />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('border-gray-300')
  })

  it('should render with label', () => {
    render(<Input label="Test Label" />)
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('should show error state', () => {
    render(<Input error="Error message" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-300')
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should show helper text when no error', () => {
    render(<Input helperText="Helper text" />)
    
    expect(screen.getByText('Helper text')).toBeInTheDocument()
    expect(screen.getByText('Helper text')).toHaveClass('text-gray-500')
  })

  it('should prioritize error over helper text', () => {
    render(<Input error="Error message" helperText="Helper text" />)
    
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
  })

  it('should handle value changes', () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test value' } })
    
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'test value' })
    }))
  })

  it('should apply custom className', () => {
    render(<Input className="custom-class" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })

  it('should generate unique IDs when not provided', () => {
    render(
      <div>
        <Input label="First" />
        <Input label="Second" />
      </div>
    )
    
    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0].id).not.toBe(inputs[1].id)
    expect(inputs[0].id).toMatch(/^input-/)
    expect(inputs[1].id).toMatch(/^input-/)
  })

  it('should use provided ID', () => {
    render(<Input id="custom-id" label="Test" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('id', 'custom-id')
    expect(screen.getByLabelText('Test')).toHaveAttribute('id', 'custom-id')
  })

  it('should forward ref correctly', () => {
    const ref = jest.fn()
    render(<Input ref={ref} />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('should support different input types', () => {
    render(<Input type="password" />)
    
    const input = screen.getByDisplayValue('')
    expect(input).toHaveAttribute('type', 'password')
  })
})