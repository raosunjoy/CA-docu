'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../../atoms/Card'
import { Button } from '../../atoms/Button'
import type { DashboardMetrics } from '../../../types'

interface ClientDashboardProps {
  organizationId: string
  userId: string
  className?: string
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  organizationId,
  userId,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [organizationId, userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/client-metrics?organizationId=${organizationId}&clientId=${userId}`)

      if (!response.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const data = await response.json()
      setMetrics(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`client-dashboard ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`client-dashboard ${className}`}>
        <Card className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className={`client-dashboard ${className}`}>
      {/* Welcome Message */}
      <Card className="mb-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Welcome to your Client Portal</h2>
            <p className="text-gray-600">Track your engagement progress and manage your documents.</p>
          </div>
        </div>
      </Card>

      {/* Engagement Status KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ClientMetricsCard
          title="Active Engagements"
          value={3}
          change="1 new"
          trend="up"
          icon="briefcase"
        />
        <ClientMetricsCard
          title="Documents Uploaded"
          value={12}
          change="+3 this week"
          trend="up"
          icon="document"
        />
        <ClientMetricsCard
          title="Pending Requests"
          value={2}
          change="2 urgent"
          trend="stable"
          icon="clock"
        />
        <ClientMetricsCard
          title="Completion Rate"
          value="85%"
          change="+10%"
          trend="up"
          icon="check"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Progress */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Engagement Progress</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Details
            </button>
          </div>
          <EngagementProgressWidget />
        </Card>

        {/* Document Requests */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Document Requests</h3>
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              2 Pending
            </span>
          </div>
          <DocumentRequestsWidget />
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <ClientQuickActionsWidget />
        </Card>

        {/* Communication */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <RecentMessagesWidget />
        </Card>

        {/* Billing & Invoices */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Billing & Invoices</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <BillingInvoicesWidget />
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines & Milestones</h3>
            <div className="flex space-x-2">
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                2 Due Soon
              </span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Calendar
              </button>
            </div>
          </div>
          <ClientDeadlinesWidget />
        </Card>
      </div>
    </div>
  )
}

// Client Metrics Card Component
interface ClientMetricsCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: 'briefcase' | 'document' | 'clock' | 'check'
}

const ClientMetricsCard: React.FC<ClientMetricsCardProps> = ({
  title,
  value,
  change,
  trend,
  icon
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'briefcase':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 01-2 2H10a2 2 0 01-2-2V6" />
          </svg>
        )
      case 'document':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'clock':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'check':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center text-white">
            {getIcon()}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 
                'text-gray-500'
              }`}>
                {trend === 'up' && (
                  <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trend === 'down' && (
                  <svg className="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="sr-only">{trend === 'up' ? 'Increased' : trend === 'down' ? 'Decreased' : 'Unchanged'} by</span>
                {change}
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </Card>
  )
}

// Engagement Progress Widget
const EngagementProgressWidget: React.FC = () => {
  const engagements = [
    { name: 'Annual Audit 2024', progress: 75, status: 'in-progress', dueDate: '2024-03-15', phase: 'Field Work' },
    { name: 'GST Return Filing', progress: 90, status: 'review', dueDate: '2024-01-31', phase: 'Final Review' },
    { name: 'Tax Planning Consultation', progress: 100, status: 'completed', dueDate: '2024-01-20', phase: 'Completed' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      {engagements.map((engagement, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium text-gray-900">{engagement.name}</h4>
              <p className="text-sm text-gray-500">Due: {engagement.dueDate}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(engagement.status)}`}>
              {engagement.phase}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
              <div 
                className={`h-2 rounded-full ${
                  engagement.status === 'completed' ? 'bg-green-500' :
                  engagement.status === 'review' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${engagement.progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">{engagement.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Document Requests Widget
const DocumentRequestsWidget: React.FC = () => {
  const requests = [
    { name: 'Bank Statements (Dec 2023)', priority: 'high', dueDate: '2024-01-25', status: 'pending' },
    { name: 'Purchase Invoices Q4', priority: 'medium', dueDate: '2024-01-28', status: 'pending' },
    { name: 'Employee Salary Slips', priority: 'low', dueDate: '2024-02-01', status: 'uploaded' },
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-3">
      {requests.map((request, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                request.priority === 'high' ? 'bg-red-500' :
                request.priority === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              }`}></div>
              <p className="text-sm font-medium text-gray-900">{request.name}</p>
            </div>
            <p className="text-xs text-gray-500 ml-4">Due: {request.dueDate}</p>
          </div>
          {request.status === 'pending' ? (
            <Button variant="primary" size="sm">
              Upload
            </Button>
          ) : (
            <span className="text-xs text-green-600 font-medium">✓ Uploaded</span>
          )}
        </div>
      ))}
    </div>
  )
}

