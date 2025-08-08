'use client'

import React, { useState } from 'react'
import { EmailInbox } from './EmailInbox'
import { EmailComposer } from './EmailComposer'
import { EmailViewer } from './EmailViewer'
import { EmailFolderTree } from './EmailFolderTree'

interface EmailPageProps {
  userId: string
  className?: string
}

export const EmailPage: React.FC<EmailPageProps> = ({ 
  userId, 
  className = '' 
}) => {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState('inbox')

  return (
    <div className={`email-page h-full flex ${className}`}>
      {/* Left Sidebar - Folder Tree */}
      <div className="w-64 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={() => setShowComposer(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Compose
          </button>
        </div>
        <EmailFolderTree
          userId={userId}
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
        />
      </div>

      {/* Middle Panel - Email List */}
      <div className="w-96 border-r border-gray-200 bg-white">
        <EmailInbox
          userId={userId}
          onEmailSelect={setSelectedEmailId}
          selectedEmailId={selectedEmailId}
          folder={selectedFolder}
        />
      </div>

      {/* Right Panel - Email Viewer or Composer */}
      <div className="flex-1 bg-gray-50">
        {(() => {
          if (showComposer) {
            return (
              <EmailComposer
                onClose={() => setShowComposer(false)}
                onSent={() => {
                  setShowComposer(false)
                  // Refresh inbox
                }}
              />
            )
          }
          
          if (selectedEmailId) {
            return (
              <EmailViewer
                emailId={selectedEmailId}
                onClose={() => setSelectedEmailId(null)}
              />
            )
          }
          
          return (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-900 mb-2">No email selected</p>
                <p className="text-gray-600">Choose an email from the list to view its contents</p>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}