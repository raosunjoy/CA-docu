/**
 * Encryption Dashboard Component
 * Provides comprehensive encryption management and monitoring
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Alert } from '@/components/common/Alert'

interface EncryptionStatus {
  totalEncryptedFields: number
  totalEncryptedDocuments: number
  keyRotationStatus: {
    current: number
    expired: number
    expiringSoon: number
  }
  complianceScore: number
  recommendations: string[]
}

interface EncryptionDashboardProps {
  className?: string
}

export function EncryptionDashboard({ className = '' }: EncryptionDashboardProps) {
  const [status, setStatus] = useState<EncryptionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showKeyGeneration, setShowKeyGeneration] = useState(false)

  // Key generation form state
  const [keyForm, setKeyForm] = useState({
    purpose: 'document' as 'document' | 'field' | 'backup' | 'communication',
    expirationDays: 365,
  })

  // Load encryption status
  const loadEncryptionStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/encryption/keys')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to load encryption status')
      }

      setStatus(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load encryption status')
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadEncryptionStatus()
  }, [])

  // Generate new key
  const handleGenerateKey = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/encryption/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          ...keyForm,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate key')
      }

      setShowKeyGeneration(false)
      await loadEncryptionStatus()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate key')
    } finally {
      setLoading(false)
    }
  }

  // Rotate keys
  const handleRotateKeys = async (keyPurpose?: string) => {
    if (!confirm('Are you sure you want to rotate encryption keys? This is a critical operation.')) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/encryption/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rotate',
          keyPurpose,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to rotate keys')
      }

      await loadEncryptionStatus()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate keys')
    } finally {
      setLoading(false)
    }
  }

  // Get compliance score color
  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    if (score >= 50) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  // Get key status color
  const getKeyStatusColor = (type: 'current' | 'expired' | 'expiringSoon') => {
    switch (type) {
      case 'current': return 'text-green-600 bg-green-50'
      case 'expiringSoon': return 'text-yellow-600 bg-yellow-50'
      case 'expired': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Encryption Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowKeyGeneration(true)}
          >
            Generate Key
          </Button>
          <Button
            variant="outline"
            onClick={() => handleRotateKeys()}
          >
            Rotate All Keys
          </Button>
          <Button onClick={loadEncryptionStatus} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Loading State */}
      {loading && !status && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Encryption Status */}
      {status && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Compliance Score</p>
                  <div className="flex items-center">
                    <span className={`text-2xl font-bold px-3 py-1 rounded-full ${getComplianceScoreColor(status.complianceScore)}`}>
                      {status.complianceScore}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Encrypted Fields</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {status.totalEncryptedFields.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Encrypted Documents</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {status.totalEncryptedDocuments.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Keys</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {status.keyRotationStatus.current}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Key Rotation Status */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Rotation Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getKeyStatusColor('current')}`}>
                  {status.keyRotationStatus.current} Current Keys
                </div>
                <p className="text-xs text-gray-500 mt-2">Keys in good standing</p>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getKeyStatusColor('expiringSoon')}`}>
                  {status.keyRotationStatus.expiringSoon} Expiring Soon
                </div>
                <p className="text-xs text-gray-500 mt-2">Keys expiring within 30 days</p>
                {status.keyRotationStatus.expiringSoon > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => handleRotateKeys()}
                  >
                    Rotate Now
                  </Button>
                )}
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getKeyStatusColor('expired')}`}>
                  {status.keyRotationStatus.expired} Expired Keys
                </div>
                <p className="text-xs text-gray-500 mt-2">Keys requiring immediate rotation</p>
                {status.keyRotationStatus.expired > 0 && (
                  <Button
                    size="sm"
                    className="mt-2 bg-red-600 hover:bg-red-700"
                    onClick={() => handleRotateKeys()}
                  >
                    Rotate Urgently
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          {status.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Recommendations</h3>
              <div className="space-y-3">
                {status.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="ml-3 text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Key Management Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Management Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                onClick={() => handleRotateKeys('document')}
                disabled={loading}
              >
                Rotate Document Keys
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRotateKeys('field')}
                disabled={loading}
              >
                Rotate Field Keys
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRotateKeys('backup')}
                disabled={loading}
              >
                Rotate Backup Keys
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRotateKeys('communication')}
                disabled={loading}
              >
                Rotate Comm Keys
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Key Generation Modal */}
      {showKeyGeneration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Generate New Encryption Key</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKeyGeneration(false)}
                >
                  Cancel
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key Purpose
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={keyForm.purpose}
                    onChange={(e) => setKeyForm(prev => ({ ...prev, purpose: e.target.value as any }))}
                  >
                    <option value="document">Document Encryption</option>
                    <option value="field">Field-Level Encryption</option>
                    <option value="backup">Backup Encryption</option>
                    <option value="communication">Communication Encryption</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={keyForm.expirationDays}
                    onChange={(e) => setKeyForm(prev => ({ ...prev, expirationDays: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 365 days for most purposes
                  </p>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowKeyGeneration(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateKey}
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : 'Generate Key'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EncryptionDashboard