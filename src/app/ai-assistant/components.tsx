import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { ProactiveAIAssistant } from '@/components/ai/ProactiveAIAssistant'
import { AITaskSuggestions } from '@/components/ai/AITaskSuggestions'
import { AIDocumentUpload } from '@/components/ai/AIDocumentUpload'
import { AIEmailCategorizer } from '@/components/ai/AIEmailCategorizer'

interface AIStats {
  documentsProcessed: number
  tasksGenerated: number
  emailsCategorized: number
  insightsProvided: number
  timeSaved: string
}

export const AIStatsGrid = ({ stats }: { stats: AIStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Documents Processed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-blue-600">{stats.documentsProcessed}</div>
        <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Tasks Generated</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-green-600">{stats.tasksGenerated}</div>
        <p className="text-xs text-gray-500 mt-1">Auto-created from analysis</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Emails Categorized</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-purple-600">{stats.emailsCategorized}</div>
        <p className="text-xs text-gray-500 mt-1">Intelligent sorting</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Insights Provided</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-yellow-600">{stats.insightsProvided}</div>
        <p className="text-xs text-gray-500 mt-1">Actionable recommendations</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Time Saved</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-red-600">{stats.timeSaved}</div>
        <p className="text-xs text-gray-500 mt-1">Through automation</p>
      </CardContent>
    </Card>
  </div>
)

export const TabNavigation = ({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: string
  onTabChange: (tab: string) => void 
}) => {
  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'insights', name: 'Insights', icon: '💡' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'tasks', name: 'Tasks', icon: '✅' },
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'showcase', name: 'Showcase', icon: '🎯' }
  ]

  return (
    <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-md transition-colors text-sm font-medium
            ${activeTab === tab.id 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'}
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.name}</span>
        </button>
      ))}
    </div>
  )
}

export const OverviewTab = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🤖</span>
            <span>AI Assistant</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProactiveAIAssistant />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📋</span>
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-blue-900">Document Analysis Complete</p>
                  <p className="text-sm text-blue-700">GST Return filed analyzed</p>
                </div>
              </div>
              <Badge variant="outline">5 min ago</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-green-900">Task Created</p>
                  <p className="text-sm text-green-700">Review TDS calculation</p>
                </div>
              </div>
              <Badge variant="outline">12 min ago</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
)

export const InsightsTab = () => (
  <Card>
    <CardHeader>
      <CardTitle>AI Insights & Analytics</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center py-16">
        <div className="text-6xl mb-4">💡</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI Insights Coming Soon</h3>
        <p className="text-gray-600">Advanced analytics and recommendations will be available here.</p>
      </div>
    </CardContent>
  </Card>
)

export const DocumentsTab = () => (
  <Card>
    <CardHeader>
      <CardTitle>Document Processing</CardTitle>
    </CardHeader>
    <CardContent>
      <AIDocumentUpload onDocumentAnalyzed={() => {}} />
    </CardContent>
  </Card>
)

export const TasksTab = () => (
  <Card>
    <CardHeader>
      <CardTitle>AI Task Suggestions</CardTitle>
    </CardHeader>
    <CardContent>
      <AITaskSuggestions />
    </CardContent>
  </Card>
)

export const EmailTab = () => (
  <Card>
    <CardHeader>
      <CardTitle>Email Categorization</CardTitle>
    </CardHeader>
    <CardContent>
      <AIEmailCategorizer onEmailCategorized={() => {}} />
    </CardContent>
  </Card>
)

export const ShowcaseTab = () => (
  <Card>
    <CardHeader>
      <CardTitle>AI Showcase</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI Capabilities Showcase</h3>
        <p className="text-gray-600">Interactive demos and feature highlights coming soon.</p>
      </div>
    </CardContent>
  </Card>
)