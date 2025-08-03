import { useState, useEffect } from 'react'
import { UserRole } from '@/types'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  lastLoginAt: string | null
  organization: {
    id: string
    name: string
    subdomain: string
  }
  permissions: string[]
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
  deviceId?: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationId: string
  role: UserRole
  deviceId?: string
}


export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAuthState({
          user: data.data,
          loading: false,
          error: null
        })
      } else {
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
      }
    } catch {
      setAuthState({
        user: null,
        loading: false,
        error: 'Failed to check authentication status'
      })
    }
  }

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAuthState({
          user: data.data.user,
          loading: false,
          error: null
        })
        return { success: true }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error?.message || 'Login failed'
        }))
        return { 
          success: false, 
          error: data.error?.message || 'Login failed' 
        }
      }
    } catch {
      const errorMessage = 'Network error occurred'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAuthState({
          user: data.data.user,
          loading: false,
          error: null
        })
        return { success: true }
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: data.error?.message || 'Registration failed'
        }))
        return { 
          success: false, 
          error: data.error?.message || 'Registration failed' 
        }
      }
    } catch {
      const errorMessage = 'Network error occurred'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }))
      return { success: false, error: errorMessage }
    }
  }

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        setAuthState({
          user: null,
          loading: false,
          error: null
        })
        return { success: true }
      } else {
        return { success: false, error: 'Logout failed' }
      }
    } catch {
      return { success: false, error: 'Network error occurred' }
    }
  }

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }))
  }

  return {
    ...authState,
    login,
    register,
    logout,
    clearError,
    isAuthenticated: !!authState.user
  }
}