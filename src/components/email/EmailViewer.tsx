'use client'

import React, { useState, useEffect } from 'react'
import { 
  Star, 
  Archive, 
  Trash2, 
  Reply, 
  ReplyAll, 
  Forward,
  Download,
  Paperclip,
  Tag,
  Calendar,
  User,
  Clock,
  ExternalLink
} from 'lucide-react'
import { type Email, type EmailAttachment } from '../../types'

interface EmailViewerProps {
  emailId: string | null
  onClose: () => void
  onReply: (email: any) => void
  onReplyAll: (email: any) => void
  onForward: (email: any) => void
  onCreateTask: (email: any) => void
  className?: string
}

interface AttachmentItemProps {
  attachment: EmailAttachment
  onDownload: (attachment: EmailAttachment) => void
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ attachment, onDownload }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType.includes('pdf')) return '📄'
    if (contentType.includes('word')) return '📝'
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
    if (contentType.includes('zip') || contentType.includes('archive')) return '📦'
    return '📎'
  }

  return (
    <div className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="text-2xl mr-3">
        {getFileIcon(attachment.contentType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.filename}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(attachment.size)} • {attachment.contentType}
        </p>
      </div>
      <button
        onClick={() => onDownload(attachment)}
        className="ml-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        title="Download"
      >
        <Download size={16} />
      </button>
    </div>
  )
}

export const EmailViewer: React.FC<EmailViewerProps> = ({
  emailId,
  onClose,
  onReply,
  onReplyAll,
  onForward,
  onCreateTask,
  className = ''
}) => {
  const [email, setEmail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showRawHeaders, setShowRawHeaders] = useState(false)

  useEffect(() => {
    if (emailId) {
      loadEmail(emailId)
    } else {
      setEmail(null)
    }
  }, [emailId])

  const loadEmail = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/emails/${id}`)
      if (response.ok) {
        const emailData = await response.json()
        setEmail(emailData)
        
        // Mark as read if not already
        if (!emailData.isRead) {
          await fetch(`/api/emails/${id}/read`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true })
          })
        }
      }
    } catch (error) {
      console.error('Failed to load email:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStar = async () => {
    if (!email) return
    
    try {
      await fetch(`/api/emails/${email.id}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !email.isStarred })
      })
      
      setEmail({ ...email, isStarred: !email.isStarred })
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handleArchive = async () => {
    if (!email) return
    
    try {
      await fetch(`/api/emails/${email.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })
      
      onClose()
    } catch (error) {
      console.error('Failed to archive email:', error)
    }
  }

  const handleDelete = async () => {
    if (!email) return
    
    if (confirm('Are you sure you want to delete this email?')) {
      try {
        await fetch(`/api/emails/${email.id}`, {
          method: 'DELETE'
        })
        
        onClose()
      } catch (error) {
        console.error('Failed to delete email:', error)
      }
    }
  }

  const handleDownloadAttachment = async (attachment: EmailAttachment) => {
    try {
      const response = await fetch(`/api/emails/${email.id}/attachments/${attachment.id}/download`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = attachment.filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to download attachment:', error)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!emailId) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📧</div>
          <p className="text-lg">Select an email to view</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!email) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <p>Email not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <h3 className="font-medium truncate max-w-md">
            {email.subject || '(No subject)'}
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleStar}
            className={`p-2 rounded hover:bg-gray-100 ${
              email.isStarred ? 'text-yellow-500' : 'text-gray-400'
            }`}
            title={email.isStarred ? 'Remove star' : 'Add star'}
          >
            <Star size={18} fill={email.isStarred ? 'currentColor' : 'none'} />
          </button>
          
          <button
            onClick={handleArchive}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Archive"
          >
            <Archive size={18} />
          </button>
          
          <button
            onClick={handleDelete}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
          
          <div className="border-l border-gray-300 h-6 mx-2"></div>
          
          <button
            onClick={() => onReply(email)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Reply"
          >
            <Reply size={18} />
          </button>
          
          <button
            onClick={() => onReplyAll(email)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Reply All"
          >
            <ReplyAll size={18} />
          </button>
          
          <button
            onClick={() => onForward(email)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Forward"
          >
            <Forward size={18} />
          </button>
          
          <div className="border-l border-gray-300 h-6 mx-2"></div>
          
          <button
            onClick={() => onCreateTask(email)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Create Task"
          >
            <Tag size={16} className="mr-1" />
            Task
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Email header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900 mb-2">
                  {email.subject || '(No subject)'}
                </h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <User size={16} className="mr-1" />
                    <span className="font-medium">
                      {email.fromName || email.fromAddress}
                    </span>
                    {email.fromName && (
                      <span className="ml-1 text-gray-500">
                        &lt;{email.fromAddress}&gt;
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <Clock size={16} className="mr-1" />
                    <span>{formatDate(email.receivedAt)}</span>
                  </div>
                </div>
                
                {/* Recipients */}
                <div className="mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">To: </span>
                    {email.toAddresses.map((address: string, index: number) => (
                      <span key={index}>
                        {email.toNames?.[index] || address}
                        {index < email.toAddresses.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                  
                  {email.ccAddresses.length > 0 && (
                    <div className="mt-1">
                      <span className="font-medium">CC: </span>
                      {email.ccAddresses.map((address: string, index: number) => (
                        <span key={index}>
                          {email.ccNames?.[index] || address}
                          {index < email.ccAddresses.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Labels */}
              {email.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-4">
                  {email.labels.map((label: string) => (
                    <span
                      key={label}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Linked tasks */}
            {email.linkedTaskIds.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center text-sm text-blue-800">
                  <Tag size={16} className="mr-2" />
                  <span className="font-medium">
                    Linked to {email.linkedTaskIds.length} task{email.linkedTaskIds.length !== 1 ? 's' : ''}
                  </span>
                  <button className="ml-2 text-blue-600 hover:text-blue-800">
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          {email.attachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Paperclip size={16} className="mr-2" />
                Attachments ({email.attachments.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {email.attachments.map((attachment: EmailAttachment) => (
                  <AttachmentItem
                    key={attachment.id}
                    attachment={attachment}
                    onDownload={handleDownloadAttachment}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Email body */}
          <div className="prose max-w-none">
            {email.bodyHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                className="email-content"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-gray-900">
                {email.bodyText}
              </pre>
            )}
          </div>

          {/* Raw headers toggle */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowRawHeaders(!showRawHeaders)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showRawHeaders ? 'Hide' : 'Show'} raw headers
            </button>
            
            {showRawHeaders && (
              <pre className="mt-3 p-3 bg-gray-100 text-xs text-gray-700 rounded overflow-x-auto">
                {`Message-ID: ${email.messageId || 'N/A'}
Thread-ID: ${email.threadId || 'N/A'}
In-Reply-To: ${email.inReplyTo || 'N/A'}
References: ${email.references?.join(', ') || 'N/A'}
Importance: ${email.importance}
Priority: ${email.priority}
Sensitivity: ${email.sensitivity}`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}