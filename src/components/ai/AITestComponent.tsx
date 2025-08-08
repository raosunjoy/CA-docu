'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface AIResponse {
  success: boolean
  data: {
    id: string
    results: any
    insights: Array<{
      type: string
      title: string
      description: string
      confidence: number
      actionable: boolean
    }>
    analytics: Array<{
      metric: string
      value: number
      trend: string
      variance: number
    }>
    recommendations: Array<{
      type: string
      title: string
      description: string
      roi: number
    }>
    processingTime: number
    cached: boolean
  }
}

export function AITestComponent() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<AIResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testAI = async (type: 'AI' | 'ANALYTICS' | 'HYBRID') => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const testData = {
        type: type,
        data: type === 'AI' ? {
          document: `FINANCIAL STATEMENT - Q3 2024
            
CLIENT: ABC Consulting Pvt Ltd
PERIOD: July 1, 2024 - September 30, 2024

REVENUE:
- Consulting Services: ₹125,000
- Tax Advisory: ₹35,000
- Audit Services: ₹75,000
Total Revenue: ₹235,000

EXPENSES:
- Staff Salaries: ₹87,000
- Office Rent: ₹25,000
- Professional Fees: ₹15,000
- Software Licenses: ₹8,000
Total Expenses: ₹135,000

NET PROFIT: ₹100,000

NOTES:
- GST compliance pending for August 2024
- Client payment for Project XYZ overdue by 15 days
- New audit engagement signed for next quarter`,
          documentType: 'FINANCIAL',
          clientName: 'ABC Consulting Pvt Ltd',
          period: 'Q3 2024'
        } : type === 'ANALYTICS' ? {
          metrics: {
            revenue: 235000,
            expenses: 135000,
            clients: 45,
            profit_margin: 42.6,
            outstanding_receivables: 85000,
            team_utilization: 78.5
          },
          period: 'Q3 2024',
          comparative_data: {
            last_quarter: { revenue: 195000, expenses: 125000 },
            last_year: { revenue: 210000, expenses: 140000 }
          }
        } : {
          // Hybrid - both document and metrics
          document: 'Q3 Performance Review - Revenue up 20.5% from last quarter',
          message: 'Analyze our Q3 performance and recommend improvements for Q4',
          metrics: {
            revenue: 235000,
            expenses: 135000,
            profit_margin: 42.6,
            client_satisfaction: 4.2,
            team_productivity: 78.5
          }
        },
        userId: 'test-user-123',
        context: {
          userRole: 'MANAGER',
          businessContext: type === 'AI' ? 'document_analysis' : 
                          type === 'ANALYTICS' ? 'performance_metrics' : 
                          'strategic_planning',
          priority: 'HIGH'
        }
      }

      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const result = await res.json()
      setResponse(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testAPI = async () => {
    try {
      const res = await fetch('/api/ai/process')
      const result = await res.json()
      console.log('API Status:', result)
    } catch (err) {
      console.error('API Test failed:', err)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🤖 AI Platform Testing
        </h2>
        <p className="text-gray-600 mb-6">
          Test the unified AI-Analytics platform capabilities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Button 
          onClick={testAPI}
          variant="outline"
          className="w-full"
        >
          Test API Status
        </Button>
        
        <Button 
          onClick={() => testAI('AI')}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Processing...' : 'Test AI Only'}
        </Button>

        <Button 
          onClick={() => testAI('ANALYTICS')}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Processing...' : 'Test Analytics Only'}
        </Button>

        <Button 
          onClick={() => testAI('HYBRID')}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {loading ? 'Processing...' : 'Test AI + Analytics'}
        </Button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Processing your request...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {response && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ✅ AI Response ({response.data.processingTime}ms) 
            {response.data.cached && ' - Cached'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Insights */}
            <div className="bg-white rounded-md p-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                🧠 AI Insights ({response.data.insights?.length || 0})
              </h4>
              {response.data.insights?.map((insight, idx) => (
                <div key={idx} className="mb-2 p-2 bg-blue-50 rounded">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-gray-600">{insight.description}</p>
                  <p className="text-xs text-blue-600">
                    Confidence: {(insight.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>

            {/* Analytics */}
            <div className="bg-white rounded-md p-4">
              <h4 className="font-semibold text-green-800 mb-2">
                📊 Analytics ({response.data.analytics?.length || 0})
              </h4>
              {response.data.analytics?.map((metric, idx) => (
                <div key={idx} className="mb-2 p-2 bg-green-50 rounded">
                  <p className="font-medium text-sm capitalize">{metric.metric.replace('_', ' ')}</p>
                  <p className="text-lg font-bold text-green-700">{metric.value}</p>
                  <p className="text-xs text-gray-600">
                    Trend: {metric.trend} | Variance: ±{metric.variance}
                  </p>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-md p-4">
              <h4 className="font-semibold text-purple-800 mb-2">
                💡 Recommendations ({response.data.recommendations?.length || 0})
              </h4>
              {response.data.recommendations?.map((rec, idx) => (
                <div key={idx} className="mb-2 p-2 bg-purple-50 rounded">
                  <p className="font-medium text-sm">{rec.title}</p>
                  <p className="text-xs text-gray-600">{rec.description}</p>
                  <p className="text-xs text-purple-600">
                    ROI: {rec.roi}x | Type: {rec.type}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Response (for debugging) */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              🔍 View Raw Response
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}