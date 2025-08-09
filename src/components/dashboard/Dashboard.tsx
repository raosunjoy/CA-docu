'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PartnerDashboard } from './widgets/PartnerDashboard'
import { ManagerDashboard } from './widgets/ManagerDashboard'
import { AssociateDashboard } from './widgets/AssociateDashboard'
import { InternDashboard } from './widgets/InternDashboard'
import { ProactiveAIAssistant } from '@/components/ai/ProactiveAIAssistant'
import { UnifiedSystemStatus } from './UnifiedSystemStatus'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'

const getRoleDashboard = (role: string, organizationId: string, userId: string) => {
  switch (role) {
    case 'PARTNER':
      return <PartnerDashboard organizationId={organizationId} userId={userId} />
    case 'MANAGER':
      return <ManagerDashboard organizationId={organizationId} userId={userId} />
    case 'ASSOCIATE':
      return <AssociateDashboard organizationId={organizationId} userId={userId} />
    case 'INTERN':
      return <InternDashboard organizationId={organizationId} userId={userId} />
    default:
      return <AssociateDashboard organizationId={organizationId} userId={userId} />
  }
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'system'>('overview')

  if (!user) {
    return null
  }

  // Use organizationId from user or default for demo
  const organizationId = user.organizationId || 'demo-org'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-purple rounded-lg flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">Z</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Zetra</h1>
              <Badge variant="success" size="sm" className="ml-3">Phase 1 Complete</Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="primary">{user.role}</Badge>
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex space-x-8 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unified System Status
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Dashboard Content */}
            <div className="lg:col-span-3">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome back, {user.firstName}!
                </h2>
                <p className="text-gray-600">
                  Here&apos;s what&apos;s happening with your work today.
                </p>
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Unified AI-Analytics Platform is Online
                      </p>
                      <p className="text-xs text-green-600">
                        All 11 services operational • Data layer active • Real-time processing enabled
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role-based Dashboard */}
              {getRoleDashboard(user.role, organizationId, user.id)}
            </div>

            {/* AI Assistant Sidebar */}
            <div className="lg:col-span-1">
              <ProactiveAIAssistant />
            </div>
          </div>
        ) : (
          /* Unified System Status */
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Unified System Status
              </h2>
              <p className="text-gray-600">
                Real-time monitoring of the AI-Analytics platform infrastructure.
              </p>
            </div>
            <UnifiedSystemStatus />
          </div>
        )}

        {/* Feature Navigation - Only show on overview tab */}
        {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <Card clickable className="text-center">
                <CardContent>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Tasks</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage your work</p>
                </CardContent>
              </Card>

              <Card clickable className="text-center">
                <CardContent>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Documents</h3>
                  <p className="text-xs text-gray-500 mt-1">File management</p>
                </CardContent>
              </Card>

              <Card clickable className="text-center">
                <CardContent>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Chat</h3>
                  <p className="text-xs text-gray-500 mt-1">Team communication</p>
                </CardContent>
              </Card>

              <Card clickable className="text-center">
                <CardContent>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-medium text-gray-900">Time Tracking</h3>
                  <p className="text-xs text-gray-500 mt-1">Track your hours</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}