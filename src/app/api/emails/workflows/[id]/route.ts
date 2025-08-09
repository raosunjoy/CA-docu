import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const { isActive } = await request.json()
    
    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isActive must be a boolean' },
        { status: 400 }
      )
    }
    
    // Mock workflow update (in production, this would update the database)
    console.log(`Workflow ${workflowId} ${isActive ? 'activated' : 'deactivated'}`)
    
    return NextResponse.json({
      message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`,
      workflowId,
      isActive
    })
    
  } catch (error) {
    console.error('Error updating workflow:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    )
  }
}