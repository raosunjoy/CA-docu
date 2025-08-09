'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { 
  AuthenticationRequired, 
  AccessDenied, 
  SystemStatsDashboard, 
  AdminSectionsGrid 
} from './components'

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
    id: 'users' as AdminSection,
    name: 'User Management',
    description: 'Manage users, roles, and permissions',
    icon: '👥',
    color: 'blue'
  },
  {
    id: 'organization' as AdminSection,
    name: 'Organization Settings',
    description: 'Company profile, branding, and preferences',
    icon: '🏢',
    color: 'green'
  },
  {
    id: 'security' as AdminSection,
    name: 'Security & Compliance',
    description: 'Access controls, audit logs, and compliance',
    icon: '🔒',
    color: 'red'
  },
  {
    id: 'backup' as AdminSection,
    name: 'Backup & Recovery',
    description: 'Data backup, restore, and disaster recovery',
    icon: '💾',
    color: 'purple'
  },
  {
    id: 'integrations' as AdminSection,
    name: 'Integrations',
    description: 'Third-party services and API configurations',
    icon: '🔌',
    color: 'yellow'
  },
  {
    id: 'audit' as AdminSection,
    name: 'Audit & Monitoring',
    description: 'System logs, performance, and usage analytics',
    icon: '📊',
    color: 'gray'
  }
]

// eslint-disable-next-line max-lines-per-function
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
    } catch {
      // Error handling for system stats loading
      setLoading(false)
    }
  }

  // Check if user has admin permissions
  const hasAdminAccess = user?.role && ['PARTNER', 'ADMIN'].includes(user.role)

  if (!user) return <AuthenticationRequired />
  if (!hasAdminAccess) return <AccessDenied />

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
        <div className="bg-white shadow-sm border-b p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {adminSections.find(s => s.id === selectedSection)?.name}
          </h1>
          <button 
            onClick={() => setSelectedSection(null)}
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            ← Back to Admin Dashboard
          </button>
        </div>
        <div className="flex-1 p-6">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {adminSections.find(s => s.id === selectedSection)?.icon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {adminSections.find(s => s.id === selectedSection)?.name} Interface
            </h3>
            <p className="text-gray-600">
              This section is ready for implementation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm border-b p-6">
        <h1 className="text-2xl font-bold text-gray-900">Administration Panel</h1>
        <p className="text-gray-600 mt-1">
          Manage your organization settings and system configuration
        </p>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <SystemStatsDashboard stats={systemStats} />
        <AdminSectionsGrid 
          sections={adminSections} 
          onSectionSelect={setSelectedSection} 
        />
      </div>
    </div>
  )
}