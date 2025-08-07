'use client'

import React, { useState, useEffect } from 'react'
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface Message {
  id: string
  subject?: string
  content: string
  fromClient: boolean
  fromUserId?: string
  isRead: boolean
  readAt?: string
  sentAt: string
  replies: Message[]
}

interface ClientMessagesProps {
  onMessageSent?: () => void
}

export default function ClientMessages({ onMessageSent }: ClientMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [newMessageContent, setNewMessageContent] = useState('')
  const [newMessageSubject, setNewMessageSubject] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const response = await fetch('/api/client-portal/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (content: string, subject?: string, parentId?: string) => {
    if (!content.trim()) return

    setIsSending(true)
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const response = await fetch('/api/client-portal/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content.trim(),
          subject: subject?.trim(),
          parentId
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (parentId) {
          // Update the selected message with the new reply
          setSelectedMessage(prev => prev ? {
            ...prev,
            replies: [...prev.replies, data.data]
          } : null)
          setReplyContent('')
        } else {
          // Add new message to the list
          setMessages(prev => [data.data, ...prev])
          setNewMessageContent('')
          setNewMessageSubject('')
          setShowNewMessage(false)
        }
        
        onMessageSent?.()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem('clientToken')
      if (!token) return

      const response = await fetch(`/api/client-portal/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        ))
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error)
    }
  }

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message)
    if (!message.isRead && !message.fromClient) {
      markAsRead(message.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-[600px] bg-white shadow rounded-lg overflow-hidden">
      {/* Messages List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Messages</h3>
            <button
              onClick={() => setShowNewMessage(true)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
            >
              New Message
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {messages.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedMessage?.id === message.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {message.fromClient ? (
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">You</span>
                        </div>
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {message.fromClient ? 'You' : 'CA Firm'}
                        </p>
                        <div className="flex items-center space-x-1">
                          {!message.isRead && !message.fromClient && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                          )}
                          <p className="text-xs text-gray-500">
                            {formatDate(message.sentAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {message.subject || 'No Subject'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {message.content}
                      </p>
                      {message.replies.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages</h3>
              <p className="mt-1 text-sm text-gray-500">Start a conversation with your CA firm</p>
              <button
                onClick={() => setShowNewMessage(true)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Send Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className="flex-1 flex flex-col">
        {showNewMessage ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">New Message</h3>
                <button
                  onClick={() => setShowNewMessage(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={newMessageSubject}
                  onChange={(e) => setNewMessageSubject(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter message subject"
                />
              </div>
              
              <div className="flex-1">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  id="content"
                  rows={10}
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Type your message here..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowNewMessage(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => sendMessage(newMessageContent, newMessageSubject)}
                  disabled={!newMessageContent.trim() || isSending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : selectedMessage ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedMessage.subject || 'No Subject'}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedMessage.fromClient ? 'You' : 'CA Firm'} • {formatDate(selectedMessage.sentAt)}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Original Message */}
              <div className={`p-4 rounded-lg ${
                selectedMessage.fromClient ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {selectedMessage.fromClient ? (
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">You</span>
                      </div>
                    ) : (
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedMessage.fromClient ? 'You' : 'CA Firm'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(selectedMessage.sentAt)}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                      {selectedMessage.content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {selectedMessage.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`p-4 rounded-lg ${
                    reply.fromClient ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {reply.fromClient ? (
                        <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">You</span>
                        </div>
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {reply.fromClient ? 'You' : 'CA Firm'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(reply.sentAt)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Reply Form */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    rows={3}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Type your reply..."
                  />
                </div>
                <button
                  onClick={() => sendMessage(replyContent, undefined, selectedMessage.id)}
                  disabled={!replyContent.trim() || isSending}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <PaperAirplaneIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Select a message</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a message from the list to view the conversation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}