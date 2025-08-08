import React, { useState, useEffect } from 'react'
import { BarChart, LineChart, DonutChart, KPICard } from '../../charts'
import { Activity, Users, Clock, AlertCircle } from 'lucide-react'
import type { DashboardWidgetConfig } from '../../../types'

interface WorkloadData {
  totalWorkload: number
  averageUtilization: number
  peakHours: Array<{ hour: string; workload: number }>
  workloadByDepartment: Array<{ name: string; current: number; capacity: number; utilization: number }>
  workloadDistribution: Array<{ name: string; value: number }>
  weeklyTrend: Array<{ name: string; workload: number; capacity: number }>
  overloadedResources: Array<{ name: string; utilization: number; tasks: number }>
}

interface WorkloadAnalyticsWidgetProps {
  config: DashboardWidgetConfig
  organizationId?: string
  userId?: string
}

export const WorkloadAnalyticsWidget: React.FC<WorkloadAnalyticsWidgetProps> = ({ 
  config, 
  organizationId,
  userId 
}) => {
  const [data, setData] = useState<WorkloadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkloadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Mock data for now - in real implementation, this would fetch from API
        const mockData: WorkloadData = {
          totalWorkload: 342,
          averageUtilization: 78.5,
          peakHours: [
            { hour: '9 AM', workload: 45 },
            { hour: '10 AM', workload: 68 },
            { hour: '11 AM', workload: 82 },
            { hour: '12 PM', workload: 75 },
            { hour: '1 PM', workload: 35 },
            { hour: '2 PM', workload: 88 },
            { hour: '3 PM', workload: 92 },
            { hour: '4 PM', workload: 78 },
            { hour: '5 PM', workload: 65 },
            { hour: '6 PM', workload: 42 }
          ],
          workloadByDepartment: [
            { name: 'Tax Services', current: 85, capacity: 100, utilization: 85 },
            { name: 'Audit', current: 72, capacity: 80, utilization: 90 },
            { name: 'Compliance', current: 45, capacity: 60, utilization: 75 },
            { name: 'Advisory', current: 38, capacity: 50, utilization: 76 },
            { name: 'Payroll', current: 28, capacity: 35, utilization: 80 }
          ],
          workloadDistribution: [
            { name: 'Client Work', value: 65 },
            { name: 'Internal Tasks', value: 20 },
            { name: 'Training', value: 8 },
            { name: 'Admin', value: 7 }
          ],
          weeklyTrend: [
            { name: 'Mon', workload: 78, capacity: 100 },
            { name: 'Tue', workload: 85, capacity: 100 },
            { name: 'Wed', workload: 92, capacity: 100 },
            { name: 'Thu', workload: 88, capacity: 100 },
            { name: 'Fri', workload: 82, capacity: 100 },
            { name: 'Sat', workload: 45, capacity: 60 },
            { name: 'Sun', workload: 12, capacity: 20 }
          ],
          overloadedResources: [
            { name: 'Audit Team', utilization: 105, tasks: 28 },
            { name: 'Senior Associates', utilization: 98, tasks: 24 },
            { name: 'Tax Specialists', utilization: 95, tasks: 22 }
          ]
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1100))
        setData(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workload data')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkloadData()
  }, [organizationId, userId])

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 95) return 'text-red-600 bg-red-50 border-red-200'
    if (utilization >= 85) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    if (utilization >= 70) return 'text-green-600 bg-green-50 border-green-200'
    return 'text-blue-600 bg-blue-50 border-blue-200'
  }

  if (config.size === 'small') {
    return (
      <div className="h-full">
        <KPICard
          title="Team Utilization"
          value={data?.averageUtilization || 0}
          target={80}
          valueType="percentage"
          trend="up"
          trendPercentage={3.2}
          status={data && data.averageUtilization <= 90 && data.averageUtilization >= 70 ? 'good' : 'warning'}
          description={`${data?.totalWorkload || 0} active tasks`}
          loading={loading}
          className="h-full"
        />
      </div>
    )
  }

  return (
    <div className="h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-purple-600" />
          Workload Analytics
        </h3>
        <div className="flex items-center space-x-2">
          {data && data.overloadedResources.length > 0 && (
            <div className="flex items-center text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 mr-1" />
              {data.overloadedResources.length} overloaded
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {loading ? '...' : data?.totalWorkload || 0}
              </div>
              <div className="text-sm text-purple-600">Active Tasks</div>
            </div>
            <Activity className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {loading ? '...' : `${data?.averageUtilization.toFixed(1) || 0}%`}
              </div>
              <div className="text-sm text-blue-600">Avg Utilization</div>
            </div>
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">
                {loading ? '...' : Math.max(...(data?.peakHours.map(h => h.workload) || [0]))}
              </div>
              <div className="text-sm text-green-600">Peak Load</div>
            </div>
            <Clock className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-900">
                {loading ? '...' : data?.overloadedResources.length || 0}
              </div>
              <div className="text-sm text-red-600">Overloaded</div>
            </div>
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <LineChart
            data={data?.weeklyTrend || []}
            xKey="name"
            yKeys={['workload', 'capacity']}
            title="Weekly Workload Trend"
            height={180}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={true}
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <BarChart
            data={data?.peakHours.slice(0, 6) || []}
            xKey="hour"
            yKeys={['workload']}
            title="Peak Hours Analysis"
            height={180}
            loading={loading}
            error={error}
            valueType="number"
            showLegend={false}
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <DonutChart
            data={data?.workloadDistribution || []}
            title="Workload Distribution"
            height={180}
            loading={loading}
            error={error}
            valueType="percentage"
            showLegend={false}
          />
        </div>
      </div>

      {/* Department Utilization */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Department Utilization</h4>
        <div className="space-y-3">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            data?.workloadByDepartment.map((dept, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{dept.name}</div>
                  <div className="text-sm text-gray-500">
                    {dept.current}/{dept.capacity} capacity
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        dept.utilization >= 95 ? 'bg-red-500' :
                        dept.utilization >= 85 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(dept.utilization, 100)}%` }}
                    ></div>
                  </div>
                  <div className={`text-sm font-medium px-2 py-1 rounded border ${getUtilizationColor(dept.utilization)}`}>
                    {dept.utilization}%
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Overloaded Resources Alert */}
      {data && data.overloadedResources.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h4 className="text-sm font-medium text-red-900">Overloaded Resources</h4>
          </div>
          <div className="space-y-2">
            {data.overloadedResources.map((resource, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-red-800">{resource.name}</span>
                <span className="text-red-600 font-medium">
                  {resource.utilization}% ({resource.tasks} tasks)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}