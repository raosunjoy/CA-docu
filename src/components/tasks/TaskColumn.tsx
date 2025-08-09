import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreHorizontal } from 'lucide-react'
import { TaskCard } from './TaskCard'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in-progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  dueDate?: string
  tags: string[]
  clientId?: string
  estimatedHours?: number
  actualHours?: number
  createdAt: string
  updatedAt: string
}

interface Column {
  id: string
  title: string
  status: Task['status']
  color: string
  limit?: number
}

interface TaskColumnProps {
  column: Column
  tasks: Task[]
  onTaskEdit: (task: Task) => void
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  getPriorityColor: (priority: Task['priority']) => string
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  column,
  tasks,
  onTaskEdit,
  onTaskUpdate,
  getPriorityColor
}) => {
  const {
    setNodeRef,
    isOver
  } = useDroppable({
    id: column.id,
  })

  const isOverLimit = column.limit && tasks.length >= column.limit

  return (
    <div
      ref={setNodeRef}
      className={`task-column bg-white rounded-lg border-2 transition-colors ${
        isOver ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
      } ${isOverLimit ? 'border-red-300' : ''}`}
    >
      {/* Column Header */}
      <div className={`p-4 rounded-t-lg ${column.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <span className="ml-2 px-2 py-1 text-xs bg-white rounded-full text-gray-600">
              {tasks.length}
              {column.limit && ` / ${column.limit}`}
            </span>
          </div>
          
          <button className="p-1 hover:bg-white/50 rounded">
            <MoreHorizontal className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        {isOverLimit && (
          <div className="mt-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
            Column limit exceeded
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="p-4 space-y-3 min-h-[200px]">
        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onTaskEdit(task)}
              onUpdate={(updates) => onTaskUpdate(task.id, updates)}
              getPriorityColor={getPriorityColor}
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <p className="text-sm">No tasks in {column.title.toLowerCase()}</p>
          </div>
        )}
      </div>
    </div>
  )
}