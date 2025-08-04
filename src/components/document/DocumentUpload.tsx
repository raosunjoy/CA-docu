'use client'

import { useState, useCallback } from 'react'
import { Button, Alert } from '@/components/common'
import { DocumentType } from '@/types'

interface UploadedDocument {
  id: string
  name: string
  type: DocumentType
  status: string
  fileSize: number
  mimeType: string
  createdAt: string
}

interface DocumentUploadProps {
  folderId?: string
  onUploadComplete: (document: UploadedDocument) => void
  onCancel?: () => void
  maxFileSize?: number // in MB
  acceptedTypes?: string[]
}

interface UploadProgress {
  fileName: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

const DEFAULT_ACCEPTED_TYPES = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.txt',
  '.csv'
]

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const DOCUMENT_TYPE_MAP = {
  pdf: DocumentType.PDF,
  doc: DocumentType.WORD,
  docx: DocumentType.WORD,
  xls: DocumentType.EXCEL,
  xlsx: DocumentType.EXCEL,
  csv: DocumentType.EXCEL,
  png: DocumentType.IMAGE,
  jpg: DocumentType.IMAGE,
  jpeg: DocumentType.IMAGE,
  gif: DocumentType.IMAGE,
  bmp: DocumentType.IMAGE,
  webp: DocumentType.IMAGE
} as const

const MIME_TYPE_PATTERNS = {
  pdf: /pdf/i,
  word: /(word|document)/i,
  excel: /(excel|spreadsheet)/i,
  image: /image/i
} as const

function getDocumentTypeByExtension(extension: string): DocumentType | null {
  return DOCUMENT_TYPE_MAP[extension as keyof typeof DOCUMENT_TYPE_MAP] || null
}

function getDocumentTypeByMimeType(mimeType: string): DocumentType | null {
  if (MIME_TYPE_PATTERNS.pdf.test(mimeType)) return DocumentType.PDF
  if (MIME_TYPE_PATTERNS.word.test(mimeType)) return DocumentType.WORD
  if (MIME_TYPE_PATTERNS.excel.test(mimeType)) return DocumentType.EXCEL
  if (MIME_TYPE_PATTERNS.image.test(mimeType)) return DocumentType.IMAGE
  return null
}

function getDocumentType(file: File): DocumentType {
  const mimeType = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() || ''

  const typeByExtension = getDocumentTypeByExtension(extension)
  if (typeByExtension) return typeByExtension

  const typeByMimeType = getDocumentTypeByMimeType(mimeType)
  if (typeByMimeType) return typeByMimeType

  return DocumentType.OTHER
}

async function uploadDocument(
  file: File, 
  metadata: { name?: string; description?: string; folderId?: string; type?: DocumentType },
  onProgress: (progress: number) => void
): Promise<UploadedDocument> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('metadata', JSON.stringify(metadata))

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100)
        onProgress(progress)
      }
    }

    xhr.onload = () => {
      if (xhr.status === 201) {
        const response = JSON.parse(xhr.responseText)
        resolve(response.data.document)
      } else {
        const error = JSON.parse(xhr.responseText)
        reject(new Error(error.error?.message || 'Upload failed'))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Network error during upload'))
    }

    xhr.open('POST', '/api/documents')
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`)
    xhr.send(formData)
  })
}

const FilePreview = ({ file, onRemove }: { file: File; onRemove: () => void }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
          <span className="text-xs font-medium text-blue-600">
            {file.name.split('.').pop()?.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
      </div>
    </div>
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={onRemove}
    >
      Remove
    </Button>
  </div>
)

const UploadProgressItem = ({ progress }: { progress: UploadProgress }) => (
  <div className="p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-gray-900 truncate">
        {progress.fileName}
      </span>
      <span className="text-xs text-gray-500">
        {progress.status === 'uploading' ? `${progress.progress}%` : progress.status}
      </span>
    </div>
    
    {progress.status === 'uploading' && (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    )}
    
    {progress.status === 'error' && (
      <p className="text-xs text-red-600 mt-1">{progress.error}</p>
    )}
  </div>
)

const UploadArea = ({ 
  dragOver, 
  acceptedTypes, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onFileSelect 
}: {
  dragOver: boolean
  acceptedTypes: string[]
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div
    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
      dragOver 
        ? 'border-blue-400 bg-blue-50' 
        : 'border-gray-300 hover:border-gray-400'
    }`}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
  >
    <input
      type="file"
      multiple
      accept={acceptedTypes.join(',')}
      onChange={onFileSelect}
      className="hidden"
      id="file-upload"
    />
    <label htmlFor="file-upload" className="cursor-pointer">
      <div className="text-gray-600">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-lg font-medium mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm">
          Supported formats: {acceptedTypes.join(', ')}
        </p>
      </div>
    </label>
  </div>
)

