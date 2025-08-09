// Notification Service
// Handles push notifications, in-app notifications, and notification preferences

import { getWebSocketServer, type NotificationData } from './websocket-server'

export interface NotificationPreferences {
  mentions: boolean
  directMessages: boolean
  channelMessages: boolean
  taskUpdates: boolean
  documentShares: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  soundEnabled: boolean
  desktopNotifications: boolean
  quietHours: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string   // HH:mm format
  }
  channels: {
    [channelId: string]: {
      muted: boolean
      mentions: boolean
    }
  }
}

export interface NotificationRecord {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

class NotificationService {
  private defaultPreferences: NotificationPreferences = {
    mentions: true,
    directMessages: true,
    channelMessages: true,
    taskUpdates: true,
    documentShares: true,
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
    desktopNotifications: true,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    },
    channels: {}
  }

  // Send notification to user
  async sendNotification(
    userId: string,
    notification: Omit<NotificationData, 'id' | 'userId' | 'createdAt'>
  ): Promise<void> {
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(userId)
      if (!this.shouldSendNotification(notification.type, preferences)) {
        return
      }

      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        return
      }

      const notificationData: NotificationData = {
        id: crypto.randomUUID(),
        userId,
        createdAt: new Date(),
        ...notification
      }

      // Store notification in database
      await this.storeNotification(notificationData)

      // Send real-time notification via WebSocket
      const wsServer = getWebSocketServer()
      if (wsServer) {
        wsServer.sendNotification(userId, notificationData)
      }

      // Send push notification if enabled
      if (preferences.pushNotifications) {
        await this.sendPushNotification(userId, notificationData)
      }

      // Send desktop notification if enabled and user is online
      if (preferences.desktopNotifications && wsServer?.isUserOnline(userId)) {
        await this.sendDesktopNotification(userId, notificationData)
      }

    } catch (error) {
      console.error('Error sending notification:', error)
    }
  }

  // Send notification for chat mentions
  async sendMentionNotification(
    userId: string,
    channelId: string,
    channelName: string,
    mentionedBy: string,
    mentionedByName: string,
    messageContent: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: 'chat_mention',
      title: `${mentionedByName} mentioned you`,
      message: `In ${channelName}: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
      data: {
        channelId,
        channelName,
        mentionedBy,
        mentionedByName,
        messageContent
      }
    })
  }

  // Send notification for direct messages
  async sendDirectMessageNotification(
    userId: string,
    channelId: string,
    senderName: string,
    messageContent: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: 'direct_message',
      title: `New message from ${senderName}`,
      message: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
      data: {
        channelId,
        senderName,
        messageContent
      }
    })
  }

  // Send notification for task updates
  async sendTaskUpdateNotification(
    userId: string,
    taskId: string,
    taskTitle: string,
    updateType: string,
    updatedBy: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: 'task_update',
      title: 'Task Updated',
      message: `${updatedBy} ${updateType} "${taskTitle}"`,
      data: {
        taskId,
        taskTitle,
        updateType,
        updatedBy
      }
    })
  }

  // Send notification for document shares
  async sendDocumentShareNotification(
    userId: string,
    documentId: string,
    documentName: string,
    sharedBy: string
  ): Promise<void> {
    await this.sendNotification(userId, {
      type: 'document_share',
      title: 'Document Shared',
      message: `${sharedBy} shared "${documentName}" with you`,
      data: {
        documentId,
        documentName,
        sharedBy
      }
    })
  }

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { prisma } = await import('./prisma')
      
      const userPrefs = await prisma.notificationPreferences.findUnique({
        where: { userId }
      })

      if (userPrefs) {
        return {
          ...this.defaultPreferences,
          ...userPrefs.preferences as NotificationPreferences
        }
      }

      return this.defaultPreferences
    } catch (error) {
      console.error('Error getting user preferences:', error)
      return this.defaultPreferences
    }
  }

  // Update user notification preferences
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      const currentPrefs = await this.getUserPreferences(userId)
      const updatedPrefs = { ...currentPrefs, ...preferences }

      await prisma.notificationPreferences.upsert({
        where: { userId },
        update: {
          preferences: updatedPrefs
        },
        create: {
          userId,
          preferences: updatedPrefs
        }
      })
    } catch (error) {
      console.error('Error updating user preferences:', error)
      throw error
    }
  }

  // Get user notifications
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      type?: string
    } = {}
  ): Promise<{ notifications: NotificationRecord[]; total: number; unreadCount: number }> {
    try {
      const { prisma } = await import('./prisma')
      
      const { limit = 50, offset = 0, unreadOnly = false, type } = options

      const whereClause: any = { userId }
      
      if (unreadOnly) {
        whereClause.read = false
      }
      
      if (type) {
        whereClause.type = type
      }

      // Don't show expired notifications
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.notification.count({ where: whereClause }),
        prisma.notification.count({
          where: {
            userId,
            read: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          }
        })
      ])

      return {
        notifications: notifications.map(n => ({
          id: n.id,
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data as Record<string, any>,
          read: n.read,
          createdAt: n.createdAt,
          expiresAt: n.expiresAt
        })),
        total,
        unreadCount
      }
    } catch (error) {
      console.error('Error getting user notifications:', error)
      throw error
    }
  }

  // Mark notifications as read
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      throw error
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Delete notifications
  async deleteNotifications(userId: string, notificationIds: string[]): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      await prisma.notification.deleteMany({
        where: {
          id: { in: notificationIds },
          userId
        }
      })
    } catch (error) {
      console.error('Error deleting notifications:', error)
      throw error
    }
  }

  // Private helper methods
  private shouldSendNotification(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'chat_mention':
        return preferences.mentions
      case 'direct_message':
        return preferences.directMessages
      case 'channel_message':
        return preferences.channelMessages
      case 'task_update':
        return preferences.taskUpdates
      case 'document_share':
        return preferences.documentShares
      default:
        return true
    }
  }

  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [startHour, startMin] = preferences.quietHours.startTime.split(':').map(Number)
    const [endHour, endMin] = preferences.quietHours.endTime.split(':').map(Number)
    
    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime <= endTime) {
      // Same day quiet hours (e.g., 14:00 to 18:00)
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  private async storeNotification(notification: NotificationData): Promise<void> {
    try {
      const { prisma } = await import('./prisma')
      
      await prisma.notification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data || {},
          read: false,
          createdAt: notification.createdAt,
          expiresAt: notification.data?.expiresAt ? new Date(notification.data.expiresAt) : null
        }
      })
    } catch (error) {
      console.error('Error storing notification:', error)
    }
  }

  private async sendPushNotification(userId: string, notification: NotificationData): Promise<void> {
    try {
      // Get user's push subscription
      const { prisma } = await import('./prisma')
      
      const pushSubscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      })

      for (const subscription of pushSubscriptions) {
        try {
          // Send push notification using web-push or similar service
          // This would integrate with your push notification service
          console.log('Sending push notification:', {
            subscription: subscription.endpoint,
            notification
          })
        } catch (error) {
          console.error('Error sending push notification:', error)
        }
      }
    } catch (error) {
      console.error('Error getting push subscriptions:', error)
    }
  }

  private async sendDesktopNotification(userId: string, notification: NotificationData): Promise<void> {
    // Desktop notifications are handled on the client side
    // This method could trigger a WebSocket event to show desktop notification
    const wsServer = getWebSocketServer()
    if (wsServer) {
      wsServer.sendNotification(userId, {
        ...notification,
        type: 'desktop_notification'
      })
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService