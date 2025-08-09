// Zetra Platform - Email Synchronization Service
// Handles bi-directional email sync with conflict resolution

import { prisma } from './prisma'
import { gmailService } from './gmail-service'
import { nylasService } from './nylas-service'
import { encrypt, decrypt } from './crypto'
import { 
  EmailProvider, 
  EmailAccountStatus, 
  EmailSyncStatus
} from '../../generated/prisma'
import type { EmailSyncResult } from '../types'

interface SyncConflict {
  type: 'update' | 'delete' | 'move'
  localEmail: any
  remoteEmail: any
  resolution?: 'local' | 'remote' | 'merge'
}

interface SyncOptions {
  fullSync?: boolean
  folderId?: string
  maxEmails?: number
  conflictResolution?: 'local' | 'remote' | 'merge' | 'prompt'
  useNylas?: boolean // Option to use Nylas vs direct provider
}

export class EmailSyncService {
  private syncQueue = new Map<string, Promise<EmailSyncResult>>()

  async syncAccount(accountId: string, options: SyncOptions = {}): Promise<EmailSyncResult> {
    // Prevent concurrent syncs for the same account
    if (this.syncQueue.has(accountId)) {
      return this.syncQueue.get(accountId)!
    }

    const syncPromise = this.performSync(accountId, options)
    this.syncQueue.set(accountId, syncPromise)

    try {
      const result = await syncPromise
      return result
    } finally {
      this.syncQueue.delete(accountId)
    }
  }

