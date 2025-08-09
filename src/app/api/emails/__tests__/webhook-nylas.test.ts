// Nylas Webhook API Endpoint Tests
import { POST, GET } from '../webhook/nylas/route'
import { NextRequest } from 'next/server'
import { emailSyncService } from '@/lib/email-sync-service'
import { validateWebhookSignature } from '@/lib/webhook-security'

// Mock dependencies
jest.mock('@/lib/email-sync-service')
jest.mock('@/lib/webhook-security')

const mockEmailSyncService = emailSyncService as jest.Mocked<typeof emailSyncService>
const mockValidateWebhookSignature = validateWebhookSignature as jest.MockedFunction<typeof validateWebhookSignature>

describe('/api/emails/webhook/nylas', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NYLAS_WEBHOOK_SECRET = 'test_webhook_secret'
  })

  describe('POST - Webhook Processing', () => {
    const mockWebhookData = {
      deltas: [
        {
          object: 'message',
          type: 'message.created',
          object_data: {
            account_id: 'nylas_account_123',
            id: 'msg_123',
            subject: 'New Message'
          }
        }
      ]
    }

    it('should process valid Nylas webhook successfully', async () => {
      mockValidateWebhookSignature.mockReturnValue(true)
      mockEmailSyncService.processWebhookNotification.mockResolvedValue({
        success: true,
        accountId: 'account_123',
        processed: true,
        messagesProcessed: 1
      })

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=valid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        success: true,
        processed: true,
        messagesProcessed: 1
      })
      expect(mockValidateWebhookSignature).toHaveBeenCalledWith(
        mockWebhookData,
        'sha256=valid_signature',
        'test_webhook_secret'
      )
      expect(mockEmailSyncService.processWebhookNotification).toHaveBeenCalledWith('nylas', mockWebhookData)
    })

    it('should reject webhook with invalid signature', async () => {
      mockValidateWebhookSignature.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=invalid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({
        error: 'Invalid webhook signature'
      })
      expect(mockEmailSyncService.processWebhookNotification).not.toHaveBeenCalled()
    })

    it('should handle missing webhook signature', async () => {
      mockValidateWebhookSignature.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      expect(mockValidateWebhookSignature).toHaveBeenCalledWith(
        mockWebhookData,
        null,
        'test_webhook_secret'
      )
    })

    it('should handle webhook processing errors', async () => {
      mockValidateWebhookSignature.mockReturnValue(true)
      mockEmailSyncService.processWebhookNotification.mockResolvedValue({
        success: false
      })

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=valid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: 'Failed to process webhook'
      })
    })

    it('should handle service exceptions', async () => {
      mockValidateWebhookSignature.mockReturnValue(true)
      mockEmailSyncService.processWebhookNotification.mockRejectedValue(new Error('Service error'))

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=valid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: 'Internal server error'
      })
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=valid_signature',
          'content-type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should process multiple deltas in single webhook', async () => {
      const multiDeltaWebhook = {
        deltas: [
          {
            object: 'message',
            type: 'message.created',
            object_data: { account_id: 'nylas_account_123', id: 'msg_1' }
          },
          {
            object: 'message',
            type: 'message.updated',
            object_data: { account_id: 'nylas_account_123', id: 'msg_2' }
          },
          {
            object: 'message',
            type: 'message.deleted',
            object_data: { account_id: 'nylas_account_123', id: 'msg_3' }
          }
        ]
      }

      mockValidateWebhookSignature.mockReturnValue(true)
      mockEmailSyncService.processWebhookNotification.mockResolvedValue({
        success: true,
        accountId: 'account_123',
        processed: true,
        messagesProcessed: 3
      })

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=valid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(multiDeltaWebhook)
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.messagesProcessed).toBe(3)
      expect(mockEmailSyncService.processWebhookNotification).toHaveBeenCalledWith('nylas', multiDeltaWebhook)
    })
  })

  describe('GET - Webhook Verification', () => {
    it('should respond to Nylas webhook challenge', async () => {
      const challengeToken = 'test_challenge_token_123'
      
      const request = new NextRequest(`http://localhost:3000/api/emails/webhook/nylas?challenge=${challengeToken}`, {
        method: 'GET'
      })

      const response = await GET(request)
      const responseText = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/plain')
      expect(responseText).toBe(challengeToken)
    })

    it('should return status when no challenge provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'GET'
      })

      const response = await GET(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toEqual({
        status: 'Nylas webhook endpoint active'
      })
    })

    it('should handle verification errors', async () => {
      // Mock URL parsing error
      const request = {
        nextUrl: {
          searchParams: {
            get: jest.fn().mockImplementation(() => {
              throw new Error('URL parsing error')
            })
          }
        }
      } as unknown as NextRequest

      const response = await GET(request)

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: 'Verification failed'
      })
    })
  })

  describe('Webhook Security', () => {
    const mockWebhookData = {
      deltas: [
        {
          object: 'message',
          type: 'message.created',
          object_data: { account_id: 'nylas_account_123' }
        }
      ]
    }

    it('should skip signature validation in development environment', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      mockValidateWebhookSignature.mockReturnValue(false)
      mockEmailSyncService.processWebhookNotification.mockResolvedValue({
        success: true,
        processed: true,
        messagesProcessed: 1
      })

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=invalid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(200) // Should succeed despite invalid signature
      expect(mockEmailSyncService.processWebhookNotification).toHaveBeenCalled()

      // Restore environment
      process.env.NODE_ENV = originalEnv
    })

    it('should enforce signature validation in production environment', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      mockValidateWebhookSignature.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=invalid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401) // Should fail with invalid signature
      expect(mockEmailSyncService.processWebhookNotification).not.toHaveBeenCalled()

      // Restore environment
      process.env.NODE_ENV = originalEnv
    })

    it('should handle missing webhook secret', async () => {
      const originalSecret = process.env.NYLAS_WEBHOOK_SECRET
      delete process.env.NYLAS_WEBHOOK_SECRET

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify(mockWebhookData)
      })

      const response = await POST(request)

      expect(response.status).toBe(500) // Should fail without webhook secret

      // Restore environment
      process.env.NYLAS_WEBHOOK_SECRET = originalSecret
    })
  })

  describe('Webhook Performance', () => {
    it('should log processing time for performance monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      mockValidateWebhookSignature.mockReturnValue(true)
      mockEmailSyncService.processWebhookNotification.mockResolvedValue({
        success: true,
        processed: true,
        messagesProcessed: 1
      })

      const request = new NextRequest('http://localhost:3000/api/emails/webhook/nylas', {
        method: 'POST',
        headers: {
          'x-nylas-signature': 'sha256=valid_signature',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          deltas: [{ object: 'message', type: 'message.created', object_data: {} }]
        })
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Received Nylas webhook notification:',
        expect.objectContaining({
          deltas: 1,
          timestamp: expect.any(String)
        })
      )

      consoleSpy.mockRestore()
    })
  })
})