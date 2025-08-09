'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/atoms/Modal'
import { AIDocumentUpload } from './AIDocumentUpload'

interface Document {
  id: string
  name: string
  type: string
  size: string
  uploadedBy: string
  uploadedAt: string
  tags: string[]
}

// Mock data
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'GST Return Q3 2024.pdf',
    type: 'PDF',
    size: '2.4 MB',
    uploadedBy: 'John Doe',
    uploadedAt: '2024-01-10',
    tags: ['GST', 'Q3', 'Return'],
  },
  {
    id: '2',
    name: 'Audit Report - XYZ Company.docx',
    type: 'DOCX',
    size: '1.8 MB',
    uploadedBy: 'Jane Smith',
    uploadedAt: '2024-01-09',
    tags: ['Audit', 'Report'],
  },
  {
    id: '3',
    name: 'Financial Statements 2024.xlsx',
    type: 'XLSX',
    size: '3.2 MB',
    uploadedBy: 'Mike Johnson',
    uploadedAt: '2024-01-08',
    tags: ['Financial', 'Statements'],
  },
]

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const handleUploadComplete = (newDocuments: any[]) => {
    const formattedDocs: Document[] = newDocuments.map(doc => ({
      id: Math.random().toString(36).substr(2, 9),
      name: doc.name,
      type: doc.type,
      size: '2.1 MB', // Mock size
      uploadedBy: 'Current User',
      uploadedAt: new Date().toISOString().split('T')[0],
      tags: doc.tags
    }))
    setDocuments(prev => [...formattedDocs, ...prev])
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      case 'docx':
      case 'doc':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      case 'xlsx':
      case 'xls':
        return (
          <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
    }
  }

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map(doc => (
        <Card
          key={doc.id}
          hoverable
          clickable
          onClick={() => setSelectedDocument(doc)}
          className="p-4"
        >
          <div className="text-center space-y-3">
            {getFileIcon(doc.type)}
            <div>
              <h3 className="font-medium text-gray-900 text-sm truncate">
                {doc.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {doc.size} • {doc.type}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              {doc.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" size="sm">
                  {tag}
                </Badge>
              ))}
              {doc.tags.length > 2 && (
                <Badge variant="secondary" size="sm">
                  +{doc.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  const renderListView = () => (
    <div className="space-y-2">
      {documents.map(doc => (
        <Card
          key={doc.id}
          hoverable
          clickable
          onClick={() => setSelectedDocument(doc)}
          className="p-4"
        >
          <div className="flex items-center space-x-4">
            {getFileIcon(doc.type)}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {doc.name}
              </h3>
              <p className="text-sm text-gray-500">
                {doc.size} • Uploaded by {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {doc.tags.map(tag => (
                <Badge key={tag} variant="secondary" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage and organize your files</p>
        </div>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          🤖 AI Upload
        </Button>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search documents..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <Button variant="outline" size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Documents */}
      {viewMode === 'grid' ? renderGridView() : renderListView()}

      {/* AI Upload Modal */}
      <AIDocumentUpload
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* Document Detail Modal */}
      {selectedDocument && (
        <Modal
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          title="Document Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {getFileIcon(selectedDocument.type)}
              <div>
                <h3 className="font-semibold text-gray-900">{selectedDocument.name}</h3>
                <p className="text-sm text-gray-600">
                  {selectedDocument.size} • {selectedDocument.type}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Uploaded by:</span>
                <p className="font-medium">{selectedDocument.uploadedBy}</p>
              </div>
              <div>
                <span className="text-gray-500">Upload date:</span>
                <p className="font-medium">{new Date(selectedDocument.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-500">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedDocument.tags.map(tag => (
                  <Badge key={tag} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button size="sm">Download</Button>
              <Button size="sm" variant="outline">Share</Button>
              <Button size="sm" variant="ghost">Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}