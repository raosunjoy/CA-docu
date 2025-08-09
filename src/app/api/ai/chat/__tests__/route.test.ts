import { NextRequest } from 'next/server'
import { POST, GET, PATCH, DELETE } from '../route'
import { conversationalAI } from '../../../../../services/conversational-ai-service'
import { auth } from '../../../../../lib/auth'
import { logger } from '../../../../../lib/logger'

// Mock dependencies
jest.mock('../../../../../services/conversational-ai-service')
jest.mock('../../../../../lib/auth')
jest.mock('../../../../../lib/logger')

const mockedConversationalAI = conversationalAI as jest.Mocked<typeof conversationalAI>
const mockedAuth = auth as jest.Mocked<typeof auth>
const mockedLogger = logger as jest.Mocked<typeof logger>

describe('/api/ai/chat', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    role: 'MANAGER',
    organizationId: 'org_456'
  }

  const mockSessionId = 'conv_123_abc'
  const mockWelcomeMessage = {
    id: 'msg_1',
    content: 'Welcome! How can I help you today?',
    type: 'text' as const,
    confidence: 0.95,
    sources: [],
    analytics: [],
    suggestions: [],
    followUpQuestions: ['Show me analytics', 'What documents need review?'],
    timestamp: new Date()
  }

  const mockChatResponse = {
    id: 'msg_2',
    content: 'Here are your analytics insights...',
    type: 'analytics' as const,
    confidence: 0.92,
    sources: [],
    analytics: [
      {
        metric: 'Task Completion Rate',
        value: '85%',
        trend: 'up' as const,
        interpretation: 'Performance is above target',
        significance: 'high' as const
      }
    ],
    suggestions: [],
    followUpQuestions: [],
    timestamp: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.getCurrentUser.mockResolvedValue(mockUser)
    mockedLogger.info.mockImplementation()
    mockedLogger.error.mockImplementation()
  })

  describe('POST /api/ai/chat', () => {
    it('should start a new conversation when startNewSession is true', async () => {
      mockedConversationalAI.startConversation.mockResolvedValue({
        sessionId: mockSessionId,
        welcomeMessage: mockWelcomeMessage
      })

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          startNewSession: true,
          businessContext: {
            currentProjects: ['Project A'],
            activeClients: ['Client 1'],
            priorities: ['Compliance review']
          }
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe(mockSessionId)
      expect(data.response).toEqual(mockWelcomeMessage)
      
      expect(mockedConversationalAI.startConversation).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.role,
        mockUser.organizationId,
        {
          currentProjects: ['Project A'],
          activeClients: ['Client 1'],
          priorities: ['Compliance review']
        }
      )
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Started new AI conversation',
        expect.objectContaining({
          userId: mockUser.id,
          sessionId: mockSessionId,
          userRole: mockUser.role
        })
      )
    })

    it('should process message in existing conversation', async () => {
      mockedConversationalAI.processMessage.mockResolvedValue(mockChatResponse)

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: mockSessionId,
          message: 'Show me analytics for this month',
          messageType: 'analytics_request'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe(mockSessionId)
      expect(data.response).toEqual(mockChatResponse)
      
      expect(mockedConversationalAI.processMessage).toHaveBeenCalledWith(
        mockSessionId,
        'Show me analytics for this month',
        'analytics_request'
      )
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Processed AI conversation message',
        expect.objectContaining({
          userId: mockUser.id,
          sessionId: mockSessionId,
          messageType: 'analytics_request',
          confidence: mockChatResponse.confidence
        })
      )
    })

    it('should start new session when no sessionId provided', async () => {
      mockedConversationalAI.startConversation.mockResolvedValue({
        sessionId: mockSessionId,
        welcomeMessage: mockWelcomeMessage
      })

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe(mockSessionId)
      expect(mockedConversationalAI.startConversation).toHaveBeenCalled()
    })

    it('should return 401 for unauthorized requests', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          startNewSession: true
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when message is missing and not starting new session', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: mockSessionId
          // Missing message
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Message is required unless starting new session')
    })

    it('should handle conversational AI service errors', async () => {
      mockedConversationalAI.processMessage.mockRejectedValue(
        new Error('Conversation session not found')
      )

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'invalid_session',
          message: 'Test message'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to process chat request')
      expect(data.details).toBe('Conversation session not found')
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'AI chat error:',
        expect.any(Error)
      )
    })

    it('should handle JSON parsing errors', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to process chat request')
    })
  })

  describe('GET /api/ai/chat', () => {
    const mockHistory = [
      {
        id: 'msg_1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
        metadata: { type: 'query' }
      },
      {
        id: 'msg_2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date(),
        metadata: { type: 'query', confidence: 0.95 }
      }
    ]

    it('should return conversation history for valid session', async () => {
      mockedConversationalAI.getConversationHistory.mockResolvedValue(mockHistory)

      const url = `http://localhost/api/ai/chat?sessionId=${mockSessionId}`
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBe(mockSessionId)
      expect(data.history).toEqual(mockHistory)
      
      expect(mockedConversationalAI.getConversationHistory).toHaveBeenCalledWith(mockSessionId)
    })

    it('should return 401 for unauthorized requests', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue(null)

      const url = `http://localhost/api/ai/chat?sessionId=${mockSessionId}`
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when sessionId is missing', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Session ID is required')
    })

    it('should handle service errors', async () => {
      mockedConversationalAI.getConversationHistory.mockRejectedValue(
        new Error('Session not found')
      )

      const url = `http://localhost/api/ai/chat?sessionId=${mockSessionId}`
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to retrieve conversation history')
      expect(data.details).toBe('Session not found')
    })
  })

  describe('PATCH /api/ai/chat', () => {
    it('should update conversation preferences', async () => {
      mockedConversationalAI.updateConversationPreferences.mockResolvedValue()

      const preferences = {
        responseStyle: 'CONCISE' as const,
        includeAnalytics: false
      }

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: mockSessionId,
          preferences
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Conversation preferences updated')
      
      expect(mockedConversationalAI.updateConversationPreferences).toHaveBeenCalledWith(
        mockSessionId,
        preferences
      )
    })

    it('should return 401 for unauthorized requests', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: mockSessionId,
          preferences: {}
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when sessionId is missing', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'PATCH',
        body: JSON.stringify({
          preferences: {}
        })
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Session ID is required')
    })
  })

  describe('DELETE /api/ai/chat', () => {
    it('should end conversation session', async () => {
      mockedConversationalAI.endConversation.mockResolvedValue()

      const url = `http://localhost/api/ai/chat?sessionId=${mockSessionId}`
      const request = new NextRequest(url, { method: 'DELETE' })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Conversation ended')
      
      expect(mockedConversationalAI.endConversation).toHaveBeenCalledWith(mockSessionId)
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Ended AI conversation',
        expect.objectContaining({
          userId: mockUser.id,
          sessionId: mockSessionId
        })
      )
    })

    it('should return 401 for unauthorized requests', async () => {
      mockedAuth.getCurrentUser.mockResolvedValue(null)

      const url = `http://localhost/api/ai/chat?sessionId=${mockSessionId}`
      const request = new NextRequest(url, { method: 'DELETE' })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 when sessionId is missing', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', { method: 'DELETE' })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Session ID is required')
    })

    it('should handle service errors', async () => {
      mockedConversationalAI.endConversation.mockRejectedValue(
        new Error('Failed to end session')
      )

      const url = `http://localhost/api/ai/chat?sessionId=${mockSessionId}`
      const request = new NextRequest(url, { method: 'DELETE' })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to end conversation')
      expect(data.details).toBe('Failed to end session')
    })
  })

  describe('Error Handling', () => {
    it('should handle auth service failures', async () => {
      mockedAuth.getCurrentUser.mockRejectedValue(new Error('Auth service down'))

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ startNewSession: true })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to process chat request')
    })

    it('should handle malformed request bodies', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })

    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST'
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Request Validation', () => {
    it('should validate message types', async () => {
      mockedConversationalAI.processMessage.mockResolvedValue(mockChatResponse)

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: mockSessionId,
          message: 'Test message',
          messageType: 'command'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      expect(mockedConversationalAI.processMessage).toHaveBeenCalledWith(
        mockSessionId,
        'Test message',
        'command'
      )
    })

    it('should default to query messageType when not specified', async () => {
      mockedConversationalAI.processMessage.mockResolvedValue(mockChatResponse)

      const request = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: mockSessionId,
          message: 'Test message'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      
      expect(mockedConversationalAI.processMessage).toHaveBeenCalledWith(
        mockSessionId,
        'Test message',
        'query'
      )
    })
  })
})