import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { UserRole } from '@/types'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
})

describe('useAuth', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should initialize with loading state', () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle successful authentication check', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.ASSOCIATE,
      isActive: true,
      lastLoginAt: null,
      organization: {
        id: 'org-123',
        name: 'Test Org',
        subdomain: 'test'
      },
      permissions: ['read:tasks']
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockUser
      })
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.loading).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle login success', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // Initial auth check
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com'
            }
          }
        })
      })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let loginResult
    await act(async () => {
      loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    expect(loginResult).toEqual({ success: true })
    expect(result.current.user).toBeDefined()
  })

  it('should handle login failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // Initial auth check
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Invalid credentials' }
        })
      })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let loginResult
    await act(async () => {
      loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    })

    expect(loginResult).toEqual({ 
      success: false, 
      error: 'Invalid credentials' 
    })
    expect(result.current.error).toBe('Invalid credentials')
  })

  it('should handle register success', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // Initial auth check
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'new@example.com'
            }
          }
        })
      })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let registerResult
    await act(async () => {
      registerResult = await result.current.register({
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        organizationId: 'org-123',
        role: UserRole.ASSOCIATE
      })
    })

    expect(registerResult).toEqual({ success: true })
    expect(result.current.user).toBeDefined()
  })

  it('should handle logout', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'user-123' }
        })
      }) // Initial auth check
      .mockResolvedValueOnce({ ok: true }) // Logout

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let logoutResult
    await act(async () => {
      logoutResult = await result.current.logout()
    })

    expect(logoutResult).toEqual({ success: true })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle network errors', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // Initial auth check
      .mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    let loginResult
    await act(async () => {
      loginResult = await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    expect(loginResult).toEqual({ 
      success: false, 
      error: 'Network error occurred' 
    })
    expect(result.current.error).toBe('Network error occurred')
  })

  it('should clear errors', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false }) // Initial auth check
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { message: 'Some error' }
        })
      })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    })

    expect(result.current.error).toBe('Some error')

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })
})