'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../../common/Card'
import type { DashboardMetrics, KPIData, AnalyticsData } from '../../../types'

interface PartnerDashboardProps {
  organizationId: string
  userId: string
  className?: string
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({
  organizationId,
  userId,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [kpis, setKpis] = useState<KPIData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [organizationId, userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [metricsResponse, kpisResponse] = await Promise.all([
        fetch(`/api/dashboard/metrics?organizationId=${organizationId}&role=PARTNER`),
        fetch(`/api/dashboard/kpis?organizationId=${organizationId}&role=PARTNER`)
      ])

      if (!metricsResponse.ok || !kpisResponse.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const metricsData = await metricsResponse.json()
      const kpisData = await kpisResponse.json()

      setMetrics(metricsData.data)
      setKpis(kpisData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`partner-dashboard ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`partner-dashboard ${className}`}>
        <Card className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className={`partner-dashboard ${className}`}>
      {/* Firm-wide KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <FirmWideMetricsCard
          title="Total Revenue"
          value="₹2.4M"
          change="+12.5%"
          trend="up"
          icon="currency"
        />
        <FirmWideMetricsCard
          title="Active Clients"
          value={metrics?.activeClients || 0}
          change="+8.2%"
          trend="up"
          icon="users"
        />
        <FirmWideMetricsCard
          title="Compliance Score"
          value={`${metrics?.complianceScore || 0}%`}
          change="+2.1%"
          trend="up"
          icon="shield"
        />
        <FirmWideMetricsCard
          title="Team Utilization"
          value={`${metrics?.teamUtilization || 0}%`}
          change="-1.3%"
          trend="down"
          icon="clock"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Status */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Status</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Details
            </button>
          </div>
          <ComplianceStatusWidget metrics={metrics} />
        </Card>

        {/* Risk Assessment */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              metrics?.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
              metrics?.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
              metrics?.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {metrics?.riskLevel || 'LOW'} RISK
            </span>
          </div>
          <RiskAssessmentWidget metrics={metrics} />
        </Card>

        {/* Team Performance */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
            <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
            </select>
          </div>
          <TeamPerformanceWidget metrics={metrics} />
        </Card>

        {/* Financial Overview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Reports
            </button>
          </div>
          <FinancialOverviewWidget />
        </Card>

        {/* Client Engagement */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Client Engagement</h3>
            <div className="flex space-x-2">
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Export
              </button>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
          </div>
          <ClientEngagementWidget metrics={metrics} />
        </Card>
      </div>
    </div>
  )
}

// Firm-wide Metrics Card Component
interface FirmWideMetricsCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: 'currency' | 'users' | 'shield' | 'clock'
}

const FirmWideMetricsCard: React.FC<FirmWideMetricsCardProps> = ({
  title,
  value,
  change,
  trend,
  icon
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'currency':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        )
      case 'users':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        )
      case 'shield':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        )
      case 'clock':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center text-white">
            {getIcon()}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 
                'text-gray-500'
              }`}>
                {trend === 'up' && (
                  <svg className="self-center flex-shrink-0 h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {trend === 'down' && (
                  <svg className="self-center flex-shrink-0 h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="sr-only">{trend === 'up' ? 'Increased' : trend === 'down' ? 'Decreased' : 'Unchanged'} by</span>
                {change}
              </div>
            </dd>
          </dl>
        </div>
      </div>
    </Card>
  )
}

// Compliance Status Widget
const ComplianceStatusWidget: React.FC<{ metrics: DashboardMetrics | null }> = ({ metrics }) => {
  const complianceItems = [
    { name: 'GST Returns', status: 'completed', dueDate: '2024-01-20', progress: 100 },
    { name: 'Income Tax Filings', status: 'in-progress', dueDate: '2024-01-31', progress: 75 },
    { name: 'Audit Reports', status: 'pending', dueDate: '2024-02-15', progress: 30 },
    { name: 'ROC Filings', status: 'completed', dueDate: '2024-01-10', progress: 100 },
  ]

  return (
    <div className="space-y-4">
      {complianceItems.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              item.status === 'completed' ? 'bg-green-500' :
              item.status === 'in-progress' ? 'bg-yellow-500' :
              'bg-red-500'
            }`}></div>
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-sm text-gray-500">Due: {item.dueDate}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'in-progress' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${item.progress}%` }}
              ></div>
            </div>
            <span className="text-sm font-medium text-gray-900">{item.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Risk Assessment Widget
const RiskAssessmentWidget: React.FC<{ metrics: DashboardMetrics | null }> = ({ metrics }) => {
  const riskFactors = [
    { name: 'Compliance Deadlines', level: 'low', score: 85 },
    { name: 'Client Satisfaction', level: 'medium', score: 72 },
    { name: 'Staff Workload', level: 'low', score: 88 },
    { name: 'Financial Health', level: 'low', score: 92 },
  ]

  return (
    <div className="space-y-4">
      {riskFactors.map((factor, index) => (
        <div key={index} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{factor.name}</p>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                factor.level === 'low' ? 'bg-green-100 text-green-800' :
                factor.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {factor.level.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">{factor.score}/100</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Team Performance Widget
const TeamPerformanceWidget: React.FC<{ metrics: DashboardMetrics | null }> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{metrics?.teamSize || 0}</div>
          <div className="text-sm text-gray-500">Team Members</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{metrics?.activeMembers || 0}</div>
          <div className="text-sm text-gray-500">Active This Week</div>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Team Utilization</span>
          <span className="text-sm font-medium text-gray-900">{metrics?.teamUtilization || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${metrics?.teamUtilization || 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

// Financial Overview Widget
const FinancialOverviewWidget: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Monthly Revenue</span>
        <span className="text-lg font-bold text-green-600">₹2.4M</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Outstanding</span>
        <span className="text-lg font-bold text-orange-600">₹450K</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Expenses</span>
        <span className="text-lg font-bold text-red-600">₹1.2M</span>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Net Profit</span>
          <span className="text-xl font-bold text-blue-600">₹1.2M</span>
        </div>
      </div>
    </div>
  )
}

// Client Engagement Widget
const ClientEngagementWidget: React.FC<{ metrics: DashboardMetrics | null }> = ({ metrics }) => {
  const engagements = [
    { client: 'ABC Corp', type: 'Audit', progress: 85, status: 'on-track' },
    { client: 'XYZ Ltd', type: 'Tax Filing', progress: 60, status: 'delayed' },
    { client: 'PQR Industries', type: 'Compliance', progress: 95, status: 'on-track' },
    { client: 'LMN Enterprises', type: 'Consultation', progress: 40, status: 'on-track' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Progress
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {engagements.map((engagement, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {engagement.client}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {engagement.type}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${engagement.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-900">{engagement.progress}%</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  engagement.status === 'on-track' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {engagement.status === 'on-track' ? 'On Track' : 'Delayed'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}