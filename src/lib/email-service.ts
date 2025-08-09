// Zetra Platform - Email Integration Service
// Handles OAuth2 email account connections and email operations

import { PrismaClient } from '../../generated/prisma'
import { 
  EmailProvider, 
  EmailAccountStatus, 
  EmailSyncStatus,
  type EmailAccountData,
  type EmailAccountUpdateData,
  type EmailData,
  type EmailFilters,
  type EmailSearchFilters,
  type EmailSyncResult,
  type EmailAccountCredentials,
  type EmailProviderConfig
} from '../types'
import { encrypt, decrypt } from './crypto'

const prisma = new PrismaClient()

// Email provider configurations
const EMAIL_PROVIDERS: Record<EmailProvider, EmailProviderConfig> = {
  GMAIL: {
    provider: 'GMAIL',
    displayName: 'Gmail',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    imapDefaults: {
      host: 'imap.gmail.com',
      port: 993,
      secure: true
    },
    smtpDefaults: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false
    }
  },
  OUTLOOK: {
    provider: 'OUTLOOK',
    displayName: 'Outlook',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.ReadWrite'
    ],
    imapDefaults: {
      host: 'outlook.office365.com',
      port: 993,
      secure: true
    },
    smtpDefaults: {
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false
    }
  },
  EXCHANGE: {
    provider: 'EXCHANGE',
    displayName: 'Exchange',
    imapDefaults: {
      host: '',
      port: 993,
      secure: true
    },
    smtpDefaults: {
      host: '',
      port: 587,
      secure: false
    }
  },
  IMAP: {
    provider: 'IMAP',
    displayName: 'IMAP/SMTP',
    imapDefaults: {
      host: '',
      port: 993,
      secure: true
    },
    smtpDefaults: {
      host: '',
      port: 587,
      secure: false
    }
  }
}

