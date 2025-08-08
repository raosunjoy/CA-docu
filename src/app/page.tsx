'use client'

import { useState, useEffect } from 'react'
import { LandingPage } from '@/components/landing/LandingPage'
import { SimpleDashboard } from '@/components/dashboard/SimpleDashboard'
import type { UserRole } from '@/types'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  organizationId: string
}

export default function Home(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      // Check if we're in the browser (client-side)
      if (typeof window === 'undefined') {
        return
      }

      const token = localStorage.getItem('token')
      if (!token) {
        return
      }

      // Try to validate token with server
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.success && userData.user) {
          setUser(userData.user)
        }
      } else {
        // Token invalid, remove it
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Authentication check failed:', error)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
    }
  }

  const handleAuthSuccess = () => {
    checkAuthentication()
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col justify-center items-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl mx-auto mb-4 animate-spin"></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-2">Zetra</h1>
          <p className="text-sm text-purple-600">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-purple-100 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg mr-3"></div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">Zetra</h1>
              <span className="ml-2 text-sm text-purple-600 font-medium">CA Platform</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-purple-600">{user.role}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.firstName.charAt(0)}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <SimpleDashboard
          organizationId={user.organizationId}
          userId={user.id}
          userRole={user.role}
          className="px-4 py-6 sm:px-0"
        />
      </main>
    </div>
  )
}