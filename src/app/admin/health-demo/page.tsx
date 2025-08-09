'use client'

import React from 'react'
import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget'
import { Card, CardContent } from '@/components/atoms/Card'

export default function HealthDemoPage() {
  const handleAlertClick = (alert: any) => {
    alert('Alert clicked: ' + alert.message)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            System Health Widget Demo
          </h1>
          <p className="text-gray-600">
            Real-time system monitoring and health dashboard for production environments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Main System Health Widget */}
          <div className="lg:col-span-2">
            <SystemHealthWidget 
              refreshInterval={10000} // 10 seconds for demo
              showDetails={true}
              onAlertClick={handleAlertClick}
              alertThreshold={{
                cpu: 70,
                memory: 75,
                responseTime: 150
              }}
            />
          </div>

          {/* Demo Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Features Demonstrated
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Real-time system metrics (CPU, Memory, Response Time)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Active user count and error rate monitoring
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  System uptime tracking
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Intelligent alert system with severity levels
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Health status indicators (Healthy, Warning, Critical)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  Auto-refresh with manual refresh capability
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* API Integration Info */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                API Integration
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-900">Health Check:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                    GET /api/health/ready
                  </code>
                </div>
                <div>
                  <span className="font-medium text-gray-900">Metrics:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                    GET /api/metrics
                  </code>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-gray-600">
                    The widget automatically fetches data from these endpoints and 
                    parses Prometheus-style metrics for display.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Example */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Usage Example
            </h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`import { SystemHealthWidget } from '@/components/admin/SystemHealthWidget'

export default function AdminDashboard() {
  const handleAlertClick = (alert) => {
    // Handle alert click - could open modal, navigate, etc.
    console.log('Alert:', alert)
  }

  return (
    <SystemHealthWidget 
      refreshInterval={30000}  // 30 seconds
      showDetails={true}
      onAlertClick={handleAlertClick}
      alertThreshold={{
        cpu: 80,
        memory: 80,
        responseTime: 200
      }}
    />
  )
}`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}