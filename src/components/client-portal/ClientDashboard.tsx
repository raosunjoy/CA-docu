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
  EyeIcon
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

export default function ClientDashboard() {
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  const statCards = [
    {
      name: 'Active Engagements',
      value: stats.activeEngagements,
      icon: ClipboardDocumentListIcon,
      color: 'bg-blue-500',
      href: '/client-portal/engagements'
    },
    {
      name: 'Pending Document Requests',
      value: stats.pendingDocumentRequests,
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
      href: '/client-portal/document-requests'
    },
    {
      name: 'Upcoming Meetings',
      value: stats.upcomingMeetings,
      icon: CalendarDaysIcon,
      color: 'bg-green-500',
      href: '/client-portal/meetings'
    },
    {
      name: 'Unread Messages',
      value: stats.unreadMessages,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-purple-500',
      href: '/client-portal/messages'
    },
    {
      name: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: CreditCardIcon,
      color: 'bg-red-500',
      href: '/client-portal/invoices'
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
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
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Your Client Portal</h1>
        <p className="mt-2 text-gray-600">
          Stay updated on your engagements, documents, and communications with your CA firm.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div>
              <div className={`absolute ${stat.color} rounded-md p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">{stat.name}</p>
              <p className="ml-16 text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Amount Alert */}
      {stats.totalPendingAmount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Outstanding Payment
              </h3>
              <p className="mt-1 text-sm text-red-700">
                You have {formatCurrency(stats.totalPendingAmount)} in pending invoices.{' '}
                <Link href="/client-portal/invoices" className="font-medium underline">
                  View invoices
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Engagements */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Engagements</h3>
          </div>
          <div className="p-6">
            {dashboardData.engagements.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.engagements.slice(0, 3).map((engagement) => (
                  <div key={engagement.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/client-portal/engagements/${engagement.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        {engagement.name}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {engagement.type} • {engagement.completionPercentage}% complete
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(engagement.status)}`}>
                      {engagement.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                {dashboardData.engagements.length > 3 && (
                  <Link
                    href="/client-portal/engagements"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    View all engagements →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active engagements</p>
            )}
          </div>
        </div>

        {/* Pending Document Requests */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Pending Document Requests</h3>
          </div>
          <div className="p-6">
            {dashboardData.documentRequests.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.documentRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/client-portal/document-requests/${request.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        {request.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.uploadedCount}/{request.requiredCount} documents uploaded
                        {request.dueDate && ` • Due ${formatDate(request.dueDate)}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                ))}
                {dashboardData.documentRequests.length > 3 && (
                  <Link
                    href="/client-portal/document-requests"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    View all requests →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No pending document requests</p>
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Documents</h3>
          </div>
          <div className="p-6">
            {dashboardData.recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentDocuments.slice(0, 3).map((document) => (
                  <div key={document.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{document.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded {formatDate(document.uploadedAt)}
                        {document.request && ` • ${document.request.title}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                        {document.status}
                      </span>
                      <Link
                        href={`/client-portal/documents/${document.id}`}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))}
                {dashboardData.recentDocuments.length > 3 && (
                  <Link
                    href="/client-portal/documents"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    View all documents →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No documents uploaded yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Meetings</h3>
          </div>
          <div className="p-6">
            {dashboardData.upcomingMeetings.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="border-l-4 border-blue-400 pl-4">
                    <p className="text-sm font-medium text-gray-900">{meeting.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(meeting.scheduledAt).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      {meeting.engagement && ` • ${meeting.engagement.name}`}
                    </p>
                    {meeting.meetingLink && (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-500 mt-1 inline-block"
                      >
                        Join Meeting →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming meetings</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}