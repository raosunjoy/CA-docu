/**
 * Compliance Dashboard Component
 * Provides comprehensive compliance monitoring and reporting interface
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Alert } from '@/components/common/Alert'

interface ComplianceMetrics {
  organizationId: string
  overallComplianceScore: number
  frameworkScores: Record<string, number>
  requirementsSummary: {
    total: number
    compliant: number
    nonCompliant: number
    partiallyCompliant: number
    underReview: number
  }
  riskDistribution: Record<string, number>
  findingsSummary: {
    total: number
    open: number
    inProgress: number
    resolved: number
  }
  trendsData: Array<{
    period: string
    score: number
    findings: number
  }>
  upcomingDeadlines: Array<{
    requirementId: string
    title: string
    dueDate: string
    riskLevel: string
  }>
  lastAssessment: string
  nextAssessment: string
}

interface ComplianceFramework {
  id: string
  name: string
  description: string
  mandatory: boolean
  applicableRegions: string[]
}

interface RegulatoryChange {
  id: string
  framework: string
  title: string
  description: string
  effectiveDate: string
  impact: string
  affectedRequirements: string[]
  source: string
  url: string
}

interface ComplianceDashboardProps {
  className?: string
}

export function ComplianceDashboard({ className = '' }: ComplianceDashboardProps) {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([])
  const [regulatoryChanges, setRegulatoryChanges] = useState<RegulatoryChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFramework, setSelectedFramework] = useState<string>('')
  const [showAssessmentModal, setShowAssessmentModal] = useState(false)

  // Load dashboard data
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load metrics
      const metricsResponse = await fetch('/api/compliance?action=metrics')
      const metricsData = await metricsResponse.json()

      if (!metricsData.success) {
        throw new Error(metricsData.error || 'Failed to load compliance metrics')
      }

      setMetrics(metricsData.data)

      // Load frameworks
      const frameworksResponse = await fetch('/api/compliance?action=frameworks')
      const frameworksData = await frameworksResponse.json()

      if (!frameworksData.success) {
        throw new Error(frameworksData.error || 'Failed to load frameworks')
      }

      setFrameworks(frameworksData.data.frameworks)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance data')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadData()
  }, [])

  // Perform compliance assessment
  const handlePerformAssessment = async (framework: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assess',
          framework,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to perform assessment')
      }

      setShowAssessmentModal(false)
      await loadData()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform assessment')
    } finally {
      setLoading(false)
    }
  }

  // Monitor regulatory changes
  const handleMonitorChanges = async () => {
    try {
      setLoading(true)
      setError(null)

      const mandatoryFrameworks = frameworks
        .filter(f => f.mandatory)
        .map(f => f.id)

      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitor_changes',
          frameworks: mandatoryFrameworks,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to monitor regulatory changes')
      }

      setRegulatoryChanges(data.data.changes)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to monitor regulatory changes')
    } finally {
      setLoading(false)
    }
  }

  // Get compliance score color
  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    if (score >= 50) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  // Get risk level color
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get impact color
  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Calculate days until deadline
  const getDaysUntilDeadline = (dateString: string) => {
    const deadline = new Date(dateString)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={loadData} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setShowAssessmentModal(true)} disabled={loading}>
            Run Assessment
          </Button>
          <Button variant="outline" onClick={handleMonitorChanges} disabled={loading}>
            Monitor Changes
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Loading State */}
      {loading && !metrics && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Compliance Overview */}
      {metrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overall Score</p>
                  <div className="flex items-center">
                    <span className={`text-2xl font-bold px-3 py-1 rounded-full ${getComplianceScoreColor(metrics.overallComplianceScore)}`}>
                      {metrics.overallComplianceScore}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Compliant</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.requirementsSummary.compliant}/{metrics.requirementsSummary.total}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Open Findings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.findingsSummary.open}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Upcoming Deadlines</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.upcomingDeadlines.length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Framework Scores */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Framework Compliance Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(metrics.frameworkScores).map(([framework, score]) => (
                <div key={framework} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">{framework}</h4>
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getComplianceScoreColor(score)}`}>
                      {score}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 90 ? 'bg-green-500' :
                        score >= 70 ? 'bg-yellow-500' :
                        score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          {metrics.upcomingDeadlines.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Compliance Deadlines</h3>
              <div className="space-y-3">
                {metrics.upcomingDeadlines.slice(0, 5).map((deadline) => {
                  const daysUntil = getDaysUntilDeadline(deadline.dueDate)
                  return (
                    <div key={deadline.requirementId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{deadline.title}</h4>
                        <p className="text-sm text-gray-600">Due: {formatDate(deadline.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(deadline.riskLevel)}`}>
                          {deadline.riskLevel}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          daysUntil <= 7 ? 'bg-red-100 text-red-800' :
                          daysUntil <= 30 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {daysUntil > 0 ? `${daysUntil} days` : 'Overdue'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Requirements Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.requirementsSummary.compliant}
                </div>
                <div className="text-sm text-gray-600">Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.requirementsSummary.partiallyCompliant}
                </div>
                <div className="text-sm text-gray-600">Partially Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {metrics.requirementsSummary.nonCompliant}
                </div>
                <div className="text-sm text-gray-600">Non-Compliant</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.requirementsSummary.underReview}
                </div>
                <div className="text-sm text-gray-600">Under Review</div>
              </div>
            </div>
          </Card>

          {/* Compliance Trends */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Trends</h3>
            <div className="space-y-4">
              {metrics.trendsData.map((trend, index) => (
                <div key={trend.period} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 w-20">
                      {trend.period}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Score: {trend.score}%</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getComplianceScoreColor(trend.score).includes('green') ? 'bg-green-500' : 
                              getComplianceScoreColor(trend.score).includes('yellow') ? 'bg-yellow-500' :
                              getComplianceScoreColor(trend.score).includes('orange') ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${trend.score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {trend.findings} findings
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Regulatory Changes */}
      {regulatoryChanges.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Regulatory Changes</h3>
          <div className="space-y-4">
            {regulatoryChanges.map((change) => (
              <div key={change.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{change.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{change.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {change.framework}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(change.impact)}`}>
                      {change.impact} impact
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Effective: {formatDate(change.effectiveDate)}</span>
                  <span>Source: {change.source}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Run Compliance Assessment</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssessmentModal(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Framework
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedFramework}
                    onChange={(e) => setSelectedFramework(e.target.value)}
                  >
                    <option value="">Choose a framework...</option>
                    {frameworks.map((framework) => (
                      <option key={framework.id} value={framework.id}>
                        {framework.name} {framework.mandatory && '(Mandatory)'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedFramework && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Assessment Information</p>
                        <p className="text-sm text-blue-700">
                          {frameworks.find(f => f.id === selectedFramework)?.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowAssessmentModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handlePerformAssessment(selectedFramework)}
                    disabled={loading || !selectedFramework}
                  >
                    {loading ? 'Running...' : 'Run Assessment'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComplianceDashboard