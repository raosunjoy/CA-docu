'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DraggableTaskCard } from './DraggableTaskCard'
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

interface KanbanColumnProps {
  column: KanbanColumn
  tasks: Task[]
  selectedTasks: string[]
  onTaskClick?: (task: Task) => void
  onTaskSelect?: (taskId: string, selected: boolean) => void
  draggedTask?: Task | null
}

const getColumnColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
  }
  return colorMap[color] || colorMap.gray
}

export function KanbanColumn({
  column,
  tasks,
  selectedTasks,
  onTaskClick,
  onTaskSelect,
  draggedTask
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const colorClasses = getColumnColorClasses(column.color)
  const isAtLimit = column.limit && tasks.length >= column.limit
  const isOverLimit = column.limit && tasks.length > column.limit

  return (
    <div className="flex-1 min-w-80 max-w-sm">
      {/* Column Header */}
      <div className={`
        rounded-lg border-2 p-4 mb-4 transition-colors
        ${colorClasses.bg} ${colorClasses.border}
        ${isOver ? 'border-blue-400 bg-blue-100' : ''}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className={`font-medium ${colorClasses.text}`}>
              {column.title}
            </h3>
            <span className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}
            `}>
              {tasks.length}
            </span>
          </div>
          
          {column.limit && (
            <div className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
              {isOverLimit && '⚠️ '}
              Limit: {column.limit}
            </div>
          )}
        </div>

        {/* Progress bar for limits */}
        {column.limit && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all ${
                  isOverLimit ? 'bg-red-500' : isAtLimit ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((tasks.length / column.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className={`
          min-h-96 rounded-lg border-2 border-dashed p-4 transition-colors
          ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}
          ${isOverLimit ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm">No tasks</p>
              </div>
            ) : (
              tasks.map(task => (
                <DraggableTaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTasks.includes(task.id)}
                  isDragging={draggedTask?.id === task.id}
                  onClick={() => onTaskClick?.(task)}
                  onSelect={onTaskSelect ? (selected) => onTaskSelect(task.id, selected) : undefined}
                />
              ))
            )}
          </div>
        </SortableContext>

        {/* Drop zone indicator */}
        {isOver && draggedTask && (
          <div className="mt-3 p-3 border-2 border-dashed border-blue-400 rounded-lg bg-blue-100">
            <div className="text-center text-blue-700 text-sm">
              Drop to move to {column.title}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}