const SelectedFilesList = ({ 
  selectedFiles, 
  onRemoveFile 
}: {
  selectedFiles: File[]
  onRemoveFile: (index: number) => void
}) => (
  <div className="mt-6">
    <h4 className="text-sm font-medium text-gray-900 mb-3">
      Selected Files ({selectedFiles.length})
    </h4>
    <div className="space-y-2">
      {selectedFiles.map((file, index) => (
        <FilePreview
          key={`${file.name}-${index}`}
          file={file}
          onRemove={() => onRemoveFile(index)}
        />
      ))}
    </div>
  </div>
)

const UploadProgressList = ({ 
  uploadProgress 
}: {
  uploadProgress: UploadProgress[]
}) => (
  <div className="mt-6">
    <h4 className="text-sm font-medium text-gray-900 mb-3">
      Upload Progress
    </h4>
    <div className="space-y-2">
      {uploadProgress.map((progress, index) => (
        <UploadProgressItem
          key={`${progress.fileName}-${index}`}
          progress={progress}
        />
      ))}
    </div>
  </div>
)

const UploadActions = ({ 
  onCancel, 
  onUpload, 
  uploading, 
  selectedFiles 
}: {
  onCancel?: () => void
  onUpload: () => void
  uploading: boolean
  selectedFiles: File[]
}) => (
  <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
    {onCancel && (
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={uploading}
      >
        Cancel
      </Button>
    )}
    <Button
      type="button"
      onClick={onUpload}
      disabled={selectedFiles.length === 0 || uploading}
      loading={uploading}
    >
      {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`}
    </Button>
  </div>
)

const useFileValidation = (maxFileSize: number, acceptedTypes: string[]) => {
  const validateFiles = useCallback((files: File[]) => {
    const errors: string[] = []
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name} is too large. Maximum size is ${maxFileSize}MB.`)
        return false
      }
      
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!acceptedTypes.includes(extension)) {
        errors.push(`${file.name} is not a supported file type.`)
        return false
      }
      
      return true
    })

    return { validFiles, errors }
  }, [maxFileSize, acceptedTypes])

  return { validateFiles }
}

