'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  ChevronRightIcon,
  CameraIcon
} from '@heroicons/react/24/outline'

interface DashboardData {
  stats: {
    activeEngagements: number
    pendingDocumentRequests: number
    documentsUploaded: number
    upcomingMeetings: number
    unreadMessages: number
    pendingInvoices: number
    totalPendingAmount: number
  }
  engagements: any[]
  documentRequests: any[]
  recentDocuments: any[]
  upcomingMeetings: any[]
  recentMessages: any[]
  pendingInvoices: any[]
}

export default function MobileClientDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const response = await fetch('/api/client-portal/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDashboardData(data.data)
      } else {
        setError('Failed to load dashboard data')
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const { stats } = dashboardData

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'uploaded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-xl font-bold">Welcome Back!</h1>
        <p className="mt-1 text-blue-100">
          Here's what's happening with your account
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/client-portal/camera-upload"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <CameraIcon className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">Scan Document</span>
          </Link>
          <Link
            href="/client-portal/documents"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <DocumentTextIcon className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-900">Upload Files</span>
          </Link>
          <Link
            href="/client-portal/messages"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">Send Message</span>
          </Link>
          <Link
            href="/client-portal/engagements"
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-900">View Progress</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.activeEngagements}</p>
              <p className="text-sm text-gray-600">Active Projects</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.pendingDocumentRequests}</p>
              <p className="text-sm text-gray-600">Pending Docs</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-2xl font-bold text-gray-900">{stats.unreadMessages}</p>
              <p className="text-sm text-gray-600">New Messages</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <CreditCardIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalPendingAmount)}</p>
              <p className="text-sm text-gray-600">Pending Bills</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Amount Alert */}
      {stats.totalPendingAmount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Outstanding Payment
              </h3>
              <p className="mt-1 text-sm text-red-700">
                You have {formatCurrency(stats.totalPendingAmount)} in pending invoices.
              </p>
              <Link 
                href="/client-portal/invoices" 
                className="mt-2 inline-flex items-center text-sm font-medium text-red-800 hover:text-red-600"
              >
                View invoices
                <ChevronRightIcon className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Active Engagements */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Active Projects</h3>
          <Link 
            href="/client-portal/engagements" 
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View All
          </Link>
        </div>
        <div className="p-4">
          {dashboardData.engagements.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.engagements.slice(0, 3).map((engagement) => (
                <Link
                  key={engagement.id}
                  href={`/client-portal/engagements/${engagement.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{engagement.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {engagement.type} • {engagement.completionPercentage}% complete
                      </p>
                      <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${engagement.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-3" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No active projects</p>
          )}
        </div>
      </div>

      {/* Pending Document Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Document Requests</h3>
          <Link 
            href="/client-portal/document-requests" 
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            View All
          </Link>
        </div>
        <div className="p-4">
          {dashboardData.documentRequests.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.documentRequests.slice(0, 3).map((request) => (
                <Link
                  key={request.id}
                  href={`/client-portal/document-requests/${request.id}`}
                  className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{request.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.uploadedCount}/{request.requiredCount} documents uploaded
                      </p>
                      {request.dueDate && (
                        <p className="text-xs text-red-600 mt-1">
                          Due {formatDate(request.dueDate)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center ml-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-2" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No pending document requests</p>
          )}
        </div>
      </div>

      {/* Recent Messages */}
      {dashboardData.recentMessages.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Messages</h3>
            <Link 
              href="/client-portal/messages" 
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              View All
            </Link>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {dashboardData.recentMessages.slice(0, 3).map((message) => (
                <div key={message.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {message.fromClient ? (
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">You</span>
                      </div>
                    ) : (
                      <div className="h-8 w-8 bg-gray-400 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {message.fromClient ? 'You' : 'CA Firm'}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(message.sentAt)}
                    </p>
                  </div>
                  {!message.isRead && !message.fromClient && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}