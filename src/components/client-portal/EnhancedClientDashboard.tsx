'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Calendar,
  MessageSquare,
  Download,
  Upload,
  Bell,
  TrendingUp,
  DollarSign,
  Target,
  Activity
} from 'lucide-react'

interface ClientEngagement {
  id: string
  title: string
  type: 'audit' | 'tax_filing' | 'compliance' | 'consultation' | 'advisory'
  status: 'not_started' | 'in_progress' | 'under_review' | 'completed' | 'on_hold'
  progress: number
  deadline: Date
  assignedTeam: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedCompletion: Date
  lastUpdate: Date
}

interface ClientMetrics {
  totalEngagements: number
  activeEngagements: number
  completedThisYear: number
  complianceScore: number
  responseTime: number
  satisfactionScore: number
}

interface DocumentRequest {
  id: string
  title: string
  description: string
  dueDate: Date
  status: 'pending' | 'uploaded' | 'approved' | 'rejected'
  priority: 'low' | 'medium' | 'high'
  category: string
}

interface ClientNotification {
  id: string
  type: 'deadline' | 'update' | 'request' | 'completion' | 'alert'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  actionRequired: boolean
}

export const EnhancedClientDashboard: React.FC<{
  clientId: string
  clientType: 'individual' | 'business'
}> = ({ clientId, clientType }) => {
  const [engagements, setEngagements] = useState<ClientEngagement[]>([])
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null)
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>([])
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'engagements' | 'documents' | 'communications'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [clientId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Mock data - in real implementation, fetch from API
      const mockEngagements: ClientEngagement[] = [
        {
          id: '1',
          title: clientType === 'business' ? 'Annual Audit FY 2024-25' : 'Income Tax Return Filing',
          type: clientType === 'business' ? 'audit' : 'tax_filing',
          status: 'in_progress',
          progress: 65,
          deadline: new Date('2025-09-30'),
          assignedTeam: ['Sarah Johnson', 'Mike Chen'],
          priority: 'high',
          estimatedCompletion: new Date('2025-09-15'),
          lastUpdate: new Date('2025-08-05')
        },
        {
          id: '2',
          title: clientType === 'business' ? 'GST Compliance Review' : 'Capital Gains Assessment',
          type: 'compliance',
          status: 'under_review',
          progress: 90,
          deadline: new Date('2025-08-25'),
          assignedTeam: ['Alex Kumar'],
          priority: 'medium',
          estimatedCompletion: new Date('2025-08-20'),
          lastUpdate: new Date('2025-08-08')
        },
        {
          id: '3',
          title: 'Tax Planning Consultation',
          type: 'consultation',
          status: 'completed',
          progress: 100,
          deadline: new Date('2025-07-31'),
          assignedTeam: ['Sarah Johnson'],
          priority: 'low',
          estimatedCompletion: new Date('2025-07-28'),
          lastUpdate: new Date('2025-07-28')
        }
      ]

      const mockMetrics: ClientMetrics = {
        totalEngagements: 12,
        activeEngagements: 2,
        completedThisYear: 8,
        complianceScore: 94,
        responseTime: 2.3,
        satisfactionScore: 4.8
      }

      const mockDocumentRequests: DocumentRequest[] = [
        {
          id: '1',
          title: clientType === 'business' ? 'Bank Statements (July 2025)' : 'Form 16 for FY 2024-25',
          description: clientType === 'business' ? 'Please upload current account statements for July 2025' : 'Upload your Form 16 from your employer',
          dueDate: new Date('2025-08-20'),
          status: 'pending',
          priority: 'high',
          category: clientType === 'business' ? 'Financial Records' : 'Tax Documents'
        },
        {
          id: '2',
          title: clientType === 'business' ? 'Purchase Invoices Q1' : 'Investment Statements',
          description: clientType === 'business' ? 'All purchase invoices for Q1 FY 2025-26' : 'Mutual fund and share trading statements',
          dueDate: new Date('2025-08-25'),
          status: 'uploaded',
          priority: 'medium',
          category: clientType === 'business' ? 'Purchase Records' : 'Investment Records'
        }
      ]

      const mockNotifications: ClientNotification[] = [
        {
          id: '1',
          type: 'deadline',
          title: 'Document Upload Deadline Approaching',
          message: 'Bank statements are due in 3 days. Please upload to avoid delays.',
          timestamp: new Date('2025-08-09T10:00:00'),
          isRead: false,
          actionRequired: true
        },
        {
          id: '2',
          type: 'update',
          title: 'Audit Progress Update',
          message: 'Your annual audit is now 65% complete. Expected completion by Sept 15.',
          timestamp: new Date('2025-08-08T15:30:00'),
          isRead: true,
          actionRequired: false
        },
        {
          id: '3',
          type: 'completion',
          title: 'Tax Planning Consultation Completed',
          message: 'Your tax planning session has been completed. Report is available for download.',
          timestamp: new Date('2025-07-28T14:00:00'),
          isRead: true,
          actionRequired: false
        }
      ]

      setEngagements(mockEngagements)
      setMetrics(mockMetrics)
      setDocumentRequests(mockDocumentRequests)
      setNotifications(mockNotifications)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: ClientEngagement['status']) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'primary'
      case 'under_review': return 'warning'
      case 'on_hold': return 'secondary'
      default: return 'secondary'
    }
  }

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    switch (priority) {
      case 'urgent': return 'destructive'
      case 'high': return 'warning'
      case 'medium': return 'primary'
      default: return 'secondary'
    }
  }

  const unreadNotifications = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {clientType === 'business' ? 'Business Dashboard' : 'Client Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            Track your engagements, documents, and communications
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={unreadNotifications > 0 ? 'destructive' : 'secondary'} className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {unreadNotifications} New
          </Badge>
          <Button variant="outline">
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Team
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Engagements</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics.activeEngagements}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.complianceScore}%</p>
                </div>
                <Target className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-bold text-purple-600">{metrics.responseTime}h</p>
                </div>
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Satisfaction</p>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.satisfactionScore}/5</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'engagements', label: 'Engagements', icon: FileText },
            { key: 'documents', label: 'Documents', icon: Upload },
            { key: 'communications', label: 'Communications', icon: MessageSquare }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Engagements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Engagements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {engagements.slice(0, 3).map(engagement => (
                  <div key={engagement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{engagement.title}</h3>
                        <Badge variant={getStatusColor(engagement.status) as any}>
                          {engagement.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {engagement.deadline.toLocaleDateString()}
                        </span>
                        <span>{engagement.progress}% complete</span>
                      </div>
                      <Progress value={engagement.progress} className="mt-2 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Document Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Pending Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentRequests.filter(doc => doc.status === 'pending').map(doc => (
                  <div key={doc.id} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-orange-900">{doc.title}</h3>
                      <Badge variant={getPriorityColor(doc.priority) as any} size="sm">
                        {doc.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-orange-800 mb-2">{doc.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-700 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Due: {doc.dueDate.toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="outline">
                        <Upload className="w-4 h-4 mr-1" />
                        Upload
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'engagements' && (
        <div className="grid grid-cols-1 gap-6">
          {engagements.map(engagement => (
            <Card key={engagement.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    {engagement.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : engagement.status === 'in_progress' ? (
                      <Clock className="w-6 h-6 text-blue-500" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-orange-500" />
                    )}
                    {engagement.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(engagement.priority) as any}>
                      {engagement.priority}
                    </Badge>
                    <Badge variant={getStatusColor(engagement.status) as any}>
                      {engagement.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <div className="mt-2">
                      <Progress value={engagement.progress} className="h-2" />
                      <p className="text-sm text-gray-700 mt-1">{engagement.progress}% complete</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Deadline</p>
                    <p className="text-sm font-medium mt-1">{engagement.deadline.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Assigned Team</p>
                    <p className="text-sm font-medium mt-1">{engagement.assignedTeam.join(', ')}</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button size="sm">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Contact Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Notifications */}
      {activeTab === 'communications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map(notification => (
                <div key={notification.id} className={`p-4 rounded-lg border-l-4 ${
                  notification.isRead ? 'bg-gray-50 border-l-gray-300' : 'bg-blue-50 border-l-blue-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${!notification.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        {notification.actionRequired && (
                          <Badge variant="destructive" size="sm">Action Required</Badge>
                        )}
                      </div>
                      <p className={`text-sm ${!notification.isRead ? 'text-blue-800' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}