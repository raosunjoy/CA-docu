import { APIResponse } from '@/types'

export interface FolderNode {
  id: string
  name: string
  description?: string
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
  updatedAt: string
}

export interface FolderPermission {
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
  createdAt: string
  updatedAt: string
}

export interface CreateFolderData {
  name: string
  description?: string
  parentId?: string
}

export interface UpdateFolderData {
  name?: string
  description?: string
  parentId?: string
}

export interface CreatePermissionData {
  userId?: string
  role?: string
  permissions: string[]
}

export interface BulkOperationData {
  operation: 'move' | 'delete'
  folderIds: string[]
  targetFolderId?: string
}

class FolderService {
  private baseUrl = '/api/documents/folders'

  async getFolders(params?: {
    parentId?: string
    includeChildren?: boolean
  }): Promise<APIResponse<{ folders: FolderNode[] }>> {
    const searchParams = new URLSearchParams()
    
    if (params?.parentId) {
      searchParams.set('parentId', params.parentId)
    }
    
    if (params?.includeChildren) {
      searchParams.set('includeChildren', 'true')
    }

    const response = await fetch(`${this.baseUrl}?${searchParams}`)
    return response.json()
  }

  async getFolder(folderId: string): Promise<APIResponse<{ folder: FolderNode }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}`)
    return response.json()
  }

  async createFolder(data: CreateFolderData): Promise<APIResponse<{ folder: FolderNode }>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async updateFolder(folderId: string, data: UpdateFolderData): Promise<APIResponse<{ folder: FolderNode }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async deleteFolder(folderId: string): Promise<APIResponse<{ message: string }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}`, {
      method: 'DELETE'
    })
    return response.json()
  }

  async bulkOperation(folderId: string, data: BulkOperationData): Promise<APIResponse<{ 
    message: string
    movedFolders?: string[]
    deletedFolders?: string[]
  }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async getFolderPermissions(folderId: string): Promise<APIResponse<{ permissions: FolderPermission[] }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}/permissions`)
    return response.json()
  }

  async createFolderPermission(
    folderId: string, 
    data: CreatePermissionData
  ): Promise<APIResponse<{ permission: FolderPermission }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  async updateFolderPermissions(
    folderId: string, 
    data: { permissions: CreatePermissionData[] }
  ): Promise<APIResponse<{ permissions: FolderPermission[] }>> {
    const response = await fetch(`${this.baseUrl}/${folderId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return response.json()
  }

  // Utility methods for folder operations
  async moveFolders(folderIds: string[], targetFolderId: string): Promise<APIResponse<{ 
    message: string
    movedFolders: string[]
  }>> {
    return this.bulkOperation('bulk', {
      operation: 'move',
      folderIds,
      targetFolderId
    })
  }

  async deleteFolders(folderIds: string[]): Promise<APIResponse<{ 
    message: string
    deletedFolders: string[]
  }>> {
    return this.bulkOperation('bulk', {
      operation: 'delete',
      folderIds
    })
  }

  // Helper method to build folder breadcrumbs
  buildBreadcrumbs(folder: FolderNode): Array<{ id: string; name: string }> {
    const breadcrumbs: Array<{ id: string; name: string }> = []
    const pathParts = folder.path.split('/')
    
    // This is a simplified version - in a real implementation,
    // you'd need to fetch parent folder data to build proper breadcrumbs
    pathParts.forEach((part, index) => {
      if (part) {
        breadcrumbs.push({
          id: index === pathParts.length - 1 ? folder.id : `parent-${index}`,
          name: part
        })
      }
    })
    
    return breadcrumbs
  }

  // Helper method to check if user has specific permission on folder
  hasPermission(folder: FolderNode, userId: string, userRole: string, permission: string): boolean {
    if (!folder.permissions) return false

    return folder.permissions.some(p => {
      const matchesUser = p.userId === userId
      const matchesRole = p.role === userRole
      const hasPermission = p.permissions.includes(permission)
      
      return (matchesUser || matchesRole) && hasPermission
    })
  }

  // Helper method to get effective permissions for a user on a folder
  getEffectivePermissions(folder: FolderNode, userId: string, userRole: string): string[] {
    if (!folder.permissions) return []

    const allPermissions = new Set<string>()

    folder.permissions.forEach(p => {
      const matchesUser = p.userId === userId
      const matchesRole = p.role === userRole
      
      if (matchesUser || matchesRole) {
        p.permissions.forEach(perm => allPermissions.add(perm))
      }
    })

    return Array.from(allPermissions)
  }

  // Helper method to validate folder name
  validateFolderName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Folder name is required' }
    }

    if (name.length > 255) {
      return { valid: false, error: 'Folder name must be less than 255 characters' }
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(name)) {
      return { valid: false, error: 'Folder name contains invalid characters' }
    }

    return { valid: true }
  }

  // Helper method to find folder by path
  findFolderByPath(folders: FolderNode[], path: string): FolderNode | null {
    const findInTree = (nodes: FolderNode[]): FolderNode | null => {
      for (const node of nodes) {
        if (node.path === path) {
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
  }

  // Helper method to get all descendant folder IDs
  getDescendantIds(folder: FolderNode): string[] {
    const descendants: string[] = []
    
    const collectDescendants = (node: FolderNode) => {
      node.children.forEach(child => {
        descendants.push(child.id)
        collectDescendants(child)
      })
    }
    
    collectDescendants(folder)
    return descendants
  }

  // Helper method to check if folder can be moved to target
  canMoveTo(folder: FolderNode, targetFolderId: string): boolean {
    // Can't move to itself
    if (folder.id === targetFolderId) {
      return false
    }

    // Can't move to its own descendant
    const descendantIds = this.getDescendantIds(folder)
    return !descendantIds.includes(targetFolderId)
  }
}

export const folderService = new FolderService()