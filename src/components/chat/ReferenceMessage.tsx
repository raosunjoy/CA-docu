// Reference Message Component
// Displays task and document references in chat

'use client'

import React from 'react'
import { format } from 'date-fns'

interface ReferenceMessageProps {
  message: {
    id: string
    content: string
    messageType: 'TASK_REFERENCE' | 'EMAIL_REFERENCE'
    metadata: {
      referenceType: 'task' | 'document'
      referenceId: string
      referenceData: any
    }
    user: {
      firstName: string
      lastName: string
    }
    createdAt: Date
  }
  onNavigate?: (type: 'task' | 'document', id: string) => void
  className?: string
}

export function ReferenceMessage({ message, onNavigate, className = '' }: ReferenceMessageProps) {
  const { referenceType, referenceId, referenceData } = message.metadata

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(referenceType, referenceId)
    }
  }

  const renderTaskReference = () => {
    const task = referenceData
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'TODO':
          return 'bg-gray-100 text-gray-800'
        case 'IN_PROGRESS':
          return 'bg-blue-100 text-blue-800'
        case 'IN_REVIEW':
          return 'bg-yellow-100 text-yellow-800'
        case 'COMPLETED':
          return 'bg-green-100 text-green-800'
        case 'CANCELLED':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'LOW':
          return 'text-green-600'
        case 'MEDIUM':
          return 'text-yellow-600'
        case 'HIGH':
          return 'text-orange-600'
        case 'URGENT':
          return 'text-red-600'
        default:
          return 'text-gray-600'
      }
    }

    return (
      <div 
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          {/* Task Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>

          {/* Task Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {task.title}
              </h4>
              
              {/* Status Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ').toLowerCase()}
              </span>
            </div>

            {/* Task Description */}
            {task.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Task Metadata */}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {/* Priority */}
              <div className="flex items-center space-x-1">
                <svg className={`w-3 h-3 ${getPriorityColor(task.priority)}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
                <span className={getPriorityColor(task.priority)}>
                  {task.priority.toLowerCase()}
                </span>
              </div>

              {/* Assignee */}
              {task.assignedUser && (
                <span>
                  Assigned to {task.assignedUser.firstName} {task.assignedUser.lastName}
                </span>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <span>
                  Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* External Link Icon */}
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  const renderDocumentReference = () => {
    const document = referenceData

    const getDocumentIcon = (type: string) => {
      switch (type) {
        case 'PDF':
          return '📄'
        case 'WORD':
          return '📝'
        case 'EXCEL':
          return '📊'
        case 'IMAGE':
          return '🖼️'
        default:
          return '📎'
      }
    }

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
    }

    return (
      <div 
        className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          {/* Document Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-lg">
              {getDocumentIcon(document.type)}
            </span>
          </div>

          {/* Document Details */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
              {document.name}
            </h4>

            {/* Document Description */}
            {document.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {document.description}
              </p>
            )}

            {/* Document Metadata */}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              {/* File Size */}
              <span>
                {formatFileSize(document.fileSize)}
              </span>

              {/* Uploader */}
              {document.uploader && (
                <span>
                  Uploaded by {document.uploader.firstName} {document.uploader.lastName}
                </span>
              )}

              {/* Upload Date */}
              <span>
                {format(new Date(document.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* External Link Icon */}
          <div className="flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-md ${className}`}>
      {/* Share Message */}
      {message.content && (
        <p className="text-sm text-gray-700 mb-2">
          {message.content}
        </p>
      )}

      {/* Reference Card */}
      {referenceType === 'task' ? renderTaskReference() : renderDocumentReference()}
    </div>
  )
}