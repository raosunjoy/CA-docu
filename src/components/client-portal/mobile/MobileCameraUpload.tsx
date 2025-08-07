'use client'

import React, { useState, useRef, useCallback } from 'react'
import { 
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface MobileCameraUploadProps {
  onUploadComplete?: (files: File[]) => void
  onCancel?: () => void
}

export default function MobileCameraUpload({ onUploadComplete, onCancel }: MobileCameraUploadProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImages, setCapturedImages] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isUploading, setIsUploading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsCapturing(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions.')
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCapturing(false)
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const file = new File([blob], `document-${timestamp}.jpg`, { type: 'image/jpeg' })
        
        setCapturedImages(prev => [...prev, file])
        setPreviewUrls(prev => [...prev, URL.createObjectURL(blob)])
      }
    }, 'image/jpeg', 0.9)
  }, [])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    stopCamera()
    setTimeout(startCamera, 100)
  }, [startCamera, stopCamera])

  const removeImage = (index: number) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index)
      // Revoke the removed URL to free memory
      URL.revokeObjectURL(prev[index])
      return newUrls
    })
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length > 0) {
      setCapturedImages(prev => [...prev, ...imageFiles])
      
      imageFiles.forEach(file => {
        const url = URL.createObjectURL(file)
        setPreviewUrls(prev => [...prev, url])
      })
    }
  }

  const handleUpload = async () => {
    if (capturedImages.length === 0) return

    setIsUploading(true)
    try {
      // Here you would typically upload the files
      // For now, we'll just call the callback
      onUploadComplete?.(capturedImages)
      
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url))
      setCapturedImages([])
      setPreviewUrls([])
      stopCamera()
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    // Clean up preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url))
    setCapturedImages([])
    setPreviewUrls([])
    stopCamera()
    onCancel?.()
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 text-white p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="p-2 rounded-full bg-black bg-opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-medium">Document Camera</h1>
          <div className="flex items-center space-x-2">
            {capturedImages.length > 0 && (
              <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm">
                {capturedImages.length}
              </span>
            )}
            {isCapturing && (
              <button
                onClick={switchCamera}
                className="p-2 rounded-full bg-black bg-opacity-50"
              >
                <ArrowPathIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camera View */}
      {isCapturing ? (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Camera overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white border-opacity-50 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
            </div>
          </div>

          {/* Capture button */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center"
            >
              <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-400"></div>
            </button>
          </div>
        </div>
      ) : (
        /* Start screen */
        <div className="flex flex-col items-center justify-center h-full text-white p-8">
          <DocumentTextIcon className="h-24 w-24 mb-8 text-gray-400" />
          <h2 className="text-2xl font-bold mb-4 text-center">Capture Documents</h2>
          <p className="text-gray-300 text-center mb-8">
            Use your camera to capture documents or select from your photo library
          </p>
          
          <div className="space-y-4 w-full max-w-sm">
            <button
              onClick={startCamera}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              Open Camera
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg font-medium"
            >
              <PhotoIcon className="h-5 w-5 mr-2" />
              Choose from Library
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Captured images preview */}
      {capturedImages.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 bg-black bg-opacity-75 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">
              Captured Images ({capturedImages.length})
            </h3>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Upload All
                </>
              )}
            </button>
          </div>
          
          <div className="flex space-x-2 overflow-x-auto">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={url}
                  alt={`Captured ${index + 1}`}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}