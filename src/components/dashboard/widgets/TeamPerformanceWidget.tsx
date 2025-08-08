import React, { useState, useEffect } from 'react'
import { LineChart, BarChart, KPICard } from '../../charts'
import { Users, TrendingUp, Clock, Target } from 'lucide-react'
import type { DashboardWidgetConfig } from '../../../types'

interface TeamPerformanceData {
  overallProductivity: number
  utilizationRate: number
  teamMembers: Array<{
    name: string
    productivity: number
    utilization: number
    tasksCompleted: number
    hoursLogged: number
  }>
  productivityTrend: Array<{ name: string; productivity: number; utilization: number }>
  departmentPerformance: Array<{ name: string; avgProductivity: number; teamSize: number }>
}

interface TeamPerformanceWidgetProps {
  config: DashboardWidgetConfig
  organizationId?: string
  userId?: string
}

export const TeamPerformanceWidget: React.FC<TeamPerformanceWidgetProps> = ({ 
  config, 
  organizationId,
  userId 
}) => {
  const [data, setData] = useState<TeamPerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamPerformance = async () => {
      try {
        setLoading(true)
        setError(null)

        // Mock data for now - in real implementation, this would fetch from API
        const mockData: TeamPerformanceData = {
          overallProductivity: 82.5,
          utilizationRate: 78.3,
          teamMembers: [
            { name: 'Rajesh Kumar', productivity: 88, utilization: 85, tasksCompleted: 24, hoursLogged: 168 },
            { name: 'Priya Sharma', productivity: 92, utilization: 82, tasksCompleted: 28, hoursLogged: 164 },
            { name: 'Amit Patel', productivity: 75, utilization: 70, tasksCompleted: 18, hoursLogged: 140 },
            { name: 'Sneha Gupta', productivity: 85, utilization: 88, tasksCompleted: 22, hoursLogged: 176 },
            { name: 'Vikram Singh', productivity: 79, utilization: 75, tasksCompleted: 20, hoursLogged: 150 }
          ],
          productivityTrend: [
            { name: 'Jan', productivity: 78, utilization: 72 },
            { name: 'Feb', productivity: 82, utilization: 75 },
            { name: 'Mar', productivity: 85, utilization: 78 },
            { name: 'Apr', productivity: 83, utilization: 80 },
            { name: 'May', productivity: 87, utilization: 82 },
            { name: 'Jun', productivity: 82, utilization: 78 }
          ],
          departmentPerformance: [
            { name: 'Tax', avgProductivity: 85, teamSize: 8 },
            { name: 'Audit', avgProductivity: 82, teamSize: 6 },
            { name: 'Compliance', avgProductivity: 78, teamSize: 4 },
            { name: 'Advisory', avgProductivity: 88, teamSize: 5 }
          ]
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 900))
        setData(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team performance data')
      } finally {
        setLoading(false)
      }
    }

    fetchTeamPerformance()
  }, [organizationId, userId])

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50'
    if (score >= 75) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (config.size === 'small') {
    return (
      <div className="h-full">
        <KPICard
          title="Team Productivity"
          value={data?.overallProductivity || 0}
          target={85}
          valueType="percentage"
          trend="up"
          trendPercentage={4.2}
          status={data && data.overallProductivity >= 85 ? 'good' : data && data.overallProductivity >= 75 ? 'warning' : 'critical'}
          description={`${data?.teamMembers.length || 0} team members tracked`}
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
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Team Performance
        </h3>
        <div className="text-sm text-gray-500">
          {data?.teamMembers.length || 0} members
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {loading ? '...' : `${data?.overallProductivity.toFixed(1) || 0}%`}
              </div>
              <div className="text-sm text-blue-600">Productivity</div>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">
                {loading ? '...' : `${data?.utilizationRate.toFixed(1) || 0}%`}
              </div>
              <div className="text-sm text-green-600">Utilization</div>
            </div>
            <Clock className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {loading ? '...' : data?.teamMembers.reduce((sum, member) => sum + member.tasksCompleted, 0) || 0}
              </div>
              <div className="text-sm text-purple-600">Tasks Done</div>
            </div>
            <Target className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {loading ? '...' : Math.round((data?.teamMembers.reduce((sum, member) => sum + member.hoursLogged, 0) || 0) / (data?.teamMembers.length || 1))}
              </div>
              <div className="text-sm text-orange-600">Avg Hours</div>
            </div>
            <Clock className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <LineChart
            data={data?.productivityTrend || []}
            xKey="name"
            yKeys={['productivity', 'utilization']}
            title="Productivity & Utilization Trend"
            height={200}
            loading={loading}
            error={error}
            valueType="percentage"
            showLegend={true}
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <BarChart
            data={data?.departmentPerformance || []}
            xKey="name"
            yKeys={['avgProductivity']}
            title="Department Performance"
            height={200}
            loading={loading}
            error={error}
            valueType="percentage"
            showLegend={false}
          />
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Individual Performance</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            data?.teamMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{member.name}</div>
                  <div className="text-sm text-gray-500">
                    {member.tasksCompleted} tasks • {member.hoursLogged}h logged
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(member.productivity)}`}>
                      {member.productivity}%
                    </div>
                    <div className="text-xs text-gray-500">Productivity</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(member.utilization)}`}>
                      {member.utilization}%
                    </div>
                    <div className="text-xs text-gray-500">Utilization</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}