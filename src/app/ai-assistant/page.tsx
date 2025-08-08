'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  AIStatsGrid, 
  TabNavigation, 
  OverviewTab, 
  InsightsTab, 
  DocumentsTab, 
  TasksTab, 
  EmailTab, 
  ShowcaseTab 
} from './components'

interface AIStats {
  documentsProcessed: number
  tasksGenerated: number
  emailsCategorized: number
  insightsProvided: number
  timeSaved: string
}

export default function AIAssistantPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [aiStats, setAIStats] = useState<AIStats>({
    documentsProcessed: 0,
    tasksGenerated: 0,
    emailsCategorized: 0,
    insightsProvided: 0,
    timeSaved: '0h'
  })

  useEffect(() => {
    loadAIStats()
  }, [])

  const loadAIStats = async () => {
    // Mock AI statistics - in production this would come from analytics
    setAIStats({
      documentsProcessed: 247,
      tasksGenerated: 89,
      emailsCategorized: 156,
      insightsProvided: 42,
      timeSaved: '24h'
    })
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />
      case 'insights':
        return <InsightsTab />
      case 'documents':
        return <DocumentsTab />
      case 'tasks':
        return <TasksTab />
      case 'email':
        return <EmailTab />
      case 'showcase':
        return <ShowcaseTab />
      default:
        return <OverviewTab />
    }
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Assistant</h3>
          <p className="text-gray-600">Please log in to access AI features</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-gray-600 mt-1">
              Intelligent automation for CA workflows
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Powered by</span>
            <span className="font-semibold text-blue-600">GPT-4</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <AIStatsGrid stats={aiStats} />
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        {renderTabContent()}
      </div>
    </div>
  )
}