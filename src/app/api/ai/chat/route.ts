import { NextRequest, NextResponse } from 'next/server'
import { conversationalAI, ConversationResponse } from '../../../../services/conversational-ai-service'
import { auth } from '../../../../lib/auth'
import { logger } from '../../../../lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      sessionId, 
      message, 
      messageType = 'query',
      startNewSession = false,
      businessContext 
    } = body

    // Validate required fields
    if (!message && !startNewSession) {
      return NextResponse.json({ 
        error: 'Message is required unless starting new session' 
      }, { status: 400 })
    }

    let response: ConversationResponse
    let currentSessionId = sessionId

    // Start new conversation if requested or no session ID provided
    if (startNewSession || !sessionId) {
      const { sessionId: newSessionId, welcomeMessage } = await conversationalAI.startConversation(
        user.id,
        user.role as any,
        user.organizationId || 'default-org',
        businessContext
      )
      currentSessionId = newSessionId
      response = welcomeMessage
      
      logger.info('Started new AI conversation', {
        userId: user.id,
        sessionId: newSessionId,
        userRole: user.role
      })
    } else {
      // Process message in existing conversation
      response = await conversationalAI.processMessage(
        sessionId,
        message,
        messageType
      )
      
      logger.info('Processed AI conversation message', {
        userId: user.id,
        sessionId,
        messageType,
        confidence: response.confidence
      })
    }

    return NextResponse.json({
      success: true,
      sessionId: currentSessionId,
      response,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('AI chat error:', error)
    
    return NextResponse.json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 })
    }

    // Get conversation history
    const history = await conversationalAI.getConversationHistory(sessionId)
    
    return NextResponse.json({
      success: true,
      sessionId,
      history,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('AI chat history error:', error)
    
    return NextResponse.json({
      error: 'Failed to retrieve conversation history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, preferences } = body

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 })
    }

    // Update conversation preferences
    await conversationalAI.updateConversationPreferences(sessionId, preferences)
    
    return NextResponse.json({
      success: true,
      message: 'Conversation preferences updated',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('AI chat preferences update error:', error)
    
    return NextResponse.json({
      error: 'Failed to update conversation preferences',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const user = await auth.getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 })
    }

    // End conversation
    await conversationalAI.endConversation(sessionId)
    
    logger.info('Ended AI conversation', {
      userId: user.id,
      sessionId
    })
    
    return NextResponse.json({
      success: true,
      message: 'Conversation ended',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('AI chat session end error:', error)
    
    return NextResponse.json({
      error: 'Failed to end conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}