const useUploadProcess = (
  folderId?: string,
  onUploadComplete?: (document: UploadedDocument) => void
) => {
  const processUploads = useCallback(async (
    files: File[],
    setUploading: (loading: boolean) => void,
    setError: (error: string) => void,
    setUploadProgress: React.Dispatch<React.SetStateAction<UploadProgress[]>>
  ) => {
    if (files.length === 0) return

    setUploading(true)
    setError('')
    setUploadProgress(files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading' as const
    })))

    try {
      const uploadPromises = files.map(async (file, index) => {
        try {
          const metadata = {
            name: file.name,
            ...(folderId && { folderId }),
            type: getDocumentType(file)
          }

          const document = await uploadDocument(file, metadata, (progress) => {
            setUploadProgress(prev => prev.map((item, i) => 
              i === index ? { ...item, progress } : item
            ))
          })

          setUploadProgress(prev => prev.map((item, i) => 
            i === index ? { ...item, status: 'success' as const, progress: 100 } : item
          ))

          return document
        } catch (error) {
          setUploadProgress(prev => prev.map((item, i) => 
            i === index ? { 
              ...item, 
              status: 'error' as const, 
              error: error instanceof Error ? error.message : 'Upload failed'
            } : item
          ))
          throw error
        }
      })

      const results = await Promise.allSettled(uploadPromises)
      const successful = results
        .filter((result): result is PromiseFulfilledResult<UploadedDocument> => result.status === 'fulfilled')
        .map(result => result.value)

      successful.forEach(document => onUploadComplete?.(document))

    } catch {
      setError('Some uploads failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [folderId, onUploadComplete])

  return { processUploads }
}

const useFileUpload = (
  folderId?: string,
  maxFileSize = 50,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  onUploadComplete?: (document: UploadedDocument) => void
) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [error, setError] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)

  const { validateFiles } = useFileValidation(maxFileSize, acceptedTypes)
  const { processUploads } = useUploadProcess(folderId, onUploadComplete)

  const addFiles = useCallback((files: File[]) => {
    setError('')
    const { validFiles, errors } = validateFiles(files)
    
    if (errors.length > 0) {
      setError(errors[0])
    }

    setSelectedFiles(prev => [...prev, ...validFiles])
  }, [validateFiles])

  const handleUpload = useCallback(async () => {
    await processUploads(selectedFiles, setUploading, setError, setUploadProgress)
    
    setTimeout(() => {
      const hasErrors = uploadProgress.some(p => p.status === 'error')
      if (!hasErrors) {
        setSelectedFiles([])
        setUploadProgress([])
      }
    }, 2000)
  }, [selectedFiles, processUploads, uploadProgress])

  return {
    selectedFiles,
    setSelectedFiles,
    uploading,
    uploadProgress,
    error,
    dragOver,
    setDragOver,
    addFiles,
    handleUpload
  }
}

const DocumentUploadHeader = ({ maxFileSize }: { maxFileSize: number }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      Upload Documents
    </h3>
    <p className="text-sm text-gray-600">
      Drag and drop files here or click to select files. 
      Maximum file size: {maxFileSize}MB
    </p>
  </div>
)

const DocumentUploadContent = ({
  dragOver,
  acceptedTypes,
  selectedFiles,
  uploadProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemoveFile
}: {
  dragOver: boolean
  acceptedTypes: string[]
  selectedFiles: File[]
  uploadProgress: UploadProgress[]
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
}) => (
  <>
    <UploadArea
      dragOver={dragOver}
      acceptedTypes={acceptedTypes}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onFileSelect={onFileSelect}
    />

    {selectedFiles.length > 0 && (
      <SelectedFilesList
        selectedFiles={selectedFiles}
        onRemoveFile={onRemoveFile}
      />
    )}

    {uploadProgress.length > 0 && (
      <UploadProgressList uploadProgress={uploadProgress} />
    )}
  </>
)

const useDragAndDropHandlers = (
  setDragOver: (dragOver: boolean) => void,
  addFiles: (files: File[]) => void
) => {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [setDragOver])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [setDragOver])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [addFiles, setDragOver])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      addFiles(files)
    }
  }

  return { handleDragOver, handleDragLeave, handleDrop, handleFileSelect }
}

export function DocumentUpload({ 
  folderId, 
  onUploadComplete, 
  onCancel,
  maxFileSize = 50,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES
}: DocumentUploadProps) {
  const {
    selectedFiles,
    setSelectedFiles,
    uploading,
    uploadProgress,
    error,
    dragOver,
    setDragOver,
    addFiles,
    handleUpload
  } = useFileUpload(folderId, maxFileSize, acceptedTypes, onUploadComplete)

  const { handleDragOver, handleDragLeave, handleDrop, handleFileSelect } = 
    useDragAndDropHandlers(setDragOver, addFiles)

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg border">
      <DocumentUploadHeader maxFileSize={maxFileSize} />

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <DocumentUploadContent
        dragOver={dragOver}
        acceptedTypes={acceptedTypes}
        selectedFiles={selectedFiles}
        uploadProgress={uploadProgress}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
        onRemoveFile={removeFile}
      />

      <UploadActions
        {...(onCancel && { onCancel })}
        onUpload={handleUpload}
        uploading={uploading}
        selectedFiles={selectedFiles}
      />
    </div>
  )
}