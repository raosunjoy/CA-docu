// Enhanced AI Test Script
console.log('🚀 Testing Enhanced AI Orchestrator with OpenAI Integration...')

// Test document processing with real AI
async function testDocumentProcessing() {
  try {
    console.log('\n📄 Testing AI Document Processing...')
    
    const response = await fetch('http://localhost:3000/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AI',
        data: {
          document: `FINANCIAL STATEMENT - Q3 2024
            
CLIENT: XYZ Consulting Pvt Ltd
PERIOD: July 1, 2024 - September 30, 2024

REVENUE:
- Consulting Services: ₹325,000
- Tax Advisory: ₹85,000
- Audit Services: ₹195,000
Total Revenue: ₹605,000

EXPENSES:
- Staff Salaries: ₹287,000
- Office Rent: ₹45,000
- Professional Fees: ₹25,000
- Software Licenses: ₹18,000
Total Expenses: ₹375,000

NET PROFIT: ₹230,000

COMPLIANCE ISSUES:
- GST return filing delayed by 10 days for August 2024
- TDS certificates pending for 3 clients
- Annual audit report overdue for client ABC Corp

OPPORTUNITIES:
- 2 new client leads in pipeline
- Expansion to Pune office planned for Q4`,
          documentType: 'FINANCIAL',
          clientName: 'XYZ Consulting Pvt Ltd',
          period: 'Q3 2024'
        },
        userId: 'test-manager-001',
        context: {
          userRole: 'MANAGER',
          businessContext: 'quarterly_financial_review'
        }
      })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Document Processing Test Results:')
      console.log(`- Processing Time: ${result.data.processingTime}ms`)
      console.log(`- Insights Generated: ${result.data.insights.length}`)
      console.log(`- Analytics Points: ${result.data.analytics.length}`)
      console.log(`- Recommendations: ${result.data.recommendations.length}`)
      console.log(`- Confidence Score: ${(result.data.confidence * 100).toFixed(1)}%`)
      
      console.log('\n🧠 Sample AI Insights:')
      result.data.insights.slice(0, 2).forEach((insight, i) => {
        console.log(`${i + 1}. ${insight.title}: ${insight.description}`)
      })
      
      console.log('\n💡 Sample Recommendations:')
      result.data.recommendations.slice(0, 2).forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.title}: ${rec.description}`)
      })
    } else {
      console.error('❌ Document processing failed:', result.error)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Test chat functionality
async function testChatAssistant() {
  try {
    console.log('\n💬 Testing AI Chat Assistant...')
    
    const response = await fetch('http://localhost:3000/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AI',
        data: {
          message: 'What are the key compliance deadlines I should be aware of for a CA firm in India for the next quarter?',
          query: 'compliance deadlines CA firm India Q4 2024'
        },
        userId: 'test-associate-001',
        context: {
          userRole: 'ASSOCIATE',
          businessContext: 'compliance_planning'
        }
      })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Chat Assistant Test Results:')
      console.log(`- Response Time: ${result.data.processingTime}ms`)
      console.log(`- Insights: ${result.data.insights.length}`)
      
      // Look for chat response in results
      if (result.data.results && result.data.results.chatResponse) {
        console.log('\n🤖 AI Assistant Response:')
        console.log(result.data.results.chatResponse.response.substring(0, 200) + '...')
        
        if (result.data.results.chatResponse.suggestions.length > 0) {
          console.log('\n📋 Suggestions:')
          result.data.results.chatResponse.suggestions.forEach((suggestion, i) => {
            console.log(`${i + 1}. ${suggestion}`)
          })
        }
      }
    } else {
      console.error('❌ Chat test failed:', result.error)
    }

  } catch (error) {
    console.error('❌ Chat test failed:', error.message)
  }
}

// Test hybrid processing
async function testHybridProcessing() {
  try {
    console.log('\n🔄 Testing Hybrid AI+Analytics Processing...')
    
    const response = await fetch('http://localhost:3000/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'HYBRID',
        data: {
          document: 'Performance review shows 25% revenue growth but client satisfaction dropped to 3.8/5',
          message: 'Analyze our performance trends and suggest improvements',
          metrics: {
            revenue: 605000,
            expenses: 375000,
            profit_margin: 38.0,
            client_satisfaction: 3.8,
            team_utilization: 82.5,
            compliance_score: 75.0
          }
        },
        userId: 'test-partner-001',
        context: {
          userRole: 'PARTNER',
          businessContext: 'strategic_review'
        }
      })
    })

    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Hybrid Processing Test Results:')
      console.log(`- Processing Time: ${result.data.processingTime}ms`)
      console.log(`- Combined Insights: ${result.data.insights.length}`)
      console.log(`- Analytics Metrics: ${result.data.analytics.length}`)
      console.log(`- Strategic Recommendations: ${result.data.recommendations.length}`)
      
      console.log('\n🎯 Top Strategic Insights:')
      result.data.insights.slice(0, 3).forEach((insight, i) => {
        console.log(`${i + 1}. [${insight.type}] ${insight.title}`)
        console.log(`   → ${insight.description}`)
      })
    } else {
      console.error('❌ Hybrid processing failed:', result.error)
    }

  } catch (error) {
    console.error('❌ Hybrid test failed:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running Complete AI Platform Test Suite...')
  console.log('=' * 60)
  
  await testDocumentProcessing()
  await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause
  
  await testChatAssistant()
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  await testHybridProcessing()
  
  console.log('\n🎉 All AI Platform Tests Complete!')
  console.log('💡 Visit http://localhost:3001/ai-test to test interactively')
}

runAllTests()