import { ConversationalAIService, ConversationContext } from '../conversational-ai-service'
import { openaiService } from '../openai-service'
import { analyticsService } from '../analytics-service'
import { vectorService } from '../vector-service'
import { aiOrchestrator } from '../ai-orchestrator'

// Mock dependencies
jest.mock('../openai-service')
jest.mock('../analytics-service')
jest.mock('../vector-service')
jest.mock('../ai-orchestrator')

const mockedOpenAIService = openaiService as jest.Mocked<typeof openaiService>
const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>
const mockedVectorService = vectorService as jest.Mocked<typeof vectorService>
const mockedAIOrchestrator = aiOrchestrator as jest.Mocked<typeof aiOrchestrator>

describe('ConversationalAIService', () => {
  let service: ConversationalAIService
  let mockUser: {
    id: string
    role: ConversationContext['userRole']
    organizationId: string
  }

  beforeEach(() => {
    service = new ConversationalAIService()
    mockUser = {
      id: 'user_123',
      role: 'MANAGER',
      organizationId: 'org_456'
    }

    // Reset all mocks
    jest.clearAllMocks()
  })

  describe('startConversation', () => {
    beforeEach(() => {
      mockedAnalyticsService.generateComprehensiveAnalytics.mockResolvedValue({
        productivity: {
          tasksCompleted: 85,
          utilizationRate: 78,
          efficiencyScore: 82
        },
        financial: {
          profitMargin: 28,
          totalRevenue: 150000
        },
        client: {
          totalClients: 15,
          clientRetentionRate: 92,
          clientSatisfactionScore: 4.2
        }
      })
    })

    it('should start a new conversation with personalized welcome message', async () => {
      const { sessionId, welcomeMessage } = await service.startConversation(
        mockUser.id,
        mockUser.role,
        mockUser.organizationId
      )

      expect(sessionId).toBeDefined()
      expect(sessionId).toMatch(/^conv_/)
      expect(welcomeMessage.content).toContain('I\'m here to help you manage your team effectively')
      expect(welcomeMessage.type).toBe('text')
      expect(welcomeMessage.confidence).toBeGreaterThan(0.9)
      expect(welcomeMessage.followUpQuestions).toHaveLength(4)
    })

    it('should include contextual analytics in welcome message', async () => {
      const { welcomeMessage } = await service.startConversation(
        mockUser.id,
        mockUser.role,
        mockUser.organizationId
      )

      expect(welcomeMessage.analytics).toBeDefined()
      expect(welcomeMessage.analytics!.length).toBeGreaterThan(0)
      expect(mockedAnalyticsService.generateComprehensiveAnalytics).toHaveBeenCalled()
    })

    it('should generate role-specific suggestions', async () => {
      const { welcomeMessage } = await service.startConversation(
        mockUser.id,
        'PARTNER',
        mockUser.organizationId
      )

      expect(welcomeMessage.suggestions).toBeDefined()
      expect(welcomeMessage.suggestions.some(s => s.title.includes('Strategic'))).toBe(true)
    })
  })

  describe('processMessage', () => {
    let sessionId: string

    beforeEach(async () => {
      const { sessionId: newSessionId } = await service.startConversation(
        mockUser.id,
        mockUser.role,
        mockUser.organizationId
      )
      sessionId = newSessionId
    })

    describe('analytics requests', () => {
      beforeEach(() => {
        mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
          if (request.message.includes('Analyze the intent')) {
            return {
              response: JSON.stringify({
                type: 'analytics_request',
                entities: { period: 'monthly' },
                confidence: 0.9
              }),
              confidence: 0.9
            }
          } else if (request.message.includes('interpret these analytics')) {
            return {
              response: 'Your team performance shows strong growth with 85% task completion rate, indicating excellent productivity. The utilization rate of 78% is healthy, and there are opportunities for optimization in resource allocation.',
              confidence: 0.92
            }
          }
          return { response: 'Default response', confidence: 0.8 }
        })

        mockedAnalyticsService.generateComprehensiveAnalytics.mockResolvedValue({
          productivity: {
            tasksCompleted: 85,
            utilizationRate: 78,
            efficiencyScore: 82
          },
          financial: {
            profitMargin: 28,
            totalRevenue: 150000
          }
        })
      })

      it('should handle analytics requests correctly', async () => {
        const response = await service.processMessage(
          sessionId,
          'Show me this month\'s performance metrics'
        )

        expect(response.type).toBe('analytics')
        expect(response.content).toContain('team performance')
        expect(response.content).toContain('85% task completion rate')
        expect(response.analytics).toBeDefined()
        expect(response.analytics!.length).toBeGreaterThan(0)
        expect(mockedAnalyticsService.generateComprehensiveAnalytics).toHaveBeenCalled()
      })

      it('should provide analytics insights in proper format', async () => {
        const response = await service.processMessage(
          sessionId,
          'What are our key performance indicators?'
        )

        expect(response.analytics).toBeDefined()
        const insights = response.analytics!
        expect(insights[0]).toHaveProperty('metric')
        expect(insights[0]).toHaveProperty('value')
        expect(insights[0]).toHaveProperty('trend')
        expect(insights[0]).toHaveProperty('interpretation')
        expect(insights[0]).toHaveProperty('significance')
      })
    })

    describe('document queries', () => {
      beforeEach(() => {
        mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
          if (request.message.includes('Analyze the intent')) {
            return {
              response: JSON.stringify({
                type: 'document_query',
                entities: { documentType: 'contract' },
                confidence: 0.85
              }),
              confidence: 0.85
            }
          }
          return { response: 'Default response', confidence: 0.8 }
        })

        mockedVectorService.semanticSearch.mockResolvedValue({
          results: [
            {
              document: {
                id: 'doc_1',
                content: 'Contract analysis document content...',
                metadata: {
                  title: 'Client Service Agreement',
                  category: 'contracts',
                  url: '/documents/doc_1'
                }
              },
              relevanceScore: 0.92,
              relevantSections: ['Section 1: Terms and Conditions', 'Section 3: Payment Terms']
            }
          ],
          totalResults: 1,
          processingTime: 145
        })

        mockedAIOrchestrator.processUnifiedRequest.mockResolvedValue({
          id: 'ai_response_1',
          requestId: 'req_1',
          results: { type: 'AI_DOCUMENT_ANALYSIS' },
          insights: [
            {
              type: 'PATTERN',
              title: 'Contract Analysis Complete',
              description: 'Found standard terms with low risk indicators',
              confidence: 0.88,
              data: {},
              actionable: true
            }
          ],
          analytics: [],
          recommendations: [
            {
              type: 'IMMEDIATE',
              priority: 1,
              title: 'Review Payment Terms',
              description: 'Consider updating payment terms for better cash flow',
              expectedImpact: 'Improved cash flow by 15%',
              effort: 'LOW',
              roi: 2.5
            }
          ],
          confidence: 0.88,
          processingTime: 1250,
          cached: false
        })
      })

      it('should handle document queries with search results', async () => {
        const response = await service.processMessage(
          sessionId,
          'Analyze the client contract for payment terms'
        )

        expect(response.type).toBe('hybrid')
        expect(response.sources).toHaveLength(1)
        expect(response.sources[0].type).toBe('document')
        expect(response.sources[0].title).toBe('Client Service Agreement')
        expect(response.suggestions).toHaveLength(1)
        expect(response.suggestions[0].title).toBe('Review Payment Terms')
        expect(mockedVectorService.semanticSearch).toHaveBeenCalled()
        expect(mockedAIOrchestrator.processUnifiedRequest).toHaveBeenCalled()
      })

      it('should handle document queries with no results', async () => {
        mockedVectorService.semanticSearch.mockResolvedValue({
          results: [],
          totalResults: 0,
          processingTime: 95
        })

        const response = await service.processMessage(
          sessionId,
          'Find documents about xyz topic'
        )

        expect(response.type).toBe('text')
        expect(response.content).toContain('couldn\'t find specific documents')
        expect(response.content).toContain('alternatives')
        expect(response.suggestions).toHaveLength(1)
        expect(response.suggestions[0].title).toContain('Upload Document')
      })
    })

    describe('task management queries', () => {
      beforeEach(() => {
        mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
          if (request.message.includes('Analyze the intent')) {
            return {
              response: JSON.stringify({
                type: 'task_management',
                entities: { action: 'status_check' },
                confidence: 0.87
              }),
              confidence: 0.87
            }
          } else if (request.message.includes('Help with task management')) {
            return {
              response: 'Based on your current tasks, you have 10 items in progress with 3 overdue. I recommend prioritizing the overdue items and reassigning tasks to balance workload.',
              confidence: 0.89,
              suggestions: ['Prioritize overdue tasks', 'Balance team workload']
            }
          }
          return { response: 'Default response', confidence: 0.8 }
        })
      })

      it('should handle task management requests', async () => {
        const response = await service.processMessage(
          sessionId,
          'Show me the current task status'
        )

        expect(response.type).toBe('text')
        expect(response.content).toContain('10 items in progress')
        expect(response.content).toContain('3 overdue')
        expect(response.suggestions).toHaveLength(1)
        expect(response.followUpQuestions).toContain('Show me my team\'s current workload')
      })
    })

    describe('CA compliance queries', () => {
      beforeEach(() => {
        mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
          if (request.message.includes('Analyze the intent')) {
            return {
              response: JSON.stringify({
                type: 'general_ca_query',
                entities: { topic: 'compliance' },
                confidence: 0.91
              }),
              confidence: 0.91
            }
          } else if (request.message.includes('CA compliance')) {
            return {
              response: 'According to current ICAI guidelines, you need to ensure proper documentation for audit trails. The recent updates require enhanced digital record keeping and specific formats for compliance reports.',
              confidence: 0.94,
              suggestions: ['Update documentation procedures', 'Review audit trail requirements']
            }
          }
          return { response: 'Default response', confidence: 0.8 }
        })

        mockedVectorService.semanticSearch.mockResolvedValue({
          results: [
            {
              document: {
                id: 'kb_1',
                content: 'ICAI compliance guidelines for audit documentation...',
                metadata: {
                  title: 'ICAI Audit Guidelines 2024',
                  category: 'compliance'
                }
              },
              relevanceScore: 0.95,
              relevantSections: ['Digital Documentation Requirements', 'Audit Trail Standards']
            }
          ],
          totalResults: 1,
          processingTime: 120
        })
      })

      it('should handle CA compliance queries with knowledge base search', async () => {
        const response = await service.processMessage(
          sessionId,
          'What are the latest compliance requirements for audit documentation?'
        )

        expect(response.type).toBe('text')
        expect(response.content).toContain('ICAI guidelines')
        expect(response.content).toContain('audit trails')
        expect(response.sources).toHaveLength(1)
        expect(response.sources[0].type).toBe('knowledge_base')
        expect(response.sources[0].title).toBe('ICAI Audit Guidelines 2024')
        expect(mockedVectorService.semanticSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('CA compliance'),
            filters: expect.objectContaining({
              organizationId: 'ca-knowledge-base',
              category: ['compliance', 'regulations', 'procedures']
            })
          })
        )
      })
    })

    describe('general queries', () => {
      beforeEach(() => {
        mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
          if (request.message.includes('Analyze the intent')) {
            return {
              response: JSON.stringify({
                type: 'general',
                entities: {},
                confidence: 0.7
              }),
              confidence: 0.7
            }
          } else {
            return {
              response: 'I\'m here to help with your CA firm operations. I can assist with analytics, document analysis, task management, and compliance questions.',
              confidence: 0.85
            }
          }
        })
      })

      it('should handle general queries gracefully', async () => {
        const response = await service.processMessage(
          sessionId,
          'Hello, how are you today?'
        )

        expect(response.type).toBe('text')
        expect(response.content).toContain('CA firm operations')
        expect(response.followUpQuestions).toHaveLength(4)
        expect(response.followUpQuestions).toContain('Can you help me with analytics?')
      })
    })

    it('should throw error for invalid session ID', async () => {
      await expect(
        service.processMessage('invalid_session', 'test message')
      ).rejects.toThrow('Conversation session not found')
    })
  })

  describe('conversation management', () => {
    let sessionId: string

    beforeEach(async () => {
      const { sessionId: newSessionId } = await service.startConversation(
        mockUser.id,
        mockUser.role,
        mockUser.organizationId
      )
      sessionId = newSessionId
    })

    it('should maintain conversation history', async () => {
      // Mock intent analysis
      mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
        if (request.message.includes('Analyze the intent')) {
          return {
            response: JSON.stringify({ type: 'general', entities: {}, confidence: 0.8 }),
            confidence: 0.8
          }
        }
        return { response: 'Test response', confidence: 0.8 }
      })

      await service.processMessage(sessionId, 'First message')
      await service.processMessage(sessionId, 'Second message')

      const history = await service.getConversationHistory(sessionId)
      
      // Should have welcome message + 2 user messages + 2 assistant responses
      expect(history.length).toBe(4)
      expect(history.filter(m => m.role === 'user')).toHaveLength(2)
      expect(history.filter(m => m.role === 'assistant')).toHaveLength(2)
      expect(history[0].content).toBe('First message')
      expect(history[2].content).toBe('Second message')
    })

    it('should update conversation preferences', async () => {
      const newPreferences = {
        responseStyle: 'CONCISE' as const,
        includeAnalytics: false
      }

      await expect(
        service.updateConversationPreferences(sessionId, newPreferences)
      ).resolves.not.toThrow()

      // Verify preferences are updated (this would require accessing private state)
      // In a real implementation, you might add a method to get current preferences
    })

    it('should end conversation and clean up', async () => {
      await expect(
        service.endConversation(sessionId)
      ).resolves.not.toThrow()

      // Attempting to get history after ending should return empty array
      const history = await service.getConversationHistory(sessionId)
      expect(history).toEqual([])
    })
  })

  describe('error handling', () => {
    let sessionId: string

    beforeEach(async () => {
      const { sessionId: newSessionId } = await service.startConversation(
        mockUser.id,
        mockUser.role,
        mockUser.organizationId
      )
      sessionId = newSessionId
    })

    it('should handle OpenAI service errors gracefully', async () => {
      mockedOpenAIService.chatWithAssistant.mockRejectedValue(new Error('OpenAI API error'))

      const response = await service.processMessage(
        sessionId,
        'Test message that will cause error'
      )

      expect(response.type).toBe('text')
      expect(response.confidence).toBeLessThan(0.8)
      // Should still provide a response even with errors
      expect(response.content.length).toBeGreaterThan(0)
    })

    it('should handle analytics service errors gracefully', async () => {
      // Mock successful intent analysis but failed analytics
      mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
        if (request.message.includes('Analyze the intent')) {
          return {
            response: JSON.stringify({
              type: 'analytics_request',
              entities: { period: 'monthly' },
              confidence: 0.9
            }),
            confidence: 0.9
          }
        }
        return { response: 'Fallback response', confidence: 0.7 }
      })

      mockedAnalyticsService.generateComprehensiveAnalytics.mockRejectedValue(
        new Error('Analytics service unavailable')
      )

      const response = await service.processMessage(
        sessionId,
        'Show me analytics'
      )

      expect(response).toBeDefined()
      expect(response.confidence).toBeGreaterThan(0)
      // Should handle the error and still provide some response
    })

    it('should handle vector search errors gracefully', async () => {
      mockedOpenAIService.chatWithAssistant.mockImplementation(async (request) => {
        if (request.message.includes('Analyze the intent')) {
          return {
            response: JSON.stringify({
              type: 'document_query',
              entities: {},
              confidence: 0.85
            }),
            confidence: 0.85
          }
        }
        return { response: 'Fallback response', confidence: 0.7 }
      })

      mockedVectorService.semanticSearch.mockRejectedValue(new Error('Vector search failed'))

      const response = await service.processMessage(
        sessionId,
        'Find documents'
      )

      expect(response).toBeDefined()
      expect(response.type).toBe('text')
      // Should provide helpful alternative when search fails
      expect(response.content).toContain('alternatives')
    })
  })
})