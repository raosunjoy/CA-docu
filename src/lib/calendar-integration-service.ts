// Calendar Integration Service
// Handles integration with external calendar systems (Google Calendar, Outlook, etc.)

import { Task, TaskStatus, TaskPriority } from '@/types'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  recurrence?: string
  calendarId: string
  externalId?: string
}

export interface CalendarAccount {
  id: string
  userId: string
  provider: 'google' | 'outlook' | 'apple' | 'caldav'
  email: string
  displayName: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  isActive: boolean
  calendars: Calendar[]
}

export interface Calendar {
  id: string
  externalId: string
  name: string
  description?: string
  color?: string
  isDefault: boolean
  canWrite: boolean
  timeZone: string
}

export interface CalendarSyncResult {
  success: boolean
  eventsImported: number
  eventsExported: number
  tasksCreated: number
  tasksUpdated: number
  errors: string[]
}

export interface TaskCalendarMapping {
  taskId: string
  calendarEventId: string
  calendarId: string
  syncDirection: 'import' | 'export' | 'bidirectional'
  lastSyncAt: Date
}

class CalendarIntegrationService {
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL || ''

  // Account Management
  async connectCalendarAccount(provider: string, authCode: string): Promise<CalendarAccount> {
    const response = await fetch(`${this.baseUrl}/api/calendar/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, authCode })
    })

    if (!response.ok) {
      throw new Error('Failed to connect calendar account')
    }

    return response.json()
  }

  async getCalendarAccounts(): Promise<CalendarAccount[]> {
    const response = await fetch(`${this.baseUrl}/api/calendar/accounts`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch calendar accounts')
    }

    const data = await response.json()
    return data.data || []
  }

  async disconnectCalendarAccount(accountId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/calendar/accounts/${accountId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Failed to disconnect calendar account')
    }
  }

  async refreshCalendarAccount(accountId: string): Promise<CalendarAccount> {
    const response = await fetch(`${this.baseUrl}/api/calendar/accounts/${accountId}/refresh`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to refresh calendar account')
    }

    return response.json()
  }

  // Calendar Management
  async getCalendars(accountId: string): Promise<Calendar[]> {
    const response = await fetch(`${this.baseUrl}/api/calendar/accounts/${accountId}/calendars`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch calendars')
    }

    const data = await response.json()
    return data.data || []
  }

  async updateCalendarSettings(accountId: string, calendarId: string, settings: Partial<Calendar>): Promise<Calendar> {
    const response = await fetch(`${this.baseUrl}/api/calendar/accounts/${accountId}/calendars/${calendarId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })

    if (!response.ok) {
      throw new Error('Failed to update calendar settings')
    }

    return response.json()
  }

  // Event Management
  async getCalendarEvents(
    accountId: string, 
    calendarId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    const response = await fetch(
      `${this.baseUrl}/api/calendar/accounts/${accountId}/calendars/${calendarId}/events?${params}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch calendar events')
    }

    const data = await response.json()
    return data.data || []
  }

  async createCalendarEvent(
    accountId: string, 
    calendarId: string, 
    event: Omit<CalendarEvent, 'id' | 'calendarId'>
  ): Promise<CalendarEvent> {
    const response = await fetch(
      `${this.baseUrl}/api/calendar/accounts/${accountId}/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }
    )

    if (!response.ok) {
      throw new Error('Failed to create calendar event')
    }

