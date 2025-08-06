'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../../common/Card'
import type { DashboardMetrics, WorkloadMetricData } from '../../../types'

interface ManagerDashboardProps {
  organizationId: string
  userId: string
  className?: string
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  organizationId,
  userId,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [teamWorkload, setTeamWorkload] = useState<WorkloadMetricData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [organizationId, userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [metricsResponse, workloadResponse] = await Promise.all([
        fetch(`/api/dashboard/metrics?organizationId=${organizationId}&role=MANAGER`),
        fetch(`/api/dashboard/team-workload?organizationId=${organizationId}&managerId=${userId}`)
      ])

      if (!metricsResponse.ok || !workloadResponse.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const metricsData = await metricsResponse.json()
      const workloadData = await workloadResponse.json()

      setMetrics(metricsData.data)
      setTeamWorkload(workloadData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`manager-dashboard ${className}`}>
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
      <div className={`manager-dashboard ${className}`}>
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
    <div className={`manager-dashboard ${className}`}>
      {/* Team Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <TeamMetricsCard
          title="Team Size"
          value={metrics?.teamSize || 0}
          change="+2"
          trend="up"
          icon="users"
        />
        <TeamMetricsCard
          title="Active Tasks"
          value={metrics?.totalTasks || 0}
          change="+15"
          trend="up"
          icon="tasks"
        />
        <TeamMetricsCard
          title="Completion Rate"
          value={`${metrics?.taskCompletionRate || 0}%`}
          change="+5.2%"
          trend="up"
          icon="check"
        />
        <TeamMetricsCard
          title="Team Utilization"
          value={`${metrics?.teamUtilization || 0}%`}
          change="-2.1%"
          trend="down"
          icon="clock"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Workload Analysis */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Workload Analysis</h3>
            <div className="flex space-x-2">
              <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                <option>This Week</option>
                <option>This Month</option>
                <option>This Quarter</option>
              </select>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Rebalance
              </button>
            </div>
          </div>
          <TeamWorkloadWidget workloadData={teamWorkload} />
        </Card>

        {/* Performance Alerts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Alerts</h3>
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              3 Issues
            </span>
          </div>
          <PerformanceAlertsWidget />
        </Card>

        {/* Task Distribution */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Distribution</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Assign Tasks
            </button>
          </div>
          <TaskDistributionWidget metrics={metrics} />
        </Card>

        {/* Team Productivity Trends */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Team Productivity Trends</h3>
            <div className="flex space-x-2">
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Export
              </button>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
          <ProductivityTrendsWidget />
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
            <div className="flex space-x-2">
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                5 Due Soon
              </span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Calendar
              </button>
            </div>
          </div>
          <UpcomingDeadlinesWidget />
        </Card>
      </div>
    </div>
  )
}

// Team Metrics Card Component
interface TeamMetricsCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: 'users' | 'tasks' | 'check' | 'clock'
}

const TeamMetricsCard: React.FC<TeamMetricsCardProps> = ({
  title,
  value,
  change,
  trend,
  icon
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'users':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        )
      case 'tasks':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )
      case 'check':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

// Team Workload Widget
const TeamWorkloadWidget: React.FC<{ workloadData: WorkloadMetricData[] }> = ({ workloadData }) => {
  const mockWorkloadData = [
    { name: 'Rajesh Kumar', activeTasks: 8, utilizationRate: 85, overdueTasks: 1, completedTasks: 12 },
    { name: 'Priya Sharma', activeTasks: 6, utilizationRate: 72, overdueTasks: 0, completedTasks: 15 },
    { name: 'Amit Patel', activeTasks: 10, utilizationRate: 95, overdueTasks: 2, completedTasks: 8 },
    { name: 'Sneha Gupta', activeTasks: 5, utilizationRate: 68, overdueTasks: 0, completedTasks: 18 },
  ]

  return (
    <div className="space-y-4">
      {mockWorkloadData.map((member, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-medium text-gray-900">{member.name}</p>
              <p className="text-sm text-gray-500">
                {member.activeTasks} active • {member.completedTasks} completed
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{member.utilizationRate}%</div>
              <div className="text-xs text-gray-500">Utilization</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${member.overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {member.overdueTasks}
              </div>
              <div className="text-xs text-gray-500">Overdue</div>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              member.utilizationRate > 90 ? 'bg-red-500' :
              member.utilizationRate > 75 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Performance Alerts Widget
const PerformanceAlertsWidget: React.FC = () => {
  const alerts = [
    { type: 'warning', message: 'Amit Patel has 2 overdue tasks', action: 'Review' },
    { type: 'info', message: 'Team utilization above 90%', action: 'Rebalance' },
    { type: 'error', message: 'Client deadline in 2 days', action: 'Prioritize' },
  ]

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div key={index} className={`p-3 rounded-lg border-l-4 ${
          alert.type === 'error' ? 'bg-red-50 border-red-400' :
          alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
          'bg-blue-50 border-blue-400'
        }`}>
          <div className="flex justify-between items-start">
            <p className={`text-sm ${
              alert.type === 'error' ? 'text-red-800' :
              alert.type === 'warning' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              {alert.message}
            </p>
            <button className={`text-xs font-medium ${
              alert.type === 'error' ? 'text-red-600 hover:text-red-700' :
              alert.type === 'warning' ? 'text-yellow-600 hover:text-yellow-700' :
              'text-blue-600 hover:text-blue-700'
            }`}>
              {alert.action}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Task Distribution Widget
const TaskDistributionWidget: React.FC<{ metrics: DashboardMetrics | null }> = ({ metrics }) => {
  const distribution = [
    { status: 'To Do', count: 15, color: 'bg-gray-500' },
    { status: 'In Progress', count: 23, color: 'bg-blue-500' },
    { status: 'In Review', count: 8, color: 'bg-yellow-500' },
    { status: 'Completed', count: 45, color: 'bg-green-500' },
  ]

  const total = distribution.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-4">
      {distribution.map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
            <span className="text-sm font-medium text-gray-700">{item.status}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">{item.count}</span>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${item.color}`}
                style={{ width: `${(item.count / total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Productivity Trends Widget
const ProductivityTrendsWidget: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-600">↗ 12%</div>
          <div className="text-sm text-gray-500">Task Completion</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">↗ 8%</div>
          <div className="text-sm text-gray-500">Team Efficiency</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">↘ 3%</div>
          <div className="text-sm text-gray-500">Response Time</div>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <p>Team productivity has improved by 12% this month compared to last month.</p>
          <p className="mt-2">Key improvements: Better task distribution and reduced bottlenecks.</p>
        </div>
      </div>
    </div>
  )
}

// Upcoming Deadlines Widget
const UpcomingDeadlinesWidget: React.FC = () => {
  const deadlines = [
    { task: 'GST Return Filing - ABC Corp', assignee: 'Rajesh Kumar', dueDate: '2024-01-25', priority: 'high' },
    { task: 'Audit Report - XYZ Ltd', assignee: 'Priya Sharma', dueDate: '2024-01-28', priority: 'medium' },
    { task: 'Tax Assessment - PQR Inc', assignee: 'Amit Patel', dueDate: '2024-01-30', priority: 'high' },
    { task: 'Compliance Review - LMN Corp', assignee: 'Sneha Gupta', dueDate: '2024-02-02', priority: 'low' },
    { task: 'Financial Statement - DEF Ltd', assignee: 'Rajesh Kumar', dueDate: '2024-02-05', priority: 'medium' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Task
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Priority
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {deadlines.map((deadline, index) => (
            <tr key={index}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{deadline.task}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{deadline.assignee}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{deadline.dueDate}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  deadline.priority === 'high' ? 'bg-red-100 text-red-800' :
                  deadline.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                <button className="text-green-600 hover:text-green-900">Reassign</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}