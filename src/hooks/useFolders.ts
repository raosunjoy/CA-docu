'use client'

import { useState, useEffect, useCallback } from 'react'
import { folderService, FolderNode, CreateFolderData, UpdateFolderData, CreatePermissionData } from '@/lib/folder-service'

interface UseFoldersOptions {
  parentId?: string
  includeChildren?: boolean
  autoLoad?: boolean
}

interface UseFoldersReturn {
  folders: FolderNode[]
  loading: boolean
  error: string | null
  selectedFolder: FolderNode | null
  
  // Folder operations
  loadFolders: () => Promise<void>
  selectFolder: (folder: FolderNode | null) => void
  createFolder: (data: CreateFolderData) => Promise<FolderNode | null>
  updateFolder: (folderId: string, data: UpdateFolderData) => Promise<FolderNode | null>
  deleteFolder: (folderId: string) => Promise<boolean>
  moveFolder: (folderId: string, targetParentId: string) => Promise<boolean>
  moveFolders: (folderIds: string[], targetFolderId: string) => Promise<boolean>
  deleteFolders: (folderIds: string[]) => Promise<boolean>
  
  // Permission operations
  getFolderPermissions: (folderId: string) => Promise<any[]>
  createFolderPermission: (folderId: string, data: CreatePermissionData) => Promise<boolean>
  updateFolderPermissions: (folderId: string, permissions: CreatePermissionData[]) => Promise<boolean>
  
  // Utility functions
  findFolderById: (folderId: string) => FolderNode | null
  getFolderPath: (folderId: string) => string[]
  hasPermission: (folderId: string, permission: string) => boolean
}

