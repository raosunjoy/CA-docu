'use client'

import { AITestComponent } from '@/components/ai/AITestComponent'
import { AIInsightsWidget } from '@/components/ai/AIInsightsWidget'

// eslint-disable-next-line max-lines-per-function
export default function AIShowcasePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 AI Platform Showcase
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore the unified AI-Analytics platform for CA firms. Experience document processing, 
            predictive analytics, and intelligent insights powered by OpenAI and comprehensive data analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Partner Level Insights */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>👨‍💼</span>
              <span>Partner Insights</span>
            </h2>
            <AIInsightsWidget userRole="PARTNER" />
          </div>

          {/* Manager Level Insights */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>👩‍💼</span>
              <span>Manager Insights</span>
            </h2>
            <AIInsightsWidget userRole="MANAGER" />
          </div>

          {/* Associate Level Insights */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>👨‍💻</span>
              <span>Associate Insights</span>
            </h2>
            <AIInsightsWidget userRole="ASSOCIATE" />
          </div>
        </div>

        {/* Compact Widgets Row */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 Compact Widget Views</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AIInsightsWidget userRole="PARTNER" compact />
            <AIInsightsWidget userRole="MANAGER" compact />
            <AIInsightsWidget userRole="ASSOCIATE" compact />
            <AIInsightsWidget userRole="INTERN" compact />
          </div>
        </div>

        {/* Full AI Testing Interface */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🧪 AI Platform Testing Interface</h2>
          <AITestComponent />
        </div>

        {/* Feature Highlights */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">✨ Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">📄 Document Intelligence</h3>
              <p className="text-sm text-blue-800">
                AI-powered document analysis with entity extraction, risk detection, and compliance checks
              </p>
              <div className="mt-2 text-xs text-blue-600">
                ✓ Entity Recognition • ✓ Risk Analysis • ✓ Recommendations
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">📊 Advanced Analytics</h3>
              <p className="text-sm text-green-800">
                Comprehensive performance metrics with predictive insights and benchmarking
              </p>
              <div className="mt-2 text-xs text-green-600">
                ✓ Real-time Metrics • ✓ Trend Analysis • ✓ Predictions
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-2">🤖 Conversational AI</h3>
              <p className="text-sm text-purple-800">
                Role-based AI assistant for strategic guidance, compliance, and operational support
              </p>
              <div className="mt-2 text-xs text-purple-600">
                ✓ Role-Based Responses • ✓ Context Awareness • ✓ Expert Knowledge
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-medium text-orange-900 mb-2">🔄 Hybrid Processing</h3>
              <p className="text-sm text-orange-800">
                Combines AI insights with analytics for comprehensive business intelligence
              </p>
              <div className="mt-2 text-xs text-orange-600">
                ✓ Unified Insights • ✓ Cross-Platform Data • ✓ Strategic Planning
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-medium text-red-900 mb-2">⚡ Real-time Performance</h3>
              <p className="text-sm text-red-800">
                Fast processing with intelligent caching and optimized data pipelines
              </p>
              <div className="mt-2 text-xs text-red-600">
                ✓ Sub-second Response • ✓ Smart Caching • ✓ Scalable Architecture
              </div>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-medium text-indigo-900 mb-2">🎯 Actionable Insights</h3>
              <p className="text-sm text-indigo-800">
                AI-generated recommendations with ROI calculations and implementation guidance
              </p>
              <div className="mt-2 text-xs text-indigo-600">
                ✓ ROI Analysis • ✓ Priority Ranking • ✓ Impact Assessment
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 text-center">
          <div className="inline-flex space-x-4">
            <a 
              href="/dashboard" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              📊 View Full Dashboard
            </a>
            <a 
              href="/ai-test" 
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🧪 API Testing Interface
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}