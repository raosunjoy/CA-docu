// Message Item Component
// Displays individual chat messages with actions and formatting

'use client'

import React, { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { FileMessage } from './FileMessage'
import { ReferenceMessage } from './ReferenceMessage'
import type { ChatMessageWithUser } from '../../lib/websocket-server'

interface MessageItemProps {
  message: ChatMessageWithUser
  showAvatar: boolean
  onReply: (message: ChatMessageWithUser) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
}

export function MessageItem({ 
  message, 
  showAvatar, 
  onReply, 
  onEdit, 
  onDelete 
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showActions, setShowActions] = useState(false)

  // You would get current user from auth context
  const currentUserId = 'current-user-id' // Replace with actual current user ID
  const isOwnMessage = message.userId === currentUserId

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const formatMessageTime = (date: Date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return format(messageDate, 'HH:mm')
    } else {
      return format(messageDate, 'MMM d, HH:mm')
    }
  }

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="mt-1">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={Math.min(editContent.split('\n').length + 1, 6)}
            autoFocus
          />
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-1">
        {/* Reply Preview */}
        {message.repliedTo && (
          <div className="mb-2 pl-3 border-l-2 border-gray-300 bg-gray-50 rounded p-2">
            <div className="flex items-center space-x-2 mb-1">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-xs font-medium text-gray-600">
                {message.repliedTo.user.firstName} {message.repliedTo.user.lastName}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {message.repliedTo.content}
            </p>
          </div>
        )}

        {/* Message Content */}
        {message.messageType === 'FILE' ? (
          <FileMessage message={message as any} />
        ) : message.messageType === 'TASK_REFERENCE' || message.messageType === 'EMAIL_REFERENCE' ? (
          <ReferenceMessage 
            message={message as any} 
            onNavigate={(type, id) => {
              // Handle navigation to task or document
              if (type === 'task') {
                window.open(`/tasks/${id}`, '_blank')
              } else if (type === 'document') {
                window.open(`/documents/${id}`, '_blank')
              }
            }}
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-900 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </div>
        )}

        {/* Message Metadata */}
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.createdAt)}
          </span>
          
          {message.updatedAt && new Date(message.updatedAt) > new Date(message.createdAt) && (
            <span className="text-xs text-gray-400">(edited)</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`group flex items-start space-x-3 px-4 py-2 hover:bg-gray-50 ${
        showAvatar ? 'mt-4' : 'mt-1'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {showAvatar ? (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {message.user.firstName[0]}{message.user.lastName[0]}
            </span>
          </div>
        ) : (
          <div className="w-8 h-8 flex items-center justify-center">
            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* User Name and Time */}
        {showAvatar && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-medium text-gray-900">
              {message.user.firstName} {message.user.lastName}
            </span>
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.createdAt)}
            </span>
            {message.user.role && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {message.user.role.toLowerCase()}
              </span>
            )}
          </div>
        )}

        {renderMessageContent()}
      </div>

      {/* Message Actions */}
      {showActions && !isEditing && (
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Reply */}
          <button
            onClick={() => onReply(message)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Reply"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          {/* Edit (only for own messages) */}
          {isOwnMessage && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}

          {/* Delete (only for own messages) */}
          {isOwnMessage && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this message?')) {
                  onDelete(message.id)
                }
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* More Actions */}
          <button
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="More actions"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}