    return response.json()
  }

  async updateCalendarEvent(
    accountId: string, 
    calendarId: string, 
    eventId: string, 
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const response = await fetch(
      `${this.baseUrl}/api/calendar/accounts/${accountId}/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }
    )

    if (!response.ok) {
      throw new Error('Failed to update calendar event')
    }

    return response.json()
  }

  async deleteCalendarEvent(accountId: string, calendarId: string, eventId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/calendar/accounts/${accountId}/calendars/${calendarId}/events/${eventId}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      throw new Error('Failed to delete calendar event')
    }
  }

  // Task-Calendar Integration
  async syncTaskToCalendar(
    taskId: string, 
    accountId: string, 
    calendarId: string,
    options?: {
      createEvent?: boolean
      updateExisting?: boolean
      syncDirection?: 'export' | 'bidirectional'
    }
  ): Promise<TaskCalendarMapping> {
    const response = await fetch(`${this.baseUrl}/api/calendar/sync/task-to-calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        accountId,
        calendarId,
        ...options
      })
    })

    if (!response.ok) {
      throw new Error('Failed to sync task to calendar')
    }

    return response.json()
  }

  async syncCalendarToTask(
    eventId: string, 
    accountId: string, 
    calendarId: string,
    options?: {
      createTask?: boolean
      updateExisting?: boolean
      syncDirection?: 'import' | 'bidirectional'
    }
  ): Promise<TaskCalendarMapping> {
    const response = await fetch(`${this.baseUrl}/api/calendar/sync/calendar-to-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        accountId,
        calendarId,
        ...options
      })
    })

    if (!response.ok) {
      throw new Error('Failed to sync calendar to task')
    }

    return response.json()
  }

  async bulkSyncCalendar(
    accountId: string, 
    calendarId: string,
    options: {
      startDate: Date
      endDate: Date
      syncDirection: 'import' | 'export' | 'bidirectional'
      createMissing?: boolean
      updateExisting?: boolean
    }
  ): Promise<CalendarSyncResult> {
    const response = await fetch(`${this.baseUrl}/api/calendar/sync/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        calendarId,
        startDate: options.startDate.toISOString(),
        endDate: options.endDate.toISOString(),
        syncDirection: options.syncDirection,
        createMissing: options.createMissing,
        updateExisting: options.updateExisting
      })
    })

    if (!response.ok) {
      throw new Error('Failed to perform bulk calendar sync')
    }

    return response.json()
  }

  // Task Conversion Utilities
  taskToCalendarEvent(task: Task, options?: { 
    duration?: number // in minutes
    location?: string
    attendees?: string[]
  }): Omit<CalendarEvent, 'id' | 'calendarId'> {
    const startTime = task.startDate ? new Date(task.startDate) : new Date()
    const duration = options?.duration || (task.estimatedHours ? task.estimatedHours * 60 : 60)
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000)

    return {
      title: task.title,
      description: this.formatTaskDescription(task),
      startTime,
      endTime,
      location: options?.location,
      attendees: options?.attendees || (task.assignedUser ? [task.assignedUser.email] : []),
      isAllDay: false
    }
  }

  calendarEventToTask(event: CalendarEvent): Omit<Task, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'> {
    const estimatedHours = Math.ceil((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60))

    return {
      title: event.title,
      description: event.description,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      startDate: event.startTime.toISOString(),
      dueDate: event.endTime.toISOString(),
      estimatedHours,
      assignedTo: undefined, // Would need to map attendees to users
      parentTaskId: undefined,
      lockedAt: undefined,
      lockedBy: undefined,
      actualHours: undefined,
      requiresApproval: false,
      approvalStatus: undefined,
      currentApprovalStep: undefined,
      isRecurring: false,
      recurringTaskId: undefined,
      instanceNumber: undefined,
      isAutoAssigned: false,
      autoAssignmentReason: undefined,
      escalationLevel: 0,
      lastEscalatedAt: undefined,
      metadata: {
        calendarEvent: {
          externalId: event.externalId,
          calendarId: event.calendarId,
          location: event.location,
          attendees: event.attendees
        }
      },
      completedAt: undefined
    }
  }

  private formatTaskDescription(task: Task): string {
    let description = task.description || ''
    
    description += `\n\nTask Details:`
    description += `\nStatus: ${task.status}`
    description += `\nPriority: ${task.priority}`
    
    if (task.assignedUser) {
      description += `\nAssigned to: ${task.assignedUser.firstName} ${task.assignedUser.lastName}`
    }
    
    if (task.estimatedHours) {
      description += `\nEstimated hours: ${task.estimatedHours}`
    }
    
    if (task.dueDate) {
      description += `\nDue date: ${new Date(task.dueDate).toLocaleDateString()}`
    }

    return description.trim()
  }

  // Resource Calendar for Team Scheduling
  async getTeamAvailability(
    userIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, { busy: { start: Date; end: Date }[], available: { start: Date; end: Date }[] }>> {
    const response = await fetch(`${this.baseUrl}/api/calendar/team/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch team availability')
    }

    const data = await response.json()
    return data.data || {}
  }

  async findMeetingSlots(
    userIds: string[],
    duration: number, // in minutes
    startDate: Date,
    endDate: Date,
    options?: {
      workingHours?: { start: string; end: string } // e.g., "09:00", "17:00"
      workingDays?: number[] // 0-6, Sunday-Saturday
      minSlots?: number
    }
  ): Promise<{ start: Date; end: Date; attendees: string[] }[]> {
    const response = await fetch(`${this.baseUrl}/api/calendar/team/meeting-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        duration,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...options
      })
    })

    if (!response.ok) {
      throw new Error('Failed to find meeting slots')
    }

    const data = await response.json()
    return data.data || []
  }

  async scheduleTeamMeeting(
    title: string,
    userIds: string[],
    startTime: Date,
    endTime: Date,
    options?: {
      description?: string
      location?: string
      calendarId?: string
      sendInvites?: boolean
    }
  ): Promise<CalendarEvent> {
    const response = await fetch(`${this.baseUrl}/api/calendar/team/schedule-meeting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        userIds,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        ...options
      })
    })

    if (!response.ok) {
      throw new Error('Failed to schedule team meeting')
    }

    return response.json()
  }
}

export const calendarIntegrationService = new CalendarIntegrationService()