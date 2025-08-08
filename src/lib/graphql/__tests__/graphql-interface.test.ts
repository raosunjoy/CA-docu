import { graphqlClient, analyticsService } from '../client'

// Mock the fetch function
global.fetch = jest.fn()

describe('GraphQL Interface', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GraphQLClient', () => {
    it('should make a successful query', async () => {
      const mockResponse = {
        data: {
          analytics: {
            period: 'MONTH',
            data: [{ date: '2024-01-01', value: 100 }]
          }
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const query = `
        query GetAnalytics($input: AnalyticsInput!) {
          analytics(input: $input) {
            period
            data {
              date
              value
            }
          }
        }
      `

      const variables = {
        input: {
          organizationId: 'org-1',
          metric: 'performance',
          period: 'MONTH'
        }
      }

      const result = await graphqlClient.query(query, variables)

      expect(fetch).toHaveBeenCalledWith('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables
        })
      })

      expect(result).toEqual(mockResponse.data)
    })

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        errors: [
          { message: 'Field "analytics" of type "AnalyticsData" must have a selection of subfields.' }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const query = `
        query GetAnalytics($input: AnalyticsInput!) {
          analytics(input: $input)
        }
      `

      const variables = {
        input: {
          organizationId: 'org-1',
          metric: 'performance',
          period: 'MONTH'
        }
      }

      await expect(graphqlClient.query(query, variables)).rejects.toThrow(
        'GraphQL errors: Field "analytics" of type "AnalyticsData" must have a selection of subfields.'
      )
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      })

      const query = `
        query GetAnalytics($input: AnalyticsInput!) {
          analytics(input: $input) {
            period
          }
        }
      `

      await expect(graphqlClient.query(query)).rejects.toThrow(
        'GraphQL request failed: Internal Server Error'
      )
    })

    it('should set and clear auth tokens', () => {
      const token = 'test-token'
      
      graphqlClient.setAuthToken(token)
      expect(graphqlClient['headers']['Authorization']).toBe(`Bearer ${token}`)
      
      graphqlClient.clearAuthToken()
      expect(graphqlClient['headers']['Authorization']).toBeUndefined()
    })
  })

  describe('Analytics Service', () => {
    it('should get analytics data', async () => {
      const mockResponse = {
        analytics: {
          period: 'MONTH',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          data: [
            { date: '2024-01-01', value: 100, label: 'Performance' }
          ],
          trend: 'UP',
          trendPercentage: 5.2
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        metric: 'performance',
        period: 'MONTH'
      }

      const result = await analyticsService.getAnalytics(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get KPIs', async () => {
      const mockResponse = {
        kpis: [
          {
            id: 'task-completion-rate',
            name: 'Task Completion Rate',
            value: 85.5,
            target: 90,
            unit: '%',
            trend: 'UP',
            trendPercentage: 2.3,
            status: 'GOOD'
          }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        kpiTypes: ['task-completion-rate']
      }

      const result = await analyticsService.getKPIs(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get metrics', async () => {
      const mockResponse = {
        metrics: [
          {
            id: 'metric-1',
            name: 'Task Count',
            value: 150,
            dimensions: { team: 'development' },
            timestamp: '2024-01-01T00:00:00Z',
            metadata: { type: 'count' }
          }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        metricTypes: ['task-count'],
        dimensions: ['team']
      }

      const result = await analyticsService.getMetrics(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get performance analytics', async () => {
      const mockResponse = {
        performanceAnalytics: {
          period: 'MONTH',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          data: [
            { date: '2024-01-01', value: 85.2, label: 'Performance Score' }
          ],
          trend: 'UP',
          trendPercentage: 3.1,
          summary: {
            totalTasks: 150,
            completedTasks: 128,
            averageCompletionTime: 2.5,
            productivityScore: 85.2
          }
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        period: 'MONTH'
      }

      const result = await analyticsService.getPerformanceAnalytics(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get productivity metrics', async () => {
      const mockResponse = {
        productivityMetrics: [
          {
            userId: 'user-1',
            date: '2024-01-01',
            totalHours: 8.5,
            billableHours: 7.2,
            tasksCompleted: 5,
            focusScore: 85.3,
            efficiencyScore: 92.1,
            utilizationRate: 84.7
          }
        ]
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        userId: 'user-1'
      }

      const result = await analyticsService.getProductivityMetrics(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get time tracking analytics', async () => {
      const mockResponse = {
        timeTrackingAnalytics: {
          totalHours: 168.5,
          billableHours: 142.3,
          nonBillableHours: 26.2,
          utilizationRate: 84.4,
          averageHoursPerDay: 8.4,
          productivityScore: 87,
          timeDistribution: [
            { category: 'WORK', hours: 142.3, percentage: 84.4 },
            { category: 'MEETING', hours: 20.1, percentage: 11.9 }
          ],
          dailyBreakdown: [
            { date: '2024-01-01', totalHours: 8.5, billableHours: 7.2, productivity: 84.7 }
          ]
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        userId: 'user-1'
      }

      const result = await analyticsService.getTimeTrackingAnalytics(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get compliance metrics', async () => {
      const mockResponse = {
        complianceMetrics: {
          complianceScore: 92.5,
          riskLevel: 'LOW',
          pendingCompliance: 3,
          complianceDeadlines: 5,
          riskFactors: [
            {
              category: 'Overdue Compliance',
              score: 95,
              level: 'LOW',
              description: '0 overdue compliance tasks'
            }
          ]
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1',
        role: 'PARTNER'
      }

      const result = await analyticsService.getComplianceMetrics(params)

      expect(result).toEqual(mockResponse)
    })

    it('should get client engagement analytics', async () => {
      const mockResponse = {
        clientEngagementAnalytics: {
          totalClients: 25,
          activeEngagements: 12,
          completedEngagements: 8,
          averageEngagementDuration: 14.5,
          clientSatisfactionScore: 4.2,
          engagementTypes: [
            {
              type: 'Tax Services',
              count: 8,
              averageDuration: 12.3,
              completionRate: 95.2
            }
          ],
          monthlyEngagements: [
            {
              month: 'Jan',
              newEngagements: 5,
              completedEngagements: 3,
              revenue: 75000
            }
          ]
        }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse })
      })

      const params = {
        organizationId: 'org-1'
      }

      const result = await analyticsService.getClientEngagementAnalytics(params)

      expect(result).toEqual(mockResponse)
    })
  })
})