/**
 * PWA Install Prompt Component
 * Provides a user-friendly interface for installing the PWA
 */

'use client'

import React, { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWA'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { X, Download, Smartphone, Monitor, Zap } from 'lucide-react'

interface PWAInstallPromptProps {
  onDismiss?: () => void
  showFeatures?: boolean
  compact?: boolean
  className?: string
}

export function PWAInstallPrompt({
  onDismiss,
  showFeatures = true,
  compact = false,
  className = ''
}: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWAInstall()
  const [isDismissed, setIsDismissed] = useState(false)

  if (!isInstallable || isInstalled || isDismissed) {
    return null
  }

  const handleInstall = async () => {
    try {
      await promptInstall()
    } catch (error) {
      console.error('Installation failed:', error)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <Download className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">
            Install Zetra App
          </p>
          <p className="text-xs text-blue-700">
            Get faster access and offline support
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleInstall}
          loading={isInstalling}
          className="flex-shrink-0"
        >
          Install
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 text-blue-600 hover:text-blue-800 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <Card className={`relative ${className}`}>
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Install Zetra Platform
            </h3>
            <p className="text-gray-600 mb-4">
              Get the full app experience with faster loading, offline access, and native features.
            </p>

            {showFeatures && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Faster Performance</p>
                    <p className="text-xs text-gray-600">Instant loading and smooth interactions</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Offline Access</p>
                    <p className="text-xs text-gray-600">Work without internet connection</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Native Features</p>
                    <p className="text-xs text-gray-600">Push notifications and shortcuts</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleInstall}
                loading={isInstalling}
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1 sm:flex-none"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * PWA Install Button - Standalone install button
 */
export function PWAInstallButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode
}) {
  const { isInstallable, isInstalled, isInstalling, promptInstall } = usePWAInstall()

  if (!isInstallable || isInstalled) {
    return null
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    try {
      await promptInstall()
    } catch (error) {
      console.error('Installation failed:', error)
    }
    props.onClick?.(e)
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      loading={isInstalling}
      className={className}
    >
      {children || (
        <>
          <Download className="h-4 w-4 mr-2" />
          Install App
        </>
      )}
    </Button>
  )
}

/**
 * PWA Status Indicator - Shows installation status
 */
export function PWAStatusIndicator({ className = '' }: { className?: string }) {
  const { isInstalled, isInstallable } = usePWAInstall()

  if (!isInstalled && !isInstallable) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isInstalled ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-green-700">App Installed</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-blue-700">App Available</span>
        </>
      )}
    </div>
  )
}