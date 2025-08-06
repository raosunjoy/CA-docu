'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../../common/Card'
import { Button } from '../../common/Button'
import type { DashboardMetrics, Task, TaskPriority, TaskStatus } from '../../../types'

interface AssociateDashboardProps {
  organizationId: string
  userId: string
  className?: string
}

export const AssociateDashboard: React.FC<AssociateDashboardProps> = ({
  organizationId,
  userId,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [organizationId, userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [metricsResponse, tasksResponse] = await Promise.all([
        fetch(`/api/dashboard/metrics?organizationId=${organizationId}&userId=${userId}&role=ASSOCIATE`),
        fetch(`/api/tasks?assignedTo=${userId}&limit=10&status=TODO,IN_PROGRESS,IN_REVIEW`)
      ])

      if (!metricsResponse.ok || !tasksResponse.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const metricsData = await metricsResponse.json()
      const tasksData = await tasksResponse.json()

      setMetrics(metricsData.data)
      setMyTasks(tasksData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`associate-dashboard ${className}`}>
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
      <div className={`associate-dashboard ${className}`}>
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
    <div className={`associate-dashboard ${className}`}>
      {/* Personal Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <PersonalMetricsCard
          title="My Tasks"
          value={metrics?.totalTasks || 0}
          change="+3"
          trend="up"
          icon="tasks"
        />
        <PersonalMetricsCard
          title="Completed Today"
          value={5}
          change="+2"
          trend="up"
          icon="check"
        />
        <PersonalMetricsCard
          title="Hours Logged"
          value={`${metrics?.totalHours || 0}h`}
          change="+1.5h"
          trend="up"
          icon="clock"
        />
        <PersonalMetricsCard
          title="Efficiency Score"
          value="87%"
          change="+5%"
          trend="up"
          icon="trending"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Task Board */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">My Task Board</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                View All
              </Button>
              <Button variant="primary" size="sm">
                New Task
              </Button>
            </div>
          </div>
          <PersonalTaskBoardWidget tasks={myTasks} />
        </Card>

        {/* Today's Priorities */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Today's Priorities</h3>
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              3 Due
            </span>
          </div>
          <TodaysPrioritiesWidget tasks={myTasks} />
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Calendar
            </button>
          </div>
          <UpcomingDeadlinesWidget tasks={myTasks} />
        </Card>

        {/* Time Tracking */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Time Tracking</h3>
            <Button variant="primary" size="sm">
              Start Timer
            </Button>
          </div>
          <TimeTrackingWidget />
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <RecentActivityWidget />
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <QuickActionsWidget />
        </Card>
      </div>
    </div>
  )
}

// Personal Metrics Card Component
interface PersonalMetricsCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: 'tasks' | 'check' | 'clock' | 'trending'
}

const PersonalMetricsCard: React.FC<PersonalMetricsCardProps> = ({
  title,
  value,
  change,
  trend,
  icon
}) => {
  const getIcon = () => {
    switch (icon) {
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
      case 'trending':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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

// Personal Task Board Widget
const PersonalTaskBoardWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const tasksByStatus = {
    TODO: tasks.filter(task => task.status === 'TODO'),
    IN_PROGRESS: tasks.filter(task => task.status === 'IN_PROGRESS'),
    IN_REVIEW: tasks.filter(task => task.status === 'IN_REVIEW'),
  }

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT': return 'border-red-500'
      case 'HIGH': return 'border-orange-500'
      case 'MEDIUM': return 'border-yellow-500'
      case 'LOW': return 'border-green-500'
      default: return 'border-gray-300'
    }
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
        <div key={status} className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {status.replace('_', ' ')}
            </h4>
            <span className="text-sm text-gray-500">
              {statusTasks.length}
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {statusTasks.map((task) => (
              <div
                key={task.id}
                className={`p-3 bg-white border-l-4 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
            {statusTasks.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Today's Priorities Widget
const TodaysPrioritiesWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const todaysPriorities = tasks
    .filter(task => task.dueDate && new Date(task.dueDate) <= new Date())
    .sort((a, b) => {
      const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    .slice(0, 5)

  return (
    <div className="space-y-3">
      {todaysPriorities.map((task, index) => (
        <div key={task.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${
            task.priority === 'URGENT' ? 'bg-red-500' :
            task.priority === 'HIGH' ? 'bg-orange-500' :
            task.priority === 'MEDIUM' ? 'bg-yellow-500' :
            'bg-green-500'
          }`}></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 line-clamp-1">
              {task.title}
            </p>
            <p className="text-xs text-gray-500">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
            </p>
          </div>
          <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
            Start
          </button>
        </div>
      ))}
      {todaysPriorities.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No urgent tasks for today
        </div>
      )}
    </div>
  )
}

// Upcoming Deadlines Widget
const UpcomingDeadlinesWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const upcomingDeadlines = tasks
    .filter(task => task.dueDate && new Date(task.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5)

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="space-y-3">
      {upcomingDeadlines.map((task) => {
        const daysUntilDue = getDaysUntilDue(task.dueDate!)
        return (
          <div key={task.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 line-clamp-1">
                {task.title}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(task.dueDate!).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-medium ${
                daysUntilDue <= 1 ? 'text-red-600' :
                daysUntilDue <= 3 ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                {daysUntilDue === 0 ? 'Today' :
                 daysUntilDue === 1 ? 'Tomorrow' :
                 `${daysUntilDue} days`}
              </span>
            </div>
          </div>
        )
      })}
      {upcomingDeadlines.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No upcoming deadlines
        </div>
      )}
    </div>
  )
}

// Time Tracking Widget
const TimeTrackingWidget: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00:00')

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-3xl font-mono font-bold text-gray-900 mb-2">
          {currentTime}
        </div>
        <Button
          variant={isTracking ? 'danger' : 'primary'}
          size="sm"
          onClick={() => setIsTracking(!isTracking)}
          className="w-full"
        >
          {isTracking ? 'Stop Timer' : 'Start Timer'}
        </Button>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Today's Total</span>
          <span className="text-sm font-medium text-gray-900">6h 45m</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">This Week</span>
          <span className="text-sm font-medium text-gray-900">32h 15m</span>
        </div>
      </div>
    </div>
  )
}

// Recent Activity Widget
const RecentActivityWidget: React.FC = () => {
  const activities = [
    { action: 'Completed task', item: 'GST Return Review', time: '2 hours ago' },
    { action: 'Updated task', item: 'Client Meeting Notes', time: '4 hours ago' },
    { action: 'Started task', item: 'Audit Documentation', time: '6 hours ago' },
    { action: 'Commented on', item: 'Tax Filing Process', time: '1 day ago' },
  ]

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
          <div className="flex-1">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{activity.action}</span>{' '}
              <span className="text-blue-600">{activity.item}</span>
            </p>
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Quick Actions Widget
const QuickActionsWidget: React.FC = () => {
  const quickActions = [
    { name: 'Create Task', icon: 'plus', color: 'bg-blue-500' },
    { name: 'Upload Document', icon: 'upload', color: 'bg-green-500' },
    { name: 'Start Timer', icon: 'clock', color: 'bg-orange-500' },
    { name: 'View Calendar', icon: 'calendar', color: 'bg-purple-500' },
    { name: 'Send Message', icon: 'message', color: 'bg-pink-500' },
    { name: 'Generate Report', icon: 'chart', color: 'bg-indigo-500' },
  ]

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'plus':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      case 'upload':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      case 'clock':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      case 'calendar':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      case 'message':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      case 'chart':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    }
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
      {quickActions.map((action, index) => (
        <button
          key={index}
          className="flex flex-col items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white mb-2`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {getIcon(action.icon)}
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-700 text-center">
            {action.name}
          </span>
        </button>
      ))}
    </div>
  )
}