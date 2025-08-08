'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../../atoms/Card'
import { Button } from '../../atoms/Button'
import type { DashboardMetrics, Task } from '../../../types'

interface InternDashboardProps {
  organizationId: string
  userId: string
  className?: string
}

export const InternDashboard: React.FC<InternDashboardProps> = ({
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
        fetch(`/api/dashboard/metrics?organizationId=${organizationId}&userId=${userId}&role=INTERN`),
        fetch(`/api/tasks?assignedTo=${userId}&limit=10`)
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
      <div className={`intern-dashboard ${className}`}>
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
      <div className={`intern-dashboard ${className}`}>
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
    <div className={`intern-dashboard ${className}`}>
      {/* Welcome Message */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Welcome to your Learning Journey!</h2>
            <p className="text-gray-600">Track your progress, complete assignments, and develop your CA skills.</p>
          </div>
        </div>
      </Card>

      {/* Learning Progress KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <LearningMetricsCard
          title="Assigned Tasks"
          value={metrics?.totalTasks || 0}
          change="+2"
          trend="up"
          icon="tasks"
        />
        <LearningMetricsCard
          title="Completed"
          value={metrics?.completedTasks || 0}
          change="+3"
          trend="up"
          icon="check"
        />
        <LearningMetricsCard
          title="Learning Hours"
          value={`${metrics?.totalHours || 0}h`}
          change="+5h"
          trend="up"
          icon="clock"
        />
        <LearningMetricsCard
          title="Skill Level"
          value="Beginner"
          change="Improving"
          trend="up"
          icon="star"
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Learning Progress */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Learning Progress</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Modules
            </button>
          </div>
          <LearningProgressWidget />
        </Card>

        {/* Current Assignments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Current Assignments</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {myTasks.length} Active
            </span>
          </div>
          <CurrentAssignmentsWidget tasks={myTasks} />
        </Card>

        {/* Skill Development */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Skill Development</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Skills
            </button>
          </div>
          <SkillDevelopmentWidget />
        </Card>

        {/* Mentor Feedback */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mentor Feedback</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>
          <MentorFeedbackWidget />
        </Card>

        {/* Learning Resources */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Learning Resources</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Browse All
            </button>
          </div>
          <LearningResourcesWidget />
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines & Milestones</h3>
            <div className="flex space-x-2">
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                3 Due Soon
              </span>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Calendar
              </button>
            </div>
          </div>
          <UpcomingDeadlinesWidget tasks={myTasks} />
        </Card>
      </div>
    </div>
  )
}

// Learning Metrics Card Component
interface LearningMetricsCardProps {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'stable'
  icon: 'tasks' | 'check' | 'clock' | 'star'
}

const LearningMetricsCard: React.FC<LearningMetricsCardProps> = ({
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
      case 'star':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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

// Learning Progress Widget
const LearningProgressWidget: React.FC = () => {
  const learningModules = [
    { name: 'Accounting Fundamentals', progress: 85, status: 'in-progress', totalLessons: 12, completedLessons: 10 },
    { name: 'Taxation Basics', progress: 60, status: 'in-progress', totalLessons: 15, completedLessons: 9 },
    { name: 'Audit Procedures', progress: 30, status: 'in-progress', totalLessons: 20, completedLessons: 6 },
    { name: 'GST Compliance', progress: 100, status: 'completed', totalLessons: 8, completedLessons: 8 },
  ]

  return (
    <div className="space-y-4">
      {learningModules.map((module, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                module.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}></div>
              <h4 className="font-medium text-gray-900">{module.name}</h4>
            </div>
            <span className="text-sm font-medium text-gray-900">{module.progress}%</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-4">
              <div 
                className={`h-2 rounded-full ${
                  module.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${module.progress}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{module.completedLessons}/{module.totalLessons} lessons completed</span>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              {module.status === 'completed' ? 'Review' : 'Continue'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Current Assignments Widget
const CurrentAssignmentsWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const assignments = tasks.slice(0, 5)

  return (
    <div className="space-y-3">
      {assignments.map((task) => (
        <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
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
              {task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}
            </p>
          </div>
          <Button variant="outline" size="sm">
            Start
          </Button>
        </div>
      ))}
      {assignments.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No current assignments
        </div>
      )}
    </div>
  )
}

// Skill Development Widget
const SkillDevelopmentWidget: React.FC = () => {
  const skills = [
    { name: 'Accounting', level: 65, target: 80 },
    { name: 'Taxation', level: 45, target: 70 },
    { name: 'Audit', level: 30, target: 60 },
    { name: 'Excel', level: 80, target: 90 },
  ]

  return (
    <div className="space-y-4">
      {skills.map((skill, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{skill.name}</span>
            <span className="text-sm text-gray-500">{skill.level}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full relative"
              style={{ width: `${skill.level}%` }}
            >
              <div 
                className="absolute top-0 right-0 w-1 h-2 bg-green-500 rounded-full"
                style={{ right: `${100 - skill.target}%` }}
                title={`Target: ${skill.target}%`}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Mentor Feedback Widget
const MentorFeedbackWidget: React.FC = () => {
  const feedback = [
    {
      mentor: 'Rajesh Kumar',
      message: 'Great improvement in your audit documentation skills!',
      rating: 4,
      date: '2 days ago'
    },
    {
      mentor: 'Priya Sharma',
      message: 'Need to focus more on GST calculations.',
      rating: 3,
      date: '1 week ago'
    },
    {
      mentor: 'Amit Patel',
      message: 'Excellent work on the tax filing assignment.',
      rating: 5,
      date: '2 weeks ago'
    },
  ]

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))
  }

  return (
    <div className="space-y-4">
      {feedback.map((item, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">{item.mentor}</span>
            <div className="flex items-center space-x-1">
              {renderStars(item.rating)}
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-2">{item.message}</p>
          <p className="text-xs text-gray-500">{item.date}</p>
        </div>
      ))}
    </div>
  )
}

// Learning Resources Widget
const LearningResourcesWidget: React.FC = () => {
  const resources = [
    { name: 'CA Study Materials', type: 'PDF', icon: 'document' },
    { name: 'Video Tutorials', type: 'Video', icon: 'video' },
    { name: 'Practice Tests', type: 'Quiz', icon: 'quiz' },
    { name: 'Case Studies', type: 'Document', icon: 'case' },
  ]

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'document':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      case 'video':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      case 'quiz':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      case 'case':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    }
  }

  return (
    <div className="space-y-3">
      {resources.map((resource, index) => (
        <button
          key={index}
          className="w-full flex items-center space-x-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
        >
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {getIcon(resource.icon)}
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{resource.name}</p>
            <p className="text-xs text-gray-500">{resource.type}</p>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ))}
    </div>
  )
}

// Upcoming Deadlines Widget
const UpcomingDeadlinesWidget: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const upcomingTasks = tasks
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Assignment
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {upcomingTasks.map((task) => {
            const daysUntilDue = getDaysUntilDue(task.dueDate!)
            return (
              <tr key={task.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{task.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    Learning
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{new Date(task.dueDate!).toLocaleDateString()}</div>
                  <div className={`text-xs ${
                    daysUntilDue <= 1 ? 'text-red-600' :
                    daysUntilDue <= 3 ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {daysUntilDue === 0 ? 'Due today' :
                     daysUntilDue === 1 ? 'Due tomorrow' :
                     `${daysUntilDue} days left`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    task.status === 'TODO' ? 'bg-gray-100 text-gray-800' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'IN_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Button variant="outline" size="sm">
                    {task.status === 'TODO' ? 'Start' : 'Continue'}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {upcomingTasks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No upcoming deadlines
        </div>
      )}
    </div>
  )
}