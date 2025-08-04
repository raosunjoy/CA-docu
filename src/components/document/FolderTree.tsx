'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Input, Alert } from '@/components/common'

interface Folder {
  id: string
  name: string
  description?: string
  path: string
  parentId?: string
  children?: Folder[]
  creator: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  _count: {
    documents: number
    children: number
  }
  createdAt: string
  updatedAt: string
}

interface FolderTreeProps {
  selectedFolderId?: string
  onFolderSelect: (folder: Folder | null) => void
  onFolderCreate?: (folder: Folder) => void
  onFolderDelete?: (folderId: string) => void
  editable?: boolean
}

interface CreateFolderForm {
  name: string
  description: string
  parentId: string | null
}

const FolderIcon = ({ isOpen }: { isOpen: boolean }) => (
  <span className="text-yellow-500 mr-2">
    {isOpen ? '📂' : '📁'}
  </span>
)

const FolderExpandButton = ({ 
  hasChildren, 
  isExpanded, 
  onToggle 
}: {
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
}) => (
  hasChildren ? (
    <button
      className="mr-1 p-1 hover:bg-gray-200 rounded"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <span className="text-xs text-gray-500">
        {isExpanded ? '▼' : '▶'}
      </span>
    </button>
  ) : null
)

const FolderInfo = ({ folder }: { folder: Folder }) => (
  <div className="flex-1">
    <span className="text-sm font-medium text-gray-900 truncate">
      {folder.name}
    </span>
    <div className="text-xs text-gray-500 mt-1">
      {folder._count.documents} documents, {folder._count.children} folders
    </div>
  </div>
)

const FolderActions = ({ 
  folder, 
  editable, 
  isDeleting, 
  onDelete 
}: {
  folder: Folder
  editable: boolean
  isDeleting: boolean
  onDelete: (e: React.MouseEvent) => void
}) => (
  editable ? (
    <div className="flex items-center space-x-1 ml-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={onDelete}
        disabled={isDeleting || folder._count.documents > 0 || folder._count.children > 0}
        loading={isDeleting}
        title={folder._count.documents > 0 || folder._count.children > 0 
          ? 'Cannot delete folder with contents' 
          : 'Delete folder'
        }
      >
        🗑️
      </Button>
    </div>
  ) : null
)

const FolderChildren = ({ 
  folder, 
  hasChildren, 
  isExpanded, 
  selectedId, 
  onSelect, 
  onDelete, 
  editable, 
  level 
}: {
  folder: Folder
  hasChildren: boolean
  isExpanded: boolean
  selectedId?: string
  onSelect: (folder: Folder) => void
  onDelete?: (folderId: string) => void
  editable?: boolean
  level: number
}) => (
  hasChildren && isExpanded ? (
    <div>
      {folder.children?.map((child) => (
        <FolderNode
          key={child.id}
          folder={child}
          {...(selectedId && { selectedId })}
          onSelect={onSelect}
          {...(onDelete && { onDelete })}
          {...(editable && { editable })}
          level={level + 1}
        />
      ))}
    </div>
  ) : null
)

