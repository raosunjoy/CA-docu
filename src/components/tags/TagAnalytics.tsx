'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon, ChartBarIcon, TagIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline'
import type { TagAnalytics as TagAnalyticsType } from '@/lib/tag-service'

interface TagAnalyticsProps {
  tagId: string
  onClose: () => void
}

export const TagAnalytics: React.FC<TagAnalyticsProps> = ({
  tagId,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<TagAnalyticsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        
        if (dateRange !== 'all') {
          const days = parseInt(dateRange.replace('d', ''))
          const endDate = new Date()
          const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
          
          params.append('startDate', startDate.toISOString())
          params.append('endDate', endDate.toISOString())
        }

        const response = await fetch(`/api/tags/${tagId}/analytics?${params}`)
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to load analytics')
        }

        setAnalytics(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [tagId, dateRange])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tag Analytics</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {analytics.tag.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: analytics.tag.color }}
                  />
                )}
                <span className="font-medium">{analytics.tag.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <TagIcon className="w-8 h-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Total Usage</p>
                    <p className="text-2xl font-bold text-blue-900">{analytics.usageCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="w-8 h-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Content Types</p>
                    <p className="text-2xl font-bold text-green-900">
                      {Object.keys(analytics.usageByType).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UserIcon className="w-8 h-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Active Users</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {analytics.usageByUser.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <TagIcon className="w-8 h-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">Related Tags</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {analytics.relatedTags.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage by Type */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Usage by Content Type</h4>
              <div className="space-y-3">
                {Object.entries(analytics.usageByType).map(([type, count]) => {
                  const percentage = (count / analytics.usageCount) * 100
                  return (
                    <div key={type} className="flex items-center">
                      <div className="w-24 text-sm font-medium text-gray-700 capitalize">
                        {type.replace('_', ' ')}
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-sm text-gray-600 text-right">
                        {count} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Usage Over Time */}
            {analytics.usageOverTime.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Usage Over Time</h4>
                <div className="h-64 flex items-end space-x-1">
                  {analytics.usageOverTime.map((item, index) => {
                    const maxCount = Math.max(...analytics.usageOverTime.map(i => i.count))
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0
                    
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
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Users */}
              {analytics.usageByUser.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Top Users</h4>
                  <div className="space-y-3">
                    {analytics.usageByUser.slice(0, 10).map((user, index) => (
                      <div key={user.userId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                            {index + 1}
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {user.userName}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{user.count} uses</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Tags */}
              {analytics.relatedTags.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Related Tags</h4>
                  <div className="space-y-3">
                    {analytics.relatedTags.slice(0, 10).map((relatedTag) => (
                      <div key={relatedTag.tagId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <TagIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {relatedTag.tagName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {relatedTag.coOccurrenceCount} times
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.round(relatedTag.confidence * 100)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tag Description */}
            {analytics.tag.description && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{analytics.tag.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TagAnalytics