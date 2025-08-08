'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN' | 'ADMIN'
  organizationId: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, deviceId?: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
          
          // Verify token is still valid
          await verifyToken(storedToken)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        // Clear invalid auth data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Token verification failed')
      }

      const userData = await response.json()
      if (userData.success) {
        setUser(userData.data)
      } else {
        throw new Error('Invalid token')
      }
    } catch (error) {
      // Token is invalid, clear auth state
      setUser(null)
      setToken(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      throw error
    }
  }

  const login = async (email: string, password: string, deviceId = 'web') => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          deviceId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const { user: userData, token: userToken } = data.data
        
        setUser(userData)
        setToken(userToken)
        
        // Store in localStorage
        localStorage.setItem('token', userToken)
        localStorage.setItem('user', JSON.stringify(userData))
      } else {
        throw new Error(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // Optional: Call logout endpoint
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }).catch(console.error)
    }
  }

  const refreshToken = async () => {
    if (!token) {
      throw new Error('No token to refresh')
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        const { token: newToken } = data.data
        setToken(newToken)
        localStorage.setItem('token', newToken)
      } else {
        throw new Error(data.error || 'Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      logout() // Force logout on refresh failure
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}