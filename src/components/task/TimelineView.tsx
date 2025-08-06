'use client'

import { useState, useMemo, useCallback } from 'react'
import { format, parseISO, differenceInDays, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
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
  estimatedHours?: number
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

interface TimelineViewProps {
  tasks: Task[]
  loading?: boolean
  onTaskClick?: (task: Task) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  viewMode?: 'week' | 'month' | 'quarter'
  selectedDate?: Date
}

interface TimelineTask extends Task {
  startDate: Date
  endDate: Date
  duration: number
  position: number
  width: number
}

const PRIORITY_COLORS = {
  [TaskPriority.LOW]: 'bg-gray-400',
  [TaskPriority.MEDIUM]: 'bg-blue-400',
  [TaskPriority.HIGH]: 'bg-orange-400',
  [TaskPriority.URGENT]: 'bg-red-400'
}

const STATUS_PATTERNS = {
  [TaskStatus.TODO]: '',
  [TaskStatus.IN_PROGRESS]: 'bg-stripes',
  [TaskStatus.IN_REVIEW]: 'bg-dots',
  [TaskStatus.COMPLETED]: 'opacity-60',
  [TaskStatus.CANCELLED]: 'opacity-40 line-through'
}

export function TimelineView({
  tasks,
  loading = false,
  onTaskClick,
  onTaskUpdate,
  viewMode = 'month',
  selectedDate = new Date()
}: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [draggedTask, setDraggedTask] = useState<TimelineTask | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  // Calculate timeline range based on view mode
  const timelineRange = useMemo(() => {
    let start: Date
    let end: Date
    let days: number

    switch (viewMode) {
      case 'week':
        start = startOfWeek(currentDate)
        end = endOfWeek(currentDate)
        days = 7
        break
      case 'month':
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        days = differenceInDays(end, start) + 1
        break
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3)
        start = new Date(currentDate.getFullYear(), quarter * 3, 1)
        end = new Date(currentDate.getFullYear(), quarter * 3 + 3, 0)
        days = differenceInDays(end, start) + 1
        break
      default:
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        days = differenceInDays(end, start) + 1
    }

    return { start, end, days }
  }, [currentDate, viewMode])

  // Process tasks for timeline display
  const timelineTasks = useMemo(() => {
    const processed: TimelineTask[] = []

    tasks.forEach(task => {
      let startDate: Date
      let endDate: Date

      // Determine start and end dates
      if (task.startDate && task.dueDate) {
        startDate = parseISO(task.startDate)
        endDate = parseISO(task.dueDate)
      } else if (task.dueDate) {
        endDate = parseISO(task.dueDate)
        // Estimate start date based on estimated hours or default to 1 day
        const estimatedDays = task.estimatedHours ? Math.ceil(task.estimatedHours / 8) : 1
        startDate = addDays(endDate, -estimatedDays + 1)
      } else if (task.startDate) {
        startDate = parseISO(task.startDate)
        // Default duration of 1 day if no due date
        endDate = addDays(startDate, 1)
      } else {
        // Skip tasks without dates
        return
      }

      // Only include tasks that overlap with the timeline range
      if (isWithinInterval(startDate, { start: timelineRange.start, end: timelineRange.end }) ||
          isWithinInterval(endDate, { start: timelineRange.start, end: timelineRange.end }) ||
          (startDate <= timelineRange.start && endDate >= timelineRange.end)) {
        
        // Calculate position and width
        const taskStart = startDate < timelineRange.start ? timelineRange.start : startDate
        const taskEnd = endDate > timelineRange.end ? timelineRange.end : endDate
        
        const position = differenceInDays(taskStart, timelineRange.start)
        const duration = differenceInDays(taskEnd, taskStart) + 1
        const width = (duration / timelineRange.days) * 100

        processed.push({
          ...task,
          startDate,
          endDate,
          duration,
          position: (position / timelineRange.days) * 100,
          width
        })
      }
    })

    return processed
  }, [tasks, timelineRange])

  // Group tasks by assignee for better visualization
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, TimelineTask[]> = {}
    
    timelineTasks.forEach(task => {
      const assigneeKey = task.assignedUser 
        ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}`
        : 'Unassigned'
      
      if (!grouped[assigneeKey]) {
        grouped[assigneeKey] = []
      }
      grouped[assigneeKey].push(task)
    })

    // Sort tasks within each group by start date
    Object.keys(grouped).forEach(assignee => {
      grouped[assignee].sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    })

    return grouped
  }, [timelineTasks])

  // Generate timeline dates for header
  const timelineDates = useMemo(() => {
    const dates = []
    let current = timelineRange.start

    while (current <= timelineRange.end) {
      dates.push(current)
      current = addDays(current, 1)
    }

    return dates
  }, [timelineRange])

  const handlePrevPeriod = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'week':
          return addDays(prev, -7)
        case 'month':
          return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        case 'quarter':
          return new Date(prev.getFullYear(), prev.getMonth() - 3, 1)
        default:
          return new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      }
    })
  }, [viewMode])

  const handleNextPeriod = useCallback(() => {
    setCurrentDate(prev => {
      switch (viewMode) {
        case 'week':
          return addDays(prev, 7)
        case 'month':
          return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        case 'quarter':
          return new Date(prev.getFullYear(), prev.getMonth() + 3, 1)
        default:
          return new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      }
    })
  }, [viewMode])

  const handleTaskDragStart = useCallback((e: React.MouseEvent, task: TimelineTask) => {
    setDraggedTask(task)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset(e.clientX - rect.left)
  }, [])

  const handleTaskDrag = useCallback((e: React.MouseEvent) => {
    if (!draggedTask) return

    const timelineRect = e.currentTarget.getBoundingClientRect()
    const newPosition = ((e.clientX - dragOffset - timelineRect.left) / timelineRect.width) * 100
    
    // Update task position (this would trigger a re-render)
    // In a real implementation, you'd update the task's start/end dates
  }, [draggedTask, dragOffset])

  const handleTaskDragEnd = useCallback(() => {
    if (!draggedTask) return

    // Calculate new dates based on position
    // Update task via API
    setDraggedTask(null)
    setDragOffset(0)
  }, [draggedTask])

  const formatPeriodTitle = useCallback(() => {
    switch (viewMode) {
      case 'week':
        return `Week of ${format(timelineRange.start, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1
        return `Q${quarter} ${currentDate.getFullYear()}`
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }, [currentDate, viewMode, timelineRange.start])

  if (loading) {
    return <TimelineViewSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {formatPeriodTitle()}
          </h2>
          <div className="flex items-center space-x-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevPeriod}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextPeriod}
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
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span>Urgent</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-400 rounded"></div>
              <span>High</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-400 rounded"></div>
              <span>Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Assignee Labels */}
          <div className="w-48 flex-shrink-0 border-r border-gray-200">
            <div className="h-12 border-b border-gray-200 bg-gray-50 flex items-center px-4">
              <span className="text-sm font-medium text-gray-700">Assignee</span>
            </div>
            {Object.keys(tasksByAssignee).map(assignee => (
              <div key={assignee} className="h-16 border-b border-gray-200 flex items-center px-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {assignee.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm text-gray-900 truncate">{assignee}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Grid */}
          <div className="flex-1 relative">
            {/* Date Headers */}
            <div className="h-12 border-b border-gray-200 bg-gray-50 flex">
              {timelineDates.map((date, index) => (
                <div
                  key={format(date, 'yyyy-MM-dd')}
                  className="flex-1 border-r border-gray-200 flex items-center justify-center text-xs text-gray-600"
                  style={{ minWidth: `${100 / timelineRange.days}%` }}
                >
                  {viewMode === 'week' ? format(date, 'EEE d') : format(date, 'd')}
                </div>
              ))}
            </div>

            {/* Task Rows */}
            {Object.entries(tasksByAssignee).map(([assignee, assigneeTasks]) => (
              <div key={assignee} className="h-16 border-b border-gray-200 relative">
                {/* Grid Lines */}
                {timelineDates.map((date, index) => (
                  <div
                    key={format(date, 'yyyy-MM-dd')}
                    className="absolute top-0 bottom-0 border-r border-gray-100"
                    style={{ left: `${(index / timelineRange.days) * 100}%` }}
                  />
                ))}

                {/* Tasks */}
                {assigneeTasks.map((task, taskIndex) => (
                  <div
                    key={task.id}
                    className={`
                      absolute h-6 rounded cursor-pointer transition-all hover:shadow-md
                      ${PRIORITY_COLORS[task.priority]}
                      ${STATUS_PATTERNS[task.status]}
                    `}
                    style={{
                      left: `${task.position}%`,
                      width: `${task.width}%`,
                      top: `${4 + (taskIndex % 2) * 8}px`,
                      zIndex: draggedTask?.id === task.id ? 10 : 1
                    }}
                    onClick={() => onTaskClick?.(task)}
                    onMouseDown={(e) => handleTaskDragStart(e, task)}
                    title={`${task.title} (${format(task.startDate, 'MMM d')} - ${format(task.endDate, 'MMM d')})`}
                  >
                    <div className="px-2 py-1 text-xs text-white font-medium truncate">
                      {task.title}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Today Indicator */}
            {isWithinInterval(new Date(), { start: timelineRange.start, end: timelineRange.end }) && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{
                  left: `${(differenceInDays(new Date(), timelineRange.start) / timelineRange.days) * 100}%`
                }}
              >
                <div className="absolute -top-2 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {timelineTasks.length} tasks across {Object.keys(tasksByAssignee).length} assignees
          </div>
          <div className="flex items-center space-x-4">
            <span>
              {timelineTasks.filter(t => t.status === TaskStatus.COMPLETED).length} completed
            </span>
            <span>
              {timelineTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length} in progress
            </span>
            <span>
              {timelineTasks.filter(t => t.endDate < new Date() && t.status !== TaskStatus.COMPLETED).length} overdue
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineViewSkeleton() {
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
      
      <div className="flex flex-1">
        <div className="w-48 border-r border-gray-200">
          <div className="h-12 bg-gray-100 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-200 p-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        
        <div className="flex-1">
          <div className="h-12 bg-gray-100 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b border-gray-200 relative">
              <div className="absolute top-2 left-4 h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="absolute top-2 left-40 h-6 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}