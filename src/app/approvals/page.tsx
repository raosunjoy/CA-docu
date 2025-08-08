'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/common/Card'
import { ApprovalWorkflow } from '@/components/approval/ApprovalWorkflow'
import { ApprovalRequests } from '@/components/approval/ApprovalRequests'
import { ApprovalTemplates } from '@/components/approval/ApprovalTemplates'
import { ApprovalDelegates } from '@/components/approval/ApprovalDelegates'

type ViewMode = 'requests' | 'workflow' | 'templates' | 'delegates'

interface ApprovalStats {
  pendingRequests: number
  myRequests: number
  delegatedRequests: number
  completedToday: number
}

export default function ApprovalsMainPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewMode>('requests')
  const [stats, setStats] = useState<ApprovalStats>({
    pendingRequests: 0,
    myRequests: 0,
    delegatedRequests: 0,
    completedToday: 0
  })

  useEffect(() => {
    if (user) {
      loadApprovalStats()
    }
  }, [user])

  const loadApprovalStats = async () => {
    try {
      // Simulate loading approval data
      setTimeout(() => {
        setStats({
          pendingRequests: 8,
          myRequests: 3,
          delegatedRequests: 2,
          completedToday: 5
        })
        setLoading(false)
      }, 800)
    } catch (error) {
      console.error('Failed to load approval stats:', error)
      setLoading(false)
    }
  }

  // Check if user has approval permissions
  const hasApprovalAccess = user?.role && ['PARTNER', 'MANAGER'].includes(user.role)

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access approval workflows</p>
        </div>
      </div>
    )
  }

  if (!hasApprovalAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-4">
            Approval workflows are only available to Partners and Managers.
          </p>
          <Badge variant="secondary" className="mb-4">
            Current Role: {user.role}
          </Badge>
          <p className="text-sm text-gray-500">
            Contact your administrator if you need access to approval features.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading approval workflows...</p>
        </div>
      </div>
    )
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'requests':
        return <ApprovalRequests />
      case 'workflow':
        return <ApprovalWorkflow />
      case 'templates':
        return <ApprovalTemplates />
      case 'delegates':
        return <ApprovalDelegates />
      default:
        return <ApprovalRequests />
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
            <p className="text-gray-600 mt-1">
              Review and manage approval requests across your organization
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{stats.pendingRequests}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{stats.myRequests}</div>
              <div className="text-xs text-gray-500">My Requests</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{stats.delegatedRequests}</div>
              <div className="text-xs text-gray-500">Delegated</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.completedToday}</div>
              <div className="text-xs text-gray-500">Completed Today</div>
            </div>
          </div>
        </div>

        {/* Urgent Requests Alert */}
        {stats.pendingRequests > 5 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-orange-900">
                  {stats.pendingRequests} approval requests require your attention
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentView('requests')}>
                Review Now
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="px-6 py-0">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Requests
              {stats.pendingRequests > 0 && (
                <Badge variant="destructive" size="sm" className="ml-2">
                  {stats.pendingRequests}
                </Badge>
              )}
            </button>
            
            <button
              onClick={() => setCurrentView('workflow')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'workflow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Workflows
            </button>
            
            <button
              onClick={() => setCurrentView('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Templates
            </button>
            
            <button
              onClick={() => setCurrentView('delegates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'delegates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Delegates
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          {renderCurrentView()}
        </div>
      </div>
    </div>
  )
}