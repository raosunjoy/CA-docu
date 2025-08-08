'use client'

import React, { useState, useEffect } from 'react'
import { 
  Mail, 
  Star, 
  Archive, 
  Trash2, 
  Search, 
  Filter,
  RefreshCw,
  ChevronDown,
  Paperclip,
  Tag
} from 'lucide-react'
import { 
  type Email, 
  type EmailAccount,
  type EmailFolder,
  type EmailFilters 
} from '../../types'

interface EmailInboxProps {
  userId: string
  onEmailSelect?: (emailId: string) => void
  selectedEmailId?: string | null
  folder?: string
  onEmailsLoaded?: (emails: any[]) => void
  className?: string
}

interface EmailListItemProps {
  email: Email & {
    account: { email: string; displayName?: string; provider: string }
    folder?: { name: string; displayName?: string }
    attachments: any[]
  }
  isSelected: boolean
  onSelect: (email: any) => void
  onToggleRead: (emailId: string, isRead: boolean) => void
  onToggleStar: (emailId: string, isStarred: boolean) => void
  onArchive: (emailId: string) => void
}

const EmailListItem: React.FC<EmailListItemProps> = ({
  email,
  isSelected,
  onSelect,
  onToggleRead,
  onToggleStar,
  onArchive
}) => {
  const formatDate = (date: Date) => {
    const now = new Date()
    const emailDate = new Date(date)
    const diffInHours = (now.getTime() - emailDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24 * 7) {
      return emailDate.toLocaleDateString([], { weekday: 'short' })
    } else {
      return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  return (
    <div
      className={`
        flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer
        ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
        ${!email.isRead ? 'bg-white font-medium' : 'bg-gray-50 font-normal'}
      `}
      onClick={() => onSelect(email)}
    >
      {/* Selection checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(email)}
        className="mr-3"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Star button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleStar(email.id, !email.isStarred)
        }}
        className={`mr-3 p-1 rounded hover:bg-gray-200 ${
          email.isStarred ? 'text-yellow-500' : 'text-gray-400'
        }`}
      >
        <Star size={16} fill={email.isStarred ? 'currentColor' : 'none'} />
      </button>

      {/* Email content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <span className={`truncate ${!email.isRead ? 'font-semibold' : ''}`}>
              {email.fromName || email.fromAddress}
            </span>
            {email.attachments.length > 0 && (
              <Paperclip size={14} className="text-gray-400" />
            )}
            {email.linkedTaskIds.length > 0 && (
              <Tag size={14} className="text-blue-500" />
            )}
          </div>
          <span className="text-sm text-gray-500 flex-shrink-0">
            {formatDate(email.receivedAt)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className={`text-sm truncate ${!email.isRead ? 'font-medium' : 'text-gray-600'}`}>
              {email.subject || '(No subject)'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">
              {email.snippet || email.bodyText?.substring(0, 100)}
            </p>
          </div>
          
          {/* Labels */}
          {email.labels.length > 0 && (
            <div className="flex space-x-1 ml-2">
              {email.labels.slice(0, 2).map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {label}
                </span>
              ))}
              {email.labels.length > 2 && (
                <span className="text-xs text-gray-500">+{email.labels.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleRead(email.id, !email.isRead)
          }}
          className="p-1 rounded hover:bg-gray-200 text-gray-500"
          title={email.isRead ? 'Mark as unread' : 'Mark as read'}
        >
          <Mail size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onArchive(email.id)
          }}
          className="p-1 rounded hover:bg-gray-200 text-gray-500"
          title="Archive"
        >
          <Archive size={14} />
        </button>
      </div>
    </div>
  )
}

export const EmailInbox: React.FC<EmailInboxProps> = ({ 
  userId, 
  onEmailSelect,
  selectedEmailId,
  folder,
  onEmailsLoaded,
  className = '' 
}) => {
  const [emails, setEmails] = useState<any[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<EmailFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [folders, setFolders] = useState<EmailFolder[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Load initial data
  useEffect(() => {
    loadEmails()
    loadAccounts()
  }, [userId, filters, currentPage])

  const loadEmails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/emails?${new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key, 
            Array.isArray(value) ? value.join(',') : String(value)
          ])
        )
      })}`)
      
      if (response.ok) {
        const result = await response.json()
        setEmails(result.data)
        setHasMore(result.pagination.hasMore)
        onEmailsLoaded?.(result.data)
      }
    } catch (error) {
      console.error('Failed to load emails:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/emails/accounts')
      if (response.ok) {
        const accountsData = await response.json()
        setAccounts(accountsData)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const syncPromises = accounts.map(account => 
        fetch(`/api/emails/accounts/${account.id}/sync`, { method: 'POST' })
      )
      await Promise.all(syncPromises)
      await loadEmails()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFilters({})
      return
    }

    try {
      const response = await fetch(`/api/emails/search?${new URLSearchParams({
        query: searchQuery,
        page: '1',
        limit: '50'
      })}`)
      
      if (response.ok) {
        const result = await response.json()
        setEmails(result.data)
        setHasMore(result.pagination.hasMore)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleEmailSelect = (email: any) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(email.id)) {
      newSelected.delete(email.id)
    } else {
      newSelected.add(email.id)
    }
    setSelectedEmails(newSelected)
    // Also trigger the email selection callback
    onEmailSelect?.(email.id)
  }

  const handleToggleRead = async (emailId: string, isRead: boolean) => {
    try {
      await fetch(`/api/emails/${emailId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead })
      })
      
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, isRead } : email
      ))
    } catch (error) {
      console.error('Failed to update read status:', error)
    }
  }

  const handleToggleStar = async (emailId: string, isStarred: boolean) => {
    try {
      await fetch(`/api/emails/${emailId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred })
      })
      
      setEmails(emails.map(email => 
        email.id === emailId ? { ...email, isStarred } : email
      ))
    } catch (error) {
      console.error('Failed to update star status:', error)
    }
  }

  const handleArchive = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      })
      
      setEmails(emails.filter(email => email.id !== emailId))
    } catch (error) {
      console.error('Failed to archive email:', error)
    }
  }

  const handleBulkAction = async (action: string) => {
    const emailIds = Array.from(selectedEmails)
    if (emailIds.length === 0) return

    try {
      await fetch('/api/emails/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds, action })
      })
      
      await loadEmails()
      setSelectedEmails(new Set())
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Inbox</h2>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search size={16} className="absolute left-2 top-3 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <select
              value={filters.accountId || ''}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value || undefined })}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.displayName || account.email}
                </option>
              ))}
            </select>

            <select
              value={filters.isRead?.toString() || ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                isRead: e.target.value ? e.target.value === 'true' : undefined 
              })}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All emails</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>

            <select
              value={filters.isStarred?.toString() || ''}
              onChange={(e) => setFilters({ 
                ...filters, 
                isStarred: e.target.value ? e.target.value === 'true' : undefined 
              })}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All emails</option>
              <option value="true">Starred</option>
              <option value="false">Not starred</option>
            </select>

            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selectedEmails.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-200">
          <span className="text-sm text-blue-800">
            {selectedEmails.size} email{selectedEmails.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleBulkAction('markRead')}
              className="px-3 py-1 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
            >
              Mark as read
            </button>
            <button
              onClick={() => handleBulkAction('archive')}
              className="px-3 py-1 text-sm bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Mail size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No emails found</p>
            </div>
          </div>
        ) : (
          <div className="group">
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmails.has(email.id)}
                onSelect={handleEmailSelect}
                onToggleRead={handleToggleRead}
                onToggleStar={handleToggleStar}
                onArchive={handleArchive}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Load more emails
            </button>
          </div>
        )}
      </div>
    </div>
  )
}