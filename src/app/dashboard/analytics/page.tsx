'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { InteractiveAnalyticsExplorer } from '@/components/unified-analytics/InteractiveAnalyticsExplorer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, BarChart, PieChart, KPICard } from '@/components/charts'
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign,
  Calendar,
  FileText,
  AlertTriangle,
  BarChart3,
  Settings,
  Filter,
  Download
} from 'lucide-react'

interface AnalyticsData {
  revenue: { current: number; previous: number; trend: 'up' | 'down' }
  clients: { active: number; new: number; churn: number }
  tasks: { completed: number; pending: number; overdue: number }
  team: { utilization: number; performance: number; satisfaction: number }
  compliance: { score: number; issues: number; deadlines: number }
  trends: Array<{ month: string; revenue: number; clients: number; tasks: number }>
}

interface DataSource {
  id: string
  name: string
  type: string
  status: string
  lastSync?: string
  recordCount?: number
}

interface VisualizationConfig {
  id: string
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'gauge' | 'funnel'
  title: string
  dataSource: string
  config: any
  aiRecommended: boolean
  confidence: number
  insights: string[]
  createdAt: string
  updatedAt: string
}

export default function AdvancedAnalyticsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [visualizations, setVisualizations] = useState<VisualizationConfig[]>([])
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'insights'>('overview')

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Simulate API calls with role-based data
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Mock data sources based on user role
        const mockDataSources: DataSource[] = [
          { 
            id: 'tasks', 
            name: 'Task Management', 
            type: 'operational', 
            status: 'connected',
            lastSync: '2 minutes ago',
            recordCount: 1543
          },
          { 
            id: 'clients', 
            name: 'Client Data', 
            type: 'crm', 
            status: 'connected',
            lastSync: '5 minutes ago',
            recordCount: 287
          },
          { 
            id: 'financial', 
            name: 'Financial Records', 
            type: 'financial', 
            status: user?.role === 'PARTNER' ? 'connected' : 'restricted',
            lastSync: user?.role === 'PARTNER' ? '1 minute ago' : undefined,
            recordCount: user?.role === 'PARTNER' ? 892 : undefined
          },
          { 
            id: 'compliance', 
            name: 'Compliance Tracking', 
            type: 'regulatory', 
            status: ['PARTNER', 'MANAGER'].includes(user?.role || '') ? 'connected' : 'restricted',
            lastSync: ['PARTNER', 'MANAGER'].includes(user?.role || '') ? '3 minutes ago' : undefined,
            recordCount: ['PARTNER', 'MANAGER'].includes(user?.role || '') ? 456 : undefined
          },
          { 
            id: 'email', 
            name: 'Email Analytics', 
            type: 'communication', 
            status: 'connected',
            lastSync: '1 minute ago',
            recordCount: 2341
          }
        ]

        // Mock visualizations with AI recommendations
        const mockVisualizations: VisualizationConfig[] = [
          {
            id: '1',
            type: 'line',
            title: 'Revenue Growth Trend',
            dataSource: 'financial',
            config: {},
            aiRecommended: true,
            confidence: 0.92,
            insights: [
              'Revenue shows 15% YoY growth with strong Q3 performance',
              'Seasonal pattern suggests Q4 will exceed projections by 8%'
            ],
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T15:45:00Z'
          },
          {
            id: '2',
            type: 'pie',
            title: 'Service Mix Distribution',
            dataSource: 'clients',
            config: {},
            aiRecommended: true,
            confidence: 0.87,
            insights: [
              'Tax services dominate at 45% of revenue',
              'Advisory services show highest profitability per client'
            ],
            createdAt: '2024-01-14T14:20:00Z',
            updatedAt: '2024-01-15T09:15:00Z'
          },
          {
            id: '3',
            type: 'bar',
            title: 'Team Productivity Metrics',
            dataSource: 'tasks',
            config: {},
            aiRecommended: false,
            confidence: 0.76,
            insights: [
              'Average task completion time improved by 23%',
              'Associate-level productivity exceeds benchmarks'
            ],
            createdAt: '2024-01-13T11:10:00Z',
            updatedAt: '2024-01-15T08:30:00Z'
          }
        ]

        // Filter visualizations based on user access
        const accessibleVisualizations = mockVisualizations.filter(viz => {
          const source = mockDataSources.find(ds => ds.id === viz.dataSource)
          return source?.status === 'connected'
        })

        // Mock analytics data with role-based access
        const mockData: AnalyticsData = {
          revenue: user?.role === 'PARTNER' ? 
            { current: 2450000, previous: 2180000, trend: 'up' } :
            { current: 0, previous: 0, trend: 'up' }, // Restricted for non-partners
          clients: { 
            active: user?.role === 'INTERN' ? 0 : 287, 
            new: user?.role === 'INTERN' ? 0 : 23, 
            churn: user?.role === 'INTERN' ? 0 : 3 
          },
          tasks: { completed: 156, pending: 43, overdue: 8 },
          team: ['PARTNER', 'MANAGER'].includes(user?.role || '') ? 
            { utilization: 87, performance: 92, satisfaction: 89 } :
            { utilization: 0, performance: 0, satisfaction: 0 }, // Restricted access
          compliance: ['PARTNER', 'MANAGER'].includes(user?.role || '') ?
            { score: 94, issues: 2, deadlines: 5 } :
            { score: 0, issues: 0, deadlines: 0 }, // Restricted access
          trends: user?.role === 'PARTNER' ? [
            { month: 'Jan', revenue: 195000, clients: 45, tasks: 234 },
            { month: 'Feb', revenue: 210000, clients: 52, tasks: 267 },
            { month: 'Mar', revenue: 225000, clients: 58, tasks: 291 },
            { month: 'Apr', revenue: 240000, clients: 61, tasks: 312 },
            { month: 'May', revenue: 235000, clients: 64, tasks: 298 },
            { month: 'Jun', revenue: 260000, clients: 67, tasks: 334 }
          ] : []
        }

        setData(mockData)
        setDataSources(mockDataSources)
        setVisualizations(accessibleVisualizations)
        setSelectedDataSource(mockDataSources[0]?.id || null)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [user?.role])

  const handleVisualizationCreate = (config: Partial<VisualizationConfig>) => {
    const newViz: VisualizationConfig = {
      id: Date.now().toString(),
      type: config.type || 'bar',
      title: config.title || 'New Visualization',
      dataSource: config.dataSource || selectedDataSource || '',
      config: config.config || {},
      aiRecommended: false,
      confidence: 0.5,
      insights: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    setVisualizations(prev => [...prev, newViz])
  }

  const handleVisualizationUpdate = (id: string, updates: Partial<VisualizationConfig>) => {
    setVisualizations(prev => prev.map(viz => 
      viz.id === id ? { ...viz, ...updates, updatedAt: new Date().toISOString() } : viz
    ))
  }

  const handleVisualizationDelete = (id: string) => {
    setVisualizations(prev => prev.filter(viz => viz.id !== id))
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Authentication Required</div>
          <p>Please log in to access analytics</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ Error</div>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600">
            Role-based insights and interactive data exploration for {user.firstName} ({user.role})
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={user.role === 'PARTNER' ? 'success' : user.role === 'MANAGER' ? 'info' : 'secondary'}>
            {user.role} ACCESS
          </Badge>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Access Level Notice */}
      {['INTERN', 'ASSOCIATE'].includes(user.role) && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">Limited Access</h3>
              <p className="text-sm text-amber-800">
                Some analytics features are restricted based on your role. Contact your manager for expanded access.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'explorer', 'insights'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && data && (
        <div className="space-y-6">
          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {user.role === 'PARTNER' && (
              <KPICard
                title="Revenue"
                value={data.revenue.current}
                valueType="currency"
                trend={data.revenue.trend}
                trendPercentage={12.4}
                target={2500000}
                status="good"
                icon={<DollarSign className="w-5 h-5" />}
                description="Monthly recurring revenue"
              />
            )}
            
            {user.role !== 'INTERN' && (
              <KPICard
                title="Active Clients"
                value={data.clients.active}
                valueType="number"
                trend="up"
                trendPercentage={8.1}
                target={300}
                status="good"
                icon={<Users className="w-5 h-5" />}
                description={`${data.clients.new} new this month`}
              />
            )}
            
            <KPICard
              title="Task Completion"
              value={data.tasks.completed}
              valueType="number"
              trend="up"
              trendPercentage={15.2}
              target={200}
              status="good"
              icon={<Target className="w-5 h-5" />}
              description={`${data.tasks.pending} pending, ${data.tasks.overdue} overdue`}
            />
            
            {['PARTNER', 'MANAGER'].includes(user.role) && (
              <KPICard
                title="Compliance Score"
                value={data.compliance.score}
                valueType="percentage"
                trend="up"
                trendPercentage={2.3}
                target={95}
                status="good"
                icon={<FileText className="w-5 h-5" />}
                description={`${data.compliance.issues} issues to resolve`}
              />
            )}
          </div>

          {/* Charts Grid */}
          {user.role === 'PARTNER' && data.trends.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <LineChart
                  data={data.trends}
                  xKey="month"
                  yKeys={['revenue']}
                  title="Revenue Trend"
                  height={300}
                  valueType="currency"
                  showGrid={true}
                />
              </Card>
              
              <Card className="p-6">
                <BarChart
                  data={data.trends}
                  xKey="month"
                  yKeys={['clients']}
                  title="Client Growth"
                  height={300}
                  valueType="number"
                  showGrid={true}
                />
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === 'explorer' && (
        <InteractiveAnalyticsExplorer
          dataSources={dataSources}
          selectedDataSource={selectedDataSource}
          visualizations={visualizations}
          onVisualizationCreate={handleVisualizationCreate}
          onVisualizationUpdate={handleVisualizationUpdate}
          onVisualizationDelete={handleVisualizationDelete}
          isLoading={loading}
        />
      )}

      {activeTab === 'insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              AI-Powered Insights
            </h3>
            <div className="space-y-4">
              {visualizations
                .filter(viz => viz.aiRecommended && viz.insights.length > 0)
                .map(viz => (
                  <div key={viz.id} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">{viz.title}</h4>
                    {viz.insights.map((insight, index) => (
                      <p key={index} className="text-sm text-gray-600 mt-1">
                        {insight}
                      </p>
                    ))}
                    <div className="mt-2">
                      <Badge variant="purple" size="sm">
                        {Math.round(viz.confidence * 100)}% Confidence
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Sources Status</h3>
            <div className="space-y-3">
              {dataSources.map(source => (
                <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{source.name}</div>
                    <div className="text-sm text-gray-500">
                      {source.status === 'connected' ? (
                        <>
                          <span className="text-green-600">● Connected</span>
                          {source.lastSync && ` • Last sync: ${source.lastSync}`}
                          {source.recordCount && ` • ${source.recordCount.toLocaleString()} records`}
                        </>
                      ) : (
                        <span className="text-red-600">● Restricted Access</span>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={source.status === 'connected' ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {source.type}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}