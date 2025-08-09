'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from './AppLayout'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

const publicRoutes = ['/', '/login', '/register', '/client-portal/login']

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/client-portal')

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return

    // If on a protected route but not authenticated, redirect to login
    if (!isPublicRoute && !isAuthenticated) {
      router.push('/login')
      return
    }

    // If authenticated and on login page, redirect to dashboard
    if (isAuthenticated && pathname === '/login') {
      router.push('/dashboard')
      
    }
  }, [isAuthenticated, isLoading, pathname, router, isPublicRoute])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading Zetra Platform...</p>
        </div>
      </div>
    )
  }

  // For public routes or unauthenticated users, render children directly
  if (isPublicRoute || !isAuthenticated) {
    return <>{children}</>
  }

  // For authenticated users on protected routes, wrap in AppLayout
  return (
    <AppLayout currentPath={pathname}>
      {children}
    </AppLayout>
  )
}