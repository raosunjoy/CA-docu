'use client'

import { useState } from 'react'
import { Button } from '@/components/common'
import { DocumentUpload } from '@/components/document/DocumentUpload'
import { DocumentList } from '@/components/document/DocumentList'
import { FolderTree } from '@/components/document/FolderTree'

interface Document {
  id: string
  name: string
  type: string
  status: string
}

interface Folder {
  id: string
  name: string
  path: string
}

const DocumentsPageHeader = ({ 
  selectedFolder, 
  showUpload, 
  onUploadClick 
}: {
  selectedFolder: Folder | null
  showUpload: boolean
  onUploadClick: () => void
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
        <p className="text-gray-600 mt-1">
          Organize, share, and manage your firm&apos;s documents
          {selectedFolder && ` in ${selectedFolder.path}`}
        </p>
      </div>
      <Button
        onClick={onUploadClick}
        disabled={showUpload}
      >
        Upload Documents
      </Button>
    </div>
  </div>
)

const DocumentsPageContent = ({
  selectedFolder,
  showUpload,
  refreshKey,
  onFolderSelect,
  onUploadComplete,
  onUploadCancel,
  onDocumentSelect
}: {
  selectedFolder: Folder | null
  showUpload: boolean
  refreshKey: number
  onFolderSelect: (folder: Folder | null) => void
  onUploadComplete: () => void
  onUploadCancel: () => void
  onDocumentSelect: (document: Document) => void
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <div className="lg:col-span-1">
      <FolderTree
        selectedFolderId={selectedFolder?.id}
        onFolderSelect={onFolderSelect}
        editable={true}
      />
    </div>

    <div className="lg:col-span-3 space-y-6">
      {showUpload && (
        <div className="bg-white rounded-lg border p-6">
          <DocumentUpload
            folderId={selectedFolder?.id}
            onUploadComplete={onUploadComplete}
            onCancel={onUploadCancel}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedFolder ? `Documents in ${selectedFolder.name}` : 'All Documents'}
          </h2>
        </div>
        
        <DocumentList
          key={refreshKey}
          folderId={selectedFolder?.id}
          onDocumentSelect={onDocumentSelect}
          showActions={true}
        />
      </div>
    </div>
  </div>
)

export default function DocumentsPage() {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleFolderSelect = (folder: Folder | null) => {
    setSelectedFolder(folder)
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleDocumentSelect = () => {
    // TODO: Implement navigation to document detail view
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <DocumentsPageHeader 
        selectedFolder={selectedFolder}
        showUpload={showUpload}
        onUploadClick={() => setShowUpload(true)}
      />
      <DocumentsPageContent
        selectedFolder={selectedFolder}
        showUpload={showUpload}
        refreshKey={refreshKey}
        onFolderSelect={handleFolderSelect}
        onUploadComplete={handleUploadComplete}
        onUploadCancel={() => setShowUpload(false)}
        onDocumentSelect={handleDocumentSelect}
      />
    </div>
  )
}