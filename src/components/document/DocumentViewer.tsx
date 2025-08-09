'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { 
  ZoomInIcon, 
  ZoomOutIcon, 
  ArrowLeftIcon, 
  ArrowRightIcon,
  DocumentIcon,
  DownloadIcon,
  ShareIcon,
  ChatBubbleLeftIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

interface Document {
  id: string
  name: string
  originalName?: string
  type: string
  mimeType: string
  fileSize: number
  filePath: string
  uploadedBy: string
  uploadedAt: string
  lastAccessedAt?: string
  uploader: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  folder?: {
    id: string
    name: string
    path: string
  }
}

interface Annotation {
  id: string
  type: 'highlight' | 'comment' | 'drawing'
  content?: string
  position: {
    page: number
    x: number
    y: number
    width?: number
    height?: number
  }
  style?: {
    color: string
    opacity: number
  }
  user: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface DocumentViewerProps {
  document: Document
  annotations?: Annotation[]
  enableAnnotations?: boolean
  enableDownload?: boolean
  enableShare?: boolean
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'user' | 'createdAt'>) => Promise<void>
  onAnnotationUpdate?: (annotationId: string, updates: Partial<Annotation>) => Promise<void>
  onAnnotationDelete?: (annotationId: string) => Promise<void>
  onDownload?: () => void
  onShare?: () => void
  className?: string
}

interface ViewerState {
  currentPage: number
  totalPages: number
  zoom: number
  rotation: number
  loading: boolean
  error: string | null
}

interface AnnotationState {
  creating: boolean
  creatingType: 'highlight' | 'comment' | 'drawing' | null
  selectedAnnotation: Annotation | null
  editingAnnotation: string | null
  editingContent: string
}

