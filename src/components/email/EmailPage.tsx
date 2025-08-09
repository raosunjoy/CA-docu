'use client'

import React, { useState } from 'react'
import { EmailInbox } from './EmailInbox'
import { EmailComposer } from './EmailComposer'
import { EmailViewer } from './EmailViewer'
import { EmailFolderTree } from './EmailFolderTree'
import { AIEmailCategorizer } from '@/components/ai/AIEmailCategorizer'
import { EnhancedEmailWorkflow } from './EnhancedEmailWorkflow'

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
  const [emails, setEmails] = useState<any[]>([])
  const [showAICategorizer, setShowAICategorizer] = useState(true)
  const [showWorkflows, setShowWorkflows] = useState(false)
  const [activeView, setActiveView] = useState<'inbox' | 'workflows'>('inbox')

  const handleEmailCategorized = (emailId: string, categories: any[], suggestions: any) => {
    // Update email with AI categorization results
    setEmails(prev => prev.map(email => 
      email.id === emailId 
        ? { 
            ...email, 
            categories, 
            aiSuggestions: suggestions,
            labels: [...(email.labels || []), ...categories.map(cat => cat.name)]
          }
        : email
    ))
  }

  const handleCreateTaskFromEmail = async (emailId: string, taskData: any) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      })
      
      if (response.ok) {
        // Mark email as having a linked task
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, linkedTaskIds: [...(email.linkedTaskIds || []), 'new-task'] }
            : email
        ))
      }
    } catch (error) {
      console.error('Failed to create task from email:', error)
    }
  }

  const handleEmailsLoaded = (loadedEmails: any[]) => {
    setEmails(loadedEmails)
  }

  const handleWorkflowExecuted = (emailId: string, actions: any[]) => {
    // Update email with workflow execution results
    setEmails(prev => prev.map(email => 
      email.id === emailId 
        ? { 
            ...email, 
            workflowActions: [...(email.workflowActions || []), ...actions],
            labels: [...(email.labels || []), ...actions.filter(a => a.type === 'assign_label').map(a => a.value)]
          }
        : email
    ))
  }

  return (
    <div className={`email-page h-full flex flex-col ${className}`}>
      {/* AI Categorizer Panel */}
      {showAICategorizer && (
        <div className="border-b border-gray-200 bg-white p-4">
          <AIEmailCategorizer
            emails={emails}
            onEmailCategorized={handleEmailCategorized}
            onCreateTask={handleCreateTaskFromEmail}
          />
        </div>
      )}
      
      {/* Main Email Interface */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Folder Tree */}
        <div className="w-64 border-r border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowComposer(true)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mb-2"
            >
              Compose
            </button>
            <div className="space-y-2">
              <button
                onClick={() => setShowAICategorizer(!showAICategorizer)}
                className={`w-full px-4 py-2 rounded-lg transition-colors text-sm ${
                  showAICategorizer 
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🤖 AI Categorizer
              </button>
              
              <button
                onClick={() => setActiveView(activeView === 'workflows' ? 'inbox' : 'workflows')}
                className={`w-full px-4 py-2 rounded-lg transition-colors text-sm ${
                  activeView === 'workflows'
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚡ Workflows
              </button>
            </div>
          </div>
          <EmailFolderTree
            userId={userId}
            selectedFolder={selectedFolder}
            onFolderSelect={setSelectedFolder}
          />
        </div>

        {/* Middle Panel - Email List or Workflows */}
        <div className="w-96 border-r border-gray-200 bg-white">
          {activeView === 'inbox' ? (
            <EmailInbox
              userId={userId}
              onEmailSelect={setSelectedEmailId}
              selectedEmailId={selectedEmailId}
              folder={selectedFolder}
              onEmailsLoaded={handleEmailsLoaded}
            />
          ) : (
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Workflow Management</h3>
              <p className="text-sm text-gray-600">
                Configure automated workflows in the main panel →
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Email Viewer, Composer, or Workflows */}
        <div className="flex-1 bg-gray-50">
          {(() => {
            if (activeView === 'workflows') {
              return (
                <div className="p-6">
                  <EnhancedEmailWorkflow
                    userId={userId}
                    onWorkflowExecuted={handleWorkflowExecuted}
                  />
                </div>
              )
            }
            
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
    </div>
  )
}