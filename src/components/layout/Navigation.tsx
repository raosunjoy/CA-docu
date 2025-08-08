'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  badge?: string
  roles?: string[]
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v0" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    href: '/tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    badge: '12',
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/documents',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    href: '/chat',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    badge: '3',
  },
  {
    id: 'email',
    label: 'Email',
    href: '/email',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    badge: '5',
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    href: '/ai-assistant',
    icon: (
      <div className="w-5 h-5 bg-gradient-to-r from-purple-600 to-blue-600 rounded flex items-center justify-center">
        <span className="text-white text-xs">🤖</span>
      </div>
    ),
    badge: 'NEW',
  },
  {
    id: 'time-tracking',
    label: 'Time Tracking',
    href: '/time-tracking',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'approvals',
    label: 'Approvals',
    href: '/approvals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    roles: ['PARTNER', 'MANAGER'],
    badge: '2',
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    roles: ['PARTNER', 'MANAGER'],
  },
  {
    id: 'admin',
    label: 'Admin',
    href: '/admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    roles: ['PARTNER', 'ADMIN'],
  },
]

interface NavigationProps {
  currentPath?: string
  onNavigate?: (path: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPath = '/dashboard',
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  if (!user) return null

  const filteredItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  )

  const handleNavigation = (href: string) => {
    if (onNavigate) {
      onNavigate(href)
    } else {
      // Use Next.js routing
      window.location.href = href
    }
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className={cn('flex items-center', collapsed && 'justify-center')}>
          <div className="w-8 h-8 bg-gradient-purple rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-white">Z</span>
          </div>
          {!collapsed && (
            <span className="ml-3 text-xl font-semibold text-gray-900">Zetra</span>
          )}
        </div>
        
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(collapsed && 'hidden')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.href)}
            className={cn(
              'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20',
              currentPath === item.href
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'text-gray-700 hover:text-gray-900',
              collapsed && 'justify-center'
            )}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="ml-3 flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant={currentPath === item.href ? 'secondary' : 'default'}
                    size="sm"
                  >
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={cn(
              'w-full flex items-center px-3 py-2 text-sm rounded-lg',
              'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20',
              collapsed && 'justify-center'
            )}
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!collapsed && (
              <div className="ml-3 flex-1 text-left">
                <div className="font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500">{user.role}</div>
              </div>
            )}
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && !collapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
              <button
                onClick={() => window.location.href = '/profile'}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Profile Settings
              </button>
              <button
                onClick={() => window.location.href = '/preferences'}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Preferences
              </button>
              <hr className="my-1" />
              <button
                onClick={logout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}