export class EmailService {
  // Email Account Management
  async createEmailAccount(
    organizationId: string,
    userId: string,
    data: EmailAccountData
  ) {
    // Encrypt sensitive data
    const encryptedData = {
      ...data,
      accessToken: data.accessToken ? encrypt(data.accessToken) : null,
      refreshToken: data.refreshToken ? encrypt(data.refreshToken) : null,
      password: data.password ? encrypt(data.password) : null
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await prisma.emailAccount.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false }
      })
    }

    const account = await prisma.emailAccount.create({
      data: {
        organizationId,
        userId,
        ...encryptedData,
        status: EmailAccountStatus.ACTIVE,
        syncStatus: EmailSyncStatus.IDLE
      }
    })

    return this.sanitizeEmailAccount(account)
  }

  async updateEmailAccount(
    accountId: string,
    userId: string,
    data: EmailAccountUpdateData
  ) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.emailAccount.updateMany({
        where: { userId, isDefault: true, id: { not: accountId } },
        data: { isDefault: false }
      })
    }

    const account = await prisma.emailAccount.update({
      where: { id: accountId, userId },
      data
    })

    return this.sanitizeEmailAccount(account)
  }

  async deleteEmailAccount(accountId: string, userId: string) {
    await prisma.emailAccount.delete({
      where: { id: accountId, userId }
    })
  }

  async getEmailAccounts(userId: string) {
    const accounts = await prisma.emailAccount.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return accounts.map(account => this.sanitizeEmailAccount(account))
  }

  async getEmailAccount(accountId: string, userId: string) {
    const account = await prisma.emailAccount.findFirst({
      where: { id: accountId, userId }
    })

    if (!account) {
      throw new Error('Email account not found')
    }

    return this.sanitizeEmailAccount(account)
  }

  // OAuth2 Authentication
  async getOAuthUrl(provider: EmailProvider, redirectUri: string, state: string) {
    const config = EMAIL_PROVIDERS[provider]
    if (!config.authUrl || !config.scopes) {
      throw new Error(`OAuth not supported for provider: ${provider}`)
    }

    const params = new URLSearchParams({
      client_id: this.getClientId(provider),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent'
    })

    return `${config.authUrl}?${params.toString()}`
  }

  async exchangeCodeForTokens(
    provider: EmailProvider,
    code: string,
    redirectUri: string
  ) {
    const tokenUrl = this.getTokenUrl(provider)
    const clientId = this.getClientId(provider)
    const clientSecret = this.getClientSecret(provider)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    return response.json()
  }

  async refreshAccessToken(accountId: string) {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account?.refreshToken) {
      throw new Error('Account or refresh token not found')
    }

    const refreshToken = decrypt(account.refreshToken)
    const tokenUrl = this.getTokenUrl(account.provider)
    const clientId = this.getClientId(account.provider)
    const clientSecret = this.getClientSecret(account.provider)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { 
          status: EmailAccountStatus.ERROR,
          syncError: 'Token refresh failed'
        }
      })
      throw new Error('Failed to refresh access token')
    }

    const tokens = await response.json()
    
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encrypt(tokens.access_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        status: EmailAccountStatus.ACTIVE,
        syncError: null
      }
    })

    return tokens
  }

  // Email Synchronization
  async syncEmails(accountId: string): Promise<EmailSyncResult> {
    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      throw new Error('Email account not found')
    }

    // Create sync log
    const syncLog = await prisma.emailSyncLog.create({
      data: {
        accountId,
        syncType: 'incremental',
        status: 'started'
      }
    })

    try {
      // Update account sync status
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { syncStatus: EmailSyncStatus.SYNCING }
      })

      const result = await this.performEmailSync(account)

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
          error: error instanceof Error ? error.message : 'Unknown error'
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

  private async performEmailSync(account: any): Promise<EmailSyncResult> {
    // This would implement the actual email sync logic
    // For now, return a mock result
    return {
      accountId: account.id,
      success: true,
      emailsProcessed: 0,
      emailsAdded: 0,
      emailsUpdated: 0,
      emailsDeleted: 0,
      errorsCount: 0,
      startedAt: new Date(),
      completedAt: new Date()
    }
  }

  // Email Operations
  async getEmails(
    userId: string,
    filters: EmailFilters = {},
    page = 1,
    limit = 50
  ) {
    const where: any = {
      account: { userId }
    }

    if (filters.accountId) where.accountId = filters.accountId
    if (filters.folderId) where.folderId = filters.folderId
    if (filters.isRead !== undefined) where.isRead = filters.isRead
    if (filters.isStarred !== undefined) where.isStarred = filters.isStarred
    if (filters.isArchived !== undefined) where.isArchived = filters.isArchived
    if (filters.fromAddress) where.fromAddress = { contains: filters.fromAddress, mode: 'insensitive' }
    if (filters.subject) where.subject = { contains: filters.subject, mode: 'insensitive' }
    if (filters.dateRange) {
      where.receivedAt = {
        gte: filters.dateRange[0],
        lte: filters.dateRange[1]
      }
    }
    if (filters.labels?.length) {
      where.labels = { hasSome: filters.labels }
    }
    if (filters.linkedToTasks) {
      where.linkedTaskIds = { isEmpty: false }
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          attachments: true,
          account: {
            select: { email: true, displayName: true, provider: true }
          },
          folder: {
            select: { name: true, displayName: true }
          }
        },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.email.count({ where })
    ])

    return {
      data: emails,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      }
    }
  }

  async searchEmails(
    userId: string,
    filters: EmailSearchFilters,
    page = 1,
    limit = 50
  ) {
    const where: any = {
      account: { userId }
    }

    // Apply base filters
    if (filters.accountId) where.accountId = filters.accountId
    if (filters.folderId) where.folderId = filters.folderId
    if (filters.isRead !== undefined) where.isRead = filters.isRead
    if (filters.isStarred !== undefined) where.isStarred = filters.isStarred
    if (filters.isArchived !== undefined) where.isArchived = filters.isArchived

    // Apply search query
    if (filters.query) {
      const searchFields = filters.searchIn || ['subject', 'body', 'from']
      const searchConditions: any[] = []

      if (searchFields.includes('subject')) {
        searchConditions.push({ subject: { contains: filters.query, mode: 'insensitive' } })
      }
      if (searchFields.includes('body')) {
        searchConditions.push({ 
          OR: [
            { bodyText: { contains: filters.query, mode: 'insensitive' } },
            { bodyHtml: { contains: filters.query, mode: 'insensitive' } }
          ]
        })
      }
      if (searchFields.includes('from')) {
        searchConditions.push({ 
          OR: [
            { fromAddress: { contains: filters.query, mode: 'insensitive' } },
            { fromName: { contains: filters.query, mode: 'insensitive' } }
          ]
        })
      }
      if (searchFields.includes('to')) {
        searchConditions.push({ toAddresses: { hasSome: [filters.query] } })
      }

      if (searchConditions.length > 0) {
        where.OR = searchConditions
      }
    }

    const orderBy: any = {}
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc'
    } else {
      orderBy.receivedAt = 'desc'
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          attachments: true,
          account: {
            select: { email: true, displayName: true, provider: true }
          },
          folder: {
            select: { name: true, displayName: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.email.count({ where })
    ])

    return {
      data: emails,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total
      }
    }
  }

  async markEmailAsRead(emailId: string, userId: string, isRead = true) {
    return prisma.email.updateMany({
      where: { 
        id: emailId,
        account: { userId }
      },
      data: { isRead }
    })
  }

  async starEmail(emailId: string, userId: string, isStarred = true) {
    return prisma.email.updateMany({
      where: { 
        id: emailId,
        account: { userId }
      },
      data: { isStarred }
    })
  }

  async archiveEmail(emailId: string, userId: string, isArchived = true) {
    return prisma.email.updateMany({
      where: { 
        id: emailId,
        account: { userId }
      },
      data: { isArchived }
    })
  }

  async linkEmailToTask(emailId: string, taskId: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: { 
        id: emailId,
        account: { userId }
      }
    })

    if (!email) {
      throw new Error('Email not found')
    }

    const linkedTaskIds = [...email.linkedTaskIds]
    if (!linkedTaskIds.includes(taskId)) {
      linkedTaskIds.push(taskId)
    }

    return prisma.email.update({
      where: { id: emailId },
      data: { linkedTaskIds }
    })
  }

  // Utility methods
  private sanitizeEmailAccount(account: any) {
    const { accessToken, refreshToken, password, ...sanitized } = account
    return {
      ...sanitized,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasPassword: !!password
    }
  }

  private getClientId(provider: EmailProvider): string {
    const envVar = `${provider}_CLIENT_ID`
    const clientId = process.env[envVar]
    if (!clientId) {
      throw new Error(`Missing environment variable: ${envVar}`)
    }
    return clientId
  }

  private getClientSecret(provider: EmailProvider): string {
    const envVar = `${provider}_CLIENT_SECRET`
    const clientSecret = process.env[envVar]
    if (!clientSecret) {
      throw new Error(`Missing environment variable: ${envVar}`)
    }
    return clientSecret
  }

  private getTokenUrl(provider: EmailProvider): string {
    switch (provider) {
      case 'GMAIL':
        return 'https://oauth2.googleapis.com/token'
      case 'OUTLOOK':
        return 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
      default:
        throw new Error(`Token URL not configured for provider: ${provider}`)
    }
  }

  static getProviderConfig(provider: EmailProvider): EmailProviderConfig {
    return EMAIL_PROVIDERS[provider]
  }

  static getAllProviders(): EmailProviderConfig[] {
    return Object.values(EMAIL_PROVIDERS)
  }
}

export const emailService = new EmailService()