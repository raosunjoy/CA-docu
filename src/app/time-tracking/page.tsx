'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { TimeTracker } from '@/components/time-tracking/TimeTracker'
import { TimeBudgets } from '@/components/time-tracking/TimeBudgets'
import { TimeEntriesList } from '@/components/time-tracking/TimeEntriesList'
import { TimeTrackingSummary } from '@/components/time-tracking/TimeTrackingSummary'

type ViewMode = 'tracker' | 'entries' | 'budgets' | 'summary'

interface TimeStats {
  todayHours: number
  weekHours: number
  monthHours: number
  activeTimer: boolean
  currentTask?: string
}

export default function TimeTrackingMainPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<ViewMode>('tracker')
  const [timeStats, setTimeStats] = useState<TimeStats>({
    todayHours: 0,
    weekHours: 0,
    monthHours: 0,
    activeTimer: false
  })

  useEffect(() => {
    if (user) {
      loadTimeStats()
    }
  }, [user])

  const loadTimeStats = async () => {
    try {
      // Simulate loading time tracking data
      setTimeout(() => {
        setTimeStats({
          todayHours: 6.5,
          weekHours: 32.25,
          monthHours: 156.75,
          activeTimer: false,
          currentTask: 'GST Return Filing - ABC Corp'
        })
        setLoading(false)
      }, 800)
    } catch (error) {
      console.error('Failed to load time stats:', error)
      setLoading(false)
    }
  }

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
          <p className="text-gray-600">Please log in to access time tracking</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading time tracking data...</p>
        </div>
      </div>
    )
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'tracker':
        return <TimeTracker />
      case 'entries':
        return <TimeEntriesList />
      case 'budgets':
        return <TimeBudgets />
      case 'summary':
        return <TimeTrackingSummary />
      default:
        return <TimeTracker />
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time Tracking</h1>
            <p className="text-gray-600 mt-1">
              Track your time and monitor productivity
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{timeStats.todayHours}h</div>
              <div className="text-xs text-gray-500">Today</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{timeStats.weekHours}h</div>
              <div className="text-xs text-gray-500">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{timeStats.monthHours}h</div>
              <div className="text-xs text-gray-500">This Month</div>
            </div>
            
            {timeStats.activeTimer && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-800">Timer Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Active Task Banner */}
        {timeStats.currentTask && timeStats.activeTimer && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-900">
                  Currently tracking: {timeStats.currentTask}
                </span>
              </div>
              <Button variant="outline" size="sm">
                Stop Timer
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
              onClick={() => setCurrentView('tracker')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'tracker'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timer
            </button>
            
            <button
              onClick={() => setCurrentView('entries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'entries'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Time Entries
            </button>
            
            <button
              onClick={() => setCurrentView('budgets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'budgets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Budgets
            </button>
            
            <button
              onClick={() => setCurrentView('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                currentView === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reports
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