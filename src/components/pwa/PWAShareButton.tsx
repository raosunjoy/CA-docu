/**
 * PWA Share Button Component
 * Provides native sharing functionality using Web Share API
 */

'use client'

import React, { useState } from 'react'
import { usePWAShare } from '@/hooks/usePWA'
import { Button } from '@/components/common/Button'
import { Share2, Copy, Mail, MessageCircle, ExternalLink } from 'lucide-react'

interface PWAShareButtonProps {
  data: ShareData
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fallbackOptions?: boolean
}

export function PWAShareButton({
  data,
  children,
  className = '',
  variant = 'default',
  size = 'md',
  fallbackOptions = true
}: PWAShareButtonProps) {
  const { isSupported, share, canShare } = usePWAShare()
  const [showFallback, setShowFallback] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = async () => {
    if (!isSupported || !canShare(data)) {
      if (fallbackOptions) {
        setShowFallback(true)
      }
      return
    }

    setIsSharing(true)
    try {
      await share(data)
    } catch (error) {
      console.error('Share failed:', error)
      if (fallbackOptions) {
        setShowFallback(true)
      }
    } finally {
      setIsSharing(false)
    }
  }

  if (showFallback) {
    return (
      <ShareFallback
        data={data}
        onClose={() => setShowFallback(false)}
        className={className}
      />
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      loading={isSharing}
      className={className}
    >
      {children || (
        <>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </>
      )}
    </Button>
  )
}

/**
 * Share Fallback Component
 * Provides alternative sharing options when Web Share API is not available
 */
interface ShareFallbackProps {
  data: ShareData
  onClose: () => void
  className?: string
}

function ShareFallback({ data, onClose, className = '' }: ShareFallbackProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = data.url || window.location.href
  const shareText = data.text || ''
  const shareTitle = data.title || document.title

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(shareTitle)
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const handleSMSShare = () => {
    const text = encodeURIComponent(`${shareTitle}\n${shareUrl}`)
    window.open(`sms:?body=${text}`, '_blank')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Share</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-1">{shareTitle}</h4>
              {shareText && (
                <p className="text-sm text-gray-600 mb-2">{shareText}</p>
              )}
              <p className="text-xs text-gray-500 break-all">{shareUrl}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="flex items-center justify-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>

              <Button
                variant="outline"
                onClick={handleEmailShare}
                className="flex items-center justify-center"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>

              <Button
                variant="outline"
                onClick={handleSMSShare}
                className="flex items-center justify-center"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>

              <Button
                variant="outline"
                onClick={() => window.open(shareUrl, '_blank')}
                className="flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * PWA Share Menu Component
 * Provides a dropdown menu with sharing options
 */
interface PWAShareMenuProps {
  data: ShareData
  trigger?: React.ReactNode
  className?: string
}

export function PWAShareMenu({
  data,
  trigger,
  className = ''
}: PWAShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        {trigger || <Share2 className="h-5 w-5" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <PWAShareButton
                data={data}
                variant="ghost"
                className="w-full justify-start px-4 py-2 text-sm"
                fallbackOptions={false}
              >
                <Share2 className="h-4 w-4 mr-3" />
                Share via System
              </PWAShareButton>
              
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(data.url || window.location.href)
                    setIsOpen(false)
                  } catch (error) {
                    console.error('Copy failed:', error)
                  }
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Copy className="h-4 w-4 mr-3" />
                Copy Link
              </button>
              
              <button
                onClick={() => {
                  const subject = encodeURIComponent(data.title || '')
                  const body = encodeURIComponent(`${data.text || ''}\n\n${data.url || window.location.href}`)
                  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                  setIsOpen(false)
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Mail className="h-4 w-4 mr-3" />
                Share via Email
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * PWA Quick Share Component
 * Provides quick sharing for common content types
 */
interface PWAQuickShareProps {
  type: 'task' | 'document' | 'page'
  id?: string
  title: string
  description?: string
  className?: string
}

export function PWAQuickShare({
  type,
  id,
  title,
  description,
  className = ''
}: PWAQuickShareProps) {
  const getShareData = (): ShareData => {
    const baseUrl = window.location.origin
    
    switch (type) {
      case 'task':
        return {
          title: `Task: ${title}`,
          text: description || `Check out this task: ${title}`,
          url: `${baseUrl}/tasks/${id}`
        }
      case 'document':
        return {
          title: `Document: ${title}`,
          text: description || `Check out this document: ${title}`,
          url: `${baseUrl}/documents/${id}`
        }
      case 'page':
      default:
        return {
          title,
          text: description || title,
          url: window.location.href
        }
    }
  }

  return (
    <PWAShareButton
      data={getShareData()}
      className={className}
    />
  )
}