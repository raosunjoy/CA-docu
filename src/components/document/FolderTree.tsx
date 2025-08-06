'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, FolderOpenIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

interface FolderNode {
  id: string
  name: string
  path: string
  parentId: string | null
  children: FolderNode[]
  _count: {
    documents: number
    children: number
  }
  creator: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  permissions?: FolderPermission[]
  createdAt: string
}

interface FolderPermission {
  id: string
  userId?: string
  role?: string
  permissions: string[]
  user?: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

interface FolderTreeProps {
  folders: FolderNode[]
  selectedFolderId?: string
  onFolderSelect: (folder: FolderNode) => void
  onFolderCreate?: (parentId: string | null, name: string) => Promise<void>
  onFolderUpdate?: (folderId: string, updates: { name?: string; parentId?: string }) => Promise<void>
  onFolderDelete?: (folderId: string) => Promise<void>
  onBulkMove?: (folderIds: string[], targetFolderId: string) => Promise<void>
  enableDragDrop?: boolean
  enableInlineEdit?: boolean
  enableBulkOperations?: boolean
  className?: string
}

interface DragState {
  draggedFolderId: string | null
  dragOverFolderId: string | null
  selectedForBulk: Set<string>
}

interface EditState {
  editingFolderId: string | null
  editingName: string
  creatingParentId: string | null
  newFolderName: string
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onBulkMove,
  enableDragDrop = false,
  enableInlineEdit = false,
  enableBulkOperations = false,
  className = ''
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [dragState, setDragState] = useState<DragState>({
    draggedFolderId: null,
    dragOverFolderId: null,
    selectedForBulk: new Set()
  })
  const [editState, setEditState] = useState<EditState>({
    editingFolderId: null,
    editingName: '',
    creatingParentId: null,
    newFolderName: ''
  })

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderNode>()
    const rootFolders: FolderNode[] = []

