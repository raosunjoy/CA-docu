// WebSocket Server Infrastructure
// Handles real-time communication for chat, notifications, and live updates

import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verify } from 'jsonwebtoken'
import { prisma } from './prisma'
import type { JWTPayload, AuthUser } from '../types'

// Extended Socket interface with user data
interface AuthenticatedSocket extends Socket {
  user?: AuthUser
  organizationId?: string
}

// WebSocket event types
export interface WebSocketEvents {
  // Connection events
  'connection': () => void
  'disconnect': (reason: string) => void
  'error': (error: Error) => void
  
  // Authentication events
  'authenticate': (token: string) => void
  'authenticated': (user: AuthUser) => void
  'authentication_error': (error: string) => void
  
  // Chat events
  'join_channel': (channelId: string) => void
  'leave_channel': (channelId: string) => void
  'send_message': (data: SendMessageData) => void
  'message_sent': (message: ChatMessageWithUser) => void
  'new_message': (message: ChatMessageWithUser) => void
  'typing_start': (data: TypingData) => void
  'typing_stop': (data: TypingData) => void
  'user_typing': (data: TypingData) => void
  'message_edited': (data: EditMessageData) => void
  'message_deleted': (messageId: string) => void
  
  // Presence events
  'user_online': (userId: string) => void
  'user_offline': (userId: string) => void
  'presence_update': (data: PresenceData) => void
  
  // Channel events
  'channel_created': (channel: ChatChannelWithMembers) => void
  'channel_updated': (channel: ChatChannelWithMembers) => void
  'channel_deleted': (channelId: string) => void
  'user_joined_channel': (data: ChannelMembershipData) => void
  'user_left_channel': (data: ChannelMembershipData) => void
  
  // Notification events
  'notification': (notification: NotificationData) => void
  'task_updated': (task: any) => void
  'document_shared': (data: any) => void
}

// Data interfaces
export interface SendMessageData {
  channelId: string
  content: string
  messageType?: 'TEXT' | 'FILE' | 'TASK_REFERENCE' | 'EMAIL_REFERENCE'
  metadata?: Record<string, any>
  repliedToId?: string
}

export interface EditMessageData {
  messageId: string
  content: string
}

export interface TypingData {
  channelId: string
  userId: string
  userName: string
}

export interface PresenceData {
  userId: string
  status: 'online' | 'offline' | 'away'
  lastSeen?: Date
}

export interface ChannelMembershipData {
  channelId: string
  userId: string
  userName: string
}

export interface NotificationData {
  id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  userId: string
  createdAt: Date
}

export interface ChatMessageWithUser {
  id: string
  channelId: string
  content: string
  messageType: string
  metadata: Record<string, any>
  repliedToId?: string
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  repliedTo?: ChatMessageWithUser
}

export interface ChatChannelWithMembers {
  id: string
  organizationId: string
  name: string
  type: string
  metadata: Record<string, any>
  createdBy: string
  createdAt: Date
  updatedAt: Date
  members: Array<{
    id: string
    userId: string
    joinedAt: Date
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
      role: string
    }
  }>
}

class WebSocketServer {
  private io: SocketIOServer
  private connectedUsers = new Map<string, Set<string>>() // userId -> Set of socketIds
  private userPresence = new Map<string, PresenceData>()
  private typingUsers = new Map<string, Set<string>>() // channelId -> Set of userIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Socket connected: ${socket.id}`)

      // Handle authentication
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = verify(token, process.env.JWT_SECRET!) as JWTPayload
          
