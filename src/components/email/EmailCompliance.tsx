'use client'

import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Lock, 
  Archive, 
  AlertTriangle,
  CheckCircle,
  Download,
  Search,
  Filter,
  Calendar,
  FileText,
  Key,
  Eye,
  Trash2,
  Clock
} from 'lucide-react'

interface ComplianceRule {
  id: string
  name: string
  description: string
  type: 'retention' | 'encryption' | 'audit' | 'backup'
  isActive: boolean
  lastApplied?: Date
  affectedEmails: number
}

interface AuditLog {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  emailId: string
  emailSubject: string
  details: string
  ipAddress?: string
}

interface EmailComplianceProps {
  organizationId: string
  className?: string
}

export const EmailCompliance: React.FC<EmailComplianceProps> = ({
  organizationId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'audit' | 'retention' | 'encryption'>('rules')
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ])

  useEffect(() => {
    loadComplianceData()
  }, [organizationId, activeTab])

  const loadComplianceData = async () => {
    try {
      setLoading(true)
      
      if (activeTab === 'rules') {
        await loadComplianceRules()
      } else if (activeTab === 'audit') {
        await loadAuditLogs()
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadComplianceRules = async () => {
    try {
      const response = await fetch('/api/emails/compliance/rules')
      if (response.ok) {
        const rules = await response.json()
        setComplianceRules(rules)
      }
    } catch (error) {
      console.error('Failed to load compliance rules:', error)
    }
  }

  const loadAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        search: searchQuery
      })
      
      const response = await fetch(`/api/emails/compliance/audit?${params}`)
      if (response.ok) {
        const logs = await response.json()
        setAuditLogs(logs)
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    }
  }

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/emails/compliance/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })
      
      if (response.ok) {
        setComplianceRules(rules => 
          rules.map(rule => 
            rule.id === ruleId ? { ...rule, isActive } : rule
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  const exportAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange[0].toISOString(),
        endDate: dateRange[1].toISOString(),
        search: searchQuery,
        format: 'csv'
      })
      
      const response = await fetch(`/api/emails/compliance/audit/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `email-audit-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error)
    }
  }

  const runRetentionPolicy = async () => {
    try {
      const response = await fetch('/api/emails/compliance/retention/run', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Retention policy applied. ${result.emailsProcessed} emails processed, ${result.emailsDeleted} emails deleted.`)
        await loadComplianceData()
      }
    } catch (error) {
      console.error('Failed to run retention policy:', error)
      alert('Failed to run retention policy. Please try again.')
    }
  }

  const renderComplianceRules = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Compliance Rules</h4>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add Rule
        </button>
      </div>

      {complianceRules.map(rule => (
        <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                rule.type === 'retention' ? 'bg-red-100 text-red-600' :
                rule.type === 'encryption' ? 'bg-green-100 text-green-600' :
                rule.type === 'audit' ? 'bg-blue-100 text-blue-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {rule.type === 'retention' && <Archive size={16} />}
                {rule.type === 'encryption' && <Lock size={16} />}
                {rule.type === 'audit' && <Eye size={16} />}
                {rule.type === 'backup' && <Shield size={16} />}
              </div>
              <div>
                <h5 className="font-medium text-gray-900">{rule.name}</h5>
                <p className="text-sm text-gray-600">{rule.description}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                {rule.affectedEmails.toLocaleString()} emails
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rule.isActive}
                  onChange={(e) => toggleRule(rule.id, e.target.checked)}
                  className="sr-only"
                />
                <div className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${rule.isActive ? 'bg-blue-600' : 'bg-gray-200'}
                `}>
                  <span className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${rule.isActive ? 'translate-x-6' : 'translate-x-1'}
                  `} />
                </div>
              </label>
            </div>
          </div>

          {rule.lastApplied && (
            <div className="text-xs text-gray-500">
              Last applied: {new Date(rule.lastApplied).toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  const renderAuditLogs = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Audit Logs</h4>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search size={16} className="absolute left-2 top-3 text-gray-400" />
          </div>
          <button
            onClick={exportAuditLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange[0].toISOString().split('T')[0]}
            onChange={(e) => setDateRange([new Date(e.target.value), dateRange[1]])}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={dateRange[1].toISOString().split('T')[0]}
            onChange={(e) => setDateRange([dateRange[0], new Date(e.target.value)])}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <button
          onClick={loadAuditLogs}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Apply Filter
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                    {log.ipAddress && (
                      <div className="text-sm text-gray-500">{log.ipAddress}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.action === 'view' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'delete' ? 'bg-red-100 text-red-800' :
                      log.action === 'update' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {log.emailSubject}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderRetentionPolicy = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Email Retention Policy</h4>
        <button
          onClick={runRetentionPolicy}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
        >
          <Trash2 size={16} />
          <span>Run Cleanup</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-medium text-gray-900 mb-4 flex items-center">
            <Clock size={18} className="mr-2" />
            Retention Rules
          </h5>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white rounded border">
              <div>
                <div className="font-medium">Deleted emails</div>
                <div className="text-sm text-gray-600">Permanently delete after 30 days</div>
              </div>
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded border">
              <div>
                <div className="font-medium">Archived emails</div>
                <div className="text-sm text-gray-600">Keep for 7 years</div>
              </div>
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded border">
              <div>
                <div className="font-medium">Spam emails</div>
                <div className="text-sm text-gray-600">Delete after 7 days</div>
              </div>
              <CheckCircle className="text-green-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-medium text-gray-900 mb-4 flex items-center">
            <Archive size={18} className="mr-2" />
            Storage Statistics
          </h5>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total emails stored</span>
              <span className="font-medium">45,231</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Eligible for deletion</span>
              <span className="font-medium text-red-600">1,234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Storage used</span>
              <span className="font-medium">2.3 GB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Potential savings</span>
              <span className="font-medium text-green-600">156 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderEncryption = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold">Email Encryption</h4>
        <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2">
          <Key size={16} />
          <span>Generate New Key</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-medium text-gray-900 mb-4 flex items-center">
            <Lock size={18} className="mr-2" />
            Encryption Status
          </h5>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Emails encrypted</span>
              <span className="font-medium text-green-600">98.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Encryption algorithm</span>
              <span className="font-medium">AES-256-GCM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Key rotation</span>
              <span className="font-medium">Every 90 days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last key rotation</span>
              <span className="font-medium">15 days ago</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-medium text-gray-900 mb-4 flex items-center">
            <Shield size={18} className="mr-2" />
            Security Policies
          </h5>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <div className="font-medium">Encrypt sensitive emails</div>
                <div className="text-sm text-gray-600">Auto-detect and encrypt</div>
              </div>
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <div className="font-medium">Encrypt attachments</div>
                <div className="text-sm text-gray-600">All attachments encrypted</div>
              </div>
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div>
                <div className="font-medium">End-to-end encryption</div>
                <div className="text-sm text-gray-600">For external communications</div>
              </div>
              <AlertTriangle className="text-yellow-600" size={20} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Shield className="text-blue-600" size={24} />
          <div>
            <h3 className="text-lg font-semibold">Email Compliance</h3>
            <p className="text-sm text-gray-600">
              Manage compliance rules, audit logs, and security policies
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'rules', label: 'Compliance Rules', icon: FileText },
            { id: 'audit', label: 'Audit Logs', icon: Eye },
            { id: 'retention', label: 'Retention Policy', icon: Archive },
            { id: 'encryption', label: 'Encryption', icon: Lock }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading compliance data...</span>
          </div>
        ) : (
          <>
            {activeTab === 'rules' && renderComplianceRules()}
            {activeTab === 'audit' && renderAuditLogs()}
            {activeTab === 'retention' && renderRetentionPolicy()}
            {activeTab === 'encryption' && renderEncryption()}
          </>
        )}
      </div>
    </div>
  )
}