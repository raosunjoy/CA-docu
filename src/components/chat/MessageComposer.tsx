// Message Composer Component
// Handles message composition with typing indicators and formatting

'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { FileUpload } from './FileUpload'
import { offlineChatService } from '../../lib/offline-chat-service'

interface MessageComposerProps {
  channelId: string
  onSendMessage: (content: string, options?: {
    repliedToId?: string
    metadata?: Record<string, any>
  }) => void
  onStartTyping: () => void
  onStopTyping: () => void
  onFileUploaded?: (file: any) => void
  onError?: (error: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MessageComposer({
  channelId,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  onFileUploaded,
  onError,
  placeholder = 'Type a message...',
  disabled = false,
  className = ''
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const draftSaveTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [])

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // Trigger typing indicator
    if (newContent.trim() && !isTyping) {
      setIsTyping(true)
      onStartTyping()
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        onStopTyping()
      }
    }, 3000)

    // Save draft after 1 second of inactivity
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current)
    }

    draftSaveTimeoutRef.current = setTimeout(() => {
      offlineChatService.saveDraft(channelId, newContent)
    }, 1000)

    // Auto-resize
    setTimeout(adjustTextareaHeight, 0)
  }

  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Send message
  const handleSend = () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || disabled) return

    onSendMessage(trimmedContent)
    setContent('')
    
    // Clear draft
    offlineChatService.clearDraft(channelId)
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      onStopTyping()
    }

    // Clear timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current)
    }

    // Reset textarea height
    setTimeout(adjustTextareaHeight, 0)
    
    // Focus back to textarea
    textareaRef.current?.focus()
  }

  // Handle blur (stop typing when user leaves input)
  const handleBlur = () => {
    if (isTyping) {
      setIsTyping(false)
      onStopTyping()
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  // Load draft on channel change
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftLoaded) {
        const draft = await offlineChatService.getDraft(channelId)
        if (draft && draft.content) {
          setContent(draft.content)
          setTimeout(adjustTextareaHeight, 0)
        }
        setDraftLoaded(true)
      }
    }

    loadDraft()
  }, [channelId, draftLoaded, adjustTextareaHeight])

  // Reset draft loaded state when channel changes
  useEffect(() => {
    setDraftLoaded(false)
    setContent('')
  }, [channelId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (draftSaveTimeoutRef.current) {
        clearTimeout(draftSaveTimeoutRef.current)
      }
    }
  }, [])

  // Initial textarea height adjustment
  useEffect(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  return (
    <div className={`border-t border-gray-200 bg-white ${className}`}>
      <div className="flex items-end space-x-3 p-4">
        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`
              w-full px-4 py-3 pr-12 text-sm border border-gray-300 rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-gray-100 disabled:cursor-not-allowed
              placeholder-gray-500
            `}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          {/* Character count (optional) */}
          {content.length > 1000 && (
            <div className="absolute bottom-2 right-14 text-xs text-gray-400">
              {content.length}/2000
            </div>
          )}

          {/* Formatting toolbar (optional) */}
          <div className="absolute bottom-2 right-2 flex items-center space-x-1">
            {/* Emoji picker button */}
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Add emoji"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* File attachment button */}
            <FileUpload
              channelId={channelId}
              onFileUploaded={onFileUploaded || (() => {})}
              onError={onError || (() => {})}
            />
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className={`
            p-3 rounded-lg transition-colors
            ${content.trim() && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
          title="Send message (Enter)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Typing indicator for current user */}
      {isTyping && (
        <div className="px-4 pb-2">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>Typing...</span>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="px-4 pb-2">
        <p className="text-xs text-gray-400">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to send, 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs ml-1">Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}