export function DocumentViewer({
  document,
  annotations = [],
  enableAnnotations = false,
  enableDownload = true,
  enableShare = true,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onDownload,
  onShare,
  className = ''
}: DocumentViewerProps) {
  const [viewerState, setViewerState] = useState<ViewerState>({
    currentPage: 1,
    totalPages: 1,
    zoom: 100,
    rotation: 0,
    loading: true,
    error: null
  })

  const [annotationState, setAnnotationState] = useState<AnnotationState>({
    creating: false,
    creatingType: null,
    selectedAnnotation: null,
    editingAnnotation: null,
    editingContent: ''
  })

  const viewerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load document preview
  const loadPreview = useCallback(async (page: number = 1) => {
    setViewerState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        width: '800',
        height: '600',
        format: 'png'
      })

      const response = await fetch(`/api/documents/${document.id}/preview?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load preview')
      }

      const blob = await response.blob()
      const imageUrl = URL.createObjectURL(blob)
      
      // Load image to get dimensions and display
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (canvas) {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
          }
        }
        URL.revokeObjectURL(imageUrl)
        setViewerState(prev => ({ ...prev, loading: false }))
      }
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl)
        setViewerState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Failed to load document preview' 
        }))
      }
      img.src = imageUrl

    } catch (error) {
      setViewerState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load preview' 
      }))
    }
  }, [document.id])

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= viewerState.totalPages) {
      setViewerState(prev => ({ ...prev, currentPage: page }))
      loadPreview(page)
    }
  }, [viewerState.totalPages, loadPreview])

  const previousPage = useCallback(() => {
    goToPage(viewerState.currentPage - 1)
  }, [viewerState.currentPage, goToPage])

  const nextPage = useCallback(() => {
    goToPage(viewerState.currentPage + 1)
  }, [viewerState.currentPage, goToPage])

  // Zoom functions
  const zoomIn = useCallback(() => {
    setViewerState(prev => ({ 
      ...prev, 
      zoom: Math.min(prev.zoom + 25, 300) 
    }))
  }, [])

  const zoomOut = useCallback(() => {
    setViewerState(prev => ({ 
      ...prev, 
      zoom: Math.max(prev.zoom - 25, 25) 
    }))
  }, [])

  const resetZoom = useCallback(() => {
    setViewerState(prev => ({ ...prev, zoom: 100 }))
  }, [])

  // Annotation functions
  const startAnnotation = useCallback((type: 'highlight' | 'comment' | 'drawing') => {
    setAnnotationState(prev => ({
      ...prev,
      creating: true,
      creatingType: type
    }))
  }, [])

  const cancelAnnotation = useCallback(() => {
    setAnnotationState(prev => ({
      ...prev,
      creating: false,
      creatingType: null,
      selectedAnnotation: null
    }))
  }, [])

  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!annotationState.creating || !annotationState.creatingType || !onAnnotationCreate) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    const newAnnotation: Omit<Annotation, 'id' | 'user' | 'createdAt'> = {
      type: annotationState.creatingType,
      content: annotationState.creatingType === 'comment' ? 'New comment' : undefined,
      position: {
        page: viewerState.currentPage,
        x,
        y,
        width: annotationState.creatingType === 'highlight' ? 20 : undefined,
        height: annotationState.creatingType === 'highlight' ? 5 : undefined
      },
      style: {
        color: annotationState.creatingType === 'highlight' ? '#ffff00' : '#ff0000',
        opacity: 0.7
      }
    }

    try {
      await onAnnotationCreate(newAnnotation)
      cancelAnnotation()
    } catch (error) {
      console.error('Failed to create annotation:', error)
    }
  }, [annotationState, viewerState.currentPage, onAnnotationCreate, cancelAnnotation])

  const selectAnnotation = useCallback((annotation: Annotation) => {
    setAnnotationState(prev => ({
      ...prev,
      selectedAnnotation: annotation,
      editingAnnotation: null,
      editingContent: ''
    }))
  }, [])

  const startEditAnnotation = useCallback((annotation: Annotation) => {
    setAnnotationState(prev => ({
      ...prev,
      editingAnnotation: annotation.id,
      editingContent: annotation.content || ''
    }))
  }, [])

  const saveAnnotationEdit = useCallback(async () => {
    if (!annotationState.editingAnnotation || !onAnnotationUpdate) return

    try {
      await onAnnotationUpdate(annotationState.editingAnnotation, {
        content: annotationState.editingContent
      })
      setAnnotationState(prev => ({
        ...prev,
        editingAnnotation: null,
        editingContent: ''
      }))
    } catch (error) {
      console.error('Failed to update annotation:', error)
    }
  }, [annotationState.editingAnnotation, annotationState.editingContent, onAnnotationUpdate])

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    if (!onAnnotationDelete) return

    try {
      await onAnnotationDelete(annotationId)
      setAnnotationState(prev => ({
        ...prev,
        selectedAnnotation: prev.selectedAnnotation?.id === annotationId ? null : prev.selectedAnnotation
      }))
    } catch (error) {
      console.error('Failed to delete annotation:', error)
    }
  }, [onAnnotationDelete])

  // Load initial preview
  useEffect(() => {
    loadPreview(1)
  }, [loadPreview])

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || annotations.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear existing annotations overlay
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Draw annotations for current page
    const pageAnnotations = annotations.filter(a => a.position.page === viewerState.currentPage)
    
    pageAnnotations.forEach(annotation => {
      const x = (annotation.position.x / 100) * canvas.width
      const y = (annotation.position.y / 100) * canvas.height
      
      ctx.save()
      ctx.globalAlpha = annotation.style?.opacity || 0.7
      ctx.fillStyle = annotation.style?.color || '#ff0000'
      
      if (annotation.type === 'highlight') {
        const width = ((annotation.position.width || 20) / 100) * canvas.width
        const height = ((annotation.position.height || 5) / 100) * canvas.height
        ctx.fillRect(x, y, width, height)
      } else if (annotation.type === 'comment') {
        // Draw comment marker
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, 2 * Math.PI)
        ctx.fill()
        
        // Draw comment number
        ctx.globalAlpha = 1
        ctx.fillStyle = 'white'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('C', x, y + 4)
      }
      
      ctx.restore()
    })
  }, [annotations, viewerState.currentPage])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  return (
    <div className={`document-viewer flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-3">
          <DocumentIcon className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-medium text-gray-900">{document.name}</h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(document.fileSize)} • Uploaded by {document.uploader.firstName} {document.uploader.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {enableAnnotations && (
            <>
              <Button
                size="sm"
                variant={annotationState.creatingType === 'highlight' ? 'primary' : 'outline'}
                onClick={() => startAnnotation('highlight')}
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Highlight
              </Button>
              <Button
                size="sm"
                variant={annotationState.creatingType === 'comment' ? 'primary' : 'outline'}
                onClick={() => startAnnotation('comment')}
              >
                <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                Comment
              </Button>
            </>
          )}
          
          {enableShare && (
            <Button size="sm" variant="outline" onClick={onShare}>
              <ShareIcon className="w-4 h-4 mr-1" />
              Share
            </Button>
          )}
          
          {enableDownload && (
            <Button size="sm" variant="outline" onClick={onDownload}>
              <DownloadIcon className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={previousPage}
            disabled={viewerState.currentPage <= 1}
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <Input
              type="number"
              value={viewerState.currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-16 text-center"
              min={1}
              max={viewerState.totalPages}
            />
            <span className="text-sm text-gray-500">of {viewerState.totalPages}</span>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={nextPage}
            disabled={viewerState.currentPage >= viewerState.totalPages}
          >
            <ArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOutIcon className="w-4 h-4" />
          </Button>
          
          <Button size="sm" variant="outline" onClick={resetZoom}>
            {viewerState.zoom}%
          </Button>
          
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomInIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document View */}
        <div className="flex-1 overflow-auto p-4" ref={viewerRef}>
          <div className="flex justify-center">
            <div 
              className="relative bg-white shadow-lg"
              style={{ 
                transform: `scale(${viewerState.zoom / 100}) rotate(${viewerState.rotation}deg)`,
                transformOrigin: 'center top'
              }}
            >
              {viewerState.loading && (
                <div className="flex items-center justify-center w-96 h-96 bg-gray-100">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Loading preview...</p>
                  </div>
                </div>
              )}

              {viewerState.error && (
                <div className="flex items-center justify-center w-96 h-96 bg-gray-100">
                  <div className="text-center">
                    <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-red-600">{viewerState.error}</p>
                  </div>
                </div>
              )}

              {!viewerState.loading && !viewerState.error && (
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  className={`max-w-full ${annotationState.creating ? 'cursor-crosshair' : 'cursor-default'}`}
                />
              )}
            </div>
          </div>
        </div>

        {/* Annotations Sidebar */}
        {enableAnnotations && annotations.length > 0 && (
          <div className="w-80 bg-white border-l overflow-y-auto">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">Annotations</h4>
              
              <div className="space-y-3">
                {annotations
                  .filter(a => a.position.page === viewerState.currentPage)
                  .map(annotation => (
                    <div
                      key={annotation.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        annotationState.selectedAnnotation?.id === annotation.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => selectAnnotation(annotation)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-block w-3 h-3 rounded-full ${
                              annotation.type === 'highlight' ? 'bg-yellow-400' :
                              annotation.type === 'comment' ? 'bg-blue-400' :
                              'bg-red-400'
                            }`} />
                            <span className="text-xs font-medium text-gray-600 uppercase">
                              {annotation.type}
                            </span>
                          </div>
                          
                          {annotationState.editingAnnotation === annotation.id ? (
                            <div className="space-y-2">
                              <Input
                                value={annotationState.editingContent}
                                onChange={(e) => setAnnotationState(prev => ({
                                  ...prev,
                                  editingContent: e.target.value
                                }))}
                                className="text-sm"
                                placeholder="Annotation content"
                              />
                              <div className="flex space-x-2">
                                <Button size="sm" onClick={saveAnnotationEdit}>
                                  Save
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setAnnotationState(prev => ({
                                    ...prev,
                                    editingAnnotation: null,
                                    editingContent: ''
                                  }))}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-900 mb-2">
                                {annotation.content || 'No content'}
                              </p>
                              <p className="text-xs text-gray-500">
                                By {annotation.user.firstName} {annotation.user.lastName}
                              </p>
                            </>
                          )}
                        </div>
                        
                        {annotationState.editingAnnotation !== annotation.id && (
                          <div className="flex space-x-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditAnnotation(annotation)
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteAnnotation(annotation.id)
                              }}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Annotation Creation Overlay */}
      {annotationState.creating && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium mb-4">
              Creating {annotationState.creatingType} annotation
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Click on the document where you want to place the annotation.
            </p>
            <div className="flex space-x-3">
              <Button onClick={cancelAnnotation} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}