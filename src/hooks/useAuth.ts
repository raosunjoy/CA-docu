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


// Helper functions extracted from useAuth hook
const fetchAuthStatus = async (): Promise<{ user: User | null; error: string | null }> => {
  try {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      return { user: data.data, error: null }
    } else {
      return { user: null, error: null }
    }
  } catch {
    return { user: null, error: 'Failed to check authentication status' }
  }
}

const performLogin = async (credentials: LoginCredentials): Promise<{ success: boolean; user?: User; error?: string }> => {
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
      return { success: true, user: data.data.user }
    } else {
      return { 
        success: false, 
        error: data.error?.message || 'Login failed' 
      }
    }
  } catch {
    return { success: false, error: 'Network error occurred' }
  }
}

const performRegister = async (userData: RegisterData): Promise<{ success: boolean; user?: User; error?: string }> => {
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
      return { success: true, user: data.data.user }
    } else {
      return { 
        success: false, 
        error: data.error?.message || 'Registration failed' 
      }
    }
  } catch {
    return { success: false, error: 'Network error occurred' }
  }
}

const performLogout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })

    if (response.ok) {
      return { success: true }
    } else {
      return { success: false, error: 'Logout failed' }
    }
  } catch {
    return { success: false, error: 'Network error occurred' }
  }
}

// State management helpers
const setLoadingState = (setAuthState: React.Dispatch<React.SetStateAction<AuthState>>, loading: boolean) => {
  setAuthState(prev => ({ ...prev, loading, error: null }))
}

const setAuthSuccess = (setAuthState: React.Dispatch<React.SetStateAction<AuthState>>, user: User) => {
  setAuthState({
    user,
    loading: false,
    error: null
  })
}

const setAuthError = (setAuthState: React.Dispatch<React.SetStateAction<AuthState>>, error: string) => {
  setAuthState(prev => ({
    ...prev,
    loading: false,
    error
  }))
}

const clearAuthState = (setAuthState: React.Dispatch<React.SetStateAction<AuthState>>) => {
  setAuthState({
    user: null,
    loading: false,
    error: null
  })
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  })

  const checkAuthStatus = async () => {
    const { user, error } = await fetchAuthStatus()
    setAuthState({
      user,
      loading: false,
      error
    })
  }

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setLoadingState(setAuthState, true)

    const result = await performLogin(credentials)
    
    if (result.success && result.user) {
      setAuthSuccess(setAuthState, result.user)
      return { success: true }
    } else {
      setAuthError(setAuthState, result.error || 'Login failed')
      return { success: false, ...(result.error ? { error: result.error } : {}) }
    }
  }

  const register = async (userData: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setLoadingState(setAuthState, true)

    const result = await performRegister(userData)
    
    if (result.success && result.user) {
      setAuthSuccess(setAuthState, result.user)
      return { success: true }
    } else {
      setAuthError(setAuthState, result.error || 'Registration failed')
      return { success: false, ...(result.error ? { error: result.error } : {}) }
    }
  }

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    const result = await performLogout()
    
    if (result.success) {
      clearAuthState(setAuthState)
    }
    
    return result
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