// Client Quick Actions Widget
const ClientQuickActionsWidget: React.FC = () => {
  const quickActions = [
    { name: 'Upload Documents', icon: 'upload', color: 'bg-blue-500' },
    { name: 'Send Message', icon: 'message', color: 'bg-green-500' },
    { name: 'Schedule Meeting', icon: 'calendar', color: 'bg-purple-500' },
    { name: 'View Invoices', icon: 'invoice', color: 'bg-orange-500' },
  ]

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'upload':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      case 'message':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      case 'calendar':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      case 'invoice':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {quickActions.map((action, index) => (
        <button
          key={index}
          className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white mb-2`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {getIcon(action.icon)}
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-700 text-center">
            {action.name}
          </span>
        </button>
      ))}
    </div>
  )
}

// Recent Messages Widget
const RecentMessagesWidget: React.FC = () => {
  const messages = [
    {
      from: 'Rajesh Kumar',
      message: 'Please upload the latest bank statements for review.',
      time: '2 hours ago',
      unread: true
    },
    {
      from: 'Priya Sharma',
      message: 'Your GST return has been filed successfully.',
      time: '1 day ago',
      unread: false
    },
    {
      from: 'System',
      message: 'Reminder: Annual audit documentation due in 3 days.',
      time: '2 days ago',
      unread: false
    },
  ]

  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <div key={index} className={`p-3 rounded-lg ${message.unread ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">{message.from}</span>
            <span className="text-xs text-gray-500">{message.time}</span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{message.message}</p>
          {message.unread && (
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          )}
        </div>
      ))}
    </div>
  )
}

// Billing & Invoices Widget
const BillingInvoicesWidget: React.FC = () => {
  const invoices = [
    { number: 'INV-2024-001', amount: '₹25,000', status: 'paid', date: '2024-01-15' },
    { number: 'INV-2024-002', amount: '₹18,500', status: 'pending', date: '2024-01-20' },
    { number: 'INV-2023-045', amount: '₹32,000', status: 'overdue', date: '2023-12-30' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
            <p className="text-xs text-gray-500">{invoice.date}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{invoice.amount}</p>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>
      ))}
      <div className="pt-3 border-t border-gray-200">
        <Button variant="outline" size="sm" className="w-full">
          View All Invoices
        </Button>
      </div>
    </div>
  )
}

// Client Deadlines Widget
const ClientDeadlinesWidget: React.FC = () => {
  const deadlines = [
    { task: 'Submit Bank Statements', type: 'Document Upload', dueDate: '2024-01-25', priority: 'high', status: 'pending' },
    { task: 'Review Draft Audit Report', type: 'Review', dueDate: '2024-01-28', priority: 'medium', status: 'pending' },
    { task: 'Annual Compliance Filing', type: 'Filing', dueDate: '2024-02-15', priority: 'high', status: 'in-progress' },
    { task: 'Tax Planning Meeting', type: 'Meeting', dueDate: '2024-02-01', priority: 'medium', status: 'scheduled' },
  ]

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Priority
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {deadlines.map((deadline, index) => {
            const daysUntilDue = getDaysUntilDue(deadline.dueDate)
            return (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{deadline.task}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {deadline.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{deadline.dueDate}</div>
                  <div className={`text-xs ${
                    daysUntilDue <= 1 ? 'text-red-600' :
                    daysUntilDue <= 3 ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {daysUntilDue === 0 ? 'Due today' :
                     daysUntilDue === 1 ? 'Due tomorrow' :
                     daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` :
                     `${daysUntilDue} days left`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    deadline.priority === 'high' ? 'bg-red-100 text-red-800' :
                    deadline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    deadline.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                    deadline.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    deadline.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {deadline.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button variant="outline" size="sm">
                    {deadline.status === 'pending' ? 'Start' : 'View'}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}