export function useFolders(options: UseFoldersOptions = {}): UseFoldersReturn {
  const { parentId, includeChildren = true, autoLoad = true } = options
  
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<FolderNode | null>(null)

  const loadFolders = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await folderService.getFolders({
        parentId,
        includeChildren
      })
      
      if (response.success && response.data) {
        setFolders(response.data.folders)
      } else {
        setError(response.error?.message || 'Failed to load folders')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }, [parentId, includeChildren])

  const selectFolder = useCallback((folder: FolderNode | null) => {
    setSelectedFolder(folder)
  }, [])

  const createFolder = useCallback(async (data: CreateFolderData): Promise<FolderNode | null> => {
    try {
      const response = await folderService.createFolder(data)
      
      if (response.success && response.data) {
        // Add the new folder to the local state
        const newFolder = response.data.folder
        setFolders(prev => {
          if (data.parentId) {
            // Add to parent's children
            return updateFolderInTree(prev, data.parentId, (folder) => ({
              ...folder,
              children: [...folder.children, newFolder]
            }))
          } else {
            // Add to root level
            return [...prev, newFolder]
          }
        })
        
        return newFolder
      } else {
        setError(response.error?.message || 'Failed to create folder')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder')
      return null
    }
  }, [])

  const updateFolder = useCallback(async (folderId: string, data: UpdateFolderData): Promise<FolderNode | null> => {
    try {
      const response = await folderService.updateFolder(folderId, data)
      
      if (response.success && response.data) {
        const updatedFolder = response.data.folder
        
        // Update the folder in local state
        setFolders(prev => updateFolderInTree(prev, folderId, () => updatedFolder))
        
        // Update selected folder if it's the one being updated
        if (selectedFolder?.id === folderId) {
          setSelectedFolder(updatedFolder)
        }
        
        return updatedFolder
      } else {
        setError(response.error?.message || 'Failed to update folder')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder')
      return null
    }
  }, [selectedFolder])

  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    try {
      const response = await folderService.deleteFolder(folderId)
      
      if (response.success) {
        // Remove folder from local state
        setFolders(prev => removeFolderFromTree(prev, folderId))
        
        // Clear selection if deleted folder was selected
        if (selectedFolder?.id === folderId) {
          setSelectedFolder(null)
        }
        
        return true
      } else {
        setError(response.error?.message || 'Failed to delete folder')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder')
      return false
    }
  }, [selectedFolder])

  const moveFolder = useCallback(async (folderId: string, targetParentId: string): Promise<boolean> => {
    return updateFolder(folderId, { parentId: targetParentId }).then(result => !!result)
  }, [updateFolder])

  const moveFolders = useCallback(async (folderIds: string[], targetFolderId: string): Promise<boolean> => {
    try {
      const response = await folderService.moveFolders(folderIds, targetFolderId)
      
      if (response.success) {
        // Reload folders to get updated structure
        await loadFolders()
        return true
      } else {
        setError(response.error?.message || 'Failed to move folders')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move folders')
      return false
    }
  }, [loadFolders])

  const deleteFolders = useCallback(async (folderIds: string[]): Promise<boolean> => {
    try {
      const response = await folderService.deleteFolders(folderIds)
      
      if (response.success) {
        // Remove folders from local state
        setFolders(prev => {
          let updated = prev
          folderIds.forEach(id => {
            updated = removeFolderFromTree(updated, id)
          })
          return updated
        })
        
        // Clear selection if any deleted folder was selected
        if (selectedFolder && folderIds.includes(selectedFolder.id)) {
          setSelectedFolder(null)
        }
        
        return true
      } else {
        setError(response.error?.message || 'Failed to delete folders')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folders')
      return false
    }
  }, [selectedFolder])

  const getFolderPermissions = useCallback(async (folderId: string) => {
    try {
      const response = await folderService.getFolderPermissions(folderId)
      
      if (response.success && response.data) {
        return response.data.permissions
      } else {
        setError(response.error?.message || 'Failed to get folder permissions')
        return []
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get folder permissions')
      return []
    }
  }, [])

  const createFolderPermission = useCallback(async (folderId: string, data: CreatePermissionData): Promise<boolean> => {
    try {
      const response = await folderService.createFolderPermission(folderId, data)
      
      if (response.success) {
        return true
      } else {
        setError(response.error?.message || 'Failed to create folder permission')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder permission')
      return false
    }
  }, [])

  const updateFolderPermissions = useCallback(async (folderId: string, permissions: CreatePermissionData[]): Promise<boolean> => {
    try {
      const response = await folderService.updateFolderPermissions(folderId, { permissions })
      
      if (response.success) {
        return true
      } else {
        setError(response.error?.message || 'Failed to update folder permissions')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder permissions')
      return false
    }
  }, [])

  const findFolderById = useCallback((folderId: string): FolderNode | null => {
    const findInTree = (nodes: FolderNode[]): FolderNode | null => {
      for (const node of nodes) {
        if (node.id === folderId) {
          return node
        }
        
        const found = findInTree(node.children)
        if (found) {
          return found
        }
      }
      return null
    }

    return findInTree(folders)
  }, [folders])

  const getFolderPath = useCallback((folderId: string): string[] => {
    const folder = findFolderById(folderId)
    return folder ? folder.path.split('/').filter(Boolean) : []
  }, [findFolderById])

  const hasPermission = useCallback((folderId: string, permission: string): boolean => {
    const folder = findFolderById(folderId)
    if (!folder) return false
    
    // This would need user context to work properly
    // For now, return true as a placeholder
    return true
  }, [findFolderById])

  // Auto-load folders on mount or when options change
  useEffect(() => {
    if (autoLoad) {
      loadFolders()
    }
  }, [autoLoad, loadFolders])

  return {
    folders,
    loading,
    error,
    selectedFolder,
    
    loadFolders,
    selectFolder,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    moveFolders,
    deleteFolders,
    
    getFolderPermissions,
    createFolderPermission,
    updateFolderPermissions,
    
    findFolderById,
    getFolderPath,
    hasPermission
  }
}

// Helper functions for tree operations
function updateFolderInTree(
  folders: FolderNode[], 
  folderId: string, 
  updater: (folder: FolderNode) => FolderNode
): FolderNode[] {
  return folders.map(folder => {
    if (folder.id === folderId) {
      return updater(folder)
    }
    
    if (folder.children.length > 0) {
      return {
        ...folder,
        children: updateFolderInTree(folder.children, folderId, updater)
      }
    }
    
    return folder
  })
}

function removeFolderFromTree(folders: FolderNode[], folderId: string): FolderNode[] {
  return folders
    .filter(folder => folder.id !== folderId)
    .map(folder => ({
      ...folder,
      children: removeFolderFromTree(folder.children, folderId)
    }))
}