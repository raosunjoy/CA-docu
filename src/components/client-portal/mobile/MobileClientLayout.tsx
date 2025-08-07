'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  HomeIcon, 
  DocumentTextIcon, 
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  HeartIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { useClientAuth } from '@/hooks/useClientAuth'
import PWAInstallPrompt from './PWAInstallPrompt'

interface MobileClientLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/client-portal', icon: HomeIcon },
  { name: 'Engagements', href: '/client-portal/engagements', icon: ClipboardDocumentListIcon },
  { name: 'Documents', href: '/client-portal/documents', icon: DocumentTextIcon },
  { name: 'Camera Upload', href: '/client-portal/camera-upload', icon: CameraIcon },
  { name: 'Messages', href: '/client-portal/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Invoices', href: '/client-portal/invoices', icon: CreditCardIcon },
  { name: 'Feedback', href: '/client-portal/feedback', icon: HeartIcon },
]

export default function MobileClientLayout({ children }: MobileClientLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const { client, logout, isLoading } = useClientAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client-portal/login')
    }
  }, [client, isLoading, router])

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    // Fetch notification count
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem('clientToken')
        if (!token) return

        const response = await fetch('/api/client-portal/notifications?unreadOnly=true', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setNotificationCount(data.data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error)
      }
    }

    if (client) {
      fetchNotificationCount()
      // Set up periodic refresh
      const interval = setInterval(fetchNotificationCount, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [client])

  const handleLogout = () => {
    logout()
    router.push('/client-portal/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                You're offline. Some features may be limited.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">CP</span>
                </div>
                <span className="ml-2 text-lg font-semibold text-gray-900">Client Portal</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            {/* User Info */}
            <div className="px-4 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{client.name}</p>
                  <p className="text-xs text-gray-500">{client.companyName || client.email}</p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-3 text-base font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            
            <div className="px-4 py-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-3 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
              >
                <ArrowRightOnRectangleIcon className="mr-4 h-6 w-6" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top navigation bar */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-600"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="ml-4 flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CP</span>
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">Client Portal</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Link
              href="/client-portal/notifications"
              className="relative p-2 text-gray-400 hover:text-gray-500"
            >
              <BellIcon className="h-6 w-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>

            {/* User avatar */}
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="pb-20">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom navigation for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {navigation.slice(0, 5).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 text-xs ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className="h-6 w-6 mb-1" />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}