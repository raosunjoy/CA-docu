/**
 * Mobile Task Board Component
 * Touch-friendly Kanban board optimized for mobile devices
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Task, TaskStatus } from '@/types'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { 
  Plus, 
  Filter, 
  Search, 
  MoreVertical,
  Clock,
  User,
  Flag,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface MobileTaskBoardProps {
  tasks: Task[]
  onTaskUpdate: (task: Task) => void
  onTaskCreate: () => void
  className?: string
}

const TASK_STATUSES: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'TODO', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { status: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { status: 'IN_REVIEW', label: 'Review', color: 'bg-yellow-100 text-yellow-800' },
  { status: 'COMPLETED', label: 'Done', color: 'bg-green-100 text-green-800' }
]

export function MobileTaskBoard({
  tasks,
  onTaskUpdate,
  onTaskCreate,
  className = ''
}: MobileTaskBoardProps) {
  const [activeColumn, setActiveColumn] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Filter tasks by search query
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Group tasks by status
  const tasksByStatus = TASK_STATUSES.reduce((acc, { status }) => {
    acc[status] = filteredTasks.filter(task => task.status === status)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const handleColumnSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && activeColumn < TASK_STATUSES.length - 1) {
      setActiveColumn(activeColumn + 1)
    } else if (direction === 'right' && activeColumn > 0) {
      setActiveColumn(activeColumn - 1)
    }
  }

  const handleTaskDragStart = (task: Task) => {
    setDraggedTask(task)
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  const handleTaskDrop = (targetStatus: TaskStatus) => {
    if (draggedTask && draggedTask.status !== targetStatus) {
      onTaskUpdate({
        ...draggedTask,
        status: targetStatus
      })
    }
    setDraggedTask(null)
  }

  const currentStatus = TASK_STATUSES[activeColumn]
  const currentTasks = tasksByStatus[currentStatus.status]

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Tasks</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={onTaskCreate}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Column Navigation */}
        <div className="flex items-center justify-between mt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleColumnSwipe('right')}
            disabled={activeColumn === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
            <span className="text-sm text-gray-500">
              ({currentTasks.length})
            </span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleColumnSwipe('left')}
            disabled={activeColumn === TASK_STATUSES.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Column Indicators */}
        <div className="flex justify-center gap-2 mt-2">
          {TASK_STATUSES.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveColumn(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === activeColumn ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Task List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
        onDrop={(e) => {
          e.preventDefault()
          handleTaskDrop(currentStatus.status)
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {currentTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              <Flag className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500 mb-4">No tasks in {currentStatus.label}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={onTaskCreate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTasks.map((task) => (
              <MobileTaskCard
                key={task.id}
                task={task}
                onUpdate={onTaskUpdate}
                onDragStart={() => handleTaskDragStart(task)}
                isDragging={draggedTask?.id === task.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex justify-center">
          <Button
            onClick={onTaskCreate}
            className="w-full max-w-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Task
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Mobile Task Card Component
 */
interface MobileTaskCardProps {
  task: Task
  onUpdate: (task: Task) => void
  onDragStart: () => void
  isDragging: boolean
}

function MobileTaskCard({
  task,
  onUpdate,
  onDragStart,
  isDragging
}: MobileTaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      case 'LOW': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const handleQuickStatusChange = () => {
    const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED']
    const currentIndex = statusOrder.indexOf(task.status)
    const nextIndex = (currentIndex + 1) % statusOrder.length
    
    onUpdate({
      ...task,
      status: statusOrder[nextIndex]
    })
  }

  return (
    <Card
      className={`relative transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      }`}
      draggable
      onDragStart={onDragStart}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-gray-900 flex-1 pr-2">
            {task.title}
          </h3>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            {task.assignedTo && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Assigned</span>
              </div>
            )}
            
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <div className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
            <Flag className="h-3 w-3" />
            <span className="capitalize">{task.priority.toLowerCase()}</span>
          </div>
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Quick Action Button */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Button
            size="sm"
            variant="outline"
            onClick={handleQuickStatusChange}
            className="w-full text-xs"
          >
            Move to Next Stage
          </Button>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-4 top-12 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-32">
            <div className="py-1">
              <button
                onClick={() => {
                  // Handle edit
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  // Handle duplicate
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Duplicate
              </button>
              <button
                onClick={() => {
                  // Handle delete
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}