'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assignedUser?: {
    firstName: string
    lastName: string
  }
  dueDate?: string
  tags: string[]
}

interface KanbanBoardProps {
  tasks: Task[]
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void
  onDeleteTask: (taskId: string) => void
  onTaskClick: (task: Task) => void
}

const columns = [
  { id: 'TODO', title: 'To Do', color: 'bg-gray-100' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'bg-yellow-100' },
  { id: 'COMPLETED', title: 'Completed', color: 'bg-green-100' },
]

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onTaskClick,
}) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'default'
      case 'MEDIUM': return 'info'
      case 'HIGH': return 'warning'
      case 'URGENT': return 'error'
      default: return 'default'
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', task.id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    onUpdateTask(taskId, { status: status as Task['status'] })
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {columns.map(column => {
        const columnTasks = tasks.filter(task => task.status === column.id)
        
        return (
          <div
            key={column.id}
            className="flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className={cn(
              'rounded-lg p-4 mb-4',
              column.color
            )}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{column.title}</h3>
                <Badge variant="secondary" size="sm">
                  {columnTasks.length}
                </Badge>
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-3 flex-1">
              {columnTasks.map(task => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => onTaskClick(task)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Task Title */}
                      <h4 className="font-medium text-gray-900 text-sm leading-tight">
                        {task.title}
                      </h4>

                      {/* Task Description */}
                      {task.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Priority Badge */}
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant={getPriorityColor(task.priority) as any} 
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                        
                        {/* Due Date */}
                        {task.dueDate && (
                          <span className={cn(
                            'text-xs',
                            isOverdue(task.dueDate) 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-500'
                          )}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {task.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="secondary" size="sm">
                              {tag}
                            </Badge>
                          ))}
                          {task.tags.length > 2 && (
                            <Badge variant="secondary" size="sm">
                              +{task.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Assignee */}
                      {task.assignedUser && (
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {task.assignedUser.firstName[0]}{task.assignedUser.lastName[0]}
                          </div>
                          <span className="text-xs text-gray-600">
                            {task.assignedUser.firstName} {task.assignedUser.lastName}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Empty State */}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No tasks</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}