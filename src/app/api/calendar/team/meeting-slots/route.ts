import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractBearerToken } from '@/lib/auth'
import { addDays, addMinutes, parseISO, format, isWithinInterval } from 'date-fns'

// POST /api/calendar/team/meeting-slots - Find available meeting slots
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    const organizationId = payload.orgId

    const body = await request.json()
    const { 
      userIds, 
      duration, 
      startDate, 
      endDate, 
      workingHours = { start: '09:00', end: '17:00' },
      workingDays = [1, 2, 3, 4, 5],
      minSlots = 5
    } = body

    if (!userIds || !Array.isArray(userIds) || !duration || !startDate || !endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'User IDs, duration, start date, and end date are required' 
          } 
        },
        { status: 400 }
      )
    }

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Get all busy slots for the specified users
    const tasks = await prisma.task.findMany({
      where: {
        organizationId: organizationId,
        assignedTo: { in: userIds },
        OR: [
          {
            startDate: {
              gte: start,
              lte: end
            }
          },
          {
            dueDate: {
              gte: start,
              lte: end
            }
          }
        ],
        status: {
          in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW']
        }
      }
    })

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        organizationId: organizationId,
        userId: { in: userIds },
        startTime: {
          gte: start,
          lte: end
        },
        status: {
          in: ['RUNNING', 'STOPPED']
        }
      }
    })

    // Collect all busy intervals for all users
    const allBusySlots: { start: Date; end: Date; userId: string }[] = []

    // Add busy slots from tasks
    tasks.forEach(task => {
      if (task.assignedTo && task.startDate && task.dueDate) {
        allBusySlots.push({
          start: new Date(task.startDate),
          end: new Date(task.dueDate),
          userId: task.assignedTo
        })
      } else if (task.assignedTo && task.dueDate) {
        const estimatedHours = task.estimatedHours || 1
        const startTime = new Date(task.dueDate)
        startTime.setHours(startTime.getHours() - estimatedHours)
        
        allBusySlots.push({
          start: startTime,
          end: new Date(task.dueDate),
          userId: task.assignedTo
        })
      }
    })

    // Add busy slots from time entries
    timeEntries.forEach(entry => {
      if (entry.endTime) {
        allBusySlots.push({
          start: entry.startTime,
          end: entry.endTime,
          userId: entry.userId
        })
      } else {
        const endTime = new Date(entry.startTime)
        endTime.setHours(endTime.getHours() + 1)
        
        allBusySlots.push({
          start: entry.startTime,
          end: endTime,
          userId: entry.userId
        })
      }
    })

    // Find available meeting slots
    const availableSlots: { start: Date; end: Date; attendees: string[] }[] = []
    const [workStartHour, workStartMinute] = workingHours.start.split(':').map(Number)
    const [workEndHour, workEndMinute] = workingHours.end.split(':').map(Number)

    let currentDate = new Date(start)
    while (currentDate <= end && availableSlots.length < minSlots * 2) {
      // Check if current date is a working day
      if (workingDays.includes(currentDate.getDay())) {
        const workStart = new Date(currentDate)
        workStart.setHours(workStartHour, workStartMinute, 0, 0)
        const workEnd = new Date(currentDate)
        workEnd.setHours(workEndHour, workEndMinute, 0, 0)

        // Generate potential meeting slots throughout the day
        let slotStart = new Date(workStart)
        while (addMinutes(slotStart, duration) <= workEnd) {
          const slotEnd = addMinutes(slotStart, duration)
          
          // Check if all required attendees are available during this slot
          const conflictingUsers = new Set<string>()
          
          allBusySlots.forEach(busySlot => {
            if (userIds.includes(busySlot.userId)) {
              // Check if the busy slot overlaps with the potential meeting slot
              if (
                (busySlot.start < slotEnd && busySlot.end > slotStart) ||
                (slotStart < busySlot.end && slotEnd > busySlot.start)
              ) {
                conflictingUsers.add(busySlot.userId)
              }
            }
          })

          // If no conflicts, this is an available slot
          if (conflictingUsers.size === 0) {
            availableSlots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
              attendees: [...userIds]
            })
          }

          // Move to next potential slot (15-minute intervals)
          slotStart = addMinutes(slotStart, 15)
        }
      }
      
      currentDate = addDays(currentDate, 1)
    }

    // Sort slots by date and limit to requested number
    const sortedSlots = availableSlots
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, minSlots)

    return NextResponse.json({
      success: true,
      data: sortedSlots,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        totalSlotsFound: availableSlots.length,
        slotsReturned: sortedSlots.length
      }
    })
  } catch (error) {
    console.error('Meeting slots search error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to find meeting slots' 
        } 
      },
      { status: 500 }
    )
  }
}