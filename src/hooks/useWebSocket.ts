// WebSocket Hook
// Manages WebSocket connection and real-time chat functionality

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { offlineChatService } from '../lib/offline-chat-service'
import type { 
  WebSocketEvents, 
  ChatMessageWithUser, 
  PresenceData, 
  TypingData,
  NotificationData 
} from '../lib/websocket-server'

interface UseWebSocketReturn {
  socket: Socket | null
  isConnected: boolean
  isAuthenticated: boolean
  connect: () => void
  disconnect: () => void
  joinChannel: (channelId: string) => void
  leaveChannel: (channelId: string) => void
  sendMessage: (channelId: string, content: string, options?: {
    messageType?: string
    repliedToId?: string
    metadata?: Record<string, any>
  }) => void
  startTyping: (channelId: string) => void
  stopTyping: (channelId: string) => void
  onMessage: (callback: (message: ChatMessageWithUser) => void) => () => void
  onTyping: (callback: (data: TypingData) => void) => () => void
  onPresenceUpdate: (callback: (data: PresenceData) => void) => () => void
  onNotification: (callback: (notification: NotificationData) => void) => () => void
  onChannelUpdate: (callback: (event: string, data: any) => void) => () => void
}

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})

  const connect = useCallback(() => {
    if (socket?.connected) return

    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = undefined
      }

      // Authenticate with JWT token
      const token = localStorage.getItem('auth_token')
      if (token) {
        newSocket.emit('authenticate', token)
      }

      // Sync offline messages when reconnected
      offlineChatService.syncOfflineMessages()
    })

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setIsConnected(false)
      setIsAuthenticated(false)

      // Auto-reconnect after delay (unless manually disconnected)
      if (reason !== 'io client disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, 3000)
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
      setIsAuthenticated(false)
    })

    // Authentication event handlers
    newSocket.on('authenticated', (user) => {
      console.log('WebSocket authenticated:', user)
      setIsAuthenticated(true)
    })

    newSocket.on('authentication_error', (error) => {
      console.error('WebSocket authentication error:', error)
      setIsAuthenticated(false)
      
      // Try to refresh token or redirect to login
      // This would depend on your auth implementation
    })

    setSocket(newSocket)
  }, [socket])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }

    // Clear all typing timeouts
    Object.values(typingTimeoutRef.current).forEach(timeout => {
      clearTimeout(timeout)
    })
    typingTimeoutRef.current = {}

    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
    setIsConnected(false)
    setIsAuthenticated(false)
  }, [socket])

  const joinChannel = useCallback((channelId: string) => {
    if (socket && isAuthenticated) {
      socket.emit('join_channel', channelId)
    }
  }, [socket, isAuthenticated])

  const leaveChannel = useCallback((channelId: string) => {
    if (socket && isAuthenticated) {
      socket.emit('leave_channel', channelId)
    }
  }, [socket, isAuthenticated])

  const sendMessage = useCallback(async (
    channelId: string, 
    content: string, 
    options?: {
      messageType?: string
      repliedToId?: string
      metadata?: Record<string, any>
    }
  ) => {
    if (socket && isAuthenticated && isConnected) {
      // Send via WebSocket if online
      socket.emit('send_message', {
        channelId,
        content,
        messageType: options?.messageType || 'TEXT',
        repliedToId: options?.repliedToId,
        metadata: options?.metadata
      })
    } else {
      // Queue for offline sending
      await offlineChatService.sendMessage(channelId, content, {
        messageType: options?.messageType,
        repliedToId: options?.repliedToId,
        metadata: options?.metadata
      })
    }
  }, [socket, isAuthenticated, isConnected])

  const startTyping = useCallback((channelId: string) => {
    if (socket && isAuthenticated) {
      socket.emit('typing_start', { channelId })
      
      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current[channelId]) {
        clearTimeout(typingTimeoutRef.current[channelId])
      }
      
      typingTimeoutRef.current[channelId] = setTimeout(() => {
        stopTyping(channelId)
      }, 3000)
    }
  }, [socket, isAuthenticated])

  const stopTyping = useCallback((channelId: string) => {
    if (socket && isAuthenticated) {
      socket.emit('typing_stop', { channelId })
      
      if (typingTimeoutRef.current[channelId]) {
        clearTimeout(typingTimeoutRef.current[channelId])
        delete typingTimeoutRef.current[channelId]
      }
    }
  }, [socket, isAuthenticated])

  // Event listener helpers
  const onMessage = useCallback((callback: (message: ChatMessageWithUser) => void) => {
    if (!socket) return () => {}

    const handler = (message: ChatMessageWithUser) => {
      callback(message)
    }

    socket.on('new_message', handler)
    return () => socket.off('new_message', handler)
  }, [socket])

  const onTyping = useCallback((callback: (data: TypingData) => void) => {
    if (!socket) return () => {}

    const startHandler = (data: TypingData) => {
      callback({ ...data, isTyping: true } as TypingData & { isTyping: boolean })
    }

    const stopHandler = (data: TypingData) => {
      callback({ ...data, isTyping: false } as TypingData & { isTyping: boolean })
    }

    socket.on('user_typing', startHandler)
    socket.on('typing_stop', stopHandler)
    
    return () => {
      socket.off('user_typing', startHandler)
      socket.off('typing_stop', stopHandler)
    }
  }, [socket])

  const onPresenceUpdate = useCallback((callback: (data: PresenceData) => void) => {
    if (!socket) return () => {}

    socket.on('presence_update', callback)
    return () => socket.off('presence_update', callback)
  }, [socket])

  const onNotification = useCallback((callback: (notification: NotificationData) => void) => {
    if (!socket) return () => {}

    socket.on('notification', callback)
    return () => socket.off('notification', callback)
  }, [socket])

  const onChannelUpdate = useCallback((callback: (event: string, data: any) => void) => {
    if (!socket) return () => {}

    const events = [
      'channel_created',
      'channel_updated', 
      'channel_deleted',
      'user_joined_channel',
      'user_left_channel',
      'message_edited',
      'message_deleted'
    ]

    const handlers = events.map(event => {
      const handler = (data: any) => callback(event, data)
      socket.on(event, handler)
      return { event, handler }
    })

    return () => {
      handlers.forEach(({ event, handler }) => {
        socket.off(event, handler)
      })
    }
  }, [socket])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    socket,
    isConnected,
    isAuthenticated,
    connect,
    disconnect,
    joinChannel,
    leaveChannel,
    sendMessage,
    startTyping,
    stopTyping,
    onMessage,
    onTyping,
    onPresenceUpdate,
    onNotification,
    onChannelUpdate
  }
}