'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Alert, Input } from '@/components/common'
import { DocumentType, DocumentStatus } from '@/types'

interface Document {
  id: string
  name: string
  originalName?: string
  description?: string
  type: DocumentType
  status: DocumentStatus
  fileSize: number
  mimeType: string
  createdAt: string
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
  _count: {
    annotations: number
    comments: number
    shares: number
  }
}

interface DocumentListProps {
  folderId?: string
  onDocumentSelect?: (document: Document) => void
  onDocumentDelete?: (documentId: string) => void
  showActions?: boolean
  selectable?: boolean
}

interface Filters {
  search: string
  type: DocumentType | ''
  status: DocumentStatus | ''
}

const DOCUMENT_TYPE_LABELS = {
  [DocumentType.PDF]: 'PDF',
  [DocumentType.WORD]: 'Word',
  [DocumentType.EXCEL]: 'Excel',
  [DocumentType.IMAGE]: 'Image',
  [DocumentType.OTHER]: 'Other'
}

const DOCUMENT_STATUS_LABELS = {
  [DocumentStatus.DRAFT]: 'Draft',
  [DocumentStatus.ACTIVE]: 'Active',
  [DocumentStatus.ARCHIVED]: 'Archived',
  [DocumentStatus.DELETED]: 'Deleted'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getDocumentIcon(type: DocumentType): string {
  switch (type) {
    case DocumentType.PDF:
      return '📄'
    case DocumentType.WORD:
      return '📝'
    case DocumentType.EXCEL:
      return '📊'
    case DocumentType.IMAGE:
      return '🖼️'
    default:
      return '📎'
  }
}

const DocumentStatusBadge = ({ status }: { status: DocumentStatus }) => {
  const getStatusStyles = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.ACTIVE:
        return 'bg-green-100 text-green-800'
      case DocumentStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800'
      case DocumentStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusStyles(status)}`}>
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  )
}

const DocumentMetadata = ({ document }: { document: Document }) => (
  <>
    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
      <span>{DOCUMENT_TYPE_LABELS[document.type]}</span>
      <span>{formatFileSize(document.fileSize)}</span>
      {document.folder && (
        <span>📁 {document.folder.path}</span>
      )}
    </div>
    
    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
      <span>By {document.uploader.firstName} {document.uploader.lastName}</span>
      <span>{formatDate(document.createdAt)}</span>
      {document.lastAccessedAt && (
        <span>Last accessed {formatDate(document.lastAccessedAt)}</span>
      )}
    </div>
    
    {(document._count.annotations > 0 || document._count.comments > 0 || document._count.shares > 0) && (
      <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
        {document._count.annotations > 0 && (
          <span>✏️ {document._count.annotations} annotations</span>
        )}
        {document._count.comments > 0 && (
          <span>💬 {document._count.comments} comments</span>
        )}
        {document._count.shares > 0 && (
          <span>🔗 {document._count.shares} shares</span>
        )}
      </div>
    )}
  </>
)

const DocumentActions = ({ 
  document, 
  onSelect, 
  onDelete, 
  deleting 
}: {
  document: Document
  onSelect?: (document: Document) => void
  onDelete: () => void
  deleting: boolean
}) => (
  <div className="flex items-center space-x-2 ml-4">
    <Button
      variant="secondary"
      size="sm"
      onClick={() => onSelect?.(document)}
    >
      View
    </Button>
    <Button
      variant="secondary"
      size="sm"
      onClick={onDelete}
      disabled={deleting}
      loading={deleting}
    >
      Delete
    </Button>
  </div>
)

const useDocumentDelete = (documentId: string, onDelete?: (documentId: string) => void) => {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this document?`)) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        onDelete?.(documentId)
      } else {
        throw new Error('Failed to delete document')
      }
    } catch {
      alert('Failed to delete document. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return { deleting, handleDelete }
}

const DocumentContent = ({ 
  document
}: {
  document: Document
}) => (
  <div className="flex items-start space-x-3 flex-1">
    <div className="flex-shrink-0 text-2xl">
      {getDocumentIcon(document.type)}
    </div>
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {document.name}
        </h3>
        <DocumentStatusBadge status={document.status} />
      </div>
      
      {document.description && (
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
          {document.description}
        </p>
      )}
      
      <DocumentMetadata document={document} />
    </div>
  </div>
)

const DocumentItem = ({ 
  document, 
  onSelect, 
  onDelete, 
  showActions = true, 
  selectable = false 
}: {
  document: Document
  onSelect?: (document: Document) => void
  onDelete?: (documentId: string) => void
  showActions?: boolean
  selectable?: boolean
}) => {
  const { deleting, handleDelete } = useDocumentDelete(document.id, onDelete)

  return (
    <div className={`p-4 border rounded-lg transition-colors ${
      selectable ? 'cursor-pointer hover:bg-gray-50' : ''
    }`}
    onClick={selectable ? () => onSelect?.(document) : undefined}
    >
      <div className="flex items-start justify-between">
        <DocumentContent 
          document={document}
        />
        
        {showActions && (
          <DocumentActions 
            document={document}
            {...(onSelect && { onSelect })}
            onDelete={handleDelete}
            deleting={deleting}
          />
        )}
      </div>
    </div>
  )
}

const FilterControls = ({ 
  filters, 
  onFiltersChange 
}: { 
  filters: Filters
  onFiltersChange: (filters: Filters) => void 
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
    <Input
      label="Search"
      value={filters.search}
      onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
      placeholder="Search documents..."
    />
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Type
      </label>
      <select
        value={filters.type}
        onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as DocumentType | '' })}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Types</option>
        {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Status
      </label>
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as DocumentStatus | '' })}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Statuses</option>
        {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  </div>
)

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading documents...</p>
    </div>
  </div>
)

