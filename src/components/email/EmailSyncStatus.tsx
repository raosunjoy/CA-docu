'use client'

import React, { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  Activity,
  Pause,
  Play
} from 'lucide-react'
import { 
  type EmailAccount, 
  type EmailSyncResult,
  EmailAccountStatus,
  EmailSyncStatus 
} from '../../types'

interface EmailSyncStatusProps {
  accounts: EmailAccount[]
  onSyncAccount: (accountId: string) => Promise<void>
  onToggleSync: (accountId: string, enabled: boolean) => Promise<void>
  className?: string
}

interface SyncStatusItemProps {
  account: EmailAccount & { 
    lastSyncResult?: EmailSyncResult
    isOnline?: boolean
  }
  onSync: (accountId: string) => Promise<void>
  onToggleSync: (accountId: string, enabled: boolean) => Promise<void>
}

const SyncStatusItem: React.FC<SyncStatusItemProps> = ({
  account,
  onSync,
  onToggleSync
}) => {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    try {
      setSyncing(true)
      await onSync(account.id)
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  const getStatusIcon = () => {
    if (syncing || account.syncStatus === EmailSyncStatus.SYNCING) {
      return <RefreshCw size={16} className="text-blue-600 animate-spin" />
    }

    switch (account.status) {
      case EmailAccountStatus.ACTIVE:
        if (account.syncStatus === EmailSyncStatus.ERROR) {
          return <XCircle size={16} className="text-red-600" />
        }
        return <CheckCircle size={16} className="text-green-600" />
      case EmailAccountStatus.ERROR:
      case EmailAccountStatus.EXPIRED:
      case EmailAccountStatus.REVOKED:
        return <AlertCircle size={16} className="text-red-600" />
      case EmailAccountStatus.INACTIVE:
        return <Pause size={16} className="text-gray-400" />
      default:
        return <Clock size={16} className="text-yellow-600" />
    }
  }

  const getStatusText = () => {
    if (syncing || account.syncStatus === EmailSyncStatus.SYNCING) {
      return 'Syncing...'
    }

    switch (account.status) {
      case EmailAccountStatus.ACTIVE:
        if (account.syncStatus === EmailSyncStatus.ERROR) {
          return account.syncError || 'Sync error'
        }
        return account.lastSyncAt 
          ? `Last sync: ${new Date(account.lastSyncAt).toLocaleString()}`
          : 'Ready to sync'
      case EmailAccountStatus.ERROR:
        return 'Account error'
      case EmailAccountStatus.EXPIRED:
        return 'Token expired'
      case EmailAccountStatus.REVOKED:
        return 'Access revoked'
      case EmailAccountStatus.INACTIVE:
        return 'Sync disabled'
      default:
        return 'Unknown status'
    }
  }

  const formatSyncStats = () => {
    if (!account.lastSyncResult) return null

    const { emailsAdded, emailsUpdated, emailsDeleted, errorsCount } = account.lastSyncResult
    const total = emailsAdded + emailsUpdated + emailsDeleted

    if (total === 0 && errorsCount === 0) {
      return 'No changes'
    }

    const parts = []
    if (emailsAdded > 0) parts.push(`+${emailsAdded}`)
    if (emailsUpdated > 0) parts.push(`~${emailsUpdated}`)
    if (emailsDeleted > 0) parts.push(`-${emailsDeleted}`)
    if (errorsCount > 0) parts.push(`${errorsCount} errors`)

    return parts.join(', ')
  }

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <div className="flex items-center space-x-1">
            {account.isOnline ? (
              <Wifi size={12} className="text-green-600" />
            ) : (
              <WifiOff size={12} className="text-gray-400" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900">
              {account.displayName || account.email}
            </h4>
            <span className="text-xs text-gray-500 uppercase">
              {account.provider}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            {getStatusText()}
          </div>
          
          {account.lastSyncResult && (
            <div className="text-xs text-gray-500 mt-1">
              {formatSyncStats()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Sync toggle */}
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={account.syncEnabled}
            onChange={(e) => onToggleSync(account.id, e.target.checked)}
            className="sr-only"
          />
          <div className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${account.syncEnabled ? 'bg-blue-600' : 'bg-gray-200'}
          `}>
            <span className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${account.syncEnabled ? 'translate-x-6' : 'translate-x-1'}
            `} />
          </div>
        </label>

        {/* Manual sync button */}
        <button
          onClick={handleSync}
          disabled={syncing || account.status !== EmailAccountStatus.ACTIVE}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sync now"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
        </button>

        {/* Settings button */}
        <button
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="Account settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}

export const EmailSyncStatus: React.FC<EmailSyncStatusProps> = ({
  accounts,
  onSyncAccount,
  onToggleSync,
  className = ''
}) => {
  const [syncStats, setSyncStats] = useState<{
    totalAccounts: number
    activeAccounts: number
    syncingAccounts: number
    errorAccounts: number
    lastGlobalSync?: Date
  }>({
    totalAccounts: 0,
    activeAccounts: 0,
    syncingAccounts: 0,
    errorAccounts: 0
  })

  const [showDetails, setShowDetails] = useState(false)
  const [globalSyncing, setGlobalSyncing] = useState(false)

  useEffect(() => {
    updateSyncStats()
  }, [accounts])

  const updateSyncStats = () => {
    const stats = {
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter(acc => acc.status === EmailAccountStatus.ACTIVE).length,
      syncingAccounts: accounts.filter(acc => acc.syncStatus === EmailSyncStatus.SYNCING).length,
      errorAccounts: accounts.filter(acc => 
        acc.status === EmailAccountStatus.ERROR || 
        acc.syncStatus === EmailSyncStatus.ERROR
      ).length
    }

    setSyncStats(stats)
  }

  const handleSyncAll = async () => {
    try {
      setGlobalSyncing(true)
      const activeAccounts = accounts.filter(acc => 
        acc.status === EmailAccountStatus.ACTIVE && acc.syncEnabled
      )
      
      await Promise.all(
        activeAccounts.map(account => onSyncAccount(account.id))
      )
    } catch (error) {
      console.error('Global sync failed:', error)
    } finally {
      setGlobalSyncing(false)
    }
  }

  const getGlobalStatus = () => {
    if (globalSyncing || syncStats.syncingAccounts > 0) {
      return { icon: RefreshCw, text: 'Syncing...', color: 'text-blue-600' }
    }
    
    if (syncStats.errorAccounts > 0) {
      return { icon: AlertCircle, text: `${syncStats.errorAccounts} errors`, color: 'text-red-600' }
    }
    
    if (syncStats.activeAccounts === 0) {
      return { icon: XCircle, text: 'No active accounts', color: 'text-gray-500' }
    }
    
    return { icon: CheckCircle, text: 'All accounts synced', color: 'text-green-600' }
  }

  const globalStatus = getGlobalStatus()
  const StatusIcon = globalStatus.icon

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Activity className="text-blue-600" size={20} />
          <div>
            <h3 className="text-lg font-semibold">Email Sync Status</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <StatusIcon size={16} className={`${globalStatus.color} ${globalSyncing ? 'animate-spin' : ''}`} />
              <span>{globalStatus.text}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          <button
            onClick={handleSyncAll}
            disabled={globalSyncing || syncStats.activeAccounts === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RefreshCw size={16} className={globalSyncing ? 'animate-spin' : ''} />
            <span>{globalSyncing ? 'Syncing...' : 'Sync All'}</span>
          </button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{syncStats.totalAccounts}</div>
            <div className="text-sm text-gray-600">Total Accounts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{syncStats.activeAccounts}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{syncStats.syncingAccounts}</div>
            <div className="text-sm text-gray-600">Syncing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{syncStats.errorAccounts}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>
      </div>

      {/* Account details */}
      {showDetails && (
        <div className="p-4">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No email accounts configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(account => (
                <SyncStatusItem
                  key={account.id}
                  account={account}
                  onSync={onSyncAccount}
                  onToggleSync={onToggleSync}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}