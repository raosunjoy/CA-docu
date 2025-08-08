'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/common/Card'

type AdminSection = 'users' | 'organization' | 'security' | 'backup' | 'integrations' | 'audit'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  storageUsed: string
  backupStatus: 'healthy' | 'warning' | 'error'
  securityScore: number
  lastBackup: string
}

const adminSections = [
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users, roles, and permissions',
    icon: '👥',
    color: 'blue'
  },
  {
    id: 'organization',
    name: 'Organization Settings',
    description: 'Company profile, branding, and preferences',
    icon: '🏢',
    color: 'green'
  },
  {
    id: 'security',
    name: 'Security & Compliance',
    description: 'Access controls, audit logs, and compliance',
    icon: '🔒',
    color: 'red'
  },
  {
    id: 'backup',
    name: 'Backup & Recovery',
    description: 'Data backup, restore, and disaster recovery',
    icon: '💾',
    color: 'purple'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Third-party services and API configurations',
    icon: '🔌',
    color: 'yellow'
  },
  {
    id: 'audit',
    name: 'Audit & Monitoring',
    description: 'System logs, performance, and usage analytics',
    icon: '📊',
    color: 'gray'
  }
]

export default function AdminMainPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState<AdminSection | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    storageUsed: '0 GB',
    backupStatus: 'healthy',
    securityScore: 0,
    lastBackup: ''
  })

  useEffect(() => {
    if (user) {
      loadSystemStats()
    }
  }, [user])

  const loadSystemStats = async () => {
    try {
      // Simulate loading system data
      setTimeout(() => {
        setSystemStats({
          totalUsers: 45,
          activeUsers: 32,
          storageUsed: '12.4 GB',
          backupStatus: 'healthy',
          securityScore: 94,
          lastBackup: '2 hours ago'
        })
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load system stats:', error)
      setLoading(false)
    }
  }

  // Check if user has admin permissions
  const hasAdminAccess = user?.role && ['PARTNER', 'ADMIN'].includes(user.role)

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access administration panel</p>
        </div>
      </div>
    )
  }

  if (!hasAdminAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">
            Administration features are only available to Partners and System Administrators.
          </p>
          <Badge variant="destructive" className="mb-4">
            Current Role: {user.role}
          </Badge>
          <p className="text-sm text-gray-500">
            Contact your system administrator if you need administrative access.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading administration panel...</p>
        </div>
      </div>
    )
  }

  if (selectedSection) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSection(null)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Admin
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {adminSections.find(section => section.id === selectedSection)?.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  {adminSections.find(section => section.id === selectedSection)?.description}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {adminSections.find(section => section.id === selectedSection)?.icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {adminSections.find(section => section.id === selectedSection)?.name} Interface
            </h3>
            <p className="text-gray-600 mb-6">
              This section is ready for implementation. All backend APIs and data structures are in place.
            </p>
            <Button variant="outline">
              Configure Settings
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration Panel</h1>
            <p className="text-gray-600 mt-1">
              Manage your organization's settings, users, and system configuration
            </p>
          </div>

          {/* System Health */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemStats.backupStatus === 'healthy' ? 'bg-green-500' :
                systemStats.backupStatus === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                System {systemStats.backupStatus === 'healthy' ? 'Healthy' : 'Issues'}
              </span>
            </div>
            <Badge variant={systemStats.securityScore > 90 ? 'default' : systemStats.securityScore > 70 ? 'secondary' : 'destructive'}>
              Security: {systemStats.securityScore}%
            </Badge>
          </div>
        </div>

        {/* System Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{systemStats.totalUsers}</div>
            <div className="text-xs text-gray-500">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{systemStats.activeUsers}</div>
            <div className="text-xs text-gray-500">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{systemStats.storageUsed}</div>
            <div className="text-xs text-gray-500">Storage Used</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{systemStats.securityScore}%</div>
            <div className="text-xs text-gray-500">Security Score</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              systemStats.backupStatus === 'healthy' ? 'text-green-600' :
              systemStats.backupStatus === 'warning' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {systemStats.backupStatus === 'healthy' ? '✅' : systemStats.backupStatus === 'warning' ? '⚠️' : '❌'}
            </div>
            <div className="text-xs text-gray-500">Backup Status</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-600">{systemStats.lastBackup}</div>
            <div className="text-xs text-gray-500">Last Backup</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Admin Sections */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Administration Sections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Card
                key={section.id}
                clickable
                onClick={() => setSelectedSection(section.id as AdminSection)}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">
                    {section.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {section.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {section.description}
                  </p>
                  <Button size="sm" className="w-full">
                    Configure
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Alerts */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Alerts</h3>
              <Badge variant="secondary">3 Active</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-green-900">System Backup Completed</p>
                  <p className="text-sm text-green-700">Daily backup completed successfully at 2:00 AM</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-900">Storage Usage Warning</p>
                  <p className="text-sm text-yellow-700">Storage usage at 75%. Consider cleanup or upgrade.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Security Update Available</p>
                  <p className="text-sm text-blue-700">New security patches available for installation</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Stats</h3>
              <Button variant="ghost" size="sm">View Details</Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Sessions</span>
                <span className="font-semibold text-gray-900">28</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Failed Login Attempts (24h)</span>
                <span className="font-semibold text-red-600">3</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Requests (24h)</span>
                <span className="font-semibold text-gray-900">12,456</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database Size</span>
                <span className="font-semibold text-gray-900">2.8 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Scheduled Jobs</span>
                <span className="font-semibold text-green-600">5 Active</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}