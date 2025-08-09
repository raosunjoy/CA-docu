// Nylas Service Integration Tests
import { EmailProvider } from '../../../generated/prisma'

// Mock all dependencies before importing the service
jest.mock('../prisma', () => ({
  prisma: {
    emailAccount: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    email: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn()
    },
    emailFolder: {
      create: jest.fn(),
      findFirst: jest.fn()
    }
  }
}))

jest.mock('../crypto', () => ({
  encrypt: jest.fn((data) => `encrypted_${data}`),
  decrypt: jest.fn((data) => data.replace('encrypted_', ''))
}))

import { NylasService } from '../nylas-service'
import { prisma } from '../prisma'
import { encrypt } from '../crypto'

// Mock Nylas SDK
jest.mock('nylas', () => ({
  Nylas: jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn(),
      find: jest.fn()
    },
    messages: {
      list: jest.fn(),
      send: jest.fn()
    },
    folders: {
      list: jest.fn()
    },
    webhooks: {
      create: jest.fn()
    },
    attachments: {
      download: jest.fn()
    }
  })),
  NylasApi: jest.fn()
}))

describe('NylasService', () => {
  let nylasService: NylasService
  let mockNylas: any

  beforeEach(() => {
    jest.clearAllMocks()
    nylasService = new NylasService()
    mockNylas = (nylasService as any).nylas
  })

  describe('createAccount', () => {
    it('should create Gmail account via Nylas', async () => {
      const mockNylasAccount = { id: 'nylas_account_123' }
      mockNylas.accounts.create.mockResolvedValue(mockNylasAccount)
      ;(prisma.emailAccount.create as jest.Mock).mockResolvedValue({
        id: 'account_123',
        email: 'test@gmail.com',
        provider: EmailProvider.GMAIL
      })

      const accountData = {
        provider: EmailProvider.GMAIL,
        email: 'test@gmail.com',
        displayName: 'Test Account',
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      }

      const result = await nylasService.createAccount(accountData)

      expect(result).toBe('nylas_account_123')
      expect(mockNylas.accounts.create).toHaveBeenCalledWith({
        name: 'Test Account',
        emailAddress: 'test@gmail.com',
        provider: 'gmail',
        settings: expect.objectContaining({
          google_client_id: process.env.GOOGLE_CLIENT_ID
        }),
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      })
      expect(prisma.emailAccount.create).toHaveBeenCalled()
    })

    it('should create Outlook account via Nylas', async () => {
      const mockNylasAccount = { id: 'nylas_outlook_123' }
      mockNylas.accounts.create.mockResolvedValue(mockNylasAccount)
      ;(prisma.emailAccount.create as jest.Mock).mockResolvedValue({
        id: 'account_456',
        email: 'test@outlook.com',
        provider: EmailProvider.OUTLOOK
      })

      const accountData = {
        provider: EmailProvider.OUTLOOK,
        email: 'test@outlook.com',
        displayName: 'Outlook Account',
        accessToken: 'outlook_access_token',
        refreshToken: 'outlook_refresh_token'
      }

      const result = await nylasService.createAccount(accountData)

      expect(result).toBe('nylas_outlook_123')
      expect(mockNylas.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'outlook',
          settings: expect.objectContaining({
            microsoft_client_id: process.env.MICROSOFT_CLIENT_ID
          })
        })
      )
    })

    it('should handle IMAP account creation', async () => {
      const mockNylasAccount = { id: 'nylas_imap_123' }
      mockNylas.accounts.create.mockResolvedValue(mockNylasAccount)
      ;(prisma.emailAccount.create as jest.Mock).mockResolvedValue({
        id: 'account_789',
        email: 'test@company.com',
        provider: EmailProvider.IMAP
      })

      const accountData = {
        provider: EmailProvider.IMAP,
        email: 'test@company.com',
        username: 'test@company.com',
        password: 'password123',
        imapHost: 'imap.company.com',
        imapPort: 993,
        smtpHost: 'smtp.company.com',
        smtpPort: 587
      }

      const result = await nylasService.createAccount(accountData)

      expect(result).toBe('nylas_imap_123')
      expect(mockNylas.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'imap',
          settings: expect.objectContaining({
            imap_host: 'imap.company.com',
            imap_port: 993
          })
        })
      )
    })

    it('should throw error for unsupported provider', async () => {
      const accountData = {
        provider: 'UNSUPPORTED' as any,
        email: 'test@example.com'
      }

      await expect(nylasService.createAccount(accountData)).rejects.toThrow(
        'Unsupported provider: UNSUPPORTED'
      )
    })
  })

  describe('fetchMessages', () => {
    const mockAccount = {
      id: 'account_123',
      externalId: 'nylas_account_123',
      provider: EmailProvider.GMAIL
    }

    it('should fetch and convert messages successfully', async () => {
      const mockNylasMessages = {
        data: [
          {
            id: 'msg_123',
            thread_id: 'thread_123',
            subject: 'Test Subject',
            from: [{ name: 'John Doe', email: 'john@example.com' }],
            to: [{ name: 'Jane Doe', email: 'jane@example.com' }],
            body: 'Test message body',
            date: Math.floor(Date.now() / 1000),
            unread: true,
            starred: false,
            folders: [{ name: 'INBOX' }],
            attachments: []
          }
        ]
      }

      mockNylas.messages.list.mockResolvedValue(mockNylasMessages)

      const result = await nylasService.fetchMessages(mockAccount, {
        maxEmails: 10
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'msg_123',
        threadId: 'thread_123',
        subject: 'Test Subject',
        from: 'John Doe <john@example.com>',
        to: 'jane@example.com',
        isRead: false,
        isStarred: false,
        labels: ['INBOX'],
        hasAttachments: false
      })
    })

    it('should handle messages with attachments', async () => {
      const mockNylasMessages = {
        data: [
          {
            id: 'msg_with_attachment',
            thread_id: 'thread_456',
            subject: 'Message with attachment',
            from: [{ email: 'sender@example.com' }],
            to: [{ email: 'recipient@example.com' }],
            body: 'Please find attached file.',
            date: Math.floor(Date.now() / 1000),
            unread: false,
            attachments: [
              {
                id: 'att_123',
                filename: 'document.pdf',
                content_type: 'application/pdf',
                size: 1024
              }
            ]
          }
        ]
      }

      mockNylas.messages.list.mockResolvedValue(mockNylasMessages)

      const result = await nylasService.fetchMessages(mockAccount)

      expect(result[0].hasAttachments).toBe(true)
      expect(result[0].attachments).toHaveLength(1)
      expect(result[0].attachments![0]).toMatchObject({
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        attachmentId: 'att_123',
        size: 1024
      })
    })

    it('should handle API rate limiting', async () => {
      mockNylas.messages.list.mockRejectedValue({ status: 429 })

      await expect(nylasService.fetchMessages(mockAccount)).rejects.toThrow(
        'Nylas API rate limit exceeded'
      )
    })

    it('should handle authentication errors', async () => {
      mockNylas.messages.list.mockRejectedValue({ status: 401 })

      await expect(nylasService.fetchMessages(mockAccount)).rejects.toThrow(
        'Nylas authentication failed'
      )
    })

    it('should throw error when no Nylas account ID found', async () => {
      const accountWithoutNylas = {
        id: 'account_456',
        provider: EmailProvider.GMAIL
      }

      await expect(nylasService.fetchMessages(accountWithoutNylas)).rejects.toThrow(
        'No Nylas account ID found'
      )
    })
  })

  describe('syncEmails', () => {
    const mockAccount = {
      id: 'account_123',
      externalId: 'nylas_account_123',
      provider: EmailProvider.GMAIL
    }

    beforeEach(() => {
      // Mock fetchMessages to return test data
      jest.spyOn(nylasService, 'fetchMessages').mockResolvedValue([
        {
          id: 'msg_1',
          threadId: 'thread_1',
          subject: 'Test 1',
          from: 'sender@example.com',
          date: new Date(),
          isRead: true,
          isStarred: false,
          labels: ['INBOX'],
          hasAttachments: false,
          internalDate: new Date()
        },
        {
          id: 'msg_2',
          threadId: 'thread_2',
          subject: 'Test 2',
          from: 'sender2@example.com',
          date: new Date(),
          isRead: false,
          isStarred: true,
          labels: ['INBOX', 'IMPORTANT'],
          hasAttachments: true,
          internalDate: new Date()
        }
      ])
    })

    it('should sync new emails successfully', async () => {
      ;(prisma.email.findFirst as jest.Mock).mockResolvedValue(null) // No existing emails
      ;(prisma.email.create as jest.Mock).mockResolvedValue({})
      ;(nylasService as any).syncFolders = jest.fn().mockResolvedValue({})

      const result = await nylasService.syncEmails(mockAccount)

      expect(result).toMatchObject({
        accountId: 'account_123',
        success: true,
        emailsProcessed: 2,
        emailsAdded: 2,
        emailsUpdated: 0,
        emailsDeleted: 0,
        errorsCount: 0
      })
      expect(prisma.email.create).toHaveBeenCalledTimes(2)
    })

    it('should update existing emails when changes detected', async () => {
      const existingEmail = {
        id: 'existing_email_1',
        subject: 'Old Subject',
        isRead: false
      }
      ;(prisma.email.findFirst as jest.Mock).mockResolvedValue(existingEmail)
      ;(prisma.email.update as jest.Mock).mockResolvedValue({})
      ;(nylasService as any).hasEmailChanges = jest.fn().mockResolvedValue(true)
      ;(nylasService as any).syncFolders = jest.fn().mockResolvedValue({})

      const result = await nylasService.syncEmails(mockAccount)

      expect(result).toMatchObject({
        emailsProcessed: 2,
        emailsAdded: 0,
        emailsUpdated: 2,
        errorsCount: 0
      })
    })

    it('should handle sync errors gracefully', async () => {
      ;(prisma.email.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await nylasService.syncEmails(mockAccount)

      expect(result.success).toBe(false)
      expect(result.errorsCount).toBe(2) // One error per message
    })
  })

  describe('setupWebhooks', () => {
    const mockAccount = {
      id: 'account_123',
      externalId: 'nylas_account_123',
      metadata: {}
    }

    it('should create webhook successfully', async () => {
      const mockWebhook = {
        id: 'webhook_123',
        state: 'active'
      }
      mockNylas.webhooks.create.mockResolvedValue(mockWebhook)
      ;(prisma.emailAccount.update as jest.Mock).mockResolvedValue({})

      const result = await nylasService.setupWebhooks(mockAccount, 'https://example.com/webhook')

      expect(result).toEqual({
        webhookId: 'webhook_123',
        status: 'active'
      })
      expect(mockNylas.webhooks.create).toHaveBeenCalledWith({
        callbackUrl: 'https://example.com/webhook',
        state: 'active',
        triggers: ['message.created', 'message.updated', 'message.deleted']
      })
      expect(prisma.emailAccount.update).toHaveBeenCalledWith({
        where: { id: 'account_123' },
        data: {
          metadata: {
            webhookId: 'webhook_123'
          }
        }
      })
    })

    it('should throw error when no Nylas account ID found', async () => {
      const accountWithoutNylas = {
        id: 'account_456',
        metadata: {}
      }

      await expect(
        nylasService.setupWebhooks(accountWithoutNylas, 'https://example.com/webhook')
      ).rejects.toThrow('No Nylas account ID found')
    })
  })

  describe('processWebhookNotification', () => {
    beforeEach(() => {
      ;(prisma.emailAccount.findFirst as jest.Mock).mockResolvedValue({
        id: 'account_123',
        provider: EmailProvider.GMAIL
      })
    })

    it('should process message.created webhook', async () => {
      const webhookData = {
        deltas: [
          {
            object: 'message',
            type: 'message.created',
            object_data: {
              account_id: 'nylas_account_123',
              id: 'msg_new',
              subject: 'New Message'
            }
          }
        ]
      }

      const convertMessageSpy = jest.spyOn(nylasService as any, 'convertNylasMessageToEmail')
        .mockResolvedValue({
          id: 'msg_new',
          subject: 'New Message',
          from: 'test@example.com',
          date: new Date(),
          isRead: false,
          isStarred: false,
          labels: [],
          hasAttachments: false,
          internalDate: new Date()
        })

      const createEmailSpy = jest.spyOn(nylasService as any, 'createEmailFromMessage')
        .mockResolvedValue({})

      const result = await nylasService.processWebhookNotification(webhookData)

      expect(result).toEqual({
        accountId: 'account_123',
        processed: true,
        messagesProcessed: 1
      })
      expect(convertMessageSpy).toHaveBeenCalled()
      expect(createEmailSpy).toHaveBeenCalled()
    })

    it('should process message.updated webhook', async () => {
      const existingEmail = { id: 'existing_email' }
      ;(prisma.email.findFirst as jest.Mock).mockResolvedValue(existingEmail)

      const webhookData = {
        deltas: [
          {
            object: 'message',
            type: 'message.updated',
            object_data: {
              account_id: 'nylas_account_123',
              id: 'msg_updated',
              subject: 'Updated Message'
            }
          }
        ]
      }

      const convertMessageSpy = jest.spyOn(nylasService as any, 'convertNylasMessageToEmail')
        .mockResolvedValue({
          id: 'msg_updated',
          subject: 'Updated Message'
        })

      const updateEmailSpy = jest.spyOn(nylasService as any, 'updateEmailFromMessage')
        .mockResolvedValue({})

      const result = await nylasService.processWebhookNotification(webhookData)

      expect(result.processed).toBe(true)
      expect(updateEmailSpy).toHaveBeenCalled()
    })

    it('should process message.deleted webhook', async () => {
      const webhookData = {
        deltas: [
          {
            object: 'message',
            type: 'message.deleted',
            object_data: {
              account_id: 'nylas_account_123',
              id: 'msg_deleted'
            }
          }
        ]
      }

      ;(prisma.email.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

      const result = await nylasService.processWebhookNotification(webhookData)

      expect(result.processed).toBe(true)
      expect(prisma.email.deleteMany).toHaveBeenCalledWith({
        where: {
          accountId: 'account_123',
          externalId: 'msg_deleted'
        }
      })
    })

    it('should handle webhook processing errors', async () => {
      ;(prisma.emailAccount.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'))

      const webhookData = {
        deltas: [
          {
            object: 'message',
            type: 'message.created',
            object_data: { account_id: 'nylas_account_123' }
          }
        ]
      }

      const result = await nylasService.processWebhookNotification(webhookData)

      expect(result).toEqual({
        processed: false,
        messagesProcessed: 0
      })
    })
  })

  describe('sendEmail', () => {
    const mockAccount = {
      id: 'account_123',
      externalId: 'nylas_account_123'
    }

    it('should send email successfully', async () => {
      const mockResponse = {
        data: {
          id: 'sent_msg_123',
          thread_id: 'thread_456'
        }
      }
      mockNylas.messages.send.mockResolvedValue(mockResponse)

      const emailData = {
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        body: 'Test Body'
      }

      const result = await nylasService.sendEmail(mockAccount, emailData)

      expect(result).toEqual({
        messageId: 'sent_msg_123',
        threadId: 'thread_456'
      })
      expect(mockNylas.messages.send).toHaveBeenCalledWith({
        identifier: 'nylas_account_123',
        requestBody: {
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test Subject',
          body: 'Test Body'
        }
      })
    })
  })
})