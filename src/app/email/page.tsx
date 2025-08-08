'use client'

import { useState, useEffect } from 'react'
import { EmailPage } from '@/components/email/EmailPage'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/common/Button'

interface EmailAccount {
  id: string
  email: string
  provider: string
  isDefault: boolean
  status: string
}

export default function EmailMainPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [showAccountSetup, setShowAccountSetup] = useState(false)

  useEffect(() => {
    if (user) {
      loadEmailAccounts()
    }
  }, [user])

  const loadEmailAccounts = async () => {
    try {
      // Simulate loading email accounts
      setTimeout(() => {
        setAccounts([
          {
            id: '1',
            email: user?.email || 'user@example.com',
            provider: 'Gmail',
            isDefault: true,
            status: 'active'
          }
        ])
        setLoading(false)
      }, 1000)
    } catch (error) {
      console.error('Failed to load email accounts:', error)
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to access email integration</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading email accounts...</p>
        </div>
      </div>
    )
  }

  if (accounts.length === 0 && !showAccountSetup) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts Connected</h3>
          <p className="text-gray-600 mb-6">
            Connect your email accounts to sync messages, convert emails to tasks, and streamline your workflow.
          </p>
          <Button 
            onClick={() => setShowAccountSetup(true)}
            className="mb-4"
          >
            Connect Email Account
          </Button>
          <div className="text-sm text-gray-500">
            <p>Supported providers:</p>
            <div className="flex justify-center space-x-4 mt-2">
              <span className="px-2 py-1 bg-gray-100 rounded">Gmail</span>
              <span className="px-2 py-1 bg-gray-100 rounded">Outlook</span>
              <span className="px-2 py-1 bg-gray-100 rounded">Exchange</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (showAccountSetup) {
    return (
      <div className="h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Connect Email Account</h1>
              <p className="text-gray-600 mt-1">
                Choose your email provider to get started
              </p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => setShowAccountSetup(false)}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Email Provider Setup */}
        <div className="max-w-2xl mx-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 cursor-pointer transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.387l-9 6.463-9-6.463V21H1.5C.649 21 0 20.35 0 19.5v-15C0 3.649.649 3 1.5 3H2l10 7.25L22 3h.5c.85 0 1.5.649 1.5 1.5z"/>
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Gmail</h3>
                <p className="text-sm text-gray-600">Connect your Google workspace</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 cursor-pointer transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.387l-9 6.463-9-6.463V21H1.5C.649 21 0 20.35 0 19.5v-15C0 3.649.649 3 1.5 3H2l10 7.25L22 3h.5c.85 0 1.5.649 1.5 1.5z"/>
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Outlook</h3>
                <p className="text-sm text-gray-600">Microsoft 365 / Outlook.com</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 cursor-pointer transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">IMAP/SMTP</h3>
                <p className="text-sm text-gray-600">Other email providers</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Your email credentials are encrypted and stored securely. We only access emails to sync and organize them within your workspace.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Integration</h1>
            <p className="text-gray-600 mt-1">
              Manage emails and convert them to tasks
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">
                {accounts.length} account{accounts.length !== 1 ? 's' : ''} synced
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAccountSetup(true)}
            >
              Add Account
            </Button>
          </div>
        </div>
      </div>

      {/* Email Interface */}
      <div className="h-full">
        <EmailPage userId={user.id} />
      </div>
    </div>
  )
}