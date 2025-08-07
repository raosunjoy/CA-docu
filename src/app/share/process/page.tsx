/**
 * Share Processing Page
 * Handles content shared to the PWA and allows users to process it
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Alert } from '@/components/common/Alert'
import { 
  Share2, 
  FileText, 
  CheckSquare, 
  Upload, 
  ExternalLink,
  X
} from 'lucide-react'

interface SharedContent {
  title: string
  text: string
  url: string
  hasFiles: boolean
  fileCount: number
}

export default function ShareProcessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sharedContent, setSharedContent] = useState<SharedContent | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Extract shared content from URL parameters
    const content: SharedContent = {
      title: searchParams.get('title') || '',
      text: searchParams.get('text') || '',
      url: searchParams.get('url') || '',
      hasFiles: searchParams.get('hasFiles') === 'true',
      fileCount: parseInt(searchParams.get('fileCount') || '0')
    }

    if (content.title || content.text || content.url || content.hasFiles) {
      setSharedContent(content)
    } else {
      // No shared content, redirect to home
      router.push('/')
    }
  }, [searchParams, router])

  const handleCreateTask = async () => {
    if (!sharedContent) return

    setProcessing(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: sharedContent.title || 'Shared Content',
          description: `${sharedContent.text}\n\n${sharedContent.url}`.trim(),
          tags: ['shared-content'],
          priority: 'MEDIUM'
        })
      })

      if (response.ok) {
        const task = await response.json()
        router.push(`/tasks/${task.data.id}`)
      } else {
        throw new Error('Failed to create task')
      }
    } catch (error) {
      console.error('Failed to create task:', error)
      alert('Failed to create task. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateDocument = async () => {
    if (!sharedContent) return

    setProcessing(true)
    try {
      // For now, just redirect to documents page
      // In a real implementation, you'd handle file uploads here
      router.push('/documents?shared=true')
    } catch (error) {
      console.error('Failed to create document:', error)
      alert('Failed to create document. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  const handleOpenUrl = () => {
    if (sharedContent?.url) {
      window.open(sharedContent.url, '_blank')
    }
  }

  const handleDismiss = () => {
    router.push('/')
  }

  if (!sharedContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing shared content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Shared Content</h1>
          </div>
          <p className="text-gray-600">
            Choose how you'd like to handle the shared content.
          </p>
        </div>

        <Card className="mb-6">
          <div className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Content Preview</h2>
            
            {sharedContent.title && (
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">Title:</label>
                <p className="text-gray-900 mt-1">{sharedContent.title}</p>
              </div>
            )}
            
            {sharedContent.text && (
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">Text:</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{sharedContent.text}</p>
              </div>
            )}
            
            {sharedContent.url && (
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">URL:</label>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-blue-600 break-all">{sharedContent.url}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenUrl}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {sharedContent.hasFiles && (
              <div className="mb-3">
                <label className="text-sm font-medium text-gray-700">Files:</label>
                <p className="text-gray-900 mt-1">
                  {sharedContent.fileCount} file{sharedContent.fileCount !== 1 ? 's' : ''} shared
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Create Task</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Convert this shared content into a task for tracking and completion.
              </p>
              <Button
                onClick={handleCreateTask}
                loading={processing}
                className="w-full"
              >
                Create Task
              </Button>
            </div>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Save as Document</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Save this content as a document in your document library.
              </p>
              <Button
                onClick={handleCreateDocument}
                loading={processing}
                variant="outline"
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Save Document
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-gray-600"
          >
            <X className="h-4 w-4 mr-2" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}