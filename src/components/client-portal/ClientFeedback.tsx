'use client'

import React, { useState, useEffect } from 'react'
import { 
  StarIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface Feedback {
  id: string
  type: 'satisfaction' | 'service_quality' | 'suggestion' | 'complaint'
  rating?: number
  title?: string
  feedback: string
  categories: string[]
  status: string
  response?: string
  respondedAt?: string
  submittedAt: string
  engagement?: {
    id: string
    name: string
    type: string
  }
}

interface ClientFeedbackProps {
  engagementId?: string
}

export default function ClientFeedback({ engagementId }: ClientFeedbackProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'satisfaction' as const,
    rating: 5,
    title: '',
    feedback: '',
    categories: [] as string[],
    engagementId: engagementId || ''
  })

  useEffect(() => {
    fetchFeedbacks()
  }, [engagementId])

  const fetchFeedbacks = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const params = new URLSearchParams()
      if (engagementId) params.append('engagementId', engagementId)

      const response = await fetch(`/api/client-portal/feedback?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFeedbacks(data.data.feedbacks)
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (!formData.feedback.trim()) return

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const response = await fetch('/api/client-portal/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setFeedbacks(prev => [data.data, ...prev])
        setFormData({
          type: 'satisfaction',
          rating: 5,
          title: '',
          feedback: '',
          categories: [],
          engagementId: engagementId || ''
        })
        setShowForm(false)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const feedbackTypes = [
    {
      value: 'satisfaction',
      label: 'Overall Satisfaction',
      icon: HeartIcon,
      color: 'text-pink-500',
      description: 'Rate your overall experience'
    },
    {
      value: 'service_quality',
      label: 'Service Quality',
      icon: StarIcon,
      color: 'text-yellow-500',
      description: 'Feedback on service quality'
    },
    {
      value: 'suggestion',
      label: 'Suggestion',
      icon: LightBulbIcon,
      color: 'text-blue-500',
      description: 'Ideas for improvement'
    },
    {
      value: 'complaint',
      label: 'Complaint',
      icon: ExclamationTriangleIcon,
      color: 'text-red-500',
      description: 'Report an issue or concern'
    }
  ]

  const categories = [
    'Communication',
    'Timeliness',
    'Expertise',
    'Responsiveness',
    'Documentation',
    'Process',
    'Technology',
    'Billing',
    'Other'
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeIcon = (type: string) => {
    const feedbackType = feedbackTypes.find(t => t.value === type)
    if (!feedbackType) return ChatBubbleLeftEllipsisIcon
    return feedbackType.icon
  }

  const getTypeColor = (type: string) => {
    const feedbackType = feedbackTypes.find(t => t.value === type)
    return feedbackType?.color || 'text-gray-500'
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800'
      case 'responded':
        return 'bg-green-100 text-green-800'
      case 'resolved':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onChange?.(star)}
            className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            disabled={!interactive}
          >
            {star <= rating ? (
              <StarIconSolid className="h-5 w-5 text-yellow-400" />
            ) : (
              <StarIcon className="h-5 w-5 text-gray-300" />
            )}
          </button>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Feedback & Reviews</h2>
          <p className="mt-1 text-sm text-gray-600">
            Share your experience and help us improve our services
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <HeartIcon className="h-4 w-4 mr-2" />
          Give Feedback
        </button>
      </div>

      {/* Feedback Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Submit Feedback</h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Feedback Type
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {feedbackTypes.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                    className={`relative rounded-lg border p-4 cursor-pointer focus:outline-none ${
                      formData.type === type.value
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <type.icon className={`h-6 w-6 ${type.color}`} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {type.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {type.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating (for satisfaction and service_quality) */}
            {(formData.type === 'satisfaction' || formData.type === 'service_quality') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                {renderStars(formData.rating, true, (rating) => 
                  setFormData(prev => ({ ...prev, rating }))
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Brief title for your feedback"
              />
            </div>

            {/* Feedback Content */}
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                Feedback *
              </label>
              <textarea
                id="feedback"
                rows={4}
                value={formData.feedback}
                onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Please share your detailed feedback..."
                required
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        categories: prev.categories.includes(category)
                          ? prev.categories.filter(c => c !== category)
                          : [...prev.categories, category]
                      }))
                    }}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      formData.categories.includes(category)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={!formData.feedback.trim() || isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white shadow rounded-lg">
        {feedbacks.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {feedbacks.map((feedback) => {
              const TypeIcon = getTypeIcon(feedback.type)
              return (
                <div key={feedback.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <TypeIcon className={`h-6 w-6 ${getTypeColor(feedback.type)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {feedback.title || feedbackTypes.find(t => t.value === feedback.type)?.label}
                          </h4>
                          {feedback.rating && renderStars(feedback.rating)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(feedback.status)}`}>
                            {feedback.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(feedback.submittedAt)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                        {feedback.feedback}
                      </p>
                      
                      {feedback.categories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {feedback.categories.map((category) => (
                            <span
                              key={category}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {feedback.engagement && (
                        <p className="mt-2 text-xs text-blue-600">
                          Related to: {feedback.engagement.name}
                        </p>
                      )}
                      
                      {feedback.response && (
                        <div className="mt-4 p-3 bg-green-50 rounded-md">
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-400 mr-2" />
                            <span className="text-sm font-medium text-green-800">
                              Response from CA Firm
                            </span>
                            {feedback.respondedAt && (
                              <span className="ml-2 text-xs text-green-600">
                                {formatDate(feedback.respondedAt)}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-green-700 whitespace-pre-wrap">
                            {feedback.response}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback submitted yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Share your experience to help us improve our services
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <HeartIcon className="h-4 w-4 mr-2" />
              Give Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  )
}