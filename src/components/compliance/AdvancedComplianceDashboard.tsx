'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Settings,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
  Eye,
  Bell,
  Download,
  RefreshCw,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Calendar,
  Building,
  Scale
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Area, AreaChart } from 'recharts'

interface ComplianceRule {
  id: string
  name: string
  description: string
  ruleType: string
  category: string
  regulation: string
  jurisdiction: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  isActive: boolean
  metadata: {
    applicableTo: string[]
    effectiveDate: Date
    lastUpdated: Date
    version: string
    tags: string[]
  }
}

interface ComplianceViolation {
  id: string
  ruleId: string
  ruleName: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
  entityType: string
  entityId: string
  violationType: string
  description: string
  detectedAt: Date
  assignedTo?: string
  resolvedAt?: Date
  impact: {
    level: string
    description: string
    affectedAreas: string[]
    potentialConsequences: string[]
    reputationalRisk: string
    regulatoryRisk: string
  }
}

interface ComplianceAnalytics {
  summary: {
    totalViolations: number
    openViolations: number
    resolvedViolations: number
    complianceScore: number
    trendDirection: 'IMPROVING' | 'STABLE' | 'DECLINING'
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
  violationsByCategory: Array<{
    category: string
    count: number
    severity: string
  }>
  violationsBySeverity: Array<{
    severity: string
    count: number
    percentage: number
  }>
  topRiskAreas: Array<{
    area: string
    riskScore: number
    violationCount: number
    trend: string
  }>
  complianceTrends: Array<{
    date: Date
    violationCount: number
    complianceScore: number
    resolvedCount: number
  }>
  recommendations: Array<{
    id: string
    title: string
    description: string
    priority: string
    impact: string
    effort: string
  }>
  regulatoryUpdates: Array<{
    regulation: string
    update: string
    impact: string
    actionRequired: boolean
    deadline?: Date
  }>
}

const AdvancedComplianceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [analytics, setAnalytics] = useState<ComplianceAnalytics | null>(null)
  const [rules, setRules] = useState<ComplianceRule[]>([])
  const [violations, setViolations] = useState<ComplianceViolation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const [selectedSeverity, setSelectedSeverity] = useState('ALL')
  const [isMonitoring, setIsMonitoring] = useState(true)

  useEffect(() => {
    loadComplianceData()
  }, [selectedTimeframe, selectedSeverity])