const EmptyDocuments = ({ 
  filters, 
  folderId 
}: { 
  filters: Filters
  folderId?: string 
}) => (
  <div className="text-center p-8">
    <div className="text-gray-400 text-4xl mb-4">📄</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      No documents found
    </h3>
    <p className="text-gray-600">
      {filters.search || filters.type || filters.status
        ? 'Try adjusting your filters to see more results.'
        : folderId
        ? 'This folder is empty. Upload some documents to get started.'
        : 'Upload your first document to get started.'
      }
    </p>
  </div>
)

const DocumentsPagination = ({ 
  pagination, 
  loading, 
  onPageChange 
}: {
  pagination: { page: number; pages: number; total: number }
  loading: boolean
  onPageChange: (page: number) => void
}) => (
  <div className="flex items-center justify-between">
    <p className="text-sm text-gray-700">
      Showing page {pagination.page} of {pagination.pages} ({pagination.total} total documents)
    </p>
    
    <div className="flex space-x-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={pagination.page <= 1 || loading}
      >
        Previous
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={pagination.page >= pagination.pages || loading}
      >
        Next
      </Button>
    </div>
  </div>
)

const DocumentGrid = ({
  documents,
  onDocumentSelect,
  onDocumentDelete,
  showActions,
  selectable
}: {
  documents: Document[]
  onDocumentSelect?: (document: Document) => void
  onDocumentDelete: (documentId: string) => void
  showActions: boolean
  selectable: boolean
}) => (
  <div className="space-y-3">
    {documents.map((document) => (
      <DocumentItem
        key={document.id}
        document={document}
        {...(onDocumentSelect && { onSelect: onDocumentSelect })}
        {...(onDocumentDelete && { onDelete: onDocumentDelete })}
        {...(showActions !== undefined && { showActions })}
        {...(selectable !== undefined && { selectable })}
      />
    ))}
  </div>
)

const useDocumentList = (folderId?: string) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    status: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  const fetchDocuments = useCallback(async (page = 1) => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (folderId) params.append('folderId', folderId)
      if (filters.search) params.append('search', filters.search)
      if (filters.type) params.append('type', filters.type)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.data.documents)
      setPagination(data.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [folderId, filters, pagination.limit])

  useEffect(() => {
    fetchDocuments(1)
  }, [fetchDocuments])

  return {
    documents,
    setDocuments,
    loading,
    error,
    filters,
    setFilters,
    pagination,
    fetchDocuments
  }
}

export function DocumentList({ 
  folderId, 
  onDocumentSelect, 
  onDocumentDelete,
  showActions = true,
  selectable = false
}: DocumentListProps) {
  const {
    documents,
    setDocuments,
    loading,
    error,
    filters,
    setFilters,
    pagination,
    fetchDocuments
  } = useDocumentList(folderId)

  const handleDelete = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    onDocumentDelete?.(documentId)
  }

  const handlePageChange = (page: number) => {
    fetchDocuments(page)
  }

  if (loading && documents.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <FilterControls filters={filters} onFiltersChange={setFilters} />

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      {documents.length === 0 ? (
        <EmptyDocuments filters={filters} {...(folderId && { folderId })} />
      ) : (
        <>
          <DocumentGrid
            documents={documents}
            {...(onDocumentSelect && { onDocumentSelect })}
            onDocumentDelete={handleDelete}
            showActions={showActions}
            selectable={selectable}
          />

          {pagination.pages > 1 && (
            <DocumentsPagination
              pagination={pagination}
              loading={loading}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  )
}