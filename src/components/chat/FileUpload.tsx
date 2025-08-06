// File Upload Component
// Handles file uploads for chat channels

'use client'

import React, { useState, useRef } from 'react'

interface FileUploadProps {
  channelId: string
  onFileUploaded: (file: any) => void
  onError: (error: string) => void
  className?: string
}

export function FileUpload({ channelId, onFileUploaded, onError, className = '' }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        onError('File size exceeds 10MB limit')
        return
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv',
        'application/zip', 'application/x-zip-compressed'
      ]

      if (!allowedTypes.includes(file.type)) {
        onError('File type not allowed')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/chat/channels/${channelId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message || 'Upload failed')
      }

      const result = await response.json()
      if (result.success) {
        onFileUploaded(result.data.file)
      } else {
        throw new Error(result.error?.message || 'Upload failed')
      }

    } catch (error) {
      console.error('File upload error:', error)
      onError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
      />

      {/* Upload button */}
      <button
        onClick={handleClick}
        disabled={uploading}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50"
        title="Upload file"
      >
        {uploading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        )}
      </button>

      {/* Drag and drop overlay */}
      {dragOver && (
        <div
          className="fixed inset-0 bg-blue-500 bg-opacity-20 z-50 flex items-center justify-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-dashed border-blue-500">
            <div className="text-center">
              <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-2">Drop file to upload</p>
              <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}