  const loadComplianceData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load analytics
      const analyticsResponse = await fetch(`/api/compliance?action=get_analytics&timeframe=${selectedTimeframe}&severity=${selectedSeverity}`)
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData.analytics)
      }

      // Load rules
      const rulesResponse = await fetch('/api/compliance?action=get_rules&isActive=true')
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json()
        setRules(rulesData.rules || [])
      }

      // Load violations
      const violationsResponse = await fetch(`/api/compliance?action=get_violations&status=OPEN,INVESTIGATING&severity=${selectedSeverity}`)
      if (violationsResponse.ok) {
        const violationsData = await violationsResponse.json()
        setViolations(violationsData.violations || [])
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load compliance data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRunAssessment = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'perform_assessment',
          assessmentType: 'FULL_AUDIT',
          scope: {
            regulations: ['SOX', 'GDPR', 'ICAI'],
            departments: ['FINANCE', 'IT', 'OPERATIONS'],
            processes: ['FINANCIAL_REPORTING', 'DATA_MANAGEMENT', 'DOCUMENT_RETENTION']
          },
          priority: 'HIGH'
        })
      })

      if (response.ok) {
        await loadComplianceData()
      } else {
        throw new Error('Assessment failed')
      }
    } catch (error) {
      setError('Failed to run compliance assessment')
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      case 'HIGH': return 'text-orange-600 bg-orange-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'LOW': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'text-green-600 bg-green-50'
      case 'INVESTIGATING': return 'text-blue-600 bg-blue-50'
      case 'OPEN': return 'text-red-600 bg-red-50'
      case 'FALSE_POSITIVE': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'LOW': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const chartColors = ['#dc2626', '#ea580c', '#d97706', '#059669', '#0891b2']

  if (isLoading && !analytics) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Compliance Intelligence Dashboard</h1>
            <p className="text-gray-600">Real-time compliance monitoring and risk assessment</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadComplianceData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleRunAssessment} disabled={isLoading}>
            <Play className="h-4 w-4 mr-2" />
            Run Assessment
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold">{analytics.summary.complianceScore}%</p>
                </div>
                <div className={`p-2 rounded-full ${getRiskLevelColor(analytics.summary.riskLevel)}`}>
                  <Shield className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={analytics.summary.complianceScore} className="h-2" />
                <div className="flex items-center mt-2 text-sm">
                  {analytics.summary.trendDirection === 'IMPROVING' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : analytics.summary.trendDirection === 'DECLINING' ? (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  ) : (
                    <Activity className="h-4 w-4 text-gray-600 mr-1" />
                  )}
                  <span className={
                    analytics.summary.trendDirection === 'IMPROVING' ? 'text-green-600' :
                    analytics.summary.trendDirection === 'DECLINING' ? 'text-red-600' : 'text-gray-600'
                  }>
                    {analytics.summary.trendDirection}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Violations</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.summary.openViolations}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.summary.totalViolations} total violations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved This Month</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.summary.resolvedViolations}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((analytics.summary.resolvedViolations / analytics.summary.totalViolations) * 100)}% resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Risk Level</p>
                  <p className={`text-2xl font-bold ${getRiskLevelColor(analytics.summary.riskLevel)}`}>
                    {analytics.summary.riskLevel}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${analytics.summary.riskLevel === 'CRITICAL' ? 'bg-red-100' : 
                                                     analytics.summary.riskLevel === 'HIGH' ? 'bg-orange-100' :
                                                     analytics.summary.riskLevel === 'MEDIUM' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  <Target className={`h-6 w-6 ${getRiskLevelColor(analytics.summary.riskLevel)}`} />
                </div>
              </div>
              <div className="flex items-center mt-2">
                {isMonitoring ? (
                  <div className="flex items-center text-green-600 text-sm">
                    <Activity className="h-4 w-4 mr-1" />
                    <span>Monitoring Active</span>
                  </div>
                ) : (
                  <div className="flex items-center text-gray-600 text-sm">
                    <Pause className="h-4 w-4 mr-1" />
                    <span>Monitoring Paused</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {analytics && (
            <>
              {/* Compliance Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Compliance Trends</span>
                  </CardTitle>
                  <CardDescription>Compliance score and violation trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analytics.complianceTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        formatter={(value, name) => [
                          name === 'complianceScore' ? `${value}%` : value,
                          name === 'complianceScore' ? 'Compliance Score' : 
                          name === 'violationCount' ? 'Violations' : 'Resolved'
                        ]}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="complianceScore" 
                        stroke="#059669" 
                        fill="#059669" 
                        fillOpacity={0.2}
                      />
                      <Line yAxisId="right" type="monotone" dataKey="violationCount" stroke="#dc2626" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="resolvedCount" stroke="#2563eb" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Violations by Severity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <PieChart className="h-5 w-5" />
                      <span>Violations by Severity</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Tooltip formatter={(value, name) => [`${value} (${name})`, 'Violations']} />
                        <RechartsPieChart 
                          data={analytics.violationsBySeverity} 
                          cx="50%" 
                          cy="50%" 
                          outerRadius={80} 
                          dataKey="count"
                        >
                          {analytics.violationsBySeverity.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </RechartsPieChart>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {analytics.violationsBySeverity.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          <span className="text-sm">{item.severity}: {item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Risk Areas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Top Risk Areas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.topRiskAreas.slice(0, 5).map((area, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{area.area}</span>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{area.violationCount} violations</Badge>
                              {area.trend === 'UP' ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : area.trend === 'DOWN' ? (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              ) : (
                                <Activity className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Progress value={area.riskScore * 100} className="flex-1 h-2" />
                            <span className="text-sm font-medium">{Math.round(area.riskScore * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Regulatory Updates */}
              {analytics.regulatoryUpdates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Recent Regulatory Updates</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.regulatoryUpdates.map((update, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{update.regulation}</h4>
                              <p className="text-sm text-gray-600">{update.update}</p>
                            </div>
                            {update.actionRequired && (
                              <Badge variant="destructive">Action Required</Badge>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Impact:</span> {update.impact}
                          </div>
                          {update.deadline && (
                            <div className="text-sm text-orange-600 mt-1">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              Deadline: {new Date(update.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="violations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Active Violations</h3>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {violations.map((violation) => (
              <Card key={violation.id} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{violation.ruleName}</h4>
                        <Badge className={getSeverityColor(violation.severity)}>
                          {violation.severity}
                        </Badge>
                        <Badge className={getStatusColor(violation.status)}>
                          {violation.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{violation.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Entity:</span>
                      <p className="text-gray-600">{violation.entityType} ({violation.entityId})</p>
                    </div>
                    <div>
                      <span className="font-medium">Detected:</span>
                      <p className="text-gray-600">{new Date(violation.detectedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Assigned to:</span>
                      <p className="text-gray-600">{violation.assignedTo || 'Unassigned'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-sm">Impact:</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">Affected Areas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {violation.impact.affectedAreas.map((area, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">{area}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Risk Assessment:</span>
                        <div className="flex space-x-4 mt-1">
                          <span>Regulatory: {violation.impact.regulatoryRisk}</span>
                          <span>Reputational: {violation.impact.reputationalRisk}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {violations.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Violations</h3>
                <p className="text-gray-600">Great! All compliance requirements are currently being met.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Compliance Rules</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{rule.name}</h4>
                        <Badge className={getSeverityColor(rule.severity)}>
                          {rule.severity}
                        </Badge>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{rule.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Category:</span>
                      <p className="text-gray-600">{rule.category}</p>
                    </div>
                    <div>
                      <span className="font-medium">Regulation:</span>
                      <p className="text-gray-600">{rule.regulation}</p>
                    </div>
                    <div>
                      <span className="font-medium">Jurisdiction:</span>
                      <p className="text-gray-600">{rule.jurisdiction}</p>
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>
                      <p className="text-gray-600">{new Date(rule.metadata.lastUpdated).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-sm">Applicable To:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.metadata.applicableTo.map((item, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{item}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="font-medium text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {rules.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Rules Configured</h3>
                <p className="text-gray-600">Start by adding compliance rules to monitor your organization.</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Rule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Violations by Category</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.violationsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.recommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">{rec.title}</h4>
                            <div className="flex space-x-1">
                              <Badge variant={rec.priority === 'HIGH' ? 'destructive' : 'default'} className="text-xs">
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{rec.impact}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{rec.description}</p>
                          <div className="mt-2 text-xs text-gray-500">
                            Effort: {rec.effort}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Health Score</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {analytics.summary.complianceScore}%
                      </div>
                      <Progress value={analytics.summary.complianceScore} className="h-4" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="font-semibold text-green-600">{analytics.summary.resolvedViolations}</div>
                        <div className="text-gray-600">Resolved</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="font-semibold text-red-600">{analytics.summary.openViolations}</div>
                        <div className="text-gray-600">Open Issues</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Real-time Monitoring</span>
                <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                  {isMonitoring ? 'Active' : 'Paused'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Continuous compliance monitoring across all systems and processes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="font-medium">System Status</p>
                    <p className="text-sm text-gray-600">
                      {isMonitoring ? 'All monitoring systems operational' : 'Monitoring is paused'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  variant={isMonitoring ? 'destructive' : 'default'}
                >
                  {isMonitoring ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Monitoring
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Monitoring
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Document Compliance</span>
                    </div>
                    <div className="text-2xl font-bold">98.5%</div>
                    <div className="text-sm text-green-600">+2.3% from last month</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Access Control</span>
                    </div>
                    <div className="text-2xl font-bold">100%</div>
                    <div className="text-sm text-green-600">All systems compliant</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Building className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Process Adherence</span>
                    </div>
                    <div className="text-2xl font-bold">94.2%</div>
                    <div className="text-sm text-orange-600">2 process violations</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Critical Violations</p>
                        <p className="text-sm text-gray-600">Immediate alerts for critical compliance issues</p>
                      </div>
                      <Badge variant="destructive">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Daily Summary Reports</p>
                        <p className="text-sm text-gray-600">Daily compliance status summary</p>
                      </div>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Regulatory Updates</p>
                        <p className="text-sm text-gray-600">Notifications about new regulations</p>
                      </div>
                      <Badge variant="secondary">Disabled</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Compliance Report</h3>
                <p className="text-sm text-gray-600 mb-4">Comprehensive compliance status report</p>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Audit Trail</h3>
                <p className="text-sm text-gray-600 mb-4">Detailed audit trail for compliance activities</p>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Audit Trail
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Risk Assessment</h3>
                <p className="text-sm text-gray-600 mb-4">Complete risk assessment and mitigation plan</p>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Assessment
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Schedule</CardTitle>
              <CardDescription>Configure automated report generation and distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Weekly Compliance Summary</option>
                      <option>Monthly Risk Report</option>
                      <option>Quarterly Audit Report</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Frequency</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Quarterly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipients</label>
                    <input 
                      type="email" 
                      placeholder="Enter email addresses"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdvancedComplianceDashboard