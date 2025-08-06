import { render, screen } from '@testing-library/react'
import { Card } from '../Card'

describe('Card Component', () => {
  it('should render children content', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    )
    
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should apply default styling classes', () => {
    const { container } = render(
      <Card>
        <p>Content</p>
      </Card>
    )
    
    const card = container.firstChild
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'border-gray-200')
  })

  it('should apply custom className', () => {
    const { container } = render(
      <Card className="custom-card-class">
        <p>Content</p>
      </Card>
    )
    
    const card = container.firstChild
    expect(card).toHaveClass('custom-card-class')
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'border', 'border-gray-200')
  })

  it('should render with title when provided', () => {
    render(
      <Card title="Card Title">
        <p>Card content</p>
      </Card>
    )
    
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should render with actions when provided', () => {
    const actions = (
      <button type="button">Action Button</button>
    )
    
    render(
      <Card title="Card with Actions" actions={actions}>
        <p>Card content</p>
      </Card>
    )
    
    expect(screen.getByText('Card with Actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
  })

  it('should render without padding when noPadding is true', () => {
    const { container } = render(
      <Card noPadding>
        <p>No padding content</p>
      </Card>
    )
    
    const card = container.firstChild
    expect(card).not.toHaveClass('p-6')
  })

  it('should render with padding by default', () => {
    const { container } = render(
      <Card>
        <p>Padded content</p>
      </Card>
    )
    
    const card = container.firstChild
    expect(card).toHaveClass('p-6')
  })

  it('should be clickable when onClick is provided', () => {
    const onClick = jest.fn()
    
    render(
      <Card onClick={onClick}>
        <p>Clickable card</p>
      </Card>
    )
    
    const card = screen.getByText('Clickable card').closest('div')
    card?.click()
    
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should have hover styles when clickable', () => {
    const onClick = jest.fn()
    const { container } = render(
      <Card onClick={onClick}>
        <p>Clickable card</p>
      </Card>
    )
    
    const card = container.firstChild
    expect(card).toHaveClass('cursor-pointer', 'hover:shadow-md')
  })

  it('should not have hover styles when not clickable', () => {
    const { container } = render(
      <Card>
        <p>Non-clickable card</p>
      </Card>
    )
    
    const card = container.firstChild
    expect(card).not.toHaveClass('cursor-pointer', 'hover:shadow-md')
  })
})