'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/common/Card'
import { ReportingInterface } from '@/components/dashboard/ReportingInterface'
import { AnalyticsDashboard } from '@/components/ai/AnalyticsDashboard'

type ReportType = 'analytics' | 'compliance' | 'financial' | 'productivity' | 'custom'

interface ReportStats {
  totalReports: number
  scheduledReports: number
  recentReports: number
  favoriteReports: number
}

const reportCategories = [
  {
    id: 'analytics',
    name: 'Analytics & KPIs',
    description: 'Performance metrics and business intelligence',
    icon: '📊',
    color: 'blue'
  },
  {
    id: 'compliance',
    name: 'Compliance Reports',
    description: 'Regulatory compliance and audit reports',
    icon: '🛡️',
    color: 'green'
  },
  {
    id: 'financial',
    name: 'Financial Reports',
    description: 'Revenue, expenses, and profitability analysis',
    icon: '💰',
    color: 'yellow'
  },
  {
    id: 'productivity',
    name: 'Productivity Reports',
    description: 'Time tracking and team performance',
    icon: '⚡',
    color: 'purple'
  },
  {
    id: 'custom',
    name: 'Custom Reports',
    description: 'Build your own reports with custom filters',
    icon: '🔧',
    color: 'gray'
  }
]

export default function ReportsMainPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null)
  const [stats, setStats] = useState<ReportStats>({
    totalReports: 0,
    scheduledReports: 0,
    recentReports: 0,
    favoriteReports: 0
  })

  useEffect(() => {
    if (user) {
      loadReportStats()
    }
  }, [user])

  const loadReportStats = async () => {
    try {
      // Simulate loading report data
      setTimeout(() => {
        setStats({
          totalReports: 24,
          scheduledReports: 8,
          recentReports: 12,
          favoriteReports: 6
        })
        setLoading(false)
      }, 800)
    } catch (error) {
      console.error('Failed to load report stats:', error)
      setLoading(false)
    }
  }

  // Check if user has reporting permissions
  const hasReportingAccess = user?.role && ['PARTNER', 'MANAGER'].includes(user.role)

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
          <p className="text-gray-600">Please log in to access reports</p>
        </div>
      </div>
    )
  }

  if (!hasReportingAccess) {
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
            Advanced reporting features are only available to Partners and Managers.
          </p>
          <Badge variant="secondary" className="mb-4">
            Current Role: {user.role}
          </Badge>
          <p className="text-sm text-gray-500">
            Contact your administrator if you need access to reporting features.
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
          <p className="text-gray-600 mt-4">Loading reports...</p>
        </div>
      </div>
    )
  }

  // If a specific report type is selected, show that interface
  if (selectedReportType === 'analytics') {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReportType(null)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Reports</h1>
                <p className="text-gray-600 mt-1">Business intelligence and performance metrics</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <AnalyticsDashboard />
        </div>
      </div>
    )
  }

  if (selectedReportType) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReportType(null)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Reports
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {reportCategories.find(cat => cat.id === selectedReportType)?.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  {reportCategories.find(cat => cat.id === selectedReportType)?.description}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <ReportingInterface reportType={selectedReportType} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">
              Generate insights and track performance across your organization
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{stats.totalReports}</div>
              <div className="text-xs text-gray-500">Total Reports</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{stats.scheduledReports}</div>
              <div className="text-xs text-gray-500">Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">{stats.recentReports}</div>
              <div className="text-xs text-gray-500">Recent</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{stats.favoriteReports}</div>
              <div className="text-xs text-gray-500">Favorites</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Report Categories */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportCategories.map((category) => (
              <Card
                key={category.id}
                clickable
                onClick={() => setSelectedReportType(category.id as ReportType)}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-center">
                  <div className={`text-4xl mb-4`}>
                    {category.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {category.description}
                  </p>
                  <Button size="sm" className="w-full">
                    View Reports
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    📊
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Monthly Performance</p>
                    <p className="text-sm text-gray-500">Generated 2 hours ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    🛡️
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Compliance Summary</p>
                    <p className="text-sm text-gray-500">Generated yesterday</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded flex items-center justify-center">
                    💰
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Revenue Analysis</p>
                    <p className="text-sm text-gray-500">Generated 3 days ago</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </div>
          </Card>

          {/* Scheduled Reports */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
              <Button variant="ghost" size="sm">Manage</Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    ⚡
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Weekly Productivity</p>
                    <p className="text-sm text-gray-500">Next: Monday 9:00 AM</p>
                  </div>
                </div>
                <Badge variant="secondary">Weekly</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    📊
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Monthly Dashboard</p>
                    <p className="text-sm text-gray-500">Next: 1st of month</p>
                  </div>
                </div>
                <Badge variant="secondary">Monthly</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                    🛡️
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Compliance Check</p>
                    <p className="text-sm text-gray-500">Next: Daily 6:00 PM</p>
                  </div>
                </div>
                <Badge variant="secondary">Daily</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}