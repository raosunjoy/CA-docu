'use client'

import React, { useState } from 'react'
import { Card } from '../../components/atoms/Card'
import { AIEnhancedChart } from '../../components/charts/AIEnhancedChart'
import { DocumentAnalyticsDashboard } from '../../components/dashboard/DocumentAnalyticsDashboard'
import { 
  Sparkles, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Users, 
  Target,
  Zap,
  Eye,
  Settings
} from 'lucide-react'

// eslint-disable-next-line max-lines-per-function
export default function AIVisualizationDemo() {
  const [selectedDemo, setSelectedDemo] = useState<string>('chart-intelligence')
  const [selectedDataset, setSelectedDataset] = useState<string>('revenue')

  // Sample datasets for demonstration
  const datasets = {
    revenue: {
      name: 'Revenue Trends',
      data: [
        { month: 'Jan', revenue: 125000, profit: 25000, clients: 45 },
        { month: 'Feb', revenue: 142000, profit: 28000, clients: 52 },
        { month: 'Mar', revenue: 158000, profit: 32000, clients: 48 },
        { month: 'Apr', revenue: 175000, profit: 38000, clients: 61 },
        { month: 'May', revenue: 192000, profit: 42000, clients: 58 },
        { month: 'Jun', revenue: 208000, profit: 47000, clients: 67 }
      ],
      context: {
        purpose: 'trend' as const,
        audience: 'executive' as const,
        emphasis: 'impact' as const,
        title: 'Monthly Revenue Performance'
      }
    },
    compliance: {
      name: 'Compliance Metrics',
      data: [
        { department: 'Tax Services', compliance: 92, tasks: 234, overdue: 8 },
        { department: 'Audit', compliance: 88, tasks: 189, overdue: 12 },
        { department: 'Legal', compliance: 95, tasks: 156, overdue: 3 },
        { department: 'Advisory', compliance: 87, tasks: 124, overdue: 15 },
        { department: 'Payroll', compliance: 94, tasks: 98, overdue: 6 }
      ],
      context: {
        purpose: 'comparison' as const,
        audience: 'manager' as const,
        emphasis: 'accuracy' as const,
        title: 'Department Compliance Scores'
      }
    },
    clientDistribution: {
      name: 'Client Portfolio',
      data: [
        { segment: 'Enterprise', count: 23, revenue: 850000 },
        { segment: 'Mid-Market', count: 67, revenue: 620000 },
        { segment: 'Small Business', count: 145, revenue: 380000 },
        { segment: 'Individual', count: 298, revenue: 120000 }
      ],
      context: {
        purpose: 'composition' as const,
        audience: 'client' as const,
        emphasis: 'clarity' as const,
        title: 'Client Portfolio Distribution'
      }
    },
    performance: {
      name: 'Team Performance',
      data: [
        { team: 'Senior Associates', productivity: 87, utilization: 92, satisfaction: 4.2 },
        { team: 'Associates', productivity: 82, utilization: 88, satisfaction: 3.9 },
        { team: 'Specialists', productivity: 91, utilization: 94, satisfaction: 4.4 },
        { team: 'Managers', productivity: 79, utilization: 85, satisfaction: 4.1 },
        { team: 'Partners', productivity: 85, utilization: 78, satisfaction: 4.6 }
      ],
      context: {
        purpose: 'performance' as const,
        audience: 'manager' as const,
        emphasis: 'detail' as const,
        title: 'Team Performance Metrics'
      }
    }
  }

  const demoSections = [
    {
      id: 'chart-intelligence',
      title: 'AI Chart Intelligence',
      description: 'AI-powered chart type selection and optimization',
      icon: Sparkles
    },
    {
      id: 'document-analytics',
      title: 'Document Analytics Dashboard',
      description: 'Comprehensive document intelligence insights',
      icon: FileText
    },
    {
      id: 'data-exploration',
      title: 'Interactive Data Exploration',
      description: 'AI-guided data visualization exploration',
      icon: Eye
    },
    {
      id: 'insights-generation',
      title: 'Automated Insights',
      description: 'AI-generated business insights from data',
      icon: Target
    }
  ]

  // eslint-disable-next-line max-lines-per-function
  const renderChartIntelligenceDemo = () => {
    const currentDataset = datasets[selectedDataset as keyof typeof datasets]
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">AI Chart Intelligence</h3>
            <p className="text-gray-600 mt-1">
              Watch AI automatically select the optimal chart type and configuration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(datasets).map(([key, dataset]) => (
                <option key={key} value={key}>{dataset.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI-Enhanced Chart */}
          <Card className="p-6">
            <div className="mb-4">
              <div className="flex items-center">
                <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="text-lg font-semibold">AI-Enhanced Chart</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                AI selects optimal chart type and provides insights
              </p>
            </div>
            <AIEnhancedChart
              data={currentDataset.data}
              context={currentDataset.context}
              height={300}
              enableAI={true}
              showInsights={true}
              showRecommendations={true}
              allowChartTypeChange={true}
              organizationId="demo-org"
            />
          </Card>

          {/* Traditional Chart Comparison */}
          <Card className="p-6">
            <div className="mb-4">
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
                <h4 className="text-lg font-semibold">Traditional Chart</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Standard chart without AI enhancement
              </p>
            </div>
            <AIEnhancedChart
              data={currentDataset.data}
              context={currentDataset.context}
              height={300}
              enableAI={false}
              showInsights={false}
              showRecommendations={false}
              allowChartTypeChange={false}
            />
          </Card>
        </div>

        {/* Features Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center mb-2">
              <Zap className="w-5 h-5 text-blue-600 mr-2" />
              <h5 className="font-medium text-blue-900">Smart Selection</h5>
            </div>
            <p className="text-sm text-blue-700">
              AI analyzes your data structure and automatically selects the optimal chart type
            </p>
          </Card>

          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center mb-2">
              <Eye className="w-5 h-5 text-green-600 mr-2" />
              <h5 className="font-medium text-green-900">Color Optimization</h5>
            </div>
            <p className="text-sm text-green-700">
              Colors are automatically optimized for accessibility and semantic meaning
            </p>
          </Card>

          <Card className="p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center mb-2">
              <Target className="w-5 h-5 text-purple-600 mr-2" />
              <h5 className="font-medium text-purple-900">Instant Insights</h5>
            </div>
            <p className="text-sm text-purple-700">
              Get AI-generated insights and annotations highlighting key trends
            </p>
          </Card>
        </div>
      </div>
    )
  }

  const renderDocumentAnalyticsDemo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Document Analytics Dashboard</h3>
        <p className="text-gray-600 mt-1">
          Comprehensive analytics for document intelligence and processing
        </p>
      </div>

      <DocumentAnalyticsDashboard
        organizationId="demo-org"
        userId="demo-user"
        role="manager"
        timeRange="month"
      />
    </div>
  )

  const renderDataExplorationDemo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Interactive Data Exploration</h3>
        <p className="text-gray-600 mt-1">
          AI-guided exploration of complex datasets with intelligent recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(datasets).map(([key, dataset]) => (
          <Card key={key} className="p-6">
            <AIEnhancedChart
              data={dataset.data}
              context={dataset.context}
              height={250}
              enableAI={true}
              showInsights={true}
              allowChartTypeChange={true}
              organizationId="demo-org"
            />
          </Card>
        ))}
      </div>
    </div>
  )

  const renderInsightsGenerationDemo = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Automated Business Insights</h3>
        <p className="text-gray-600 mt-1">
          AI analyzes your data and generates actionable business insights automatically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIEnhancedChart
            data={datasets.revenue.data}
            context={datasets.revenue.context}
            height={400}
            enableAI={true}
            showInsights={true}
            showRecommendations={true}
            allowChartTypeChange={true}
            organizationId="demo-org"
          />
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">AI-Generated Insights</h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <TrendingUp className="w-4 h-4 text-green-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Revenue Growth</p>
                  <p className="text-xs text-gray-600">67% increase over 6 months</p>
                </div>
              </div>
              <div className="flex items-start">
                <Users className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Client Acquisition</p>
                  <p className="text-xs text-gray-600">Best month: June with 67 clients</p>
                </div>
              </div>
              <div className="flex items-start">
                <Target className="w-4 h-4 text-purple-600 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Profit Margin</p>
                  <p className="text-xs text-gray-600">Improved from 20% to 23%</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Recommendations</h4>
            <div className="space-y-2">
              <div className="p-2 bg-blue-50 rounded text-xs">
                <p className="font-medium text-blue-900">Scale Successful Strategies</p>
                <p className="text-blue-700">June&apos;s client acquisition tactics should be replicated</p>
              </div>
              <div className="p-2 bg-green-50 rounded text-xs">
                <p className="font-medium text-green-900">Optimize Resources</p>
                <p className="text-green-700">Current growth trajectory suggests need for capacity expansion</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderDemoContent = () => {
    switch (selectedDemo) {
      case 'chart-intelligence':
        return renderChartIntelligenceDemo()
      case 'document-analytics':
        return renderDocumentAnalyticsDemo()
      case 'data-exploration':
        return renderDataExplorationDemo()
      case 'insights-generation':
        return renderInsightsGenerationDemo()
      default:
        return renderChartIntelligenceDemo()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Sparkles className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">AI-Enhanced Data Visualization</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl">
            Experience the next generation of business intelligence with AI-powered chart selection, 
            automated insights, and intelligent data exploration designed specifically for CA firms.
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {demoSections.map(({ id, title, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedDemo(id)}
                className={`flex items-center px-4 py-3 rounded-lg text-left transition-all ${
                  selectedDemo === id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <div>
                  <div className="font-medium">{title}</div>
                  <div className={`text-xs mt-1 ${
                    selectedDemo === id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderDemoContent()}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <Settings className="w-4 h-4 mr-2" />
            <span className="text-sm">
              This demo showcases AI capabilities built into the Zetra platform
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}