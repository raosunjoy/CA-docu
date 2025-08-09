import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { workflowId, emailId, emailData } = await request.json()
    
    if (!workflowId || !emailId || !emailData) {
      return NextResponse.json(
        { error: 'Workflow ID, email ID, and email data are required' },
        { status: 400 }
      )
    }
    
    // Mock workflow execution
    const executedActions = []
    
    // Simulate different workflow actions based on email content
    const subject = emailData.subject?.toLowerCase() || ''
    const body = emailData.body?.toLowerCase() || ''
    
    if (subject.includes('urgent') || body.includes('urgent')) {
      executedActions.push({
        type: 'create_task',
        value: `URGENT: Handle email - ${emailData.subject}`,
        priority: 'high',
        result: {
          taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
          created: true
        }
      })
      
      executedActions.push({
        type: 'assign_label',
        value: 'urgent-task-created',
        result: { labeled: true }
      })
    }
    
    if (subject.includes('client') || body.includes('request')) {
      executedActions.push({
        type: 'create_task',
        value: `Respond to client: ${emailData.subject}`,
        priority: 'medium',
        result: {
          taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
          created: true
        }
      })
      
      executedActions.push({
        type: 'auto_reply',
        value: 'Thank you for your email. We have received your request and will respond within 24 hours.',
        result: { sent: true, messageId: `msg_${Math.random().toString(36).substr(2, 9)}` }
      })
    }
    
    if (subject.includes('financial') || subject.includes('invoice') || subject.includes('payment')) {
      executedActions.push({
        type: 'forward',
        value: 'accounting@company.com',
        result: { forwarded: true, messageId: `fwd_${Math.random().toString(36).substr(2, 9)}` }
      })
      
      executedActions.push({
        type: 'assign_label',
        value: 'forwarded-to-accounting',
        result: { labeled: true }
      })
    }
    
    if (subject.includes('meeting') || body.includes('schedule')) {
      executedActions.push({
        type: 'create_task',
        value: `Schedule meeting: ${emailData.subject}`,
        priority: 'low',
        result: {
          taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
          created: true
        }
      })
    }
    
    if (subject.includes('legal') || subject.includes('contract') || subject.includes('compliance')) {
      executedActions.push({
        type: 'forward',
        value: 'legal@company.com',
        result: { forwarded: true, messageId: `fwd_${Math.random().toString(36).substr(2, 9)}` }
      })
      
      executedActions.push({
        type: 'create_task',
        value: `Legal review required: ${emailData.subject}`,
        priority: 'high',
        result: {
          taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
          created: true
        }
      })
    }
    
    // If no specific actions were triggered, create a general task
    if (executedActions.length === 0) {
      executedActions.push({
        type: 'create_task',
        value: `Review email: ${emailData.subject}`,
        priority: 'low',
        result: {
          taskId: `task_${Math.random().toString(36).substr(2, 9)}`,
          created: true
        }
      })
    }
    
    return NextResponse.json({
      workflowId,
      emailId,
      executedActions,
      executionTime: Math.floor(Math.random() * 1000) + 500, // 0.5-1.5 seconds
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error executing workflow:', error)
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}