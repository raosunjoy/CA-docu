'use client'

import { useState, useCallback, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { KanbanColumn } from './KanbanColumn'
import { KanbanFilters } from './KanbanFilters'
import { BulkActions } from './BulkActions'
import { Button, Input } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
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

interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  limit?: number
}

interface KanbanFilters {
  search: string
  priority: TaskPriority | null
  assignedTo: string | null
  dueDate: 'overdue' | 'today' | 'week' | null
}

interface BulkAction {
  type: 'move' | 'assign' | 'priority' | 'delete'
  value?: string | TaskStatus | TaskPriority
}

interface KanbanBoardProps {
  tasks: Task[]
  loading?: boolean
  onTaskClick?: (task: Task) => void
  onTaskStatusChange?: (taskId: string, status: TaskStatus) => void
  onBulkAction?: (taskIds: string[], action: BulkAction) => void
  onCreateTask?: () => void
  onFiltersChange?: (filters: KanbanFilters) => void
  customColumns?: KanbanColumn[]
  enableBulkActions?: boolean
  enableFilters?: boolean
  enableSearch?: boolean
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: TaskStatus.TODO, title: 'To Do', color: 'gray' },
  { id: TaskStatus.IN_PROGRESS, title: 'In Progress', color: 'blue' },
  { id: TaskStatus.IN_REVIEW, title: 'In Review', color: 'yellow' },
  { id: TaskStatus.COMPLETED, title: 'Completed', color: 'green' },
  { id: TaskStatus.CANCELLED, title: 'Cancelled', color: 'red' }
]

export function KanbanBoard({
  tasks,
  loading = false,
  onTaskClick,
  onTaskStatusChange,
  onBulkAction,
  onCreateTask,
  onFiltersChange,
  customColumns = DEFAULT_COLUMNS,
  enableBulkActions = true,
  enableFilters = true,
  enableSearch = true
}: KanbanBoardProps) {
  const [filters, setFilters] = useState<KanbanFilters>({
    search: '',
    priority: null,
    assignedTo: null,
    dueDate: null
  })
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!task.title.toLowerCase().includes(searchLower) &&
            !task.description?.toLowerCase().includes(searchLower)) {
          return false
        }
      }

      // Priority filter
      if (filters.priority && task.priority !== filters.priority) {
        return false
      }

      // Assignee filter
      if (filters.assignedTo && task.assignedUser?.email !== filters.assignedTo) {
        return false
      }

      // Due date filter
      if (filters.dueDate && task.dueDate) {
        const dueDate = new Date(task.dueDate)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

        switch (filters.dueDate) {
          case 'overdue':
            if (dueDate >= today) return false
            break
          case 'today':
            if (dueDate < today || dueDate >= new Date(today.getTime() + 24 * 60 * 60 * 1000)) return false
            break
          case 'week':
            if (dueDate < today || dueDate > weekFromNow) return false
            break
        }
      }

      return true
    })
  }, [tasks, filters])

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.COMPLETED]: [],
      [TaskStatus.CANCELLED]: []
    }

    filteredTasks.forEach(task => {
      grouped[task.status].push(task)
    })

    return grouped
  }, [filteredTasks])

  const handleFiltersChange = useCallback((newFilters: Partial<KanbanFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange?.(updatedFilters)
  }, [filters, onFiltersChange])

  const handleTaskSelect = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks(prev => 
      selected 
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    )
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedTasks(selected ? filteredTasks.map(task => task.id) : [])
  }, [filteredTasks])

  const handleBulkAction = useCallback((action: BulkAction) => {
    if (selectedTasks.length === 0) return
    onBulkAction?.(selectedTasks, action)
    setSelectedTasks([])
  }, [selectedTasks, onBulkAction])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = filteredTasks.find(t => t.id === event.active.id)
    setDraggedTask(task || null)
  }, [filteredTasks])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setDraggedTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    // Find the task being moved
    const task = filteredTasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    onTaskStatusChange?.(taskId, newStatus)
  }, [filteredTasks, onTaskStatusChange])

  if (loading) {
    return <KanbanBoardSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Task Board</h2>
        {onCreateTask && (
          <Button onClick={onCreateTask} size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      {enableFilters && (
        <KanbanFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          enableSearch={enableSearch}
          tasks={tasks}
        />
      )}

      {/* Bulk Actions */}
      {enableBulkActions && selectedTasks.length > 0 && (
        <BulkActions
          selectedCount={selectedTasks.length}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedTasks([])}
        />
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-w-max p-1">
            {customColumns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id]}
                selectedTasks={selectedTasks}
                onTaskClick={onTaskClick}
                onTaskSelect={enableBulkActions ? handleTaskSelect : undefined}
                draggedTask={draggedTask}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {/* Stats */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
        {selectedTasks.length > 0 && (
          <div>
            {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>
    </div>
  )
}

function KanbanBoardSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      
      <div className="flex gap-6 flex-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 min-w-80">
            <div className="h-10 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-32 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}