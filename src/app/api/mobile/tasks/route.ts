import { NextRequest, NextResponse } from 'next/server'
import { withMobileOptimization, mobileAPIOptimizer } from '@/lib/mobile-api-optimizer'

// Mobile-optimized tasks endpoint
async function getMobileTasks(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'demo-user'
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '15')

  // Generate mobile-optimized task data
  const allTasks = generateMobileTaskData(userId, 100) // Generate 100 tasks for demo

  // Apply filters
  let filteredTasks = allTasks
  
  if (status) {
    filteredTasks = filteredTasks.filter(task => task.status === status)
  }
  
  if (priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === priority)
  }
  
  if (search) {
    const searchLower = search.toLowerCase()
    filteredTasks = filteredTasks.filter(task => 
      task.title.toLowerCase().includes(searchLower) ||
      task.description.toLowerCase().includes(searchLower)
    )
  }

  // Sort by priority and due date for mobile
  filteredTasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - 
                        priorityOrder[a.priority as keyof typeof priorityOrder]
    
    if (priorityDiff !== 0) return priorityDiff
    
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  // Mobile-specific data structure
  const mobileTaskData = {
    tasks: filteredTasks, // Pagination will be handled by optimizer
    summary: {
      total: filteredTasks.length,
      byStatus: {
        todo: filteredTasks.filter(t => t.status === 'TODO').length,
        inProgress: filteredTasks.filter(t => t.status === 'IN_PROGRESS').length,
        completed: filteredTasks.filter(t => t.status === 'COMPLETED').length,
        onHold: filteredTasks.filter(t => t.status === 'ON_HOLD').length
      },
      byPriority: {
        high: filteredTasks.filter(t => t.priority === 'high').length,
        medium: filteredTasks.filter(t => t.priority === 'medium').length,
        low: filteredTasks.filter(t => t.priority === 'low').length
      },
      overdue: filteredTasks.filter(t => 
        new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
      ).length
    },
    filters: {
      availableStatuses: ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'],
      availablePriorities: ['high', 'medium', 'low']
    },
    mobileOptimized: true,
    lastUpdated: new Date().toISOString()
  }

  return mobileTaskData
}

// Generate mobile-optimized task data
function generateMobileTaskData(userId: string, count: number) {
  const statuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']
  const priorities = ['high', 'medium', 'low']
  const taskTypes = [
    'GST Filing', 'Audit Review', 'Tax Calculation', 'Client Meeting',
    'Document Review', 'Compliance Check', 'Financial Analysis', 'Report Generation'
  ]

  return Array.from({ length: count }, (_, i) => {
    const status = statuses[i % statuses.length]
    const priority = priorities[i % priorities.length]
    const taskType = taskTypes[i % taskTypes.length]
    const dueDate = new Date(Date.now() + (Math.random() * 30 - 15) * 24 * 60 * 60 * 1000)

    return {
      id: `mobile_task_${i + 1}`,
      title: `${taskType} - Client ${String.fromCharCode(65 + (i % 26))}`,
      description: `Mobile-optimized ${taskType.toLowerCase()} task for efficient completion`,
      status,
      priority,
      dueDate: dueDate.toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: userId,
      assignedBy: 'Manager',
      progress: status === 'COMPLETED' ? 100 : 
                status === 'IN_PROGRESS' ? Math.floor(Math.random() * 80) + 10 :
                status === 'ON_HOLD' ? Math.floor(Math.random() * 50) : 0,
      
      // Mobile-specific fields
      estimatedTime: Math.floor(Math.random() * 8) + 1, // 1-8 hours
      tags: [taskType.split(' ')[0], priority],
      client: {
        id: `client_${(i % 10) + 1}`,
        name: `Client ${String.fromCharCode(65 + (i % 26))}`,
        type: ['Individual', 'Company', 'Partnership'][i % 3]
      },
      
      // Minimal metadata for mobile
      mobileView: true,
      lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      isOverdue: dueDate < new Date() && status !== 'COMPLETED',
      urgencyScore: priority === 'high' ? 3 : priority === 'medium' ? 2 : 1
    }
  })
}

// Mobile task creation endpoint
async function createMobileTask(request: NextRequest) {
  const taskData = await request.json()
  
  // Validate required fields for mobile
  const requiredFields = ['title', 'priority', 'dueDate']
  for (const field of requiredFields) {
    if (!taskData[field]) {
      return NextResponse.json(
        { error: `${field} is required` },
        { status: 400 }
      )
    }
  }

  // Create mobile-optimized task
  const newTask = {
    id: `mobile_task_${Date.now()}`,
    ...taskData,
    status: taskData.status || 'TODO',
    progress: 0,
    createdAt: new Date().toISOString(),
    assignedTo: taskData.assignedTo || 'current-user',
    mobileCreated: true,
    mobileView: true
  }

  return {
    task: newTask,
    success: true,
    message: 'Task created successfully',
    mobileOptimized: true
  }
}

// Mobile task update endpoint
async function updateMobileTask(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId')
  const updates = await request.json()

  if (!taskId) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    )
  }

  // Simulate task update
  const updatedTask = {
    id: taskId,
    ...updates,
    updatedAt: new Date().toISOString(),
    mobileUpdated: true,
    mobileView: true
  }

  return {
    task: updatedTask,
    success: true,
    message: 'Task updated successfully',
    mobileOptimized: true
  }
}

// Export mobile-optimized handlers
export const GET = withMobileOptimization(getMobileTasks)
export const POST = withMobileOptimization(createMobileTask)
export const PUT = withMobileOptimization(updateMobileTask)