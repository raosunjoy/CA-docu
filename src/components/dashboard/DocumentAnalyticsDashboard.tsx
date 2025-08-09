'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3,
  FileCheck,
  FileX,
  Zap,
  Users,
  Calendar,
  Filter
} from 'lucide-react'
import { Card } from '../atoms/Card'
import { Button } from '../atoms/Button'
import { BarChart, LineChart, DonutChart, KPICard } from '../charts'

interface DocumentAnalyticsData {
  overview: {
    totalDocuments: number
    processedDocuments: number
    pendingProcessing: number
    failedProcessing: number
    averageProcessingTime: number
    totalStorage: string
    documentGrowthRate: number
    qualityScore: number
  }
  processingMetrics: {
    hourlyProcessing: Array<{
      hour: string
      processed: number
      failed: number
      average_time: number
    }>
    dailyTrend: Array<{
      date: string
      documents: number
      processing_time: number
      quality_score: number
    }>
    weeklyAnalytics: Array<{
      week: string
      volume: number
      success_rate: number
      efficiency: number
    }>
  }
  categoryDistribution: Array<{
    category: string
    count: number
    percentage: number
    average_quality: number
  }>
  qualityAnalytics: {
    qualityDistribution: Array<{
      range: string
      count: number
      percentage: number
    }>
    qualityTrends: Array<{
      date: string
      average_quality: number
      documents_processed: number
    }>
    lowQualityDocuments: Array<{
      id: string
      name: string
      type: string
      quality_score: number
      issues: string[]
    }>
  }
  workflowAnalytics: {
    activeWorkflows: number
    triggeredWorkflows: number
    completedWorkflows: number
    averageWorkflowTime: number
    workflowSuccess: Array<{
      workflow: string
      success_rate: number
      average_time: number
      triggers: number
    }>
    bottlenecks: Array<{
      step: string
      average_time: number
      failure_rate: number
      documents_affected: number
    }>
  }
  userActivity: {
    uploaders: Array<{
      user: string
      documents: number
      success_rate: number
      average_quality: number
    }>
    departments: Array<{
      department: string
      documents: number
      processing_time: number
      quality_score: number
    }>
  }
  complianceInsights: {
    complianceScore: number
    regulatoryDocuments: number
    complianceGaps: number
    upcomingDeadlines: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    auditReadiness: number
  }
}

interface DocumentAnalyticsDashboardProps {
  organizationId: string
  userId?: string
  role?: string
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  className?: string
}

