import { Button } from '@/components/common/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/common/Card'
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget'
import { MonitoringAlertsNotification } from '@/components/admin/MonitoringAlertsNotification'
import { SystemStatusOverview } from '@/components/admin/SystemStatusOverview'
import { MonitoringDataExport } from '@/components/admin/MonitoringDataExport'
import { DeploymentTracker } from '@/components/admin/DeploymentTracker'
import { RollbackManagementDashboard } from '@/components/admin/RollbackManagementDashboard'
import { useSystemHealth } from '@/hooks/useSystemHealth'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  storageUsed: string
  backupStatus: 'healthy' | 'warning' | 'error'
  securityScore: number
  lastBackup: string
}

type AdminSection = 'users' | 'organization' | 'security' | 'backup' | 'integrations' | 'audit'

interface AdminSectionData {
  id: AdminSection
  name: string
  description: string
  icon: string
  color: string
}

// Error screens
export const AuthenticationRequired = () => (
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

export const AccessDenied = () => (
  <div className="h-full flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
      <p className="text-gray-600">You need administrator or partner privileges to access this section.</p>
    </div>
  </div>
)

// System stats dashboard with comprehensive monitoring
export const SystemStatsDashboard = ({ stats }: { stats: SystemStats }) => {
  const { healthData } = useSystemHealth(30000)
  
  return (
    <div className="space-y-6 mb-8">
      {/* System Health Widget - Primary monitoring */}
      <SystemHealthWidget 
        refreshInterval={30000}
        showDetails={true}
        onAlertClick={(alert) => {
          console.log('Alert clicked:', alert)
          // In a real implementation, this would open an alert details modal
        }}
      />
      
      {/* Monitoring Alerts Notification */}
      <MonitoringAlertsNotification 
        alerts={healthData.alerts}
        onAlertAcknowledge={(alertId) => {
          console.log('Alert acknowledged:', alertId)
          // In a real implementation, this would call the API to acknowledge the alert
        }}
        onAlertDismiss={(alertId) => {
          console.log('Alert dismissed:', alertId)
          // In a real implementation, this would call the API to dismiss the alert
        }}
        onAlertAction={(alertId, action) => {
          console.log('Alert action:', alertId, action)
          // In a real implementation, this would execute the alert action
        }}
      />
      
      {/* System Status Overview */}
      <SystemStatusOverview 
        refreshInterval={30000}
        onServiceClick={(service) => {
          console.log('Service clicked:', service)
          // In a real implementation, this would open service details modal
        }}
      />
      
      {/* Additional System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">{stats.storageUsed}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💾</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Backup Status</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant={stats.backupStatus === 'healthy' ? 'success' : 'warning'} 
                  size="sm"
                >
                  {stats.backupStatus}
                </Badge>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Security Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.securityScore}%</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Last Backup</p>
              <p className="text-lg font-medium text-gray-900">{stats.lastBackup}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Deployment Tracking */}
      <DeploymentTracker 
        refreshInterval={30000}
        showHistory={true}
        onRollbackRequest={(deploymentId) => {
          console.log('Rollback requested for:', deploymentId)
          // In a real implementation, this would open the rollback confirmation modal
        }}
      />
      
      {/* Rollback Management */}
      <RollbackManagementDashboard />
      
      {/* Monitoring Data Export */}
      <MonitoringDataExport 
        onExport={async (config) => {
          console.log('Export requested:', config)
          // In a real implementation, this would call the export API
        }}
      />
    </div>
  )
}

// Admin sections grid
export const AdminSectionsGrid = ({ 
  sections, 
  onSectionSelect 
}: { 
  sections: AdminSectionData[]
  onSectionSelect: (section: AdminSection) => void 
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {sections.map((section) => (
      <Card key={section.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div 
          onClick={() => onSectionSelect(section.id)}
          className="flex flex-col h-full"
        >
          <div className={`w-12 h-12 bg-${section.color}-100 rounded-lg flex items-center justify-center mb-4`}>
            <span className="text-2xl">{section.icon}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{section.name}</h3>
          <p className="text-gray-600 flex-grow">{section.description}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" className="w-full">
              Manage
            </Button>
          </div>
        </div>
      </Card>
    ))}
  </div>
)