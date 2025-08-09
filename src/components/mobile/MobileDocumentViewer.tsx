/**
 * Mobile Document Viewer Component
 * Touch-optimized document viewing with zoom and annotation
 */

'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Document } from '@/types'
import { Button } from '@/components/common/Button'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Share2, 
  Edit3,
  MessageSquare,
  Bookmark,
  X,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Maximize,
  Minimize,
  FileText
} from 'lucide-react'

interface MobileDocumentViewerProps {
  document: Document
  onClose: () => void
  onAnnotate?: (annotation: DocumentAnnotation) => void
  onComment?: (comment: string) => void
  isOpen: boolean
}

interface DocumentAnnotation {
  id: string
  type: 'highlight' | 'note' | 'drawing'
  x: number
  y: number
  width?: number
  height?: number
  content: string
  color: string
}

interface TouchState {
  scale: number
  translateX: number
  translateY: number
  lastTouchDistance: number
  isDragging: boolean
  startX: number
  startY: number
}

export function MobileDocumentViewer({
  document,
  onClose,
  onAnnotate,
  onComment,
  isOpen
}: MobileDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [touchState, setTouchState] = useState<TouchState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
    lastTouchDistance: 0,
    isDragging: false,
    startX: 0,
    startY: 0
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([])
  const [annotationMode, setAnnotationMode] = useState<'none' | 'highlight' | 'note'>('none')
  
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    setShowControls(true)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isFullscreen) {
        setShowControls(false)
      }
    }, 3000)
  }, [isFullscreen])

  // Handle touch events for zoom and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    resetControlsTimeout()

    if (e.touches.length === 1) {
      // Single touch - start dragging
      const touch = e.touches[0]
      setTouchState(prev => ({
        ...prev,
        isDragging: true,
        startX: touch.clientX - prev.translateX,
        startY: touch.clientY - prev.translateY
      }))
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      setTouchState(prev => ({
        ...prev,
        lastTouchDistance: distance,
        isDragging: false
      }))
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()

    if (e.touches.length === 1 && touchState.isDragging) {
      // Single touch - pan
      const touch = e.touches[0]
      setTouchState(prev => ({
        ...prev,
        translateX: touch.clientX - prev.startX,
        translateY: touch.clientY - prev.startY
      }))
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

      if (touchState.lastTouchDistance > 0) {
        const scaleChange = distance / touchState.lastTouchDistance
        const newScale = Math.max(0.5, Math.min(5, touchState.scale * scaleChange))
        
        setTouchState(prev => ({
          ...prev,
          scale: newScale,
          lastTouchDistance: distance
        }))
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    
    setTouchState(prev => ({
      ...prev,
      isDragging: false,
      lastTouchDistance: 0
    }))
  }

  // Zoom controls
  const zoomIn = () => {
    setTouchState(prev => ({
      ...prev,
      scale: Math.min(5, prev.scale * 1.2)
    }))
  }

  const zoomOut = () => {
    setTouchState(prev => ({
      ...prev,
      scale: Math.max(0.5, prev.scale / 1.2)
    }))
  }

  const resetZoom = () => {
    setTouchState(prev => ({
      ...prev,
      scale: 1,
      translateX: 0,
      translateY: 0
    }))
  }

  // Page navigation
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
      resetZoom()
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
      resetZoom()
    }
  }

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Handle annotation
  const handleAnnotationClick = (e: React.MouseEvent) => {
    if (annotationMode === 'none') return

    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const annotation: DocumentAnnotation = {
      id: `annotation_${Date.now()}`,
      type: annotationMode === 'highlight' ? 'highlight' : 'note',
      x,
      y,
      content: annotationMode === 'highlight' ? 'Highlighted text' : 'Note',
      color: annotationMode === 'highlight' ? '#ffeb3b' : '#2196f3'
    }

    setAnnotations(prev => [...prev, annotation])
    onAnnotate?.(annotation)
    setAnnotationMode('none')
  }

  // Get document preview URL
  const getDocumentUrl = () => {
    // In a real app, this would return the actual document URL
    return `/api/documents/${document.id}/preview`
  }

  if (!isOpen) return null

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header Controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-full"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="text-white">
              <h2 className="font-medium truncate max-w-48">{document.name}</h2>
              <p className="text-sm text-white/70">
                Page {currentPage} of {totalPages}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnnotationMode(annotationMode === 'highlight' ? 'none' : 'highlight')}
              className={`p-2 rounded-full ${
                annotationMode === 'highlight' 
                  ? 'bg-yellow-500 text-black' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Edit3 className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => setAnnotationMode(annotationMode === 'note' ? 'none' : 'note')}
              className={`p-2 rounded-full ${
                annotationMode === 'note' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:bg-white/20 rounded-full"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={contentRef}
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `scale(${touchState.scale}) translate(${touchState.translateX}px, ${touchState.translateY}px)`,
            transformOrigin: 'center center',
            transition: touchState.isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          onClick={handleAnnotationClick}
        >
          {/* Document Preview */}
          {document.mimeType.startsWith('image/') ? (
            <img
              src={getDocumentUrl()}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-white flex items-center justify-center">
              <iframe
                src={getDocumentUrl()}
                className="w-full h-full border-none"
                title={document.name}
              />
            </div>
          )}

          {/* Annotations Overlay */}
          {annotations.map((annotation) => (
            <div
              key={annotation.id}
              className="absolute pointer-events-none"
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {annotation.type === 'highlight' ? (
                <div
                  className="w-8 h-8 rounded-full opacity-70"
                  style={{ backgroundColor: annotation.color }}
                />
              ) : (
                <div className="bg-blue-500 text-white p-2 rounded-lg text-xs max-w-32">
                  {annotation.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Page Navigation */}
        {totalPages > 1 && (
          <>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="flex items-center justify-center gap-6 p-6">
          <button
            onClick={zoomOut}
            className="p-3 text-white hover:bg-white/20 rounded-full"
          >
            <ZoomOut className="h-6 w-6" />
          </button>
          
          <button
            onClick={resetZoom}
            className="px-4 py-2 text-white hover:bg-white/20 rounded-full text-sm"
          >
            {Math.round(touchState.scale * 100)}%
          </button>
          
          <button
            onClick={zoomIn}
            className="p-3 text-white hover:bg-white/20 rounded-full"
          >
            <ZoomIn className="h-6 w-6" />
          </button>
          
          <div className="w-px h-8 bg-white/30" />
          
          <button
            onClick={() => {/* Handle download */}}
            className="p-3 text-white hover:bg-white/20 rounded-full"
          >
            <Download className="h-6 w-6" />
          </button>
          
          <button
            onClick={() => {/* Handle share */}}
            className="p-3 text-white hover:bg-white/20 rounded-full"
          >
            <Share2 className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Annotation Mode Indicator */}
      {annotationMode !== 'none' && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm">
          {annotationMode === 'highlight' ? 'Tap to highlight' : 'Tap to add note'}
        </div>
      )}
    </div>
  )
}

/**
 * Mobile Document Thumbnail Component
 */
interface MobileDocumentThumbnailProps {
  document: Document
  onClick: () => void
  className?: string
}

export function MobileDocumentThumbnail({
  document,
  onClick,
  className = ''
}: MobileDocumentThumbnailProps) {
  const getFileIcon = () => {
    if (document.mimeType.startsWith('image/')) {
      return <img src={document.thumbnailPath || document.filePath} alt={document.name} className="w-full h-full object-cover" />
    }
    
    // Return appropriate icon based on file type
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${className}`}
    >
      <div className="aspect-[3/4] relative">
        {getFileIcon()}
        
        {/* File Type Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          {document.name.split('.').pop()?.toUpperCase()}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate text-sm">
          {document.name}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(document.uploadedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}