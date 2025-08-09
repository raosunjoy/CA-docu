import { NextRequest, NextResponse } from 'next/server'

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
    
    // Mock workflow statistics
    const stats = {
      totalExecutions: Math.floor(Math.random() * 100) + 50,
      activeRules: Math.floor(Math.random() * 10) + 5,
      timesSaved: Math.floor(Math.random() * 20) + 10
    }
    
    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Error fetching workflow stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow stats' },
      { status: 500 }
    )
  }
}