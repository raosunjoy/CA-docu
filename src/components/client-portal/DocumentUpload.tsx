'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DocumentUploadProps {
  requestId?: string
  onUploadComplete?: (document: any) => void
  onUploadError?: (error: string) => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  result?: any
}

export default function DocumentUpload({ 
  requestId, 
  onUploadComplete, 
  onUploadError 
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    category: '',
    clientNotes: ''
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending' as const
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData()
    formData.append('file', uploadFile.file)
    formData.append('metadata', JSON.stringify({
      name: metadata.name || uploadFile.file.name,
      description: metadata.description,
      category: metadata.category,
      clientNotes: metadata.clientNotes,
      requestId
    }))

    try {
      const token = localStorage.getItem('clientToken')
      if (!token) throw new Error('No authentication token')

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f
      ))

      const xhr = new XMLHttpRequest()
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { ...f, progress }
                : f
            ))
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText)
            if (response.success) {
              setFiles(prev => prev.map(f => 
                f.id === uploadFile.id 
                  ? { ...f, status: 'completed' as const, progress: 100, result: response.data }
                  : f
              ))
              onUploadComplete?.(response.data)
              resolve(response.data)
            } else {
              throw new Error(response.error || 'Upload failed')
            }
          } else {
            throw new Error(`Upload failed with status ${xhr.status}`)
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.open('POST', '/api/client-portal/documents')
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formData)
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error' as const, error: errorMessage }
          : f
      ))
      
      onUploadError?.(errorMessage)
      throw error
    }
  }

  const uploadAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    
    for (const file of pendingFiles) {
      try {
        await uploadFile(file)
      } catch (error) {
        console.error(`Failed to upload ${file.file.name}:`, error)
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Metadata Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Document Name
            </label>
            <input
              type="text"
              id="name"
              value={metadata.name}
              onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Leave empty to use filename"
            />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={metadata.category}
              onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select category</option>
              <option value="financial">Financial Documents</option>
              <option value="legal">Legal Documents</option>
              <option value="compliance">Compliance Documents</option>
              <option value="tax">Tax Documents</option>
              <option value="audit">Audit Documents</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={metadata.description}
              onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Optional description of the document"
            />
          </div>
          
          <div className="sm:col-span-2">
            <label htmlFor="clientNotes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="clientNotes"
              rows={2}
              value={metadata.clientNotes}
              onChange={(e) => setMetadata(prev => ({ ...prev, clientNotes: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Any additional notes or comments"
            />
          </div>
        </div>
      </div>

      {/* File Drop Zone */}
      <div className="bg-white shadow rounded-lg p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag and drop files here, or click to select files'
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Supports PDF, Word, Excel, and image files up to 50MB each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Files to Upload ({files.length})
            </h3>
            <button
              onClick={uploadAllFiles}
              disabled={files.every(f => f.status !== 'pending')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload All Files
            </button>
          </div>
          
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex-shrink-0">
                  {getFileIcon(uploadFile.file) ? (
                    <img
                      src={getFileIcon(uploadFile.file)!}
                      alt=""
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    getStatusIcon(uploadFile.status)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {uploadFile.file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(uploadFile.file.size)}
                  </p>
                  
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-1">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {uploadFile.progress}% uploaded
                      </p>
                    </div>
                  )}
                  
                  {uploadFile.status === 'error' && (
                    <p className="text-sm text-red-600 mt-1">
                      {uploadFile.error}
                    </p>
                  )}
                  
                  {uploadFile.status === 'completed' && (
                    <p className="text-sm text-green-600 mt-1">
                      Upload completed successfully
                    </p>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    disabled={uploadFile.status === 'uploading'}
                    className="text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}