import { NextRequest, NextResponse } from 'next/server'

interface WorkflowRule {
  id: string
  name: string
  description: string
  trigger: {
    type: 'category' | 'sender' | 'subject' | 'keyword'
    value: string
    condition: 'contains' | 'equals' | 'starts_with'
  }
  actions: {
    type: 'create_task' | 'assign_label' | 'forward' | 'auto_reply' | 'move_folder'
    value: string
    priority?: 'low' | 'medium' | 'high'
  }[]
  isActive: boolean
  executionCount: number
}

// Mock workflow storage (in production, this would use a database)
const mockWorkflows: Record<string, WorkflowRule[]> = {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    const workflows = mockWorkflows[userId] || []
    
    return NextResponse.json(workflows)
    
  } catch (error) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, workflows } = await request.json()
    
    if (!userId || !workflows) {
      return NextResponse.json(
        { error: 'User ID and workflows are required' },
        { status: 400 }
      )
    }
    
    // Generate IDs for new workflows
    const workflowsWithIds = workflows.map((workflow: any) => ({
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executionCount: 0
    }))
    
    mockWorkflows[userId] = workflowsWithIds
    
    return NextResponse.json({
      message: 'Workflows created successfully',
      workflows: workflowsWithIds
    })
    
  } catch (error) {
    console.error('Error creating workflows:', error)
    return NextResponse.json(
      { error: 'Failed to create workflows' },
      { status: 500 }
    )
  }
}