const useFolderDelete = (folderId: string, onDelete?: (folderId: string) => void) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm(`Are you sure you want to delete this folder?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/documents/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        onDelete?.(folderId)
      } else {
        const error = await response.json()
        alert(error.error?.message || 'Failed to delete folder')
      }
    } catch {
      alert('Failed to delete folder. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return { isDeleting, handleDelete }
}

const FolderHeader = ({
  folder,
  isSelected,
  isExpanded,
  hasChildren,
  editable,
  level,
  onSelect,
  onToggleExpanded,
  onDelete,
  isDeleting
}: {
  folder: Folder
  isSelected: boolean
  isExpanded: boolean
  hasChildren: boolean
  editable: boolean
  level: number
  onSelect: (folder: Folder) => void
  onToggleExpanded: () => void
  onDelete: (e: React.MouseEvent) => void
  isDeleting: boolean
}) => (
  <div
    className={`flex items-center py-2 px-3 rounded-md cursor-pointer transition-colors ${
      isSelected 
        ? 'bg-blue-50 border border-blue-200' 
        : 'hover:bg-gray-50'
    }`}
    style={{ paddingLeft: `${12 + level * 20}px` }}
    onClick={() => onSelect(folder)}
  >
    <FolderExpandButton
      hasChildren={hasChildren}
      isExpanded={isExpanded}
      onToggle={onToggleExpanded}
    />
    
    <FolderIcon isOpen={isExpanded} />
    
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <FolderInfo folder={folder} />
        <FolderActions
          folder={folder}
          editable={editable}
          isDeleting={isDeleting}
          onDelete={onDelete}
        />
      </div>
    </div>
  </div>
)

const FolderNode = ({ 
  folder, 
  selectedId, 
  onSelect, 
  onDelete,
  editable,
  level = 0 
}: {
  folder: Folder
  selectedId?: string
  onSelect: (folder: Folder) => void
  onDelete?: (folderId: string) => void
  editable?: boolean
  level?: number
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const { isDeleting, handleDelete } = useFolderDelete(folder.id, onDelete)
  const isSelected = selectedId === folder.id
  const hasChildren = folder.children && folder.children.length > 0

  return (
    <div className="select-none">
      <FolderHeader
        folder={folder}
        isSelected={isSelected}
        isExpanded={isExpanded}
        hasChildren={hasChildren || false}
        editable={editable || false}
        level={level}
        onSelect={onSelect}
        onToggleExpanded={() => setIsExpanded(!isExpanded)}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
      
      <FolderChildren
        folder={folder}
        hasChildren={hasChildren || false}
        isExpanded={isExpanded}
        {...(selectedId && { selectedId })}
        onSelect={onSelect}
        {...(onDelete && { onDelete })}
        {...(editable && { editable })}
        level={level}
      />
    </div>
  )
}

const CreateFolderForm = ({ 
  form, 
  setForm, 
  onSubmit 
}: {
  form: CreateFolderForm
  setForm: React.Dispatch<React.SetStateAction<CreateFolderForm>>
  onSubmit: (e: React.FormEvent) => void
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <Input
      label="Folder Name *"
      value={form.name}
      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
      placeholder="Enter folder name"
      maxLength={255}
      required
    />
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Description
      </label>
      <textarea
        value={form.description}
        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Optional description"
        rows={3}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  </form>
)

const ModalActions = ({ 
  onClose, 
  creating, 
  canCreate 
}: {
  onClose: () => void
  creating: boolean
  canCreate: boolean
}) => (
  <div className="flex justify-end space-x-3 pt-4">
    <Button
      type="button"
      variant="secondary"
      onClick={onClose}
      disabled={creating}
    >
      Cancel
    </Button>
    <Button
      type="submit"
      loading={creating}
      disabled={creating || !canCreate}
    >
      Create Folder
    </Button>
  </div>
)

const useCreateFolder = (onCreate: (folder: Folder) => void, onClose: () => void) => {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async (form: CreateFolderForm) => {
    if (!form.name.trim()) {
      setError('Folder name is required')
      return
    }

    setCreating(true)
    setError('')

    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          parentId: form.parentId
        })
      })

      if (response.ok) {
        const data = await response.json()
        onCreate(data.data.folder)
        onClose()
      } else {
        const error = await response.json()
        setError(error.error?.message || 'Failed to create folder')
      }
    } catch {
      setError('Failed to create folder. Please try again.')
    } finally {
      setCreating(false)
    }
  }, [onCreate, onClose])

  return { creating, error, setError, handleSubmit }
}

const CreateFolderModal = ({ 
  isOpen, 
  onClose, 
  parentFolder, 
  onCreate 
}: {
  isOpen: boolean
  onClose: () => void
  parentFolder: Folder | null
  onCreate: (folder: Folder) => void
}) => {
  const [form, setForm] = useState<CreateFolderForm>({
    name: '',
    description: '',
    parentId: parentFolder?.id || null
  })
  
  const { creating, error, handleSubmit } = useCreateFolder(onCreate, onClose)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(form)
  }

  const handleClose = () => {
    onClose()
    setForm({ name: '', description: '', parentId: null })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Create New Folder
        </h3>
        
        {parentFolder && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Parent folder: <span className="font-medium">{parentFolder.path}</span>
            </p>
          </div>
        )}

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <div onSubmit={onSubmit}>
          <CreateFolderForm
            form={form}
            setForm={setForm}
            onSubmit={onSubmit}
          />
          
          <ModalActions
            onClose={handleClose}
            creating={creating}
            canCreate={!!form.name.trim()}
          />
        </div>
      </div>
    </div>
  )
}

const FolderTreeHeader = ({ 
  editable, 
  onCreateFolder 
}: {
  editable: boolean
  onCreateFolder: () => void
}) => (
  <div className="p-4 border-b">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-900">
        Document Folders
      </h3>
      {editable && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onCreateFolder}
        >
          New Folder
        </Button>
      )}
    </div>
  </div>
)

const RootFolderOption = ({ 
  isSelected, 
  editable, 
  onSelect, 
  onCreateFolder 
}: {
  isSelected: boolean
  editable: boolean
  onSelect: () => void
  onCreateFolder: (e: React.MouseEvent) => void
}) => (
  <div
    className={`flex items-center py-2 px-3 rounded-md cursor-pointer transition-colors ${
      isSelected 
        ? 'bg-blue-50 border border-blue-200' 
        : 'hover:bg-gray-50'
    }`}
    onClick={onSelect}
  >
    <FolderIcon isOpen={true} />
    <span className="text-sm font-medium text-gray-900">
      All Documents
    </span>
    {editable && (
      <Button
        variant="secondary"
        size="sm"
        onClick={onCreateFolder}
        className="ml-auto"
      >
        +
      </Button>
    )}
  </div>
)

const FolderList = ({ 
  folders, 
  selectedFolderId, 
  editable, 
  onFolderSelect, 
  onFolderDeleted 
}: {
  folders: Folder[]
  selectedFolderId?: string
  editable: boolean
  onFolderSelect: (folder: Folder) => void
  onFolderDeleted: (folderId: string) => void
}) => (
  folders.length === 0 ? (
    <div className="text-center p-4">
      <div className="text-gray-400 text-2xl mb-2">📁</div>
      <p className="text-sm text-gray-600">
        No folders created yet.
        {editable && ' Create your first folder to organize documents.'}
      </p>
    </div>
  ) : (
    <div className="space-y-1">
      {folders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          {...(selectedFolderId && { selectedId: selectedFolderId })}
          onSelect={onFolderSelect}
          {...(onFolderDeleted && { onDelete: onFolderDeleted })}
          {...(editable && { editable })}
        />
      ))}
    </div>
  )
)

const LoadingFolders = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">Loading folders...</p>
    </div>
  </div>
)

const useFolderTree = (onFolderCreate?: (folder: Folder) => void, onFolderDelete?: (folderId: string) => void) => {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchFolders = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/documents/folders?includeChildren=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch folders')
      }

      const data = await response.json()
      setFolders(data.data.folders)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  const handleFolderCreated = useCallback((newFolder: Folder) => {
    fetchFolders()
    onFolderCreate?.(newFolder)
  }, [fetchFolders, onFolderCreate])

  const handleFolderDeleted = useCallback((folderId: string) => {
    fetchFolders()
    onFolderDelete?.(folderId)
  }, [fetchFolders, onFolderDelete])

  return {
    folders,
    loading,
    error,
    handleFolderCreated,
    handleFolderDeleted
  }
}

const FolderTreeBody = ({
  error,
  selectedFolderId,
  editable,
  onFolderSelect,
  folders,
  handleCreateFolder,
  handleFolderDeleted
}: {
  error: string
  selectedFolderId?: string
  editable: boolean
  onFolderSelect: (folder: Folder | null) => void
  folders: Folder[]
  handleCreateFolder: (parentFolder?: Folder) => void
  handleFolderDeleted: (folderId: string) => void
}) => (
  <div className="p-2">
    {error && (
      <Alert variant="error" className="m-2">
        {error}
      </Alert>
    )}

    <RootFolderOption
      isSelected={!selectedFolderId}
      editable={editable}
      onSelect={() => onFolderSelect(null)}
      onCreateFolder={(e) => {
        e.stopPropagation()
        handleCreateFolder()
      }}
    />

    <FolderList
      folders={folders}
      {...(selectedFolderId && { selectedFolderId })}
      editable={editable}
      onFolderSelect={onFolderSelect}
      onFolderDeleted={handleFolderDeleted}
    />
  </div>
)

export function FolderTree({ 
  selectedFolderId, 
  onFolderSelect, 
  onFolderCreate,
  onFolderDelete,
  editable = false 
}: FolderTreeProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [parentForNewFolder, setParentForNewFolder] = useState<Folder | null>(null)
  
  const {
    folders,
    loading,
    error,
    handleFolderCreated,
    handleFolderDeleted: handleDelete
  } = useFolderTree(onFolderCreate, onFolderDelete)

  const handleCreateFolder = (parentFolder?: Folder) => {
    setParentForNewFolder(parentFolder || null)
    setShowCreateModal(true)
  }

  const handleFolderDeleted = (folderId: string) => {
    handleDelete(folderId)
    if (selectedFolderId === folderId) {
      onFolderSelect(null)
    }
  }

  if (loading) {
    return <LoadingFolders />
  }

  return (
    <div className="bg-white border rounded-lg">
      <FolderTreeHeader 
        editable={editable}
        onCreateFolder={() => handleCreateFolder()}
      />

      <FolderTreeBody
        error={error}
        {...(selectedFolderId && { selectedFolderId })}
        editable={editable}
        onFolderSelect={onFolderSelect}
        folders={folders}
        handleCreateFolder={handleCreateFolder}
        handleFolderDeleted={handleFolderDeleted}
      />

      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        parentFolder={parentForNewFolder}
        onCreate={handleFolderCreated}
      />
    </div>
  )
}