    // Create folder map
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Build tree structure
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)
      if (folderNode) {
        if (folder.parentId) {
          const parent = folderMap.get(folder.parentId)
          if (parent) {
            parent.children.push(folderNode)
          }
        } else {
          rootFolders.push(folderNode)
        }
      }
    })

    return rootFolders
  }, [folders])

  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }, [])

  const handleFolderClick = useCallback((folder: FolderNode, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (enableBulkOperations && (event.ctrlKey || event.metaKey)) {
      setDragState(prev => {
        const newSelected = new Set(prev.selectedForBulk)
        if (newSelected.has(folder.id)) {
          newSelected.delete(folder.id)
        } else {
          newSelected.add(folder.id)
        }
        return { ...prev, selectedForBulk: newSelected }
      })
    } else {
      onFolderSelect(folder)
    }
  }, [onFolderSelect, enableBulkOperations])

  const startEdit = useCallback((folder: FolderNode, event: React.MouseEvent) => {
    event.stopPropagation()
    setEditState(prev => ({
      ...prev,
      editingFolderId: folder.id,
      editingName: folder.name
    }))
  }, [])

  const cancelEdit = useCallback(() => {
    setEditState(prev => ({
      ...prev,
      editingFolderId: null,
      editingName: '',
      creatingParentId: null,
      newFolderName: ''
    }))
  }, [])

  const saveEdit = useCallback(async () => {
    if (editState.editingFolderId && onFolderUpdate) {
      try {
        await onFolderUpdate(editState.editingFolderId, { name: editState.editingName })
        cancelEdit()
      } catch (error) {
        console.error('Failed to update folder:', error)
      }
    }
  }, [editState.editingFolderId, editState.editingName, onFolderUpdate, cancelEdit])

  const startCreate = useCallback((parentId: string | null, event: React.MouseEvent) => {
    event.stopPropagation()
    setEditState(prev => ({
      ...prev,
      creatingParentId: parentId,
      newFolderName: ''
    }))
  }, [])

  const saveCreate = useCallback(async () => {
    if (onFolderCreate && editState.newFolderName.trim()) {
      try {
        await onFolderCreate(editState.creatingParentId, editState.newFolderName.trim())
        cancelEdit()
      } catch (error) {
        console.error('Failed to create folder:', error)
      }
    }
  }, [editState.creatingParentId, editState.newFolderName, onFolderCreate, cancelEdit])

  const handleDelete = useCallback(async (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (onFolderDelete && confirm('Are you sure you want to delete this folder?')) {
      try {
        await onFolderDelete(folderId)
      } catch (error) {
        console.error('Failed to delete folder:', error)
      }
    }
  }, [onFolderDelete])

  const handleDragStart = useCallback((event: React.DragEvent, folderId: string) => {
    if (!enableDragDrop) return
    
    event.dataTransfer.setData('text/plain', folderId)
    setDragState(prev => ({ ...prev, draggedFolderId: folderId }))
  }, [enableDragDrop])

  const handleDragOver = useCallback((event: React.DragEvent, folderId: string) => {
    if (!enableDragDrop) return
    
    event.preventDefault()
    setDragState(prev => ({ ...prev, dragOverFolderId: folderId }))
  }, [enableDragDrop])

  const handleDragLeave = useCallback(() => {
    if (!enableDragDrop) return
    
    setDragState(prev => ({ ...prev, dragOverFolderId: null }))
  }, [enableDragDrop])

  const handleDrop = useCallback(async (event: React.DragEvent, targetFolderId: string) => {
    if (!enableDragDrop) return
    
    event.preventDefault()
    const draggedFolderId = event.dataTransfer.getData('text/plain')
    
    if (draggedFolderId && draggedFolderId !== targetFolderId && onFolderUpdate) {
      try {
        await onFolderUpdate(draggedFolderId, { parentId: targetFolderId })
      } catch (error) {
        console.error('Failed to move folder:', error)
      }
    }
    
    setDragState(prev => ({
      ...prev,
      draggedFolderId: null,
      dragOverFolderId: null
    }))
  }, [enableDragDrop, onFolderUpdate])

  const handleBulkMove = useCallback(async (targetFolderId: string) => {
    if (onBulkMove && dragState.selectedForBulk.size > 0) {
      try {
        await onBulkMove(Array.from(dragState.selectedForBulk), targetFolderId)
        setDragState(prev => ({ ...prev, selectedForBulk: new Set() }))
      } catch (error) {
        console.error('Failed to bulk move folders:', error)
      }
    }
  }, [onBulkMove, dragState.selectedForBulk])

  const renderFolder = useCallback((folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const isEditing = editState.editingFolderId === folder.id
    const isDraggedOver = dragState.dragOverFolderId === folder.id
    const isSelectedForBulk = dragState.selectedForBulk.has(folder.id)
    const hasChildren = folder.children.length > 0

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`
            flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors
            ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}
            ${isDraggedOver ? 'bg-blue-50 border-2 border-blue-300' : ''}
            ${isSelectedForBulk ? 'bg-yellow-100 border border-yellow-300' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          onClick={(e) => handleFolderClick(folder, e)}
          draggable={enableDragDrop}
          onDragStart={(e) => handleDragStart(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(folder.id)
              }}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Folder Icon */}
          <div className="mr-3">
            {isExpanded ? (
              <FolderOpenIcon className="w-5 h-5 text-blue-600" />
            ) : (
              <FolderIcon className="w-5 h-5 text-blue-600" />
            )}
          </div>

          {/* Folder Name */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editState.editingName}
                  onChange={(e) => setEditState(prev => ({ ...prev, editingName: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  className="text-sm"
                  autoFocus
                />
                <Button size="sm" onClick={saveEdit}>Save</Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm truncate">{folder.name}</div>
                  <div className="text-xs text-gray-500">
                    {folder._count.documents} documents, {folder._count.children} folders
                  </div>
                </div>

                {/* Action Buttons */}
                {enableInlineEdit && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startCreate(folder.id, e)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Create subfolder"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => startEdit(folder, e)}
                      className="p-1 hover:bg-gray-200 rounded"
                      title="Rename folder"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(folder.id, e)}
                      className="p-1 hover:bg-red-200 rounded text-red-600"
                      title="Delete folder"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create New Folder Form */}
        {editState.creatingParentId === folder.id && (
          <div className="ml-8 mt-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Folder name"
                value={editState.newFolderName}
                onChange={(e) => setEditState(prev => ({ ...prev, newFolderName: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveCreate()
                  if (e.key === 'Escape') cancelEdit()
                }}
                className="text-sm"
                autoFocus
              />
              <Button size="sm" onClick={saveCreate}>Create</Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="ml-4">
            {folder.children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }, [
    expandedFolders, selectedFolderId, editState, dragState, enableDragDrop, enableInlineEdit,
    handleFolderClick, toggleExpanded, startEdit, startCreate, handleDelete,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    saveEdit, saveCreate, cancelEdit
  ])

  return (
    <div className={`folder-tree ${className}`}>
      {/* Bulk Operations Bar */}
      {enableBulkOperations && dragState.selectedForBulk.size > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {dragState.selectedForBulk.size} folders selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => setDragState(prev => ({ ...prev, selectedForBulk: new Set() }))}
                variant="outline"
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const targetId = prompt('Enter target folder ID:')
                  if (targetId) handleBulkMove(targetId)
                }}
              >
                Move Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Root Create Button */}
      {enableInlineEdit && (
        <div className="mb-4">
          <Button
            size="sm"
            onClick={(e) => startCreate(null, e)}
            className="w-full"
            variant="outline"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Root Folder
          </Button>
        </div>
      )}

      {/* Root Create Form */}
      {editState.creatingParentId === null && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Folder name"
              value={editState.newFolderName}
              onChange={(e) => setEditState(prev => ({ ...prev, newFolderName: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveCreate()
                if (e.key === 'Escape') cancelEdit()
              }}
              className="text-sm"
              autoFocus
            />
            <Button size="sm" onClick={saveCreate}>Create</Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Folder Tree */}
      <div className="space-y-1">
        {folderTree.map(folder => renderFolder(folder))}
      </div>

      {/* Empty State */}
      {folderTree.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FolderIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">No folders found</p>
          {enableInlineEdit && (
            <p className="text-xs mt-2">Click "Create Root Folder" to get started</p>
          )}
        </div>
      )}
    </div>
  )
}