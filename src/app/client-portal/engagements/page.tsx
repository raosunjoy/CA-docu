'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ClientPortalLayout from '@/components/client-portal/ClientPortalLayout'
import { 
  ClipboardDocumentListIcon,
  EyeIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface Engagement {
  id: string
  name: string
  type: string
  status: string
  completionPercentage: number
  startDate?: string
  expectedEndDate?: string
  clientNotes?: string
  documentRequests: Array<{
    id: string
    title: string
    status: string
    dueDate?: string
    uploadedCount: number
    requiredCount: number
  }>
  progressUpdates: Array<{
    id: string
    title: string
    description: string
    updateType: string
    completionPercentage?: number
    createdAt: string
  }>
  invoices: Array<{
    id: string
    invoiceNumber: string
    title: string
    totalAmount: number
    currency: string
    status: string
    dueDate?: string
  }>
}

export default function ClientEngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    fetchEngagements()
  }, [filter])

  const fetchEngagements = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const params = new URLSearchParams()
      if (filter) params.append('status', filter)

      const response = await fetch(`/api/client-portal/engagements?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEngagements(data.data.engagements)
      }
    } catch (error) {
      console.error('Failed to fetch engagements:', error)
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

  return (
    <ClientPortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Engagements</h1>
            <p className="mt-1 text-sm text-gray-600">
              Track the progress of your ongoing projects and services
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === ''
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Engagements
          </button>
          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'IN_PROGRESS'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('REVIEW')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'REVIEW'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Under Review
          </button>
          <button
            onClick={() => setFilter('COMPLETED')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              filter === 'COMPLETED'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Engagements Grid */}
        {engagements.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {engagements.map((engagement) => (
              <div key={engagement.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {engagement.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {engagement.type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(engagement.status)}`}>
                      {engagement.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-900">
                        {engagement.completionPercentage}%
                      </span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(engagement.completionPercentage)}`}
                        style={{ width: `${engagement.completionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Timeline */}
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
                        <span>Due {formatDate(engagement.expectedEndDate)}</span>
                      )}
                    </div>
                  )}

                  {/* Client Notes */}
                  {engagement.clientNotes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        {engagement.clientNotes}
                      </p>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center">
                        <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {engagement.documentRequests.filter(req => req.status === 'PENDING').length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Pending Docs</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center">
                        <ChartBarIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {engagement.progressUpdates.length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Updates</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center">
                        <CreditCardIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-900">
                          {engagement.invoices.filter(inv => inv.status !== 'paid').length}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Pending Bills</p>
                    </div>
                  </div>

                  {/* Recent Updates */}
                  {engagement.progressUpdates.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Updates</h4>
                      <div className="space-y-2">
                        {engagement.progressUpdates.slice(0, 2).map((update) => (
                          <div key={update.id} className="text-sm">
                            <p className="text-gray-900 font-medium">{update.title}</p>
                            <p className="text-gray-600 text-xs">
                              {formatDate(update.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 px-6 py-3">
                  <Link
                    href={`/client-portal/engagements/${engagement.id}`}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No engagements found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter 
                ? 'No engagements match the selected filter'
                : 'Your engagements will appear here once they are created'
              }
            </p>
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}