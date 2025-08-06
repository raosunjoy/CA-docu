'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, addWeeks, subWeeks } from 'date-fns'
import { Button, Input } from '@/components/common'
import { calendarIntegrationService } from '@/lib/calendar-integration-service'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  avatar?: string
}

interface TimeSlot {
  start: Date
  end: Date
  type: 'busy' | 'available' | 'tentative'
  title?: string
  description?: string
  taskId?: string
  eventId?: string
}

interface ResourceCalendarProps {
  users: User[]
  selectedDate?: Date
  onTimeSlotClick?: (userId: string, slot: TimeSlot) => void
  onScheduleMeeting?: (userIds: string[], startTime: Date, endTime: Date) => void
  onTaskSchedule?: (taskId: string, userId: string, startTime: Date, endTime: Date) => void
  showAvailabilityOnly?: boolean
  workingHours?: { start: string; end: string }
  workingDays?: number[]
}

interface UserAvailability {
  userId: string
  busy: TimeSlot[]
  available: TimeSlot[]
  workload: number // 0-1 scale
}

const HOUR_HEIGHT = 60 // pixels per hour
const HOURS_START = 8 // 8 AM
const HOURS_END = 18 // 6 PM
const TOTAL_HOURS = HOURS_END - HOURS_START

export function ResourceCalendar({
  users,
  selectedDate = new Date(),
  onTimeSlotClick,
  onScheduleMeeting,
  onTaskSchedule,
  showAvailabilityOnly = false,
  workingHours = { start: '09:00', end: '17:00' },
  workingDays = [1, 2, 3, 4, 5] // Monday to Friday
}: ResourceCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(selectedDate)
  const [availability, setAvailability] = useState<Record<string, UserAvailability>>({})
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    userId: string
    start: Date
    end: Date
  } | null>(null)
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    duration: 60,
    attendees: [] as string[]
  })

  // Generate week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek)
    const days = []
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i)
      days.push(day)
    }
    
    return days.filter(day => workingDays.includes(day.getDay()))
  }, [currentWeek, workingDays])

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots = []
    
    for (let hour = HOURS_START; hour < HOURS_END; hour++) {
      slots.push({
        hour,
        label: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')
      })
    }
    
    return slots
  }, [])

  // Fetch availability data
  const fetchAvailability = useCallback(async () => {
    if (users.length === 0) return

    setLoading(true)
    try {
      const startDate = startOfWeek(currentWeek)
      const endDate = endOfWeek(currentWeek)
      
      const availabilityData = await calendarIntegrationService.getTeamAvailability(
        users.map(u => u.id),
        startDate,
        endDate
      )

      const processed: Record<string, UserAvailability> = {}
      
      users.forEach(user => {
        const userAvailability = availabilityData[user.id] || { busy: [], available: [] }
        
        // Calculate workload (percentage of time busy during working hours)
        const totalWorkingMinutes = weekDays.length * TOTAL_HOURS * 60
        const busyMinutes = userAvailability.busy.reduce((total, slot) => {
          const duration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)
          return total + duration
        }, 0)
        
        processed[user.id] = {
          userId: user.id,
          busy: userAvailability.busy.map(slot => ({
            start: slot.start,
            end: slot.end,
            type: 'busy' as const,
            title: 'Busy'
          })),
          available: userAvailability.available.map(slot => ({
            start: slot.start,
            end: slot.end,
            type: 'available' as const,
            title: 'Available'
          })),
          workload: Math.min(busyMinutes / totalWorkingMinutes, 1)
        }
      })
      
      setAvailability(processed)
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }, [users, currentWeek, weekDays])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  // Handle week navigation
  const handlePrevWeek = useCallback(() => {
    setCurrentWeek(prev => subWeeks(prev, 1))
  }, [])

  const handleNextWeek = useCallback(() => {
    setCurrentWeek(prev => addWeeks(prev, 1))
  }, [])

  const handleToday = useCallback(() => {
    setCurrentWeek(new Date())
  }, [])

  // Handle time slot selection
  const handleSlotClick = useCallback((userId: string, day: Date, hour: number) => {
    const start = new Date(day)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(hour + 1, 0, 0, 0)

    setSelectedSlot({ userId, start, end })
    onTimeSlotClick?.(userId, {
      start,
      end,
      type: 'available',
      title: 'Selected slot'
    })
  }, [onTimeSlotClick])

  // Handle meeting scheduling
  const handleScheduleMeeting = useCallback(async () => {
    if (!selectedSlot || meetingForm.attendees.length === 0) return

    try {
      const endTime = new Date(selectedSlot.start)
      endTime.setMinutes(endTime.getMinutes() + meetingForm.duration)

      await onScheduleMeeting?.(meetingForm.attendees, selectedSlot.start, endTime)
      
      // Reset form
      setSelectedSlot(null)
      setMeetingForm({ title: '', duration: 60, attendees: [] })
      
      // Refresh availability
      fetchAvailability()
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
    }
  }, [selectedSlot, meetingForm, onScheduleMeeting, fetchAvailability])

  // Find available meeting slots
  const findMeetingSlots = useCallback(async () => {
    if (meetingForm.attendees.length === 0) return

    try {
      const startDate = startOfWeek(currentWeek)
      const endDate = endOfWeek(currentWeek)
      
      const slots = await calendarIntegrationService.findMeetingSlots(
        meetingForm.attendees,
        meetingForm.duration,
        startDate,
        endDate,
        {
          workingHours,
          workingDays,
          minSlots: 5
        }
      )

      // Highlight available slots in the UI
      console.log('Available meeting slots:', slots)
    } catch (error) {
      console.error('Failed to find meeting slots:', error)
    }
  }, [meetingForm, currentWeek, workingHours, workingDays])

  // Render time slot for a user on a specific day/hour
  const renderTimeSlot = useCallback((user: User, day: Date, hour: number) => {
    const userAvailability = availability[user.id]
    if (!userAvailability) return null

    const slotStart = new Date(day)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(hour + 1, 0, 0, 0)

    // Find overlapping busy/available slots
    const overlappingSlots = [...userAvailability.busy, ...userAvailability.available].filter(slot => {
      return (slot.start <= slotEnd && slot.end >= slotStart)
    })

    const isSelected = selectedSlot?.userId === user.id && 
                     isSameDay(selectedSlot.start, day) && 
                     selectedSlot.start.getHours() === hour

    let slotClass = 'h-full border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors'
    let slotContent = null

    if (overlappingSlots.length > 0) {
      const primarySlot = overlappingSlots[0]
      
      if (primarySlot.type === 'busy') {
        slotClass = 'h-full border border-red-200 bg-red-100 cursor-pointer'
        slotContent = (
          <div className="p-1 text-xs text-red-800 truncate">
            {primarySlot.title || 'Busy'}
          </div>
        )
      } else if (primarySlot.type === 'available') {
        slotClass = 'h-full border border-green-200 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors'
        slotContent = (
          <div className="p-1 text-xs text-green-800">
            Available
          </div>
        )
      }
    }

    if (isSelected) {
      slotClass += ' ring-2 ring-blue-500 bg-blue-50'
    }

    return (
      <div
        key={`${user.id}-${day.toISOString()}-${hour}`}
        className={slotClass}
        onClick={() => handleSlotClick(user.id, day, hour)}
        title={`${user.firstName} ${user.lastName} - ${format(slotStart, 'h:mm a')}`}
      >
        {slotContent}
      </div>
    )
  }, [availability, selectedSlot, handleSlotClick])

  if (loading) {
    return <ResourceCalendarSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Team Calendar - Week of {format(startOfWeek(currentWeek), 'MMM d, yyyy')}
          </h2>
          <div className="flex items-center space-x-1">
            <Button variant="secondary" size="sm" onClick={handlePrevWeek}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={handleNextWeek}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="sm" onClick={findMeetingSlots}>
            Find Meeting Slots
          </Button>
          <Button size="sm" onClick={() => setSelectedSlot({ userId: '', start: new Date(), end: new Date() })}>
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time Column */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200">
            <div className="h-12 border-b border-gray-200 bg-gray-50"></div>
            {timeSlots.map(({ hour, label }) => (
              <div
                key={hour}
                className="border-b border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                style={{ height: HOUR_HEIGHT }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Users and Days Grid */}
          <div className="flex-1">
            {/* Day Headers */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {weekDays.map(day => (
                <div key={day.toISOString()} className="flex-1 border-r border-gray-200">
                  <div className="p-2 text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-lg font-semibold text-gray-700">
                      {format(day, 'd')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* User Rows */}
            {users.map(user => (
              <div key={user.id} className="flex border-b border-gray-200">
                {/* User Info */}
                <div className="w-48 flex-shrink-0 border-r border-gray-200 p-2 bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                      {availability[user.id] && (
                        <div className="text-xs text-gray-500">
                          {Math.round(availability[user.id].workload * 100)}% busy
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                {weekDays.map(day => (
                  <div key={day.toISOString()} className="flex-1 border-r border-gray-200">
                    <div className="grid grid-rows-10">
                      {timeSlots.map(({ hour }) => (
                        <div key={hour} style={{ height: HOUR_HEIGHT }}>
                          {renderTimeSlot(user, day, hour)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Meeting Scheduling Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Schedule Meeting</h3>
                <button
                  onClick={() => setSelectedSlot(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Title
                  </label>
                  <Input
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter meeting title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    value={meetingForm.duration}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    min="15"
                    max="480"
                    step="15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendees
                  </label>
                  <div className="space-y-2">
                    {users.map(user => (
                      <label key={user.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={meetingForm.attendees.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMeetingForm(prev => ({
                                ...prev,
                                attendees: [...prev.attendees, user.id]
                              }))
                            } else {
                              setMeetingForm(prev => ({
                                ...prev,
                                attendees: prev.attendees.filter(id => id !== user.id)
                              }))
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          {user.firstName} {user.lastName}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedSlot(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleScheduleMeeting}
                    disabled={!meetingForm.title || meetingForm.attendees.length === 0}
                  >
                    Schedule Meeting
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResourceCalendarSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="flex space-x-2">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      <div className="flex flex-1">
        <div className="w-20 border-r border-gray-200">
          <div className="h-12 bg-gray-100 animate-pulse" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-15 border-b border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
        
        <div className="flex-1">
          <div className="flex border-b border-gray-200 bg-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 h-12 border-r border-gray-200 animate-pulse" />
            ))}
          </div>
          
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex border-b border-gray-200">
              <div className="w-48 h-32 border-r border-gray-200 bg-gray-50 animate-pulse" />
              {[...Array(5)].map((_, j) => (
                <div key={j} className="flex-1 h-32 border-r border-gray-200 animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}