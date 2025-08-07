// Offline Help Guide Component - Provides guidance for offline usage
'use client'

import React, { useState } from 'react'
import { TaskOfflineBadge, DocumentOfflineBadge, EmailOfflineBadge, ChatOfflineBadge, SearchOfflineBadge } from './OfflineCapabilityBadge'

interface OfflineHelpGuideProps {
  isOpen: boolean
  onClose: () => void
}

interface FeatureGuide {
  name: string
  isAvailableOffline: boolean
  badge: React.ReactNode
  description: string
  capabilities: string[]
  limitations?: string[]
  tips?: string[]
}

export function OfflineHelpGuide({ isOpen, onClose }: OfflineHelpGuideProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'sync' | 'troubleshooting'>('overview')

  const featureGuides: FeatureGuide[] = [
    {
      name: 'Tasks',
      isAvailableOffline: true,
      badge: <TaskOfflineBadge isCurrentlyOffline={true} />,
      description: 'Full task management capabilities available offline',
      capabilities: [
        'Create, edit, and delete tasks',
        'Update task status and priority',
        'Add comments and attachments',
        'Search and filter tasks',
        'Complete workflow steps'
      ],
      tips: [
        'Changes are automatically saved locally',
        'Use search to quickly find tasks',
        'Task dependencies work offline'
      ]
    },
    {
      name: 'Documents',
      isAvailableOffline: true,
      badge: <DocumentOfflineBadge isCurrentlyOffline={true} />,
      description: 'Access and edit downloaded documents offline',
      capabilities: [
        'View downloaded documents',
        'Add annotations and comments',
        'Create new document versions',
        'Search document content',
        'Organize with tags and folders'
      ],
      limitations: [
        'Only previously downloaded documents are available',
        'New uploads require internet connection'
      ],
      tips: [
        'Download important documents before going offline',
        'Annotations sync automatically when online'
      ]
    },
    {
      name: 'Email',
      isAvailableOffline: false,
      badge: <EmailOfflineBadge isCurrentlyOffline={true} />,
      description: 'Email features require internet connection',
      capabilities: [],
      limitations: [
        'Cannot send or receive emails',
        'Email sync is paused',
        'Email-to-task conversion unavailable'
      ],
      tips: [
        'Compose emails in drafts to send later',
        'Use tasks to track email follow-ups'
      ]
    },
    {
      name: 'Chat',
      isAvailableOffline: true,
      badge: <ChatOfflineBadge isCurrentlyOffline={true} />,
      description: 'Limited chat functionality available offline',
      capabilities: [
        'View recent message history',
        'Compose messages (sent when online)',
        'Search chat history',
        'Access file attachments'
      ],
      limitations: [
        'Cannot receive new messages',
        'Real-time features unavailable'
      ],
      tips: [
        'Messages are queued and sent when online',
        'Use @mentions for important messages'
      ]
    },
    {
      name: 'Search',
      isAvailableOffline: true,
      badge: <SearchOfflineBadge isCurrentlyOffline={true} />,
      description: 'Search cached content offline',
      capabilities: [
        'Search tasks and documents',
        'Filter by tags and categories',
        'Full-text search in cached content',
        'Advanced search operators'
      ],
      limitations: [
        'Only searches locally cached data',
        'Results may not include latest changes'
      ],
      tips: [
        'Use specific keywords for better results',
        'Tag content for easier offline discovery'
      ]
    }
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'features', label: 'Features', icon: '⚡' },
    { id: 'sync', label: 'Sync', icon: '🔄' },
    { id: 'troubleshooting', label: 'Help', icon: '🛠️' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Offline Mode Guide
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-1/4 border-r bg-gray-50">
            <nav className="p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Working Offline
                </h3>
                
                <div className="prose max-w-none">
                  <p className="text-gray-600 mb-4">
                    Zetra Platform is designed to work seamlessly offline. You can continue 
                    working on tasks, documents, and other content even without an internet 
                    connection. All changes are saved locally and will sync automatically 
                    when your connection is restored.
                  </p>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">
                          Automatic Sync
                        </h4>
                        <p className="text-blue-800 text-sm">
                          When you reconnect to the internet, all your offline changes 
                          will be synchronized automatically. You'll be notified if any 
                          conflicts need resolution.
                        </p>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium text-gray-900 mb-3">Key Benefits</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Uninterrupted productivity during network outages
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Secure local data encryption
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Intelligent conflict resolution
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Optimized storage management
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Feature Availability
                </h3>
                
                <div className="space-y-6">
                  {featureGuides.map((feature) => (
                    <div key={feature.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-medium text-gray-900">{feature.name}</h4>
                        {feature.badge}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                      
                      {feature.capabilities.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Available Offline:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {feature.capabilities.map((capability, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <svg className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {capability}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {feature.limitations && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Limitations:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {feature.limitations.map((limitation, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <svg className="w-3 h-3 text-red-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                {limitation}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {feature.tips && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Tips:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {feature.tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <svg className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'sync' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Synchronization
                </h3>
                
                <div className="prose max-w-none">
                  <h4 className="font-medium text-gray-900 mb-3">How Sync Works</h4>
                  <p className="text-gray-600 mb-4">
                    All changes made offline are queued and synchronized when you reconnect 
                    to the internet. The sync process is automatic and handles conflicts 
                    intelligently.
                  </p>

                  <h4 className="font-medium text-gray-900 mb-3">Sync Process</h4>
                  <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
                    <li>Changes are detected and queued locally</li>
                    <li>When online, sync starts automatically</li>
                    <li>Operations are processed in priority order</li>
                    <li>Conflicts are detected and resolved</li>
                    <li>Local data is updated with server changes</li>
                  </ol>

                  <h4 className="font-medium text-gray-900 mb-3">Conflict Resolution</h4>
                  <p className="text-gray-600 mb-4">
                    When the same data is modified both offline and online, conflicts may occur. 
                    The system provides several resolution strategies:
                  </p>
                  
                  <ul className="space-y-2 text-gray-600 mb-6">
                    <li><strong>Auto-merge:</strong> Automatically combines non-conflicting changes</li>
                    <li><strong>Local wins:</strong> Keeps your offline changes</li>
                    <li><strong>Remote wins:</strong> Uses the server version</li>
                    <li><strong>Manual resolution:</strong> You choose which changes to keep</li>
                  </ul>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-yellow-900 mb-1">
                          Manual Conflicts
                        </h4>
                        <p className="text-yellow-800 text-sm">
                          Some conflicts require manual resolution. You'll be notified 
                          when this happens and can resolve them through the sync interface.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'troubleshooting' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Troubleshooting
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Common Issues</h4>
                    
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Sync is not working
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Check your internet connection</li>
                          <li>• Refresh the page to restart sync</li>
                          <li>• Clear browser cache if issues persist</li>
                          <li>• Contact support if problems continue</li>
                        </ul>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Data is missing
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Check if you're viewing the correct filters</li>
                          <li>• Ensure sync has completed</li>
                          <li>• Look for items in the sync queue</li>
                          <li>• Verify you have the necessary permissions</li>
                        </ul>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          Storage is full
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Clear old cached documents</li>
                          <li>• Reduce offline retention period</li>
                          <li>• Remove unnecessary downloads</li>
                          <li>• Optimize cache settings</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Best Practices</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Regularly sync when online to minimize conflicts
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Download important documents before going offline
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Use descriptive names and tags for better offline search
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Monitor storage usage and clean up regularly
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}