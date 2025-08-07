'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ClientPortalLayout from '@/components/client-portal/ClientPortalLayout'
import { 
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface EngagementDetails {
  id: string
  name: string
  type: string
  status: string
  completionPercentage: number
  startDate?: string
  expectedEndDate?: string
  clientNotes?: string
  milestones: Array<{
    id: string
    name: string
    description?: string
    dueDate?: string
    completed: boolean
    completedAt?: string
  }>
  documentRequests: Array<{
    id: string
    title: string
    description: string
    category?: string
    priority: string
    status: string
    dueDate?: string
    uploadedCount: number
    requiredCount: number
    requiredDocuments: string[]
    optionalDocuments: string[]
    instructions?: string
    createdAt: string
    documents: Array<{
      id: string
      name: string
      status: string
      uploadedAt: string
      reviewNotes?: string
    }>
  }>
  progressUpdates: Array<{
    id: string
    title: string
    description: string
    updateType: string
    previousStatus?: string
    currentStatus?: string
    completionPercentage?: number
    milestoneName?: string
    createdAt: string
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    title: string
    description?: string
    subtotal: number
    taxAmount: number
    totalAmount: number
    currency: string
    status: string
    issueDate: string
    dueDate?: string
    paidDate?: string
    lineItems: any[]
  }>
  stats: {
    totalDocumentRequests: number
    pendingDocumentRequests: number
    completedDocumentRequests: number
    totalInvoices: number
    paidInvoices: number
    pendingAmount: number
    completedMilestones: number
    totalMilestones: number
  }
}

export default function EngagementDetailsPage() {
  const params = useParams()
  const engagementId = params.id as string
  const [engagement, setEngagement] = useState<EngagementDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'progress' | 'invoices'>('overview')

  useEffect(() => {
    if (engagementId) {
      fetchEngagementDetails()
    }
  }, [engagementId])

  const fetchEngagementDetails = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const response = await fetch(`/api/client-portal/engagements/${engagementId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEngagement(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch engagement details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning':
        return 'bg-gray-100 text-gray-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'review':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'on_hold':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'uploaded':
        return 'bg-blue-100 text-blue-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-blue-500'
    return 'bg-gray-500'
  }

  if (isLoading) {
    return (
      <ClientPortalLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </ClientPortalLayout>
    )
  }

  if (!engagement) {
    return (
      <ClientPortalLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Engagement not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The engagement you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            href="/client-portal/engagements"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Engagements
          </Link>
        </div>
      </ClientPortalLayout>
    )
  }

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            href="/client-portal/engagements"
            className="text-gray-400 hover:text-gray-500"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{engagement.name}</h1>
                <p className="mt-1 text-sm text-gray-600">
                  {engagement.type.replace('_', ' ')} • {engagement.completionPercentage}% Complete
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(engagement.status)}`}>
                {engagement.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
            <span className="text-2xl font-bold text-gray-900">
              {engagement.completionPercentage}%
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(engagement.completionPercentage)}`}
              style={{ width: `${engagement.completionPercentage}%` }}
            />
          </div>
          {(engagement.startDate || engagement.expectedEndDate) && (
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              {engagement.startDate && (
                <span>Started {formatDate(engagement.startDate)}</span>
              )}
              {engagement.startDate && engagement.expectedEndDate && (
                <span className="mx-2">•</span>
              )}
              {engagement.expectedEndDate && (
                <span>Expected completion {formatDate(engagement.expectedEndDate)}</span>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Document Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {engagement.stats.pendingDocumentRequests} / {engagement.stats.totalDocumentRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Milestones
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {engagement.stats.completedMilestones} / {engagement.stats.totalMilestones}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Amount
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(engagement.stats.pendingAmount)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Progress Updates
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {engagement.progressUpdates.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Client Notes */}
        {engagement.clientNotes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Notes for You</h4>
            <p className="text-sm text-blue-700">{engagement.clientNotes}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Overview', icon: ClipboardDocumentListIcon },
                { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
                { key: 'progress', label: 'Progress', icon: ChartBarIcon },
                { key: 'invoices', label: 'Invoices', icon: CreditCardIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Milestones */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Milestones</h3>
                  {engagement.milestones.length > 0 ? (
                    <div className="space-y-3">
                      {engagement.milestones.map((milestone) => (
                        <div key={milestone.id} className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {milestone.completed ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            ) : (
                              <ClockIcon className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              milestone.completed ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {milestone.name}
                            </p>
                            {milestone.description && (
                              <p className="text-sm text-gray-500">{milestone.description}</p>
                            )}
                            {milestone.dueDate && (
                              <p className="text-xs text-gray-500">
                                Due: {formatDate(milestone.dueDate)}
                              </p>
                            )}
                          </div>
                          {milestone.completed && milestone.completedAt && (
                            <span className="text-xs text-green-600">
                              Completed {formatDate(milestone.completedAt)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No milestones defined for this engagement.</p>
                  )}
                </div>

                {/* Recent Progress Updates */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Updates</h3>
                  {engagement.progressUpdates.slice(0, 3).map((update) => (
                    <div key={update.id} className="border-l-4 border-blue-400 pl-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-900">{update.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDateTime(update.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                {engagement.documentRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{request.title}</h4>
                        <p className="text-sm text-gray-600">{request.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-gray-600">
                        Progress: {request.uploadedCount} / {request.requiredCount} documents uploaded
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(request.uploadedCount / request.requiredCount) * 100}%` }}
                        />
                      </div>
                    </div>

                    {request.dueDate && (
                      <p className="text-sm text-gray-600 mb-3">
                        Due: {formatDate(request.dueDate)}
                      </p>
                    )}

                    {request.instructions && (
                      <div className="mb-3 p-3 bg-yellow-50 rounded-md">
                        <p className="text-sm text-yellow-800">{request.instructions}</p>
                      </div>
                    )}

                    {/* Required Documents */}
                    {request.requiredDocuments.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Required Documents:</h5>
                        <ul className="text-sm text-gray-600 list-disc list-inside">
                          {request.requiredDocuments.map((doc, index) => (
                            <li key={index}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Uploaded Documents */}
                    {request.documents.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Uploaded Documents:</h5>
                        <div className="space-y-2">
                          {request.documents.map((document) => (
                            <div key={document.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{document.name}</p>
                                <p className="text-xs text-gray-500">
                                  Uploaded {formatDateTime(document.uploadedAt)}
                                </p>
                                {document.reviewNotes && (
                                  <p className="text-xs text-blue-600 mt-1">{document.reviewNotes}</p>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                                  {document.status}
                                </span>
                                <Link
                                  href={`/client-portal/documents/${document.id}`}
                                  className="text-blue-600 hover:text-blue-500"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <Link
                        href={`/client-portal/document-requests/${request.id}`}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-4">
                {engagement.progressUpdates.map((update) => (
                  <div key={update.id} className="border-l-4 border-blue-400 pl-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{update.title}</h4>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(update.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                    
                    {update.updateType === 'milestone' && update.milestoneName && (
                      <p className="text-xs text-blue-600 mt-1">
                        Milestone: {update.milestoneName}
                      </p>
                    )}
                    
                    {update.updateType === 'status_change' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Status changed from {update.previousStatus} to {update.currentStatus}
                      </p>
                    )}
                    
                    {update.completionPercentage !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Progress: {update.completionPercentage}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              <div className="space-y-4">
                {engagement.invoices.map((invoice) => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </h4>
                        <p className="text-sm text-gray-600">{invoice.title}</p>
                        {invoice.description && (
                          <p className="text-sm text-gray-500 mt-1">{invoice.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(invoice.totalAmount, invoice.currency)}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Issue Date:</span>
                        <span className="ml-2 text-gray-900">{formatDate(invoice.issueDate)}</span>
                      </div>
                      {invoice.dueDate && (
                        <div>
                          <span className="text-gray-500">Due Date:</span>
                          <span className="ml-2 text-gray-900">{formatDate(invoice.dueDate)}</span>
                        </div>
                      )}
                      {invoice.paidDate && (
                        <div>
                          <span className="text-gray-500">Paid Date:</span>
                          <span className="ml-2 text-gray-900">{formatDate(invoice.paidDate)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Subtotal:</span>
                        <span className="ml-2 text-gray-900">
                          {formatCurrency(invoice.subtotal, invoice.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tax:</span>
                        <span className="ml-2 text-gray-900">
                          {formatCurrency(invoice.taxAmount, invoice.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Line Items */}
                    {invoice.lineItems && invoice.lineItems.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Line Items:</h5>
                        <div className="space-y-1">
                          {invoice.lineItems.map((item: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.description}</span>
                              <span className="text-gray-900">
                                {formatCurrency(item.amount, invoice.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  )
}