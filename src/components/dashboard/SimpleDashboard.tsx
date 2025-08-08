'use client'

import React, { useState, useEffect } from 'react'
import type { UserRole } from '../../types'

interface SimpleDashboardProps {
  organizationId: string
  userId: string
  userRole: UserRole
  className?: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string
  assignedTo: string
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({
  organizationId,
  userId,
  userRole,
  className = ''
}) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueeTasks: 0
  })

  useEffect(() => {
    loadDashboardData()
  }, [organizationId, userId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      // Load tasks
      const tasksResponse = await fetch('/api/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData.data || [])
        
        // Calculate stats
        const totalTasks = tasksData.data?.length || 0
        const completedTasks = tasksData.data?.filter((t: Task) => t.status === 'COMPLETED').length || 0
        const pendingTasks = tasksData.data?.filter((t: Task) => t.status === 'TODO' || t.status === 'IN_PROGRESS').length || 0
        const overdueTasks = tasksData.data?.filter((t: Task) => new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length || 0
        
        setStats({
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueeTasks: overdueTasks
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'IN_REVIEW': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'w-2 h-2 bg-green-400 rounded-full'
      case 'MEDIUM': return 'w-2 h-2 bg-yellow-400 rounded-full'
      case 'HIGH': return 'w-2 h-2 bg-orange-400 rounded-full'
      case 'URGENT': return 'w-2 h-2 bg-red-400 rounded-full'
      default: return 'w-2 h-2 bg-gray-400 rounded-full'
    }
  }

  const getRoleBasedGreeting = () => {
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const roleTitle = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()
    return `${timeGreeting}, ${roleTitle}`
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-purple-200 rounded-xl w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-purple-100 rounded-2xl"></div>
            ))}
          </div>
          <div className="h-64 bg-purple-100 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Welcome Header */}
      <div className="glass rounded-3xl p-8 shadow-xl">
        <h1 className="text-3xl font-bold gradient-purple-text mb-2">
          {getRoleBasedGreeting()}
        </h1>
        <p className="text-purple-600">
          Here's what's happening with your CA practice today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 gradient-purple rounded-2xl flex items-center justify-center">
              <span className="text-white text-xl">📋</span>
            </div>
            <span className="text-sm text-purple-600 font-medium">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalTasks}</p>
          <p className="text-sm text-gray-600">Tasks</p>
        </div>

        <div className="glass rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-xl">✅</span>
            </div>
            <span className="text-sm text-green-600 font-medium">Completed</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.completedTasks}</p>
          <p className="text-sm text-gray-600">Tasks</p>
        </div>

        <div className="glass rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-xl">⏳</span>
            </div>
            <span className="text-sm text-blue-600 font-medium">Pending</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.pendingTasks}</p>
          <p className="text-sm text-gray-600">Tasks</p>
        </div>

        <div className="glass rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-xl">⚠️</span>
            </div>
            <span className="text-sm text-red-600 font-medium">Overdue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{stats.overdueeTasks}</p>
          <p className="text-sm text-gray-600">Tasks</p>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="glass rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Tasks</h2>
          <button className="text-purple-600 hover:text-purple-700 font-medium">
            View All →
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 gradient-purple rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600">Create your first task to get started.</p>
            <button className="mt-4 px-6 py-3 gradient-purple text-white font-semibold rounded-xl btn-hover">
              Create Task
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.slice(0, 5).map((task, index) => (
              <div key={task.id} className={`flex items-center justify-between p-4 bg-white/70 rounded-xl border border-purple-100 hover:bg-white/90 transition-all duration-200 animate-fadeInUp`} style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center space-x-4 flex-1">
                  <div className={getPriorityColor(task.priority)}></div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button className="text-purple-600 hover:text-purple-700 p-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-purple-50 rounded-xl transition-colors">
              <div className="w-10 h-10 gradient-purple rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">+</span>
              </div>
              <span className="font-medium text-gray-900">Create New Task</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-purple-50 rounded-xl transition-colors">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">📄</span>
              </div>
              <span className="font-medium text-gray-900">Upload Document</span>
            </button>
            <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-purple-50 rounded-xl transition-colors">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
              <span className="font-medium text-gray-900">View Reports</span>
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 card-hover">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 gradient-purple rounded-full mt-2"></div>
              <div>
                <p className="text-gray-900">Task "GST Return Filing" was completed</p>
                <p className="text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-gray-900">New client document uploaded</p>
                <p className="text-gray-600">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-gray-900">Audit meeting scheduled</p>
                <p className="text-gray-600">Yesterday</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}