  private async performSync(accountId: string, options: SyncOptions): Promise<EmailSyncResult> {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
      include: {
        emailFolders: true
      }
    })

    if (!account) {
      throw new Error('Email account not found')
    }

    if (account.status !== EmailAccountStatus.ACTIVE) {
      throw new Error('Email account is not active')
    }

    // Create sync log
    const syncLog = await prisma.emailSyncLog.create({
      data: {
        accountId,
        syncType: options.fullSync ? 'full' : 'incremental',
        status: 'started'
      }
    })

    try {
      // Update account sync status
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { 
          syncStatus: EmailSyncStatus.SYNCING,
          syncError: null
        }
      })

      const result = await this.syncWithProvider(account, options)

      // Update sync log
      await prisma.emailSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          emailsProcessed: result.emailsProcessed,
          emailsAdded: result.emailsAdded,
          emailsUpdated: result.emailsUpdated,
          emailsDeleted: result.emailsDeleted,
          errorsCount: result.errorsCount
        }
      })

      // Update account sync status
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { 
          syncStatus: EmailSyncStatus.IDLE,
          lastSyncAt: new Date()
        }
      })

      return result
    } catch (error) {
      // Update sync log with error
      await prisma.emailSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error instanceof Error ? { stack: error.stack } : {}
        }
      })

      // Update account sync status
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { 
          syncStatus: EmailSyncStatus.ERROR,
          syncError: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  private async syncWithProvider(account: any, options: SyncOptions): Promise<EmailSyncResult> {
    const result: EmailSyncResult = {
      accountId: account.id,
      success: true,
      emailsProcessed: 0,
      emailsAdded: 0,
      emailsUpdated: 0,
      emailsDeleted: 0,
      errorsCount: 0,
      startedAt: new Date()
    }

    try {
      // Use Nylas for unified provider support if requested or if account has Nylas integration
      const useNylas = options.useNylas || 
                      account.externalId || 
                      account.metadata?.nylasAccountId ||
                      process.env.PREFER_NYLAS === 'true'

      if (useNylas && [EmailProvider.GMAIL, EmailProvider.OUTLOOK, EmailProvider.EXCHANGE, EmailProvider.IMAP].includes(account.provider)) {
        return await this.syncWithNylas(account, options, result)
      }

      // Fallback to direct provider integration
      switch (account.provider) {
        case EmailProvider.GMAIL:
          return await this.syncGmail(account, options, result)
        case EmailProvider.OUTLOOK:
          return await this.syncOutlook(account, options, result)
        case EmailProvider.EXCHANGE:
          return await this.syncExchange(account, options, result)
        case EmailProvider.IMAP:
          return await this.syncImap(account, options, result)
        default:
          throw new Error(`Unsupported email provider: ${account.provider}`)
      }
    } catch (error) {
      result.success = false
      result.errorsCount++
      throw error
    } finally {
      result.completedAt = new Date()
    }
  }

  private async syncWithNylas(account: any, options: SyncOptions, result: EmailSyncResult): Promise<EmailSyncResult> {
    try {
      // Use NylasService for unified multi-provider sync
      const nylasSyncResult = await nylasService.syncEmails(account, {
        maxEmails: options.maxEmails,
        fullSync: options.fullSync,
        folderId: options.folderId
      })

      // Merge results
      result.emailsProcessed = nylasSyncResult.emailsProcessed
      result.emailsAdded = nylasSyncResult.emailsAdded
      result.emailsUpdated = nylasSyncResult.emailsUpdated
      result.emailsDeleted = nylasSyncResult.emailsDeleted
      result.errorsCount = nylasSyncResult.errorsCount
      result.success = nylasSyncResult.success

      return result
    } catch (error) {
      console.error('Nylas sync failed:', error)
      result.success = false
      result.errorsCount = 1
      throw error
    }
  }

  private async syncGmail(account: any, options: SyncOptions, result: EmailSyncResult): Promise<EmailSyncResult> {
    try {
      // Use the new GmailService to sync emails
      const gmailSyncResult = await gmailService.syncEmails(account, {
        maxEmails: options.maxEmails,
        fullSync: options.fullSync
      })

      // Merge results
      result.emailsProcessed = gmailSyncResult.emailsProcessed
      result.emailsAdded = gmailSyncResult.emailsAdded
      result.emailsUpdated = gmailSyncResult.emailsUpdated
      result.emailsDeleted = gmailSyncResult.emailsDeleted
      result.errorsCount = gmailSyncResult.errorsCount
      result.success = gmailSyncResult.success

      // Also sync labels/folders
      if (result.success) {
        try {
          await gmailService.syncLabels(account)
        } catch (error) {
          console.error('Failed to sync Gmail labels:', error)
          // Don't fail the entire sync for label sync issues
        }
      }

      return result
    } catch (error) {
      console.error('Gmail sync failed:', error)
      result.success = false
      result.errorsCount = 1
      throw error
    }
  }

  private async syncOutlook(account: any, options: SyncOptions, result: EmailSyncResult): Promise<EmailSyncResult> {
    // Microsoft Graph API sync implementation
    const accessToken = decrypt(account.accessToken)
    
    // Check if token is expired and refresh if needed
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
      await this.refreshOutlookToken(account)
    }

    // Get Outlook messages
    const messages = await this.fetchOutlookMessages(accessToken, options)
    result.emailsProcessed = messages.length

    // Process each message
    for (const message of messages) {
      try {
        const existingEmail = await prisma.email.findFirst({
          where: {
            accountId: account.id,
            externalId: message.id
          }
        })

        if (existingEmail) {
          // Check for updates
          const hasChanges = await this.detectOutlookChanges(existingEmail, message)
          if (hasChanges) {
            await this.updateEmailFromOutlook(existingEmail, message)
            result.emailsUpdated++
          }
        } else {
          // Create new email
          await this.createEmailFromOutlook(account, message)
          result.emailsAdded++
        }
      } catch (error) {
        console.error(`Failed to process Outlook message ${message.id}:`, error)
        result.errorsCount++
      }
    }

    return result
  }

  private async syncExchange(account: any, options: SyncOptions, result: EmailSyncResult): Promise<EmailSyncResult> {
    // Exchange Web Services (EWS) sync implementation
    // This would use the EWS API to sync with on-premises Exchange servers
    
    console.log('Exchange sync not yet implemented')
    return result
  }

  private async syncImap(account: any, options: SyncOptions, result: EmailSyncResult): Promise<EmailSyncResult> {
    // IMAP sync implementation
    const password = decrypt(account.password)
    
    // Connect to IMAP server
    const imapClient = await this.connectToImap(account, password)
    
    try {
      // Get IMAP messages
      const messages = await this.fetchImapMessages(imapClient, options)
      result.emailsProcessed = messages.length

      // Process each message
      for (const message of messages) {
        try {
          const existingEmail = await prisma.email.findFirst({
            where: {
              accountId: account.id,
              externalId: message.uid.toString()
            }
          })

          if (existingEmail) {
            // Check for updates
            const hasChanges = await this.detectImapChanges(existingEmail, message)
            if (hasChanges) {
              await this.updateEmailFromImap(existingEmail, message)
              result.emailsUpdated++
            }
          } else {
            // Create new email
            await this.createEmailFromImap(account, message)
            result.emailsAdded++
          }
        } catch (error) {
          console.error(`Failed to process IMAP message ${message.uid}:`, error)
          result.errorsCount++
        }
      }
    } finally {
      await imapClient.close()
    }

    return result
  }

  // Conflict resolution methods
  async resolveConflicts(accountId: string, conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      try {
        switch (conflict.resolution || 'merge') {
          case 'local':
            await this.applyLocalChanges(conflict)
            break
          case 'remote':
            await this.applyRemoteChanges(conflict)
            break
          case 'merge':
            await this.mergeChanges(conflict)
            break
        }
      } catch (error) {
        console.error('Failed to resolve conflict:', error)
      }
    }
  }

  private async applyLocalChanges(conflict: SyncConflict): Promise<void> {
    // Push local changes to remote provider
    // Implementation depends on the provider and conflict type
    console.log('Applying local changes for conflict:', conflict.type)
  }

  private async applyRemoteChanges(conflict: SyncConflict): Promise<void> {
    // Apply remote changes to local database
    await prisma.email.update({
      where: { id: conflict.localEmail.id },
      data: {
        subject: conflict.remoteEmail.subject,
        bodyText: conflict.remoteEmail.bodyText,
        bodyHtml: conflict.remoteEmail.bodyHtml,
        isRead: conflict.remoteEmail.isRead,
        isStarred: conflict.remoteEmail.isStarred,
        labels: conflict.remoteEmail.labels
      }
    })
  }

  private async mergeChanges(conflict: SyncConflict): Promise<void> {
    // Intelligent merge of local and remote changes
    const mergedData = {
      subject: conflict.remoteEmail.subject || conflict.localEmail.subject,
      bodyText: conflict.remoteEmail.bodyText || conflict.localEmail.bodyText,
      bodyHtml: conflict.remoteEmail.bodyHtml || conflict.localEmail.bodyHtml,
      isRead: conflict.remoteEmail.isRead || conflict.localEmail.isRead,
      isStarred: conflict.remoteEmail.isStarred || conflict.localEmail.isStarred,
      labels: [...new Set([...conflict.localEmail.labels, ...conflict.remoteEmail.labels])]
    }

    await prisma.email.update({
      where: { id: conflict.localEmail.id },
      data: mergedData
    })
  }

  // Provider-specific helper methods will be implemented by individual provider services
  private async fetchOutlookMessages(accessToken: string, options: SyncOptions): Promise<any[]> {
    // Microsoft Graph API call to fetch messages
    // This would use the Graph API to get messages
    return []
  }

  private async connectToImap(account: any, password: string): Promise<any> {
    // IMAP connection implementation
    // This would use a library like node-imap to connect
    return {
      close: async () => {}
    }
  }

  private async fetchImapMessages(imapClient: any, options: SyncOptions): Promise<any[]> {
    // IMAP message fetching
    return []
  }

  private async refreshOutlookToken(account: any): Promise<void> {
    // Outlook token refresh implementation
    console.log('Refreshing Outlook token for account:', account.id)
  }

  private async detectOutlookChanges(localEmail: any, remoteMessage: any): Promise<boolean> {
    // Compare local and remote email to detect changes
    return false
  }

  private async detectImapChanges(localEmail: any, remoteMessage: any): Promise<boolean> {
    // Compare local and remote email to detect changes
    return false
  }

  private async updateEmailFromOutlook(localEmail: any, remoteMessage: any): Promise<void> {
    // Update local email with Outlook data
    console.log('Updating email from Outlook:', localEmail.id)
  }

  private async updateEmailFromImap(localEmail: any, remoteMessage: any): Promise<void> {
    // Update local email with IMAP data
    console.log('Updating email from IMAP:', localEmail.id)
  }

  private async createEmailFromOutlook(account: any, remoteMessage: any): Promise<void> {
    // Create new email from Outlook data
    console.log('Creating email from Outlook for account:', account.id)
  }

  private async createEmailFromImap(account: any, remoteMessage: any): Promise<void> {
    // Create new email from IMAP data
    console.log('Creating email from IMAP for account:', account.id)
  }

  // Real-time sync methods
  async startRealTimeSync(accountId: string): Promise<void> {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    try {
      // Use Nylas webhooks for unified multi-provider support
      const useNylas = account.externalId || 
                      account.metadata?.nylasAccountId ||
                      process.env.PREFER_NYLAS === 'true'

      if (useNylas) {
        const webhookUrl = `${process.env.ZETRA_BASE_URL}/api/emails/webhook/nylas`
        await nylasService.setupWebhooks(account, webhookUrl)
      } else {
        // Fallback to provider-specific webhooks
        if (account.provider === EmailProvider.GMAIL) {
          const webhookUrl = `${process.env.ZETRA_BASE_URL}/api/emails/webhook/gmail`
          await gmailService.setupPushNotifications(account, webhookUrl)
        }
        // Add other providers as needed
      }
      
      console.log('Real-time sync started for account:', accountId)
    } catch (error) {
      console.error('Failed to start real-time sync:', error)
      throw error
    }
  }

  async stopRealTimeSync(accountId: string): Promise<void> {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    try {
      // Check if using Nylas or direct provider
      const useNylas = account.externalId || 
                      account.metadata?.nylasAccountId ||
                      process.env.PREFER_NYLAS === 'true'

      if (useNylas) {
        // Nylas webhooks are managed centrally, just mark as stopped
        console.log('Nylas webhook stopping not implemented - webhooks are managed globally')
      } else {
        // Stop provider-specific webhooks
        if (account.provider === EmailProvider.GMAIL) {
          await gmailService.stopPushNotifications(account)
        }
        // Add other providers as needed
      }
      
      console.log('Real-time sync stopped for account:', accountId)
    } catch (error) {
      console.error('Failed to stop real-time sync:', error)
      throw error
    }
  }

  // Webhook processing
  async processWebhookNotification(provider: EmailProvider | 'nylas', webhookData: any): Promise<{
    success: boolean
    accountId?: string
    processed?: boolean
    messagesProcessed?: number
  }> {
    try {
      if (provider === 'nylas') {
        const result = await nylasService.processWebhookNotification(webhookData)
        return {
          success: true,
          accountId: result.accountId,
          processed: result.processed,
          messagesProcessed: result.messagesProcessed
        }
      }

      switch (provider) {
        case EmailProvider.GMAIL:
          const result = await gmailService.processWebhookNotification(webhookData)
          return {
            success: true,
            accountId: result.accountId,
            processed: result.processed
          }
        default:
          console.warn(`Webhook processing not implemented for provider: ${provider}`)
          return { success: false }
      }
    } catch (error) {
      console.error('Failed to process webhook notification:', error)
      return { success: false }
    }
  }

  // Offline queue management
  async queueOfflineChanges(accountId: string, changes: any[]): Promise<void> {
    // Queue changes made while offline
    console.log('Queueing offline changes for account:', accountId)
  }

  async processOfflineQueue(accountId: string): Promise<void> {
    // Process queued offline changes when back online
    console.log('Processing offline queue for account:', accountId)
  }
}

export const emailSyncService = new EmailSyncService()