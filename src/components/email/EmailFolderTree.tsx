'use client'

import React, { useState, useEffect } from 'react'
import { 
  Folder, 
  FolderOpen, 
  Inbox, 
  Send, 
  Archive, 
  Trash2, 
  Star,
  ChevronRight,
  ChevronDown,
  Mail
} from 'lucide-react'
import { type EmailFolder, type EmailAccount } from '../../types'

interface EmailFolderTreeProps {
  userId: string
  selectedFolderId?: string
  onFolderSelect: (folderId: string | null, folderName: string) => void
  className?: string
}

interface FolderNodeProps {
  folder: EmailFolder & { children?: EmailFolder[]; unreadCount?: number }
  level: number
  isSelected: boolean
  onSelect: (folderId: string, folderName: string) => void
  onToggle: (folderId: string) => void
  isExpanded: boolean
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  level,
  isSelected,
  onSelect,
  onToggle,
  isExpanded
}) => {
  const hasChildren = folder.children && folder.children.length > 0
  const paddingLeft = level * 16 + 8

  const getFolderIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'inbox':
        return <Inbox size={16} />
      case 'sent':
        return <Send size={16} />
      case 'drafts':
        return <Mail size={16} />
      case 'trash':
        return <Trash2 size={16} />
      case 'spam':
        return <Archive size={16} />
      default:
        return isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
    }
  }

  return (
    <div>
      <div
        className={`
          flex items-center py-2 px-2 cursor-pointer hover:bg-gray-100 rounded-md
          ${isSelected ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}
        `}
        style={{ paddingLeft }}
        onClick={() => onSelect(folder.id, folder.displayName || folder.name)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(folder.id)
            }}
            className="mr-1 p-0.5 hover:bg-gray-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        )}
        
        {!hasChildren && <div className="w-5" />}
        
        <div className="mr-2 text-gray-500">
          {getFolderIcon(folder.type)}
        </div>
        
        <span className="flex-1 text-sm truncate">
          {folder.displayName || folder.name}
        </span>
        
        {folder.unreadCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
            {folder.unreadCount}
          </span>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              isSelected={isSelected}
              onSelect={onSelect}
              onToggle={onToggle}
              isExpanded={isExpanded}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const EmailFolderTree: React.FC<EmailFolderTreeProps> = ({
  userId,
  selectedFolderId,
  onFolderSelect,
  className = ''
}) => {
  const [accounts, setAccounts] = useState<(EmailAccount & { folders?: EmailFolder[] })[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAccountsAndFolders()
  }, [userId])

  const loadAccountsAndFolders = async () => {
    try {
      setLoading(true)
      
      // Load accounts
      const accountsResponse = await fetch('/api/emails/accounts')
      if (!accountsResponse.ok) throw new Error('Failed to load accounts')
      
      const accountsData = await accountsResponse.json()
      
      // Load folders for each account
      const accountsWithFolders = await Promise.all(
        accountsData.map(async (account: EmailAccount) => {
          try {
            const foldersResponse = await fetch(`/api/emails/accounts/${account.id}/folders`)
            if (foldersResponse.ok) {
              const folders = await foldersResponse.json()
              return { ...account, folders: buildFolderTree(folders) }
            }
          } catch (error) {
            console.error(`Failed to load folders for account ${account.id}:`, error)
          }
          return { ...account, folders: [] }
        })
      )
      
      setAccounts(accountsWithFolders)
      
      // Expand first account by default
      if (accountsWithFolders.length > 0) {
        setExpandedAccounts(new Set([accountsWithFolders[0].id]))
      }
    } catch (error) {
      console.error('Failed to load accounts and folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const buildFolderTree = (folders: EmailFolder[]): EmailFolder[] => {
    const folderMap = new Map<string, EmailFolder & { children: EmailFolder[] }>()
    const rootFolders: (EmailFolder & { children: EmailFolder[] })[] = []

    // Create folder map with children arrays
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] })
    })

    // Build tree structure
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(folderWithChildren)
      } else {
        rootFolders.push(folderWithChildren)
      }
    })

    // Sort folders by type and name
    const sortFolders = (folders: any[]) => {
      const typeOrder = ['inbox', 'sent', 'drafts', 'trash', 'spam']
      return folders.sort((a, b) => {
        const aIndex = typeOrder.indexOf(a.type.toLowerCase())
        const bIndex = typeOrder.indexOf(b.type.toLowerCase())
        
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        } else if (aIndex !== -1) {
          return -1
        } else if (bIndex !== -1) {
          return 1
        } else {
          return a.name.localeCompare(b.name)
        }
      })
    }

    return sortFolders(rootFolders)
  }

  const handleFolderToggle = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleAccountToggle = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="space-y-1">
        {/* All Emails */}
        <div
          className={`
            flex items-center py-2 px-2 cursor-pointer hover:bg-gray-100 rounded-md
            ${!selectedFolderId ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}
          `}
          onClick={() => onFolderSelect(null, 'All Emails')}
        >
          <Mail size={16} className="mr-2 text-gray-500" />
          <span className="text-sm font-medium">All Emails</span>
        </div>

        {/* Starred */}
        <div
          className={`
            flex items-center py-2 px-2 cursor-pointer hover:bg-gray-100 rounded-md
            ${selectedFolderId === 'starred' ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}
          `}
          onClick={() => onFolderSelect('starred', 'Starred')}
        >
          <Star size={16} className="mr-2 text-gray-500" />
          <span className="text-sm font-medium">Starred</span>
        </div>

        <div className="border-t border-gray-200 my-2"></div>

        {/* Account folders */}
        {accounts.map((account) => (
          <div key={account.id} className="mb-4">
            <div
              className="flex items-center py-2 px-2 cursor-pointer hover:bg-gray-100 rounded-md"
              onClick={() => handleAccountToggle(account.id)}
            >
              <button className="mr-1 p-0.5 hover:bg-gray-200 rounded">
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
              
              <div className="mr-2 text-gray-500">
                <Mail size={16} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {account.displayName || account.email}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {account.provider.toLowerCase()}
                </div>
              </div>
              
              <div className={`
                w-2 h-2 rounded-full ml-2
                ${account.status === 'ACTIVE' ? 'bg-green-400' : 
                  account.status === 'ERROR' ? 'bg-red-400' : 'bg-gray-400'}
              `} />
            </div>
            
            {expandedAccounts.has(account.id) && account.folders && (
              <div className="ml-4 mt-1">
                {account.folders.map((folder) => (
                  <FolderNode
                    key={folder.id}
                    folder={folder}
                    level={0}
                    isSelected={selectedFolderId === folder.id}
                    onSelect={onFolderSelect}
                    onToggle={handleFolderToggle}
                    isExpanded={expandedFolders.has(folder.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}