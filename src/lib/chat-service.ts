// Chat Service
// Handles chat channel management, messaging, and related operations

import { prisma } from './prisma'
import { getWebSocketServer } from './websocket-server'
import type { 
  ChatChannel, 
  ChatMessage, 
  ChatChannelMember, 
  User,
  ChannelType,
  MessageType 
} from '../types'

// Extended types for chat operations
export interface CreateChannelData {
  name: string
  type: ChannelType
  organizationId: string
  createdBy: string
  memberIds?: string[]
  metadata?: Record<string, any>
}

export interface UpdateChannelData {
  name?: string
  metadata?: Record<string, any>
}

export interface ChannelFilters {
  type?: ChannelType[]
  userId?: string
  search?: string
  includeArchived?: boolean
}

export interface MessageFilters {
  channelId: string
  userId?: string
  messageType?: MessageType[]
  search?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface ChatChannelWithDetails extends ChatChannel {
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
  _count: {
    messages: number
    members: number
  }
  lastMessage?: {
    id: string
    content: string
    createdAt: Date
    user: {
      firstName: string
      lastName: string
    }
  }
}

export interface ChatMessageWithDetails extends ChatMessage {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
  repliedTo?: {
    id: string
    content: string
    user: {
      firstName: string
      lastName: string
    }
  }
  reactions?: Array<{
    emoji: string
    count: number
    users: string[]
  }>
}

class ChatService {
  // Channel Management
  async createChannel(data: CreateChannelData): Promise<ChatChannelWithDetails> {
    const channel = await prisma.chatChannel.create({
      data: {
        name: data.name,
        type: data.type,
        organizationId: data.organizationId,
        createdBy: data.createdBy,
        metadata: data.metadata || {}
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    })

    // Add creator as member
    await this.addChannelMember(channel.id, data.createdBy)

    // Add additional members if specified
    if (data.memberIds && data.memberIds.length > 0) {
      for (const memberId of data.memberIds) {
        if (memberId !== data.createdBy) {
          await this.addChannelMember(channel.id, memberId)
        }
      }
    }

    // Fetch updated channel with members
    const updatedChannel = await this.getChannelById(channel.id)
    if (!updatedChannel) {
      throw new Error('Failed to create channel')
    }

    // Broadcast channel creation to organization
    const wsServer = getWebSocketServer()
    if (wsServer) {
      wsServer.broadcastToOrganization(data.organizationId, 'channel_created', updatedChannel)
    }

    return updatedChannel
  }

  async updateChannel(channelId: string, data: UpdateChannelData, userId: string): Promise<ChatChannelWithDetails> {
    // Verify user has permission to update channel
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId }
        }
      }
    })

    if (!channel) {
      throw new Error('Channel not found')
    }

    if (channel.createdBy !== userId && channel.members.length === 0) {
      throw new Error('Permission denied')
    }

    const updatedChannel = await prisma.chatChannel.update({
      where: { id: channelId },
      data: {
        name: data.name,
        metadata: data.metadata,
        updatedAt: new Date()
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    })

    // Broadcast update to channel members
    const wsServer = getWebSocketServer()
    if (wsServer) {
      wsServer.broadcastToChannel(channelId, 'channel_updated', updatedChannel)
    }

    return updatedChannel
  }

  async deleteChannel(channelId: string, userId: string): Promise<void> {
    // Verify user has permission to delete channel
    const channel = await prisma.chatChannel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      throw new Error('Channel not found')
    }

    if (channel.createdBy !== userId) {
      throw new Error('Permission denied')
    }

    // Delete channel and all related data (cascade)
    await prisma.chatChannel.delete({
      where: { id: channelId }
    })

    // Broadcast deletion to organization
    const wsServer = getWebSocketServer()
    if (wsServer) {
      wsServer.broadcastToOrganization(channel.organizationId, 'channel_deleted', channelId)
    }
  }

  async getChannelById(channelId: string): Promise<ChatChannelWithDetails | null> {
    return await prisma.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    }).then(channel => {
      if (!channel) return null
      
      return {
        ...channel,
        lastMessage: channel.messages[0] || undefined
      }
    })
  }

  async getUserChannels(userId: string, organizationId: string, filters?: ChannelFilters): Promise<ChatChannelWithDetails[]> {
    const whereClause: any = {
      organizationId,
      members: {
        some: { userId }
      }
    }

    if (filters?.type && filters.type.length > 0) {
      whereClause.type = { in: filters.type }
    }

    if (filters?.search) {
      whereClause.name = {
        contains: filters.search,
        mode: 'insensitive'
      }
    }

    const channels = await prisma.chatChannel.findMany({
      where: whereClause,
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    })

    return channels.map(channel => ({
      ...channel,
      lastMessage: channel.messages[0] || undefined
    }))
  }

  async getOrganizationChannels(organizationId: string, filters?: ChannelFilters): Promise<ChatChannelWithDetails[]> {
    const whereClause: any = { organizationId }

    if (filters?.type && filters.type.length > 0) {
      whereClause.type = { in: filters.type }
    }

    if (filters?.search) {
      whereClause.name = {
        contains: filters.search,
        mode: 'insensitive'
      }
    }

    return await prisma.chatChannel.findMany({
      where: whereClause,
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    }).then(channels => 
      channels.map(channel => ({
        ...channel,
        lastMessage: channel.messages[0] || undefined
      }))
    )
  }

  // Channel Membership Management
  async addChannelMember(channelId: string, userId: string): Promise<void> {
    // Check if user is already a member
    const existingMember = await prisma.chatChannelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId
        }
      }
    })

    if (existingMember) {
      return // Already a member
    }

    // Add member
    await prisma.chatChannelMember.create({
      data: {
        channelId,
        userId
      }
    })

    // Get user details for broadcast
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    })

    if (user) {
      // Broadcast to channel
      const wsServer = getWebSocketServer()
      if (wsServer) {
        wsServer.broadcastToChannel(channelId, 'user_joined_channel', {
          channelId,
          userId,
          userName: `${user.firstName} ${user.lastName}`
        })
      }
    }
  }

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    await prisma.chatChannelMember.delete({
      where: {
        channelId_userId: {
          channelId,
          userId
        }
      }
    })

    // Get user details for broadcast
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true
      }
    })

    if (user) {
      // Broadcast to channel
      const wsServer = getWebSocketServer()
      if (wsServer) {
        wsServer.broadcastToChannel(channelId, 'user_left_channel', {
          channelId,
          userId,
          userName: `${user.firstName} ${user.lastName}`
        })
      }
    }
  }

  async getChannelMembers(channelId: string): Promise<Array<{
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
  }>> {
    return await prisma.chatChannelMember.findMany({
      where: { channelId },
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
      },
      orderBy: { joinedAt: 'asc' }
    })
  }

  async isChannelMember(channelId: string, userId: string): Promise<boolean> {
    const member = await prisma.chatChannelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId
        }
      }
    })
    return !!member
  }

  // Message Management
  async getChannelMessages(filters: MessageFilters): Promise<{
    messages: ChatMessageWithDetails[]
    hasMore: boolean
    total: number
  }> {
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    const whereClause: any = {
      channelId: filters.channelId
    }

    if (filters.userId) {
      whereClause.userId = filters.userId
    }

    if (filters.messageType && filters.messageType.length > 0) {
      whereClause.messageType = { in: filters.messageType }
    }

    if (filters.search) {
      whereClause.content = {
        contains: filters.search,
        mode: 'insensitive'
      }
    }

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate
      }
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: whereClause,
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
            select: {
              id: true,
              content: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.chatMessage.count({ where: whereClause })
    ])

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      hasMore: offset + limit < total,
      total
    }
  }

  async searchMessages(organizationId: string, query: string, filters?: {
    channelIds?: string[]
    userId?: string
    messageType?: MessageType[]
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<ChatMessageWithDetails[]> {
    const whereClause: any = {
      channel: {
        organizationId
      },
      content: {
        contains: query,
        mode: 'insensitive'
      }
    }

    if (filters?.channelIds && filters.channelIds.length > 0) {
      whereClause.channelId = { in: filters.channelIds }
    }

    if (filters?.userId) {
      whereClause.userId = filters.userId
    }

    if (filters?.messageType && filters.messageType.length > 0) {
      whereClause.messageType = { in: filters.messageType }
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {}
      if (filters.startDate) {
        whereClause.createdAt.gte = filters.startDate
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = filters.endDate
      }
    }

    return await prisma.chatMessage.findMany({
      where: whereClause,
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
          select: {
            id: true,
            content: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100
    })
  }

  // Direct Message Channels
  async getOrCreateDirectChannel(userId1: string, userId2: string, organizationId: string): Promise<ChatChannelWithDetails> {
    // Check if direct channel already exists between these users
    const existingChannel = await prisma.chatChannel.findFirst({
      where: {
        organizationId,
        type: 'DIRECT',
        members: {
          every: {
            userId: { in: [userId1, userId2] }
          }
        },
        _count: {
          members: 2
        }
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    })

    if (existingChannel) {
      return existingChannel
    }

    // Create new direct channel
    const user2 = await prisma.user.findUnique({
      where: { id: userId2 },
      select: { firstName: true, lastName: true }
    })

    const channelName = `Direct: ${user2?.firstName} ${user2?.lastName}`

    return await this.createChannel({
      name: channelName,
      type: 'DIRECT',
      organizationId,
      createdBy: userId1,
      memberIds: [userId2],
      metadata: { isDirect: true }
    })
  }

  // Channel Discovery
  async getPublicChannels(organizationId: string, userId: string): Promise<ChatChannelWithDetails[]> {
    return await prisma.chatChannel.findMany({
      where: {
        organizationId,
        type: { in: ['GROUP', 'TASK'] },
        NOT: {
          members: {
            some: { userId }
          }
        }
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      },
      orderBy: [
        { _count: { members: 'desc' } },
        { createdAt: 'desc' }
      ]
    }).then(channels => 
      channels.map(channel => ({
        ...channel,
        lastMessage: undefined
      }))
    )
  }

  // Task-specific channels
  async getOrCreateTaskChannel(taskId: string, organizationId: string, createdBy: string): Promise<ChatChannelWithDetails> {
    // Check if task channel already exists
    const existingChannel = await prisma.chatChannel.findFirst({
      where: {
        organizationId,
        type: 'TASK',
        metadata: {
          path: ['taskId'],
          equals: taskId
        }
      },
      include: {
        members: {
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
        },
        _count: {
          select: {
            messages: true,
            members: true
          }
        }
      }
    })

    if (existingChannel) {
      return existingChannel
    }

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, assignedTo: true, createdBy: true }
    })

    if (!task) {
      throw new Error('Task not found')
    }

    const channelName = `Task: ${task.title}`
    const memberIds = [task.assignedTo, task.createdBy].filter((id): id is string => !!id && id !== createdBy)

    return await this.createChannel({
      name: channelName,
      type: 'TASK',
      organizationId,
      createdBy,
      memberIds,
      metadata: { taskId, isTaskChannel: true }
    })
  }
}

export const chatService = new ChatService()
export default chatService