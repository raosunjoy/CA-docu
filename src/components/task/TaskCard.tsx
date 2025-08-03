'use client'

import { Card } from '@/components/common'
import { TaskStatus, TaskPriority } from '@/types'
import { 
  getTaskStatusColor, 
  getTaskPriorityColor, 
  isTaskOverdue, 
  getDaysUntilDue 
} from '@/lib/task-utils'

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

interface TaskCardProps {
  task: Task
  onClick?: () => void
  onStatusChange?: (status: TaskStatus) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const statusColor = getTaskStatusColor(task.status)
  const priorityColor = getTaskPriorityColor(task.priority)
  
  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue = isTaskOverdue(dueDate)
  const daysUntilDue = getDaysUntilDue(dueDate)

  const getStatusBadgeClass = (color: string) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    switch (color) {
      case 'gray': return `${baseClass} bg-gray-100 text-gray-800`
      case 'blue': return `${baseClass} bg-blue-100 text-blue-800`
      case 'yellow': return `${baseClass} bg-yellow-100 text-yellow-800`
      case 'green': return `${baseClass} bg-green-100 text-green-800`
      case 'red': return `${baseClass} bg-red-100 text-red-800`
      default: return `${baseClass} bg-gray-100 text-gray-800`
    }
  }

  const getPriorityBadgeClass = (color: string) => {
    const baseClass = 'inline-flex items-center px-2 py-1 rounded text-xs font-medium'
    switch (color) {
      case 'green': return `${baseClass} bg-green-50 text-green-700 border border-green-200`
      case 'yellow': return `${baseClass} bg-yellow-50 text-yellow-700 border border-yellow-200`
      case 'orange': return `${baseClass} bg-orange-50 text-orange-700 border border-orange-200`
      case 'red': return `${baseClass} bg-red-50 text-red-700 border border-red-200`
      default: return `${baseClass} bg-gray-50 text-gray-700 border border-gray-200`
    }
  }

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200" 
      onClick={onClick}
      padding="sm"
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {task.title}
          </h3>
          <div className="flex items-center space-x-2 ml-2">
            <span className={getStatusBadgeClass(statusColor)}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span className={getPriorityBadgeClass(priorityColor)}>
              {task.priority}
            </span>
            
            {task._count && (
              <div className="flex items-center space-x-2">
                {task._count.childTasks > 0 && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    {task._count.childTasks}
                  </span>
                )}
                
                {task._count.comments > 0 && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    {task._count.comments}
                  </span>
                )}
                
                {task._count.attachments > 0 && (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    {task._count.attachments}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {dueDate && (
            <div className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              {isOverdue ? (
                `Overdue ${Math.abs(daysUntilDue || 0)} days`
              ) : daysUntilDue === 0 ? (
                'Due today'
              ) : daysUntilDue === 1 ? (
                'Due tomorrow'
              ) : (
                `Due in ${daysUntilDue} days`
              )}
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Created by {task.createdByUser.firstName} {task.createdByUser.lastName}
          </div>
          
          {task.assignedUser && (
            <div className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {task.assignedUser.firstName.charAt(0)}
                {task.assignedUser.lastName.charAt(0)}
              </div>
              <span className="text-xs text-gray-600">
                {task.assignedUser.firstName} {task.assignedUser.lastName}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}