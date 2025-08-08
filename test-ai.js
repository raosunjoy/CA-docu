// Simple AI Test Script
console.log('🚀 Testing AI Orchestrator Service...')

// Test the AI orchestrator directly
import { aiOrchestrator } from './src/services/ai-orchestrator.ts'

async function testAIService() {
  try {
    const testRequest = {
      id: 'test-001',
      type: 'AI',
      priority: 'HIGH',
      data: {
        document: 'Sample financial report for Q3 2024',
        metrics: {
          revenue: 125000,
          expenses: 87000,
          clients: 45
        }
      },
      context: {
        userRole: 'MANAGER',
        businessContext: 'quarterly_review',
        dataContext: {},
        preferences: {
          insightLevel: 'ADVANCED',
          preferredFormat: 'DETAILED',
          autoEnableAI: true,
          cachePreferences: true
        }
      },
      userId: 'test-user-123',
      timestamp: new Date()
    }

    console.log('Processing AI request...')
    const response = await aiOrchestrator.processUnifiedRequest(testRequest)
    
    console.log('✅ AI Service Test Results:')
    console.log('Response ID:', response.id)
    console.log('Processing Time:', response.processingTime + 'ms')
    console.log('Insights:', response.insights.length)
    console.log('Analytics:', response.analytics.length)
    console.log('Recommendations:', response.recommendations.length)
    console.log('Confidence:', (response.confidence * 100).toFixed(1) + '%')
    
    console.log('\n🎯 Sample Insight:', response.insights[0])
    console.log('\n📊 Sample Analytics:', response.analytics[0])
    console.log('\n💡 Sample Recommendation:', response.recommendations[0])
    
    console.log('\n🎉 AI Service is working correctly!')
    
  } catch (error) {
    console.error('❌ AI Service Test Failed:', error.message)
  }
}

testAIService()