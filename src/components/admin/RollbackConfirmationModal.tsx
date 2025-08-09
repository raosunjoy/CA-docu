'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/atoms/Modal'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent } from '@/components/atoms/Card'
import { cn } from '@/lib/utils'

export interface RollbackImpact {
  affectedServices: string[]
  estimatedDowntime: number // in seconds
  dataLossRisk: 'none' | 'low' | 'medium' | 'high'
  userImpact: 'minimal' | 'moderate' | 'significant' | 'severe'
  rollbackComplexity: 'simple' | 'moderate' | 'complex'
  dependencies: string[]
  warnings: string[]
}

export interface RollbackProgress {
  stage: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  startTime?: Date
  endTime?: Date
  logs: string[]
}

export interface RollbackValidation {
  isValid: boolean
  checks: {
    name: string
    status: 'passed' | 'failed' | 'warning'
    message: string
  }[]
  canProceed: boolean
  requiresConfirmation: boolean
}

interface RollbackConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  deploymentId: string
  deploymentVersion: string
  targetVersion?: string
  impact: RollbackImpact
  validation?: RollbackValidation
  progress?: RollbackProgress[]
  isRollingBack?: boolean
}

export const RollbackConfirmationModal: React.FC<RollbackConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deploymentId,
  deploymentVersion,
  targetVersion,
  impact,
  validation,
  progress,
  isRollingBack = false
}) => {
  const [step, setStep] = useState<'confirmation' | 'validation' | 'progress'>('confirmation')
  const [acknowledged, setAcknowledged] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const expectedConfirmationText = `rollback ${deploymentVersion}`

  useEffect(() => {
    if (isRollingBack && progress) {
      setStep('progress')
    } else if (validation && step === 'confirmation') {
      setStep('validation')
    }
  }, [isRollingBack, progress, validation, step])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'none':
      case 'minimal':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'low':
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'medium':
      case 'significant':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'high':
      case 'severe':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getValidationIcon = (status: 'passed' | 'failed' | 'warning') => {
    switch (status) {
      case 'passed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
    } catch (error) {
      console.error('Rollback failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const canProceed = () => {
    if (step === 'confirmation') {
      return acknowledged && confirmationText === expectedConfirmationText
    }
    if (step === 'validation') {
      return validation?.canProceed ?? false
    }
    return false
  }

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Rollback</h3>
        <p className="text-gray-600">
          You are about to rollback deployment <span className="font-mono font-semibold">{deploymentVersion}</span>
          {targetVersion && (
            <span> to version <span className="font-mono font-semibold">{targetVersion}</span></span>
          )}
        </p>
      </div>

      {/* Impact Assessment */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Impact Assessment</h4>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Data Loss Risk:</span>
              <div className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2',
                getRiskColor(impact.dataLossRisk)
              )}>
                {impact.dataLossRisk}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">User Impact:</span>
              <div className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2',
                getRiskColor(impact.userImpact)
              )}>
                {impact.userImpact}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Estimated Downtime:</span>
              <span className="ml-2 text-sm text-gray-900 font-medium">
                {formatDuration(impact.estimatedDowntime)}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Complexity:</span>
              <div className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2',
                getRiskColor(impact.rollbackComplexity)
              )}>
                {impact.rollbackComplexity}
              </div>
            </div>
          </div>

          {impact.affectedServices.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700">Affected Services:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {impact.affectedServices.map((service) => (
                  <Badge key={service} variant="secondary" size="sm">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {impact.dependencies.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700">Dependencies:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {impact.dependencies.map((dep) => (
                  <Badge key={dep} variant="outline" size="sm">
                    {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {impact.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h5 className="font-medium text-yellow-800 mb-1">Warnings</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {impact.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Checkbox */}
      <div className="space-y-4">
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            I understand the risks and impact of this rollback operation and acknowledge that this action cannot be undone.
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-mono bg-gray-100 px-1 rounded">{expectedConfirmationText}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Type confirmation text..."
            disabled={!acknowledged}
          />
        </div>
      </div>
    </div>
  )

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pre-rollback Validation</h3>
        <p className="text-gray-600">
          Running safety checks before proceeding with rollback...
        </p>
      </div>

      {validation && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {validation.checks.map((check, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {getValidationIcon(check.status)}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{check.name}</div>
                    <div className={cn(
                      'text-sm',
                      check.status === 'passed' ? 'text-green-600' :
                      check.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    )}>
                      {check.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!validation.canProceed && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-red-800">
                    Rollback cannot proceed due to failed validation checks
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderProgressStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Rollback in Progress</h3>
        <p className="text-gray-600">
          Rolling back to {targetVersion || 'previous version'}...
        </p>
      </div>

      {progress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {progress.map((stage, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {stage.status === 'completed' ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : stage.status === 'running' ? (
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : stage.status === 'failed' ? (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                      <span className="font-medium text-gray-900">{stage.stage}</span>
                    </div>
                    <span className="text-sm text-gray-600">{stage.progress}%</span>
                  </div>
                  
                  <div className="ml-8">
                    <div className="text-sm text-gray-600 mb-1">{stage.message}</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          stage.status === 'completed' ? 'bg-green-600' :
                          stage.status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
                        )}
                        style={{ width: `${stage.progress}%` }}
                      />
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {step === 'confirmation' && renderConfirmationStep()}
        {step === 'validation' && renderValidationStep()}
        {step === 'progress' && renderProgressStep()}

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
          {step !== 'progress' && (
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
          )}
          
          {step === 'confirmation' && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!canProceed() || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Proceed with Rollback'}
            </Button>
          )}
          
          {step === 'validation' && validation?.canProceed && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? 'Starting Rollback...' : 'Start Rollback'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default RollbackConfirmationModal