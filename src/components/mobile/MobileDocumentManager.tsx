/**
 * Mobile Document Manager Component
 * Touch-optimized document management for mobile devices
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Document, DocumentFolder } from '@/types'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Input } from '@/components/common/Input'
import { MobileDocumentCapture } from './MobileDocumentCapture'
import { MobileDocumentViewer, MobileDocumentThumbnail } from './MobileDocumentViewer'
import { 
  Search, 
  Filter, 
  Plus, 
  Folder, 
  FolderOpen,
  Grid3X3,
  List,
  MoreVertical,
  Upload,
  Camera,
  ArrowLeft,
  SortAsc,
  Star,
  Share2,
  Trash2,
  Edit3,
  FileText,
  Image as ImageIcon
} from 'lucide-react'

interface MobileDocumentManagerProps {
  documents: Document[]
  folders: DocumentFolder[]
  currentFolderId?: string
  onDocumentSelect: (document: Document) => void
  onDocumentUpload: (file: File, folderId?: string) => void
  onFolderChange: (folderId?: string) => void
  onDocumentDelete: (documentId: string) => void
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'

export function MobileDocumentManager({
  documents,
  folders,
  currentFolderId,
  onDocumentSelect,
  onDocumentUpload,
  onFolderChange,
  onDocumentDelete,
  className = ''
}: MobileDocumentManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [showFilters, setShowFilters] = useState(false)
  const [showCapture, setShowCapture] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        case 'size':
          return b.fileSize - a.fileSize
        case 'type':
          return a.mimeType.localeCompare(b.mimeType)
        default:
          return 0
      }
    })

  const currentFolder = folders.find(f => f.id === currentFolderId)
  const subFolders = folders.filter(f => f.parentId === currentFolderId)

  const handleDocumentCapture = (file: File) => {
    onDocumentUpload(file, currentFolderId)
    setShowCapture(false)
  }

  const handleDocumentLongPress = (documentId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true)
      setSelectedItems([documentId])
    }
  }

  const toggleSelection = (documentId: string) => {
    if (isSelectionMode) {
      setSelectedItems(prev => 
        prev.includes(documentId)
          ? prev.filter(id => id !== documentId)
          : [...prev, documentId]
      )
    }
  }

  const exitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedItems([])
  }

  const handleBulkDelete = () => {
    selectedItems.forEach(id => onDocumentDelete(id))
    exitSelectionMode()
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {currentFolder && (
              <button
                onClick={() => onFolderChange(currentFolder.parentId)}
                className="p-1 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">
              {currentFolder?.name || 'Documents'}
            </h1>
          </div>
          
          {isSelectionMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedItems.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDelete}
                disabled={selectedItems.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exitSelectionMode}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCapture(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
          >
            <SortAsc className="h-4 w-4 mr-1" />
            {sortBy === 'date' ? 'Date' : 'Name'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Folders */}
        {subFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Folders</h3>
            <div className="grid grid-cols-2 gap-3">
              {subFolders.map(folder => (
                <Card
                  key={folder.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onFolderChange(folder.id)}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-8 w-8 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {folder.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {folder.documentCount || 0} items
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Documents
            </h3>
            <p className="text-gray-600 mb-4">
              Start by uploading or capturing documents
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => setShowCapture(true)}
                size="sm"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Documents ({filteredDocuments.length})
              </h3>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredDocuments.map(document => (
                  <div
                    key={document.id}
                    className={`relative ${
                      isSelectionMode && selectedItems.includes(document.id)
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                    onTouchStart={() => {
                      if (isSelectionMode) {
                        toggleSelection(document.id)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      handleDocumentLongPress(document.id)
                    }}
                  >
                    <MobileDocumentThumbnail
                      document={document}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelection(document.id)
                        } else {
                          setSelectedDocument(document)
                        }
                      }}
                    />
                    
                    {isSelectionMode && (
                      <div className="absolute top-2 left-2">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedItems.includes(document.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                        }`}>
                          {selectedItems.includes(document.id) && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map(document => (
                  <DocumentListItem
                    key={document.id}
                    document={document}
                    isSelected={selectedItems.includes(document.id)}
                    isSelectionMode={isSelectionMode}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelection(document.id)
                      } else {
                        setSelectedDocument(document)
                      }
                    }}
                    onLongPress={() => handleDocumentLongPress(document.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      {!isSelectionMode && (
        <div className="absolute bottom-6 right-6">
          <Button
            onClick={() => setShowCapture(true)}
            className="w-14 h-14 rounded-full shadow-lg"
          >
            <Camera className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Document Capture Modal */}
      <MobileDocumentCapture
        isOpen={showCapture}
        onCapture={handleDocumentCapture}
        onCancel={() => setShowCapture(false)}
      />

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <MobileDocumentViewer
          document={selectedDocument}
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  )
}
/**

 * Document List Item Component
 */
interface DocumentListItemProps {
  document: Document
  isSelected: boolean
  isSelectionMode: boolean
  onClick: () => void
  onLongPress: () => void
}

function DocumentListItem({
  document,
  isSelected,
  isSelectionMode,
  onClick,
  onLongPress
}: DocumentListItemProps) {
  const [showMenu, setShowMenu] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`
  }

  const getFileIcon = () => {
    if (document.mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-green-600" />
    } else if (document.mimeType.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-600" />
    } else if (document.mimeType.includes('word')) {
      return <FileText className="h-8 w-8 text-blue-600" />
    } else if (document.mimeType.includes('excel') || document.mimeType.includes('spreadsheet')) {
      return <FileText className="h-8 w-8 text-green-600" />
    }
    return <FileText className="h-8 w-8 text-gray-600" />
  }

  return (
    <Card
      className={`relative cursor-pointer hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress()
      }}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          {isSelectionMode && (
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'bg-white border-gray-300'
            }`}>
              {isSelected && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          )}
          
          <div className="flex-shrink-0">
            {getFileIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {document.name}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{formatFileSize(document.fileSize)}</span>
              <span>•</span>
              <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
            </div>
            {document.description && (
              <p className="text-sm text-gray-600 truncate mt-1">
                {document.description}
              </p>
            )}
          </div>
          
          {!isSelectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-12 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-40">
            <div className="py-1">
              <button
                onClick={() => {
                  // Handle share
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                onClick={() => {
                  // Handle rename
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Rename
              </button>
              <button
                onClick={() => {
                  // Handle star/favorite
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Add to Favorites
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  // Handle delete
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}