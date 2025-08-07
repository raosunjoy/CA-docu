'use client'

import { useState, useEffect, useCallback } from 'react'

interface Client {
  id: string
  name: string
  email: string
  companyName?: string
  phone?: string
  gstin?: string
  pan?: string
  address?: any
  organization: {
    id: string
    name: string
    subdomain: string
  }
  preferences: any
  lastLoginAt?: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface UseClientAuthReturn {
  client: Client | null
  isLoading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  refreshClient: () => Promise<void>
}

export function useClientAuth(): UseClientAuthReturn {
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing token and validate it
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem('clientToken')
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/client-portal/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClient(data.data)
        setError(null)
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('clientToken')
        setClient(null)
      }
    } catch (err) {
      console.error('Token validation error:', err)
      localStorage.removeItem('clientToken')
      setClient(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/client-portal/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        localStorage.setItem('clientToken', data.data.token)
        setClient(data.data.client)
        return true
      } else {
        setError(data.error || 'Login failed')
        return false
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Network error occurred')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('clientToken')
    setClient(null)
    setError(null)
  }

  const refreshClient = async () => {
    await validateToken()
  }

  return {
    client,
    isLoading,
    error,
    login,
    logout,
    refreshClient
  }
}