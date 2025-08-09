import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

// Mock dependencies
jest.mock('@/lib/unified/data-layer', () => ({
  unifiedDataLayer: {
    getTimeSeriesData: jest.fn().mockResolvedValue([
      {
        timestamp: new Date('2024-01-01'),
        value: 85,
        tags: { utilization: 75 }
      },
      {
        timestamp: new Date('2024-01-02'),
        value: 90,
        tags: { utilization: 80 }
      }
    ])
  }
}))

jest.mock('@/services/analytics-service', () => ({
  analyticsService: {
    generateComprehensiveAnalytics: jest.fn().mockResolvedValue({
      productivity: {
        totalTasks: 100,
        tasksCompleted: 85,
        efficiencyScore: 88,
        utilizationRate: 82
      },
      compliance: {
        complianceScore: 92,
        upcomingDeadlines: 3
      },
      financial: {
        totalRevenue: 125000,
        profitMargin: 25.5
      },
      client: {
        totalClients: 45,
        activeClients: 38,
        clientSatisfactionScore: 4.2,
        clientRetentionRate: 94
      },
      team: {
        activeMembers: 8,
        collaborationScore: 85
      }
    })
  }
}))

jest.mock('@/lib/chart-data-formatter', () => ({
  formatDataForExport: jest.fn().mockImplementation((widgetId, data, format) => {
    if (format === 'csv') {
      return 'date,value\n2024-01-01,85\n2024-01-02,90'
    }
    if (format === 'json') {
      return data
    }
    return { formattedData: 'mock-formatted-data' }
  })
}))

describe('Dashboard Export API', () => {
  const mockRequest = (body: any) => ({
    json: jest.fn().mockResolvedValue(body)
  } as unknown as NextRequest)

  const mockGetRequest = (searchParams: URLSearchParams) => ({
    url: `http://localhost/api/dashboard/export?${searchParams.toString()}`
  } as NextRequest)

  describe('POST /api/dashboard/export', () => {
    it('should export task overview data as CSV for PARTNER role', async () => {
      const requestBody = {
        widgetId: 'task_overview',
        format: 'csv',
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'PARTNER',
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.filename).toContain('task_overview_csv_')
      expect(data.contentType).toBe('text/csv')
      expect(data.metadata.recordCount).toBe(2)
    })

    it('should deny financial data export for INTERN role', async () => {
      const requestBody = {
        widgetId: 'financial_metrics',
        format: 'csv',
        userId: 'intern-123',
        organizationId: 'org-123',
        role: 'INTERN'
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Export access denied')
    })

    it('should validate required fields', async () => {
      const requestBody = {
        widgetId: 'task_overview',
        format: 'csv'
        // Missing required fields
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should validate date range', async () => {
      const requestBody = {
        widgetId: 'task_overview',
        format: 'csv',
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'ASSOCIATE',
        dateRange: {
          startDate: '2024-01-31',
          endDate: '2024-01-01' // End before start
        }
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('startDate must be before endDate')
    })

    it('should export multiple formats for authorized roles', async () => {
      const formats = ['csv', 'json', 'excel', 'pdf']
      
      for (const format of formats) {
        const requestBody = {
          widgetId: 'task_overview',
          format,
          userId: 'manager-123',
          organizationId: 'org-123',
          role: 'MANAGER'
        }

        const request = mockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.filename).toContain(`task_overview_${format}_`)
      }
    })

    it('should handle unknown widget IDs', async () => {
      const requestBody = {
        widgetId: 'unknown_widget',
        format: 'csv',
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'PARTNER'
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Unknown widget')
    })

    it('should include metadata when requested', async () => {
      const requestBody = {
        widgetId: 'compliance_status',
        format: 'json',
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'MANAGER',
        includeMetadata: true
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata).toBeDefined()
      expect(data.metadata.exportedAt).toBeDefined()
      expect(data.metadata.recordCount).toBe(2)
      expect(data.metadata.fileSize).toBeGreaterThan(0)
    })
  })

  describe('GET /api/dashboard/export/formats', () => {
    it('should return available formats for PARTNER role', async () => {
      const searchParams = new URLSearchParams({
        widgetId: 'financial_metrics',
        role: 'PARTNER'
      })

      const request = mockGetRequest(searchParams)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowedFormats).toEqual(['csv', 'excel', 'pdf', 'json'])
      expect(data.permissions.canExportData).toBe(true)
    })

    it('should return limited formats for INTERN role', async () => {
      const searchParams = new URLSearchParams({
        widgetId: 'task_overview',
        role: 'INTERN'
      })

      const request = mockGetRequest(searchParams)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowedFormats).toEqual([]) // INTERN can't export
      expect(data.permissions.canExportData).toBe(false)
    })

    it('should return format details', async () => {
      const searchParams = new URLSearchParams({
        widgetId: 'team_performance',
        role: 'MANAGER'
      })

      const request = mockGetRequest(searchParams)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.formatDetails).toBeDefined()
      expect(data.formatDetails.csv).toEqual({
        description: 'Comma-separated values for spreadsheet applications',
        contentType: 'text/csv',
        fileExtension: '.csv'
      })
    })

    it('should require widgetId and role parameters', async () => {
      const searchParams = new URLSearchParams({
        widgetId: 'task_overview'
        // Missing role
      })

      const request = mockGetRequest(searchParams)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing widgetId or role')
    })
  })

  describe('Role-based access control', () => {
    const testCases = [
      {
        role: 'PARTNER',
        widget: 'financial_metrics',
        expectedAccess: true
      },
      {
        role: 'MANAGER', 
        widget: 'financial_metrics',
        expectedAccess: true
      },
      {
        role: 'ASSOCIATE',
        widget: 'financial_metrics',
        expectedAccess: false
      },
      {
        role: 'INTERN',
        widget: 'financial_metrics',
        expectedAccess: false
      },
      {
        role: 'ASSOCIATE',
        widget: 'client_engagement',
        expectedAccess: true
      },
      {
        role: 'INTERN',
        widget: 'client_engagement',
        expectedAccess: false
      }
    ]

    testCases.forEach(({ role, widget, expectedAccess }) => {
      it(`should ${expectedAccess ? 'allow' : 'deny'} ${role} to export ${widget}`, async () => {
        const requestBody = {
          widgetId: widget,
          format: 'csv',
          userId: 'user-123',
          organizationId: 'org-123',
          role
        }

        const request = mockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        if (expectedAccess) {
          expect(response.status).toBe(200)
          expect(data.success).toBe(true)
        } else {
          expect(response.status).toBe(403)
          expect(data.success).toBe(false)
          expect(data.error).toContain('Export access denied')
        }
      })
    })
  })

  describe('Data retention limits', () => {
    it('should enforce data retention limits for INTERN role', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100) // 100 days ago (exceeds INTERN limit of 90 days)

      const requestBody = {
        widgetId: 'task_overview',
        format: 'csv',
        userId: 'intern-123',
        organizationId: 'org-123',
        role: 'INTERN',
        dateRange: {
          startDate: oldDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('exceeds maximum data retention')
    })

    it('should allow longer retention for PARTNER role', async () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 365) // 1 year ago (within PARTNER limit)

      const requestBody = {
        widgetId: 'task_overview',
        format: 'csv',
        userId: 'partner-123',
        organizationId: 'org-123',
        role: 'PARTNER',
        dateRange: {
          startDate: oldDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }

      const request = mockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})