          // Fetch user details
          const user = await prisma.user.findUnique({
            where: { id: decoded.sub },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              organizationId: true,
              isActive: true
            }
          })

          if (!user || !user.isActive) {
            socket.emit('authentication_error', 'User not found or inactive')
            return
          }

          // Store user data in socket
          socket.user = user
          socket.organizationId = user.organizationId

          // Track connected user
          if (!this.connectedUsers.has(user.id)) {
            this.connectedUsers.set(user.id, new Set())
          }
          this.connectedUsers.get(user.id)!.add(socket.id)

          // Update presence
          this.updateUserPresence(user.id, 'online')

          // Join organization room
          socket.join(`org:${user.organizationId}`)

          // Join user's channels
          await this.joinUserChannels(socket)

          socket.emit('authenticated', user)
          console.log(`User authenticated: ${user.email} (${user.id})`)

        } catch (error) {
          console.error('Authentication error:', error)
          socket.emit('authentication_error', 'Invalid token')
        }
      })

      // Chat event handlers
      this.setupChatHandlers(socket)
      
      // Presence handlers
      this.setupPresenceHandlers(socket)

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason)
      })

      // Handle errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error)
      })
    })
  }

  private setupChatHandlers(socket: AuthenticatedSocket) {
    // Join channel
    socket.on('join_channel', async (channelId: string) => {
      if (!socket.user) return

      try {
        // Verify user has access to channel
        const membership = await prisma.chatChannelMember.findUnique({
          where: {
            channelId_userId: {
              channelId,
              userId: socket.user.id
            }
          }
        })

        if (!membership) {
          socket.emit('error', 'Access denied to channel')
          return
        }

        socket.join(`channel:${channelId}`)
        console.log(`User ${socket.user.id} joined channel ${channelId}`)

      } catch (error) {
        console.error('Error joining channel:', error)
        socket.emit('error', 'Failed to join channel')
      }
    })

    // Leave channel
    socket.on('leave_channel', (channelId: string) => {
      socket.leave(`channel:${channelId}`)
      
      // Stop typing if user was typing
      if (socket.user) {
        this.handleStopTyping(channelId, socket.user.id)
      }
    })

    // Send message
    socket.on('send_message', async (data: SendMessageData) => {
      if (!socket.user) return

      try {
        // Verify user has access to channel
        const membership = await prisma.chatChannelMember.findUnique({
          where: {
            channelId_userId: {
              channelId: data.channelId,
              userId: socket.user.id
            }
          }
        })

        if (!membership) {
          socket.emit('error', 'Access denied to channel')
          return
        }

        // Create message in database
        const message = await prisma.chatMessage.create({
          data: {
            channelId: data.channelId,
            userId: socket.user.id,
            content: data.content,
            messageType: data.messageType || 'TEXT',
            metadata: data.metadata || {},
            repliedToId: data.repliedToId
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            },
            repliedTo: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true
                  }
                }
              }
            }
          }
        })

        // Stop typing indicator
        this.handleStopTyping(data.channelId, socket.user.id)

        // Broadcast message to channel members
        this.io.to(`channel:${data.channelId}`).emit('new_message', message)

        // Send confirmation to sender
        socket.emit('message_sent', message)

        console.log(`Message sent in channel ${data.channelId} by user ${socket.user.id}`)

      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', 'Failed to send message')
      }
    })

    // Edit message
    socket.on('message_edited', async (data: EditMessageData) => {
      if (!socket.user) return

      try {
        // Verify user owns the message
        const message = await prisma.chatMessage.findUnique({
          where: { id: data.messageId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        })

        if (!message || message.userId !== socket.user.id) {
          socket.emit('error', 'Cannot edit this message')
          return
        }

        // Update message
        const updatedMessage = await prisma.chatMessage.update({
          where: { id: data.messageId },
          data: { 
            content: data.content,
            updatedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true
              }
            }
          }
        })

        // Broadcast update to channel
        this.io.to(`channel:${message.channelId}`).emit('message_edited', updatedMessage)

      } catch (error) {
        console.error('Error editing message:', error)
        socket.emit('error', 'Failed to edit message')
      }
    })

    // Delete message
    socket.on('message_deleted', async (messageId: string) => {
      if (!socket.user) return

      try {
        // Verify user owns the message or has admin rights
        const message = await prisma.chatMessage.findUnique({
          where: { id: messageId }
        })

        if (!message || (message.userId !== socket.user.id && socket.user.role !== 'ADMIN')) {
          socket.emit('error', 'Cannot delete this message')
          return
        }

        // Delete message
        await prisma.chatMessage.delete({
          where: { id: messageId }
        })

        // Broadcast deletion to channel
        this.io.to(`channel:${message.channelId}`).emit('message_deleted', messageId)

      } catch (error) {
        console.error('Error deleting message:', error)
        socket.emit('error', 'Failed to delete message')
      }
    })

    // Typing indicators
    socket.on('typing_start', (data: TypingData) => {
      if (!socket.user) return

      this.handleStartTyping(data.channelId, socket.user.id, socket.user.firstName + ' ' + socket.user.lastName)
    })

    socket.on('typing_stop', (data: TypingData) => {
      if (!socket.user) return

      this.handleStopTyping(data.channelId, socket.user.id)
    })
  }

  private setupPresenceHandlers(socket: AuthenticatedSocket) {
    // Handle presence updates
    socket.on('presence_update', (data: PresenceData) => {
      if (!socket.user) return

      this.updateUserPresence(socket.user.id, data.status)
    })
  }

  private async joinUserChannels(socket: AuthenticatedSocket) {
    if (!socket.user) return

    try {
      // Get user's channels
      const memberships = await prisma.chatChannelMember.findMany({
        where: { userId: socket.user.id },
        select: { channelId: true }
      })

      // Join all channels
      for (const membership of memberships) {
        socket.join(`channel:${membership.channelId}`)
      }

      console.log(`User ${socket.user.id} joined ${memberships.length} channels`)

    } catch (error) {
      console.error('Error joining user channels:', error)
    }
  }

  private handleStartTyping(channelId: string, userId: string, userName: string) {
    if (!this.typingUsers.has(channelId)) {
      this.typingUsers.set(channelId, new Set())
    }

    const typingInChannel = this.typingUsers.get(channelId)!
    if (!typingInChannel.has(userId)) {
      typingInChannel.add(userId)
      
      // Broadcast typing indicator to other users in channel
      this.io.to(`channel:${channelId}`).emit('user_typing', {
        channelId,
        userId,
        userName
      })
    }

    // Auto-stop typing after 3 seconds
    setTimeout(() => {
      this.handleStopTyping(channelId, userId)
    }, 3000)
  }

  private handleStopTyping(channelId: string, userId: string) {
    const typingInChannel = this.typingUsers.get(channelId)
    if (typingInChannel && typingInChannel.has(userId)) {
      typingInChannel.delete(userId)
      
      // Broadcast stop typing to channel
      this.io.to(`channel:${channelId}`).emit('typing_stop', {
        channelId,
        userId
      })
    }
  }

  private updateUserPresence(userId: string, status: 'online' | 'offline' | 'away') {
    const presenceData: PresenceData = {
      userId,
      status,
      lastSeen: status === 'offline' ? new Date() : undefined
    }

    this.userPresence.set(userId, presenceData)

    // Broadcast presence update to organization
    const userSockets = this.connectedUsers.get(userId)
    if (userSockets && userSockets.size > 0) {
      const socket = this.io.sockets.sockets.get(Array.from(userSockets)[0]) as AuthenticatedSocket
      if (socket?.organizationId) {
        this.io.to(`org:${socket.organizationId}`).emit('presence_update', presenceData)
      }
    }
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string) {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`)

    if (socket.user) {
      const userSockets = this.connectedUsers.get(socket.user.id)
      if (userSockets) {
        userSockets.delete(socket.id)
        
        // If no more sockets for this user, mark as offline
        if (userSockets.size === 0) {
          this.connectedUsers.delete(socket.user.id)
          this.updateUserPresence(socket.user.id, 'offline')
        }
      }

      // Clear typing indicators for all channels
      for (const [channelId, typingUsers] of this.typingUsers.entries()) {
        if (typingUsers.has(socket.user.id)) {
          this.handleStopTyping(channelId, socket.user.id)
        }
      }
    }
  }

  // Public methods for external use
  public sendNotification(userId: string, notification: NotificationData) {
    const userSockets = this.connectedUsers.get(userId)
    if (userSockets) {
      for (const socketId of userSockets) {
        this.io.to(socketId).emit('notification', notification)
      }
    }
  }

  public broadcastToOrganization(organizationId: string, event: string, data: any) {
    this.io.to(`org:${organizationId}`).emit(event, data)
  }

  public broadcastToChannel(channelId: string, event: string, data: any) {
    this.io.to(`channel:${channelId}`).emit(event, data)
  }

  public getUserPresence(userId: string): PresenceData | undefined {
    return this.userPresence.get(userId)
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys())
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId)
  }
}

// Singleton instance
let webSocketServer: WebSocketServer | null = null

export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  if (!webSocketServer) {
    webSocketServer = new WebSocketServer(httpServer)
  }
  return webSocketServer
}

export function getWebSocketServer(): WebSocketServer | null {
  return webSocketServer
}

export default WebSocketServer