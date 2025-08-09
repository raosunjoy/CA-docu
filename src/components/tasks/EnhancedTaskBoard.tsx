import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Filter, Search, MoreHorizontal } from 'lucide-react'
import { Button } from '../atoms/Button'
import { Input } from '../atoms/Input'
import { Badge } from '../atoms/Badge'
import { TaskColumn } from './TaskColumn'
import { TaskCard } from './TaskCard'
import { TaskForm } from './TaskForm'
import { Modal } from '../atoms/Modal'

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

interface EnhancedTaskBoardProps {
  organizationId: string
  userId: string
  projectId?: string
  className?: string
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do', status: 'todo', color: 'bg-gray-100' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: 'bg-blue-100', limit: 3 },
  { id: 'review', title: 'Review', status: 'review', color: 'bg-yellow-100' },
  { id: 'completed', title: 'Completed', status: 'completed', color: 'bg-green-100' }
]

export const EnhancedTaskBoard: React.FC<EnhancedTaskBoardProps> = ({
  organizationId,
  userId,
  projectId,
  className = ''
}) => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch tasks from Claude's API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          organizationId,
          userId,
          ...(projectId && { projectId })
        })

        const response = await fetch(`/api/tasks?${params}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.status}`)
        }

        const result = await response.json()
        
        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to fetch tasks')
        }

        setTasks(result.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
        console.error('Task fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [organizationId, userId, projectId])

  // Filter tasks based on search and filters
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchTerm || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = !selectedPriority || task.priority === selectedPriority
    const matchesAssignee = !selectedAssignee || task.assignee?.id === selectedAssignee

    return matchesSearch && matchesPriority && matchesAssignee
  })

  // Group tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.status] = filteredTasks.filter(task => task.status === column.status)
    return acc
  }, {} as Record<Task['status'], Task[]>)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id
    const overId = over.id

    // Find the containers
    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return
    }

    // Move task between columns
    setTasks(tasks => {
      const activeItems = tasksByStatus[activeContainer]
      const overItems = tasksByStatus[overContainer]

      const activeIndex = activeItems.findIndex(item => item.id === activeId)
      const overIndex = overItems.findIndex(item => item.id === overId)

      const activeTask = activeItems[activeIndex]
      const updatedTask = { ...activeTask, status: overContainer }

      return tasks.map(task => 
        task.id === activeId ? updatedTask : task
      )
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeId = active.id
    const overId = over.id

    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)

    if (!activeContainer || !overContainer) {
      return
    }

    if (activeContainer !== overContainer) {
      // Update task status in backend
      try {
        const response = await fetch(`/api/tasks/${activeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: overContainer })
        })

        if (!response.ok) {
          throw new Error('Failed to update task status')
        }
      } catch (err) {
        console.error('Failed to update task:', err)
        // Revert the change on error
        setTasks(tasks => tasks.map(task => 
          task.id === activeId 
            ? { ...task, status: activeContainer }
            : task
        ))
      }
    }

    setActiveId(null)
  }

  const findContainer = (id: UniqueIdentifier): Task['status'] | null => {
    if (columns.find(column => column.id === id)) {
      return id as Task['status']
    }

    const task = tasks.find(task => task.id === id)
    return task ? task.status : null
  }

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          organizationId,
          userId,
          projectId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const result = await response.json()
      
      if (result.success) {
        setTasks(prev => [...prev, result.data])
        setShowTaskForm(false)
      }
    } catch (err) {
      console.error('Failed to create task:', err)
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const result = await response.json()
      
      if (result.success) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ))
        setEditingTask(null)
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`enhanced-task-board ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Board</h2>
          <p className="text-gray-600">Manage your tasks with drag-and-drop</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowTaskForm(true)}
            className="flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        
        <select
          value={selectedAssignee}
          onChange={(e) => setSelectedAssignee(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Assignees</option>
          {/* Add assignee options dynamically */}
        </select>
      </div>

      {/* Task Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map(column => (
            <TaskColumn
              key={column.id}
              column={column}
              tasks={tasksByStatus[column.status] || []}
              onTaskEdit={setEditingTask}
              onTaskUpdate={handleUpdateTask}
              getPriorityColor={getPriorityColor}
            />
          ))}
        </div>
      </DndContext>

      {/* Task Form Modal */}
      <Modal
        isOpen={showTaskForm || !!editingTask}
        onClose={() => {
          setShowTaskForm(false)
          setEditingTask(null)
        }}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        size="lg"
      >
        <TaskForm
          task={editingTask}
          onSubmit={editingTask 
            ? (updates) => handleUpdateTask(editingTask.id, updates)
            : handleCreateTask
          }
          onCancel={() => {
            setShowTaskForm(false)
            setEditingTask(null)
          }}
        />
      </Modal>
    </div>
  )
}