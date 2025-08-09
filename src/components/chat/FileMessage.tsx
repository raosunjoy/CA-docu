// File Message Component
// Displays file messages in chat with preview and download options

'use client'

import React, { useState } from 'react'

interface FileMessageProps {
  message: {
    id: string
    content: string
    metadata: {
      fileId: string
      fileName: string
      fileSize: number
      mimeType: string
      filePath: string
    }
    user: {
      firstName: string
      lastName: string
    }
    createdAt: Date
  }
  className?: string
}

export function FileMessage({ message, className = '' }: FileMessageProps) {
  const [imageError, setImageError] = useState(false)

  const { fileName, fileSize, mimeType, filePath } = message.metadata

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  const getFileIcon = () => {
    if (mimeType.startsWith('image/')) {
      return '🖼️'
    } else if (mimeType === 'application/pdf') {
      return '📄'
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return '📝'
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return '📊'
    } else if (mimeType.startsWith('text/')) {
      return '📄'
    } else if (mimeType.includes('zip')) {
      return '🗜️'
    } else {
      return '📎'
    }
  }

  const isImage = mimeType.startsWith('image/')
  const isPDF = mimeType === 'application/pdf'

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = filePath
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreview = () => {
    if (isPDF) {
      window.open(filePath, '_blank')
    }
  }

  return (
    <div className={`max-w-sm ${className}`}>
      {/* Image Preview */}
      {isImage && !imageError && (
        <div className="mb-2">
          <img
            src={filePath}
            alt={fileName}
            className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(filePath, '_blank')}
            onError={() => setImageError(true)}
            style={{ maxHeight: '300px' }}
          />
        </div>
      )}

      {/* File Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center space-x-3">
          {/* File Icon */}
          <div className="flex-shrink-0 text-2xl">
            {getFileIcon()}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(fileSize)}
            </p>
            
            {/* Caption */}
            {message.content && message.content !== `Shared ${fileName}` && (
              <p className="text-sm text-gray-700 mt-1">
                {message.content}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            {/* Preview button for PDFs */}
            {isPDF && (
              <button
                onClick={handlePreview}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Preview"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}