export const DocumentAnalyticsDashboard: React.FC<DocumentAnalyticsDashboardProps> = ({
  organizationId,
  userId,
  role,
  timeRange = 'month',
  className = ''
}) => {
  const [data, setData] = useState<DocumentAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'processing' | 'quality' | 'workflows' | 'compliance'>('overview')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDocumentAnalytics()
  }, [organizationId, timeRange, filterCategory])

  const fetchDocumentAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Mock comprehensive document analytics data
      const mockData: DocumentAnalyticsData = {
        overview: {
          totalDocuments: 1247,
          processedDocuments: 1198,
          pendingProcessing: 32,
          failedProcessing: 17,
          averageProcessingTime: 4.2,
          totalStorage: '2.8 GB',
          documentGrowthRate: 12.5,
          qualityScore: 87.3
        },
        processingMetrics: {
          hourlyProcessing: [
            { hour: '09:00', processed: 45, failed: 2, average_time: 3.8 },
            { hour: '10:00', processed: 62, failed: 1, average_time: 4.1 },
            { hour: '11:00', processed: 78, failed: 3, average_time: 4.5 },
            { hour: '12:00', processed: 58, failed: 1, average_time: 3.9 },
            { hour: '13:00', processed: 42, failed: 0, average_time: 3.2 },
            { hour: '14:00', processed: 67, failed: 2, average_time: 4.3 },
            { hour: '15:00', processed: 85, failed: 4, average_time: 5.1 },
            { hour: '16:00', processed: 71, failed: 2, average_time: 4.2 },
            { hour: '17:00', processed: 54, failed: 1, average_time: 3.7 }
          ],
          dailyTrend: [
            { date: '2025-01-01', documents: 234, processing_time: 4.1, quality_score: 86.5 },
            { date: '2025-01-02', documents: 189, processing_time: 3.8, quality_score: 88.2 },
            { date: '2025-01-03', documents: 267, processing_time: 4.5, quality_score: 85.9 },
            { date: '2025-01-04', documents: 298, processing_time: 4.8, quality_score: 87.1 },
            { date: '2025-01-05', documents: 201, processing_time: 3.6, quality_score: 89.3 },
            { date: '2025-01-06', documents: 156, processing_time: 3.2, quality_score: 90.1 },
            { date: '2025-01-07', documents: 178, processing_time: 3.4, quality_score: 88.7 }
          ],
          weeklyAnalytics: [
            { week: 'Week 1', volume: 1523, success_rate: 96.2, efficiency: 88.5 },
            { week: 'Week 2', volume: 1689, success_rate: 95.8, efficiency: 89.1 },
            { week: 'Week 3', volume: 1434, success_rate: 97.1, efficiency: 91.2 },
            { week: 'Week 4', volume: 1567, success_rate: 96.5, efficiency: 87.9 }
          ]
        },
        categoryDistribution: [
          { category: 'Financial', count: 467, percentage: 37.5, average_quality: 89.2 },
          { category: 'Tax', count: 298, percentage: 23.9, average_quality: 91.5 },
          { category: 'Legal', count: 187, percentage: 15.0, average_quality: 85.7 },
          { category: 'Compliance', count: 156, percentage: 12.5, average_quality: 92.1 },
          { category: 'Audit', count: 89, percentage: 7.1, average_quality: 88.9 },
          { category: 'Other', count: 50, percentage: 4.0, average_quality: 82.3 }
        ],
        qualityAnalytics: {
          qualityDistribution: [
            { range: '90-100%', count: 523, percentage: 41.9 },
            { range: '80-89%', count: 467, percentage: 37.5 },
            { range: '70-79%', count: 189, percentage: 15.2 },
            { range: '60-69%', count: 45, percentage: 3.6 },
            { range: '<60%', count: 23, percentage: 1.8 }
          ],
          qualityTrends: [
            { date: '2025-01-01', average_quality: 86.5, documents_processed: 234 },
            { date: '2025-01-02', average_quality: 88.2, documents_processed: 189 },
            { date: '2025-01-03', average_quality: 85.9, documents_processed: 267 },
            { date: '2025-01-04', average_quality: 87.1, documents_processed: 298 },
            { date: '2025-01-05', average_quality: 89.3, documents_processed: 201 },
            { date: '2025-01-06', average_quality: 90.1, documents_processed: 156 },
            { date: '2025-01-07', average_quality: 88.7, documents_processed: 178 }
          ],
          lowQualityDocuments: [
            { id: 'doc_001', name: 'Bank Statement.pdf', type: 'Financial', quality_score: 45.2, issues: ['Poor scan quality', 'Missing pages', 'Incomplete data'] },
            { id: 'doc_002', name: 'Invoice_draft.pdf', type: 'Financial', quality_score: 52.1, issues: ['Blurry text', 'Wrong format'] },
            { id: 'doc_003', name: 'Contract.docx', type: 'Legal', quality_score: 38.7, issues: ['Corrupted file', 'Unreadable content'] }
          ]
        },
        workflowAnalytics: {
          activeWorkflows: 23,
          triggeredWorkflows: 156,
          completedWorkflows: 142,
          averageWorkflowTime: 6.7,
          workflowSuccess: [
            { workflow: 'Invoice Processing', success_rate: 94.2, average_time: 5.8, triggers: 234 },
            { workflow: 'Compliance Check', success_rate: 97.8, average_time: 8.2, triggers: 89 },
            { workflow: 'Audit Preparation', success_rate: 91.5, average_time: 12.1, triggers: 45 },
            { workflow: 'Tax Filing', success_rate: 96.3, average_time: 7.5, triggers: 167 }
          ],
          bottlenecks: [
            { step: 'Manual Review', average_time: 18.5, failure_rate: 8.2, documents_affected: 89 },
            { step: 'Approval Process', average_time: 12.3, failure_rate: 5.1, documents_affected: 156 },
            { step: 'Data Validation', average_time: 6.7, failure_rate: 12.5, documents_affected: 234 }
          ]
        },
        userActivity: {
          uploaders: [
            { user: 'John Doe', documents: 234, success_rate: 96.8, average_quality: 89.5 },
            { user: 'Jane Smith', documents: 189, success_rate: 94.2, average_quality: 87.3 },
            { user: 'Mike Johnson', documents: 167, success_rate: 97.6, average_quality: 91.1 },
            { user: 'Sarah Wilson', documents: 134, success_rate: 93.7, average_quality: 86.9 }
          ],
          departments: [
            { department: 'Accounting', documents: 456, processing_time: 4.2, quality_score: 88.9 },
            { department: 'Tax Services', documents: 398, processing_time: 5.1, quality_score: 90.3 },
            { department: 'Legal', documents: 234, processing_time: 6.8, quality_score: 85.7 },
            { department: 'Audit', documents: 159, processing_time: 8.2, quality_score: 87.5 }
          ]
        },
        complianceInsights: {
          complianceScore: 92.5,
          regulatoryDocuments: 298,
          complianceGaps: 7,
          upcomingDeadlines: 12,
          riskLevel: 'low',
          auditReadiness: 89.2
        }
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      setData(mockData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document analytics')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchDocumentAnalytics()
    setRefreshing(false)
  }

  const viewOptions = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'processing', label: 'Processing', icon: Zap },
    { id: 'quality', label: 'Quality', icon: FileCheck },
    { id: 'workflows', label: 'Workflows', icon: Users },
    { id: 'compliance', label: 'Compliance', icon: CheckCircle }
  ]

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'financial', label: 'Financial' },
    { value: 'tax', label: 'Tax' },
    { value: 'legal', label: 'Legal' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'audit', label: 'Audit' }
  ]

  const renderOverviewView = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Documents"
          value={data?.overview.totalDocuments || 0}
          valueType="number"
          trend="up"
          trendPercentage={data?.overview.documentGrowthRate || 0}
          status="good"
          description="Documents managed"
          className="bg-blue-50 border-blue-200"
        />
        <KPICard
          title="Processing Success"
          value={data ? ((data.overview.processedDocuments / data.overview.totalDocuments) * 100) : 0}
          valueType="percentage"
          trend="up"
          trendPercentage={2.1}
          status="good"
          description="Successfully processed"
          className="bg-green-50 border-green-200"
        />
        <KPICard
          title="Quality Score"
          value={data?.overview.qualityScore || 0}
          valueType="percentage"
          trend="up"
          trendPercentage={1.8}
          status="good"
          description="Average document quality"
          className="bg-purple-50 border-purple-200"
        />
        <KPICard
          title="Avg Processing Time"
          value={data?.overview.averageProcessingTime || 0}
          valueType="number"
          unit="min"
          trend="down"
          trendPercentage={5.2}
          status="good"
          description="Per document"
          className="bg-orange-50 border-orange-200"
        />
      </div>

      {/* Processing Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Processing Status</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-600">Real-time</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-gray-900">Processed</span>
              </div>
              <span className="font-semibold text-green-600">{data?.overview.processedDocuments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-gray-900">Pending</span>
              </div>
              <span className="font-semibold text-yellow-600">{data?.overview.pendingProcessing || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileX className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-gray-900">Failed</span>
              </div>
              <span className="font-semibold text-red-600">{data?.overview.failedProcessing || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <DonutChart
            data={data?.categoryDistribution || []}
            title="Document Categories"
            height={200}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={true}
          />
        </Card>
      </div>

      {/* Daily Processing Trend */}
      <Card className="p-6">
        <LineChart
          data={data?.processingMetrics.dailyTrend || []}
          xKey="date"
          yKeys={['documents', 'processing_time']}
          title="Daily Processing Trend"
          height={300}
          loading={loading}
          error={error}
          valueType="mixed"
          showLegend={true}
        />
      </Card>
    </div>
  )

  const renderProcessingView = () => (
    <div className="space-y-6">
      {/* Processing Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">{data?.processingMetrics.weeklyAnalytics.reduce((sum, week) => sum + week.volume, 0) || 0}</div>
              <div className="text-sm text-blue-600">Weekly Volume</div>
            </div>
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">
                {data ? (data.processingMetrics.weeklyAnalytics.reduce((sum, week) => sum + week.success_rate, 0) / data.processingMetrics.weeklyAnalytics.length).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-green-600">Success Rate</div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-900">
                {data ? (data.processingMetrics.weeklyAnalytics.reduce((sum, week) => sum + week.efficiency, 0) / data.processingMetrics.weeklyAnalytics.length).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-yellow-600">Efficiency</div>
            </div>
            <TrendingUp className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-900">{data?.workflowAnalytics.activeWorkflows || 0}</div>
              <div className="text-sm text-purple-600">Active Workflows</div>
            </div>
            <Zap className="w-6 h-6 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Hourly Processing and Weekly Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <BarChart
            data={data?.processingMetrics.hourlyProcessing || []}
            xKey="hour"
            yKeys={['processed', 'failed']}
            title="Hourly Processing Volume"
            height={250}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={true}
          />
        </Card>

        <Card className="p-6">
          <BarChart
            data={data?.processingMetrics.weeklyAnalytics || []}
            xKey="week"
            yKeys={['volume']}
            title="Weekly Processing Volume"
            height={250}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={false}
          />
        </Card>
      </div>
    </div>
  )

  const renderQualityView = () => (
    <div className="space-y-6">
      {/* Quality Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">{data?.overview.qualityScore.toFixed(1) || 0}%</div>
              <div className="text-sm text-green-600">Avg Quality</div>
            </div>
            <FileCheck className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">{data?.qualityAnalytics.qualityDistribution.find(q => q.range === '90-100%')?.count || 0}</div>
              <div className="text-sm text-blue-600">High Quality</div>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-900">
                {data?.qualityAnalytics.qualityDistribution.find(q => q.range === '70-79%')?.count || 0}
              </div>
              <div className="text-sm text-yellow-600">Medium Quality</div>
            </div>
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-900">{data?.qualityAnalytics.lowQualityDocuments.length || 0}</div>
              <div className="text-sm text-red-600">Needs Review</div>
            </div>
            <FileX className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* Quality Distribution and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <DonutChart
            data={data?.qualityAnalytics.qualityDistribution || []}
            title="Quality Score Distribution"
            height={250}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={true}
          />
        </Card>

        <Card className="p-6">
          <LineChart
            data={data?.qualityAnalytics.qualityTrends || []}
            xKey="date"
            yKeys={['average_quality']}
            title="Quality Score Trends"
            height={250}
            loading={loading}
            error={error}
            valueType="percentage"
            showLegend={false}
          />
        </Card>
      </div>

      {/* Low Quality Documents Alert */}
      {data && data.qualityAnalytics.lowQualityDocuments.length > 0 && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-900">Documents Requiring Attention</h3>
          </div>
          <div className="space-y-3">
            {data.qualityAnalytics.lowQualityDocuments.map((doc) => (
              <div key={doc.id} className="bg-white p-4 rounded border border-red-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
                  <span className="text-sm px-2 py-1 bg-red-100 text-red-800 rounded">
                    {doc.quality_score.toFixed(1)}% Quality
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">{doc.type}</div>
                <div className="flex flex-wrap gap-1">
                  {doc.issues.map((issue, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {issue}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  const renderWorkflowsView = () => (
    <div className="space-y-6">
      {/* Workflow Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">{data?.workflowAnalytics.activeWorkflows || 0}</div>
              <div className="text-sm text-blue-600">Active</div>
            </div>
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">{data?.workflowAnalytics.completedWorkflows || 0}</div>
              <div className="text-sm text-green-600">Completed</div>
            </div>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-900">{data?.workflowAnalytics.triggeredWorkflows || 0}</div>
              <div className="text-sm text-yellow-600">Triggered</div>
            </div>
            <Zap className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-900">{data?.workflowAnalytics.averageWorkflowTime.toFixed(1) || 0}h</div>
              <div className="text-sm text-purple-600">Avg Time</div>
            </div>
            <Clock className="w-6 h-6 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Workflow Success Rates */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Performance</h3>
        <div className="space-y-4">
          {data?.workflowAnalytics.workflowSuccess.map((workflow, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{workflow.workflow}</div>
                <div className="text-sm text-gray-500">{workflow.triggers} triggers this month</div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{workflow.success_rate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{workflow.average_time.toFixed(1)}h</div>
                  <div className="text-xs text-gray-500">Avg Time</div>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${workflow.success_rate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Bottlenecks */}
      {data && data.workflowAnalytics.bottlenecks.length > 0 && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-900">Process Bottlenecks</h3>
          </div>
          <div className="space-y-3">
            {data.workflowAnalytics.bottlenecks.map((bottleneck, index) => (
              <div key={index} className="bg-white p-4 rounded border border-yellow-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{bottleneck.step}</h4>
                  <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                    {bottleneck.average_time.toFixed(1)}h avg
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>Failure Rate: {bottleneck.failure_rate.toFixed(1)}%</div>
                  <div>Documents Affected: {bottleneck.documents_affected}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  const renderComplianceView = () => (
    <div className="space-y-6">
      {/* Compliance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${
          (data?.complianceInsights.complianceScore || 0) >= 90 
            ? 'bg-green-50 border-green-200' 
            : (data?.complianceInsights.complianceScore || 0) >= 80 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-2xl font-bold ${
                (data?.complianceInsights.complianceScore || 0) >= 90 
                  ? 'text-green-900' 
                  : (data?.complianceInsights.complianceScore || 0) >= 80 
                  ? 'text-yellow-900' 
                  : 'text-red-900'
              }`}>
                {data?.complianceInsights.complianceScore.toFixed(1) || 0}%
              </div>
              <div className={`text-sm ${
                (data?.complianceInsights.complianceScore || 0) >= 90 
                  ? 'text-green-600' 
                  : (data?.complianceInsights.complianceScore || 0) >= 80 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                Compliance Score
              </div>
            </div>
            <CheckCircle className={`w-6 h-6 ${
              (data?.complianceInsights.complianceScore || 0) >= 90 
                ? 'text-green-500' 
                : (data?.complianceInsights.complianceScore || 0) >= 80 
                ? 'text-yellow-500' 
                : 'text-red-500'
            }`} />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">{data?.complianceInsights.regulatoryDocuments || 0}</div>
              <div className="text-sm text-blue-600">Regulatory Docs</div>
            </div>
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-900">{data?.complianceInsights.complianceGaps || 0}</div>
              <div className="text-sm text-red-600">Gaps Found</div>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-900">{data?.complianceInsights.upcomingDeadlines || 0}</div>
              <div className="text-sm text-yellow-600">Upcoming Deadlines</div>
            </div>
            <Calendar className="w-6 h-6 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            data?.complianceInsights.riskLevel === 'low' 
              ? 'bg-green-100 text-green-800'
              : data?.complianceInsights.riskLevel === 'medium'
              ? 'bg-yellow-100 text-yellow-800'
              : data?.complianceInsights.riskLevel === 'high'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {data?.complianceInsights.riskLevel?.toUpperCase() || 'UNKNOWN'} RISK
          </span>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-2">Audit Readiness</div>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                <div
                  className="h-3 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${data?.complianceInsights.auditReadiness || 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{data?.complianceInsights.auditReadiness.toFixed(1) || 0}%</span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Document Compliance</div>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                <div
                  className="h-3 rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${data?.complianceInsights.complianceScore || 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{data?.complianceInsights.complianceScore.toFixed(1) || 0}%</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  if (loading && !data) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading document analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-red-600 mb-2">Failed to load analytics</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          <Button onClick={fetchDocumentAnalytics} className="px-4 py-2">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
            Document Analytics Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into document processing and intelligence
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <div className="flex items-center">
            <Filter className="w-4 h-4 text-gray-500 mr-2" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            className="px-3 py-1 text-sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* View Navigation */}
      <div className="flex flex-wrap gap-2">
        {viewOptions.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedView(id as any)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4 mr-2" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverviewView()}
      {selectedView === 'processing' && renderProcessingView()}
      {selectedView === 'quality' && renderQualityView()}
      {selectedView === 'workflows' && renderWorkflowsView()}
      {selectedView === 'compliance' && renderComplianceView()}
    </div>
  )
}