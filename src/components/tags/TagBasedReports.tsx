'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  ChartBarIcon, 
  DocumentChartBarIcon,
  CalendarIcon,
  UserGroupIcon,
  TagIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import type { TagWithChildren } from '@/lib/tag-service'

interface TagBasedReportsProps {
  selectedTags: TagWithChildren[]
  organizationId: string
}

interface TagUsageMetrics {
  tagId: string
  tagName: string
  totalUsage: number
  usageByType: Record<string, number>
  usageByUser: Array<{
    userId: string
    userName: string
    count: number
  }>
  usageOverTime: Array<{
    date: string
    count: number
  }>
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
}

interface ContentDistribution {
  type: string
  count: number
  percentage: number
  tags: Array<{
    tagId: string
    tagName: string
    count: number
  }>
}

interface UserActivity {
  userId: string
  userName: string
  totalActions: number
  tagsCreated: number
  tagsApplied: number
  lastActivity: Date
}

export const TagBasedReports: React.FC<TagBasedReportsProps> = ({
  selectedTags,
  organizationId
}) => {
  const [reportType, setReportType] = useState<'usage' | 'distribution' | 'activity' | 'trends'>('usage')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Mock data - in real implementation, this would come from API
  const [usageMetrics, setUsageMetrics] = useState<TagUsageMetrics[]>([])
  const [contentDistribution, setContentDistribution] = useState<ContentDistribution[]>([])
  const [userActivity, setUserActivity] = useState<UserActivity[]>([])

  // Load report data
  const loadReportData = useCallback(async () => {
    if (selectedTags.length === 0) return

    setLoading(true)
    setError(null)

    try {
      // Mock data generation
      const mockUsageMetrics: TagUsageMetrics[] = selectedTags.map(tag => ({
        tagId: tag.id,
        tagName: tag.name,
        totalUsage: Math.floor(Math.random() * 1000) + 100,
        usageByType: {
          task: Math.floor(Math.random() * 300) + 50,
          document: Math.floor(Math.random() * 200) + 30,
          email: Math.floor(Math.random() * 150) + 20,
          chat_channel: Math.floor(Math.random() * 100) + 10
        },
        usageByUser: [
          { userId: 'user1', userName: 'John Doe', count: Math.floor(Math.random() * 50) + 10 },
          { userId: 'user2', userName: 'Jane Smith', count: Math.floor(Math.random() * 40) + 8 },
          { userId: 'user3', userName: 'Bob Wilson', count: Math.floor(Math.random() * 30) + 5 }
        ],
        usageOverTime: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          count: Math.floor(Math.random() * 20) + 5
        })),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        trendPercentage: Math.floor(Math.random() * 30) + 5
      }))

      const mockContentDistribution: ContentDistribution[] = [
        {
          type: 'Tasks',
          count: 450,
          percentage: 45,
          tags: selectedTags.slice(0, 3).map(tag => ({
            tagId: tag.id,
            tagName: tag.name,
            count: Math.floor(Math.random() * 100) + 20
          }))
        },
        {
          type: 'Documents',
          count: 300,
          percentage: 30,
          tags: selectedTags.slice(0, 3).map(tag => ({
            tagId: tag.id,
            tagName: tag.name,
            count: Math.floor(Math.random() * 80) + 15
          }))
        },
        {
          type: 'Emails',
          count: 150,
          percentage: 15,
          tags: selectedTags.slice(0, 3).map(tag => ({
            tagId: tag.id,
            tagName: tag.name,
            count: Math.floor(Math.random() * 50) + 10
          }))
        },
        {
          type: 'Channels',
          count: 100,
          percentage: 10,
          tags: selectedTags.slice(0, 3).map(tag => ({
            tagId: tag.id,
            tagName: tag.name,
            count: Math.floor(Math.random() * 30) + 5
          }))
        }
      ]

      const mockUserActivity: UserActivity[] = [
        {
          userId: 'user1',
          userName: 'John Doe',
          totalActions: 245,
          tagsCreated: 12,
          tagsApplied: 233,
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          userId: 'user2',
          userName: 'Jane Smith',
          totalActions: 189,
          tagsCreated: 8,
          tagsApplied: 181,
          lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000)
        },
        {
          userId: 'user3',
          userName: 'Bob Wilson',
          totalActions: 156,
          tagsCreated: 15,
          tagsApplied: 141,
          lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      ]

      setUsageMetrics(mockUsageMetrics)
      setContentDistribution(mockContentDistribution)
      setUserActivity(mockUserActivity)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [selectedTags])

  useEffect(() => {
    loadReportData()
  }, [loadReportData])

  const handleExportReport = useCallback(() => {
    // Implementation would generate and download report
    console.log('Exporting report...', { reportType, dateRange, selectedTags })
  }, [reportType, dateRange, selectedTags])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  if (selectedTags.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <ChartBarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No tags selected
          </h3>
          <p className="text-gray-600">
            Select one or more tags to generate reports
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Report Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Tag Analytics & Reports
            </h3>
            <p className="text-sm text-gray-600">
              Analyzing {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}: {selectedTags.map(t => t.name).join(', ')}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Date Range */}
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Report Type Selector */}
        <div className="mt-4 flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setReportType('usage')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              reportType === 'usage'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Usage Metrics
          </button>
          <button
            onClick={() => setReportType('distribution')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              reportType === 'distribution'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Content Distribution
          </button>
          <button
            onClick={() => setReportType('activity')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              reportType === 'activity'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            User Activity
          </button>
          <button
            onClick={() => setReportType('trends')}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              reportType === 'trends'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Trends
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            {error}
          </div>
        ) : (
          <>
            {/* Usage Metrics Report */}
            {reportType === 'usage' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {usageMetrics.map((metric) => (
                    <div key={metric.tagId} className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">{metric.tagName}</h4>
                        <div className={`flex items-center text-sm ${
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {metric.trend === 'up' ? (
                            <TrendingUpIcon className="w-4 h-4 mr-1" />
                          ) : metric.trend === 'down' ? (
                            <TrendingDownIcon className="w-4 h-4 mr-1" />
                          ) : null}
                          {metric.trendPercentage}%
                        </div>
                      </div>
                      
                      <div className="text-3xl font-bold text-blue-600 mb-4">
                        {metric.totalUsage.toLocaleString()}
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(metric.usageByType).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{type}s:</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Distribution Report */}
            {reportType === 'distribution' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {contentDistribution.map((dist) => (
                    <div key={dist.type} className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">{dist.type}</h4>
                        <span className="text-2xl font-bold text-blue-600">
                          {dist.percentage}%
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {dist.count.toLocaleString()} items
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Top Tags:</h5>
                        {dist.tags.map((tag) => (
                          <div key={tag.tagId} className="flex justify-between text-sm">
                            <span className="text-gray-600">{tag.tagName}:</span>
                            <span className="font-medium">{tag.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Activity Report */}
            {reportType === 'activity' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <UserGroupIcon className="w-5 h-5 mr-2" />
                    User Activity
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Actions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tags Applied
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userActivity.map((user) => (
                        <tr key={user.userId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.userName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.totalActions.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.tagsCreated}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.tagsApplied.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.lastActivity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Trends Report */}
            {reportType === 'trends' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                    <TrendingUpIcon className="w-5 h-5 mr-2" />
                    Usage Trends Over Time
                  </h4>
                  <div className="h-64 flex items-end space-x-1">
                    {usageMetrics[0]?.usageOverTime.map((item, index) => {
                      const maxCount = Math.max(...(usageMetrics[0]?.usageOverTime.map(i => i.count) || [1]))
                      const height = (item.count / maxCount) * 100
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-blue-600 rounded-t"
                            style={{ height: `${height}%` }}
                            title={`${item.date}: ${item.count} uses`}
                          />
                          <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left">
                            {new Date(item.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TagBasedReports