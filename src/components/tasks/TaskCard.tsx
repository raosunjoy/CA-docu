import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  Paperclip, 
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { Badge } from '../atoms/Badge'

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

interface TaskCardProps {
  task: Task
  onEdit: () => void
  onUpdate: (updates: Partial<Task>) => void
  getPriorityColor: (priority: Task['priority']) => string
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onUpdate,
  getPriorityColor
}) => {
  const [showMenu, setShowMenu] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) &&
    new Date(task.dueDate) >= new Date()

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays === -1) return 'Due yesterday'
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays <= 7) return `Due in ${diffDays} days`
    
    return date.toLocaleDateString()
  }

  const handleQuickStatusChange = (newStatus: Task['status']) => {
    onUpdate({ status: newStatus })
    setShowMenu(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      } ${isOverdue ? 'border-red-300 bg-red-50' : ''} ${
        isDueSoon ? 'border-yellow-300 bg-yellow-50' : ''
      }`}
    >
      {/* Priority Indicator */}
      <div className={`w-full h-1 ${getPriorityColor(task.priority)} rounded-t mb-2`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 mr-2">
          {task.title}
        </h4>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-6 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                    setShowMenu(false)
                  }}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Task
                </button>
                
                <div className="border-t border-gray-100 my-1" />
                
                <div className="px-4 py-2 text-xs text-gray-500 font-medium">
                  Quick Status Change
                </div>
                
                {['todo', 'in-progress', 'review', 'completed'].map(status => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuickStatusChange(status as Task['status'])
                    }}
                    className={`flex items-center px-4 py-2 text-sm hover:bg-gray-100 w-full text-left ${
                      task.status === status ? 'text-purple-600 bg-purple-50' : 'text-gray-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" size="sm">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <Badge variant="secondary" size="sm">
              +{task.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <div className={`flex items-center text-xs mb-2 ${
          isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-gray-500'
        }`}>
          <Calendar className="w-3 h-3 mr-1" />
          {formatDueDate(task.dueDate)}
        </div>
      )}

      {/* Time Tracking */}
      {(task.estimatedHours || task.actualHours) && (
        <div className="flex items-center text-xs text-gray-500 mb-2">
          <Clock className="w-3 h-3 mr-1" />
          {task.actualHours && task.estimatedHours ? (
            <span>
              {task.actualHours}h / {task.estimatedHours}h
              {task.actualHours > task.estimatedHours && (
                <span className="text-red-500 ml-1">over</span>
              )}
            </span>
          ) : task.estimatedHours ? (
            <span>{task.estimatedHours}h estimated</span>
          ) : (
            <span>{task.actualHours}h logged</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {/* Assignee */}
        {task.assignee ? (
          <div className="flex items-center">
            {task.assignee.avatar ? (
              <img
                src={task.assignee.avatar}
                alt={task.assignee.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-purple-600">
                  {task.assignee.name.charAt(0)}
                </span>
              </div>
            )}
            <span className="ml-2 text-xs text-gray-600 truncate max-w-20">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center text-xs text-gray-400">
            <User className="w-3 h-3 mr-1" />
            Unassigned
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-1">
          {/* Comments indicator (placeholder) */}
          <div className="flex items-center text-xs text-gray-400">
            <MessageSquare className="w-3 h-3" />
            <span className="ml-1">0</span>
          </div>
          
          {/* Attachments indicator (placeholder) */}
          <div className="flex items-center text-xs text-gray-400">
            <Paperclip className="w-3 h-3" />
            <span className="ml-1">0</span>
          </div>
        </div>
      </div>
    </div>
  )
}