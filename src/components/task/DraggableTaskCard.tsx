'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './TaskCard'
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

interface DraggableTaskCardProps {
  task: Task
  isSelected: boolean
  isDragging: boolean
  onClick?: () => void
  onSelect?: (selected: boolean) => void
}

export function DraggableTaskCard({
  task,
  isSelected,
  isDragging,
  onClick,
  onSelect
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click when dragging
    if (isDragging || isSortableDragging) {
      e.preventDefault()
      return
    }

    // Handle selection if onSelect is provided and shift/ctrl is pressed
    if (onSelect && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSelect(!isSelected)
      return
    }

    onClick?.()
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelect?.(e.target.checked)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative transition-all duration-200 group
        ${isDragging || isSortableDragging ? 'opacity-50 scale-105 z-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectChange}
            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Drag handle */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-gray-400 cursor-grab" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>

      <div onClick={handleClick}>
        <TaskCard
          task={task}
          onClick={() => {}} // Handled by parent div
        />
      </div>
    </div>
  )
}