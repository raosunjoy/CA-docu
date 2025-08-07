'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import MobileClientLayout from '@/components/client-portal/mobile/MobileClientLayout'
import MobileCameraUpload from '@/components/client-portal/mobile/MobileCameraUpload'
import { 
  CameraIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function CameraUploadPage() {
  const [showCamera, setShowCamera] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const router = useRouter()

  const handleUploadComplete = async (files: File[]) => {
    setIsUploading(true)
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) throw new Error('No authentication token')

      // Upload each file
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('metadata', JSON.stringify({
          name: file.name,
          description: 'Captured via mobile camera',
          category: 'mobile_capture'
        }))

        const response = await fetch('/api/client-portal/documents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        return response.json()
      })

      await Promise.all(uploadPromises)
      setUploadedFiles(files)
      setUploadSuccess(true)
      setShowCamera(false)
      
      // Auto-redirect after success
      setTimeout(() => {
        router.push('/client-portal/documents')
      }, 2000)

    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setShowCamera(false)
  }

  if (showCamera) {
    return (
      <MobileCameraUpload
        onUploadComplete={handleUploadComplete}
        onCancel={handleCancel}
      />
    )
  }

  if (uploadSuccess) {
    return (
      <MobileClientLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
          <p className="text-gray-600 mb-4">
            {uploadedFiles.length} document{uploadedFiles.length > 1 ? 's' : ''} uploaded successfully
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to documents...
          </p>
        </div>
      </MobileClientLayout>
    )
  }

  return (
    <MobileClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <CameraIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Document Camera</h1>
          <p className="mt-2 text-gray-600">
            Quickly capture and upload documents using your mobile camera
          </p>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Features</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <strong>High-quality capture:</strong> Automatically optimized for document scanning
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <strong>Multiple documents:</strong> Capture multiple pages in one session
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <strong>Instant upload:</strong> Documents are uploaded immediately after capture
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">
                  <strong>Offline support:</strong> Works even when you're offline
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for best results:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Ensure good lighting</li>
            <li>• Keep the document flat and straight</li>
            <li>• Fill the frame with the document</li>
            <li>• Hold the camera steady</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={() => setShowCamera(true)}
            disabled={isUploading}
            className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Uploading...
              </>
            ) : (
              <>
                <CameraIcon className="h-6 w-6 mr-3" />
                Open Camera
              </>
            )}
          </button>
        </div>

        {/* Alternative Options */}
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Or</p>
          <button
            onClick={() => router.push('/client-portal/documents')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Upload from Files
          </button>
        </div>
      </div>
    </MobileClientLayout>
  )
}