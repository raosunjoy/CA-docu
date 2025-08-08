import React, { useState, useEffect } from 'react'
import { BarChart, PieChart, KPICard } from '../../charts'
import type { DashboardWidgetConfig } from '../../../types'

interface TaskOverviewData {
  tasksByStatus: Array<{ name: string; value: number }>
  tasksByPriority: Array<{ name: string; value: number }>
  completionRate: number
  totalTasks: number
  overdueTasks: number
  upcomingDeadlines: number
}

interface TaskOverviewWidgetProps {
  config: DashboardWidgetConfig
  organizationId?: string
  userId?: string
}

export const TaskOverviewWidget: React.FC<TaskOverviewWidgetProps> = ({ 
  config, 
  organizationId,
  userId 
}) => {
  const [data, setData] = useState<TaskOverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTaskOverview = async () => {
      try {
        setLoading(true)
        setError(null)

        // Mock data for now - in real implementation, this would fetch from API
        const mockData: TaskOverviewData = {
          tasksByStatus: [
            { name: 'Completed', value: 45 },
            { name: 'In Progress', value: 23 },
            { name: 'Pending', value: 18 },
            { name: 'Overdue', value: 8 },
            { name: 'On Hold', value: 6 }
          ],
          tasksByPriority: [
            { name: 'High', value: 15 },
            { name: 'Medium', value: 35 },
            { name: 'Low', value: 25 },
            { name: 'Critical', value: 8 }
          ],
          completionRate: 78.5,
          totalTasks: 156,
          overdueTasks: 12,
          upcomingDeadlines: 8
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        setData(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task overview')
      } finally {
        setLoading(false)
      }
    }

    fetchTaskOverview()
  }, [organizationId, userId])

  if (config.size === 'small') {
    return (
      <div className="h-full">
        <KPICard
          title="Task Completion Rate"
          value={data?.completionRate || 0}
          target={85}
          valueType="percentage"
          trend="up"
          trendPercentage={5.2}
          status={data && data.completionRate >= 80 ? 'good' : 'warning'}
          description={`${data?.totalTasks || 0} total tasks, ${data?.overdueTasks || 0} overdue`}
          loading={loading}
          className="h-full"
        />
      </div>
    )
  }

  return (
    <div className="h-full space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">
            {loading ? '...' : data?.totalTasks || 0}
          </div>
          <div className="text-sm text-blue-600">Total Tasks</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-900">
            {loading ? '...' : `${data?.completionRate.toFixed(1) || 0}%`}
          </div>
          <div className="text-sm text-green-600">Completion Rate</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-2xl font-bold text-red-900">
            {loading ? '...' : data?.overdueTasks || 0}
          </div>
          <div className="text-sm text-red-600">Overdue Tasks</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-900">
            {loading ? '...' : data?.upcomingDeadlines || 0}
          </div>
          <div className="text-sm text-yellow-600">Due This Week</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <BarChart
            data={data?.tasksByStatus || []}
            xKey="name"
            yKeys={['value']}
            title="Tasks by Status"
            height={200}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={false}
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <PieChart
            data={data?.tasksByPriority || []}
            title="Tasks by Priority"
            height={200}
            loading={loading}
            error={error}
            valueType="number"
            showLabels={true}
            showLegend={false}
          />
        </div>
      </div>
    </div>
  )
}