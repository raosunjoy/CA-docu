'use client'

import React, { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/atoms/Modal'

interface DocumentUploadFile {
  id: string
  file: File
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  aiAnalysis?: {
    documentType: string
    confidence: number
    extractedData: Record<string, any>
    suggestedTags: string[]
    suggestedName: string
    riskLevel: 'low' | 'medium' | 'high'
  }
  error?: string
}

interface AIDocumentUploadProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: (documents: any[]) => void
}

export const AIDocumentUpload: React.FC<AIDocumentUploadProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const [uploadFiles, setUploadFiles] = useState<DocumentUploadFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    
    const acceptedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png',
      'image/jpeg',
      'image/gif'
    ]
    
    const validFiles = Array.from(files).filter(file => 
      acceptedTypes.includes(file.type) && file.size <= 50 * 1024 * 1024
    )
    
    const newFiles: DocumentUploadFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0
    }))
    
    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const processDocuments = async () => {
    setIsProcessing(true)
    
    for (const uploadFile of uploadFiles) {
      if (uploadFile.status !== 'pending') continue
      
      try {
        // Update status to processing
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'processing', progress: 10 }
            : f
        ))

        // Step 1: Upload file
        const formData = new FormData()
        formData.append('file', uploadFile.file)
        formData.append('userId', 'current-user') // Replace with actual user ID
        
        const uploadResponse = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          throw new Error('Upload failed')
        }

        const uploadResult = await uploadResponse.json()
        
        // Update progress
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 50 }
            : f
        ))

        // Step 2: AI Analysis
        const analysisResponse = await fetch('/api/documents/ai-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            documentId: uploadResult.id,
            fileName: uploadFile.file.name,
            fileType: uploadFile.file.type
          })
        })

        if (!analysisResponse.ok) {
          throw new Error('AI analysis failed')
        }

        const aiAnalysis = await analysisResponse.json()
        
        // Update with AI analysis results
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'completed', 
                progress: 100,
                aiAnalysis
              }
            : f
        ))

      } catch (error) {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        ))
      }
    }
    
    setIsProcessing(false)
  }

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleComplete = () => {
    const completedDocuments = uploadFiles
      .filter(f => f.status === 'completed')
      .map(f => ({
        name: f.aiAnalysis?.suggestedName || f.file.name,
        type: f.aiAnalysis?.documentType || 'Unknown',
        tags: f.aiAnalysis?.suggestedTags || [],
        extractedData: f.aiAnalysis?.extractedData || {},
        riskLevel: f.aiAnalysis?.riskLevel || 'low'
      }))
    
    onUploadComplete(completedDocuments)
    setUploadFiles([])
    onClose()
  }

  const getStatusIcon = (status: DocumentUploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />
      case 'processing':
        return (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI-Powered Document Upload" size="xl">
      <div className="space-y-6">
        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-gray-600 mb-4">
                or click to browse files
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span>🤖 AI-powered analysis</span>
                <span>•</span>
                <span>📄 PDF, DOC, XLS, Images</span>
                <span>•</span>
                <span>📊 Max 50MB per file</span>
              </div>
            </div>
          </div>
        </div>

        {/* File List */}
        {uploadFiles.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Files to Process</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploadFiles.map(uploadFile => (
                <Card key={uploadFile.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(uploadFile.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {uploadFile.aiAnalysis?.suggestedName || uploadFile.file.name}
                        </h4>
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB</span>
                        {uploadFile.aiAnalysis && (
                          <>
                            <span>•</span>
                            <span>{uploadFile.aiAnalysis.documentType}</span>
                            <span>•</span>
                            <span>{uploadFile.aiAnalysis.confidence}% confidence</span>
                          </>
                        )}
                      </div>

                      {uploadFile.status === 'processing' && (
                        <div className="mt-2">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadFile.aiAnalysis && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge 
                              className={getRiskBadgeColor(uploadFile.aiAnalysis.riskLevel)}
                              size="sm"
                            >
                              {uploadFile.aiAnalysis.riskLevel.toUpperCase()} RISK
                            </Badge>
                            {uploadFile.aiAnalysis.suggestedTags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" size="sm">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          
                          {Object.keys(uploadFile.aiAnalysis.extractedData).length > 0 && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Extracted: </span>
                              {Object.keys(uploadFile.aiAnalysis.extractedData).slice(0, 3).join(', ')}
                              {Object.keys(uploadFile.aiAnalysis.extractedData).length > 3 && '...'}
                            </div>
                          )}
                        </div>
                      )}

                      {uploadFile.error && (
                        <div className="mt-2 text-xs text-red-600">
                          Error: {uploadFile.error}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <div className="space-x-2">
            {uploadFiles.length > 0 && !isProcessing && (
              <Button 
                onClick={processDocuments}
                disabled={uploadFiles.every(f => f.status !== 'pending')}
              >
                🤖 Process with AI
              </Button>
            )}
            
            {uploadFiles.some(f => f.status === 'completed') && (
              <Button onClick={handleComplete}>
                Complete Upload ({uploadFiles.filter(f => f.status === 'completed').length})
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}