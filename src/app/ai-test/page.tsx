// AI Test Page - Your First AI Platform Test
import { AITestComponent } from '@/components/ai/AITestComponent'

export default function AITestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            🚀 Unified AI-Analytics Platform Testing
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Test and validate your AI-powered analytics capabilities
          </p>
          <p className="mt-1 text-sm text-gray-500">
            This is your development playground for the unified AI platform
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <AITestComponent />
          
          {/* Add more test components as we build them */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              🛠️ Next Steps
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ AI Orchestrator Service - Ready for testing</p>
              <p>⚠️ OpenAI Integration - Add your API key</p>
              <p>⚠️ Vector Database - Configure ChromaDB</p>
              <p>⚠️ Analytics Engine - Implement data processing</p>
              <p>⚠️ Document AI - Connect Azure Cognitive Services</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'AI Platform Testing | Zetra',
  description: 'Test and validate AI-powered analytics capabilities'
}