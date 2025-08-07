/**
 * Mobile Document Capture Component
 * Camera-based document capture and upload for mobile devices
 */

'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Crop, 
  Check, 
  X,
  FlashOn,
  FlashOff,
  SwitchCamera,
  FileText,
  Image as ImageIcon,
  Scan
} from 'lucide-react'

interface MobileDocumentCaptureProps {
  onCapture: (file: File, metadata?: DocumentCaptureMetadata) => void
  onCancel: () => void
  isOpen: boolean
  acceptedTypes?: string[]
}

interface DocumentCaptureMetadata {
  type: 'photo' | 'scan' | 'upload'
  quality: 'low' | 'medium' | 'high'
  orientation: number
  timestamp: Date
  location?: GeolocationPosition
}

export function MobileDocumentCapture({
  onCapture,
  onCancel,
  isOpen,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx']
}: MobileDocumentCaptureProps) {
  const [mode, setMode] = useState<'camera' | 'upload' | 'preview'>('camera')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { ideal: 4/3 }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (error) {
      console.error('Camera initialization failed:', error)
      alert('Camera access denied or not available')
    }
  }, [facingMode])

  // Cleanup camera
  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  // Initialize camera when component opens
  React.useEffect(() => {
    if (isOpen && mode === 'camera') {
      initializeCamera()
    }
    
    return () => {
      cleanupCamera()
    }
  }, [isOpen, mode, initializeCamera, cleanupCamera])

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return

      const imageUrl = URL.createObjectURL(blob)
      setCapturedImage(imageUrl)
      setMode('preview')
      
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
    }, 'image/jpeg', 0.9)
  }

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage)
      setCapturedImage(null)
    }
    setMode('camera')
  }

  const confirmCapture = async () => {
    if (!capturedImage) return

    setIsProcessing(true)
    
    try {
      // Convert captured image to file
      const response = await fetch(capturedImage)
      const blob = await response.blob()
      const file = new File([blob], `document_${Date.now()}.jpg`, { type: 'image/jpeg' })

      // Get location if available
      let location: GeolocationPosition | undefined
      if ('geolocation' in navigator) {
        try {
          location = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
        } catch (error) {
          console.log('Location access denied or unavailable')
        }
      }

      const metadata: DocumentCaptureMetadata = {
        type: 'photo',
        quality: 'high',
        orientation: 0,
        timestamp: new Date(),
        location
      }

      onCapture(file, metadata)
    } catch (error) {
      console.error('Failed to process captured image:', error)
      alert('Failed to process image. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const metadata: DocumentCaptureMetadata = {
      type: 'upload',
      quality: 'high',
      orientation: 0,
      timestamp: new Date()
    }

    onCapture(file, metadata)
  }

  const toggleFlash = async () => {
    if (!streamRef.current) return

    try {
      const track = streamRef.current.getVideoTracks()[0]
      const capabilities = track.getCapabilities()
      
      if (capabilities.torch) {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashOn } as any]
        })
        setIsFlashOn(!isFlashOn)
      }
    } catch (error) {
      console.error('Flash control failed:', error)
    }
  }

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {mode === 'camera' && (
        <>
          {/* Camera View */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Camera Overlay */}
            <div className="absolute inset-0 flex flex-col">
              {/* Top Controls */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                <button
                  onClick={onCancel}
                  className="p-2 text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-6 w-6" />
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFlash}
                    className="p-2 text-white hover:bg-white/20 rounded-full"
                  >
                    {isFlashOn ? <FlashOn className="h-6 w-6" /> : <FlashOff className="h-6 w-6" />}
                  </button>
                  
                  <button
                    onClick={switchCamera}
                    className="p-2 text-white hover:bg-white/20 rounded-full"
                  >
                    <SwitchCamera className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Center Guide */}
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="border-2 border-white/50 rounded-lg w-full max-w-sm aspect-[3/4] relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/70 text-center">
                      <Scan className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">Position document within frame</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="p-6 bg-gradient-to-t from-black/50 to-transparent">
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={() => setMode('upload')}
                    className="p-4 text-white hover:bg-white/20 rounded-full"
                  >
                    <Upload className="h-6 w-6" />
                  </button>
                  
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </button>
                  
                  <div className="w-12 h-12" /> {/* Spacer */}
                </div>
                
                <p className="text-white/70 text-center text-sm mt-4">
                  Tap to capture document
                </p>
              </div>
            </div>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}

      {mode === 'upload' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900">
          <div className="text-center mb-8">
            <Upload className="h-16 w-16 text-white mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Upload Document
            </h2>
            <p className="text-gray-300">
              Choose a file from your device
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="h-20 flex flex-col items-center gap-2"
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Documents</span>
            </Button>
            
            <Button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*'
                  fileInputRef.current.click()
                }
              }}
              className="h-20 flex flex-col items-center gap-2"
            >
              <ImageIcon className="h-6 w-6" />
              <span className="text-sm">Photos</span>
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => setMode('camera')}
            className="mt-8"
          >
            <Camera className="h-4 w-4 mr-2" />
            Back to Camera
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {mode === 'preview' && capturedImage && (
        <div className="flex-1 flex flex-col bg-black">
          {/* Preview Image */}
          <div className="flex-1 flex items-center justify-center p-4">
            <img
              src={capturedImage}
              alt="Captured document"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Preview Controls */}
          <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                onClick={retakePhoto}
                className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
              
              <Button
                onClick={confirmCapture}
                loading={isProcessing}
                className="flex items-center gap-2 px-8"
              >
                <Check className="h-4 w-4" />
                Use Photo
              </Button>
            </div>
            
            <p className="text-white/70 text-center text-sm mt-4">
              Review your document capture
            </p>
          </div>
        </div>
      )}
    </div>
  )
}