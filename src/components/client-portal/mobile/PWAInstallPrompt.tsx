'use client'

import React from 'react'
import { 
  XMarkIcon,
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import { useClientPWA } from '@/hooks/useClientPWA'

export default function PWAInstallPrompt() {
  const { showInstallPrompt, installApp, dismissInstallPrompt } = useClientPWA()

  if (!showInstallPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 lg:hidden">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <DevicePhoneMobileIcon className="h-8 w-8 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            Install Client Portal
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Add to your home screen for quick access and offline functionality
          </p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={installApp}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              Install
            </button>
            <button
              onClick={dismissInstallPrompt}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Not Now
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={dismissInstallPrompt}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}