// EmailSyncService Nylas Integration Tests
import { EmailSyncService } from '../email-sync-service'
import { nylasService } from '../nylas-service'
import { gmailService } from '../gmail-service'
import { prisma } from '../prisma'
import { EmailProvider, EmailAccountStatus, EmailSyncStatus } from '../../generated/prisma'

// Mock services
jest.mock('../nylas-service')
jest.mock('../gmail-service')
jest.mock('../prisma', () => ({
  prisma: {
    emailAccount: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    emailSyncLog: {
      create: jest.fn(),
      update: jest.fn()
    }
  }
}))

const mockNylasService = nylasService as jest.Mocked<typeof nylasService>
const mockGmailService = gmailService as jest.Mocked<typeof gmailService>

describe('EmailSyncService with Nylas Integration', () => {
  let emailSyncService: EmailSyncService

  beforeEach(() => {
    jest.clearAllMocks()
    emailSyncService = new EmailSyncService()
  })

  describe('syncAccount with Nylas preference', () => {
    const mockAccount = {
      id: 'account_123',
      provider: EmailProvider.GMAIL,
      status: EmailAccountStatus.ACTIVE,
      syncStatus: EmailSyncStatus.IDLE,
      externalId: 'nylas_account_123', // Has Nylas integration
      metadata: { nylasAccountId: 'nylas_account_123' }
    }

    beforeEach(() => {
      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.emailSyncLog.create as jest.Mock).mockResolvedValue({ id: 'log_123' })
      ;(prisma.emailSyncLog.update as jest.Mock).mockResolvedValue({})
      ;(prisma.emailAccount.update as jest.Mock).mockResolvedValue({})
    })

    it('should use Nylas when account has externalId', async () => {
      const mockSyncResult = {
        accountId: 'account_123',
        success: true,
        emailsProcessed: 5,
        emailsAdded: 3,
        emailsUpdated: 2,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date(),
        completedAt: new Date()
      }

      mockNylasService.syncEmails.mockResolvedValue(mockSyncResult)

      const result = await emailSyncService.syncAccount('account_123', {
        maxEmails: 10
      })

      expect(mockNylasService.syncEmails).toHaveBeenCalledWith(mockAccount, {
        maxEmails: 10,
        fullSync: undefined,
        folderId: undefined
      })
      expect(mockGmailService.syncEmails).not.toHaveBeenCalled()
      expect(result).toEqual(mockSyncResult)
    })

    it('should use Nylas when explicitly requested', async () => {
      const accountWithoutNylas = {
        ...mockAccount,
        externalId: null,
        metadata: {}
      }
      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(accountWithoutNylas)

      const mockSyncResult = {
        accountId: 'account_123',
        success: true,
        emailsProcessed: 2,
        emailsAdded: 2,
        emailsUpdated: 0,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date(),
        completedAt: new Date()
      }

      mockNylasService.syncEmails.mockResolvedValue(mockSyncResult)

      const result = await emailSyncService.syncAccount('account_123', {
        useNylas: true,
        maxEmails: 5
      })

      expect(mockNylasService.syncEmails).toHaveBeenCalledWith(accountWithoutNylas, {
        maxEmails: 5,
        fullSync: undefined,
        folderId: undefined
      })
      expect(result).toEqual(mockSyncResult)
    })

    it('should fall back to direct provider when Nylas not available', async () => {
      const accountWithoutNylas = {
        ...mockAccount,
        externalId: null,
        metadata: {}
      }
      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(accountWithoutNylas)

      const mockGmailSyncResult = {
        accountId: 'account_123',
        success: true,
        emailsProcessed: 3,
        emailsAdded: 1,
        emailsUpdated: 2,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date(),
        completedAt: new Date()
      }

      mockGmailService.syncEmails.mockResolvedValue(mockGmailSyncResult)

      const result = await emailSyncService.syncAccount('account_123', {
        maxEmails: 10
      })

      expect(mockGmailService.syncEmails).toHaveBeenCalledWith(accountWithoutNylas, {
        maxEmails: 10,
        fullSync: undefined
      })
      expect(mockNylasService.syncEmails).not.toHaveBeenCalled()
      expect(result.emailsProcessed).toBe(3)
    })

    it('should handle Nylas sync errors gracefully', async () => {
      mockNylasService.syncEmails.mockRejectedValue(new Error('Nylas API error'))

      await expect(emailSyncService.syncAccount('account_123')).rejects.toThrow('Nylas API error')
      
      expect(prisma.emailSyncLog.update).toHaveBeenCalledWith({
        where: { id: 'log_123' },
        data: {
          status: 'failed',
          completedAt: expect.any(Date),
          error: 'Nylas API error',
          errorDetails: { stack: expect.any(String) }
        }
      })
    })
  })

  describe('startRealTimeSync with Nylas', () => {
    const mockAccount = {
      id: 'account_123',
      provider: EmailProvider.GMAIL,
      externalId: 'nylas_account_123',
      metadata: { nylasAccountId: 'nylas_account_123' }
    }

    beforeEach(() => {
      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount)
    })

    it('should setup Nylas webhooks when account has Nylas integration', async () => {
      mockNylasService.setupWebhooks.mockResolvedValue({
        webhookId: 'webhook_123',
        status: 'active'
      })

      await emailSyncService.startRealTimeSync('account_123')

      expect(mockNylasService.setupWebhooks).toHaveBeenCalledWith(
        mockAccount,
        `${process.env.ZETRA_BASE_URL}/api/emails/webhook/nylas`
      )
      expect(mockGmailService.setupPushNotifications).not.toHaveBeenCalled()
    })

    it('should fall back to Gmail webhooks when no Nylas integration', async () => {
      const gmailOnlyAccount = {
        ...mockAccount,
        externalId: null,
        metadata: {}
      }
      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(gmailOnlyAccount)

      mockGmailService.setupPushNotifications.mockResolvedValue({
        historyId: 'history_123',
        expiration: new Date()
      })

      await emailSyncService.startRealTimeSync('account_123')

      expect(mockGmailService.setupPushNotifications).toHaveBeenCalledWith(
        gmailOnlyAccount,
        `${process.env.ZETRA_BASE_URL}/api/emails/webhook/gmail`
      )
      expect(mockNylasService.setupWebhooks).not.toHaveBeenCalled()
    })

    it('should handle webhook setup errors', async () => {
      mockNylasService.setupWebhooks.mockRejectedValue(new Error('Webhook setup failed'))

      await expect(emailSyncService.startRealTimeSync('account_123')).rejects.toThrow(
        'Failed to start real-time sync'
      )
    })
  })

  describe('processWebhookNotification with Nylas', () => {
    const mockNylasWebhookData = {
      deltas: [
        {
          object: 'message',
          type: 'message.created',
          object_data: {
            account_id: 'nylas_account_123',
            id: 'msg_123'
          }
        }
      ]
    }

    it('should process Nylas webhook notifications', async () => {
      mockNylasService.processWebhookNotification.mockResolvedValue({
        accountId: 'account_123',
        processed: true,
        messagesProcessed: 1
      })

      const result = await emailSyncService.processWebhookNotification('nylas', mockNylasWebhookData)

      expect(result).toEqual({
        success: true,
        accountId: 'account_123',
        processed: true,
        messagesProcessed: 1
      })
      expect(mockNylasService.processWebhookNotification).toHaveBeenCalledWith(mockNylasWebhookData)
    })

    it('should handle Gmail webhook notifications', async () => {
      const gmailWebhookData = {
        message: {
          data: 'base64_encoded_data',
          messageId: 'gmail_msg_123'
        }
      }

      mockGmailService.processWebhookNotification.mockResolvedValue({
        accountId: 'account_456',
        historyId: 'history_123',
        processed: true
      })

      const result = await emailSyncService.processWebhookNotification(EmailProvider.GMAIL, gmailWebhookData)

      expect(result).toEqual({
        success: true,
        accountId: 'account_456',
        processed: true
      })
      expect(mockGmailService.processWebhookNotification).toHaveBeenCalledWith(gmailWebhookData)
    })

    it('should handle webhook processing errors', async () => {
      mockNylasService.processWebhookNotification.mockRejectedValue(new Error('Processing failed'))

      const result = await emailSyncService.processWebhookNotification('nylas', mockNylasWebhookData)

      expect(result).toEqual({
        success: false
      })
    })

    it('should handle unsupported providers gracefully', async () => {
      const result = await emailSyncService.processWebhookNotification(EmailProvider.EXCHANGE, {})

      expect(result).toEqual({
        success: false
      })
    })
  })

  describe('Multi-provider sync scenarios', () => {
    it('should handle mixed account types in organization', async () => {
      // Test scenario where an organization has both Nylas and direct integrations
      const nylasAccount = {
        id: 'nylas_account',
        provider: EmailProvider.GMAIL,
        status: EmailAccountStatus.ACTIVE,
        syncStatus: EmailSyncStatus.IDLE,
        externalId: 'nylas_123'
      }

      const directAccount = {
        id: 'direct_account', 
        provider: EmailProvider.GMAIL,
        status: EmailAccountStatus.ACTIVE,
        syncStatus: EmailSyncStatus.IDLE,
        externalId: null
      }

      // Mock different responses for different accounts
      ;(prisma.emailAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(nylasAccount)
        .mockResolvedValueOnce(directAccount)
      
      ;(prisma.emailSyncLog.create as jest.Mock).mockResolvedValue({ id: 'log_1' })
      ;(prisma.emailSyncLog.update as jest.Mock).mockResolvedValue({})
      ;(prisma.emailAccount.update as jest.Mock).mockResolvedValue({})

      mockNylasService.syncEmails.mockResolvedValue({
        accountId: 'nylas_account',
        success: true,
        emailsProcessed: 10,
        emailsAdded: 5,
        emailsUpdated: 5,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date(),
        completedAt: new Date()
      })

      mockGmailService.syncEmails.mockResolvedValue({
        accountId: 'direct_account',
        success: true,
        emailsProcessed: 8,
        emailsAdded: 3,
        emailsUpdated: 5,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date(),
        completedAt: new Date()
      })

      // Sync Nylas account
      const nylasResult = await emailSyncService.syncAccount('nylas_account')
      expect(nylasResult.emailsProcessed).toBe(10)
      expect(mockNylasService.syncEmails).toHaveBeenCalled()

      // Sync direct account
      const directResult = await emailSyncService.syncAccount('direct_account')
      expect(directResult.emailsProcessed).toBe(8)
      expect(mockGmailService.syncEmails).toHaveBeenCalled()
    })

    it('should prioritize Nylas when PREFER_NYLAS environment variable is set', async () => {
      const originalEnv = process.env.PREFER_NYLAS
      process.env.PREFER_NYLAS = 'true'

      const accountWithoutNylas = {
        id: 'account_123',
        provider: EmailProvider.OUTLOOK,
        status: EmailAccountStatus.ACTIVE,
        syncStatus: EmailSyncStatus.IDLE,
        externalId: null,
        metadata: {}
      }

      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(accountWithoutNylas)
      ;(prisma.emailSyncLog.create as jest.Mock).mockResolvedValue({ id: 'log_123' })
      ;(prisma.emailSyncLog.update as jest.Mock).mockResolvedValue({})
      ;(prisma.emailAccount.update as jest.Mock).mockResolvedValue({})

      mockNylasService.syncEmails.mockResolvedValue({
        accountId: 'account_123',
        success: true,
        emailsProcessed: 5,
        emailsAdded: 5,
        emailsUpdated: 0,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date(),
        completedAt: new Date()
      })

      const result = await emailSyncService.syncAccount('account_123')

      expect(mockNylasService.syncEmails).toHaveBeenCalled()
      expect(result.emailsProcessed).toBe(5)

      // Restore environment
      process.env.PREFER_NYLAS = originalEnv
    })
  })

  describe('Error handling and resilience', () => {
    const mockAccount = {
      id: 'account_123',
      provider: EmailProvider.GMAIL,
      status: EmailAccountStatus.ACTIVE,
      syncStatus: EmailSyncStatus.IDLE,
      externalId: 'nylas_account_123'
    }

    beforeEach(() => {
      ;(prisma.emailAccount.findUnique as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.emailSyncLog.create as jest.Mock).mockResolvedValue({ id: 'log_123' })
    })

    it('should update sync status to ERROR on failure', async () => {
      mockNylasService.syncEmails.mockRejectedValue(new Error('Sync failed'))

      await expect(emailSyncService.syncAccount('account_123')).rejects.toThrow('Sync failed')

      expect(prisma.emailAccount.update).toHaveBeenCalledWith({
        where: { id: 'account_123' },
        data: {
          syncStatus: EmailSyncStatus.ERROR,
          syncError: 'Sync failed'
        }
      })
    })

    it('should handle concurrent sync prevention', async () => {
      // Start first sync
      const syncPromise1 = emailSyncService.syncAccount('account_123')
      
      // Start second sync for same account (should get same promise)
      const syncPromise2 = emailSyncService.syncAccount('account_123')

      expect(syncPromise1).toBe(syncPromise2)
    })
  })
})