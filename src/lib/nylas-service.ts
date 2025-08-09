// Nylas Service - Multi-Provider Email Integration
import { Nylas, NylasApi } from 'nylas'
import { prisma } from './prisma'
import { encrypt, decrypt } from './crypto'
import type { 
  EmailProvider, 
  EmailSyncStatus,
  EmailAccountStatus
} from '../../generated/prisma'
import type {
  EmailSyncResult,
  EmailMessage,
  EmailAttachment,
  EmailAccountData
} from '../types'

interface NylasSyncOptions {
  maxEmails?: number
  query?: string
  fullSync?: boolean
  folderId?: string
}

interface NylasWebhookData {
  deltas: Array<{
    object: string
    type: 'message.created' | 'message.updated' | 'message.deleted'
    object_data: any
  }>
}

export class NylasService {
  private nylas: NylasApi

  constructor() {
    this.nylas = new Nylas({
      apiKey: process.env.NYLAS_API_KEY!,
      apiUri: process.env.NYLAS_API_URI || 'https://api.nylas.com'
    })
  }

  async createAccount(accountData: EmailAccountData): Promise<string> {
    try {
      const providerSettings = this.getProviderSettings(accountData.provider)
      
      const account = await this.nylas.accounts.create({
        name: accountData.displayName || accountData.email,
        emailAddress: accountData.email,
        provider: this.mapProviderToNylas(accountData.provider),
        settings: providerSettings,
        ...this.getAuthConfig(accountData)
      })

      // Store account in database
      const encryptedAccessToken = accountData.accessToken ? encrypt(accountData.accessToken) : undefined
      const encryptedRefreshToken = accountData.refreshToken ? encrypt(accountData.refreshToken) : undefined
      const encryptedPassword = accountData.password ? encrypt(accountData.password) : undefined

      await prisma.emailAccount.create({
        data: {
          userId: '', // Will be set by calling function
          organizationId: '', // Will be set by calling function
          provider: accountData.provider,
          email: accountData.email,
          displayName: accountData.displayName,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          password: encryptedPassword,
          tokenExpiresAt: accountData.tokenExpiresAt,
          status: EmailAccountStatus.ACTIVE,
          syncStatus: EmailSyncStatus.IDLE,
          isDefault: accountData.isDefault || false,
          syncEnabled: accountData.syncEnabled !== false,
          syncFolders: accountData.syncFolders || [],
          maxSyncDays: accountData.maxSyncDays || 30,
          externalId: account.id, // Store Nylas account ID
          imapHost: accountData.imapHost,
          imapPort: accountData.imapPort,
          smtpHost: accountData.smtpHost,
          smtpPort: accountData.smtpPort,
          metadata: {
            nylasAccountId: account.id,
            provider: accountData.provider,
            capabilities: this.getProviderCapabilities(accountData.provider)
          }
        }
      })

      return account.id
    } catch (error) {
      console.error('Failed to create Nylas account:', error)
      throw new Error('Failed to create email account')
    }
  }

