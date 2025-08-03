import { render, screen } from '@testing-library/react'
import Home from '../page'

describe('Home Page', () => {
  it('renders the welcome message', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Welcome to Zetra')
  })

  it('renders the description', () => {
    render(<Home />)
    
    const description = screen.getByText('Unified Productivity Platform for Indian CA Firms')
    expect(description).toBeInTheDocument()
  })
})