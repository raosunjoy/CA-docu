'use client'

import React, { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/atoms/Card'
import { Badge } from '@/components/atoms/Badge'
import { Modal } from '@/components/atoms/Modal'
import { KanbanBoard } from './KanbanBoard'
import { TaskForm } from './TaskForm'
import { TaskFilters } from './TaskFilters'

type ViewMode = 'kanban' | 'list' | 'calendar'

interface Task {
  id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  assignedTo?: string
  assignedUser?: {
    firstName: string
    lastName: string
  }
  dueDate?: string
  tags: string[]
  createdAt: string
}

// Mock data for demonstration
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'GST Return Filing - ABC Ltd',
    description: 'Complete GST return filing for ABC Ltd for Q3 2024',
    status: 'TODO',
    priority: 'HIGH',
    assignedUser: { firstName: 'John', lastName: 'Doe' },
    dueDate: '2024-01-15',
    tags: ['GST', 'Filing', 'Q3'],
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    title: 'Audit Planning - XYZ Company',
    description: 'Prepare audit plan and schedule for XYZ Company annual audit',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assignedUser: { firstName: 'Jane', lastName: 'Smith' },
    dueDate: '2024-01-20',
    tags: ['Audit', 'Planning'],
    createdAt: '2024-01-02',
  },
  {
    id: '3',
    title: 'TDS Return Preparation',
    description: 'Prepare and file TDS return for December 2024',
    status: 'IN_REVIEW',
    priority: 'URGENT',
    assignedUser: { firstName: 'Mike', lastName: 'Johnson' },
    dueDate: '2024-01-10',
    tags: ['TDS', 'Return'],
    createdAt: '2024-01-03',
  },
  {
    id: '4',
    title: 'Financial Statement Review',
    description: 'Review financial statements for accuracy and compliance',
    status: 'COMPLETED',
    priority: 'MEDIUM',
    assignedUser: { firstName: 'Sarah', lastName: 'Wilson' },
    dueDate: '2024-01-05',
    tags: ['Financial', 'Review'],
    createdAt: '2024-01-04',
  },
]

export const TasksPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignee: '',
    tags: [] as string[],
  })

  const handleCreateTask = (taskData: Partial<Task>) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: taskData.title || '',
      description: taskData.description || '',
      status: taskData.status || 'TODO',
      priority: taskData.priority || 'MEDIUM',
      assignedUser: taskData.assignedUser,
      dueDate: taskData.dueDate,
      tags: taskData.tags || [],
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [...prev, newTask])
    setIsCreateModalOpen(false)
  }

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ))
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  const filteredTasks = tasks.filter(task => {
    if (filters.status && task.status !== filters.status) return false
    if (filters.priority && task.priority !== filters.priority) return false
    if (filters.assignee && task.assignedUser?.firstName !== filters.assignee) return false
    if (filters.tags.length > 0 && !filters.tags.some(tag => task.tags.includes(tag))) return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'default'
      case 'IN_PROGRESS': return 'info'
      case 'IN_REVIEW': return 'warning'
      case 'COMPLETED': return 'success'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'default'
      case 'MEDIUM': return 'info'
      case 'HIGH': return 'warning'
      case 'URGENT': return 'error'
      default: return 'default'
    }
  }

  const renderListView = () => (
    <div className="space-y-4">
      {filteredTasks.map(task => (
        <Card key={task.id} hoverable clickable onClick={() => setSelectedTask(task)}>
          <CardContent>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{task.title}</h3>
                  <Badge variant={getPriorityColor(task.priority) as any} size="sm">
                    {task.priority}
                  </Badge>
                  <Badge variant={getStatusColor(task.status) as any} size="sm">
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {task.assignedUser && (
                    <span>Assigned to: {task.assignedUser.firstName} {task.assignedUser.lastName}</span>
                  )}
                  {task.dueDate && (
                    <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <Badge key={tag} variant="secondary" size="sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderCalendarView = () => (
    <Card>
      <CardContent>
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar View</h3>
          <p className="text-gray-600">Calendar view is being implemented...</p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage your work and track progress</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Task
        </Button>
      </div>

      {/* View Mode Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Calendar
          </button>
        </div>

        <TaskFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Content */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          tasks={filteredTasks}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onTaskClick={setSelectedTask}
        />
      )}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'calendar' && renderCalendarView()}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Task"
        size="lg"
      >
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Modal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="Task Details"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{selectedTask.title}</h3>
              <p className="text-gray-600">{selectedTask.description}</p>
            </div>
            
            <div className="flex space-x-4">
              <Badge variant={getStatusColor(selectedTask.status) as any}>
                {selectedTask.status.replace('_', ' ')}
              </Badge>
              <Badge variant={getPriorityColor(selectedTask.priority) as any}>
                {selectedTask.priority}
              </Badge>
            </div>

            {selectedTask.assignedUser && (
              <div>
                <span className="text-sm text-gray-500">Assigned to: </span>
                <span className="text-sm font-medium">
                  {selectedTask.assignedUser.firstName} {selectedTask.assignedUser.lastName}
                </span>
              </div>
            )}

            {selectedTask.dueDate && (
              <div>
                <span className="text-sm text-gray-500">Due date: </span>
                <span className="text-sm font-medium">
                  {new Date(selectedTask.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {selectedTask.tags.map(tag => (
                <Badge key={tag} variant="secondary" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex space-x-2 pt-4">
              <Button size="sm">Edit Task</Button>
              <Button size="sm" variant="outline">Add Comment</Button>
              <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(selectedTask.id)}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}