  private mapProviderToNylas(provider: EmailProvider): string {
    switch (provider) {
      case EmailProvider.GMAIL:
        return 'gmail'
      case EmailProvider.OUTLOOK:
        return 'outlook'
      case EmailProvider.EXCHANGE:
        return 'exchange'
      case EmailProvider.IMAP:
        return 'imap'
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  private getProviderSettings(provider: EmailProvider): Record<string, any> {
    switch (provider) {
      case EmailProvider.GMAIL:
        return {
          google_client_id: process.env.GOOGLE_CLIENT_ID,
          google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
          google_refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        }
      case EmailProvider.OUTLOOK:
        return {
          microsoft_client_id: process.env.MICROSOFT_CLIENT_ID,
          microsoft_client_secret: process.env.MICROSOFT_CLIENT_SECRET,
          microsoft_refresh_token: process.env.MICROSOFT_REFRESH_TOKEN
        }
      case EmailProvider.EXCHANGE:
        return {
          eas_server_host: process.env.EAS_SERVER_HOST,
          eas_server_port: process.env.EAS_SERVER_PORT || 443,
          username: process.env.EAS_USERNAME,
          password: process.env.EAS_PASSWORD
        }
      case EmailProvider.IMAP:
        return {
          imap_host: process.env.IMAP_HOST,
          imap_port: process.env.IMAP_PORT || 993,
          smtp_host: process.env.SMTP_HOST,
          smtp_port: process.env.SMTP_PORT || 587
        }
      default:
        return {}
    }
  }

  private getAuthConfig(accountData: EmailAccountData): Record<string, any> {
    if (accountData.accessToken && accountData.refreshToken) {
      return {
        accessToken: accountData.accessToken,
        refreshToken: accountData.refreshToken,
        tokenExpiresAt: accountData.tokenExpiresAt
      }
    }

    if (accountData.username && accountData.password) {
      return {
        username: accountData.username,
        password: accountData.password
      }
    }

    return {}
  }

  private getProviderCapabilities(provider: EmailProvider): string[] {
    const baseCapabilities = ['send', 'receive', 'folders', 'labels']
    
    switch (provider) {
      case EmailProvider.GMAIL:
        return [...baseCapabilities, 'push_notifications', 'threads', 'search', 'labels']
      case EmailProvider.OUTLOOK:
        return [...baseCapabilities, 'push_notifications', 'calendar', 'contacts']
      case EmailProvider.EXCHANGE:
        return [...baseCapabilities, 'calendar', 'contacts', 'global_address_list']
      case EmailProvider.IMAP:
        return ['send', 'receive', 'folders']
      default:
        return baseCapabilities
    }
  }

  async fetchMessages(account: any, options: NylasSyncOptions = {}): Promise<EmailMessage[]> {
    try {
      const nylasAccountId = account.externalId || account.metadata?.nylasAccountId
      
      if (!nylasAccountId) {
        throw new Error('No Nylas account ID found')
      }

      // Build query parameters
      const queryParams: any = {
        limit: Math.min(options.maxEmails || 100, 200), // Nylas limit
        in: options.folderId ? [options.folderId] : ['inbox'],
        thread_id: options.query ? undefined : undefined // Could be enhanced with search
      }

      if (options.query) {
        queryParams.q = options.query
      }

      // Fetch messages from Nylas
      const messages = await this.nylas.messages.list({
        identifier: nylasAccountId,
        queryParams
      })

      // Convert Nylas messages to our EmailMessage format
      const emailMessages: EmailMessage[] = []

      for (const nylasMessage of messages.data) {
        try {
          const emailMessage = await this.convertNylasMessageToEmail(nylasMessage)
          emailMessages.push(emailMessage)
        } catch (error) {
          console.error(`Failed to convert message ${nylasMessage.id}:`, error)
          continue
        }
      }

      return emailMessages
    } catch (error) {
      if (error.status === 429) {
        throw new Error('Nylas API rate limit exceeded')
      }
      if (error.status === 403) {
        throw new Error('Nylas API access denied')
      }
      if (error.status === 401) {
        throw new Error('Nylas authentication failed')
      }
      console.error('Failed to fetch messages from Nylas:', error)
      throw error
    }
  }

  private async convertNylasMessageToEmail(nylasMessage: any): Promise<EmailMessage> {
    // Extract recipients
    const toAddresses = nylasMessage.to?.map((recipient: any) => recipient.email) || []
    const ccAddresses = nylasMessage.cc?.map((recipient: any) => recipient.email) || []
    const bccAddresses = nylasMessage.bcc?.map((recipient: any) => recipient.email) || []

    // Parse attachments
    const attachments: EmailAttachment[] = []
    if (nylasMessage.attachments) {
      for (const attachment of nylasMessage.attachments) {
        attachments.push({
          filename: attachment.filename || 'attachment',
          mimeType: attachment.content_type,
          attachmentId: attachment.id,
          size: attachment.size
        })
      }
    }

    // Determine read status
    const isRead = !nylasMessage.unread
    const isStarred = nylasMessage.starred || false

    // Convert Nylas labels/folders to our format
    const labels = nylasMessage.folders?.map((folder: any) => folder.name) || []

    return {
      id: nylasMessage.id,
      threadId: nylasMessage.thread_id,
      from: `${nylasMessage.from?.[0]?.name || ''} <${nylasMessage.from?.[0]?.email || ''}>`,
      to: toAddresses.join(', '),
      cc: ccAddresses.length > 0 ? ccAddresses.join(', ') : undefined,
      bcc: bccAddresses.length > 0 ? bccAddresses.join(', ') : undefined,
      subject: nylasMessage.subject || '',
      date: new Date(nylasMessage.date * 1000), // Nylas uses Unix timestamp
      bodyText: nylasMessage.body || undefined,
      bodyHtml: nylasMessage.body || undefined, // Nylas provides unified body
      snippet: nylasMessage.snippet || undefined,
      labels,
      isRead,
      isStarred,
      hasAttachments: attachments.length > 0,
      attachments: attachments.length > 0 ? attachments : undefined,
      internalDate: new Date(nylasMessage.date * 1000)
    }
  }

  async syncEmails(account: any, options: NylasSyncOptions = {}): Promise<EmailSyncResult> {
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
      const messages = await this.fetchMessages(account, options)
      result.emailsProcessed = messages.length

      for (const message of messages) {
        try {
          // Check if email already exists
          const existingEmail = await prisma.email.findFirst({
            where: {
              accountId: account.id,
              externalId: message.id
            }
          })

          if (existingEmail) {
            // Update existing email if there are changes
            const hasChanges = await this.hasEmailChanges(existingEmail, message)
            if (hasChanges) {
              await this.updateEmailFromMessage(existingEmail.id, message, account.id)
              result.emailsUpdated++
            }
          } else {
            // Create new email
            await this.createEmailFromMessage(message, account.id)
            result.emailsAdded++
          }
        } catch (error) {
          console.error(`Failed to process email ${message.id}:`, error)
          result.errorsCount++
        }
      }

      // Sync folders if successful
      if (result.errorsCount === 0) {
        try {
          await this.syncFolders(account)
        } catch (error) {
          console.error('Failed to sync folders:', error)
          // Don't fail the entire sync for folder sync issues
        }
      }

      result.success = result.errorsCount === 0
    } catch (error) {
      result.success = false
      result.errorsCount = result.emailsProcessed
      throw error
    } finally {
      result.completedAt = new Date()
    }

    return result
  }

  private async hasEmailChanges(existingEmail: any, message: EmailMessage): Promise<boolean> {
    return (
      existingEmail.subject !== message.subject ||
      existingEmail.isRead !== message.isRead ||
      existingEmail.isStarred !== message.isStarred ||
      JSON.stringify(existingEmail.labels) !== JSON.stringify(message.labels)
    )
  }

  private async updateEmailFromMessage(emailId: string, message: EmailMessage, accountId: string): Promise<void> {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        subject: message.subject,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml,
        isRead: message.isRead,
        isStarred: message.isStarred,
        labels: message.labels,
        snippet: message.snippet,
        hasAttachments: message.hasAttachments,
        updatedAt: new Date()
      }
    })
  }

  private async createEmailFromMessage(message: EmailMessage, accountId: string): Promise<void> {
    await prisma.email.create({
      data: {
        accountId,
        externalId: message.id,
        threadId: message.threadId,
        from: message.from,
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        bodyText: message.bodyText,
        bodyHtml: message.bodyHtml,
        snippet: message.snippet,
        date: message.date,
        internalDate: message.internalDate,
        isRead: message.isRead,
        isStarred: message.isStarred,
        labels: message.labels,
        hasAttachments: message.hasAttachments,
        metadata: {
          attachments: message.attachments || [],
          provider: 'nylas'
        }
      }
    })
  }

  async syncFolders(account: any): Promise<{ foldersProcessed: number; foldersAdded: number; foldersUpdated: number }> {
    const nylasAccountId = account.externalId || account.metadata?.nylasAccountId
    
    if (!nylasAccountId) {
      throw new Error('No Nylas account ID found')
    }

    const folders = await this.nylas.folders.list({
      identifier: nylasAccountId
    })

    const result = {
      foldersProcessed: 0,
      foldersAdded: 0,
      foldersUpdated: 0
    }

    for (const folder of folders.data) {
      result.foldersProcessed++

      const existingFolder = await prisma.emailFolder.findFirst({
        where: {
          accountId: account.id,
          externalId: folder.id
        }
      })

      if (!existingFolder) {
        await prisma.emailFolder.create({
          data: {
            accountId: account.id,
            name: folder.name,
            displayName: folder.display_name || folder.name,
            externalId: folder.id,
            type: folder.system_folder ? 'system' : 'user',
            metadata: {
              attributes: folder.attributes || [],
              totalCount: folder.total_count || 0,
              unreadCount: folder.unread_count || 0
            }
          }
        })
        result.foldersAdded++
      }
    }

    return result
  }

  async setupWebhooks(account: any, webhookUrl: string): Promise<{ webhookId: string; status: string }> {
    const nylasAccountId = account.externalId || account.metadata?.nylasAccountId
    
    if (!nylasAccountId) {
      throw new Error('No Nylas account ID found')
    }

    try {
      const webhook = await this.nylas.webhooks.create({
        callbackUrl: webhookUrl,
        state: 'active',
        triggers: ['message.created', 'message.updated', 'message.deleted']
      })

      // Store webhook ID in account metadata
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          metadata: {
            ...account.metadata,
            webhookId: webhook.id
          }
        }
      })

      return {
        webhookId: webhook.id,
        status: webhook.state
      }
    } catch (error) {
      console.error('Failed to setup Nylas webhooks:', error)
      throw error
    }
  }

  async processWebhookNotification(webhookData: NylasWebhookData): Promise<{
    accountId?: string
    processed: boolean
    messagesProcessed: number
  }> {
    try {
      let messagesProcessed = 0
      let accountId: string | undefined

      for (const delta of webhookData.deltas) {
        if (delta.object === 'message') {
          // Find account by Nylas account ID
          const account = await prisma.emailAccount.findFirst({
            where: {
              externalId: delta.object_data.account_id
            }
          })

          if (!account) {
            console.warn(`No account found for Nylas account ID: ${delta.object_data.account_id}`)
            continue
          }

          accountId = account.id

          switch (delta.type) {
            case 'message.created':
              await this.handleMessageCreated(account, delta.object_data)
              messagesProcessed++
              break
            case 'message.updated':
              await this.handleMessageUpdated(account, delta.object_data)
              messagesProcessed++
              break
            case 'message.deleted':
              await this.handleMessageDeleted(account, delta.object_data)
              messagesProcessed++
              break
          }
        }
      }

      return {
        accountId,
        processed: true,
        messagesProcessed
      }
    } catch (error) {
      console.error('Failed to process Nylas webhook:', error)
      return {
        processed: false,
        messagesProcessed: 0
      }
    }
  }

  private async handleMessageCreated(account: any, messageData: any): Promise<void> {
    try {
      // Convert message data and create in database
      const message = await this.convertNylasMessageToEmail(messageData)
      await this.createEmailFromMessage(message, account.id)
    } catch (error) {
      console.error('Failed to handle message created:', error)
    }
  }

  private async handleMessageUpdated(account: any, messageData: any): Promise<void> {
    try {
      const existingEmail = await prisma.email.findFirst({
        where: {
          accountId: account.id,
          externalId: messageData.id
        }
      })

      if (existingEmail) {
        const message = await this.convertNylasMessageToEmail(messageData)
        await this.updateEmailFromMessage(existingEmail.id, message, account.id)
      }
    } catch (error) {
      console.error('Failed to handle message updated:', error)
    }
  }

  private async handleMessageDeleted(account: any, messageData: any): Promise<void> {
    try {
      await prisma.email.deleteMany({
        where: {
          accountId: account.id,
          externalId: messageData.id
        }
      })
    } catch (error) {
      console.error('Failed to handle message deleted:', error)
    }
  }

  async sendEmail(account: any, emailData: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    attachments?: Array<{ filename: string; content: string; contentType: string }>
  }): Promise<{ messageId: string; threadId?: string }> {
    const nylasAccountId = account.externalId || account.metadata?.nylasAccountId
    
    if (!nylasAccountId) {
      throw new Error('No Nylas account ID found')
    }

    try {
      const message = await this.nylas.messages.send({
        identifier: nylasAccountId,
        requestBody: {
          to: emailData.to.map(email => ({ email })),
          cc: emailData.cc?.map(email => ({ email })),
          bcc: emailData.bcc?.map(email => ({ email })),
          subject: emailData.subject,
          body: emailData.body,
          attachments: emailData.attachments?.map(att => ({
            filename: att.filename,
            content: att.content,
            content_type: att.contentType
          }))
        }
      })

      return {
        messageId: message.data.id,
        threadId: message.data.thread_id
      }
    } catch (error) {
      console.error('Failed to send email via Nylas:', error)
      throw error
    }
  }

  async downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<Buffer> {
    const nylasAccountId = account.externalId || account.metadata?.nylasAccountId
    
    if (!nylasAccountId) {
      throw new Error('No Nylas account ID found')
    }

    try {
      const attachment = await this.nylas.attachments.download({
        identifier: nylasAccountId,
        attachmentId
      })

      return Buffer.from(attachment.data)
    } catch (error) {
      console.error('Failed to download attachment via Nylas:', error)
      throw error
    }
  }

  async getAccountInfo(account: any): Promise<{
    id: string
    email: string
    name?: string
    provider: string
    syncState: string
  }> {
    const nylasAccountId = account.externalId || account.metadata?.nylasAccountId
    
    if (!nylasAccountId) {
      throw new Error('No Nylas account ID found')
    }

    try {
      const nylasAccount = await this.nylas.accounts.find({
        identifier: nylasAccountId
      })

      return {
        id: nylasAccount.data.id,
        email: nylasAccount.data.email_address,
        name: nylasAccount.data.name,
        provider: nylasAccount.data.provider,
        syncState: nylasAccount.data.sync_state
      }
    } catch (error) {
      console.error('Failed to get Nylas account info:', error)
      throw error
    }
  }
}

export const nylasService = new NylasService()