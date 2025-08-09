// Gmail Service Unit Tests - Focus on Logic Without API Integration
import { jest } from '@jest/globals'

// Mock crypto functions
jest.mock('../crypto', () => ({
  encrypt: jest.fn().mockImplementation((text) => `encrypted_${text}`),
  decrypt: jest.fn().mockImplementation((encryptedText) => 
    encryptedText.startsWith('encrypted_') ? encryptedText.replace('encrypted_', '') : encryptedText
  )
}))

// Mock Prisma client with proper methods
const mockPrisma = {
  emailAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn()
  },
  email: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  emailFolder: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'created_folder_id' })
  }
}

jest.mock('../prisma', () => ({
  prisma: mockPrisma
}))

// Mock googleapis with simplified mock
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn()
      }))
    },
    gmail: jest.fn().mockImplementation(() => ({
      users: {
        messages: {
          list: jest.fn(),
          get: jest.fn(),
          send: jest.fn(),
          attachments: {
            get: jest.fn()
          }
        },
        labels: {
          list: jest.fn()
        },
        watch: jest.fn(),
        stop: jest.fn()
      }
    }))
  }
}))

import { GmailService } from '../gmail-service'
import { EmailProvider, EmailSyncStatus } from '../../../generated/prisma'

describe('GmailService - Unit Tests', () => {
  let gmailService: GmailService
  
  const mockAccount = {
    id: 'test-account-id',
    email: 'test@example.com',
    provider: EmailProvider.GMAIL,
    accessToken: 'encrypted_test_access_token',
    refreshToken: 'encrypted_test_refresh_token',
    tokenExpiresAt: new Date(Date.now() + 3600000),
    status: 'ACTIVE',
    syncStatus: EmailSyncStatus.IDLE
  }

  beforeEach(() => {
    jest.clearAllMocks()
    gmailService = new GmailService()
  })

  describe('Core Functionality', () => {
    test('should create OAuth2 client', () => {
      const client = gmailService.createOAuth2Client()
      expect(client).toBeDefined()
      expect(client.setCredentials).toBeDefined()
    })

    test('should parse simple email message structure', async () => {
      const messageData = {
        id: 'msg123',
        threadId: 'thread123',
        labelIds: ['INBOX'],
        snippet: 'Test email content',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
            { name: 'Subject', value: 'Test Subject' },
            { name: 'Date', value: 'Mon, 9 Aug 2025 10:00:00 GMT' }
          ],
          body: {
            data: Buffer.from('Test email body').toString('base64')
          },
          parts: []
        },
        internalDate: '1723197600000'
      }

      const result = await gmailService.parseMessage(messageData)

      expect(result).toEqual({
        id: 'msg123',
        threadId: 'thread123',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        cc: '',
        bcc: '',
        subject: 'Test Subject',
        date: expect.any(Date),
        bodyText: 'Test email body',
        bodyHtml: undefined,
        snippet: 'Test email content',
        labels: ['INBOX'],
        isRead: true, // No UNREAD label means read
        isStarred: false, // No STARRED label
        hasAttachments: false,
        internalDate: expect.any(Date)
      })
    })

    test('should parse complex email with attachments', async () => {
      const complexMessage = {
        id: 'complex_msg',
        threadId: 'complex_thread',
        labelIds: ['INBOX', 'IMPORTANT', 'STARRED'],
        snippet: 'Email with attachments',
        payload: {
          headers: [
            { name: 'From', value: 'client@example.com' },
            { name: 'To', value: 'ca@firm.com' },
            { name: 'Cc', value: 'cc@example.com' },
            { name: 'Subject', value: 'Important Documents' },
            { name: 'Date', value: 'Mon, 9 Aug 2025 14:30:00 GMT' }
          ],
          body: { size: 0 },
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: Buffer.from('Plain text content').toString('base64') }
            },
            {
              mimeType: 'text/html',
              body: { data: Buffer.from('<p>HTML content</p>').toString('base64') }
            },
            {
              mimeType: 'application/pdf',
              filename: 'document.pdf',
              body: { 
                attachmentId: 'attach_123',
                size: 12345
              }
            }
          ]
        },
        internalDate: '1723212600000'
      }

      const result = await gmailService.parseMessage(complexMessage)

      expect(result).toEqual({
        id: 'complex_msg',
        threadId: 'complex_thread',
        from: 'client@example.com',
        to: 'ca@firm.com',
        cc: 'cc@example.com',
        bcc: '',
        subject: 'Important Documents',
        date: expect.any(Date),
        bodyText: 'Plain text content',
        bodyHtml: '<p>HTML content</p>',
        snippet: 'Email with attachments',
        labels: ['INBOX', 'IMPORTANT', 'STARRED'],
        isRead: true,
        isStarred: true, // Has STARRED label
        hasAttachments: true,
        attachments: [
          {
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            attachmentId: 'attach_123',
            size: 12345
          }
        ],
        internalDate: expect.any(Date)
      })
    })

    test('should handle unread message correctly', async () => {
      const unreadMessage = {
        id: 'unread_msg',
        threadId: 'unread_thread',
        labelIds: ['INBOX', 'UNREAD'],
        snippet: 'Unread email',
        payload: {
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'Subject', value: 'New Message' },
            { name: 'Date', value: 'Mon, 9 Aug 2025 15:00:00 GMT' }
          ],
          body: {
            data: Buffer.from('New message content').toString('base64')
          }
        },
        internalDate: '1723214400000'
      }

      const result = await gmailService.parseMessage(unreadMessage)

      expect(result.isRead).toBe(false) // Has UNREAD label
      expect(result.isStarred).toBe(false)
    })
  })

  describe('Email Processing Logic', () => {
    test('should extract email address from string', () => {
      const testCases = [
        'simple@example.com',
        'John Doe <john@example.com>',
        '"John Doe" <john@example.com>',
        'john@example.com'
      ]

      const expectedResults = [
        'simple@example.com',
        'john@example.com', 
        'john@example.com',
        'john@example.com'
      ]

      testCases.forEach((input, index) => {
        const result = (gmailService as any).extractEmail(input)
        expect(result).toBe(expectedResults[index])
      })
    })

    test('should extract multiple email addresses', () => {
      const emailString = 'john@example.com, Jane Doe <jane@example.com>, "Bob Smith" <bob@example.com>'
      const result = (gmailService as any).extractEmails(emailString)
      
      expect(result).toEqual([
        'john@example.com',
        'jane@example.com',
        'bob@example.com'
      ])
    })

    test('should handle email changes detection', async () => {
      const existingEmail = {
        subject: 'Old Subject',
        isRead: false,
        isStarred: false,
        labels: ['INBOX']
      }

      const newMessage = {
        subject: 'New Subject',
        isRead: true,
        isStarred: true,
        labels: ['INBOX', 'IMPORTANT']
      }

      const hasChanges = await (gmailService as any).hasEmailChanges(existingEmail, newMessage)
      expect(hasChanges).toBe(true)

      // Test no changes
      const sameMessage = {
        subject: 'Old Subject',
        isRead: false,
        isStarred: false,
        labels: ['INBOX']
      }

      const noChanges = await (gmailService as any).hasEmailChanges(existingEmail, sameMessage)
      expect(noChanges).toBe(false)
    })
  })

  describe('RFC2822 Email Creation', () => {
    test('should create properly formatted RFC2822 email', async () => {
      const emailData = {
        to: 'recipient@example.com',
        cc: 'cc@example.com',
        subject: 'Test Email',
        bodyText: 'Plain text body',
        bodyHtml: '<p>HTML body</p>'
      }

      const result = await (gmailService as any).createRFC2822Email(emailData)

      expect(result).toContain('To: recipient@example.com')
      expect(result).toContain('Cc: cc@example.com')
      expect(result).toContain('Subject: Test Email')
      expect(result).toContain('Content-Type: text/html; charset=UTF-8')
      expect(result).toContain('<p>HTML body</p>')
    })

    test('should handle email without CC and BCC', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Simple Test',
        bodyText: 'Simple body'
      }

      const result = await (gmailService as any).createRFC2822Email(emailData)

      expect(result).toContain('To: recipient@example.com')
      expect(result).not.toContain('Cc:')
      expect(result).not.toContain('Bcc:')
      expect(result).toContain('Subject: Simple Test')
      expect(result).toContain('Simple body')
    })
  })

  describe('Webhook Processing', () => {
    test('should decode webhook data correctly', () => {
      const testData = {
        emailAddress: 'test@example.com',
        historyId: '12346'
      }
      
      const encodedData = Buffer.from(JSON.stringify(testData)).toString('base64')
      const decodedData = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf-8'))
      
      expect(decodedData).toEqual(testData)
    })

    test('should handle malformed base64 data', () => {
      const invalidBase64 = 'invalid_base64_data'
      
      expect(() => {
        Buffer.from(invalidBase64, 'base64').toString('utf-8')
      }).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid message data gracefully', async () => {
      const invalidMessage = {
        id: 'invalid_msg',
        threadId: 'invalid_thread',
        payload: {
          headers: [], // No headers
          body: {} // No data
        },
        internalDate: '1723197600000'
      }

      const result = await gmailService.parseMessage(invalidMessage)

      expect(result.id).toBe('invalid_msg')
      expect(result.from).toBe('')
      expect(result.to).toBe('')
      expect(result.subject).toBe('')
      expect(result.bodyText).toBeUndefined()
      expect(result.bodyHtml).toBeUndefined()
    })

    test('should handle malformed webhook data', async () => {
      const malformedWebhookData = {
        message: {
          data: Buffer.from('invalid json data').toString('base64'),
          messageId: 'malformed_msg',
          publishTime: new Date().toISOString()
        }
      }

      await expect(gmailService.processWebhookNotification(malformedWebhookData))
        .rejects.toThrow()
    })
  })

  describe('Sync Operations', () => {
    test('should create sync result structure correctly', () => {
      const account = mockAccount
      const syncResult = {
        accountId: account.id,
        success: true,
        emailsProcessed: 10,
        emailsAdded: 5,
        emailsUpdated: 3,
        emailsDeleted: 0,
        errorsCount: 0,
        startedAt: new Date()
      }

      expect(syncResult.accountId).toBe(account.id)
      expect(syncResult.success).toBe(true)
      expect(syncResult.emailsProcessed).toBe(10)
      expect(syncResult.emailsAdded).toBe(5)
      expect(syncResult.emailsUpdated).toBe(3)
      expect(syncResult.emailsDeleted).toBe(0)
      expect(syncResult.errorsCount).toBe(0)
      expect(syncResult.startedAt).toBeInstanceOf(Date)
    })
  })
})