'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Mail, 
  Clock, 
  Users, 
  Archive,
  AlertCircle,
  Download,
  Filter,
  Calendar,
  PieChart,
  Activity
} from 'lucide-react'
import { type EmailAnalytics } from '../../types'

interface EmailAnalyticsProps {
  userId?: string
  accountId?: string
  dateRange?: [Date, Date]
  className?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl">{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center text-sm ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="ml-1">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  )
}

export const EmailAnalytics: React.FC<EmailAnalyticsProps> = ({
  userId,
  accountId,
  dateRange,
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<EmailAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')
  const [customDateRange, setCustomDateRange] = useState<[Date, Date]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ])

  useEffect(() => {
    loadAnalytics()
  }, [userId, accountId, selectedPeriod, customDateRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (accountId) params.append('accountId', accountId)
      
      // Set date range based on selected period
      let startDate: Date, endDate: Date
      if (selectedPeriod === 'custom') {
        [startDate, endDate] = customDateRange
      } else {
        const days = parseInt(selectedPeriod.replace('d', ''))
        startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        endDate = new Date()
      }
      
      params.append('startDate', startDate.toISOString())
      params.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/emails/analytics?${params}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setAnalytics(analyticsData)
      }
    } catch (error) {
      console.error('Failed to load email analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportAnalytics = async () => {
    try {
      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (accountId) params.append('accountId', accountId)
      params.append('format', 'csv')
      
      const response = await fetch(`/api/emails/analytics/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `email-analytics-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export analytics:', error)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow border border-gray-200 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className={`bg-white rounded-lg shadow border border-gray-200 p-8 text-center ${className}`}>
        <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Unable to load email analytics at this time.</p>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <BarChart3 className="text-blue-600" size={24} />
          <div>
            <h3 className="text-lg font-semibold">Email Analytics</h3>
            <p className="text-sm text-gray-600">
              Insights and metrics for email communication
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>

          {/* Export button */}
          <button
            onClick={exportAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {selectedPeriod === 'custom' && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customDateRange[0].toISOString().split('T')[0]}
                onChange={(e) => setCustomDateRange([new Date(e.target.value), customDateRange[1]])}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customDateRange[1].toISOString().split('T')[0]}
                onChange={(e) => setCustomDateRange([customDateRange[0], new Date(e.target.value)])}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <button
              onClick={loadAnalytics}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Key metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Emails"
            value={analytics.totalEmails}
            icon={<Mail />}
            color="blue"
          />
          <MetricCard
            title="Unread Emails"
            value={analytics.unreadEmails}
            icon={<AlertCircle />}
            color="red"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${analytics.responseTime.average.toFixed(1)}h`}
            icon={<Clock />}
            color="green"
          />
          <MetricCard
            title="Emails with Tasks"
            value={analytics.emailsWithTasks}
            icon={<Activity />}
            color="purple"
          />
        </div>

        {/* Charts and detailed analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email volume over time */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp size={18} className="mr-2" />
              Email Volume Trends
            </h4>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChart size={48} className="mx-auto mb-2 text-gray-300" />
                <p>Chart visualization would go here</p>
                <p className="text-sm">Integration with charting library needed</p>
              </div>
            </div>
          </div>

          {/* Top senders */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Users size={18} className="mr-2" />
              Top Senders
            </h4>
            <div className="space-y-3">
              {analytics.topSenders.slice(0, 5).map((sender, index) => (
                <div key={sender.address} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {sender.name || sender.address}
                      </div>
                      {sender.name && (
                        <div className="text-sm text-gray-500">{sender.address}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {sender.count} emails
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response time distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Clock size={18} className="mr-2" />
              Response Time Analysis
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Response Time</span>
                <span className="font-medium">{analytics.responseTime.average.toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Median Response Time</span>
                <span className="font-medium">{analytics.responseTime.median.toFixed(1)} hours</span>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-2">Response Time Distribution</div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-20 text-xs text-gray-500">{'< 1h'}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <div className="w-8 text-xs text-gray-500">25%</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-20 text-xs text-gray-500">1-4h</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                    <div className="w-8 text-xs text-gray-500">40%</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-20 text-xs text-gray-500">4-24h</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <div className="w-8 text-xs text-gray-500">25%</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-20 text-xs text-gray-500">{'> 24h'}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                    <div className="w-8 text-xs text-gray-500">10%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration metrics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Activity size={18} className="mr-2" />
              Integration Metrics
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Emails converted to tasks</span>
                <span className="font-medium">{analytics.emailsWithTasks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Emails with documents</span>
                <span className="font-medium">{analytics.emailsWithDocuments}</span>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600 mb-2">Task Conversion Rate</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full" 
                      style={{ 
                        width: `${(analytics.emailsWithTasks / analytics.totalEmails * 100).toFixed(1)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium">
                    {(analytics.emailsWithTasks / analytics.totalEmails * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional insights */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <TrendingUp size={18} className="mr-2" />
            Key Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-800 mb-1">Email Volume</h5>
              <p className="text-blue-700">
                You received {analytics.emailsToday} emails today, 
                {analytics.emailsThisWeek} this week, and {analytics.emailsThisMonth} this month.
              </p>
            </div>
            <div>
              <h5 className="font-medium text-blue-800 mb-1">Productivity</h5>
              <p className="text-blue-700">
                {((analytics.emailsWithTasks / analytics.totalEmails) * 100).toFixed(1)}% of emails 
                were converted to actionable tasks, showing good email-to-action conversion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}