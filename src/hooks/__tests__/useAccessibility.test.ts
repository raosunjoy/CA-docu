import { renderHook, act } from '@testing-library/react'
import { useAccessibility } from '../useAccessibility'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('useAccessibility', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
  })

  it('initializes with default preferences', () => {
    const { result } = renderHook(() => useAccessibility())
    
    expect(result.current.preferences).toEqual({
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium'
    })
  })

  it('detects reduced motion preference', () => {
    // Mock reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    const { result } = renderHook(() => useAccessibility())
    
    expect(result.current.preferences.reducedMotion).toBe(true)
  })

  it('handles keyboard navigation', () => {
    const { result } = renderHook(() => useAccessibility())
    const onEnter = jest.fn()
    const onEscape = jest.fn()

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })

    act(() => {
      result.current.handleKeyboardNavigation(enterEvent, onEnter, onEscape)
    })
    expect(onEnter).toHaveBeenCalled()

    act(() => {
      result.current.handleKeyboardNavigation(escapeEvent, onEnter, onEscape)
    })
    expect(onEscape).toHaveBeenCalled()
  })

  it('announces messages to screen readers', () => {
    const { result } = renderHook(() => useAccessibility())

    act(() => {
      result.current.announce('Test message')
    })

    const announcement = document.querySelector('[aria-live="polite"]')
    expect(announcement).toBeInTheDocument()
    expect(announcement).toHaveTextContent('Test message')
    expect(announcement).toHaveClass('sr-only')
  })

  it('creates skip links', () => {
    const { result } = renderHook(() => useAccessibility())

    act(() => {
      const skipLink = result.current.createSkipLink('main-content', 'Skip to main')
      document.body.appendChild(skipLink)
    })

    const skipLink = document.querySelector('a[href="#main-content"]')
    expect(skipLink).toBeInTheDocument()
    expect(skipLink).toHaveTextContent('Skip to main')
  })
})