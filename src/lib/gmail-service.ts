// Gmail Service - Real Gmail API Integration
import { google } from 'googleapis'
import { simpleParser } from 'mailparser'
import { prisma } from './prisma'
import { encrypt, decrypt } from './crypto'
import type { 
  EmailProvider, 
  EmailSyncStatus
} from '../../generated/prisma'
import type {
  EmailSyncResult,
  EmailMessage,
  EmailAttachment
} from '../types'

interface GmailSyncOptions {
  maxEmails?: number
  query?: string
  fullSync?: boolean
  labelIds?: string[]
}

interface GmailWebhookData {
  message: {
    data: string
    messageId: string
    publishTime: string
  }
}

export class GmailService {
  private oauth2Client: any

  constructor() {
    this.oauth2Client = this.createOAuth2Client()
  }

  createOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )
  }

  async refreshAccessToken(account: any): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const refreshToken = decrypt(account.refreshToken)
      
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      const { credentials } = await this.oauth2Client.refreshAccessToken()
      
      if (!credentials.access_token || !credentials.expiry_date) {
        throw new Error('Invalid token response from Gmail')
      }

      const expiresAt = new Date(credentials.expiry_date)
      const encryptedAccessToken = encrypt(credentials.access_token)

      // Update account with new token
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encryptedAccessToken,
          tokenExpiresAt: expiresAt
        }
      })

      return {
        accessToken: credentials.access_token,
        expiresAt
      }
    } catch (error) {
      console.error('Failed to refresh Gmail token:', error)
      throw new Error('Failed to refresh Gmail access token')
    }
  }

  async fetchMessages(account: any, options: GmailSyncOptions = {}): Promise<EmailMessage[]> {
    try {
      // Ensure valid access token
      let accessToken = decrypt(account.accessToken)
      if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
        const refreshResult = await this.refreshAccessToken(account)
        accessToken = refreshResult.accessToken
      }

      this.oauth2Client.setCredentials({
        access_token: accessToken
      })

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
      
      const messages = await this.fetchMessagesWithPagination(gmail, options)
      const parsedMessages: EmailMessage[] = []

      // Fetch full message details for each message
      for (const message of messages) {
        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          })

          const parsedMessage = await this.parseMessage(fullMessage.data)
          parsedMessages.push(parsedMessage)
        } catch (error) {
          console.error(`Failed to fetch message ${message.id}:`, error)
          continue
        }
      }

      return parsedMessages
    } catch (error) {
      if (error.code === 429) {
        throw new Error('Gmail API rate limit exceeded')
      }
      if (error.code === 403) {
        throw new Error('Gmail API quota exceeded')
      }
      if (error.code === 401) {
        throw new Error('Gmail authentication failed')
      }
      throw error
    }
  }

  async fetchMessagesWithRetry(
    account: any, 
    options: GmailSyncOptions = {}, 
    maxRetries: number = 3
  ): Promise<EmailMessage[]> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.fetchMessages(account, options)
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          break
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.warn(`Gmail fetch attempt ${attempt} failed, retrying in ${delay}ms...`)
      }
    }

    throw lastError!
  }

  private async fetchMessagesWithPagination(gmail: any, options: GmailSyncOptions): Promise<any[]> {
    const messages: any[] = []
    let pageToken: string | undefined
    const maxResults = Math.min(options.maxEmails || 100, 500) // Gmail API limit is 500

    do {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: options.query || 'in:inbox',
        labelIds: options.labelIds,
        maxResults: Math.min(maxResults - messages.length, 100),
        pageToken
      })

      if (response.data.messages) {
        messages.push(...response.data.messages)
      }

      pageToken = response.data.nextPageToken
    } while (pageToken && messages.length < maxResults)

    return messages
  }

  async parseMessage(messageData: any): Promise<EmailMessage> {
    const headers = messageData.payload.headers
    const getHeader = (name: string) => headers.find((h: any) => h.name === name)?.value || ''

    // Parse message body
    const { bodyText, bodyHtml, attachments } = await this.parseMessageBody(messageData.payload)

    // Parse date
    const dateHeader = getHeader('Date')
    const date = dateHeader ? new Date(dateHeader) : new Date(parseInt(messageData.internalDate))

    // Determine read status (messages without UNREAD label are read)
    const isRead = !messageData.labelIds?.includes('UNREAD')
    const isStarred = messageData.labelIds?.includes('STARRED') || false

    return {
      id: messageData.id,
      threadId: messageData.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      cc: getHeader('Cc'),
      bcc: getHeader('Bcc'),
      subject: getHeader('Subject'),
      date,
      bodyText,
      bodyHtml,
      snippet: messageData.snippet,
      labels: messageData.labelIds || [],
      isRead,
      isStarred,
      hasAttachments: attachments.length > 0,
      attachments: attachments.length > 0 ? attachments : undefined,
      internalDate: new Date(parseInt(messageData.internalDate))
    }
  }

  private async parseMessageBody(payload: any): Promise<{
    bodyText: string | undefined
    bodyHtml: string | undefined
    attachments: EmailAttachment[]
  }> {
    let bodyText: string | undefined
    let bodyHtml: string | undefined
    const attachments: EmailAttachment[] = []

    if (payload.body.data) {
      // Simple message body
      const decodedBody = Buffer.from(payload.body.data, 'base64').toString('utf-8')
      bodyText = decodedBody
    } else if (payload.parts) {
      // Multipart message
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.filename && part.body.attachmentId) {
          // Attachment
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            attachmentId: part.body.attachmentId,
            size: part.body.size
          })
        } else if (part.parts) {
          // Nested parts
          const nestedResult = await this.parseMessageBody(part)
          if (!bodyText && nestedResult.bodyText) bodyText = nestedResult.bodyText
          if (!bodyHtml && nestedResult.bodyHtml) bodyHtml = nestedResult.bodyHtml
          attachments.push(...nestedResult.attachments)
        }
      }
    }

    return { bodyText, bodyHtml, attachments }
  }

  async syncEmails(account: any, options: GmailSyncOptions = {}): Promise<EmailSyncResult> {
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
    // Find or create sender and recipients
    const fromEmail = this.extractEmail(message.from)
    const toEmails = message.to ? this.extractEmails(message.to) : []

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
          attachments: message.attachments || []
        }
      }
    })
  }

  private extractEmail(emailString: string): string {
    const match = emailString.match(/<(.+)>/)
    return match ? match[1] : emailString
  }

  private extractEmails(emailString: string): string[] {
    return emailString.split(',').map(email => this.extractEmail(email.trim()))
  }

  async syncLabels(account: any): Promise<{ foldersProcessed: number; foldersAdded: number; foldersUpdated: number }> {
    let accessToken = decrypt(account.accessToken)
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
      const refreshResult = await this.refreshAccessToken(account)
      accessToken = refreshResult.accessToken
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken
    })

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    const response = await gmail.users.labels.list({ userId: 'me' })

    const result = {
      foldersProcessed: 0,
      foldersAdded: 0,
      foldersUpdated: 0
    }

    for (const label of response.data.labels || []) {
      result.foldersProcessed++

      const existingFolder = await prisma.emailFolder.findFirst({
        where: {
          accountId: account.id,
          externalId: label.id
        }
      })

      if (!existingFolder) {
        await prisma.emailFolder.create({
          data: {
            accountId: account.id,
            name: label.name,
            externalId: label.id,
            type: label.type === 'system' ? 'system' : 'user',
            metadata: {
              messagesTotal: label.messagesTotal || 0,
              messagesUnread: label.messagesUnread || 0,
              threadsTotal: label.threadsTotal || 0,
              threadsUnread: label.threadsUnread || 0
            }
          }
        })
        result.foldersAdded++
      }
    }

    return result
  }

  async setupPushNotifications(account: any, webhookUrl: string): Promise<{ historyId: string; expiration: Date }> {
    let accessToken = decrypt(account.accessToken)
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
      const refreshResult = await this.refreshAccessToken(account)
      accessToken = refreshResult.accessToken
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken
    })

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/gmail-notifications-${account.id}`,
        labelIds: ['INBOX', 'SENT', 'DRAFT'],
        labelFilterAction: 'include'
      }
    })

    return {
      historyId: response.data.historyId,
      expiration: new Date(parseInt(response.data.expiration))
    }
  }

  async stopPushNotifications(account: any): Promise<void> {
    let accessToken = decrypt(account.accessToken)
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
      const refreshResult = await this.refreshAccessToken(account)
      accessToken = refreshResult.accessToken
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken
    })

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    await gmail.users.stop({ userId: 'me' })
  }

  async processWebhookNotification(webhookData: GmailWebhookData): Promise<{
    accountId: string
    historyId: string
    processed: boolean
  }> {
    try {
      // Decode the webhook data
      const decodedData = JSON.parse(
        Buffer.from(webhookData.message.data, 'base64').toString('utf-8')
      )

      const { emailAddress, historyId } = decodedData

      // Find the account
      const account = await prisma.emailAccount.findFirst({
        where: { email: emailAddress }
      })

      if (!account) {
        throw new Error(`No account found for email: ${emailAddress}`)
      }

      // Process the history changes
      await this.processHistoryChanges(account, historyId)

      return {
        accountId: account.id,
        historyId,
        processed: true
      }
    } catch (error) {
      console.error('Failed to process Gmail webhook:', error)
      throw error
    }
  }

  private async processHistoryChanges(account: any, historyId: string): Promise<void> {
    // Implementation would fetch history changes from Gmail API
    // and update local database accordingly
    console.log(`Processing history changes for account ${account.id}, historyId: ${historyId}`)
    
    // This would typically:
    // 1. Get the last known historyId for the account
    // 2. Fetch history changes since that historyId
    // 3. Process added, modified, or deleted messages
    // 4. Update the account's historyId
  }

  async downloadAttachment(account: any, messageId: string, attachmentId: string): Promise<Buffer> {
    let accessToken = decrypt(account.accessToken)
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
      const refreshResult = await this.refreshAccessToken(account)
      accessToken = refreshResult.accessToken
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken
    })

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId
    })

    return Buffer.from(response.data.data, 'base64')
  }

  async sendEmail(account: any, emailData: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    bodyText?: string
    bodyHtml?: string
    attachments?: Array<{ filename: string; content: Buffer; mimeType: string }>
  }): Promise<{ messageId: string; threadId: string }> {
    let accessToken = decrypt(account.accessToken)
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) <= new Date()) {
      const refreshResult = await this.refreshAccessToken(account)
      accessToken = refreshResult.accessToken
    }

    this.oauth2Client.setCredentials({
      access_token: accessToken
    })

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

    // Create RFC2822 formatted email
    const email = await this.createRFC2822Email(emailData)
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: Buffer.from(email).toString('base64url')
      }
    })

    return {
      messageId: response.data.id,
      threadId: response.data.threadId
    }
  }

  private async createRFC2822Email(emailData: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    bodyText?: string
    bodyHtml?: string
    attachments?: Array<{ filename: string; content: Buffer; mimeType: string }>
  }): Promise<string> {
    // Implementation would create a properly formatted RFC2822 email
    // This is a simplified version
    let email = `To: ${emailData.to}\r\n`
    if (emailData.cc) email += `Cc: ${emailData.cc}\r\n`
    if (emailData.bcc) email += `Bcc: ${emailData.bcc}\r\n`
    email += `Subject: ${emailData.subject}\r\n`
    email += `Content-Type: text/html; charset=UTF-8\r\n\r\n`
    email += emailData.bodyHtml || emailData.bodyText || ''

    return email
  }
}

export const gmailService = new GmailService()