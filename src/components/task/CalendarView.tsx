'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday, parseISO, addMonths, subMonths } from 'date-fns'
import { TaskStatus, TaskPriority } from '@/types'
import { Button } from '@/components/common'

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  startDate?: string
  assignedUser?: {
    firstName: string
    lastName: string
    email: string
  }
  createdByUser: {
    firstName: string
    lastName: string
  }
  _count?: {
    childTasks: number
    comments: number
    attachments: number
  }
}

interface CalendarViewProps {
  tasks: Task[]
  loading?: boolean
  onTaskClick?: (task: Task) => void
  onDateClick?: (date: Date) => void
  onTaskCreate?: (date: Date) => void
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void
  selectedDate?: Date
  viewMode?: 'month' | 'week'
}

interface CalendarTask extends Task {
  date: Date
  isOverdue: boolean
}

const PRIORITY_COLORS = {
  [TaskPriority.LOW]: 'bg-gray-100 text-gray-800 border-gray-200',
  [TaskPriority.MEDIUM]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [TaskPriority.URGENT]: 'bg-red-100 text-red-800 border-red-200'
}

const STATUS_COLORS = {
  [TaskStatus.TODO]: 'bg-gray-50 border-l-gray-400',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-50 border-l-blue-400',
  [TaskStatus.IN_REVIEW]: 'bg-yellow-50 border-l-yellow-400',
  [TaskStatus.COMPLETED]: 'bg-green-50 border-l-green-400',
  [TaskStatus.CANCELLED]: 'bg-red-50 border-l-red-400'
}

export function CalendarView({
  tasks,
  loading = false,
  onTaskClick,
  onDateClick,
  onTaskCreate,
  onTaskStatusChange,
  selectedDate = new Date(),
  viewMode = 'month'
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  // Process tasks for calendar display
  const calendarTasks = useMemo(() => {
    const processed: CalendarTask[] = []
    const now = new Date()

    tasks.forEach(task => {
      // Add task for due date
      if (task.dueDate) {
        const dueDate = parseISO(task.dueDate)
        processed.push({
          ...task,
          date: dueDate,
          isOverdue: dueDate < now && task.status !== TaskStatus.COMPLETED
        })
      }

      // Add task for start date if different from due date
      if (task.startDate && task.startDate !== task.dueDate) {
        const startDate = parseISO(task.startDate)
        processed.push({
          ...task,
          date: startDate,
          isOverdue: false
        })
      }
    })

    return processed
  }, [tasks])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate))
    const end = endOfWeek(endOfMonth(currentDate))
    const days = []
    let day = start

    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }, [currentDate])

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, CalendarTask[]> = {}

    calendarTasks.forEach(task => {
      const dateKey = format(task.date, 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(task)
    })

    // Sort tasks by priority and time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        // Sort by priority first
        const priorityOrder = { [TaskPriority.URGENT]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 }
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (priorityDiff !== 0) return priorityDiff

        // Then by status (incomplete tasks first)
        const statusOrder = { [TaskStatus.TODO]: 0, [TaskStatus.IN_PROGRESS]: 1, [TaskStatus.IN_REVIEW]: 2, [TaskStatus.COMPLETED]: 3, [TaskStatus.CANCELLED]: 4 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
    })

    return grouped
  }, [calendarTasks])

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1))
  }, [])

  const handleToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const handleDateClick = useCallback((date: Date) => {
    onDateClick?.(date)
  }, [onDateClick])

  const handleTaskDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDateDrop = useCallback(async (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    
    if (!draggedTask) return

    const newDueDate = format(date, 'yyyy-MM-dd')
    
    try {
      const response = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: newDueDate })
      })

      if (response.ok) {
        // Task will be updated via parent component
      }
    } catch (error) {
      console.error('Failed to update task date:', error)
    }

    setDraggedTask(null)
  }, [draggedTask])

  const handleDateDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  if (loading) {
    return <CalendarViewSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center space-x-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevMonth}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleToday}
            >
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextMonth}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Overdue</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 flex-1">
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDate[dateKey] || []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = isSameDay(day, selectedDate)
            const isTodayDate = isToday(day)

            return (
              <div
                key={dateKey}
                className={`
                  min-h-32 border-r border-b border-gray-200 p-1 cursor-pointer
                  ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${isSelected ? 'bg-blue-50' : ''}
                  ${isTodayDate ? 'bg-yellow-50' : ''}
                  hover:bg-gray-50 transition-colors
                `}
                onClick={() => handleDateClick(day)}
                onDrop={(e) => handleDateDrop(e, day)}
                onDragOver={handleDateDragOver}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`
                    text-sm font-medium
                    ${isTodayDate ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {onTaskCreate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onTaskCreate(day)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Tasks */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={`${task.id}-${dateKey}`}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTaskClick?.(task)
                      }}
                      className={`
                        text-xs p-1 rounded border-l-2 cursor-pointer
                        ${STATUS_COLORS[task.status]}
                        ${task.isOverdue ? 'bg-red-50 border-l-red-500' : ''}
                        hover:shadow-sm transition-shadow
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1 font-medium">
                          {task.title}
                        </span>
                        <span className={`
                          ml-1 px-1 rounded text-xs
                          ${PRIORITY_COLORS[task.priority]}
                        `}>
                          {task.priority.charAt(0)}
                        </span>
                      </div>
                      {task.assignedUser && (
                        <div className="text-gray-500 truncate">
                          {task.assignedUser.firstName} {task.assignedUser.lastName}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 text-center py-1">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CalendarViewSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex space-x-2">
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-gray-200">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="p-2 h-10 bg-gray-100 animate-pulse" />
        ))}
      </div>
      
      <div className="grid grid-cols-7 flex-1">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="min-h-32 border-r border-b border-gray-200 p-1">
            <div className="h-4 w-6 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="space-y-1">
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}