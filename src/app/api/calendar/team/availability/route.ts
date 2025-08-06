import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractBearerToken } from '@/lib/auth'
import { addDays, parseISO, format } from 'date-fns'

// POST /api/calendar/team/availability - Get team availability
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
    const { userIds, startDate, endDate } = body

    if (!userIds || !Array.isArray(userIds) || !startDate || !endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'User IDs, start date, and end date are required' 
          } 
        },
        { status: 400 }
      )
    }

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Get tasks for the specified users and date range
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
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Get time entries for the specified users and date range
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

    // Process availability for each user
    const availability: Record<string, { busy: { start: Date; end: Date }[], available: { start: Date; end: Date }[] }> = {}

    for (const userId of userIds) {
      const userTasks = tasks.filter(task => task.assignedTo === userId)
      const userTimeEntries = timeEntries.filter(entry => entry.userId === userId)

      const busy: { start: Date; end: Date }[] = []
      const available: { start: Date; end: Date }[] = []

      // Add busy slots from tasks
      userTasks.forEach(task => {
        if (task.startDate && task.dueDate) {
          busy.push({
            start: new Date(task.startDate),
            end: new Date(task.dueDate)
          })
        } else if (task.dueDate) {
          // Estimate start time based on estimated hours
          const estimatedHours = task.estimatedHours || 1
          const startTime = new Date(task.dueDate)
          startTime.setHours(startTime.getHours() - estimatedHours)
          
          busy.push({
            start: startTime,
            end: new Date(task.dueDate)
          })
        }
      })

      // Add busy slots from time entries
      userTimeEntries.forEach(entry => {
        if (entry.endTime) {
          busy.push({
            start: entry.startTime,
            end: entry.endTime
          })
        } else {
          // Running time entry - assume 1 hour duration
          const endTime = new Date(entry.startTime)
          endTime.setHours(endTime.getHours() + 1)
          
          busy.push({
            start: entry.startTime,
            end: endTime
          })
        }
      })

      // Generate available slots (working hours minus busy slots)
      // For simplicity, assume 9 AM to 5 PM working hours
      let currentDate = new Date(start)
      while (currentDate <= end) {
        // Skip weekends
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          const workStart = new Date(currentDate)
          workStart.setHours(9, 0, 0, 0)
          const workEnd = new Date(currentDate)
          workEnd.setHours(17, 0, 0, 0)

          // Check if this time slot is not busy
          const isSlotBusy = busy.some(busySlot => 
            (busySlot.start <= workStart && busySlot.end >= workEnd) ||
            (busySlot.start >= workStart && busySlot.start < workEnd) ||
            (busySlot.end > workStart && busySlot.end <= workEnd)
          )

          if (!isSlotBusy) {
            available.push({
              start: workStart,
              end: workEnd
            })
          }
        }
        
        currentDate = addDays(currentDate, 1)
      }

      availability[userId] = { busy, available }
    }

    return NextResponse.json({
      success: true,
      data: availability,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }
    })
  } catch (error) {
    console.error('Team availability fetch error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch team availability' 
        } 
      },
      { status: 500 }
    )
  }
}